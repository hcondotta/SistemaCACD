"""Dublês dos serviços externos (Supabase) e construtores de dados usados só pelos testes."""

from cacd_factory.synthesis import LessonPackage


class InMemoryIngestStore:
    """Mesmo contrato do SupabaseStore para a ingestão, guardado em dicionários."""

    def __init__(self):
        self.documents = {}
        self.chunks = {}
        self.sections = {}
        self.assets = {}
        self.exams = {}
        self._sequence = 0

    def manual_topics(self, document_id):
        return {
            (row["position"], row["title"]): row["topic_id"]
            for row in self.sections.get(document_id, [])
            if row["topic_assigned_by"] == "manual"
        }

    def replace_sections(self, document_id, rows):
        self.sections[document_id] = [dict(row) for row in rows]
        return {row["position"]: f"{document_id}-sec-{row['position']}" for row in rows}

    def replace_assets(self, document_id, assets):
        self.assets[document_id] = [dict(asset) for asset in assets]

    def import_exam(self, document_id, exam, subject, **details):
        self.exams[document_id] = exam
        return {"stems": len(exam.stems), "items": sum(len(stem.items) for stem in exam.stems), "essays": len(exam.essays)}

    def find_document(self, content_hash, file_path):
        for document in self.documents.values():
            if document["content_hash"] == content_hash:
                return dict(document)
        for document in self.documents.values():
            if document["file_path"] == file_path:
                return dict(document)
        return None

    def save_document(self, record, existing_id=None):
        if existing_id is None:
            self._sequence += 1
            existing_id = f"doc-{self._sequence}"
        self.documents[existing_id] = {**record, "id": existing_id, "processed_at": None}
        return existing_id

    def upsert_chunks(self, document_id, rows):
        for row in rows:
            self.chunks[(document_id, row["chunk_index"])] = dict(row)

    def delete_chunks_from(self, document_id, first_stale_index):
        stale = [key for key in self.chunks if key[0] == document_id and key[1] >= first_stale_index]
        for key in stale:
            del self.chunks[key]

    def mark_processed(self, document_id, metadata):
        document = self.documents[document_id]
        document["processed_at"] = "2026-11-13T00:00:00+00:00"
        document["metadata"] = {**document.get("metadata", {}), **metadata}


class RecordingSynthesisStore:
    """Registra o que a síntese mandaria gravar, sem banco."""

    def __init__(self, has_lesson=False):
        self.has_lesson = has_lesson
        self.saved = []

    def lesson_exists(self, topic_id):
        return self.has_lesson

    def replace_generated_content(self, **payload):
        self.saved.append(payload)


def rpc_row(chunk_id):
    """Linha com o mesmo formato que a RPC hybrid_search_chunks devolve."""
    return {
        "chunk_id": chunk_id,
        "content": f"conteúdo {chunk_id}",
        "citation_label": f"rótulo {chunk_id}",
        "doc_title": "Obra",
        "doc_type": "book",
        "rrf_score": 0.03,
    }


def make_package(**overrides):
    data = {
        "acervo_suficiente": True,
        "coverage_gaps": [],
        "base_intuition_md": "A curva IS mostra o equilíbrio do mercado de bens [1].",
        "cacd_deep_dive_md": "Sob câmbio flutuante, a política fiscal é ineficaz [2][3].",
        "tps_traps": [
            {"wrong_claim": "x", "truth_mechanism": "y", "trap_category": "Inversão causal", "source_blocks": [2]}
        ],
        "essay_repertoire": [
            {
                "author_or_source": "Mundell",
                "core_thesis": "t",
                "historical_data_or_milestone": "1963",
                "source_blocks": [3],
            }
        ],
        "initial_flashcards": [{"front_prompt": "p", "back_answer": "r", "source_blocks": [1]}],
        "generated_tps_items": [
            {
                "statement": "s",
                "official_answer": "E",
                "detailed_explanation_md": "e [2]",
                "trap_category": "c",
                "source_block": 2,
            }
        ],
    }
    data.update(overrides)
    return LessonPackage.model_validate(data)
