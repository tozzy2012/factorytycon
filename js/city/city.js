// ═══ CITY ENGINE — Simulação de moradores ═══

function initCityState() {
    if (!gameState.city) {
        gameState.city = {
            moradores: 8,
            moradoresMax: 8,
            trabalhadores: { total: 0, alocados: 0, livres: 0 },
            felicidade: 60,
            comida: { graos: 40, carne: 0 },
            comidaStorage: 100,
            starvationTimer: 0,
            buildings: [],
            policies: { taxRate: 0, housingSubsidy: false, foodRation: false },
            stats: { moradoresMax: 8, goldFromTax: 0, totalGraosProduced: 0 },
            firstGrowth: false,
            pesquisaPoints: 0,
        };
        gameState.city.buildings.push({ type: 'prefeitura', id: 'city-0', workers_assigned: 0 });
        gameState.city.buildings.push({ type: 'casa_simples', id: 'city-1', workers_assigned: 0 });
        gameState.city.buildings.push({ type: 'casa_simples', id: 'city-2', workers_assigned: 0 });
        gameState.city.buildings.push({ type: 'campo_graos', id: 'city-3', workers_assigned: 2 });
    }
}

function updateCity(dtSeconds) {
    const city = gameState.city;
    if (!city) return;
    const C = CITY_CONSUMPTION;

    // Capacidade de moradia
    let moradia = 0;
    city.buildings.forEach(b => {
        const def = cityBuildings[b.type];
        if (def && def.capacity > 0) moradia += def.capacity;
    });
    city.moradoresMax = moradia;

    // Trabalhadores
    const totalWorkers = Math.floor(city.moradores * 0.6);
    city.trabalhadores.total = totalWorkers;
    let cityWorkersNeeded = 0;
    city.buildings.forEach(b => {
        const def = cityBuildings[b.type];
        if (def && def.workers > 0) cityWorkersNeeded += def.workers;
    });
    const cityWorkersUsed = Math.min(cityWorkersNeeded, totalWorkers);
    city.trabalhadores.alocados = cityWorkersUsed;
    city.trabalhadores.livres = Math.max(0, totalWorkers - cityWorkersUsed);

    // Produção alimentar
    city.buildings.forEach(b => {
        const def = cityBuildings[b.type];
        if (!def || !def.output) return;
        const workersHere = Math.min(def.workers || 0, totalWorkers);
        const efficiency = def.workers > 0 ? workersHere / def.workers : 1;
        if (def.output === 'graos') {
            const produced = def.outputRate * efficiency * dtSeconds / 3600;
            city.comida.graos = Math.min(city.comidaStorage, (city.comida.graos || 0) + produced);
            city.stats.totalGraosProduced += produced;
        }
        if (def.output === 'carne' && def.input === 'graos') {
            const inputNeeded = def.inputRate * efficiency * dtSeconds / 3600;
            const canProduce = Math.min(inputNeeded, city.comida.graos || 0);
            if (canProduce > 0) {
                city.comida.graos = Math.max(0, (city.comida.graos || 0) - canProduce);
                city.comida.carne = Math.min(city.comidaStorage, (city.comida.carne || 0) + def.outputRate * (canProduce / Math.max(0.001, inputNeeded)) * dtSeconds / 3600);
            }
        }
    });

    // Pontos de pesquisa via escola
    city.buildings.forEach(b => {
        const def = cityBuildings[b.type];
        if (def && def.researchRate) {
            city.pesquisaPoints = (city.pesquisaPoints || 0) + def.researchRate * dtSeconds / 3600;
        }
    });

    // Consumo alimentar
    const consumption = C.graosPerMorador * city.moradores * dtSeconds;
    const foodAvail = (city.comida.graos || 0) + (city.comida.carne || 0);
    if (foodAvail >= consumption) {
        const fromGraos = Math.min(consumption, city.comida.graos || 0);
        city.comida.graos = Math.max(0, (city.comida.graos || 0) - fromGraos);
        city.comida.carne = Math.max(0, (city.comida.carne || 0) - Math.max(0, consumption - fromGraos));
        city.starvationTimer = 0;
    } else {
        city.starvationTimer += dtSeconds;
        city.comida.graos = 0;
    }

    // Felicidade
    const foodSurplus = Math.min(1, foodAvail / Math.max(1, consumption * 2));
    const housingSurplus = moradia > 0 ? Math.min(1, moradia / Math.max(1, city.moradores)) : 0;
    const starvationPenalty = city.starvationTimer > C.starvationGracePeriod ? 30 : 0;
    const taxPenalty = (city.policies?.taxRate || 0) * 1.5;
    const carneBonus = (city.comida.carne || 0) > 0 ? C.carneBonus : 0;
    city.felicidade = Math.max(0, Math.min(100, foodSurplus * 50 + housingSurplus * 30 + carneBonus + 20 - starvationPenalty - taxPenalty));

    // Crescimento / declínio
    if (city.starvationTimer > C.starvationGracePeriod) {
        city.moradores = Math.max(1, city.moradores - C.declineRate * dtSeconds);
    } else if (city.felicidade > 50 && city.moradores < moradia) {
        const before = Math.floor(city.moradores);
        city.moradores = Math.min(moradia, city.moradores + C.growthRate * dtSeconds * (city.felicidade / 100));
        if (Math.floor(city.moradores) > before && !city.firstGrowth) {
            city.firstGrowth = true;
            if (window.AudioEngine) AudioEngine.play('population');
            showCityNotification('👶 Novos moradores chegaram!');
        }
    }

    // Imposto
    if (city.policies?.taxRate > 0) {
        const tax = (city.policies.taxRate / 100) * city.moradores * 0.1 * dtSeconds / 3600;
        gameState.gold += tax;
        city.stats.goldFromTax += tax;
    }
}

function buildCityBuilding(type) {
    const def = cityBuildings[type];
    if (!def) return false;
    if ((def.era || 0) > gameState.era) { showCityNotification('🔒 Desbloqueado na próxima era'); if(window.AudioEngine) AudioEngine.play('error'); return false; }
    if (def.unique && gameState.city.buildings.some(b => b.type === type)) { showCityNotification('⚠️ Apenas um por cidade'); if(window.AudioEngine) AudioEngine.play('error'); return false; }
    for (const [res, qty] of Object.entries(def.buildCost || {})) {
        if ((gameState.globalInventory[res] || 0) < qty) { showCityNotification(`❌ Faltam ${Math.ceil(qty - (gameState.globalInventory[res]||0))} ${getResourceName(res)}`); if(window.AudioEngine) AudioEngine.play('error'); return false; }
    }
    for (const [res, qty] of Object.entries(def.buildCost || {})) {
        gameState.globalInventory[res] = Math.max(0, (gameState.globalInventory[res] || 0) - qty);
    }
    gameState.city.buildings.push({ type, id: `city-${Date.now()}`, workers_assigned: 0 });
    if(window.AudioEngine) AudioEngine.play('house');
    saveGameState();
    renderCityWorkspace();
    return true;
}

function demolishCityBuilding(id) {
    const idx = gameState.city.buildings.findIndex(b => b.id === id);
    if (idx < 0 || cityBuildings[gameState.city.buildings[idx].type]?.unique) return;
    gameState.city.buildings.splice(idx, 1);
    if(window.AudioEngine) AudioEngine.play('delete');
    saveGameState();
    renderCityWorkspace();
}

function showCityNotification(msg) {
    let el = document.getElementById('city-notification');
    if (!el) { el = document.createElement('div'); el.id = 'city-notification'; el.className = 'city-notification'; document.body.appendChild(el); }
    el.textContent = msg;
    el.classList.add('visible');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('visible'), 2500);
}

function getIndustryWorkerFactor() {
    if (!gameState.city) return 1;
    const free = gameState.city.trabalhadores.livres;
    const needed = gameState.machines.filter(m => machineTypes[m.type]?.workers > 0).reduce((s, m) => s + (machineTypes[m.type]?.workers || 0), 0);
    if (needed === 0) return 1;
    return Math.min(1, free / needed);
}
