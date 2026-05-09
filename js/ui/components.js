function showMachineTooltip(machineId, chipEl) {
    const machine = machineTypes[machineId];
    if (!machine || !uiRuntime.tooltipEl) return;
    const tier = machine.tiers[0];
    const categoryColor = getComputedStyle(document.documentElement)
        .getPropertyValue(`--cat-${machine.category}`) || '#3b82f6';

    uiRuntime.tooltipEl.style.borderColor = categoryColor.trim();

    if (machineId === 'hub') {
        uiRuntime.tooltipEl.innerHTML = `
            <div class="tooltip-head">
                <div class="tooltip-icon">${getMachineIcon(machineId)}</div>
                <div>
                    <div class="tooltip-title">${machine.name}</div>
                    <div class="tooltip-sub">Roteador Logístico (Main Bus)</div>
                </div>
            </div>
            <div class="tooltip-section">
                <div class="tooltip-row"><span style="color:var(--text-secondary);">Aceita qualquer recurso, limite de <strong style="color:var(--accent-cyan)">2 tipos</strong> simultâneos.</span></div>
            </div>
            <div class="tooltip-section">
                <div class="tooltip-row"><span>Hub→Hub</span><span style="color:var(--accent-cyan)">Highway</span></div>
                <div class="tooltip-row"><span>💰 Custo</span><span>${machine.cost.toLocaleString('pt-BR')}</span></div>
            </div>
        `;
    } else {
        uiRuntime.tooltipEl.innerHTML = `
            <div class="tooltip-head">
                <div class="tooltip-icon">${getMachineIcon(machineId)}</div>
                <div>
                    <div class="tooltip-title">${machine.name}</div>
                    <div class="tooltip-sub">${machine.description}</div>
                </div>
            </div>
            <div class="tooltip-section">
                <div class="tooltip-section-title">Entradas</div>
                ${machine.inputs.length ? machine.inputs.map(resource => `
                    <div class="tooltip-row">
                        <span style="display:flex;align-items:center;gap:6px;">
                            <span class="resource-dot" style="background:${getResourceColor(resource)}"></span>${getResourceName(resource)}
                        </span>
                        <span>${(machine.inputRatios[resource] || 1).toFixed(2)} / t prod</span>
                    </div>`).join('') : '<div class="tooltip-row"><span>Sem entradas</span><span>—</span></div>'}
            </div>
            <div class="tooltip-section">
                <div class="tooltip-section-title">Saídas</div>
                ${machine.outputs.length ? machine.outputs.map(resource => `
                    <div class="tooltip-row"><span>${getResourceName(resource)}</span><span>${formatRatePerHour(tier.productionRate, resource)}</span></div>
                `).join('') : '<div class="tooltip-row"><span>Sem saída</span><span>—</span></div>'}
            </div>
            <div class="tooltip-section">
                <div class="tooltip-row"><span>Buffer interno</span><span>${Math.max(10, Math.round((tier.productionRate || 1) * 3))} u</span></div>
                <div class="tooltip-row"><span>Trabalhadores</span><span>${tier.workers}</span></div>
                <div class="tooltip-row"><span>💰 Custo</span><span>${machine.cost.toLocaleString('pt-BR')}</span></div>
            </div>
        `;
    }

    const rect = chipEl.getBoundingClientRect();
    const tooltipRect = { width: 320, height: 260 };
    let left = rect.right + 12;
    let top = rect.top - 4;
    if (left + tooltipRect.width > window.innerWidth - 8) left = rect.left - tooltipRect.width - 12;
    if (top + tooltipRect.height > window.innerHeight - 8) top = window.innerHeight - tooltipRect.height - 8;
    if (top < 8) top = 8;

    uiRuntime.tooltipEl.style.left = `${left}px`;
    uiRuntime.tooltipEl.style.top = `${top}px`;
    uiRuntime.tooltipEl.classList.add('show');
}

function hideMachineTooltip() {
    if (uiRuntime.tooltipEl) uiRuntime.tooltipEl.classList.remove('show');
}

function getMachineDiagnostic(machine) {
    const def = machineTypes[machine.type];
    if (machine.status === 'bottleneck') {
        const seconds = Math.floor((machine.bottleneckTicks || 0) / TICK.TPS);
        const rateAtMax = getTierDef(machine).productionRate || 0;
        const lostPerHour = def.outputs.reduce((sum, resource) => sum + ((marketPrices[resource] || 0) * rateAtMax * 3600), 0);
        const lostGold = lostPerHour * (seconds / 3600);
        return `Buffer de saída cheio há ${formatDurationCompact(seconds)}. Perda estimada: ${Math.floor(lostGold).toLocaleString('pt-BR')} ouro.`;
    }
    if (machine.status === 'partial') {
        const weak = def.inputs.find(resource => {
            const expected = (getTierDef(machine).productionRate || 0) * (def.inputRatios[resource] || 1);
            return (machine.inputFlow[resource] || 0) < expected * 0.8;
        });
        if (weak) {
            const expected = (getTierDef(machine).productionRate || 0) * (def.inputRatios[weak] || 1);
            const received = machine.inputFlow[weak] || 0;
            const ratio = expected > 0 ? (received / expected) * 100 : 0;
            return `Limitada por ${getResourceName(weak)}: recebendo ${formatDecimal(received * 3600)} /h de ${formatDecimal(expected * 3600)} /h necessários (${Math.round(ratio)}%).`;
        }
        return 'Operação parcial por limitação de fluxo.';
    }
    if (machine.status === 'stopped') return 'Sem suprimento suficiente de insumos para iniciar produção.';
    if (machine.status === 'idle') return 'Máquina ociosa: saída sem escoamento ou sem demanda a jusante.';
    const projected = estimateMachineHourlyRevenue(machine);
    return `Operação estável. Receita potencial projetada: ${Math.floor(projected).toLocaleString('pt-BR')} ouro/h.`;
}

function ensureProductionPanelStructure() {
    const sectionsHost = document.getElementById('productionResourceSections');
    if (!sectionsHost || Object.keys(uiRuntime.productionSections).length > 0) return;

    Object.entries(PRODUCTION_CATEGORIES).forEach(([categoryKey, category]) => {
        const section = document.createElement('section');
        section.className = 'prod-category';
        section.dataset.category = categoryKey;

        const header = document.createElement('header');
        header.className = 'prod-category-header';
        header.textContent = category.label;
        header.style.borderLeft = `3px solid ${category.colorVar}`;

        const body = document.createElement('div');

        section.appendChild(header);
        section.appendChild(body);
        sectionsHost.appendChild(section);

        uiRuntime.productionSections[categoryKey] = {
            section,
            body
        };
    });
}

function createProductionRow(resource) {
    const category = getResourceCategory(resource);
    const section = uiRuntime.productionSections[category] || uiRuntime.productionSections.outros;
    if (!section) return null;

    const row = document.createElement('div');
    row.className = 'prod-resource-row';
    row.dataset.resource = resource;
    row.innerHTML = `
        <div class="prod-row-top">
            <div class="prod-name"><span class="resource-dot" style="background:${getResourceColor(resource)}"></span><span>${getResourceName(resource)}</span></div>
            <span class="prod-num" data-role="prod">0.0</span>
            <span class="prod-num" data-role="cons">0.0</span>
            <span class="prod-num prod-net-neutral" data-role="net">0.0</span>
        </div>
        <div class="prod-balance-track"><div class="prod-balance-fill" data-role="fill"></div></div>
    `;

    section.body.appendChild(row);

    const refs = {
        row,
        prod: row.querySelector('[data-role="prod"]'),
        cons: row.querySelector('[data-role="cons"]'),
        net: row.querySelector('[data-role="net"]'),
        fill: row.querySelector('[data-role="fill"]'),
        category
    };

    uiRuntime.productionRows[resource] = refs;
    return refs;
}

function renderProductionAlerts(alerts) {
    const alertsEl = document.getElementById('productionAlerts');
    if (!alertsEl) return;

    if (!alerts.length) {
        alertsEl.innerHTML = '<div style="font-size:11px;color:var(--text-tertiary);">Sem alertas críticos no momento.</div>';
        return;
    }

    alertsEl.innerHTML = '';
    alerts.forEach(alert => {
        const item = document.createElement('button');
        item.className = 'prod-alert';
        item.type = 'button';
        item.innerHTML = `<span>${alert.icon}</span><span>${alert.text}</span>`;
        item.addEventListener('click', () => {
            toggleProductionPanel(false);
            if (alert.machineId) {
                const machine = gameState.machines.find(m => m.id === alert.machineId);
                if (machine) selectMachine(machine);
            }
        });
        alertsEl.appendChild(item);
    });
}

function buildFactoryProductionSnapshot() {
    const stats = {};

    gameState.machines.forEach(machine => {
        ensureMachineShape(machine);

        Object.entries(machine.outputFlow || {}).forEach(([resource, rate]) => {
            if (!stats[resource]) stats[resource] = { produced: 0, consumed: 0, stored: 0 };
            stats[resource].produced += rate || 0;
        });

        Object.entries(machine.inputFlow || {}).forEach(([resource, rate]) => {
            if (!stats[resource]) stats[resource] = { produced: 0, consumed: 0, stored: 0 };
            stats[resource].consumed += rate || 0;
        });

        Object.entries(machine.bufferInput || {}).forEach(([resource, amount]) => {
            if (!stats[resource]) stats[resource] = { produced: 0, consumed: 0, stored: 0 };
            stats[resource].stored += amount || 0;
        });

        Object.entries(machine.bufferOutput || {}).forEach(([resource, amount]) => {
            if (!stats[resource]) stats[resource] = { produced: 0, consumed: 0, stored: 0 };
            stats[resource].stored += amount || 0;
        });
    });

    const alerts = [];

    gameState.machines.forEach(machine => {
        if (machine.status === 'bottleneck') {
            alerts.push({
                type: 'bottleneck',
                icon: '⚠️',
                machineId: machine.id,
                text: `Gargalo detectado em ${machineTypes[machine.type].name}.`
            });
        }
    });

    gameState.machines.forEach(machine => {
        if (machine.type !== 'deposito') return;
        const used = Object.keys(machine.bufferInput).reduce((sum, r) => sum + (machine.bufferInput[r] || 0), 0);
        const max = Math.max(1, Object.keys(machine.bufferInputMax).reduce((sum, r) => sum + (machine.bufferInputMax[r] || 0), 0));
        const ratio = used / max;
        if (ratio >= 0.85) {
            alerts.push({
                type: 'storage',
                icon: '📦',
                machineId: machine.id,
                text: `${machineTypes[machine.type].name} acima de 85% (${Math.round(ratio * 100)}%).`
            });
        }
    });

    const outputLinkedIds = new Set(gameState.connections.map(connection => connection.from));
    gameState.machines.forEach(machine => {
        if (machine.status === 'idle' && outputLinkedIds.has(machine.id) && (machine.production || 0) <= 0) {
            alerts.push({
                type: 'idle',
                icon: '💤',
                machineId: machine.id,
                text: `${machineTypes[machine.type].name} está ociosa com saída conectada.`
            });
        }
    });

    Object.entries(stats).forEach(([resource, info]) => {
        if (!isEssentialResource(resource) || info.consumed <= 0) {
            uiRuntime.resourceDeficitTicks[resource] = 0;
            return;
        }

        const net = (info.produced || 0) - (info.consumed || 0);
        if (net < 0) {
            uiRuntime.resourceDeficitTicks[resource] = (uiRuntime.resourceDeficitTicks[resource] || 0) + TICK.PANEL_EVERY_TICKS;
        } else {
            uiRuntime.resourceDeficitTicks[resource] = 0;
        }

        if ((uiRuntime.resourceDeficitTicks[resource] || 0) >= (TICK.TPS * 30)) {
            const targetMachine = gameState.machines.find(machine => {
                const def = machineTypes[machine.type];
                return def.inputs.includes(resource);
            });

            alerts.push({
                type: 'deficit',
                icon: '⛔',
                machineId: targetMachine ? targetMachine.id : null,
                text: `Déficit de ${getResourceName(resource)} há mais de 30s.`
            });
        }
    });

    return { stats, alerts };
}

function updateProductionPanel(snapshot) {
    ensureProductionPanelStructure();

    const visibleCategories = new Set();
    const activeResources = Object.entries(snapshot.stats)
        .filter(([, info]) => (info.produced || 0) > 0 || (info.consumed || 0) > 0 || (info.stored || 0) > 0)
        .map(([resource]) => resource);

    activeResources.forEach(resource => {
        const info = snapshot.stats[resource];
        const rowRefs = uiRuntime.productionRows[resource] || createProductionRow(resource);
        if (!rowRefs) return;

        const produced = info.produced || 0;
        const consumed = info.consumed || 0;
        const net = produced - consumed;
        const scale = Math.max(produced, consumed, 0.0001);
        const ratio = Math.min(1, Math.abs(net) / scale);

        rowRefs.prod.textContent = formatNumericPerHour(produced, resource);
        rowRefs.cons.textContent = formatNumericPerHour(consumed, resource);

        const arrow = net > 0.01 ? '↑' : net < -0.01 ? '↓' : '→';
        rowRefs.net.textContent = `${arrow} ${formatNumericPerHour(Math.abs(net), resource)}`;
        rowRefs.net.className = `prod-num ${net > 0.01 ? 'prod-net-pos' : net < -0.01 ? 'prod-net-neg' : 'prod-net-neutral'}`;

        rowRefs.fill.style.width = `${Math.round(ratio * 100)}%`;
        rowRefs.fill.style.background = net > 0.01 ? 'var(--accent-green)' : net < -0.01 ? 'var(--accent-red)' : 'var(--text-tertiary)';
        rowRefs.row.style.display = 'grid';

        visibleCategories.add(rowRefs.category);
    });

    Object.entries(uiRuntime.productionRows).forEach(([resource, refs]) => {
        if (!activeResources.includes(resource)) {
            refs.row.style.display = 'none';
        }
    });

    Object.entries(uiRuntime.productionSections).forEach(([category, refs]) => {
        refs.section.style.display = visibleCategories.has(category) ? 'block' : 'none';
    });

    renderProductionAlerts(snapshot.alerts);
}

function toggleProductionPanel(forceOpen) {
    const panel = document.getElementById('productionPanel');
    const button = document.getElementById('productionToggleBtn');
    if (!panel || !button) return;

    const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !uiRuntime.productionOpen;
    uiRuntime.productionOpen = shouldOpen;
    panel.classList.toggle('open', shouldOpen);
    button.classList.toggle('active', shouldOpen);

    if (shouldOpen) {
        refreshProductionRuntime();
        if (uiRuntime.latestProductionSnapshot) {
            updateProductionPanel(uiRuntime.latestProductionSnapshot);
        }
    }
}

function renderEfficiencyHistory(machine) {
    const history = machine.effHistory || [];
    const width = 250;
    const height = 60;
    if (history.length < 2) return '';
    const step = width / Math.max(1, history.length - 1);
    const points = history.map((v, i) => `${(i * step).toFixed(1)},${(height - v * height).toFixed(1)}`).join(' ');
    return `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="margin-top:8px;border:1px solid var(--border-primary);border-radius:8px;background:rgba(0,0,0,.15)">
            <polyline points="${points}" fill="none" stroke="#34d399" stroke-width="2" />
        </svg>
    `;
}

function showInfoPanel(machine) {
    const panel = document.getElementById('infoPanel');
    const title = document.getElementById('infoTitle');
    const content = document.getElementById('infoContent');
    const def = machineTypes[machine.type];
    const tierDef = getTierDef(machine);
    const currentPerHour = (machine.production || 0) * 3600;
    const maxPerHour = (tierDef.productionRate || 0) * 3600;

    title.textContent = `${def.name} · T${machine.tier + 1}`;

    const inputRows = def.inputs.includes('*')
        ? Object.keys(machine.bufferInput).map(resource => {
            const current = machine.inputFlow[resource] || 0;
            return `
                <div class="resource-item" style="justify-content:space-between;align-items:center;">
                    <span style="display:flex;align-items:center;gap:6px;"><span class="resource-dot" style="background:${getResourceColor(resource)}"></span>${getResourceName(resource)}</span>
                    <span style="font-size:11px;">${formatRatePerHour(current, resource)}</span>
                </div>
            `;
        }).join('') || '<p style="font-size:12px;color:var(--text-tertiary)">Conecte recursos para armazenar.</p>'
        : def.inputs.map(resource => {
            const current = machine.inputFlow[resource] || 0;
            const target = (tierDef.productionRate || 0) * (def.inputRatios[resource] || 1);
            const ratio = target > 0 ? Math.min(1, current / target) : 1;
            return `
                <div class="resource-item" style="justify-content:space-between;align-items:center;">
                    <span style="display:flex;align-items:center;gap:6px;"><span class="resource-dot" style="background:${getResourceColor(resource)}"></span>${getResourceName(resource)}</span>
                    <span style="font-size:11px;">${formatRatePerHour(current, resource)} / ${formatRatePerHour(target, resource)} (${Math.round(ratio * 100)}%)</span>
                </div>
            `;
        }).join('') || '<p style="font-size:12px;color:var(--text-tertiary)">Sem entradas.</p>';

    const depositoRows = Object.keys(machine.bufferInput)
        .map(resource => ({ resource, qty: machine.bufferInput[resource] || 0, cap: machine.bufferInputMax[resource] || 0 }))
        .filter(item => item.qty > 0)
        .sort((a, b) => b.qty - a.qty);

    const depositoMainRow = depositoRows.length
        ? (() => {
            const item = depositoRows[0];
            const pct = item.cap > 0 ? Math.round((item.qty / item.cap) * 100) : 0;
            return `
                <div class="resource-item" style="justify-content:space-between;align-items:center;">
                    <span style="display:flex;align-items:center;gap:6px;"><span class="resource-dot" style="background:${getResourceColor(item.resource)}"></span>${getResourceName(item.resource)}</span>
                    <span style="font-size:11px;">${formatStoredAmount(item.qty, item.resource)} (${pct}%)</span>
                </div>
            `;
        })()
        : '<p style="font-size:12px;color:var(--text-tertiary)">Estoque vazio.</p>';

    const outputRows = def.outputs.map(resource => {
        const current = machine.outputFlow[resource] || 0;
        const target = tierDef.productionRate || 0;
        const ratio = target > 0 ? Math.min(1, current / target) : 1;
        return `
            <div class="resource-item" style="justify-content:space-between;align-items:center;">
                <span style="display:flex;align-items:center;gap:6px;"><span class="resource-dot" style="background:${getResourceColor(resource)}"></span>${getResourceName(resource)}</span>
                <span style="font-size:11px;">${formatRatePerHour(current, resource)} / ${formatRatePerHour(target, resource)} (${Math.round(ratio * 100)}%)</span>
            </div>
        `;
    }).join('') || '<p style="font-size:12px;color:var(--text-tertiary)">Sem saídas.</p>';

    const inFill = Math.round((Object.keys(machine.bufferInput).reduce((a, r) => a + (machine.bufferInput[r] || 0), 0) /
        Math.max(1, Object.keys(machine.bufferInputMax).reduce((a, r) => a + (machine.bufferInputMax[r] || 0), 0))) * 100);
    const outFill = Math.round((Object.keys(machine.bufferOutput).reduce((a, r) => a + (machine.bufferOutput[r] || 0), 0) /
        Math.max(1, Object.keys(machine.bufferOutputMax).reduce((a, r) => a + (machine.bufferOutputMax[r] || 0), 0))) * 100);

    content.innerHTML = `
        <div class="info-section">
            <div class="info-card">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="width:44px;height:44px;display:grid;place-items:center;">${getMachineIcon(machine.type)}</div>
                        <div>
                            <div style="font-weight:600;">${def.name}</div>
                            <div style="font-size:11px;color:var(--text-secondary);">${def.description}</div>
                        </div>
                    </div>
                    <div class="status-badge ${machine.status}" style="position:static;">${machine.status.toUpperCase()}</div>
                </div>
            </div>
        </div>

        <div class="info-section">
            <div class="info-card machine-metrics-grid">
                <div class="machine-metric">
                    <div class="machine-metric-label">Produção atual</div>
                    <div class="machine-metric-value">${formatDecimal(currentPerHour)} /h</div>
                </div>
                <div class="machine-metric">
                    <div class="machine-metric-label">Produção máxima</div>
                    <div class="machine-metric-value">${formatDecimal(maxPerHour)} /h</div>
                </div>
                <div class="machine-metric">
                    <div class="machine-metric-label">Eficiência</div>
                    <div class="machine-metric-value">${formatDecimal((machine.efficiency || 0) * 100)}%</div>
                </div>
                <div class="machine-metric">
                    <div class="machine-metric-label">Tempo operando</div>
                    <div class="machine-metric-value">${formatDurationCompact(machine.uptime || 0)}</div>
                </div>
            </div>
        </div>

        <div class="info-section"><h4>${machine.type === 'deposito' ? 'Estoque principal' : 'Fluxo em tempo real'}</h4><div class="info-card">${machine.type === 'deposito' ? depositoMainRow : `${inputRows}<hr style="border:none;border-top:1px solid var(--border-primary);margin:8px 0;">${outputRows}`}</div></div>

        <div class="info-section"><h4>Buffers</h4>
            <div class="info-card">
                <div style="font-size:12px;margin-bottom:4px;">Entrada ${inFill}%</div>
                <div class="meter"><div class="meter-fill ${inFill >= 80 ? 'buffer-warn' : 'good'}" style="width:${Math.min(100, inFill)}%"></div></div>
                <div style="font-size:12px;margin:8px 0 4px;">Saída ${outFill}%</div>
                <div class="meter"><div class="meter-fill ${outFill >= 100 ? 'buffer-full' : outFill >= 80 ? 'buffer-warn' : 'good'}" style="width:${Math.min(100, outFill)}%"></div></div>
            </div>
        </div>

        ${(def.workersMin > 0) ? `
        <div class="info-section"><h4>⚒️ Trabalhadores</h4>
            <div class="info-card">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <span style="font-size:12px;color:var(--text-secondary);">Alocados: <b style="color:var(--text-primary);" id="workers-count-${machine.id}">${machine.workersAssigned || 0}</b> / ${def.workersMax || def.workersMin}</span>
                    <span style="font-size:11px;color:${(machine.workerFactor || 0) >= 0.9 ? '#4ade80' : (machine.workerFactor || 0) > 0 ? '#facc15' : '#f87171'};" id="workers-eff-${machine.id}">${Math.round((machine.workerFactor || 0) * 100)}% efic.</span>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <button class="btn btn-sm" id="workers-minus-${machine.id}" data-action="workers-minus" data-machine-id="${machine.id}">－</button>
                    <input type="range" id="workers-slider-${machine.id}" min="0" max="${def.workersMax || def.workersMin}" value="${machine.workersAssigned || 0}" style="flex:1;accent-color:#4ade80;" data-action="workers-slider" data-machine-id="${machine.id}">
                    <button class="btn btn-sm" id="workers-plus-${machine.id}" data-action="workers-plus" data-machine-id="${machine.id}">＋</button>
                </div>
                <div style="font-size:10px;color:var(--text-tertiary);margin-top:6px;">Min: ${def.workersMin} · Sem trabalhadores = máquina parada</div>
            </div>
        </div>
        ` : ''}

        <div class="info-section"><h4>Diagnóstico</h4><div class="info-card" style="font-size:12px;line-height:1.45;">${getMachineDiagnostic(machine)}</div></div>

        <div class="info-section"><h4>Histórico de eficiência</h4><div class="info-card">${renderEfficiencyHistory(machine)}</div></div>

        ${machine.type === 'hub' ? `
        <div class="info-section"><h4>🔀 Filtros do Main Bus</h4>
            <div class="info-card">
                <div style="font-size:11px;color:var(--text-tertiary);margin-bottom:8px;">
                    Roteador Logístico — aceita qualquer recurso, limite de 2 tipos simultâneos.
                </div>
                ${(machine.resourceFilters && machine.resourceFilters.length)
                    ? machine.resourceFilters.map(r => `
                        <div class="resource-item" style="justify-content:space-between;align-items:center;">
                            <span style="display:flex;align-items:center;gap:6px;">
                                <span class="resource-dot" style="background:${getResourceColor(r)}"></span>${getResourceName(r)}
                            </span>
                            <span style="font-size:11px;color:var(--text-tertiary);">Slot ${machine.resourceFilters.indexOf(r) + 1}/2</span>
                        </div>`).join('')
                    : '<p style="font-size:12px;color:var(--text-tertiary)">Nenhum recurso filtrado.</p>'
                }
                <button class="btn btn-full" style="margin-top:10px;" onclick="clearHubFilters(${machine.id})">Limpar Filtros</button>
            </div>
        </div>` : ''}

        ${machine.type === 'terminal_suprimentos' ? `
        <div class="info-section"><h4>⬇️ Armazém Central</h4>
            <div class="info-card">
                <div style="font-size:11px;color:var(--text-tertiary);margin-bottom:8px;">Selecione o recurso a puxar:</div>
                <select id="termResourceSelect" style="width:100%;padding:6px 10px;background:var(--bg-tertiary);border:1px solid var(--border-primary);border-radius:var(--radius-sm);color:var(--text-primary);font-family:inherit;font-size:12px;margin-bottom:8px;"
                    onchange="setTerminalResource(${machine.id}, this.value)">
                    <option value="">— Selecionar recurso —</option>
                    ${Object.entries(gameState.globalInventory).filter(([, v]) => v > 0).map(([r, v]) => `
                        <option value="${r}" ${machine.pulledResource === r ? 'selected' : ''}>${getResourceName(r)} (${Math.floor(v)} un.)</option>
                    `).join('')}
                </select>
                <div style="font-size:11px;color:var(--text-tertiary);margin-bottom:4px;">Taxa de extração (un/s):</div>
                <input type="number" min="1" max="1000" value="${machine.pullRate || 10}"
                    style="width:100%;padding:6px 10px;background:var(--bg-tertiary);border:1px solid var(--border-primary);border-radius:var(--radius-sm);color:var(--text-primary);font-family:inherit;font-size:12px;"
                    onchange="setTerminalRate(${machine.id}, this.value)">
                <div style="font-size:11px;color:var(--text-tertiary);margin-top:8px;">
                    Estoque atual: <strong style="color:var(--accent-green)">${machine.pulledResource ? Math.floor(gameState.globalInventory[machine.pulledResource] || 0).toLocaleString('pt-BR') + ' un.' : '—'}</strong>
                </div>
            </div>
        </div>` : ''}

        <div class="info-section" style="margin-top:20px;display:grid;gap:8px;">
            <button class="btn btn-danger btn-full" onclick="deleteMachine(${machine.id})">Remover máquina</button>
            <button class="btn btn-full" onclick="handleMachineAction(${machine.id})">Ação contextual</button>
        </div>
    `;

    panel.classList.add('open');

    // ── Worker controls — event delegation (avoids inline onclick issues) ──
    // Removed old listeners by replacing the panel body element
    const body = document.getElementById('infoContent');
    if (body) {
        const newBody = body.cloneNode(true);  // clone removes all old listeners
        body.parentNode.replaceChild(newBody, body);

        newBody.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const action = btn.dataset.action;
            const mid = parseInt(btn.dataset.machineId, 10);
            if (isNaN(mid)) return;
            if (action === 'workers-minus') adjustWorkers(mid, -1);
            if (action === 'workers-plus')  adjustWorkers(mid,  1);
        });

        newBody.addEventListener('input', (e) => {
            const el = e.target.closest('[data-action="workers-slider"]');
            if (!el) return;
            const mid = parseInt(el.dataset.machineId, 10);
            if (isNaN(mid)) return;
            adjustWorkers(mid, null, parseInt(el.value, 10));
        });
    }
}

function clearHubFilters(machineId) {
    const machine = gameState.machines.find(m => m.id === machineId);
    if (!machine || machine.type !== 'hub') return;
    const connIds = gameState.connections
        .filter(c => c.from === machineId || c.to === machineId)
        .map(c => c.id);
    connIds.forEach(id => deleteConnection(id));
    machine.resourceFilters = [];
    updateHubFilterBadge(machine);
    showInfoPanel(machine);
    showMessage('Filtros do Hub limpos.', 'success');
}

function createMachine(type, x, y) {
    const machineDef = machineTypes[type];
    if (!machineDef) return;
    if (gameState.gold < machineDef.cost) {
        showMessage('Ouro insuficiente!', 'error');
        return;
    }

    gameState.gold -= machineDef.cost;
    const machine = {
        id: gameState.nextId++,
        type,
        x,
        y,
        tier: 0,
        status: 'stopped',
        efficiency: 0,
        production: 0,
        bufferInput: {},
        bufferOutput: {},
        bufferInputMax: {},
        bufferOutputMax: {},
        inputFlow: {},
        outputFlow: {},
        totalProduced: {},
        uptime: 0,
        effHistory: []
    };
    ensureMachineShape(machine);
    gameState.machines.push(machine);
    renderMachine(machine);
    removeWelcomeMessage();
    updateGoldDisplay();
    saveGameState();
    showMessage(`${machineDef.name} constuída!`, 'success');
    document.dispatchEvent(new Event('machine:placed'));
    if (window.AudioEngine) AudioEngine.play('place');
}

function setupEventListeners() {
    const canvasIndustry = document.getElementById('canvas');
    const canvasDefense = document.getElementById('canvasDefense');
    const toolbar = document.getElementById('toolbar');
    const allCanvases = [canvasIndustry, canvasDefense].filter(c => c);

    const clearBuildSelection = () => {
        uiRuntime.pendingMachineType = null;
        document.querySelectorAll('.machine-chip.build-selected').forEach(el => el.classList.remove('build-selected'));
    };

    const armBuildSelection = (machineType, chipEl) => {
        uiRuntime.pendingMachineType = machineType;
        document.querySelectorAll('.machine-chip.build-selected').forEach(el => el.classList.remove('build-selected'));
        if (chipEl) chipEl.classList.add('build-selected');
    };

    toolbar.addEventListener('dragstart', (e) => {
        const chip = e.target.closest('.machine-chip');
        if (!chip) return;
        if (chip.classList.contains('era-locked')) { e.preventDefault(); return; }
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('machineType', chip.dataset.machineType);
        e.dataTransfer.setData('text/plain', chip.dataset.machineType);
        armBuildSelection(chip.dataset.machineType, chip);
    });

    toolbar.addEventListener('click', (e) => {
        const chip = e.target.closest('.machine-chip');
        if (!chip) return;
        if (chip.classList.contains('era-locked')) {
            showMessage(`Bloqueado: ${chip.title || 'Desbloqueie a próxima era.'}`, 'warning');
            return;
        }
        showMessage('Arraste a máquina para o canvas para posicioná-la.', 'success');
    });

    allCanvases.forEach(canvas => {
        canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            const machineType = e.dataTransfer.getData('machineType') || e.dataTransfer.getData('text/plain') || uiRuntime.pendingMachineType;
            if (!machineType || !machineTypes[machineType]) return;
            const targetCanvas = e.currentTarget;
            const els = getCanvasElements(targetCanvas.id === 'canvasDefense' ? 'defense' : 'industry');
            const world = canvasClientToWorld(e.clientX, e.clientY, els.container);
            createMachine(machineType, world.x, world.y);
            clearBuildSelection();
        });

        canvas.addEventListener('click', (e) => {
            // Machine placement only via drag-and-drop from toolbar
            if (uiRuntime.pendingMachineType) clearBuildSelection();
        });

        canvas.addEventListener('wheel', (e) => {
            if (!e.ctrlKey) return;
            e.preventDefault();
            const targetCanvas = e.currentTarget;
            const ws = targetCanvas.id === 'canvasDefense' ? 'defense' : 'industry';
            const delta = e.deltaY < 0 ? 0.1 : -0.1;
            const zoom = getWorkspaceZoom(ws);
            applyCanvasZoom(ws, zoom + delta, e.clientX, e.clientY);
        }, { passive: false });

        canvas.addEventListener('scroll', () => {
            updateConnections();
        });
    });

    document.addEventListener('mousedown', (e) => {
        if (e.button !== 1) return;
        e.preventDefault();
        // Check which canvas (if any) the click is over
        const targetCanvas = allCanvases.find(c => {
            const rect = c.getBoundingClientRect();
            return e.clientX >= rect.left && e.clientX <= rect.right &&
                   e.clientY >= rect.top && e.clientY <= rect.bottom;
        });
        if (!targetCanvas) return;
        uiRuntime.isPanningCanvas = true;
        uiRuntime.panCanvas = targetCanvas;
        uiRuntime.panStartX = e.clientX;
        uiRuntime.panStartY = e.clientY;
        uiRuntime.panStartScrollLeft = targetCanvas.scrollLeft;
        uiRuntime.panStartScrollTop = targetCanvas.scrollTop;
        document.body.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!uiRuntime.isPanningCanvas || !uiRuntime.panCanvas) return;
        e.preventDefault();
        const dx = e.clientX - uiRuntime.panStartX;
        const dy = e.clientY - uiRuntime.panStartY;
        uiRuntime.panCanvas.scrollLeft = uiRuntime.panStartScrollLeft - dx;
        uiRuntime.panCanvas.scrollTop = uiRuntime.panStartScrollTop - dy;
    });

    document.addEventListener('mouseup', (e) => {
        if (!uiRuntime.isPanningCanvas) return;
        uiRuntime.isPanningCanvas = false;
        uiRuntime.panCanvas = null;
        document.body.style.cursor = '';
    });

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('port') || e.target.classList.contains('delete-btn')) return;
        // Don't close panel if clicking inside it
        if (e.target.closest('#infoPanel')) return;
        const machineNode = e.target.closest('.machine-node');
        if (machineNode) {
            const machineId = Number(machineNode.id.replace('machine-', ''));
            const machine = gameState.machines.find(m => m.id === machineId);
            if (machine) selectMachine(machine);
        } else {
            closeInfoPanel();
        }
    });
}

function createToolbarChips() {
    const currentWs = currentWorkspace || 'industry';
    // Sempre usar 'toolbar' por enquanto (sidebar principal)
    const toolbar = document.getElementById('toolbar');
    if (!toolbar) {
        console.error('ERRO: Elemento toolbar não encontrado!');
        return;
    }
    toolbar.innerHTML = '';
    const allMachines = Object.keys(machineTypes).filter(id => {
        const def = machineTypes[id];
        if (!def) return false;
        const machineWs = def.workspace || 'industry';
        return machineWs === currentWs;
    });

    const categoryNames = {
        'energia': 'Energia', 'minerio': 'Mineração', 'agua': 'Água',
        'primario': 'Primário', 'secundario': 'Secundário', 'final': 'Final',
        'logistica': 'Logística', 'armazenamento': 'Armazenamento'
    };
    const categoryColors = {
        'energia': 'var(--cat-energia)', 'minerio': 'var(--cat-minerio)',
        'agua': 'var(--cat-agua)', 'primario': 'var(--cat-primario)',
        'secundario': 'var(--cat-secundario)', 'final': 'var(--cat-final)',
        'logistica': 'var(--cat-logistica)', 'armazenamento': 'var(--cat-armazenamento)'
    };

    // Mostrar era atual no topo da sidebar
    const eraDef = ERA_DEFINITIONS[gameState.era];
    const eraHeader = document.createElement('div');
    eraHeader.className = 'era-header';
    const nextEra = ERA_DEFINITIONS[gameState.era + 1];
    const reqText = nextEra && nextEra.requirement
        ? `Próxima: ${nextEra.name} — produzir ${nextEra.requirement.amount} ${getResourceName(nextEra.requirement.resource)}`
        : 'Era máxima atingida';
    eraHeader.innerHTML = `
        <div class="era-badge">Era ${gameState.era}</div>
        <div class="era-name">${eraDef.name}</div>
        <div class="era-req">${reqText}</div>
        ${nextEra ? `<div class="era-progress-bar"><div class="era-progress-fill" style="width:${gameState.eraProgress}%"></div></div>` : ''}
    `;
    toolbar.appendChild(eraHeader);

    // Agrupar por categoria
    const byCategory = {};
    allMachines.forEach(machineId => {
        const def = machineTypes[machineId];
        if (!def) return;
        const cat = def.category;
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(machineId);
    });

    const categoryOrder = ['energia', 'minerio', 'agua', 'primario', 'secundario', 'final', 'logistica', 'armazenamento'];

    categoryOrder.forEach((category, index) => {
        const machines = byCategory[category];
        if (!machines || machines.length === 0) return;

        const group = document.createElement('div');
        group.className = 'category-group';

        const unlockedCount = machines.filter(id => isEraUnlocked(id)).length;
        const header = document.createElement('div');
        header.className = 'category-header' + (index === 0 ? ' expanded' : '');
        header.innerHTML = `
            <div class="category-dot" style="background: ${categoryColors[category] || '#888'}"></div>
            <span class="category-label">${categoryNames[category] || category}</span>
            <span class="category-count">${unlockedCount}/${machines.length}</span>
            <span class="category-chevron">▸</span>
        `;

        const items = document.createElement('div');
        items.className = 'category-items' + (index === 0 ? ' show' : '');

        header.addEventListener('click', () => {
            header.classList.toggle('expanded');
            items.classList.toggle('show');
        });

        // Ordenar: desbloqueados primeiro, depois bloqueados por era
        machines.sort((a, b) => {
            const eraA = machineTypes[a]?.era ?? 0;
            const eraB = machineTypes[b]?.era ?? 0;
            return eraA - eraB;
        });

        machines.forEach(machineId => {
            const machine = machineTypes[machineId];
            if (!machine) return;
            const unlocked = isEraUnlocked(machineId);
            const chip = document.createElement('div');
            chip.className = `machine-chip cat-${machine.category}${unlocked ? '' : ' era-locked'}`;
            chip.draggable = unlocked;
            chip.dataset.machineType = machineId;

            const icon = getMachineIcon(machineId);
            if (unlocked) {
                chip.innerHTML = `
                    <span class="chip-icon">${icon}</span>
                    <div class="chip-info">
                        <div class="chip-name">${machine.name}</div>
                        <div class="chip-cost">💰 ${machine.cost}</div>
                    </div>
                `;
            } else {
                const eraReq = ERA_DEFINITIONS[machine.era];
                const reqHint = eraReq?.requirement
                    ? `${eraReq.requirement.amount} ${getResourceName(eraReq.requirement.resource)}`
                    : `Era ${machine.era}`;
                chip.innerHTML = `
                    <span class="chip-icon" style="opacity:0.3">🔒</span>
                    <div class="chip-info">
                        <div class="chip-name" style="opacity:0.5">${machine.name}</div>
                        <div class="chip-cost" style="color:#f59e0b">Era ${machine.era} — ${reqHint}</div>
                    </div>
                `;
                chip.title = `Desbloqueado na ${ERA_DEFINITIONS[machine.era]?.name || 'Era ' + machine.era}: ${eraReq?.description || ''}`;
            }

            chip.addEventListener('mouseenter', () => {
                clearTimeout(uiRuntime.tooltipTimer);
                if (unlocked) {
                    uiRuntime.tooltipTimer = setTimeout(() => showMachineTooltip(machineId, chip), 400);
                }
            });
            chip.addEventListener('mouseleave', () => {
                clearTimeout(uiRuntime.tooltipTimer);
                hideMachineTooltip();
            });

            items.appendChild(chip);
        });

        group.appendChild(header);
        group.appendChild(items);
        toolbar.appendChild(group);
    });
}
function updateMachineUI() {
    gameState.machines.forEach(machine => {
        updateMachineNodeVisual(machine);
        if (gameState.selectedMachine && gameState.selectedMachine.id === machine.id) {
            showInfoPanel(machine);
        }
    });
    updateGlobalInventoryDock();
}

function setTerminalResource(machineId, resource) {
    const machine = gameState.machines.find(m => m.id === machineId);
    if (!machine) return;
    machine.pulledResource = resource || null;
    machine.bufferOutput = {};
    const def = machineTypes['terminal_suprimentos'];
    def.outputs = resource ? [resource] : ['carvao_bruto'];
}

function setTerminalRate(machineId, rate) {
    const machine = gameState.machines.find(m => m.id === machineId);
    if (!machine) return;
    machine.pullRate = Math.max(1, Math.min(1000, parseFloat(rate) || 10));
}

const _invPrev = {};
function updateGlobalInventoryDock() {
    const dock = document.getElementById('inventoryDock');
    if (!dock) return;
    const inv = gameState.globalInventory;
    const keys = Object.keys(inv).filter(k => inv[k] > 0.01);
    if (!keys.length) {
        dock.innerHTML = '<span style="font-size:11px;color:var(--text-tertiary);padding:0 8px;">Armazém vazio — conecte um Depósito para armazenar recursos.</span>';
        return;
    }
    keys.forEach(resource => {
        const qty = inv[resource];
        const prev = _invPrev[resource] ?? qty;
        const delta = qty - prev;
        _invPrev[resource] = qty;
        const color = delta > 0.001 ? '#34d399' : delta < -0.001 ? '#f87171' : 'var(--text-secondary)';
        let el = dock.querySelector(`[data-inv="${resource}"]`);
        if (!el) {
            el = document.createElement('div');
            el.dataset.inv = resource;
            el.style.cssText = 'display:flex;align-items:center;gap:5px;padding:4px 10px;background:var(--bg-tertiary);border:1px solid var(--border-primary);border-radius:var(--radius-sm);flex-shrink:0;';
            dock.appendChild(el);
        }
        el.innerHTML = `
            <span style="width:8px;height:8px;border-radius:50%;background:${getResourceColor(resource)};flex-shrink:0;display:inline-block;"></span>
            <span style="font-size:10px;color:var(--text-secondary);">${getResourceName(resource)}</span>
            <span style="font-size:11px;font-weight:700;color:${color};font-variant-numeric:tabular-nums;">${Math.floor(qty).toLocaleString('pt-BR')}</span>
        `;
    });
    // remover itens zerados
    dock.querySelectorAll('[data-inv]').forEach(el => {
        if (!inv[el.dataset.inv] || inv[el.dataset.inv] <= 0.01) el.remove();
    });
}

function handleMachineAction(machineId) {
    const machine = gameState.machines.find(m => m.id === machineId);
    if (!machine) return;
    const def = machineTypes[machine.type];

    if (machine.status === 'bottleneck') {
        let sold = 0;
        def.outputs.forEach(resource => {
            const qty = machine.bufferOutput[resource] || 0;
            if (qty <= 0) return;
            sold += qty * ((marketPrices[resource] || 6) * 0.5);
            machine.bufferOutput[resource] = 0;
        });
        if (sold > 0) {
            gameState.gold += sold;
            updateGoldDisplay();
            showMessage(`Excesso descartado: +${Math.floor(sold).toLocaleString('pt-BR')} ouro`, 'warning');
        }
        return;
    }

    showMessage('Use as portas da máquina para conectar novos destinos.', 'warning');
}

function deleteMachine(machineId) {
    gameState.connections
        .filter(conn => conn.from === machineId || conn.to === machineId)
        .forEach(conn => deleteConnection(conn.id));

    gameState.machines = gameState.machines.filter(m => m.id !== machineId);
    const node = document.getElementById(`machine-${machineId}`);
    if (node) node.remove();
    const hubOverlay = document.getElementById(`hub-del-${machineId}`);
    if (hubOverlay) hubOverlay.remove();
    closeInfoPanel();
    saveGameState();
    showMessage('Máquina removida', 'warning');
}

function saveGameState() {
    const saveData = {
        saveVersion: SAVE_VERSION,
        gold: gameState.gold,
        machines: gameState.machines,
        connections: gameState.connections,
        nextId: gameState.nextId,
        era: gameState.era,
        eraProgress: gameState.eraProgress,
        totalProducedGlobal: gameState.totalProducedGlobal,
        globalInventory: gameState.globalInventory,
        securityLevel: gameState.securityLevel,
        lastSecurityTick: gameState.lastSecurityTick,
        worldMap: gameState.worldMap,
        pollutionLevel: gameState.pollutionLevel,
        discoveryPoints: gameState.discoveryPoints,
        city: gameState.city,
        tutorial: gameState.tutorial,
        stats: gameState.stats,
    };
    localStorage.setItem('industrialPipeline_save', JSON.stringify(saveData));
}

function exportSave() {
    const saveData = localStorage.getItem('industrialPipeline_save');
    if (!saveData) return;
    const blob = new Blob([saveData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factory-tycoon-save-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importSave() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const data = JSON.parse(ev.target.result);
                localStorage.setItem('industrialPipeline_save', ev.target.result);
                if (window.applyLoadedState) { applyLoadedState(data); }
                else { location.reload(); }
            } catch(err) { alert('Save inválido: JSON malformado.'); }
        };
        reader.readAsText(file);
    };
    input.click();
}

function loadGameState() {
    const saveData = localStorage.getItem('industrialPipeline_save');
    if (!saveData) return;
    const data = JSON.parse(saveData);
    const noMachines = !data.machines || data.machines.length === 0;
    gameState.gold = noMachines ? 1500 : (data.gold ?? 1500);
    gameState.machines = (data.machines || []).map(machine => {
        ensureMachineShape(machine);
        return machine;
    });
    gameState.connections = (data.connections || []).map(conn => ({ ...conn, capacity: conn.capacity || 1 }));
    gameState.nextId = data.nextId || 1;
    // Migração de saves antigos: se tinha máquinas elétricas, começa na era 1
    if (data.era !== undefined) {
        gameState.era = data.era;
    } else if (gameState.machines.length > 0) {
        gameState.era = 1;
    }
    gameState.eraProgress = data.eraProgress ?? 0;
    gameState.totalProducedGlobal = data.totalProducedGlobal || {};
    gameState.globalInventory = data.globalInventory || {};

    // Migration: ensure totalProducedGlobal reflects at least per-machine totals and globalInventory
    gameState.machines.forEach(m => {
        Object.entries(m.totalProduced || {}).forEach(([resource, qty]) => {
            if (qty > 0) {
                gameState.totalProducedGlobal[resource] = Math.max(
                    gameState.totalProducedGlobal[resource] || 0, qty
                );
            }
        });
    });
    Object.entries(gameState.globalInventory).forEach(([resource, qty]) => {
        if (qty > 0) {
            gameState.totalProducedGlobal[resource] = Math.max(
                gameState.totalProducedGlobal[resource] || 0, qty
            );
        }
    });
    gameState.securityLevel = data.securityLevel ?? 100;
    gameState.lastSecurityTick = data.lastSecurityTick || 0;
    if (data.worldMap) gameState.worldMap = data.worldMap;
    gameState.pollutionLevel = data.pollutionLevel ?? 0;
    gameState.discoveryPoints = data.discoveryPoints ?? 100;
    if (data.city) gameState.city = data.city;
    if (data.tutorial) gameState.tutorial = data.tutorial;
    if (data.stats) gameState.stats = data.stats;

    // Migration: populate hub resourceFilters from existing connections (for saves
    // created before resourceFilters was introduced — filters would be empty []).
    gameState.machines.filter(m => m.type === 'hub').forEach(hub => {
        if (!hub.resourceFilters || hub.resourceFilters.length === 0) {
            const resources = [...new Set(
                gameState.connections
                    .filter(c => (c.from === hub.id || c.to === hub.id) && c.resource && c.resource !== '*')
                    .map(c => c.resource)
            )].slice(0, 2);
            hub.resourceFilters = resources;
        }
    });

    gameState.machines.forEach(machine => renderMachine(machine));
    gameState.connections.forEach(connection => renderConnection(connection));
    updateGoldDisplay();
    updateInventoryDock();
    updateSecurityBar();
    checkEraProgression();
}

function createExampleChain() {
    if (gameState.machines.length > 0) return;
    const blueprint = [
        { type: 'usina_solar', x: 220, y: 160 },
        { type: 'mineradora_fe', x: 380, y: 120 },
        { type: 'mineradora_cu', x: 380, y: 80 },
        { type: 'captacao_agua', x: 220, y: 250 },
        { type: 'eta', x: 380, y: 250 },
        { type: 'mina_carvao', x: 540, y: 160 },
        { type: 'pedreira_calcario', x: 540, y: 120 },
        { type: 'britador', x: 540, y: 80 },
        { type: 'coqueria', x: 700, y: 160 },
        { type: 'forno_cal', x: 700, y: 120 },
        { type: 'compressor_ar', x: 540, y: 250 },
        { type: 'forno_sinterizacao', x: 860, y: 160 },
        { type: 'alto_forno', x: 1020, y: 190 },
        { type: 'deposito', x: 1200, y: 190 }
    ];

    const created = [];
    blueprint.forEach(p => {
        const machine = {
            id: gameState.nextId++,
            type: p.type,
            x: p.x,
            y: p.y,
            tier: 0,
            status: 'stopped',
            efficiency: 0,
            production: 0,
            bufferInput: {},
            bufferOutput: {},
            bufferInputMax: {},
            bufferOutputMax: {},
            inputFlow: {},
            outputFlow: {},
            totalProduced: {},
            uptime: 0,
            effHistory: []
        };
        ensureMachineShape(machine);
        gameState.machines.push(machine);
        created.push(machine);
    });

    created.forEach(renderMachine);

    const byType = Object.fromEntries(created.map(m => [m.type, m]));
    // Energia
    if (byType.usina_solar && byType.mineradora_fe) createConnection(byType.usina_solar, byType.mineradora_fe);
    if (byType.usina_solar && byType.captacao_agua) createConnection(byType.usina_solar, byType.captacao_agua);
    if (byType.usina_solar && byType.mina_carvao) createConnection(byType.usina_solar, byType.mina_carvao);
    if (byType.usina_solar && byType.pedreira_calcario) createConnection(byType.usina_solar, byType.pedreira_calcario);
    if (byType.usina_solar && byType.coqueria) createConnection(byType.usina_solar, byType.coqueria);
    if (byType.usina_solar && byType.forno_cal) createConnection(byType.usina_solar, byType.forno_cal);
    if (byType.usina_solar && byType.compressor_ar) createConnection(byType.usina_solar, byType.compressor_ar);
    if (byType.usina_solar && byType.forno_sinterizacao) createConnection(byType.usina_solar, byType.forno_sinterizacao);
    if (byType.usina_solar && byType.britador) createConnection(byType.usina_solar, byType.britador);
    // Água
    if (byType.captacao_agua && byType.eta) createConnection(byType.captacao_agua, byType.eta);
    if (byType.eta && byType.forno_sinterizacao) createConnection(byType.eta, byType.forno_sinterizacao);
    // Minérios
    if (byType.mineradora_fe && byType.britador) createConnection(byType.mineradora_fe, byType.britador);
    if (byType.mineradora_cu && byType.britador) createConnection(byType.mineradora_cu, byType.britador);
    if (byType.britador && byType.forno_sinterizacao) createConnection(byType.britador, byType.forno_sinterizacao);
    if (byType.mina_carvao && byType.coqueria) createConnection(byType.mina_carvao, byType.coqueria);
    if (byType.pedreira_calcario && byType.forno_cal) createConnection(byType.pedreira_calcario, byType.forno_cal);
    // Intermediários para Alto-Forno
    if (byType.forno_sinterizacao && byType.alto_forno) createConnection(byType.forno_sinterizacao, byType.alto_forno);
    if (byType.coqueria && byType.alto_forno) createConnection(byType.coqueria, byType.alto_forno);
    if (byType.forno_cal && byType.alto_forno) createConnection(byType.forno_cal, byType.alto_forno);
    if (byType.compressor_ar && byType.alto_forno) createConnection(byType.compressor_ar, byType.alto_forno);
    // Saída
    if (byType.alto_forno && byType.deposito) createConnection(byType.alto_forno, byType.deposito);

    updateGoldDisplay();
    saveGameState();
    showMessage('Cadeia inicial criada com gargalo visível para aprendizado.', 'success');
}

function showWelcomeMessage() {
    if (gameState.machines.length > 0) return;
    const world = document.getElementById(getCanvasElements('industry').world);
    if (!world || document.getElementById('welcome-msg')) return;
    const msg = document.createElement('div');
    msg.id = 'welcome-msg';
    msg.style.cssText = `
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -60%);
        text-align: center; pointer-events: none; user-select: none;
    `;
    msg.innerHTML = `
        <div style="font-size:48px;margin-bottom:16px;opacity:0.3">⚙️</div>
        <div style="font-size:15px;font-weight:600;color:#a0a0a0;margin-bottom:8px;">Era 0 — Comece com Carvão e Vapor.</div>
        <div style="font-size:12px;color:#555;">A Captação Manual puxa água sem energia. Use-a com Carvão na Caldeira para gerar Vapor e dar a partida na sua fábrica.</div>
    `;
    world.appendChild(msg);
}

function removeWelcomeMessage() {
    const msg = document.getElementById('welcome-msg');
    if (msg) msg.remove();
}

function showMessage(text, type = 'success') {
    const existing = document.querySelector('.message');
    if (existing) existing.remove();
    const msg = document.createElement('div');
    msg.className = `message ${type}`;
    msg.textContent = text;
    document.body.appendChild(msg);
    setTimeout(() => { if (msg.parentNode) msg.remove(); }, 3000);
}

function updateGoldDisplay() {
    const el = document.getElementById('goldTopDisplay');
    if (!el) return;
    if (isNaN(gameState.gold)) gameState.gold = 0;
    el.textContent = '💰 ' + Math.floor(gameState.gold).toLocaleString('pt-BR');
}`;
}

function selectMachine(machine) {
    gameState.selectedMachine = machine;
    showInfoPanel(machine);
}

function closeInfoPanel() {
    const panel = document.getElementById('infoPanel');
    if (panel) panel.classList.remove('open');
    gameState.selectedMachine = null;
}

function updateInventoryDock() {
    updateGlobalInventoryDock();
}

function updateSecurityBar() {
    const dot = document.getElementById("securityDot");
    const text = document.getElementById("securityText");
    if (!dot || !text) return;
    const level = gameState.securityLevel ?? 100;
    dot.style.background = level >= 80 ? "#4ade80" : level >= 50 ? "#f59e0b" : "#f87171";
    text.textContent = "🛡️ Segurança: " + Math.round(level) + "%";
}

async function init() {
    ensureMachineCatalog();
    await loadMachineIcons();
    ensureOverlays();
    initCanvasViewport();
    loadGameState();
    initCityState();
    createToolbarChips();
    setupEventListeners();
    initWorldMap();
    initPlanetControls();
    startGameLoop();
    showWelcomeMessage();
    updateGoldDisplay();
    updateSimulationStatusIndicator();
    refreshProductionRuntime();
    populateDock('industry');
    showTitleScreen();
}

// Toggle sidebar de máquinas (Indústria)
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
}

// ═══ PLANET MAP ENGINE ═══
window.WS_CONFIG = {
    industry: { title: 'Indústria', dock: 'machines' },
    defense: { title: 'Defesa', dock: 'defense' },
    planet: { title: 'Planeta', dock: 'planet' },
    tech: { title: 'Tecnologia', dock: 'tech' },
    city: { title: 'Cidade', dock: 'city' },
};

let currentWorkspace = 'industry';
function switchWorkspace(name) {
    if (name === currentWorkspace) return;
    // Check defense workspace unlock condition (madeira_bruta > 10)
    if (name === 'defense') {
        const madeira = gameState.globalInventory?.madeira_bruta || 0;
        if (madeira < 10) {
            showMessage('Desbloqueie a aba Defesa produzindo 10 Madeira Bruta.', 'warning');
            return;
        }
    }
    currentWorkspace = name;

    // Atualizar nav buttons
    document.querySelectorAll('.nav-btn[data-ws]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.ws === name);
    });

    // Atualizar workspaces
    document.querySelectorAll('.workspace').forEach(ws => {
        ws.classList.toggle('active', ws.id === `ws-${name}`);
    });

    // Atualizar título no top bar
    const titleEl = document.getElementById('wsTitle');
    if (titleEl) titleEl.textContent = WS_CONFIG[name]?.title || name;

    // Atualizar sidebar header com base no workspace
    const sidebarLogo = document.getElementById('sidebarLogo');
    const sidebarSubtitle = document.getElementById('sidebarSubtitle');
    const sidebar = document.getElementById('sidebar');
    if (name === 'defense') {
        if (sidebarLogo) sidebarLogo.textContent = '🛡️ Centro de Defesa';
        if (sidebarSubtitle) sidebarSubtitle.textContent = 'Manufatura Bélica';
        if (sidebar) sidebar.style.display = '';
    } else if (name === 'planet') {
        if (sidebar) sidebar.style.display = 'none';
        // Force planet container to fill screen via fixed positioning
        const pc = document.getElementById('planetContainer');
        if (pc) {
            pc.style.position = 'fixed';
            pc.style.top = '48px';
            pc.style.left = '64px';
            pc.style.right = '0';
            pc.style.bottom = '0';
            pc.style.zIndex = '10';
        }
        // Render immediately with fallback, then again after CSS transition
        setTimeout(() => { renderPlanetMap(); updatePlanetHud(); }, 0);
        setTimeout(() => { renderPlanetMap(); }, 350);
    } else if (name === 'city') {
        if (sidebarLogo) sidebarLogo.textContent = '🏙️ Cidade';
        if (sidebarSubtitle) sidebarSubtitle.textContent = 'Gestão Urbana';
        if (sidebar) sidebar.style.display = 'none';
        setTimeout(() => { initCityWorkspaceUI(); renderCityWorkspace(); }, 0);
    } else {
        if (sidebarLogo) sidebarLogo.textContent = 'Industrial Pipeline';
        if (sidebarSubtitle) sidebarSubtitle.textContent = 'Estratégia Econômica';
        if (sidebar) sidebar.style.display = '';
    }

    // Re-initialize defense canvas viewport if activating defense (it was hidden during init)
    if (name === 'defense') {
        const defenseEls = getCanvasElements('defense');
        const defenseCanvas = document.getElementById(defenseEls.container);
        const defenseStage = document.getElementById(defenseEls.stage);
        const defenseWorld = document.getElementById(defenseEls.world);
        if (defenseCanvas && defenseStage && defenseWorld) {
            const defenseZoom = getWorkspaceZoom('defense');
            defenseStage.style.width = `${uiRuntime.canvasBaseWidth * defenseZoom}px`;
            defenseStage.style.height = `${uiRuntime.canvasBaseHeight * defenseZoom}px`;
            defenseWorld.style.width = `${uiRuntime.canvasBaseWidth}px`;
            defenseWorld.style.height = `${uiRuntime.canvasBaseHeight}px`;
            defenseWorld.style.transform = `scale(${defenseZoom})`;
            // Ensure scroll position is reasonable
            if (defenseCanvas.scrollLeft === 0 && defenseCanvas.scrollTop === 0) {
                defenseCanvas.scrollLeft = Math.max(0, Math.round((uiRuntime.canvasBaseWidth * defenseZoom - defenseCanvas.clientWidth) * 0.1));
                defenseCanvas.scrollTop = Math.max(0, Math.round((uiRuntime.canvasBaseHeight * defenseZoom - defenseCanvas.clientHeight) * 0.1));
            }
        }
    }

    // Atualizar toolbar com máquinas do workspace atual
    createToolbarChips();

    // Atualizar dock
    populateDock(name);

    // Zoom buttons for industry and defense workspaces
    const zoomIn = document.getElementById('zoomInBtn');
    const zoomOut = document.getElementById('zoomOutBtn');
    const zoomLabel = document.getElementById('zoomLabel');
    const showZoom = name === 'industry' || name === 'defense';
    if (zoomIn) zoomIn.style.display = showZoom ? '' : 'none';
    if (zoomOut) zoomOut.style.display = showZoom ? '' : 'none';
    if (zoomLabel) zoomLabel.style.display = showZoom ? '' : 'none';
    if (showZoom) updateZoomLabel();

    const bottomDock = document.getElementById('bottomDock');
    const invDock = document.getElementById('inventoryDockBar');
    const hideDocks = name === 'planet' || name === 'tech';
    if (bottomDock) bottomDock.style.display = hideDocks ? 'none' : '';
    if (invDock) invDock.style.display = hideDocks ? 'none' : '';
}

function populateDock(ws) {
    const container = document.getElementById('dockChips');
    const label = document.getElementById('dockLabel');
    if (!container) return;
    container.innerHTML = '';

    if (ws === 'industry') {
        if (label) label.textContent = 'Máquinas';
        Object.entries(machineTypes).forEach(([type, def]) => {
            if (!isEraUnlocked(type)) return;
            const chip = document.createElement('div');
            chip.className = 'dock-chip';
            chip.draggable = true;
            chip.dataset.machineType = type;
            const iconHtml = getMachineIcon(type);
            chip.innerHTML = `
                <span class="dock-chip-icon" style="width:20px;height:20px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${iconHtml || `<span style="font-size:10px;font-weight:700;">${type.slice(0, 2).toUpperCase()}</span>`}</span>
                <span class="dock-chip-name">${def.name}</span>
                <span class="dock-chip-cost">💰${def.cost.toLocaleString('pt-BR')}</span>
            `;
            chip.querySelector('.dock-chip-icon svg')?.setAttribute('width', '20');
            chip.querySelector('.dock-chip-icon svg')?.setAttribute('height', '20');
            chip.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('machineType', type);
            });
            container.appendChild(chip);
        });
    } else {
        if (label) label.textContent = WS_CONFIG[ws]?.title || ws;
        const placeholder = document.createElement('span');
        placeholder.style.cssText = 'font-size:11px;color:var(--text-tertiary);';
        placeholder.textContent = 'Nenhuma estrutura disponível nesta era.';
        container.appendChild(placeholder);
    }
}

function toggleDock() {
    const dock = document.getElementById('bottomDock');
    const btn = document.getElementById('dockToggle');
    if (!dock) return;
    const collapsed = dock.classList.toggle('collapsed');
    if (btn) btn.textContent = collapsed ? '▲' : '▼';
}

// Reset view (clear saved state and reload)
function resetView() {
    if (confirm('Tem certeza? Isso vai resetar todo o progresso.')) {
        localStorage.removeItem('industrialPipeline_save');
        if (window.API && API.isLoggedIn()) {
            API.deleteSave(1).catch(() => {});
        }
        hideTitleScreen(true);
    }
}

// Iniciar o jogo
init();

// ═══ TUTORIAL SYSTEM (game-design skill: hook quickly + early wins) ═══
const TUTORIAL_STEPS = [
    { target: '.dock-chips', title: '👋 Bem-vindo!', text: 'Este é o <b>dock de máquinas</b> (barra inferior). Clique em <b>Caldeira a Carvão</b> para colocar sua primeira máquina.<br><br><span style="color:#888;font-size:11px">🖱️ <b>Navegar:</b> Scroll do mouse = zoom · Clique+arraste no fundo = mover a câmera</span>', event: 'machine_placed' },
    { target: '#canvas', title: '🔗 Conecte as máquinas', text: 'Ótimo! Agora coloque uma <b>Máquina a Vapor</b> ao lado e <b>clique na Caldeira → depois na Máquina a Vapor</b> para conectá-las.<br><br><span style="color:#888;font-size:11px">⌨️ <b>Zoom:</b> Use os botões <b>＋/－</b> no topo ou <b>Ctrl+Scroll</b></span>', event: 'connection_made' },
    { target: '#goldTopDisplay', title: '💰 Hora de vender!', text: 'Agora coloque um <b>Mercado</b> e conecte um produto final a ele. O ouro sobe automaticamente com cada venda!<br><br><span style="color:#888;font-size:11px">💡 <b>Dica:</b> Clique em qualquer máquina para ver detalhes e status</span>', event: 'first_sale' },
];

function showTutorialStep(step) {
    if (!gameState.tutorial || gameState.tutorial.done) return;
    const s = TUTORIAL_STEPS[step];
    if (!s) { completeTutorial(); return; }

    let overlay = document.getElementById('tutorial-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'tutorial-overlay';
        overlay.className = 'tutorial-overlay';
        document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
        <div class="tutorial-card">
            <div class="tutorial-step-indicator">${step + 1} / ${TUTORIAL_STEPS.length}</div>
            <div class="tutorial-title">${s.title}</div>
            <div class="tutorial-text">${s.text}</div>
            <div class="tutorial-actions">
                <button class="tutorial-skip" onclick="completeTutorial()">Pular tutorial</button>
            </div>
        </div>`;
    overlay.style.display = 'flex';
    gameState.tutorial.step = step;
}

function advanceTutorial(event) {
    if (!gameState.tutorial || gameState.tutorial.done) return;
    const current = TUTORIAL_STEPS[gameState.tutorial.step];
    if (current && current.event === event) {
        const next = gameState.tutorial.step + 1;
        if (next >= TUTORIAL_STEPS.length) { completeTutorial(); return; }
        gameState.tutorial.step = next;
        showTutorialStep(next);
    }
}

function completeTutorial() {
    gameState.tutorial.done = true;
    const overlay = document.getElementById('tutorial-overlay');
    if (overlay) overlay.style.display = 'none';
    saveGameState();
}

// ═══ EARLY WIN — Primeira venda (game-design: reward loop) ═══
function triggerFirstSale() {
    if (gameState.stats?.firstSale) return;
    gameState.stats = gameState.stats || {};
    gameState.stats.firstSale = true;
    if (window.AudioEngine) AudioEngine.play('firstsale');
    advanceTutorial('first_sale');

    const cel = document.createElement('div');
    cel.className = 'first-sale-celebration';
    cel.innerHTML = `<div class="cel-emoji">🎉</div><div class="cel-title">Primeira Venda!</div><div class="cel-sub">Seu mercado está funcionando. Continue expandindo!</div>`;
    document.body.appendChild(cel);
    setTimeout(() => cel.classList.add('visible'), 50);
    setTimeout(() => { cel.classList.remove('visible'); setTimeout(() => cel.remove(), 600); }, 3000);
}

// ═══ TITLE SCREEN ═══
function showTitleScreen() {
    const hasSave = !!localStorage.getItem('industrialPipeline_save');
    let el = document.getElementById('title-screen');
    if (!el) {
        el = document.createElement('div');
        el.id = 'title-screen';
        document.body.appendChild(el);
    }
    el.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;background:radial-gradient(ellipse at 50% 35%,#0a1f0a 0%,#030a03 100%);display:flex;align-items:center;justify-content:center;';
    el.innerHTML = `
        <div class="title-content">
            <div class="title-logo">⚙️</div>
            <div class="title-name">Industrial Pipeline</div>
            <div class="title-sub">Estratégia Econômica · Era do Vapor</div>
            <div class="title-buttons">
                ${hasSave ? '<button class="title-btn title-btn-primary" onclick="hideTitleScreen(false)">▶ Continuar</button>' : ''}
                <button class="title-btn ${hasSave ? 'title-btn-secondary' : 'title-btn-primary'}" onclick="hideTitleScreen(true)">✦ Novo Jogo</button>
            </div>
            <div class="title-extras">
                ${hasSave ? '<button class="title-link" onclick="exportSave()">⬇ Exportar save</button>' : ''}
                <button class="title-link" onclick="importSave()">⬆ Importar save</button>
            </div>
            <div class="title-version">v0.004 · beta</div>
        </div>`;
    el.style.display = 'flex';
}

function hideTitleScreen(newGame) {
    if (newGame) {
        localStorage.removeItem('industrialPipeline_save');
        // Limpar save do backend (se logado)
        if (window.API && API.isLoggedIn()) {
            API.deleteSave(1).catch(() => {});
        }
        // Reset state completo
        gameState.gold = 1500;
        gameState.machines = [];
        gameState.connections = [];
        gameState.resourceFlow = {};
        gameState.selectedMachine = null;
        gameState.connectingFrom = null;
        gameState.nextId = 1;
        gameState.era = 0;
        gameState.eraProgress = 0;
        gameState.totalProducedGlobal = {};
        gameState.globalInventory = {};
        gameState.securityLevel = 100;
        gameState.worldMap = {};
        gameState.pollutionLevel = 0;
        gameState.discoveryPoints = 100;
        gameState.city = null;
        gameState.tutorial = { done: false, step: 0 };
        gameState.stats = { playTime: 0, firstSale: false };
        initCityState();
        // Limpar canvas industry (máquinas, conexões, overlays)
        const world = document.getElementById('canvasWorld');
        if (world) {
            world.querySelectorAll('.machine-node, .machine-delete-btn, .machine-overlay, .conn-delete-btn').forEach(e => e.remove());
        }
        const svg = document.getElementById('canvasSvg');
        if (svg) { while (svg.firstChild) svg.removeChild(svg.firstChild); }
        // Limpar canvas defense
        const worldDef = document.getElementById('canvasWorldDefense');
        if (worldDef) {
            worldDef.querySelectorAll('.machine-node, .machine-delete-btn, .machine-overlay, .conn-delete-btn').forEach(e => e.remove());
        }
        const svgDef = document.getElementById('canvasSvgDefense');
        if (svgDef) { while (svgDef.firstChild) svgDef.removeChild(svgDef.firstChild); }
        closeInfoPanel();
        updateGoldDisplay();
        createToolbarChips();
        populateDock('industry');
        switchWorkspace('industry');
        setTimeout(createStarterChain, 50);
    }
    const el = document.getElementById('title-screen');
    if (el) {
        el.style.transition = 'opacity 0.5s ease';
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        setTimeout(() => el.remove(), 520);
    }
    if (!gameState.tutorial?.done) showTutorialStep(0);
}

// ═══ STARTER CHAIN ═══
function createStarterChain() {
    const canvas = document.getElementById('canvas');
    if (!canvas) return;
    const W = canvas.offsetWidth || 800;
    const H = canvas.offsetHeight || 600;
    const cx = W / 2;
    const cy = H / 2;
    const positions = [
        { type: 'lenhador',        x: cx - 240, y: cy },
        { type: 'serraria_manual', x: cx,        y: cy },
        { type: 'mercado',         x: cx + 240,  y: cy },
    ];
    const placed = [];
    for (const { type, x, y } of positions) {
        const def = machineTypes[type];
        if (!def) continue;
        const machine = {
            id: gameState.nextId++,
            type, x, y,
            tier: 0, status: "stopped",
            efficiency: 0, production: 0,
            bufferInput: {}, bufferOutput: {},
            bufferInputMax: {}, bufferOutputMax: {},
            inputFlow: {}, outputFlow: {},
            totalProduced: {}, uptime: 0, effHistory: []
        };
        if (def.workersMin > 0) machine.workersAssigned = def.workersMin;
        ensureMachineShape(machine);
        gameState.machines.push(machine);
        renderMachine(machine);
        placed.push(machine);
    }
    if (placed.length === 3) {
        [[placed[0], placed[1]], [placed[1], placed[2]]].forEach(([from, to]) => {
            const resource = machineTypes[from.type].outputs[0];
            const connection = {
                id: "conn-starter-" + from.id + "-" + to.id,
                from: from.id, to: to.id,
                resource, capacity: 10,
                fromPortSide: null, toPortSide: null
            };
            gameState.connections.push(connection);
            gameState.resourceFlow[connection.id] = 0;
            renderConnection(connection);
        });
    }
    updateGoldDisplay();
    showMessage("Cadeia inicial pronta! Lenhador → Serraria → Mercado já conectados.", "success");
}

// ═══ WORKER CONTROLS ═══
window.adjustWorkers = function adjustWorkers(machineId, delta, absolute) {
    const machine = gameState.machines.find(m => m.id === machineId);
    if (!machine) return;
    const def = machineTypes[machine.type];
    if (!def || !(def.workersMin > 0)) return;
    const maxW = def.workersMax || def.workersMin;
    const current = machine.workersAssigned || 0;
    const newVal = (absolute !== undefined && absolute !== null) ? absolute : current + delta;
    machine.workersAssigned = Math.max(0, Math.min(maxW, newVal));

    // Update UI in-place without full re-render
    const countEl = document.getElementById('workers-count-' + machineId);
    if (countEl) countEl.textContent = machine.workersAssigned;
    const slider = document.getElementById('workers-slider-' + machineId);
    if (slider) slider.value = machine.workersAssigned;
    const minusBtn = document.getElementById('workers-minus-' + machineId);
    if (minusBtn) minusBtn.disabled = machine.workersAssigned <= 0;
    const plusBtn = document.getElementById('workers-plus-' + machineId);
    if (plusBtn) plusBtn.disabled = machine.workersAssigned >= maxW;
    console.log('[Workers] machine', machineId, '→', machine.workersAssigned, '/', maxW);
};

// ═══ AUDIO TOGGLE ═══
function toggleAudio() {
    if (!window.AudioEngine) return;
    const enabled = AudioEngine.toggle();
    const btn = document.getElementById('audioToggleBtn');
    if (btn) btn.textContent = enabled ? '🔊' : '🔇';
}

// ═══ TUTORIAL HOOKS — máquina colocada e conexão feita ═══
const _origPlaceMachine = typeof placeMachine === 'function' ? placeMachine : null;
document.addEventListener('machine:placed', () => advanceTutorial('machine_placed'));
document.addEventListener('connection:made', () => advanceTutorial('connection_made'));

// ─── Backend integration helpers ───────────────────────────────────────────
// Exposed for auth.js / AuthUI to call directly

window.buildSaveData = function() {
    return {
        saveVersion: window.SAVE_VERSION || 2,
        gold: gameState.gold,
        machines: gameState.machines,
        connections: gameState.connections,
        nextId: gameState.nextId,
        era: gameState.era,
        eraProgress: gameState.eraProgress,
        totalProducedGlobal: gameState.totalProducedGlobal,
        globalInventory: gameState.globalInventory,
        securityLevel: gameState.securityLevel,
        lastSecurityTick: gameState.lastSecurityTick,
        worldMap: gameState.worldMap,
        pollutionLevel: gameState.pollutionLevel,
        discoveryPoints: gameState.discoveryPoints,
        city: gameState.city,
        tutorial: gameState.tutorial,
        stats: gameState.stats,
    };
};

window.applyLoadedState = function(data) {
    const noMachines = !data.machines || data.machines.length === 0;
    gameState.gold = noMachines ? 1500 : (data.gold ?? 1500);
    gameState.machines = (data.machines || []).map(m => { ensureMachineShape(m); return m; });
    gameState.connections = (data.connections || []).map(c => ({ ...c, capacity: c.capacity || 1 }));
    gameState.nextId = data.nextId || 1;
    if (data.era !== undefined) gameState.era = data.era;
    gameState.eraProgress = data.eraProgress ?? 0;
    gameState.totalProducedGlobal = data.totalProducedGlobal || {};
    gameState.globalInventory = data.globalInventory || {};
    gameState.securityLevel = data.securityLevel ?? 100;
    gameState.lastSecurityTick = data.lastSecurityTick || 0;
    if (data.worldMap) gameState.worldMap = data.worldMap;
    gameState.pollutionLevel = data.pollutionLevel ?? 0;
    gameState.discoveryPoints = data.discoveryPoints ?? 100;
    if (data.city) gameState.city = data.city;
    if (data.tutorial) gameState.tutorial = data.tutorial;
    if (data.stats) gameState.stats = data.stats;

    // Clear and re-render canvas (industry + defense)
    const _world = document.getElementById('canvasWorld');
    if (_world) { _world.querySelectorAll('.machine-node, .machine-delete-btn, .machine-overlay').forEach(e => e.remove()); }
    const _svg = document.getElementById('canvasSvg');
    if (_svg) { while (_svg.firstChild) _svg.removeChild(_svg.firstChild); }
    const _worldDef = document.getElementById('canvasWorldDefense');
    if (_worldDef) { _worldDef.querySelectorAll('.machine-node, .machine-delete-btn, .machine-overlay').forEach(e => e.remove()); }
    const _svgDef = document.getElementById('canvasSvgDefense');
    if (_svgDef) { while (_svgDef.firstChild) _svgDef.removeChild(_svgDef.firstChild); }
    gameState.machines.forEach(m => renderMachine(m));
    gameState.connections.forEach(c => renderConnection(c));
    updateGoldDisplay();
    updateInventoryDock();
    updateSecurityBar();
    checkEraProgression();
};
