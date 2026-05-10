// ═══ BALANCE DATABASE v1 — Fonte única de verdade para calibração do jogo ═══
// Mexa aqui para ajustar dificuldade, economia e ritmo sem tocar na lógica.

window.BALANCE = {

    // ── Tempo de jogo ────────────────────────────────────────────────────────
    // 1 dia de jogo = GAME_DAY_REAL_SECONDS segundos reais
    // A velocidade do jogo (1x, 2x, 4x) multiplica esse contador.
    GAME_DAY_REAL_SECONDS: 120,          // 2 min reais = 1 dia de jogo

    // ── Impostos ──────────────────────────────────────────────────────────────
    TAX: {
        BASE_GOLD_PER_CITIZEN_PER_GAME_HOUR: 0.1,  // ouro base por habitante por hora de jogo
        MAX_RATE_PERCENT: 30,                        // limite do slider de imposto
        HAPPINESS_PENALTY_PER_PERCENT: 1.5,         // -felicidade por % de imposto
    },

    // ── Consumo de recursos ───────────────────────────────────────────────────
    CONSUMPTION: {
        GRAOS_PER_MORADOR_PER_SECOND: 0.5 / 3600,  // consumo de grãos por morador por segundo real
        CARNE_HAPPINESS_BONUS:         10,           // bônus de felicidade ao ter carne disponível
        STARVATION_GRACE_SECONDS:      45,           // segundos de fome antes de declínio
    },

    // ── Poluição ──────────────────────────────────────────────────────────────
    POLLUTION: {
        // Cada unidade de poluição reduz felicidade em X pontos
        HAPPINESS_PENALTY_PER_UNIT:    0.3,
        // Acima desse nível, migração é bloqueada
        MIGRATION_BLOCK_THRESHOLD:     70,
        // Acima desse nível, emite aviso de zoneamento residencial
        RESIDENTIAL_WARNING_THRESHOLD: 30,
        // Poluição decai naturalmente (por segundo real)
        DECAY_RATE_PER_SECOND:         0.002,
    },

    // ── Mão de obra (Industry-City Link) ─────────────────────────────────────
    LABOR: {
        // Porcentagem da população em idade ativa (trabalhadores potenciais)
        WORKER_RATIO: 0.7,
        // Limiar abaixo do qual o "Gargalo Humano" é exibido no UI
        SHORTAGE_DISPLAY_THRESHOLD: 0.9,
    },

    // ── Crescimento / Declínio populacional ──────────────────────────────────
    POPULATION: {
        GROWTH_RATE_PER_HOUR:  0.3,    // novos moradores por hora se felicidade > 40
        DECLINE_RATE_PER_HOUR: 1.5,    // saída de moradores por hora em fome
        MIGRATION_COOLDOWN_SECONDS: 15, // pausa mínima entre waves de migração
    },

    // ── Evento onNewDay ───────────────────────────────────────────────────────
    NEW_DAY: {
        // Bônus de ouro fixo por dia (além dos impostos contínuos)
        GOLD_BONUS_BASE:         0,     // 0 = desativado; aumente para dar recompensa diária
        // Eventos de migração só ocorrem se felicidade >= esse valor
        MIGRATION_MIN_HAPPINESS: 40,
    },
};
