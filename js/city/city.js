// ═══ CITY ENGINE v2 — Moradores, trabalhadores e migração ═══

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
            migrationQueue: 0,
            migrationCooldown: 0,
            migrationLog: [],
        };
        gameState.city.buildings.push({ type: 'prefeitura', id: 'city-0', workers_assigned: 0 });
        gameState.city.buildings.push({ type: 'casa_simples', id: 'city-1', workers_assigned: 0 });
        gameState.city.buildings.push({ type: 'casa_simples', id: 'city-2', workers_assigned: 0 });
        gameState.city.buildings.push({ type: 'campo_graos', id: 'city-3', workers_assigned: 2 });
    }
    // Ensure migration fields exist on old saves
    if (!gameState.city.migrationQueue && gameState.city.migrationQueue !== 0) gameState.city.migrationQueue = 0;
    if (!gameState.city.migrationCooldown) gameState.city.migrationCooldown = 0;
    if (!gameState.city.migrationLog) gameState.city.migrationLog = [];
}

function updateCity(dtSeconds) {
    const city = gameState.city;
    if (!city) return;
    const C = CITY_CONSUMPTION;

    // ── Housing capacity ──
    let moradia = 0;
    city.buildings.forEach(b => {
        const def = cityBuildings[b.type];
        if (def && def.capacity > 0) moradia += def.capacity;
    });
    city.moradoresMax = moradia;

    // ── Workers: city buildings + industry machines ──
    const totalWorkers = Math.floor(city.moradores * 0.7); // 70% of pop are working age
    city.trabalhadores.total = totalWorkers;

    // City building workers needed
    let cityWorkersNeeded = 0;
    city.buildings.forEach(b => {
        const def = cityBuildings[b.type];
        if (def && def.workers > 0) cityWorkersNeeded += def.workers;
    });

    // Industry machine workers needed (from machine.workersAssigned)
    let industryWorkersNeeded = 0;
    if (gameState.machines) {
        gameState.machines.forEach(m => {
            const def = machineTypes[m.type];
            if (def && (def.workersMin || 0) > 0) {
                industryWorkersNeeded += (m.workersAssigned || 0);
            }
        });
    }

    const totalNeeded = cityWorkersNeeded + industryWorkersNeeded;
    city.trabalhadores.alocados = Math.min(totalNeeded, totalWorkers);
    city.trabalhadores.livres = Math.max(0, totalWorkers - totalNeeded);

    // Gargalo Humano: marca flag global se há escassez de mão de obra
    const workerCoverage = totalNeeded > 0 ? (totalWorkers / totalNeeded) : 1;
    gameState.laborShortage = workerCoverage < ((typeof BALANCE !== 'undefined' && BALANCE.LABOR) ? BALANCE.LABOR.SHORTAGE_DISPLAY_THRESHOLD : 0.9);

    // If not enough workers, cap industry workers proportionally
    if (totalNeeded > totalWorkers && industryWorkersNeeded > 0) {
        const available = Math.max(0, totalWorkers - cityWorkersNeeded);
        const ratio = available / industryWorkersNeeded;
        gameState.machines.forEach(m => {
            const def = machineTypes[m.type];
            if (def && (def.workersMin || 0) > 0) {
                m._effectiveWorkers = Math.floor((m.workersAssigned || 0) * ratio);
            }
        });
    } else {
        // Enough workers — effective = assigned
        if (gameState.machines) {
            gameState.machines.forEach(m => {
                const def = machineTypes[m.type];
                if (def && (def.workersMin || 0) > 0) {
                    m._effectiveWorkers = m.workersAssigned || 0;
                }
            });
        }
    }

    // ── Food production ──
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
                const ratio = canProduce / Math.max(0.001, inputNeeded);
                city.comida.carne = Math.min(city.comidaStorage, (city.comida.carne || 0) + def.outputRate * ratio * dtSeconds / 3600);
            }
        }
    });

    // ── Research (schools) ──
    city.buildings.forEach(b => {
        const def = cityBuildings[b.type];
        if (def && def.researchRate) {
            city.pesquisaPoints = (city.pesquisaPoints || 0) + def.researchRate * dtSeconds / 3600;
        }
    });

    // ── Food consumption ──
    const consumption = C.graosPerMorador * city.moradores * dtSeconds;
    const foodAvail = (city.comida.graos || 0) + (city.comida.carne || 0);
    if (foodAvail >= consumption) {
        const fromGraos = Math.min(consumption, city.comida.graos || 0);
        city.comida.graos = Math.max(0, (city.comida.graos || 0) - fromGraos);
        city.comida.carne = Math.max(0, (city.comida.carne || 0) - Math.max(0, consumption - fromGraos));
        city.starvationTimer = 0;
    } else {
        city.starvationTimer += dtSeconds;
        city.comida.graos = Math.max(0, (city.comida.graos || 0) - consumption * 0.5);
    }

    // ── Happiness — multi-factor ──
    const foodSurplus = Math.min(1, foodAvail / Math.max(1, consumption * 2));
    const housingSurplus = moradia > 0 ? Math.min(1, moradia / Math.max(1, city.moradores)) : 0;
    const starvationPenalty = city.starvationTimer > C.starvationGracePeriod ? 30 : 0;
    const taxPenalty = (city.policies?.taxRate || 0) * 1.5;
    const carneBonus = (city.comida.carne || 0) > 0 ? C.carneBonus : 0;

    // Building bonuses (parks, schools, tavern etc)
    let buildingBonus = 0;
    city.buildings.forEach(b => {
        const def = cityBuildings[b.type];
        if (def && def.happinessBonus) buildingBonus += def.happinessBonus;
    });

    city.felicidade = Math.max(0, Math.min(100,
        foodSurplus * 40 + housingSurplus * 25 + carneBonus + buildingBonus + 15 - starvationPenalty - taxPenalty
    ));

    // ── Storage bonus from buildings ──
    let totalStorage = 100;
    city.buildings.forEach(b => {
        const def = cityBuildings[b.type];
        if (def && def.storageBonus) totalStorage += def.storageBonus;
    });
    city.comidaStorage = totalStorage;

    // ── Migration system (game-design: visible growth) ──
    city.migrationCooldown = Math.max(0, (city.migrationCooldown || 0) - dtSeconds);

    if (city.starvationTimer > C.starvationGracePeriod) {
        // Decline: people leave
        const leaving = Math.min(city.moradores - 1, C.declineRate * dtSeconds);
        if (leaving > 0) {
            city.moradores = Math.max(1, city.moradores - leaving);
            if (city.migrationCooldown <= 0) {
                _logMigration(city, -Math.ceil(leaving), 'Fome');
                city.migrationCooldown = 15;
            }
        }
    } else if (city.felicidade > 40 && city.moradores < moradia) {
        // Growth: migration waves
        // Migration bonus from buildings like parks, hospital
        let migBonus = 0;
        city.buildings.forEach(b => {
            const def = cityBuildings[b.type];
            if (def && def.migrationBonus) migBonus += def.migrationBonus;
        });
        const attractionRate = C.growthRate * (city.felicidade / 100) * (1 + migBonus);
        city.migrationQueue = (city.migrationQueue || 0) + attractionRate * dtSeconds;

        // When queue reaches 1+, a group arrives
        if (city.migrationQueue >= 1) {
            const arriving = Math.min(Math.floor(city.migrationQueue), moradia - Math.floor(city.moradores));
            if (arriving > 0) {
                city.moradores = Math.min(moradia, city.moradores + arriving);
                city.migrationQueue -= arriving;
                _logMigration(city, arriving, _getMigrationReason(city));
                _showMigrationEvent(arriving);
            }
        }
    }

    // Cap population to housing
    city.moradores = Math.min(city.moradores, moradia);
    if (moradia === 0) city.moradores = Math.max(1, city.moradores);

    // ── Tax income ──
    if (city.policies?.taxRate > 0) {
        let taxMulti = 1;
        city.buildings.forEach(b => { const d = cityBuildings[b.type]; if (d && d.taxBonus) taxMulti += d.taxBonus; });
        const tax = (city.policies.taxRate / 100) * city.moradores * 0.1 * taxMulti * dtSeconds / 3600;
        gameState.gold += tax;
        city.stats.goldFromTax += tax;
    }
}

function _logMigration(city, count, reason) {
    const entry = { count, reason, time: Date.now() };
    city.migrationLog = city.migrationLog || [];
    city.migrationLog.push(entry);
    if (city.migrationLog.length > 20) city.migrationLog.shift();
}

function _getMigrationReason(city) {
    if (city.felicidade > 80) return 'Cidade próspera';
    if (city.felicidade > 60) return 'Boa qualidade de vida';
    if ((city.comida.carne || 0) > 0) return 'Comida abundante';
    const parks = city.buildings.filter(b => cityBuildings[b.type]?.happinessBonus > 0).length;
    if (parks > 0) return 'Ambiente agradável';
    return 'Procurando moradia';
}

function _showMigrationEvent(count) {
    if (window.AudioEngine) AudioEngine.play('population');
    showCityNotification(`🚶‍♂️ +${count} morador${count > 1 ? 'es' : ''} chegou!`);
    // Show floating notification on screen
    _showFloatingMigration(count);
}

function _showFloatingMigration(count) {
    const el = document.createElement('div');
    el.className = 'migration-float';
    el.innerHTML = `<span class="mf-icon">🚶‍♂️</span><span class="mf-text">+${count}</span>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('visible'));
    setTimeout(() => { el.classList.add('leaving'); setTimeout(() => el.remove(), 600); }, 2500);
}

function buildCityBuilding(type) {
    const def = cityBuildings[type];
    if (!def) return false;
    if ((def.era || 0) > gameState.era) {
        showCityNotification('🔒 Desbloqueado na próxima era');
        if (window.AudioEngine) AudioEngine.play('error');
        return false;
    }
    if (def.unique && gameState.city.buildings.some(b => b.type === type)) {
        showCityNotification('⚠️ Apenas um por cidade');
        if (window.AudioEngine) AudioEngine.play('error');
        return false;
    }
    // Custo unificado: gold + recursos do globalInventory
    const cost = def.constructionCost || def.buildCost || {};
    const goldCost = cost.gold || 0;
    if (gameState.gold < goldCost) {
        showCityNotification('Ouro insuficiente (' + Math.ceil(goldCost) + ' necessario)');
        if (window.AudioEngine) AudioEngine.play('error');
        return false;
    }
    for (const [res, qty] of Object.entries(cost)) {
        if (res === 'gold') continue;
        if ((gameState.globalInventory[res] || 0) < qty) {
            const rname = typeof getResourceName === 'function' ? getResourceName(res) : res;
            showCityNotification('Faltam ' + Math.ceil(qty - (gameState.globalInventory[res]||0)) + ' ' + rname);
            if (window.AudioEngine) AudioEngine.play('error');
            return false;
        }
    }
    gameState.gold -= goldCost;
    for (const [res, qty] of Object.entries(cost)) {
        if (res === 'gold') continue;
        gameState.globalInventory[res] = Math.max(0, (gameState.globalInventory[res] || 0) - qty);
    }
    updateGoldDisplay();
    gameState.city.buildings.push({ type, id: `city-${Date.now()}`, workers_assigned: 0 });
    if (window.AudioEngine) AudioEngine.play('house');
    saveGameState();
    renderCityWorkspace();
    _renderBuildPanel();
    return true;
}

function demolishCityBuilding(id) {
    const idx = gameState.city.buildings.findIndex(b => b.id === id);
    if (idx < 0 || cityBuildings[gameState.city.buildings[idx].type]?.unique) return;
    gameState.city.buildings.splice(idx, 1);
    if (window.AudioEngine) AudioEngine.play('delete');
    saveGameState();
    renderCityWorkspace();
}

function showCityNotification(msg) {
    let el = document.getElementById('city-notification');
    if (!el) {
        el = document.createElement('div');
        el.id = 'city-notification';
        el.className = 'city-notification';
        document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('visible');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('visible'), 2500);
}

// Get total industry workers needed for display
function getTotalIndustryWorkers() {
    let needed = 0, assigned = 0;
    (gameState.machines || []).forEach(m => {
        const def = machineTypes[m.type];
        if (def && (def.workersMin || 0) > 0) {
            needed += (def.workersMax || def.workersMin);
            assigned += (m.workersAssigned || 0);
        }
    });
    return { needed, assigned };
}

// Set workers for a machine (called from info panel UI)
function setMachineWorkers(machineId, count) {
    const machine = gameState.machines.find(m => m.id === machineId);
    if (!machine) return;
    const def = machineTypes[machine.type];
    if (!def || !(def.workersMin > 0)) return;
    machine.workersAssigned = Math.max(0, Math.min(def.workersMax || def.workersMin, count));
}
