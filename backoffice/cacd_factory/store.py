"""Acesso ao Supabase com a service role. Só este módulo conhece tabelas e colunas do PostgREST.

As regras de substituição (o que pode ser apagado ao regenerar uma ficha) são funções puras de
`synthesis.py`, testadas; aqui elas só são aplicadas às linhas do banco.
"""

from __future__ import annotations

from datetime import datetime, timezone

from supabase import Client, create_client

from .config import Settings
from .domain import SubjectInfo, TopicInfo
from .exams import ExamDraft, stale_exam_items
from .synthesis import empty_stems, flashcards_to_replace, tps_items_to_replace

# Itens de TPS gerados pela fábrica não podem parecer questão real da banca.
AI_STEM_BOARD = "Gerado por IA (estilo Cebraspe)"
STORAGE_BUCKET = "acervo"
INSERT_BATCH = 200
_EXTENSIONS = {"image/webp": "webp", "image/png": "png", "image/jpeg": "jpg"}


def _batches(rows: list, size: int = INSERT_BATCH):
    for start in range(0, len(rows), size):
        yield rows[start : start + size]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalized(text: str) -> str:
    return " ".join(text.casefold().split())


class SupabaseStore:
    def __init__(self, client: Client):
        self.client = client

    @classmethod
    def from_settings(cls, settings: Settings) -> SupabaseStore:
        settings.require("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY")
        return cls(create_client(settings.supabase_url, settings.service_role_key))

    # --- Catálogo ------------------------------------------------------------

    def get_subject(self, slug: str) -> SubjectInfo:
        rows = self.client.table("subjects").select("id, slug, name").eq("slug", slug).limit(1).execute().data
        if not rows:
            raise LookupError(f"A disciplina {slug!r} não existe no banco. Aplique o supabase/seed.sql.")
        row = rows[0]
        return SubjectInfo(id=row["id"], slug=row["slug"], name=row["name"])

    def get_topics(self, subject_id: str) -> dict[str, TopicInfo]:
        """Tópicos da disciplina na ordem da trilha (módulo, depois tópico)."""
        rows = (
            self.client.table("topics")
            .select("id, code, title, official_edital_ref, pedagogical_order, modules!inner(subject_id, pedagogical_order)")
            .eq("modules.subject_id", subject_id)
            .execute()
            .data
        )
        rows.sort(key=lambda row: (row["modules"]["pedagogical_order"], row["pedagogical_order"]))
        return {
            row["code"]: TopicInfo(
                id=row["id"], code=row["code"], title=row["title"], official_edital_ref=row.get("official_edital_ref")
            )
            for row in rows
        }

    # --- Ingestão --------------------------------------------------------------

    def find_document(self, content_hash: str, file_path: str) -> dict | None:
        columns = "id, content_hash, file_path, processed_at, metadata"
        table = self.client.table("source_documents")
        rows = table.select(columns).eq("content_hash", content_hash).limit(1).execute().data
        if not rows:
            rows = table.select(columns).eq("file_path", file_path).limit(1).execute().data
        return rows[0] if rows else None

    def save_document(self, record: dict, existing_id: str | None = None) -> str:
        # processed_at volta a nulo: só a última etapa da ingestão marca o documento como pronto.
        payload = {**record, "processed_at": None}
        table = self.client.table("source_documents")
        if existing_id:
            table.update(payload).eq("id", existing_id).execute()
            return existing_id
        return table.insert(payload).execute().data[0]["id"]

    def upsert_chunks(self, document_id: str, rows: list[dict]) -> None:
        self.client.table("document_chunks").upsert(rows, on_conflict="source_document_id,chunk_index").execute()

    def delete_chunks_from(self, document_id: str, first_stale_index: int) -> None:
        (
            self.client.table("document_chunks")
            .delete()
            .eq("source_document_id", document_id)
            .gte("chunk_index", first_stale_index)
            .execute()
        )

    def mark_processed(self, document_id: str, metadata: dict) -> None:
        table = self.client.table("source_documents")
        current = table.select("metadata").eq("id", document_id).limit(1).execute().data
        merged = {**((current[0].get("metadata") or {}) if current else {}), **metadata}
        table.update({"processed_at": _now(), "metadata": merged}).eq("id", document_id).execute()

    def has_acervo_tables(self) -> bool:
        """A migração 20261114000000_acervo_sem_ia já foi aplicada neste banco?"""
        try:
            self.client.table("document_sections").select("id").limit(1).execute()
            return True
        except Exception as error:
            if any(marker in str(error) for marker in ("PGRST205", "42P01", "document_sections")):
                return False
            raise

    def get_subjects(self) -> dict[str, SubjectInfo]:
        rows = self.client.table("subjects").select("id, slug, name").execute().data
        return {row["slug"]: SubjectInfo(id=row["id"], slug=row["slug"], name=row["name"]) for row in rows}

    def manual_topics(self, document_id: str) -> dict[tuple[int, str], str]:
        rows = (
            self.client.table("document_sections")
            .select("position, title, topic_id")
            .eq("source_document_id", document_id)
            .eq("topic_assigned_by", "manual")
            .execute()
            .data
        )
        return {(row["position"], row["title"]): row["topic_id"] for row in rows if row.get("topic_id")}

    def replace_sections(self, document_id: str, rows: list[dict]) -> dict[int, str]:
        table = self.client.table("document_sections")
        table.delete().eq("source_document_id", document_id).execute()
        ids: dict[int, str] = {}
        for batch in _batches([{**row, "source_document_id": document_id} for row in rows]):
            for saved in table.insert(batch).execute().data:
                ids[saved["position"]] = saved["id"]
        return ids

    def replace_assets(self, document_id: str, assets: list[dict]) -> None:
        """Sobe as imagens para o bucket privado e troca as linhas; o que sumiu sai do Storage também."""
        bucket = self.client.storage.from_(STORAGE_BUCKET)
        table = self.client.table("document_assets")
        previous = {row["storage_path"] for row in table.select("storage_path").eq("source_document_id", document_id).execute().data}
        rows = []
        for asset in assets:
            path = f"{document_id}/{asset['key']}.{_EXTENSIONS.get(asset['content_type'], 'bin')}"
            bucket.upload(path, asset["data"], {"content-type": asset["content_type"], "upsert": "true"})
            rows.append(
                {
                    "source_document_id": document_id,
                    "section_id": asset.get("section_id"),
                    "kind": asset["kind"],
                    "position": asset["position"],
                    "page": asset.get("page"),
                    "at_seconds": asset.get("at_seconds"),
                    "caption": asset.get("caption"),
                    "storage_path": path,
                    "width": asset.get("width"),
                    "height": asset.get("height"),
                }
            )
        table.delete().eq("source_document_id", document_id).execute()
        for batch in _batches(rows):
            table.insert(batch).execute()
        stale = sorted(previous - {row["storage_path"] for row in rows})
        if stale:
            bucket.remove(stale)

    def import_exam(
        self,
        document_id: str,
        exam: ExamDraft,
        subject: SubjectInfo,
        *,
        year: int | None = None,
        board: str | None = None,
        title: str | None = None,
    ) -> dict:
        """Grava questões e itens com gabarito C/E; o que ela já respondeu nunca é apagado."""
        subjects = self.get_subjects()
        stems_table = self.client.table("tps_question_stems")
        items_table = self.client.table("tps_items")

        kept: set[tuple[str, int]] = set()
        imported_items = skipped_items = 0
        stem_ids: list[str] = []
        for stem in exam.stems:
            gradable = [item for item in stem.items if item.answer in ("C", "E")]
            skipped_items += len(stem.items) - len(gradable)
            if not gradable:
                continue
            stem_subject = subjects.get(stem.subject) if stem.subject else None
            saved = stems_table.upsert(
                {
                    "subject_id": (stem_subject or subject).id,
                    "source_document_id": document_id,
                    "question_number": stem.number,
                    "stem_text": stem.text,
                    "exam_year": year,
                    "exam_board": board,
                    "is_ai_generated": False,
                    "metadata": {"page": stem.page, "subject_detected": stem.subject},
                },
                on_conflict="source_document_id,question_number",
            ).execute().data[0]
            stem_ids.append(saved["id"])
            # topic_id e comentário ficam de fora: numa nova leitura, não apagam o que ela escolheu.
            items_table.upsert(
                [
                    {"stem_id": saved["id"], "item_number": item.number, "statement": item.statement, "official_answer": item.answer}
                    for item in gradable
                ],
                on_conflict="stem_id,item_number",
            ).execute()
            kept.update((saved["id"], item.number) for item in gradable)
            imported_items += len(gradable)

        all_stems = stems_table.select("id").eq("source_document_id", document_id).execute().data
        all_stem_ids = [row["id"] for row in all_stems]
        if all_stem_ids:
            existing = items_table.select("id, stem_id, item_number").in_("stem_id", all_stem_ids).execute().data
            item_ids = [row["id"] for row in existing]
            attempted: set[str] = set()
            if item_ids:
                attempted = {
                    row["item_id"]
                    for row in self.client.table("tps_attempts").select("item_id").in_("item_id", item_ids).execute().data
                }
            stale = stale_exam_items(existing, kept=kept, attempted_item_ids=attempted)
            if stale:
                items_table.delete().in_("id", stale).execute()
            remaining = [row for row in existing if str(row["id"]) not in set(stale)]
            empty = empty_stems(set(all_stem_ids) - set(stem_ids), remaining_items=remaining)
            if empty:
                stems_table.delete().in_("id", empty).execute()

        prompts = self.client.table("essay_prompts")
        for essay in exam.essays:
            row = {
                "subject_id": subject.id,
                "source_document_id": document_id,
                "question_number": essay.number,
                "exam_year": year,
                "title": f"{title or 'Prova'} — Questão {essay.number}",
                "motivating_text": essay.text,
                "commands_json": [],
                "grading_rubric_json": {},
            }
            if essay.max_lines:
                row["max_lines"] = essay.max_lines
            if essay.min_lines:
                row["min_lines"] = essay.min_lines
            if essay.max_score is not None:
                row["max_score"] = essay.max_score
            prompts.upsert(row, on_conflict="source_document_id,question_number").execute()

        return {"stems": len(stem_ids), "items": imported_items, "skipped_items": skipped_items, "essays": len(exam.essays)}

    # --- Busca -----------------------------------------------------------------

    def hybrid_search(
        self,
        *,
        query_text: str,
        query_embedding: list[float],
        subject_id: str,
        topic_id: str | None = None,
        match_count: int = 12,
    ) -> list[dict]:
        response = self.client.rpc(
            "hybrid_search_chunks",
            {
                "query_text": query_text,
                "query_embedding": query_embedding,
                "filter_subject_id": subject_id,
                "filter_topic_id": topic_id,
                "match_count": match_count,
            },
        ).execute()
        return response.data or []

    # --- Síntese ---------------------------------------------------------------

    def lesson_exists(self, topic_id: str) -> bool:
        rows = self.client.table("topic_lessons").select("id").eq("topic_id", topic_id).limit(1).execute().data
        return bool(rows)

    def replace_generated_content(
        self,
        *,
        topic: TopicInfo,
        subject: SubjectInfo,
        lesson: dict,
        flashcards: list[dict],
        tps_items: list[dict],
        stem_text: str,
    ) -> None:
        """Grava a ficha e troca só o material gerado que ela ainda não usou.

        O PostgREST não tem transação entre chamadas; a ordem abaixo garante que uma falha no meio
        nunca apaga histórico de estudo, e rodar de novo com --force completa o que faltou.
        """
        self.client.table("topic_lessons").upsert({**lesson, "updated_at": _now()}, on_conflict="topic_id").execute()

        existing_cards = (
            self.client.table("flashcards").select("id, origin, reps, front_prompt").eq("topic_id", topic.id).execute().data
        )
        replaced_cards = set(flashcards_to_replace(existing_cards))
        if replaced_cards:
            self.client.table("flashcards").delete().in_("id", sorted(replaced_cards)).execute()
        kept_prompts = {_normalized(card["front_prompt"]) for card in existing_cards if str(card["id"]) not in replaced_cards}
        new_cards = [card for card in flashcards if _normalized(card["front_prompt"]) not in kept_prompts]
        if new_cards:
            self.client.table("flashcards").insert(new_cards).execute()

        items = self.client.table("tps_items").select("id, stem_id").eq("topic_id", topic.id).execute().data
        stem_ids = sorted({item["stem_id"] for item in items if item.get("stem_id")})
        ai_stems: set[str] = set()
        if stem_ids:
            ai_stems = {
                row["id"]
                for row in self.client.table("tps_question_stems")
                .select("id")
                .in_("id", stem_ids)
                .eq("is_ai_generated", True)
                .execute()
                .data
            }
        item_ids = [item["id"] for item in items]
        attempted: set[str] = set()
        if item_ids:
            attempted = {
                row["item_id"]
                for row in self.client.table("tps_attempts").select("item_id").in_("item_id", item_ids).execute().data
            }
        replaced_items = set(tps_items_to_replace(items, ai_stem_ids=ai_stems, attempted_item_ids=attempted))
        if replaced_items:
            self.client.table("tps_items").delete().in_("id", sorted(replaced_items)).execute()
        remaining = [item for item in items if str(item["id"]) not in replaced_items]
        stale_stems = empty_stems(ai_stems, remaining_items=remaining)
        if stale_stems:
            self.client.table("tps_question_stems").delete().in_("id", stale_stems).execute()

        if tps_items:
            stem_id = (
                self.client.table("tps_question_stems")
                .insert({"subject_id": subject.id, "is_ai_generated": True, "exam_board": AI_STEM_BOARD, "stem_text": stem_text})
                .execute()
                .data[0]["id"]
            )
            self.client.table("tps_items").insert([{**item, "stem_id": stem_id} for item in tps_items]).execute()

    # --- Situação --------------------------------------------------------------

    def status_summary(self, subject: SubjectInfo, topics: dict[str, TopicInfo]) -> dict:
        documents = (
            self.client.table("source_documents")
            .select("id, title, doc_type, processed_at, metadata")
            .eq("subject_id", subject.id)
            .order("title")
            .execute()
            .data
        )
        chunks = (
            self.client.table("document_chunks")
            .select("id, source_documents!inner(subject_id)", count="exact")
            .eq("source_documents.subject_id", subject.id)
            .limit(1)
            .execute()
        )
        tagged = (
            self.client.table("document_chunks")
            .select("id, source_documents!inner(subject_id)", count="exact")
            .eq("source_documents.subject_id", subject.id)
            .not_.is_("topic_id", "null")
            .limit(1)
            .execute()
        )
        topic_ids = [topic.id for topic in topics.values()]
        with_lesson: set[str] = set()
        if topic_ids:
            with_lesson = {
                row["topic_id"]
                for row in self.client.table("topic_lessons").select("topic_id").in_("topic_id", topic_ids).execute().data
            }
        return {
            "documents": documents,
            "chunk_count": chunks.count or 0,
            "tagged_chunk_count": tagged.count or 0,
            "topics_with_lesson": [code for code, topic in topics.items() if topic.id in with_lesson],
            "topics_without_lesson": [code for code, topic in topics.items() if topic.id not in with_lesson],
        }
