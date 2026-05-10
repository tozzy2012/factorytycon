function makeDraggable(node, machine) {
    let isMouseDown = false;
    let isDragging = false;
    let startX, startY, initialX, initialY;
    const DRAG_THRESHOLD = 5;

    node.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('port') || e.target.classList.contains('delete-btn')) return;

        isMouseDown = true;
        isDragging = false;
        startX = e.clientX;
        startY = e.clientY;
        initialX = machine.x;
        initialY = machine.y;
    });

    document.addEventListener('mousemove', (e) => {
        if (!isMouseDown) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (!isDragging && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;

        isDragging = true;
        node.style.zIndex = 1000;

        const machineDef = machineTypes[machine.type];
        const ws = machineDef.workspace || 'industry';
        const zoom = getWorkspaceZoom(ws);
        machine.x = initialX + (dx / zoom);
        machine.y = initialY + (dy / zoom);

        node.style.left = `${machine.x - 130}px`;
        node.style.top = `${machine.y - 60}px`;

        updateConnections();
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            node.style.zIndex = 10;
            saveGameState();
        }
        isMouseDown = false;
        isDragging = false;
    });
}

// Configurar listeners das portas (drag-to-connect estilo n8n)
function setupPortListeners(node, machine) {
    const ports = node.querySelectorAll('.port');

    ports.forEach(port => {
        port.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();

            if (port.dataset.type === 'output' || machine.type === 'hub') {
                startDragConnection(machine, port);
            }
        });
    });
}

// Iniciar drag de conexão a partir de uma porta de saída
function startDragConnection(machine, portElement) {
    // Cancel any pending machine placement — connection drag takes priority
    uiRuntime.pendingMachineType = null;
    document.querySelectorAll('.machine-chip.build-selected').forEach(el => el.classList.remove('build-selected'));

    document.querySelectorAll('#connection-preview').forEach(el => el.remove());
    gameState.connectingFrom = { machine, port: portElement };
    portElement.classList.add('connecting');

    const machineWs = machineTypes[machine.type]?.workspace || 'industry';
    const _dce = getCanvasElements(machineWs);
    const svg = document.getElementById(_dce.svg);
    const previewPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    previewPath.id = 'connection-preview';
    previewPath.classList.add('connection-line');
    previewPath.style.stroke = '#666';
    previewPath.style.strokeDasharray = '5,5';
    previewPath.style.pointerEvents = 'none';
    if (svg) svg.appendChild(previewPath);

    let lastHoveredPort = null;
    let lastHoveredNode = null;

    const onMouseMove = (e) => {
        const p1 = getWorldPos(portElement);
        p1.x += portElement.offsetWidth / 2;
        p1.y += portElement.offsetHeight / 2;

        const canvas = document.getElementById(_dce.container);
        const canvasRect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
        const ws = _dce.container === 'canvasDefense' ? 'defense' : 'industry';
        const zoom = getWorkspaceZoom(ws) || 1;
        const p2 = {
            x: (e.clientX - canvasRect.left + (canvas?.scrollLeft || 0)) / zoom,
            y: (e.clientY - canvasRect.top + (canvas?.scrollTop || 0)) / zoom
        };

        const dx = Math.abs(p2.x - p1.x) * 0.5;
        const d = `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`;
        previewPath.setAttribute('d', d);

        if (lastHoveredPort) {
            lastHoveredPort.classList.remove('drop-target', 'drop-invalid');
            lastHoveredPort = null;
        }
        if (lastHoveredNode) {
            lastHoveredNode.classList.remove('conn-drop-hover', 'conn-drop-invalid');
            lastHoveredNode = null;
        }

        const targetPort = getInputPortUnderMouse(e.clientX, e.clientY);
        if (targetPort) {
            const targetMachineId = parseInt(targetPort.dataset.machine);
            const targetMachine = gameState.machines.find(m => m.id === targetMachineId);

            if (targetMachine && targetMachine.id !== machine.id) {
                const targetNode = document.getElementById(`machine-${targetMachine.id}`);
                const connErr = validateConnection(machine, targetMachine);
                if (!connErr) {
                    targetPort.classList.add('drop-target');
                    if (targetNode) targetNode.classList.add('conn-drop-hover');
                    previewPath.style.stroke = '#2ecc71';
                } else {
                    targetPort.classList.add('drop-invalid');
                    if (targetNode) targetNode.classList.add('conn-drop-invalid');
                    previewPath.style.stroke = '#e74c3c';
                }
                lastHoveredPort = targetPort;
                lastHoveredNode = targetNode || null;
            }
        } else {
            previewPath.style.stroke = '#666';
        }
    };

    const cleanup = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('blur', onWindowBlur);
        document.removeEventListener('keydown', onKeyDown);

        if (lastHoveredPort) { lastHoveredPort.classList.remove('drop-target', 'drop-invalid'); }
        if (lastHoveredNode) { lastHoveredNode.classList.remove('conn-drop-hover', 'conn-drop-invalid'); }

        portElement.classList.remove('connecting');
        gameState.connectingFrom = null;
        if (previewPath && previewPath.parentNode) previewPath.remove();
    };

    const onMouseUp = (e) => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('blur', onWindowBlur);
        document.removeEventListener('keydown', onKeyDown);

        if (lastHoveredPort) { lastHoveredPort.classList.remove('drop-target', 'drop-invalid'); }
        if (lastHoveredNode) { lastHoveredNode.classList.remove('conn-drop-hover', 'conn-drop-invalid'); }

        try {
            const targetPort = getInputPortUnderMouse(e.clientX, e.clientY);
            if (targetPort) {
                const targetMachineId = parseInt(targetPort.dataset.machine);
                const targetMachine = gameState.machines.find(m => m.id === targetMachineId);
                // Use the resource of the specific port the user dropped on (if not wildcard)
                const hintResource = (targetPort.dataset.resource && targetPort.dataset.resource !== '*')
                    ? targetPort.dataset.resource : null;
                if (targetMachine && targetMachine.id !== machine.id) {
                    const err = validateConnection(machine, targetMachine, hintResource);
                    if (!err) {
                        const fromPortSide = portElement.dataset.side || null;
                        const toPortSide = targetPort.dataset.side || null;
                        createConnection(machine, targetMachine, hintResource, fromPortSide, toPortSide);
                    } else {
                        showMessage(err, 'error');
                    }
                }
            }
        } catch (err) {
            console.error('[CONN] ERROR:', err);
        }

        // Always clean up — no matter what happened above
        portElement.classList.remove('connecting');
        gameState.connectingFrom = null;
        if (previewPath && previewPath.parentNode) previewPath.remove();
    };

    const onWindowBlur = () => cleanup();
    const onKeyDown = (e) => {
        if (e.key === 'Escape') cleanup();
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('keydown', onKeyDown);
}



// Validar conexão — retorna null se válido, ou string de erro se inválido
// hintResource: recurso da porta específica onde o fio foi solto (opcional)
function validateConnection(fromMachine, toMachine, hintResource = null) {
    if (fromMachine.id === toMachine.id) return 'Não pode conectar a si mesma.';

    if (fromMachine.type === 'hub' && toMachine.type === 'hub') return null;

    if (fromMachine.type === 'hub' || toMachine.type === 'hub') {
        const hubMachine = fromMachine.type === 'hub' ? fromMachine : toMachine;
        const otherMachine = fromMachine.type === 'hub' ? toMachine : fromMachine;
        const otherDef = machineTypes[otherMachine.type];
        const resource = hintResource || (
            fromMachine.type === 'hub'
                ? otherDef.inputs[0]
                : otherDef.outputs[0]
        );
        if (!resource) return 'Nenhum recurso compatível disponível.';
        const filters = hubMachine.resourceFilters || [];
        if (!filters.includes(resource) && filters.length >= 2) {
            return 'O nível deste Hub só permite rotear 2 tipos de recursos.';
        }
        return null;
    }

    const fromDef = machineTypes[fromMachine.type];
    const toDef = machineTypes[toMachine.type];

    // If a specific port was targeted, validate that resource specifically
    if (hintResource) {
        if (!fromDef.outputs.includes(hintResource)) {
            const outNames = fromDef.outputs.map(r => getResourceName(r)).join(', ') || '—';
            return `${machineTypes[fromMachine.type].name} não produz ${getResourceName(hintResource)}. Produz: [${outNames}].`;
        }
        if (!toDef.inputs.includes(hintResource) && !toDef.inputs.includes('*')) {
            const inNames = toDef.inputs.map(r => getResourceName(r)).join(', ') || '—';
            return `${machineTypes[toMachine.type].name} não recebe ${getResourceName(hintResource)}. Recebe: [${inNames}].`;
        }
        const alreadyExists = gameState.connections.find(
            c => c.from === fromMachine.id && c.to === toMachine.id && c.resource === hintResource
        );
        if (alreadyExists) return `Já existe conexão de ${getResourceName(hintResource)} entre essas máquinas.`;
        return null;
    }

    const compatible = fromDef.outputs.find(r => toDef.inputs.includes(r) || toDef.inputs.includes('*'));
    if (!compatible) {
        const outNames = fromDef.outputs.map(r => getResourceName(r)).join(', ') || '—';
        const inNames = toDef.inputs.map(r => getResourceName(r)).join(', ') || '—';
        return `Incompatível: ${machineTypes[fromMachine.type].name} produz [${outNames}] mas ${machineTypes[toMachine.type].name} recebe [${inNames}].`;
    }

    const alreadyExists = gameState.connections.find(
        c => c.from === fromMachine.id && c.to === toMachine.id && c.resource === compatible
    );
    if (alreadyExists) return `Já existe conexão de ${getResourceName(compatible)} entre essas máquinas.`;

    return null; // válido
}
function renderMachine(machine) {
    ensureMachineShape(machine);
    const machineDef = machineTypes[machine.type];
    const ws = machineDef.workspace || 'industry';
    const els = getCanvasElements(ws);
    const existing = document.getElementById(`machine-${machine.id}`);
    if (existing) existing.remove();

    const node = document.createElement('div');
    const isHub = machine.type === 'hub';
    node.className = `machine-node cat-${machineDef.category}${isHub ? ' hub-square' : ''}`;
    node.id = `machine-${machine.id}`;
    node.style.left = `${machine.x - 130}px`;
    node.style.top = `${machine.y - 60}px`;

    // For Hub: 16 ports — 4 per side, pattern I/O/I/O
    const hubPorts = isHub ? (() => {
        const sides = ['top', 'right', 'bottom', 'left'];
        const types = ['input', 'output', 'input', 'output'];
        return sides.map(side => types.map((t, i) => `
            <div class="port ${t}" data-machine="${machine.id}" data-type="${t}" data-resource="*" data-side="${side}-${i}" title="${t === 'input' ? 'Entrada' : 'Saída'}"></div>
        `).join('')).join('');
    })() : '';

    const inputPorts = !isHub ? machineDef.inputs.map((resource, i) => `
        <div class="port input" data-machine="${machine.id}" data-type="input" data-resource="${resource}" style="--port-y:${calcPortY(i, machineDef.inputs.length)}" title="Entrada: ${resource === '*' ? 'Qualquer recurso' : getResourceName(resource)}"></div>
    `).join('') : '';

    const outputPorts = !isHub ? machineDef.outputs.map((resource, i) => `
        <div class="port output" data-machine="${machine.id}" data-type="output" data-resource="${resource}" style="--port-y:${calcPortY(i, machineDef.outputs.length)}" title="Saída: ${getResourceName(resource)}"></div>
    `).join('') : '';

    const inputSection = (!isHub && machineDef.inputs.length) ? `
        <div class="node-section">
            <div class="node-section-title">Entradas</div>
            ${machineDef.inputs.map(resource => `
                <div class="resource-line" id="line-in-${machine.id}-${resource}">
                    <span class="left"><span class="resource-dot" style="background:${getResourceColor(resource)}"></span><span class="name">${getResourceName(resource)}</span></span>
                    <span class="val" id="in-${machine.id}-${resource}">0</span>
                </div>
            `).join('')}
        </div>` : '';

    const outputSection = (!isHub && machineDef.outputs.length) ? `
        <div class="node-section">
            <div class="node-section-title">Saídas</div>
            ${machineDef.outputs.map(resource => `
                <div class="resource-line" id="line-out-${machine.id}-${resource}">
                    <span class="left"><span class="resource-dot" style="background:${getResourceColor(resource)}"></span><span class="name">${getResourceName(resource)}</span></span>
                    <span class="val" id="out-${machine.id}-${resource}">0</span>
                </div>
            `).join('')}
        </div>` : '';

    const hubFilterText = (machine.resourceFilters && machine.resourceFilters.length)
        ? machine.resourceFilters.map(r => getResourceName(r)).join(' · ')
        : '—';
    const hubSection = isHub ? `
        <div class="node-section" style="text-align:center;padding:8px 14px 10px;">
            <div style="font-size:11px;color:var(--text-tertiary);">Main Bus</div>
            <div class="hub-filter-badge" id="hub-filter-badge-${machine.id}">${hubFilterText}</div>
        </div>` : '';

    node.innerHTML = `
        ${hubPorts}
        ${inputPorts}
        ${outputPorts}
        <div class="machine-layout">
            <div class="node-header">
                <div class="status-badge" id="status-${machine.id}">PARADA</div>
                <div class="machine-icon">${getMachineIcon(machine.type)}</div>
                <div class="machine-name">${machineDef.name}</div>
            </div>
            <div class="node-store" id="store-${machine.id}" style="display:none;"></div>
            ${inputSection}
            ${outputSection}
            ${hubSection}
            ${isHub ? '' : `<div class="node-meters">
                <div class="node-meter-group">Eficiência<div class="meter"><div class="meter-fill" id="eff-${machine.id}"></div></div></div>
                <div class="node-meter-group">Buffer<div class="meter"><div class="meter-fill" id="buf-${machine.id}"></div></div></div>
            </div>`}
        </div>
        <button class="context-action" id="action-${machine.id}" onclick="handleMachineAction(${machine.id})">Ação</button>
        <button class="delete-btn" onclick="deleteMachine(${machine.id})">×</button>
    `;

    document.getElementById(els.world).appendChild(node);

    // Hub: delete overlay outside clip-path
    if (isHub) {
        const existing = document.getElementById(`hub-del-${machine.id}`);
        if (existing) existing.remove();
        const overlay = document.createElement('div');
        overlay.id = `hub-del-${machine.id}`;
        overlay.className = 'hub-delete-overlay';
        overlay.innerHTML = '×';
        overlay.title = 'Remover Hub';
        document.getElementById(els.world).appendChild(overlay);

        const positionOverlay = () => {
            const rect = node.getBoundingClientRect();
            const worldEl = document.getElementById(els.world);
            const worldRect = worldEl.getBoundingClientRect();
            const scale = uiRuntime.canvasScale || 1;
            overlay.style.left = `${(rect.right - worldRect.left) / scale - 8}px`;
            overlay.style.top = `${(rect.top - worldRect.top) / scale - 8}px`;
        };

        node.addEventListener('mouseenter', () => { positionOverlay(); overlay.style.display = 'flex'; });
        node.addEventListener('mouseleave', (e) => { if (e.relatedTarget !== overlay) overlay.style.display = 'none'; });
        overlay.addEventListener('mouseleave', () => { overlay.style.display = 'none'; });
        overlay.addEventListener('click', () => deleteMachine(machine.id));
    }

    makeDraggable(node, machine);
    setupPortListeners(node, machine);
    updateMachineNodeVisual(machine);
}

function getInputPortUnderMouse(x, y) {
    // First try precise hit on the port dot
    const ports = document.querySelectorAll('.port.input');
    const expand = 18;
    for (const port of ports) {
        const rect = port.getBoundingClientRect();
        if (x >= rect.left - expand && x <= rect.right + expand && y >= rect.top - expand && y <= rect.bottom + expand) {
            return port;
        }
    }
    // Fallback: accept drop anywhere on a machine node
    const nodes = document.querySelectorAll('.machine-node');
    // First try: exact port element under mouse
    const el = document.elementFromPoint(x, y);
    if (el && el.classList.contains('port') && el.classList.contains('input')) return el;

    // Fallback: find nearest input port within any machine node
    for (const node of nodes) {
        const rect = node.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
            // Find the input port closest to the mouse position
            const inputPorts = Array.from(node.querySelectorAll('.port.input'));
            if (!inputPorts.length) continue;
            let closest = null, minDist = Infinity;
            inputPorts.forEach(port => {
                const pr = port.getBoundingClientRect();
                const cx = pr.left + pr.width / 2;
                const cy = pr.top + pr.height / 2;
                const dist = Math.hypot(x - cx, y - cy);
                if (dist < minDist) { minDist = dist; closest = port; }
            });
            if (closest) return closest;
        }
    }
    return null;
}

function createConnection(fromMachine, toMachine, hintResource = null, fromPortSide = null, toPortSide = null) {
    const error = validateConnection(fromMachine, toMachine, hintResource);
    if (error) { showMessage(error, 'error'); return; }
    // Use the specific port resource if provided, otherwise auto-detect
    const resource = hintResource || getCompatibleResource(fromMachine, toMachine);
    if (!resource) { showMessage('Nenhum recurso compatível disponível.', 'error'); return; }

    const duplicated = gameState.connections.find(c => c.from === fromMachine.id && c.to === toMachine.id && c.resource === resource);
    if (duplicated) return;

    const connection = {
        id: `conn-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        from: fromMachine.id,
        to: toMachine.id,
        resource,
        capacity: getConnectionCapacity(fromMachine),
        fromPortSide: fromPortSide || null,
        toPortSide: toPortSide || null
    };

    gameState.connections.push(connection);
    gameState.resourceFlow[connection.id] = 0;

    if (toMachine.type === 'deposito') {
        ensureMachineShape(toMachine);
        toMachine.bufferInputMax[resource] = Math.max(toMachine.bufferInputMax[resource] || 0, getDepositoSlotCapacity(fromMachine));
        toMachine.bufferInput[resource] = toMachine.bufferInput[resource] || 0;
    }

    if (toMachine.type === 'hub') {
        toMachine.bufferInput[resource] = toMachine.bufferInput[resource] || 0;
        toMachine.bufferInputMax[resource] = 1;
        toMachine.bufferOutput[resource] = toMachine.bufferOutput[resource] || 0;
        toMachine.bufferOutputMax[resource] = 1;
        toMachine.resourceFilters = toMachine.resourceFilters || [];
        if (!toMachine.resourceFilters.includes(resource)) toMachine.resourceFilters.push(resource);
        updateHubFilterBadge(toMachine);
    }
    if (fromMachine.type === 'hub') {
        fromMachine.bufferOutput[resource] = fromMachine.bufferOutput[resource] || 0;
        fromMachine.bufferOutputMax[resource] = 1;
        fromMachine.bufferInput[resource] = fromMachine.bufferInput[resource] || 0;
        fromMachine.bufferInputMax[resource] = 1;
        fromMachine.resourceFilters = fromMachine.resourceFilters || [];
        if (!fromMachine.resourceFilters.includes(resource)) fromMachine.resourceFilters.push(resource);
        updateHubFilterBadge(fromMachine);
    }

    renderConnection(connection);
    saveGameState();
    showMessage('Conexão criada!', 'success');
}

function renderConnection(connection) {
    // Determine workspace from source machine
    const fromMachine = gameState.machines.find(m => m.id === connection.from);
    const ws = fromMachine ? (machineTypes[fromMachine.type].workspace || 'industry') : 'industry';
    const els = getCanvasElements(ws);
    const svg = document.getElementById(els.svg);
    if (!svg) return;

    // Invisible wide hit path (makes clicking easy)
    const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hit.id = `${connection.id}-hit`;
    hit.classList.add('connection-hit');
    svg.appendChild(hit);

    // Determine if this is a Hub-to-Hub highway
    const toMachine = gameState.machines.find(m => m.id === connection.to);
    const isHighway = fromMachine && toMachine && fromMachine.type === 'hub' && toMachine.type === 'hub';

    // Visible line
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.id = connection.id;
    path.classList.add('connection-line');
    if (isHighway) {
        path.classList.add('highway-line');
        path.style.stroke = '#4b5563';
        path.style.strokeWidth = '6';
        path.style.opacity = '0.9';
    } else {
        path.style.stroke = getResourceColor(connection.resource);
    }
    svg.appendChild(path);

    for (let i = 0; i < 3; i++) {
        const particle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        particle.classList.add('particle');
        particle.id = `${connection.id}-particle-${i}`;
        particle.style.display = 'none';
        particle.style.fill = getResourceColor(connection.resource);
        svg.appendChild(particle);
    }

    // Label com abreviação do recurso no meio da conexão
    if (connection.resource) {
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.id = `${connection.id}-label`;
        label.classList.add('conn-resource-label');
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('dominant-baseline', 'middle');
        label.textContent = shortResource(connection.resource);
        label.style.fill = getResourceColor(connection.resource);
        label.style.pointerEvents = 'none';
        svg.appendChild(label);
    }

    // Floating X delete button (lives in canvas-world, not SVG)
    const world = document.getElementById(els.world);
    const delBtn = document.createElement('div');
    delBtn.id = `del-${connection.id}`;
    delBtn.className = 'conn-delete-btn';
    delBtn.innerHTML = '✕';
    delBtn.title = 'Apagar conexão';
    world.appendChild(delBtn);

    updateConnectionPath(connection);
    updateConnectionVisual(connection);

    // Show/hide X button and highlight line on hit hover
    hit.addEventListener('mouseenter', () => {
        delBtn.style.display = 'flex';
        path.style.strokeWidth = '4';
        path.style.opacity = '1';
        path.style.filter = `drop-shadow(0 0 8px ${getResourceColor(connection.resource)})`;
    });
    hit.addEventListener('mousemove', (e) => {
        showConnectionLabel(connection, e.clientX, e.clientY);
        // Position delete button at midpoint of the path in world coords
        try {
            const totalLen = path.getTotalLength();
            const mid = path.getPointAtLength(totalLen / 2);
            delBtn.style.left = `${mid.x}px`;
            delBtn.style.top = `${mid.y}px`;
        } catch(_) {}
    });
    hit.addEventListener('mouseleave', (e) => {
        // Keep button if mouse moves to it
        if (e.relatedTarget === delBtn) return;
        delBtn.style.display = 'none';
        updateConnectionVisual(connection);
        if (uiRuntime.flowLabelEl) uiRuntime.flowLabelEl.style.display = 'none';
    });
    hit.addEventListener('click', () => deleteConnection(connection.id));

    delBtn.addEventListener('mouseenter', () => { delBtn.style.display = 'flex'; });
    delBtn.addEventListener('mouseleave', () => {
        delBtn.style.display = 'none';
        updateConnectionVisual(connection);
    });
    delBtn.addEventListener('click', () => deleteConnection(connection.id));
}

function showConnectionLabel(connection, clientX, clientY) {
    if (!uiRuntime.flowLabelEl) return;
    const flow = gameState.resourceFlow[connection.id] || 0;
    const pct = connection.capacity > 0 ? Math.round((flow / connection.capacity) * 100) : 0;
    uiRuntime.flowLabelEl.innerHTML = `${getResourceName(connection.resource)} — ${formatRatePerHour(flow, connection.resource)} / ${formatRatePerHour(connection.capacity, connection.resource)} (${pct}%)`;
    uiRuntime.flowLabelEl.style.left = `${clientX + 12}px`;
    uiRuntime.flowLabelEl.style.top = `${clientY + 12}px`;
    uiRuntime.flowLabelEl.style.display = 'block';
    uiRuntime.flowLabelEl.style.borderColor = getResourceColor(connection.resource);
}

function updateHubFilterBadge(hub) {
    const badge = document.getElementById(`hub-filter-badge-${hub.id}`);
    if (!badge) return;
    const filters = hub.resourceFilters || [];
    badge.textContent = filters.length ? filters.map(r => getResourceName(r)).join(' · ') : '—';
}

function pruneHubFilters(hub) {
    if (!hub || hub.type !== 'hub') return;
    hub.resourceFilters = (hub.resourceFilters || []).filter(resource => {
        const hasConn = gameState.connections.some(
            c => (c.from === hub.id || c.to === hub.id) && c.resource === resource
        );
        return hasConn;
    });
    updateHubFilterBadge(hub);
}

function deleteConnection(connectionId) {
    const conn = gameState.connections.find(c => c.id === connectionId);
    const fromMachine = conn ? gameState.machines.find(m => m.id === conn.from) : null;
    const toMachine = conn ? gameState.machines.find(m => m.id === conn.to) : null;

    gameState.connections = gameState.connections.filter(c => c.id !== connectionId);
    delete gameState.resourceFlow[connectionId];
    // Remove SVG elements
    [connectionId, `${connectionId}-hit`, `${connectionId}-particle-0`,
     `${connectionId}-particle-1`, `${connectionId}-particle-2`,
     `${connectionId}-label`].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });
    // Remove delete button
    const btn = document.getElementById(`del-${connectionId}`);
    if (btn) btn.remove();
    // Prune hub filters after removal
    if (fromMachine && fromMachine.type === 'hub') pruneHubFilters(fromMachine);
    if (toMachine && toMachine.type === 'hub') pruneHubFilters(toMachine);
    saveGameState();
}

function updateConnectionPath(connection) {
    const path = document.getElementById(connection.id);
    const fromMachine = gameState.machines.find(m => m.id === connection.from);
    const toMachine = gameState.machines.find(m => m.id === connection.to);
    if (!path || !fromMachine || !toMachine) return;

    const fromNode = document.getElementById(`machine-${fromMachine.id}`);
    const toNode = document.getElementById(`machine-${toMachine.id}`);
    if (!fromNode || !toNode) return;

    const fromPort = (connection.fromPortSide
        ? fromNode.querySelector(`.port[data-side="${connection.fromPortSide}"]`)
        : null)
        || fromNode.querySelector(`.port.output[data-resource="${connection.resource}"]`)
        || fromNode.querySelector('.port.output');
    const toPort = (connection.toPortSide
        ? toNode.querySelector(`.port[data-side="${connection.toPortSide}"]`)
        : null)
        || toNode.querySelector(`.port.input[data-resource="${connection.resource}"]`)
        || toNode.querySelector('.port.input');
    if (!fromPort || !toPort) return;

    const p1 = getWorldPos(fromPort);
    const p2 = getWorldPos(toPort);
    p1.x += fromPort.offsetWidth / 2;
    p1.y += fromPort.offsetHeight / 2;
    p2.x += toPort.offsetWidth / 2;
    p2.y += toPort.offsetHeight / 2;

    const dx = Math.abs(p2.x - p1.x) * 0.5;
    const d = `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`;
    path.setAttribute('d', d);
    const hit = document.getElementById(`${connection.id}-hit`);
    if (hit) hit.setAttribute('d', d);

    // Reposicionar label no ponto médio da curva de Bézier
    const label = document.getElementById(`${connection.id}-label`);
    if (label) {
        const mx = p1.x * 0.125 + (p1.x + dx) * 0.375 + (p2.x - dx) * 0.375 + p2.x * 0.125;
        const my = p1.y * 0.125 + p1.y * 0.375 + p2.y * 0.375 + p2.y * 0.125;
        label.setAttribute('x', mx);
        label.setAttribute('y', my);
    }
}

function getConnectionFlowRatio(connection) {
    const flow = gameState.resourceFlow[connection.id] || 0;
    // Hub connections and flow resources (vapor, energia_mecanica, etc.) are binary:
    // any flow = full visual. Hub check uses fromMachine type (not stored capacity,
    // which may be stale from an older save before capacity=9999 was set).
    const fromMachine = gameState.machines.find(m => m.id === connection.from);
    const fromIsHub = fromMachine && fromMachine.type === 'hub';
    if (fromIsHub || connection.capacity >= 9999 || FLOW_RESOURCES.has(connection.resource)) {
        return flow > 0 ? 1 : 0;
    }
    return connection.capacity > 0 ? Math.min(1, flow / connection.capacity) : 0;
}

function updateConnectionVisual(connection) {
    const path = document.getElementById(connection.id);
    if (!path) return;
    // Highways keep their fixed style
    if (path.classList.contains('highway-line')) {
        path.style.stroke = '#4b5563';
        path.style.strokeWidth = '6';
        path.style.opacity = '0.9';
        path.classList.remove('flow-warning', 'flow-critical');
        return;
    }
    const ratio = getConnectionFlowRatio(connection);
    const fromMachine = gameState.machines.find(m => m.id === connection.from);
    const fromIsHub = fromMachine && fromMachine.type === 'hub';
    const opacity = ratio === 0 ? 0.3 : ratio <= 0.4 ? 0.5 : ratio <= 0.8 ? 0.8 : 1;
    const width = ratio === 0 ? 1 : ratio <= 0.4 ? 1.5 : ratio <= 0.8 ? 2.5 : ratio < 1 ? 3.5 : 4;
    path.style.opacity = opacity;
    path.style.strokeWidth = width;
    // Hub outputs: never show flow-critical (capacity 9999 is artificial, not a real bottleneck)
    path.classList.toggle('flow-warning', !fromIsHub && ratio >= 0.9 && ratio < 1);
    path.classList.toggle('flow-critical', !fromIsHub && ratio >= 1);
    if (ratio > 0) {
        // For '*' wildcard connections, use hub's primary resource color
        const displayResource = (connection.resource === '*' && fromMachine)
            ? ((fromMachine.resourceFilters || [])[0] || connection.resource)
            : connection.resource;
        path.style.stroke = getResourceColor(displayResource);
    }
}

function updateMachineNodeVisual(machine, forceMetrics = false) {
    const node = document.getElementById(`machine-${machine.id}`);
    if (!node) return;
    const def = machineTypes[machine.type];
    const shouldRefreshMetrics = forceMetrics || (TICK.tickCount % TICK.PANEL_EVERY_TICKS === 0);

    if (machine.statusCandidate !== machine.status) {
        machine.statusCandidate = machine.status;
        machine.statusStableTicks = 1;
    } else {
        machine.statusStableTicks = (machine.statusStableTicks || 0) + 1;
    }

    if (machine.visualStatus !== machine.status && machine.statusStableTicks >= 3) {
        machine.visualStatus = machine.status;
    }

    const statusForNode = machine.visualStatus || machine.status;

    node.classList.remove('active', 'stopped', 'bottleneck', 'partial', 'idle', 'sem_mao_de_obra');
    node.classList.add(statusForNode);

    const statusMap = {
        active: 'ATIVA',
        partial: 'PARCIAL',
        stopped: 'PARADA',
        bottleneck: 'GARGALO',
        idle: 'OCIOSA',
        sem_mao_de_obra: 'S/ PESSOAL'
    };

    const statusEl = document.getElementById(`status-${machine.id}`);
    if (statusEl) {
        statusEl.textContent = statusMap[statusForNode] || 'PARADA';
        statusEl.className = `status-badge ${statusForNode}`;
    }

    const eff = Math.max(0, Math.min(1, machine.efficiency || 0));
    const effFill = document.getElementById(`eff-${machine.id}`);
    if (effFill && shouldRefreshMetrics) {
        effFill.style.width = `${Math.round(eff * 100)}%`;
        effFill.className = `meter-fill ${eff >= 0.8 ? 'good' : eff >= 0.4 ? 'partial' : 'low'}`;
    }

    const isDeposito = machine.type === 'deposito';
    const isHub = machine.type === 'hub';

    if (isHub && shouldRefreshMetrics) {
        updateHubFilterBadge(machine);
        return;
    }

    // For deposito: show globalInventory totals. For machines with flow-only outputs: show input buffer.
    const allOutputsFlow = !isDeposito && def.outputs.length > 0 && def.outputs.every(r => FLOW_RESOURCES.has(r));
    let totalOut, totalOutMax;
    if (isDeposito) {
        // Depósito funnels into globalInventory — show that instead of transient bufferInput
        totalOut = Object.values(gameState.globalInventory || {}).reduce((a, v) => a + v, 0);
        totalOutMax = Math.max(1, Object.keys(machine.bufferInputMax).reduce((a, r) => a + (machine.bufferInputMax[r] || 0), 0));
    } else if (allOutputsFlow) {
        // Machines like Caldeira: output is vapor (flow) — show input buffer instead
        totalOut = def.inputs.reduce((acc, r) => acc + (machine.bufferInput[r] || 0), 0);
        totalOutMax = Math.max(1, def.inputs.reduce((acc, r) => acc + (machine.bufferInputMax[r] || 0), 0));
    } else {
        totalOut = def.outputs.reduce((acc, r) => acc + (machine.bufferOutput[r] || 0), 0);
        totalOutMax = Math.max(1, def.outputs.reduce((acc, r) => acc + (machine.bufferOutputMax[r] || 0), 0));
    }
    const bufferRatio = totalOut / totalOutMax;
    const bufFill = document.getElementById(`buf-${machine.id}`);
    if (bufFill && shouldRefreshMetrics) {
        bufFill.style.width = `${Math.min(100, Math.round(bufferRatio * 100))}%`;
        bufFill.className = `meter-fill ${bufferRatio >= 1 ? 'buffer-full' : bufferRatio >= 0.8 ? 'buffer-warn' : 'good'}`;
    }

    const storeEl = document.getElementById(`store-${machine.id}`);
    if (storeEl && shouldRefreshMetrics) {
        if (isDeposito) {
            storeEl.style.display = 'block';
            const stocked = Object.keys(machine.bufferInput)
                .map(resource => ({ resource, qty: machine.bufferInput[resource] || 0, cap: machine.bufferInputMax[resource] || 0 }))
                .filter(item => item.qty > 0)
                .sort((a, b) => b.qty - a.qty);
            const main = stocked[0] || null;
            if (main) {
                const pct = main.cap > 0 ? Math.round((main.qty / main.cap) * 100) : 0;
                storeEl.textContent = `${getResourceName(main.resource)}: ${formatStoredAmount(main.qty, main.resource)} (${pct}%)`;
            } else {
                storeEl.textContent = `Estoque vazio (0%)`;
            }
        } else {
            storeEl.style.display = 'none';
        }
    }

    def.inputs.forEach(resource => {
        const el = document.getElementById(`in-${machine.id}-${resource}`);
        const line = document.getElementById(`line-in-${machine.id}-${resource}`);
        const current = machine.inputFlow[resource] || 0;
        const previous = machine.displayInputFlow[resource] || 0;
        const smoothed = previous + (current - previous) * 0.25;
        machine.displayInputFlow[resource] = Math.abs(smoothed) < 0.0001 ? 0 : smoothed;
        const display = machine.displayInputFlow[resource];
        const expected = (getTierDef(machine).productionRate || 0) * (def.inputRatios[resource] || 1);
        if (isDeposito) {
            if (line) line.style.display = 'none';
            return;
        }
        if (el && shouldRefreshMetrics) el.textContent = formatRatePerHour(display, resource);
        if (line && shouldRefreshMetrics) {
            line.classList.remove('warn', 'partial', 'good');
            if (expected <= 0 || display >= expected * 0.8) line.classList.add('good');
            else if (display > 0.02) line.classList.add('partial');
            else line.classList.add('warn');
        }
    });

    if (isDeposito) {
        const stocked = Object.keys(machine.bufferInput)
            .map(resource => ({ resource, qty: machine.bufferInput[resource] || 0, cap: machine.bufferInputMax[resource] || 0 }))
            .filter(item => item.qty > 0)
            .sort((a, b) => b.qty - a.qty);
        const main = stocked[0] || null;
        if (main) {
            const line = document.getElementById(`line-in-${machine.id}-${main.resource}`);
            const valueEl = document.getElementById(`in-${machine.id}-${main.resource}`);
            if (line) {
                line.style.display = 'flex';
                line.classList.remove('warn', 'partial', 'good');
                line.classList.add('good');
            }
            if (valueEl && shouldRefreshMetrics) {
                const pct = main.cap > 0 ? Math.round((main.qty / main.cap) * 100) : 0;
                valueEl.textContent = `${formatStoredAmount(main.qty, main.resource)} (${pct}%)`;
            }
        }
    }

    def.outputs.forEach(resource => {
        const el = document.getElementById(`out-${machine.id}-${resource}`);
        const line = document.getElementById(`line-out-${machine.id}-${resource}`);
        const current = machine.outputFlow[resource] || 0;
        const previous = machine.displayOutputFlow[resource] || 0;
        const smoothed = previous + (current - previous) * 0.25;
        machine.displayOutputFlow[resource] = Math.abs(smoothed) < 0.0001 ? 0 : smoothed;
        const display = machine.displayOutputFlow[resource];
        if (el && shouldRefreshMetrics) el.textContent = formatRatePerHour(display, resource);
        if (line && shouldRefreshMetrics) {
            line.classList.remove('warn', 'partial', 'good');
            if ((machine.bufferOutput[resource] || 0) >= (machine.bufferOutputMax[resource] || 1)) line.classList.add('warn');
            else if (display > 0.02) line.classList.add('good');
            else line.classList.add('partial');
        }
    });

    const actionBtn = document.getElementById(`action-${machine.id}`);
    if (actionBtn) {
        if (machine.status === 'bottleneck') actionBtn.textContent = 'Descartar excesso';
        else actionBtn.textContent = 'Conectar';
    }
}

function updateConnections() {
    gameState.connections.forEach(updateConnectionPath);
}

