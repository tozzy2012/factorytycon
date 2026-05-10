window.SPEED_MULTIPLIER = 1;
window.TICK = {
    TPS: 20,
    MS_PER_TICK: 1000 / 20,
    SIMULATION_EVERY_TICKS: 1,
    PANEL_EVERY_TICKS: 60,
    NODES_EVERY_TICKS: 5,
    CONNECTIONS_EVERY_TICKS: 4,
    AUTOSAVE_EVERY_TICKS: 200,
    accumulatorMs: 0,
    lastFrameTs: 0,
    tickCount: 0,
    running: false,
    maxTicksPerFrame: 5,
    meterLastTs: 0,
    meterTickCounter: 0
};
function renderParticles(alpha = 0, now = performance.now()) {
    gameState.connections.forEach(connection => {
        const path = document.getElementById(connection.id);
        if (!path) return;

        const ratio = getConnectionFlowRatio(connection);
        const particleCount = ratio <= 0 ? 0 : ratio <= 0.4 ? 1 : ratio <= 0.8 ? 2 : 3;
        const speed = ratio <= 0.4 ? 3000 : ratio <= 0.8 ? 2000 : 1000;
        const length = path.getTotalLength();
        if (length === 0) return;  // Bug fix: skip zero-length paths (hidden/unrendered)

        for (let i = 0; i < 3; i++) {
            const particle = document.getElementById(`${connection.id}-particle-${i}`);
            if (!particle) continue;
            if (i >= particleCount) {
                particle.style.display = 'none';
                continue;
            }

            const phase = ((now + alpha * TICK.MS_PER_TICK + i * (speed / 3)) % speed) / speed;
            const point = path.getPointAtLength(phase * length);
            particle.setAttribute('cx', point.x);
            particle.setAttribute('cy', point.y);
            particle.style.display = 'block';
        }
    });
}

function updateSimulationStatusIndicator() {
    const dot = document.getElementById('simStatusDot');
    const text = document.getElementById('simStatusText');
    if (!dot || !text) return;

    const avg = gameState.tickStats.avgSimulationMs || 0;
    if (avg < 30) dot.style.background = 'var(--accent-green)';
    else if (avg < 80) dot.style.background = 'var(--accent-orange)';
    else dot.style.background = 'var(--accent-red)';

    text.textContent = `${Math.round(gameState.tickStats.measuredTps || TICK.TPS)} TPS`;
}

function updateFactoryHealth() {
    const dot = document.getElementById('factoryHealthDot');
    const textEl = document.getElementById('factoryHealthText');
    const eraEl = document.getElementById('factoryEraLabel');
    if (!dot || !textEl) return;

    const machines = gameState.machines.filter(m => m.type !== 'hub' && m.type !== 'deposito' && m.type !== 'mercado');
    if (machines.length === 0) {
        dot.style.background = '#555';
        textEl.textContent = 'Fábrica: vazia';
        if (eraEl) eraEl.textContent = ERA_DEFINITIONS[gameState.era]?.name || '';
        return;
    }

    const active = machines.filter(m => m.status === 'active' || m.status === 'partial').length;
    const bottleneck = machines.filter(m => m.status === 'bottleneck').length;
    const ratio = active / machines.length;
    const avgEff = machines.reduce((s, m) => s + (m.efficiency || 0), 0) / machines.length;

    let color, label;
    if (bottleneck > 0) { color = '#f59e0b'; label = `${bottleneck} gargalo${bottleneck > 1 ? 's' : ''}`; }
    else if (ratio >= 0.9) { color = '#4ade80'; label = `${Math.round(avgEff * 100)}% eficiência`; }
    else if (ratio >= 0.5) { color = '#facc15'; label = `${active}/${machines.length} ativas`; }
    else { color = '#f87171'; label = `${machines.length - active} paradas`; }

    dot.style.background = color;
    textEl.textContent = `Fábrica: ${label}`;
    if (eraEl) eraEl.textContent = `· ${ERA_DEFINITIONS[gameState.era]?.name || 'Era ' + gameState.era}`;
}

function onTick(tickNumber) {
    gameState.tickStats.totalTicks += 1;

    if (tickNumber % TICK.SIMULATION_EVERY_TICKS === 0) {
        if (gameState.city) updateCity(TICK.MS_PER_TICK / 1000 * SPEED_MULTIPLIER);
        gameState.stats.playTime = (gameState.stats.playTime || 0) + TICK.MS_PER_TICK / 1000;
        _trackGameDay(TICK.MS_PER_TICK / 1000 * SPEED_MULTIPLIER);
        const start = performance.now();
        updateSimulation();
        const elapsed = performance.now() - start;
        gameState.tickStats.lastSimulationMs = elapsed;
        gameState.tickStats.avgSimulationMs = gameState.tickStats.avgSimulationMs === 0
            ? elapsed
            : (gameState.tickStats.avgSimulationMs * 0.9) + (elapsed * 0.1);
        gameState.tickStats.simulationRuns += 1;
    }

    if (tickNumber % TICK.PANEL_EVERY_TICKS === 0) {
        if (gameState.selectedMachine) showInfoPanel(gameState.selectedMachine);
        refreshProductionRuntime();
    }

    if (tickNumber % TICK.NODES_EVERY_TICKS === 0) {
        gameState.machines.forEach(updateMachineNodeVisual);
    }

    if (tickNumber % TICK.CONNECTIONS_EVERY_TICKS === 0) {
        gameState.connections.forEach(updateConnectionVisual);
    }

    if (tickNumber % TICK.AUTOSAVE_EVERY_TICKS === 0) {
        saveGameState();
        // Atualiza taxa de ouro por hora (snapshot a cada 10s)
        var snap = gameState.goldSnapshot;
        if (snap) {
            var now = Date.now();
            var elapsed = (now - snap.ts) / 3600000; // horas
            if (snap.ts > 0 && elapsed > 0) {
                snap.ratePerHour = (gameState.gold - snap.value) / elapsed;
            }
            snap.value = gameState.gold;
            snap.ts = now;
        }
    }

    if (tickNumber % 40 === 0) {
        updateSimulationStatusIndicator();
        updateFactoryHealth();
        updatePlanetHud();
        if (typeof updateSecurityBar === "function") updateSecurityBar();
        updateEraBar();
        updateIdleWorkers();
        updateGlobalHUD();
    }

    if (tickNumber % 100 === 0) {
        updatePollution();
        if (currentWorkspace === 'planet') renderPlanetMap();
    }
}

function updateEraBar() {
    const fill = document.getElementById('eraBarFill');
    const label = document.getElementById('eraBarLabel');
    const pct = document.getElementById('eraBarPct');
    if (!fill || !label || !pct) return;
    const era = gameState.era || 0;
    const eraDef = typeof ERA_DEFINITIONS !== 'undefined' ? ERA_DEFINITIONS[era] : null;
    const progress = gameState.eraProgress || 0;
    label.textContent = eraDef ? eraDef.name : ('Era ' + era);
    fill.style.width = progress + '%';
    pct.textContent = progress > 0 ? progress + '%' : '';
}

function updateIdleWorkers() {
    const el = document.getElementById('idleWorkersText');
    if (!el) return;
    let idle = 0;
    gameState.machines.forEach(m => {
        const def = typeof machineTypes !== 'undefined' ? machineTypes[m.type] : null;
        if (!def || !def.workersMin) return;
        const assigned = m.workersAssigned || 0;
        if (assigned === 0) idle += def.workersMin;
    });
    el.textContent = idle > 0 ? idle + ' ociosos' : 'todos ativos';
    el.style.color = idle > 0 ? 'var(--accent-orange)' : 'var(--accent-green)';
}

// ═══ HUD GLOBAL — Atualiza chips de status visíveis em todas as abas ═══
function updateGlobalHUD() {
    // ── Dia e hora de jogo ──
    var dayEl = document.getElementById('hud-day-text');
    var iconEl = document.getElementById('hud-time-icon');
    if (dayEl && gameState.gameTime) {
        var day = (gameState.gameTime.daysPassed || 0) + 1;
        var dayLen = (typeof BALANCE !== 'undefined') ? BALANCE.GAME_DAY_REAL_SECONDS : 120;
        var hour = Math.floor(((gameState.gameTime.secondsSinceDay || 0) / dayLen) * 24);
        dayEl.textContent = 'Dia ' + day;
        if (iconEl) iconEl.textContent = (hour >= 6 && hour < 18) ? '🌅' : '🌙';
    }

    // ── Populacao e moradia ──
    var popEl = document.getElementById('hud-pop-text');
    if (popEl && gameState.city) {
        popEl.textContent = Math.floor(gameState.city.moradores) + '/' + gameState.city.moradoresMax;
        var full = gameState.city.moradores >= gameState.city.moradoresMax;
        var popChip = document.getElementById('hud-pop');
        if (popChip) popChip.className = 'hud-chip' + (full ? ' hud-chip-warn' : '');
    }

    // ── Trabalhadores livres ──
    var workEl = document.getElementById('hud-workers-text');
    if (workEl && gameState.city) {
        var livres = gameState.city.trabalhadores ? (gameState.city.trabalhadores.livres || 0) : 0;
        workEl.textContent = livres + ' livres';
        var workerChip = document.getElementById('hud-workers');
        if (workerChip) {
            if (livres < 0) workerChip.className = 'hud-chip hud-chip-danger';
            else if (livres === 0) workerChip.className = 'hud-chip hud-chip-warn';
            else workerChip.className = 'hud-chip';
        }
    }

    // ── Felicidade e Poluicao ──
    var happyEl = document.getElementById('hud-happy-text');
    var pollEl  = document.getElementById('hud-pollution-text');
    if (happyEl && gameState.city) {
        var h = Math.round(gameState.city.felicidade || 0);
        happyEl.textContent = h + '%';
        happyEl.style.color = h > 70 ? '#4ade80' : h > 40 ? '#facc15' : '#f87171';
    }
    if (pollEl) {
        var p = Math.round(gameState.pollutionLevel || 0);
        pollEl.textContent = p + '%';
        pollEl.style.color = p > 50 ? '#f87171' : p > 30 ? '#facc15' : 'var(--text-tertiary)';
    }

    // ── Taxa de ouro por hora ──
    var rateEl = document.getElementById('hud-gold-rate-text');
    if (rateEl && gameState.goldSnapshot) {
        var rate = Math.round(gameState.goldSnapshot.ratePerHour || 0);
        if (Math.abs(rate) > 0) {
            var sign = rate > 0 ? '+' : '';
            rateEl.textContent = sign + rate.toLocaleString('pt-BR') + '💰/h';
            rateEl.style.color = rate > 0 ? '#4ade80' : '#f87171';
        } else {
            rateEl.textContent = '±0💰/h';
            rateEl.style.color = 'var(--text-tertiary)';
        }
    }
}

// ═══ CICLO DO AMANHECER ═══════════════════════════════════════════════════════
function _trackGameDay(dtRealSeconds) {
    if (!gameState.gameTime) gameState.gameTime = { daysPassed: 0, secondsSinceDay: 0 };
    const dayLen = (typeof BALANCE !== 'undefined') ? BALANCE.GAME_DAY_REAL_SECONDS : 120;
    gameState.gameTime.secondsSinceDay += dtRealSeconds;
    if (gameState.gameTime.secondsSinceDay >= dayLen) {
        gameState.gameTime.secondsSinceDay -= dayLen;
        gameState.gameTime.daysPassed = (gameState.gameTime.daysPassed || 0) + 1;
        _onNewDay(gameState.gameTime.daysPassed);
    }
}

function _onNewDay(dayNumber) {
    if (!gameState.city) return;
    const city = gameState.city;
    const B = (typeof BALANCE !== 'undefined') ? BALANCE : {};

    // 1. Poluição afeta felicidade (além do cálculo contínuo)
    const pollutionPenalty = (gameState.pollutionLevel || 0) * ((B.POLLUTION || {}).HAPPINESS_PENALTY_PER_UNIT || 0.3);
    city.felicidade = Math.max(0, Math.min(100, city.felicidade - pollutionPenalty));

    // 2. Novos moradores chegam se atratividade permite
    const minHappiness = ((B.NEW_DAY || {}).MIGRATION_MIN_HAPPINESS) || 40;
    if (city.felicidade >= minHappiness && city.moradores < city.moradoresMax && gameState.pollutionLevel < ((B.POLLUTION || {}).MIGRATION_BLOCK_THRESHOLD || 70)) {
        // A migração contínua já cuida do crescimento; aqui apenas logamos o dia
    }

    // 3. Bônus de ouro diário (se configurado)
    const goldBonus = ((B.NEW_DAY || {}).GOLD_BONUS_BASE) || 0;
    if (goldBonus > 0) {
        gameState.gold += goldBonus;
        updateGoldDisplay();
    }

    // 4. Motor de migração — gera log e mensagem do ticker
    if (typeof runMigrationCheck === 'function') runMigrationCheck();

    // 5. Dispara evento para outros módulos escutarem
    document.dispatchEvent(new CustomEvent('game:newDay', { detail: { day: dayNumber, city: city } }));
}

function startGameLoop() {
    TICK.running = true;
    TICK.accumulatorMs = 0;
    TICK.tickCount = 0;
    TICK.lastFrameTs = performance.now();
    TICK.meterLastTs = TICK.lastFrameTs;
    TICK.meterTickCounter = 0;

    const loop = (frameTs) => {
        if (!TICK.running) return;

        const delta = frameTs - TICK.lastFrameTs;
        TICK.lastFrameTs = frameTs;
        TICK.accumulatorMs += delta;

        let processed = 0;
        while (TICK.accumulatorMs >= TICK.MS_PER_TICK && processed < TICK.maxTicksPerFrame) {
            TICK.tickCount += 1;
            if (gameState.simulationRunning) {
                onTick(TICK.tickCount);
            }
            TICK.accumulatorMs -= TICK.MS_PER_TICK;
            processed += 1;
        }

        TICK.meterTickCounter += processed;

        if (TICK.accumulatorMs >= TICK.MS_PER_TICK) {
            const pending = Math.floor(TICK.accumulatorMs / TICK.MS_PER_TICK);
            gameState.tickStats.droppedTicks += pending;
            TICK.accumulatorMs %= TICK.MS_PER_TICK;
        }

        const meterElapsed = frameTs - TICK.meterLastTs;
        if (meterElapsed >= 1000) {
            gameState.tickStats.measuredTps = Math.min(TICK.TPS, (TICK.meterTickCounter * 1000) / meterElapsed);
            TICK.meterTickCounter = 0;
            TICK.meterLastTs = frameTs;
        }

        const alpha = TICK.accumulatorMs / TICK.MS_PER_TICK;
        renderParticles(alpha, frameTs);
        uiRuntime.loopRafId = requestAnimationFrame(loop);
    };

    uiRuntime.loopRafId = requestAnimationFrame(loop);
}

function refreshProductionRuntime() {
    const snapshot = buildFactoryProductionSnapshot();
    uiRuntime.latestProductionSnapshot = snapshot;
    if (uiRuntime.productionOpen) {
        updateProductionPanel(snapshot);
    }
}


// ═══ SPEED CONTROL (web-games + game-design skill) ═══
function setGameSpeed(mult) {
    SPEED_MULTIPLIER = mult;
    TICK.MS_PER_TICK = 1000 / (TICK.TPS * mult);
    document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.speed-btn[data-speed="${mult}"]`);
    if (btn) btn.classList.add('active');
}

// Pause quando aba perde foco (web-games skill: tab throttling)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        gameState.simulationRunning = false;
    } else {
        gameState.simulationRunning = true;
        TICK.lastFrameTs = performance.now();
        TICK.accumulatorMs = 0;
    }
});
