function ensureMachineCatalog() {
    const descriptions = {
        usina_solar: 'Gera energia limpa para toda a cadeia.',
        mineradora_fe: 'Extrai minério de ferro da jazida.',
        mineradora_cu: 'Extrai minério de cobre.',
        mina_carvao: 'Extrai carvão bruto para coqueificação.',
        pedreira_calcario: 'Extrai calcário para produção de cal.',
        captacao_agua: 'Capta água bruta para tratamento.',
        eta: 'Transforma água bruta em água tratada.',
        britador: 'Cominui minérios para processamento posterior.',
        coqueria: 'Converte carvão bruto em coque.',
        forno_cal: 'Calcina calcário e produz cal.',
        forno_sinterizacao: 'Minério aglomerado pronto para ser fundido no Alto-Forno.',
        compressor_ar: 'Gera ar comprimido industrial.',
        alto_forno: 'Produz ferro-gusa em alta temperatura.',
        flotacao: 'Concentra minério de cobre por flotação.',
        forno_fundicao_cu: 'Funde concentrado de cobre.',
        'eletrólise': 'Refina cobre por eletrólise.',
        aciaria: 'Converte ferro-gusa em aço bruto.',
        laminador: 'Conforma aço em chapa e vergalhão.',
        trefiladora: 'Produz cobre fino trefilado.',
        hub: 'Roteador de itens. Organiza conexões sem armazenar.',
        deposito: 'Armazena materiais sólidos e metálicos.',
        mercado: 'Vende produtos finais automaticamente.'
    };

    Object.entries(machineTypes).forEach(([type, def]) => {
        if (!def.description) def.description = descriptions[type] || 'Unidade de processo industrial.';
        if (!def.inputRatios) {
            const defaultRatios = {};
            def.inputs.forEach(r => { defaultRatios[r] = 1; });
            def.inputRatios = defaultRatios;
        }

        if (!def.tiers) {
            def.tiers = [
                { productionRate: def.productionRate || 0, workers: Math.max(4, Math.ceil((def.productionRate || 3) * 1.5)) }
            ];
        }
    });
}

function getTierDef(machine) {
    const def = machineTypes[machine.type];
    const tierIndex = Math.min(machine.tier ?? 0, def.tiers.length - 1);
    return def.tiers[tierIndex];
}

function ensureMachineShape(machine) {
    const def = machineTypes[machine.type];
    machine.tier = 0;
    machine.status = machine.status || 'stopped';
    machine.visualStatus = machine.visualStatus || machine.status;
    machine.statusCandidate = machine.statusCandidate || machine.status;
    machine.statusStableTicks = machine.statusStableTicks || 0;
    machine.efficiency = machine.efficiency ?? 0;
    machine.production = machine.production ?? 0;
    machine.bufferInput = machine.bufferInput || {};
    machine.bufferOutput = machine.bufferOutput || {};
    machine.bufferInputMax = machine.bufferInputMax || {};
    machine.bufferOutputMax = machine.bufferOutputMax || {};
    machine.inputFlow = machine.inputFlow || {};
    machine.outputFlow = machine.outputFlow || {};
    machine.displayInputFlow = machine.displayInputFlow || {};
    machine.displayOutputFlow = machine.displayOutputFlow || {};
    machine.totalProduced = machine.totalProduced || {};
    machine.uptime = machine.uptime || 0;
    machine.effHistory = machine.effHistory || [];
    machine.workersAssigned = machine.workersAssigned ?? (def.workersMin || 0);
    machine.bottleneckTicks = machine.bottleneckTicks || 0;

    const tier = getTierDef(machine);
    def.inputs.forEach(resource => {
        machine.bufferInput[resource] = machine.bufferInput[resource] || 0;
        if (FLOW_RESOURCES.has(resource)) {
            machine.bufferInputMax[resource] = 0;
        } else {
            const perHourConsumption = (tier.productionRate || 0) * (def.inputRatios[resource] || 1) * 3600;
            const max = Math.max(50, Math.ceil(perHourConsumption / 12));
            machine.bufferInputMax[resource] = Math.max(machine.bufferInputMax[resource] || 0, max);
        }
        machine.inputFlow[resource] = 0;
        machine.displayInputFlow[resource] = machine.displayInputFlow[resource] || 0;
    });

    def.outputs.forEach(resource => {
        machine.bufferOutput[resource] = machine.bufferOutput[resource] || 0;
        if (FLOW_RESOURCES.has(resource)) {
            machine.bufferOutputMax[resource] = 0;
        } else {
            const perHourProduction = (tier.productionRate || 0) * 3600;
            const max = Math.max(50, Math.ceil(perHourProduction / 12));
            machine.bufferOutputMax[resource] = Math.max(machine.bufferOutputMax[resource] || 0, max);
        }
        machine.outputFlow[resource] = 0;
        machine.displayOutputFlow[resource] = machine.displayOutputFlow[resource] || 0;
        machine.totalProduced[resource] = machine.totalProduced[resource] || 0;
    });

    if (machine.type === 'hub') {
        machine.resourceFilters = machine.resourceFilters || [];
        def.inputs.forEach(resource => {
            machine.bufferInput[resource] = machine.bufferInput[resource] || 0;
            machine.bufferInputMax[resource] = FLOW_RESOURCES.has(resource) ? 0 : 1;
            machine.inputFlow[resource] = machine.inputFlow[resource] || 0;
        });
        def.outputs.forEach(resource => {
            machine.bufferOutput[resource] = machine.bufferOutput[resource] || 0;
            machine.bufferOutputMax[resource] = FLOW_RESOURCES.has(resource) ? 0 : 1;
            machine.outputFlow[resource] = machine.outputFlow[resource] || 0;
        });
    }

    if (machine.type === 'deposito') {
        def.inputs.forEach(resource => {
            if (resource === '*') return; // Universal input - buffers created dynamically per connection
            machine.bufferInput[resource] = machine.bufferInput[resource] || 0;
            machine.bufferInputMax[resource] = Math.max(machine.bufferInputMax[resource] || 0, 1000);
            machine.inputFlow[resource] = machine.inputFlow[resource] || 0;
        });
    }

    if (machine.type === 'terminal_suprimentos') {
        machine.pulledResource = machine.pulledResource || null;
        machine.pullRate = machine.pullRate || 10;
        const res = machine.pulledResource || 'carvao_bruto';
        machine.bufferOutput[res] = machine.bufferOutput[res] || 0;
        machine.bufferOutputMax[res] = Math.max(machine.bufferOutputMax[res] || 0, 500);
        machine.outputFlow[res] = 0;
    }
}

function ensureOverlays() {
    if (!uiRuntime.tooltipEl) {
        uiRuntime.tooltipEl = document.createElement('div');
        uiRuntime.tooltipEl.className = 'machine-tooltip';
        document.body.appendChild(uiRuntime.tooltipEl);
    }

    if (!uiRuntime.flowLabelEl) {
        uiRuntime.flowLabelEl = document.createElement('div');
        uiRuntime.flowLabelEl.className = 'flow-label';
        document.querySelector('.main-area').appendChild(uiRuntime.flowLabelEl);
    }

    if (!document.getElementById('miniLegend')) {
        const legend = document.createElement('div');
        legend.id = 'miniLegend';
        legend.className = 'mini-legend';
        legend.innerHTML = `
            <h5>Legenda</h5>
            <div class="legend-row"><span class="legend-dot active"></span>Ativa</div>
            <div class="legend-row"><span class="legend-dot partial"></span>Parcial</div>
            <div class="legend-row"><span class="legend-dot stopped"></span>Parada</div>
            <div class="legend-row"><span class="legend-dot bottleneck"></span>Gargalo</div>
            <div class="legend-row"><span class="legend-dot idle"></span>Ociosa</div>
            <div class="legend-row">━━ fluxo alto</div>
            <div class="legend-row">─ ─ fluxo baixo</div>
        `;
        document.getElementById('canvas').appendChild(legend);
    }
}

function getCompatibleResource(fromMachine, toMachine) {
    const fromDef = machineTypes[fromMachine.type];
    const toDef = machineTypes[toMachine.type];

    if (fromMachine.type === 'hub') {
        const used = new Set(
            gameState.connections
                .filter(c => c.from === fromMachine.id && c.to === toMachine.id)
                .map(c => c.resource)
        );
        const active = toDef.inputs.find(r => (fromMachine.bufferOutput[r] || 0) > 0 && !used.has(r));
        if (active) return active;
        return toDef.inputs.find(r => !used.has(r)) || null;
    }

    if (toMachine.type === 'hub') {
        const used = new Set(
            gameState.connections
                .filter(c => c.from === fromMachine.id && c.to === toMachine.id)
                .map(c => c.resource)
        );
        return fromDef.outputs.find(r => !used.has(r)) || null;
    }

    // For normal machines: find compatible resource not already connected on this exact pair
    const alreadyConnected = new Set(
        gameState.connections
            .filter(c => c.from === fromMachine.id && c.to === toMachine.id)
            .map(c => c.resource)
    );
    return fromDef.outputs.find(r => (toDef.inputs.includes(r) || toDef.inputs.includes('*')) && !alreadyConnected.has(r)) || null;
}

function getConnectionCapacity(fromMachine) {
    if (fromMachine.type === 'hub') return 9999;
    return Math.max(1, Math.round(getTierDef(fromMachine).productionRate || 1));
}

function getDepositoBaseSlotCapacity(tierIndex) {
    if (tierIndex <= 0) return 1000;
    if (tierIndex === 1) return 3000;
    return 8000;
}

function getDepositoSlotCapacity(fromMachine) {
    const tier = getTierDef(fromMachine);
    const byProducerWindow = Math.ceil((tier.productionRate || 0) * 7200);
    const baseByTier = getDepositoBaseSlotCapacity(fromMachine.tier || 0);
    return Math.max(baseByTier, byProducerWindow, 1000);
}

function syncDepositoCapacities() {
    gameState.connections.forEach(connection => {
        const from = gameState.machines.find(m => m.id === connection.from);
        const to = gameState.machines.find(m => m.id === connection.to);
        if (!from || !to || to.type !== 'deposito') return;
        ensureMachineShape(to);
        const targetCap = getDepositoSlotCapacity(from);
        to.bufferInputMax[connection.resource] = Math.max(to.bufferInputMax[connection.resource] || 0, targetCap);
        to.bufferInput[connection.resource] = to.bufferInput[connection.resource] || 0;
    });
}

function updateSimulation() {
    const simStepSeconds = TICK.SIMULATION_EVERY_TICKS / TICK.TPS;
    gameState.machines.forEach(machine => {
        ensureMachineShape(machine);
        Object.keys(machine.inputFlow).forEach(key => { machine.inputFlow[key] = 0; });
        Object.keys(machine.outputFlow).forEach(key => { machine.outputFlow[key] = 0; });
    });

    syncDepositoCapacities();

    // Phase 1: machines that do NOT consume flow resources
    // (mines, boilers, purely storable-input machines)
    // These fill their bufferOutput before connections run.
    const hasFlowInput = m => {
        const d = machineTypes[m.type];
        return d && d.inputs.some(r => FLOW_RESOURCES.has(r));
    };

    gameState.machines.filter(m => !hasFlowInput(m)).forEach(machine => {
        const def = machineTypes[machine.type];
        const tier = getTierDef(machine);
        const baseRate = tier.productionRate || 0;
        // Worker factor: machines needing workers run slower without enough
        const wMin = def.workersMin || 0;
        const wMax = def.workersMax || wMin;
        const wEffective = machine._effectiveWorkers ?? machine.workersAssigned ?? 0;
        let workerFactor = 1;
        if (wMin > 0) {
            if (wEffective < wMin) workerFactor = 0;
            else if (wMax > wMin) workerFactor = 0.5 + 0.5 * ((Math.min(wEffective, wMax) - wMin) / (wMax - wMin));
        }
        const maxProd = baseRate * workerFactor;
        machine.workerFactor = workerFactor;

        if (machine.type === 'hub') {
            let moved = false;
            const filters = machine.resourceFilters || [];
            filters.forEach(resource => {
                const inBuf = machine.bufferInput[resource] || 0;
                if (inBuf <= 0) return;
                machine.bufferInput[resource] = 0;
                machine.bufferOutput[resource] = (machine.bufferOutput[resource] || 0) + inBuf;
                moved = true;
            });
            machine.production = 0;
            machine.efficiency = moved ? 1 : 0;
            machine.status = moved ? 'active' : 'idle';
            return;
        }

        if (def.outputs.length === 0 && def.inputs.length > 0) {
            machine.production = 0;
            machine.efficiency = 0;
            return;
        }

        if (def.inputs.length === 0) {
            let produced = 0;
            def.outputs.forEach(resource => {
                // Flow resources have no output buffer — produce freely up to maxProd
                const space = FLOW_RESOURCES.has(resource)
                    ? maxProd * simStepSeconds
                    : Math.max(0, (machine.bufferOutputMax[resource] || 0) - (machine.bufferOutput[resource] || 0));
                const amount = Math.min(maxProd * simStepSeconds, space);
                machine.bufferOutput[resource] += amount;
                machine.totalProduced[resource] += amount;
                gameState.totalProducedGlobal[resource] = (gameState.totalProducedGlobal[resource] || 0) + amount;
                produced = Math.max(produced, amount);
            });

            const producedPerSec = simStepSeconds > 0 ? produced / simStepSeconds : 0;
            machine.production = producedPerSec;
            machine.efficiency = maxProd > 0 ? producedPerSec / maxProd : 0;
            machine.status = produced > 0 ? 'active' : 'idle';
            if (machine.status === 'active') machine.uptime += simStepSeconds;
            return;
        }

        const maxProdStep = maxProd * simStepSeconds;

        const inputLimits = def.inputs.map(resource => {
            const ratio = def.inputRatios[resource] || 1;
            if (FLOW_RESOURCES.has(resource)) {
                // Flow resources arrive via demand-pull connections — treat as available up to maxProd
                return maxProdStep / ratio;
            }
            return ratio > 0 ? (machine.bufferInput[resource] || 0) / ratio : 0;
        });

        // Flow resource outputs: space is unlimited (demand-pull handles the actual cap)
        const outputSpaces = def.outputs.map(resource =>
            FLOW_RESOURCES.has(resource)
                ? maxProdStep
                : Math.max(0, (machine.bufferOutputMax[resource] || 0) - (machine.bufferOutput[resource] || 0))
        );
        const byInputs = inputLimits.length ? Math.min(...inputLimits) : maxProdStep;
        const byOutputSpace = outputSpaces.length ? Math.min(...outputSpaces) : maxProdStep;
        const real = Math.max(0, Math.min(maxProdStep, byInputs, byOutputSpace));

        def.inputs.forEach(resource => {
            const ratio = def.inputRatios[resource] || 1;
            machine.bufferInput[resource] = Math.max(0, (machine.bufferInput[resource] || 0) - real * ratio);
        });

        def.outputs.forEach(resource => {
            machine.bufferOutput[resource] += real;
            machine.totalProduced[resource] += real;
            gameState.totalProducedGlobal[resource] = (gameState.totalProducedGlobal[resource] || 0) + real;
        });

        const realPerSec = simStepSeconds > 0 ? real / simStepSeconds : 0;
        machine.production = realPerSec;
        machine.efficiency = maxProd > 0 ? realPerSec / maxProd : 0;

        if (realPerSec >= maxProd && maxProd > 0) machine.status = 'active';
        else if (real > 0) machine.status = 'partial';
        else if (byOutputSpace <= 0 && (byInputs > 0 || def.inputs.length === 0)) machine.status = 'bottleneck';
        else machine.status = 'stopped';

        if (machine.status === 'bottleneck') machine.bottleneckTicks = (machine.bottleneckTicks || 0) + 1;
        else machine.bottleneckTicks = 0;

        if (real > 0) machine.uptime += simStepSeconds;
    });

    // ── Connections + Hub flush run here (see below) ──
    // Phase 2 deferred: machines consuming flow resources process AFTER connections.

    // Helper: how much of a resource does a machine demand per tick?
    function demandPerTick(machine, resource) {
        if (machine.type === 'hub') return Infinity; // Hub accepts all it can pass through
        const def = machineTypes[machine.type];
        const tier = getTierDef(machine);
        const ratio = (def.inputRatios && def.inputRatios[resource]) || 1;
        return (tier.productionRate || 0) * ratio * simStepSeconds;
    }

    // For flow resources (energia_mecanica, eletricidade, vapor, ar_comprimido):
    // Pre-calculate total downstream demand so we can split supply proportionally.
    const flowDemand = {}; // connectionId → demanded amount this tick
    gameState.connections.forEach(connection => {
        const resource = connection.resource;
        if (!FLOW_RESOURCES.has(resource)) return;
        const to = gameState.machines.find(m => m.id === connection.to);
        if (!to) return;
        flowDemand[connection.id] = demandPerTick(to, resource);
    });

    // Group non-flow connections by (fromId, resource) for equal-split distribution
    // Each machine has a fixed output rate — split equally among all destinations.
    const connActual = {};
    const groupKey = c => `${c.from}::${c.resource}`;
    const groups = {};
    gameState.connections.forEach(c => {
        if (FLOW_RESOURCES.has(c.resource)) return;
        const k = groupKey(c);
        if (!groups[k]) groups[k] = [];
        groups[k].push(c);
    });

    Object.values(groups).forEach(conns => {
        const from = gameState.machines.find(m => m.id === conns[0].from);
        if (!from) return;
        const resource = conns[0].resource;
        const available = from.bufferOutput[resource] || 0;
        const n = conns.length;
        // Each connection gets an equal share of available buffer,
        // but no more than what the destination can accept.
        const equalShare = available / n;
        let totalSent = 0;
        conns.forEach(c => {
            const to = gameState.machines.find(m => m.id === c.to);
            const space = to ? Math.max(0, (to.bufferInputMax[resource] || 0) - (to.bufferInput[resource] || 0)) : 0;
            connActual[c.id] = Math.min(equalShare, space);
            totalSent += connActual[c.id];
        });
    });

    // Execute all transfers
    gameState.connections.forEach(connection => {
        const from = gameState.machines.find(m => m.id === connection.from);
        const to = gameState.machines.find(m => m.id === connection.to);
        if (!from || !to) return;

        connection.capacity = getConnectionCapacity(from);
        const resource = connection.resource;
        let amount;

        if (FLOW_RESOURCES.has(resource)) {
            // Demand-pull for flow resources
            const demanded = Math.min(
                flowDemand[connection.id] || 0,
                (connection.capacity || 0) * simStepSeconds
            );
            amount = Math.max(0, Math.min(demanded, from.bufferOutput[resource] || 0));
        } else {
            amount = Math.max(0, connActual[connection.id] || 0);
        }

        from.bufferOutput[resource] = Math.max(0, (from.bufferOutput[resource] || 0) - amount);
        to.bufferInput[resource] = (to.bufferInput[resource] || 0) + amount;
        const flowPerSec = simStepSeconds > 0 ? amount / simStepSeconds : 0;
        from.outputFlow[resource] = (from.outputFlow[resource] || 0) + flowPerSec;
        to.inputFlow[resource] = (to.inputFlow[resource] || 0) + flowPerSec;
        gameState.resourceFlow[connection.id] = flowPerSec;
    });

    // Pass 2: flush Hub — pass filtered resources from inputBuffer to outputBuffer instantly
    gameState.machines.filter(m => m.type === 'hub').forEach(hub => {
        const filters = hub.resourceFilters || [];
        filters.forEach(resource => {
            const inBuf = hub.bufferInput[resource] || 0;
            if (inBuf <= 0) return;
            hub.bufferInput[resource] = 0;
            hub.bufferOutput[resource] = (hub.bufferOutput[resource] || 0) + inBuf;
        });
    });

    // Pass 3: transfer out of Hubs to downstream machines
    gameState.connections.filter(c => {
        const from = gameState.machines.find(m => m.id === c.from);
        return from && from.type === 'hub';
    }).forEach(connection => {
        const from = gameState.machines.find(m => m.id === connection.from);
        const to = gameState.machines.find(m => m.id === connection.to);
        if (!from || !to) return;

        const resource = connection.resource;

        // Wildcard '*' connections: distribute any available resource from hub buffer
        if (resource === '*') {
            const toDef = machineTypes[to.type];
            let totalFlow = 0;
            Object.keys(from.bufferOutput).forEach(res => {
                if (res === '*') return;
                if (!toDef.inputs.includes(res) && !toDef.inputs.includes('*')) return;
                const avail = from.bufferOutput[res] || 0;
                if (avail <= 0) return;
                const space = Math.max(0, (to.bufferInputMax[res] || 0) - (to.bufferInput[res] || 0));
                const amt = Math.max(0, Math.min(avail, space));
                if (amt <= 0) return;
                from.bufferOutput[res] = Math.max(0, avail - amt);
                to.bufferInput[res] = (to.bufferInput[res] || 0) + amt;
                const fps = simStepSeconds > 0 ? amt / simStepSeconds : 0;
                from.outputFlow[res] = (from.outputFlow[res] || 0) + fps;
                to.inputFlow[res] = (to.inputFlow[res] || 0) + fps;
                totalFlow += fps;
            });
            gameState.resourceFlow[connection.id] = totalFlow;
            return;
        }

        // Highway (hub→hub): ensure destination hub accepts this resource via its filters
        if (to.type === 'hub') {
            const toFilters = to.resourceFilters || [];
            if (toFilters.length > 0 && !toFilters.includes(resource)) {
                gameState.resourceFlow[connection.id] = 0;
                return;
            }
        }

        const available = from.bufferOutput[resource] || 0;

        let amount;
        if (FLOW_RESOURCES.has(resource)) {
            const demanded = flowDemand[connection.id] || 0;
            amount = Math.max(0, Math.min(demanded, available));
        } else {
            const space = Math.max(0, (to.bufferInputMax[resource] || 0) - (to.bufferInput[resource] || 0));
            amount = Math.max(0, Math.min(available, space));
        }

        from.bufferOutput[resource] = Math.max(0, available - amount);
        to.bufferInput[resource] = (to.bufferInput[resource] || 0) + amount;
        const flowPerSec = simStepSeconds > 0 ? amount / simStepSeconds : 0;
        from.outputFlow[resource] = (from.outputFlow[resource] || 0) + flowPerSec;
        to.inputFlow[resource] = (to.inputFlow[resource] || 0) + flowPerSec;
        gameState.resourceFlow[connection.id] = flowPerSec;
    });

    // Phase 2: machines that consume flow resources (steam engine, compressor consumers, etc.)
    // Their bufferInput is now filled by the connection transfers above.
    gameState.machines.filter(m => hasFlowInput(m) && m.type !== 'hub').forEach(machine => {
        const def = machineTypes[machine.type];
        const tier = getTierDef(machine);
        const maxProd = tier.productionRate || 0;
        const maxProdStep = maxProd * simStepSeconds;

        if (def.outputs.length === 0 && def.inputs.length > 0) {
            machine.production = 0; machine.efficiency = 0; return;
        }

        const inputLimits = def.inputs.map(resource => {
            const ratio = def.inputRatios[resource] || 1;
            const buf = machine.bufferInput[resource] || 0;
            return ratio > 0 ? buf / ratio : 0;
        });

        const outputSpaces = def.outputs.map(resource =>
            FLOW_RESOURCES.has(resource)
                ? maxProdStep
                : Math.max(0, (machine.bufferOutputMax[resource] || 0) - (machine.bufferOutput[resource] || 0))
        );

        const byInputs = inputLimits.length ? Math.min(...inputLimits) : maxProdStep;
        const byOutputSpace = outputSpaces.length ? Math.min(...outputSpaces) : maxProdStep;
        const real = Math.max(0, Math.min(maxProdStep, byInputs, byOutputSpace));

        def.inputs.forEach(resource => {
            const ratio = def.inputRatios[resource] || 1;
            machine.bufferInput[resource] = Math.max(0, (machine.bufferInput[resource] || 0) - real * ratio);
        });

        def.outputs.forEach(resource => {
            machine.bufferOutput[resource] = (machine.bufferOutput[resource] || 0) + real;
            machine.totalProduced[resource] = (machine.totalProduced[resource] || 0) + real;
            gameState.totalProducedGlobal[resource] = (gameState.totalProducedGlobal[resource] || 0) + real;
        });

        const realPerSec = simStepSeconds > 0 ? real / simStepSeconds : 0;
        machine.production = realPerSec;
        machine.efficiency = maxProd > 0 ? realPerSec / maxProd : 0;

        if (realPerSec >= maxProd && maxProd > 0) machine.status = 'active';
        else if (real > 0) machine.status = 'partial';
        else if (byOutputSpace <= 0 && (byInputs > 0 || def.inputs.length === 0)) machine.status = 'bottleneck';
        else machine.status = 'stopped';

        if (machine.status === 'bottleneck') machine.bottleneckTicks = (machine.bottleneckTicks || 0) + 1;
        else machine.bottleneckTicks = 0;

        if (real > 0) machine.uptime += simStepSeconds;
    });

    // Pass 4: transfer flow resources produced by Phase 2 machines to their downstream consumers
    // (e.g. energia_mecanica from maquina_vapor → britador_mecanico, captacao_agua_manual)
    gameState.connections.forEach(connection => {
        const resource = connection.resource;
        if (!FLOW_RESOURCES.has(resource)) return;
        const from = gameState.machines.find(m => m.id === connection.from);
        const to = gameState.machines.find(m => m.id === connection.to);
        if (!from || !to) return;
        // Only for connections where the source was processed in Phase 2
        if (!hasFlowInput(from)) return;
        const available = from.bufferOutput[resource] || 0;
        if (available <= 0) return;
        const demanded = demandPerTick(to, resource);
        const amount = Math.max(0, Math.min(demanded, available));
        from.bufferOutput[resource] = Math.max(0, available - amount);
        to.bufferInput[resource] = (to.bufferInput[resource] || 0) + amount;
        const flowPerSec = simStepSeconds > 0 ? amount / simStepSeconds : 0;
        from.outputFlow[resource] = (from.outputFlow[resource] || 0) + flowPerSec;
        to.inputFlow[resource] = (to.inputFlow[resource] || 0) + flowPerSec;
        gameState.resourceFlow[connection.id] = flowPerSec;
    });

    // Pass 4b: process Phase 2 machines that depend on other Phase 2 outputs
    // (e.g. britador_mecanico consuming energia_mecanica from maquina_vapor)
    gameState.machines.filter(m => hasFlowInput(m) && m.type !== 'hub').forEach(machine => {
        const def = machineTypes[machine.type];
        // Only re-process if this machine got new input from Pass 4
        const gotNewInput = def.inputs.some(r => FLOW_RESOURCES.has(r) && (machine.bufferInput[r] || 0) > 0);
        if (!gotNewInput) return;

        const tier = getTierDef(machine);
        const maxProd = tier.productionRate || 0;
        const maxProdStep = maxProd * simStepSeconds;

        if (def.outputs.length === 0) return;

        const inputLimits = def.inputs.map(resource => {
            const ratio = def.inputRatios[resource] || 1;
            return ratio > 0 ? (machine.bufferInput[resource] || 0) / ratio : 0;
        });
        const outputSpaces = def.outputs.map(resource =>
            FLOW_RESOURCES.has(resource) ? maxProdStep
                : Math.max(0, (machine.bufferOutputMax[resource] || 0) - (machine.bufferOutput[resource] || 0))
        );
        const byInputs = inputLimits.length ? Math.min(...inputLimits) : maxProdStep;
        const byOutputSpace = outputSpaces.length ? Math.min(...outputSpaces) : maxProdStep;
        const real = Math.max(0, Math.min(maxProdStep, byInputs, byOutputSpace));

        def.inputs.forEach(resource => {
            const ratio = def.inputRatios[resource] || 1;
            machine.bufferInput[resource] = Math.max(0, (machine.bufferInput[resource] || 0) - real * ratio);
        });
        def.outputs.forEach(resource => {
            machine.bufferOutput[resource] = (machine.bufferOutput[resource] || 0) + real;
            machine.totalProduced[resource] = (machine.totalProduced[resource] || 0) + real;
            gameState.totalProducedGlobal[resource] = (gameState.totalProducedGlobal[resource] || 0) + real;
        });

        const realPerSec = simStepSeconds > 0 ? real / simStepSeconds : 0;
        machine.production = realPerSec;
        machine.efficiency = maxProd > 0 ? realPerSec / maxProd : 0;
        if (realPerSec >= maxProd && maxProd > 0) machine.status = 'active';
        else if (real > 0) machine.status = 'partial';
        else if (byOutputSpace <= 0 && (byInputs > 0 || def.inputs.length === 0)) machine.status = 'bottleneck';
        else machine.status = 'stopped';
        if (machine.status === 'bottleneck') machine.bottleneckTicks = (machine.bottleneckTicks || 0) + 1;
        else machine.bottleneckTicks = 0;
        if (real > 0) machine.uptime += simStepSeconds;
    });

    // Pass 5: re-flush hubs for FLOW_RESOURCES filled by Pass 4
    // (Pass 2 ran before Phase 2 produced flow resources, so hubs missed them)
    gameState.machines.filter(m => m.type === 'hub').forEach(hub => {
        const filters = hub.resourceFilters || [];
        filters.forEach(resource => {
            if (!FLOW_RESOURCES.has(resource)) return;
            const inBuf = hub.bufferInput[resource] || 0;
            if (inBuf <= 0) return;
            hub.bufferInput[resource] = 0;
            hub.bufferOutput[resource] = (hub.bufferOutput[resource] || 0) + inBuf;
        });
    });

    // Pass 6: transfer flow resources from hub output to downstream machines
    gameState.connections.filter(c => {
        const from = gameState.machines.find(m => m.id === c.from);
        return from && from.type === 'hub' && FLOW_RESOURCES.has(c.resource);
    }).forEach(connection => {
        const from = gameState.machines.find(m => m.id === connection.from);
        const to = gameState.machines.find(m => m.id === connection.to);
        if (!from || !to) return;
        const resource = connection.resource;
        const available = from.bufferOutput[resource] || 0;
        if (available <= 0) return;
        const demanded = demandPerTick(to, resource);
        const amount = Math.max(0, Math.min(demanded, available));
        if (amount <= 0) return;
        from.bufferOutput[resource] = Math.max(0, available - amount);
        to.bufferInput[resource] = (to.bufferInput[resource] || 0) + amount;
        const flowPerSec = simStepSeconds > 0 ? amount / simStepSeconds : 0;
        from.outputFlow[resource] = (from.outputFlow[resource] || 0) + flowPerSec;
        to.inputFlow[resource] = (to.inputFlow[resource] || 0) + flowPerSec;
        gameState.resourceFlow[connection.id] = flowPerSec;
    });

    // Pass 7: re-process flow-input machines that received flow resources via hub in Pass 6
    // (Pass 4b ran before Pass 6, so those machines missed the hub-delivered energy)
    gameState.machines.filter(m => hasFlowInput(m) && m.type !== 'hub').forEach(machine => {
        const def = machineTypes[machine.type];
        const gotHubFlow = def.inputs.some(r => FLOW_RESOURCES.has(r) && (machine.bufferInput[r] || 0) > 0);
        if (!gotHubFlow) return;

        const tier = getTierDef(machine);
        const maxProd = tier.productionRate || 0;
        const maxProdStep = maxProd * simStepSeconds;
        if (def.outputs.length === 0) return;

        const inputLimits = def.inputs.map(resource => {
            const ratio = def.inputRatios[resource] || 1;
            return ratio > 0 ? (machine.bufferInput[resource] || 0) / ratio : 0;
        });
        const outputSpaces = def.outputs.map(resource =>
            FLOW_RESOURCES.has(resource) ? maxProdStep
                : Math.max(0, (machine.bufferOutputMax[resource] || 0) - (machine.bufferOutput[resource] || 0))
        );
        const byInputs = inputLimits.length ? Math.min(...inputLimits) : maxProdStep;
        const byOutputSpace = outputSpaces.length ? Math.min(...outputSpaces) : maxProdStep;
        const real = Math.max(0, Math.min(maxProdStep, byInputs, byOutputSpace));

        def.inputs.forEach(resource => {
            const ratio = def.inputRatios[resource] || 1;
            machine.bufferInput[resource] = Math.max(0, (machine.bufferInput[resource] || 0) - real * ratio);
        });
        def.outputs.forEach(resource => {
            machine.bufferOutput[resource] = (machine.bufferOutput[resource] || 0) + real;
            machine.totalProduced[resource] = (machine.totalProduced[resource] || 0) + real;
            gameState.totalProducedGlobal[resource] = (gameState.totalProducedGlobal[resource] || 0) + real;
        });

        const realPerSec = simStepSeconds > 0 ? real / simStepSeconds : 0;
        machine.production = realPerSec;
        machine.efficiency = maxProd > 0 ? realPerSec / maxProd : 0;
        if (realPerSec >= maxProd && maxProd > 0) machine.status = 'active';
        else if (real > 0) machine.status = 'partial';
        else if (byOutputSpace <= 0 && (byInputs > 0 || def.inputs.length === 0)) machine.status = 'bottleneck';
        else machine.status = 'stopped';
        if (machine.status === 'bottleneck') machine.bottleneckTicks = (machine.bottleneckTicks || 0) + 1;
        else machine.bottleneckTicks = 0;
        if (real > 0) machine.uptime += simStepSeconds;
    });

    // Discard unconsumed flow resources — they cannot accumulate between ticks
    gameState.machines.forEach(machine => {
        const def = machineTypes[machine.type];
        if (!def) return;
        [...def.inputs, ...def.outputs].forEach(resource => {
            if (FLOW_RESOURCES.has(resource)) {
                machine.bufferInput[resource] = 0;
                machine.bufferOutput[resource] = 0;
            }
        });
    });

    gameState.machines.filter(m => m.type === 'mercado').forEach(mercado => {
        const def = machineTypes.mercado;
        let soldSomething = false;
        def.inputs.forEach(resource => {
            const qty = mercado.bufferInput[resource] || 0;
            if (qty <= 0) return;
            gameState.gold += qty * (marketPrices[resource] || 0);
            mercado.bufferInput[resource] = 0;
            soldSomething = true;
        });
        if (soldSomething && typeof triggerFirstSale === 'function') triggerFirstSale();
        mercado.status = soldSomething ? 'active' : 'idle';
    });

    gameState.machines.filter(m => m.type === 'deposito').forEach(dep => {
        Object.entries(dep.bufferInput || {}).forEach(([resource, qty]) => {
            if (qty > 0) {
                gameState.globalInventory[resource] = (gameState.globalInventory[resource] || 0) + qty;
                dep.bufferInput[resource] = 0;
            }
        });
        const hasAny = Object.values(gameState.globalInventory).some(v => v > 0);
        dep.status = hasAny ? 'active' : 'idle';
    });

    // Terminal de Suprimentos: puxa do globalInventory e injeta no bufferOutput
    gameState.machines.filter(m => m.type === 'terminal_suprimentos').forEach(term => {
        const resource = term.pulledResource;
        if (!resource) { term.status = 'idle'; return; }
        const available = gameState.globalInventory[resource] || 0;
        const rate = term.pullRate || 10;
        const pull = Math.min(rate * simStepSeconds, available);
        if (pull > 0) {
            gameState.globalInventory[resource] -= pull;
            term.bufferOutput[resource] = (term.bufferOutput[resource] || 0) + pull;
            term.status = 'active';
        } else {
            term.status = 'stopped';
        }
    });

    gameState.machines.forEach(machine => {
        machine.effHistory.push(Math.max(0, Math.min(1, machine.efficiency || 0)));
        if (machine.effHistory.length > 60) machine.effHistory.shift();
    });

    gameState.connections.forEach(updateConnectionVisual);
    updateMachineUI();
    updateGoldDisplay();
    checkEraProgression();
}

