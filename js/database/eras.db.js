window.ERA_DEFINITIONS = [
    {
        id: 0,
        name: 'Era do Vapor',
        description: 'Tudo começa com carvão e suor.',
        unlocks: ['mina_carvao_basica', 'caldeira_carvao', 'maquina_vapor', 'britador_mecanico', 'captacao_agua_manual', 'filtro_mecanico', 'pedreira_calcario', 'mineradora_basica', 'terminal_suprimentos', 'hub', 'deposito', 'mercado'],
        requirement: null
    },
    {
        id: 1,
        name: 'Era Industrial',
        description: 'O carvão gera eletricidade. Uma revolução.',
        unlocks: ['usina_termoeletrica', 'mineradora_fe', 'mineradora_cu', 'mina_carvao', 'captacao_agua', 'eta', 'britador', 'coqueria', 'forno_cal', 'forno_sinterizacao', 'compressor_ar', 'extratora_areia', 'canteiro_obras'],
        requirement: { resource: 'minerio_frag', amount: 200 }
    },
    {
        id: 2,
        name: 'Era do Aço',
        description: 'Metalurgia avançada e petróleo.',
        unlocks: ['alto_forno', 'aciaria', 'laminador', 'flotacao', 'forno_fundicao_cu', 'eletrólise', 'trefiladora', 'poco_petroleo', 'refinaria_combustivel', 'usina_oleo', 'mina_nitrato', 'planta_explosivos', 'oficina_cantaria', 'laminador_perfis', 'fabrica_vidro'],
        requirement: { resource: 'ferro_gusa', amount: 200 }
    },
    {
        id: 3,
        name: 'Era Moderna',
        description: 'Solar, alumínio e eletrônica.',
        unlocks: ['usina_solar', 'mineradora_bauxita', 'refinaria_alumina', 'eletrolise_aluminio', 'laminadora_aluminio', 'mineradora_silica', 'purificacao_silicio', 'fabrica_chips'],
        requirement: { resource: 'aco_bruto', amount: 100, urbanizedPop: 200 }
    },
    {
        id: 4,
        name: 'Era Nuclear',
        description: 'Titânio e alta tecnologia.',
        unlocks: ['mineradora_titanio', 'refinaria_titanio', 'forja_titanio'],
        requirement: { resource: 'componente_eletronico', amount: 50 }
    }
];

function checkEraProgression() {
    const currentEra = gameState.era;
    if (currentEra >= ERA_DEFINITIONS.length - 1) return;
    const nextEra = ERA_DEFINITIONS[currentEra + 1];
    if (!nextEra.requirement) return;
    const { resource, amount } = nextEra.requirement;

    let produced = gameState.totalProducedGlobal[resource] || 0;
    produced = Math.max(produced, gameState.globalInventory[resource] || 0);
    let machineSum = 0;
    gameState.machines.forEach(m => { machineSum += (m.totalProduced?.[resource] || 0); });
    produced = Math.max(produced, machineSum);


    const progress = Math.min(100, Math.round((produced / amount) * 100));
    gameState.eraProgress = progress;

    const eraProgressEl = document.getElementById('eraProgressDebug');
    if (eraProgressEl) eraProgressEl.textContent = `${resource}: ${Math.round(produced)}/${amount}`;

    // Extra requirement: urbanizedPop threshold
    if (nextEra.requirement.urbanizedPop) {
        const urbanized = gameState.city?.urbanizedPop || 0;
        const threshold = nextEra.requirement.urbanizedPop;
        const urbanEl = document.getElementById('eraUrbanDebug');
        if (urbanEl) urbanEl.textContent = `Urbanizados: ${urbanized}/${threshold}`;
        if (urbanized < threshold) return;
    }

    if (produced >= amount) {
        gameState.era = currentEra + 1;
        gameState.eraProgress = 0;
        showEraUnlockNotification(ERA_DEFINITIONS[gameState.era]);
        createToolbarChips();
        saveGameState();
    }
}

function showEraUnlockNotification(eraDef) {
    const existing = document.getElementById('era-unlock-notification');
    if (existing) existing.remove();
    const notif = document.createElement('div');
    notif.id = 'era-unlock-notification';
    notif.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #1a2a1a, #0d1f0d);
        border: 2px solid #4ade80; border-radius: 16px;
        padding: 32px 48px; text-align: center; z-index: 9999;
        box-shadow: 0 0 60px rgba(74,222,128,0.4);
        animation: eraUnlockPop 0.4s cubic-bezier(0.34,1.56,0.64,1);
    `;
    notif.innerHTML = `
        <div style="font-size:48px;margin-bottom:12px;">⚙️</div>
        <div style="font-size:11px;letter-spacing:3px;color:#4ade80;text-transform:uppercase;margin-bottom:8px;">Nova Era Desbloqueada</div>
        <div style="font-size:24px;font-weight:700;color:#fff;margin-bottom:8px;">${eraDef.name}</div>
        <div style="font-size:13px;color:#a0a0a0;margin-bottom:20px;">${eraDef.description}</div>
        <div style="font-size:11px;color:#4ade80;">${eraDef.unlocks.length} novas máquinas disponíveis</div>
        <button onclick="this.parentElement.remove()" style="margin-top:20px;padding:8px 24px;background:#4ade80;color:#000;border:none;border-radius:8px;cursor:pointer;font-weight:600;">Continuar</button>
    `;
    document.body.appendChild(notif);
    setTimeout(() => { if (notif.parentElement) notif.remove(); }, 8000);
}

function isEraUnlocked(machineType) {
    const def = machineTypes[machineType];
    if (!def) return false;
    const machineEra = def.era ?? 0;
    return machineEra <= gameState.era;
}
