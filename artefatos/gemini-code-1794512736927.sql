-- ============================================================================
-- SEED DE QUESTÕES DE PROVAS DO CACD: TPS (1ª FASE) E DISCURSIVAS (3ª FASE)
-- ============================================================================

DO $$
DECLARE
    v_econ_id UUID;
    v_t31 UUID;
    v_t33 UUID;
    v_t42 UUID;
    v_t47 UUID;
    v_stem_1 UUID;
    v_stem_2 UUID;
BEGIN
    SELECT id INTO v_econ_id FROM subjects WHERE slug = 'economia';
    SELECT id INTO v_t31 FROM topics WHERE code = '3.1' LIMIT 1;
    SELECT id INTO v_t33 FROM topics WHERE code = '3.3' LIMIT 1;
    SELECT id INTO v_t42 FROM topics WHERE code = '4.2' LIMIT 1;
    SELECT id INTO v_t47 FROM topics WHERE code = '4.7' LIMIT 1;

    -- 1. Questão TPS — Macroeconomia Aberta, Balanço de Pagamentos e Mundell-Fleming
    INSERT INTO tps_question_stems (subject_id, exam_year, exam_board, is_ai_generated, stem_text)
    VALUES (
        v_econ_id,
        2024,
        'Cebraspe',
        FALSE,
        'No que se refere à contabilidade do balanço de pagamentos (BPM6/FMI), aos regimes cambiais e ao modelo Mundell-Fleming (IS-LM-BP), julgue (C ou E) os itens a seguir.'
    ) RETURNING id INTO v_stem_1;

    INSERT INTO tps_items (stem_id, topic_id, item_number, statement, official_answer, detailed_explanation_md, trap_category) VALUES
    (
        v_stem_1, v_t31, 1,
        'Remessas de lucros e dividendos efetuadas por filiais de empresas multinacionais instaladas no Brasil às suas matrizes no exterior são contabilizadas como débito na conta de Renda Secundária das Transações Correntes.',
        'E',
        '**Gabarito: Errado (E).** Na metodologia da 6ª Edição do Manual de Balanço de Pagamentos do FMI (BPM6), a remuneração de fatores de produção (salários, juros, lucros e dividendos) é registrada na **Renda Primária** das Transações Correntes. A *Renda Secundária* registra transferências unilaterais correntes sem contrapartida (como remessas pessoais de migrantes e cooperação internacional).',
        'Troca Conceitual no BPM6 (Renda Primária vs. Renda Secundária)'
    ),
    (
        v_stem_1, v_t33, 2,
        'Em uma pequena economia aberta com perfeita mobilidade de capitais e regime de câmbio flutuante, uma expansão fiscal financiada por emissão de títulos públicos eleva permanentemente o nível de renda de equilíbrio.',
        'E',
        '**Gabarito: Errado (E).** Sob câmbio flutuante e perfeita mobilidade de capitais ($i = i^*$), o aumento do gasto público desloca a curva $IS$ para a direita, gerando pressão altista sobre os juros domésticos ($i > i^*$). O consequente influxo de capitais na Conta Financeira aprecia a moeda nacional, reduzindo as exportações líquidas ($NX$) e deslocando a curva $IS$ de volta à posição original (*crowding-out* externo completo).',
        'Inversão Causal no Modelo Mundell-Fleming'
    ),
    (
        v_stem_1, v_t33, 3,
        'Sob regime de câmbio fixo e perfeita mobilidade internacional de capitais, a política monetária perde autonomia como instrumento de estímulo à demanda agregada, pois tentativas de reduzir a taxa de juros doméstica resultam em perda de reservas internacionais e contração da base monetária.',
        'C',
        '**Gabarito: Certo (C).** Trata-se da manifestação direta do **Trilema da Economia Aberta (Trindade Impossível)**. Ao expandir a oferta de moeda ($LM$ para a direita), a queda incipiente nos juros ($i < i^*$) provoca fuga de capitais. Para defender a paridade cambial fixa, o Banco Central é obrigado a vender divisas e enxugar moeda doméstica, retornando a curva $LM$ ao ponto inicial.',
        'Conceito Correto — Trilema da Economia Aberta'
    ),
    (
        v_stem_1, v_t33, 4,
        'Caso o grau de mobilidade internacional de capitais seja baixo — de modo que a curva BP seja mais inclinada que a curva LM —, uma política fiscal expansionista sob câmbio flutuante provocará déficit incipiente no balanço de pagamentos e depreciação da taxa de câmbio.',
        'C',
        '**Gabarito: Certo (C).** Quando a mobilidade de capitais é baixa ($BP$ mais íngreme que $LM$), o efeito da elevação da renda sobre o aumento das importações (deterioração das Transações Correntes) supera o influxo financeiro atraído pela alta dos juros. O ponto de interseção $IS$-$LM$ situa-se abaixo da curva $BP$ (déficit externo), depreciando o câmbio.',
        'Caso Especial de Inclinação Relativa (BP mais inclinada que LM)'
    );

    -- 2. Questão TPS — História Econômica do Brasil (Crise de 1929 ao Plano Real)
    INSERT INTO tps_question_stems (subject_id, exam_year, exam_board, is_ai_generated, stem_text)
    VALUES (
        v_econ_id,
        2023,
        'IADES / Cebraspe',
        FALSE,
        'Acerca da evolução da economia brasileira no século XX, desde a crise da economia agroexportadora na década de 1930 até a estabilização monetária do Plano Real, julgue (C ou E) os itens subsequentes.'
    ) RETURNING id INTO v_stem_2;

    INSERT INTO tps_items (stem_id, topic_id, item_number, statement, official_answer, detailed_explanation_md, trap_category) VALUES
    (
        v_stem_2, v_t42, 1,
        'Segundo a interpretação clássica de Celso Furtado em Formação Econômica do Brasil, a política de compra e queima de estoques de café na década de 1930 funcionou como um programa anticíclico involuntário de sustentação da renda monetária interna, acelerando o deslocamento do centro dinâmico para o mercado doméstico.',
        'C',
        '**Gabarito: Certo (C).** Para Celso Furtado, ao evitar o colapso da renda do setor cafeeiro mediante expansão creditícia/monetária para compra de excedentes, o governo sustentou a demanda agregada doméstica enquanto a desvalorização cambial encarecia os manufaturados importados, criando estímulo decisivo para a indústria interna.',
        'Conceito Correto — Historiografia Clássica (Celso Furtado)'
    ),
    (
        v_stem_2, v_t47, 2,
        'A Unidade Real de Valor (URV), introduzida na segunda fase do Plano Real em março de 1994, consistiu em um congelamento heterodoxo de preços e salários destinado a eliminar a inflação reprimida.',
        'E',
        '**Gabarito: Errado (E).** Diferentemente do Plano Cruzado (1986), a URV **não utilizou congelamento de preços**. Ela operou como uma moeda-índice (superindexador diário atrelado à paridade cambial) que permitiu o realinhamento voluntário e sincronizado dos preços relativos antes de sua conversão na nova moeda (Real) em 1º de julho de 1994.',
        'Falsa Equivalência entre URV e Planos Heterodoxos de Congelamento'
    );

    -- 3. Proposta Discursiva de 3ª Fase (60 a 90 Linhas) — Plano Real, Âncora Cambial e Crise de 1999
    INSERT INTO essay_prompts (
        subject_id, topic_id, exam_year, title, motivating_text,
        commands_json, min_lines, max_lines, max_score, grading_rubric_json, model_answer_md
    ) VALUES (
        v_econ_id,
        v_t47,
        2024,
        'Estabilização Monetária, Âncora Cambial e a Transição para o Tripé Macroeconômico (1994–1999)',
        'A estabilização alcançada pelo Plano Real em 1994 encerrou décadas de inflação crônica e indexação generalizada na economia brasileira. Contudo, a combinação de políticas macroeconômicas adotada nos primeiros anos de vigência da nova moeda — marcada pela utilização da âncora cambial em um contexto de abertura comercial e financeira — gerou desequilíbrios internos e externos que culminaram na mudança do regime cambial em janeiro de 1999.',
        '[
            {"item": "a", "prompt": "Explique o diagnóstico da inflação inercial e o mecanismo pelo qual a Unidade Real de Valor (URV) coordenou a desindexação da economia sem recorrer ao congelamento de preços.", "max_points": 10.0},
            {"item": "b", "prompt": "Analise, à luz do modelo Mundell-Fleming e das contas do Balanço de Pagamentos, como o mix de política fiscal e monetária entre 1995 e 1998 sustentou a âncora cambial e quais vulnerabilidades acumulou.", "max_points": 10.0},
            {"item": "c", "prompt": "Discorra sobre o contágio das crises financeiras internacionais da década de 1990 (México, Ásia e Rússia) e a subsequente instituição do Tripé Macroeconômico em 1999.", "max_points": 10.0}
        ]'::jsonb,
        60, 90, 30.00,
        '[
            {
                "command_item": "a",
                "mandatory_concepts": ["Inércia inflacionária e conflito distributivo", "Defasagem de reajustes (pico vs. média)", "Três fases do Plano Real: PAI, URV e emissão do Real", "URV como superindexador diário que sincronizou preços relativos"],
                "expected_authors_or_facts": ["Proposta Larida (Persio Arida e André Lara Resende)", "Edmar Bacha", "Medida Provisória da URV (março de 1994)", "Conversão em 1º de julho de 1994"],
                "common_fatal_errors": ["Afirmar que a URV congelou preços ou confiscou ativos financeiros"]
            },
            {
                "command_item": "b",
                "mandatory_concepts": ["Apreciação real do câmbio e pressão competitiva dos importados (bens comercializáveis / tradables)", "Deterioração da Balança Comercial e déficit em Transações Correntes", "Política monetária contracionista (juros reais elevados) para atrair capitais na Conta Financeira", "Crescimento da dívida líquida do setor público (efeito dos juros sobre o estoque fiscal)"],
                "expected_authors_or_facts": ["Gustavo Franco", "Marcelo de Paiva Abreu (A Ordem do Progresso)", "Fabio Giambiagi"],
                "common_fatal_errors": ["Inverter a causalidade entre apreciação cambial e saldo comercial"]
            },
            {
                "command_item": "c",
                "mandatory_concepts": ["Paradas súbitas de financiamento (sudden stops) e perda de reservas internacionais", "Esgotamento do sistema de bandas cambiais em janeiro de 1999", "Tripé Macroeconômico: câmbio flutuante, regime de metas de inflação (Decreto 3.088/1999) e metas de superávit primário"],
                "expected_authors_or_facts": ["Crise do México (1994/95), Crise Asiática (1997) e Moratória da Rússia (1998)", "Armínio Fraga no BACEN (1999)"],
                "common_fatal_errors": ["Omitir um dos três pilares do Tripé Macroeconômico"]
            }
        ]'::jsonb,
        'A superação do processo hiperinflacionário brasileiro em meados da década de 1990 exigiu o enfrentamento simultâneo do desequilíbrio fiscal e do componente inercial da inflação. Conforme diagnosticado originalmente pelas formulações de Persio Arida, André Lara Resende e Francisco Lopes, a inflação crônica brasileira perpetuava-se por mecanismos formais e informais de indexação defasada, nos quais os agentes econômicos remarcavam preços e salários com base na inflação passada para recompor picos de renda real, transferindo o patamar inflacionário de um período ao seguinte.\n\nO fracasso dos planos heterodoxos da década de 1980 — do Plano Cruzado ao Plano Collor — evidenciou que congelamentos abruptos cristalizavam preços relativos desalinhados na data do choque. Para contornar essa falha, o Plano Real foi concebido em três etapas sequenciais e transparentes. Na primeira, o Programa de Ação Imediata (PAI, 1993) buscou recompor a credibilidade orçamentária mediante cortes de gastos e a criação do Fundo Social de Emergência (FSE), mitigando a necessidade de financiamento monetário do Tesouro. Na segunda etapa, instituída em março de 1994, criou-se a Unidade Real de Valor (URV), uma moeda-índice cujo valor em cruzeiros reais era atualizado diariamente acompanhando a cotação do dólar norte-americano. Ao converter salários pela média real dos quatro meses anteriores e estimular a denominação voluntária de contratos na nova unidade de conta, a URV operou como um superindexador contemporâneo que sincronizou os reajustes e eliminou a memória inflacionária sem congelamento ou quebra contratual. Em 1º de julho de 1994, extinguiu-se o cruzeiro real e a URV passou a deter função liberatória e meio de pagamento sob a denominação de Real.\n\nNa fase imediatamente posterior à reforma monetária, a consolidação da estabilidade de preços apoiou-se de forma decisiva na chamada âncora cambial, combinada à abertura comercial e à liberalização da conta financeira. Sob a ótica do modelo Mundell-Fleming com elevada mobilidade internacional de capitais, a contenção da demanda por bens comercializáveis (tradables) deu-se mediante significativa apreciação nominal e real da taxa de câmbio. A competição dos produtos importados impôs rígido teto à remarcacão de preços industriais domésticos, mas alterou profundamente a estrutura do Balanço de Pagamentos: o país transitou de superávits comerciais históricos para déficits crescentes na Balança Comercial e na conta de Transações Correntes, os quais atingiram cerca de 4% do PIB em 1998.\n\nPara financiar esse hiato externo sob regime de bandas cambiais estreitas (na prática, um câmbio administrado), o Banco Central manteve taxas de juros reais extremamente elevadas, gerando amplo diferencial positivo frente à paridade internacional. Embora tal política monetária contracionista lograsse atrair influxos de capitais de curto prazo e investimentos diretos na Conta Financeira, ela produziu severo custo fiscal endógeno. Na ausência de superávits primários robustos entre 1995 e 1998, o serviço da dívida pública sob juros reais elevados provocou rápida expansão da relação dívida líquida/PIB, configurando uma vulnerabilidade dupla — externa e fiscal.\n\nEssa arquitetura macroeconômica revelou-se progressivamente frágil diante das sucessivas crises financeiras nos mercados emergentes ao longo da década: a crise do México (1994–1995), a crise do Sudeste Asiático (1997) e, de modo determinante, a moratória da Rússia em agosto de 1998. Esta última desencadeou forte aversão global ao risco e interrupção súbita de fluxos de capitais (sudden stop), provocando intensa perda de ativos de reserva no Brasil, a despeito da elevação defensiva da taxa básica de juros e do acordo preventivo firmado com o Fundo Monetário Internacional no final de 1998.\n\nDiante da insustentabilidade da defesa das bandas cambiais, o governo brasileiro promoveu, em janeiro de 1999, a transição para o regime de câmbio flutuante. Para evitar que a forte depreciação cambial subsequente reativasse a espiral inflacionária, estruturou-se o denominado Tripé Macroeconômico, composto por três pilares complementares e mutuamente reforçadores: (i) o regime de câmbio flutuante, responsável por absorver choques externos via preços relativos sem exaurir as reservas internacionais; (ii) o regime de Metas para a Inflação (instituído pelo Decreto nº 3.088/1999), que substituiu a âncora cambial pela âncora nominal das expectativas conduzida pelo COPOM; e (iii) a geração consistente de metas de superávit primário, consolidada posteriormente pela Lei de Responsabilidade Fiscal (2000), assegurando a solvência intertemporal da dívida pública e restaurando a autonomia da política monetária.'
    );
END $$;