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
        if (length === 0) continue;  // Bug fix: skip zero-length paths (hidden/unrendered)

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
    }

    if (tickNumber % 40 === 0) {
        updateSimulationStatusIndicator();
        updateFactoryHealth();
        updatePlanetHud();
        if (typeof updateSecurityBar === "function") updateSecurityBar();
        updateEraBar();
        updateIdleWorkers();
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
