-- ============================================================================
-- SEED INICIAL: 9 DISCIPLINAS DO CACD + ÁRVORE COMPLETA DE ECONOMIA
-- ============================================================================

-- 1. Inserir as 9 Disciplinas do CACD
INSERT INTO subjects (slug, name, tps_weight, has_third_phase_essay, display_order) VALUES
('economia', 'Economia', 1.0, TRUE, 1),
('historia-do-brasil', 'História do Brasil', 1.0, TRUE, 2),
('historia-mundial', 'História Mundial', 1.0, FALSE, 3),
('politica-internacional', 'Política Internacional', 1.0, TRUE, 4),
('geografia', 'Geografia', 1.0, TRUE, 5),
('direito-interno', 'Direito Interno', 1.0, TRUE, 6),
('direito-internacional', 'Direito Internacional Público', 1.0, TRUE, 7),
('portugues', 'Língua Portuguesa', 1.0, TRUE, 8),
('ingles', 'Língua Inglesa', 1.0, TRUE, 9)
ON CONFLICT (slug) DO NOTHING;

-- 2. Inserir os 5 Módulos Pedagógicos de Economia
DO $$
DECLARE
    v_econ_id UUID;
    v_mod0 UUID;
    v_mod1 UUID;
    v_mod2 UUID;
    v_mod3 UUID;
    v_mod4 UUID;
    t_01 UUID; t_02 UUID; t_03 UUID;
    t_11 UUID; t_12 UUID; t_13 UUID; t_14 UUID; t_15 UUID; t_16 UUID;
    t_21 UUID; t_22 UUID; t_23 UUID; t_24 UUID; t_25 UUID; t_26 UUID;
    t_31 UUID; t_32 UUID; t_33 UUID; t_34 UUID; t_35 UUID;
    t_41 UUID; t_42 UUID; t_43 UUID; t_44 UUID; t_45 UUID; t_46 UUID; t_47 UUID; t_48 UUID;
BEGIN
    SELECT id INTO v_econ_id FROM subjects WHERE slug = 'economia';

    INSERT INTO modules (subject_id, code, title, description, pedagogical_order)
    VALUES (v_econ_id, 'MOD-0', 'Fundação e Instrumental Econômico (Base Zero)', 'Vocabulário econômico, variáveis reais vs. nominais e leitura visual de curvas e deslocamentos.', 0)
    RETURNING id INTO v_mod0;

    INSERT INTO modules (subject_id, code, title, description, pedagogical_order)
    VALUES (v_econ_id, 'MOD-1', 'Microeconomia Aplicada', 'Teoria do consumidor, elasticidades, custos de produção, estruturas de mercado e falhas de mercado.', 1)
    RETURNING id INTO v_mod1;

    INSERT INTO modules (subject_id, code, title, description, pedagogical_order)
    VALUES (v_econ_id, 'MOD-2', 'Macroeconomia Fechada, Moeda e Crescimento', 'Contabilidade nacional, sistema monetário, debate Clássico vs. Keynesiano, IS-LM, Curva de Phillips e Solow.', 2)
    RETURNING id INTO v_mod2;

    INSERT INTO modules (subject_id, code, title, description, pedagogical_order)
    VALUES (v_econ_id, 'MOD-3', 'Economia Internacional, Câmbio e Balanço de Pagamentos', 'Estrutura do BP (BPM6/FMI), regimes cambiais, modelo Mundell-Fleming (IS-LM-BP) e teorias do comércio.', 3)
    RETURNING id INTO v_mod3;

    INSERT INTO modules (subject_id, code, title, description, pedagogical_order)
    VALUES (v_econ_id, 'MOD-4', 'História Econômica do Brasil e Economia Contemporânea', 'Da economia cafeeira na Primeira República ao Plano Real, Tripé Macroeconômico e reformas do século XXI.', 4)
    RETURNING id INTO v_mod4;

    -- Tópicos do Módulo 0
    INSERT INTO topics (module_id, code, official_edital_ref, title, pedagogical_order, estimated_minutes, is_critical_for_essay)
    VALUES (v_mod0, '0.1', 'Fundamentos', 'Escassez, Custo de Oportunidade e Fronteira de Produção (FPP)', 1, 60, FALSE) RETURNING id INTO t_01;
    INSERT INTO topics (module_id, code, official_edital_ref, title, pedagogical_order, estimated_minutes, is_critical_for_essay)
    VALUES (v_mod0, '0.2', 'Fundamentos', 'Variáveis Reais vs. Nominais, Índices de Preços e Fluxo vs. Estoque', 2, 60, TRUE) RETURNING id INTO t_02;
    INSERT INTO topics (module_id, code, official_edital_ref, title, pedagogical_order, estimated_minutes, is_critical_for_essay)
    VALUES (v_mod0, '0.3', 'Fundamentos', 'Leitura de Gráficos: Movimento ao Longo da Curva vs. Deslocamento', 3, 60, FALSE) RETURNING id INTO t_03;

    -- Tópicos do Módulo 1 (Microeconomia)
    INSERT INTO topics (module_id, code, official_edital_ref, title, pedagogical_order, estimated_minutes, is_critical_for_essay)
    VALUES (v_mod1, '1.1', 'Ponto 1', 'Teoria do Consumidor: Utilidade, Efeito Renda e Efeito Substituição', 4, 90, FALSE) RETURNING id INTO t_11;
    INSERT INTO topics (module_id, code, official_edital_ref, title, pedagogical_order, estimated_minutes, is_critical_for_essay)
    VALUES (v_mod1, '1.2', 'Ponto 1', 'Oferta, Demanda, Equilíbrio, Excedentes e Peso Morto de Impostos', 5, 90, FALSE) RETURNING id INTO t_12;
    INSERT INTO topics (module_id, code, official_edital_ref, title, pedagogical_order, estimated_minutes, is_critical_for_essay)
    VALUES (v_mod1, '1.3', 'Ponto 1', 'Elasticidades (Preço, Renda e Cruzada) e Incidência Tributária', 6, 90, TRUE) RETURNING id INTO t_13;
    INSERT INTO topics (module_id, code, official_edital_ref, title, pedagogical_order, estimated_minutes, is_critical_for_essay)
    VALUES (v_mod1, '1.4', 'Ponto 1', 'Função de Produção, Produtividade Marginal e Custos da Firma', 7, 90, FALSE) RETURNING id INTO t_14;
    INSERT INTO topics (module_id, code, official_edital_ref, title, pedagogical_order, estimated_minutes, is_critical_for_essay)
    VALUES (v_mod1, '1.5', 'Ponto 1', 'Estruturas de Mercado (Concorrência, Monopólio, Oligopólio) e Teoria dos Jogos', 8, 120, TRUE) RETURNING id INTO t_15;
    INSERT INTO topics (module_id, code, official_edital_ref, title, pedagogical_order, estimated_minutes, is_critical_for_essay)
    VALUES (v_mod1, '1.6', 'Ponto 1', 'Falhas de Mercado: Externalidades, Bens Públicos e Assimetria de Informação', 9, 90, TRUE) RETURNING id INTO t_16;

    -- Tópicos do Módulo 2 (Macroeconomia)
    INSERT INTO topics (module_id, code, official_edital_ref, title, pedagogical_order, estimated_minutes, is_critical_for_essay)
    VALUES (v_mod2, '2.1', 'Ponto 2', 'Contabilidade Nacional, Óticas do PIB e Identidades Macroeconômicas', 10, 90, TRUE) RETURNING id INTO t_21;
    INSERT INTO topics (module_id, code, official_edital_ref, title, pedagogical_order, estimated_minutes, is_critical_for_essay)
    VALUES (v_mod2, '2.2', 'Ponto 3', 'Moeda, Multiplicador Bancário e Instrumentos de Política Monetária', 11, 90, TRUE) RETURNING id INTO t_22;
    INSERT INTO topics (module_id, code, official_edital_ref, title, pedagogical_order, estimated_minutes, is_critical_for_essay)
    VALUES (v_mod2, '2.3', 'Ponto 2', 'Modelo Clássico (Lei de Say e TQM) vs. Modelo Keynesiano e Multiplicador', 12, 120, TRUE) RETURNING id INTO t_23;
    INSERT INTO topics (module_id, code, official_edital_ref, title, pedagogical_order, estimated_minutes, is_critical_for_essay)
    VALUES (v_mod2, '2.4', 'Ponto 2', 'Modelo IS-LM em Economia Fechada: Crowding-Out e Armadilha da Liquidez', 13, 120, TRUE) RETURNING id INTO t_24;
    INSERT INTO topics (module_id, code, official_edital_ref, title, pedagogical_order, estimated_minutes, is_critical_for_essay)
    VALUES (v_mod2, '2.5', 'Ponto 2', 'Oferta e Demanda Agregada (OA-DA), Curva de Phillips e Expectativas', 14, 120, TRUE) RETURNING id INTO t_25;
    INSERT INTO topics (module_id, code, official_edital_ref, title, pedagogical_order, estimated_minutes, is_critical_for_essay)
    VALUES (v_mod2, '2.6', 'Ponto 2', 'Modelos de Crescimento (Solow e Endógeno), PTF e Desenvolvimento', 15, 90, TRUE) RETURNING id INTO t_26;

    -- Tópicos do Módulo 3 (Economia Internacional)
    INSERT INTO topics (module_id, code, official_edital_ref, title, pedagogical_order, estimated_minutes, is_critical_for_essay)
    VALUES (v_mod3, '3.1', 'Ponto 4', 'Balanço de Pagamentos (BPM6/FMI): Transações Correntes, Conta Financeira e Reservas', 16, 120, TRUE) RETURNING id INTO t_31;
    INSERT INTO topics (module_id, code, official_edital_ref, title, pedagogical_order, estimated_minutes, is_critical_for_essay)
    VALUES (v_mod3, '3.2', 'Ponto 4', 'Taxa de Câmbio Nominal e Real, PPC, Paridade de Juros (UIP) e Regimes Cambiais', 17, 120, TRUE) RETURNING id INTO t_32;
    INSERT INTO topics (module_id, code, official_edital_ref, title, pedagogical_order, estimated_minutes, is_critical_for_essay)
    VALUES (v_mod3, '3.3', 'Ponto 4', 'Modelo Mundell-Fleming (IS-LM-BP) e a Trindade Impossível', 18, 150, TRUE) RETURNING id INTO t_33;
    INSERT INTO topics (module_id, code, official_edital_ref, title, pedagogical_order, estimated_minutes, is_critical_for_essay)
    VALUES (v_mod3, '3.4', 'Ponto 4', 'Teorias do Comércio Internacional: Ricardo, Heckscher-Ohlin, Stolper-Samuelson e Krugman', 19, 120, TRUE) RETURNING id INTO t_34;
    INSERT INTO topics (module_id, code, official_edital_ref, title, pedagogical_order, estimated_minutes, is_critical_for_essay)
    VALUES (v_mod3, '3.5', 'Ponto 4', 'Política Comercial (Tarifas, Cotas, Prebisch-Singer) e Sistema de Bretton Woods à OMC', 20, 120, TRUE) RETURNING id INTO t_35;

    -- Tópicos do Módulo 4 (História Econômica do Brasil)
    INSERT INTO topics (module_id, code, official_edital_ref, title, pedagogical_order, estimated_minutes, is_critical_for_essay)
    VALUES (v_mod4, '4.1', 'Ponto 5', 'Economia Cafeeira na Primeira República: Encilhamento, Murtinho e Convênio de Taubaté (1889-1930)', 21, 120, TRUE) RETURNING id INTO t_41;
    INSERT INTO topics (module_id, code, official_edital_ref, title, pedagogical_order, estimated_minutes, is_critical_for_essay)
    VALUES (v_mod4, '4.2', 'Ponto 5', 'Crise de 1929, Defesa do Café (Furtado) e Industrialização na Era Vargas (1930-1945)', 22, 120, TRUE) RETURNING id INTO t_42;
    INSERT INTO topics (module_id, code, official_edital_ref, title, pedagogical_order, estimated_minutes, is_critical_for_essay)
    VALUES (v_mod4, '4.3', 'Ponto 5', 'Pós-Guerra (Dutra, 2º Vargas, Instrução 113 da SUMOC) e Plano de Metas de JK (1945-1961)', 23, 120, TRUE) RETURNING id INTO t_43;
    INSERT INTO topics (module_id, code, official_edital_ref, title, pedagogical_order, estimated_minutes, is_critical_for_essay)
    VALUES (v_mod4, '4.4', 'Ponto 5', 'Crise dos Anos 1960, Reformas do PAEG e o Milagre Econômico (1962-1973)', 24, 120, TRUE) RETURNING id INTO t_44;
    INSERT INTO topics (module_id, code, official_edital_ref, title, pedagogical_order, estimated_minutes, is_critical_for_essay)
    VALUES (v_mod4, '4.5', 'Ponto 5', 'Choques do Petróleo, II PND e a Crise da Dívida Externa nos Anos 1980 (1974-1985)', 25, 120, TRUE) RETURNING id INTO t_45;
    INSERT INTO topics (module_id, code, official_edital_ref, title, pedagogical_order, estimated_minutes, is_critical_for_essay)
    VALUES (v_mod4, '4.6', 'Ponto 6', 'Teoria da Inflação Inercial e Planos Heterodoxos: Cruzado ao Collor II (1985-1993)', 26, 120, TRUE) RETURNING id INTO t_46;
    INSERT INTO topics (module_id, code, official_edital_ref, title, pedagogical_order, estimated_minutes, is_critical_for_essay)
    VALUES (v_mod4, '4.7', 'Ponto 6', 'Plano Real (PAI, URV, Âncora Cambial), Crises Externas e Mudança Cambial de 1999 (1994-1999)', 27, 150, TRUE) RETURNING id INTO t_47;
    INSERT INTO topics (module_id, code, official_edital_ref, title, pedagogical_order, estimated_minutes, is_critical_for_essay)
    VALUES (v_mod4, '4.8', 'Ponto 6', 'Economia Brasileira no Século XXI: Tripé Macroeconômico, Fiscal, Reforma Tributária e Comércio', 28, 120, TRUE) RETURNING id INTO t_48;

    -- Pré-requisitos críticos na árvore (exemplos de dependências)
    INSERT INTO topic_prerequisites (topic_id, prerequisite_topic_id) VALUES
    (t_12, t_03), -- Equilíbrio requer Leitura de Gráficos
    (t_24, t_22), -- IS-LM requer Moeda/Política Monetária
    (t_24, t_23), -- IS-LM requer Keynes
    (t_32, t_02), -- Câmbio Real requer Variáveis Reais vs Nominais
    (t_33, t_24), -- Mundell-Fleming requer IS-LM
    (t_33, t_31), -- Mundell-Fleming requer Balanço de Pagamentos
    (t_33, t_32), -- Mundell-Fleming requer Câmbio
    (t_42, t_23), -- Era Vargas/Furtado requer Demanda Efetiva Keynesiana
    (t_45, t_31), -- II PND e Crise da Dívida requer Balanço de Pagamentos
    (t_47, t_33); -- Plano Real e Crise de 1999 requer Mundell-Fleming

    -- Cenário Inicial no Tradutor de Gráficos (Mundell-Fleming)
    INSERT INTO causal_models (
        topic_id, slug, model_family, scenario_title, context_parameters,
        causal_chain_steps, graph_config, bp_impact_summary, model_essay_paragraph
    ) VALUES (
        t_33,
        'mf-flutuante-perfeita-exp-fiscal',
        'Mundell-Fleming',
        'Expansão Fiscal sob Câmbio Flutuante e Perfeita Mobilidade de Capitais',
        '{"regime_cambial": "flutuante", "mobilidade_capital": "perfeita", "choque": "fiscal_expansivo"}'::jsonb,
        '[
            {"step": 1, "curve": "IS", "shift": "direita", "title": "Choque Fiscal Inicial", "mechanism": "O aumento dos gastos públicos (G) eleva a demanda agregada e desloca a curva IS para a direita (IS1 -> IS2), pressionando a taxa de juros doméstica acima da internacional (i > i*)."},
            {"step": 2, "curve": "CAMBIO", "shift": "apreciacao", "title": "Influxo de Capitais e Apreciação Cambial", "mechanism": "O diferencial de juros atrai um influxo massivo de capitais na Conta Financeira. Como o Banco Central não intervém no câmbio flutuante, a entrada de divisas provoca imediata apreciação nominal e real da moeda doméstica."},
            {"step": 3, "curve": "IS", "shift": "esquerda", "title": "Crowding-Out Externo Completo", "mechanism": "A valorização cambial encarece os bens domésticos e barateia os importados, reduzindo as exportações líquidas (NX). A queda em NX contrai a demanda agregada e devolve a curva IS exatamente à posição original (IS1), tornando a política fiscal ineficaz sobre a renda."}
        ]'::jsonb,
        '{"xAxis": "Renda / Produto (Y)", "yAxis": "Taxa de Juros (i)", "bpSlope": "horizontal", "initialEquilibrium": {"Y": 50, "i": 50}, "shockEquilibrium": {"Y": 70, "i": 65}, "finalEquilibrium": {"Y": 50, "i": 50}}'::jsonb,
        'Superávit ex-ante na Conta Financeira (entrada de carteira/arbitragem) compensado por deterioração na Balança Comercial (Transações Correntes); Variação de Ativos de Reserva igual a zero.',
        'Sob a ótica do modelo Mundell-Fleming com perfeita mobilidade de capitais e regime de câmbio flutuante, uma política fiscal expansionista revela-se inócua para estimular o produto agregado. O aumento autônomo do gasto público desloca inicialmente a curva IS para a direita, gerando pressão altista sobre a taxa de juros doméstica frente à paridade internacional. O consequente influxo de capitais na Conta Financeira do Balanço de Pagamentos induz a apreciação nominal e real da taxa de câmbio, deteriorando a competitividade externa e o saldo comercial em Transações Correntes. Configura-se, assim, o efeito deslocamento (crowding-out) externo completo: a retração das exportações líquidas anula o impulso fiscal inicial, reconduzindo a curva IS e o nível de renda ao equilíbrio original.'
    );
END $$;