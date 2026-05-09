// ═══ CITY DATABASE — Edifícios e definições ═══
window.cityBuildings = {
    prefeitura: {
        name: 'Prefeitura',
        icon: '🏛️',
        category: 'admin',
        era: 0,
        unique: true,
        cost: {},
        buildCost: {},
        capacity: 0,
        workers: 0,
        description: 'Centro administrativo. Habilita a gestão da cidade e políticas.',
    },
    casa_simples: {
        name: 'Casa Simples',
        icon: '🏠',
        category: 'moradia',
        era: 0,
        cost: {},
        buildCost: { tabua_madeira: 10 },
        capacity: 4,
        workers: 0,
        description: 'Abriga 4 moradores. Requer tábuas de madeira para construir.',
    },
    casa_media: {
        name: 'Casa Média',
        icon: '🏡',
        category: 'moradia',
        era: 1,
        cost: {},
        buildCost: { tabua_madeira: 20, chapa_aco: 5 },
        capacity: 8,
        workers: 0,
        description: 'Abriga 8 moradores. Requer aço.',
    },
    campo_graos: {
        name: 'Campo de Grãos',
        icon: '🌾',
        category: 'comida',
        era: 0,
        buildCost: { tabua_madeira: 5 },
        workers: 2,
        output: 'graos',
        outputRate: 8,
        description: 'Produz grãos. Requer 2 trabalhadores.',
    },
    rancho: {
        name: 'Rancho',
        icon: '🐄',
        category: 'comida',
        era: 0,
        buildCost: { tabua_madeira: 12 },
        workers: 3,
        input: 'graos',
        inputRate: 2,
        output: 'carne',
        outputRate: 4,
        description: 'Converte grãos em carne. Requer 3 trabalhadores.',
    },
    armazem_comida: {
        name: 'Armazém de Comida',
        icon: '🏚️',
        category: 'logistica',
        era: 0,
        buildCost: { tabua_madeira: 8 },
        workers: 0,
        storageBonus: 200,
        description: 'Aumenta buffer de alimentos em 200 unidades.',
    },
};

window.CITY_POLICY_DEFAULTS = {
    taxRate: 0,       // 0-30% — afeta felicidade negativamente, gera gold
    housingSubsidy: false, // reduz custo de casas em 20%
    foodRation: false,     // reduz consumo alimentar em 30% mas penaliza felicidade
};

window.CITY_CONSUMPTION = {
    graosPerMorador: 0.3 / 3600,  // unidades por segundo
    carneBonus: 10,                // felicidade +10 se carne disponível
    starvationGracePeriod: 60,     // segundos sem comida antes de declínio
    happinessDecayRate: 1 / 3600,  // por segundo sem comida
    growthRate: 0.5 / 3600,        // moradores/s por housing_disponível quando feliz
    declineRate: 1 / 3600,         // moradores/s quando miserável
};
