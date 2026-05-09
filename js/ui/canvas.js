window.uiRuntime = {
    tooltipTimer: null,
    tooltipEl: null,
    flowLabelEl: null,
    machineIcons: {},
    loopRafId: null,
    pendingMachineType: null,
    productionOpen: false,
    productionSections: {},
    productionRows: {},
    resourceDeficitTicks: {},
    latestProductionSnapshot: null,
    canvasZoom: 0.15,
    canvasZoomDefense: 0.15,
    canvasBaseWidth: 96000,
    canvasBaseHeight: 64000,
    canvasMinZoom: 0.15,
    canvasMaxZoom: 2,
    isPanningCanvas: false,
    panStartX: 0,
    panStartY: 0,
    panStartScrollLeft: 0,
    panStartScrollTop: 0
};

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function canvasClientToWorld(clientX, clientY, canvasId = 'canvas') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const ws = canvasId === 'canvasDefense' ? 'defense' : 'industry';
    const zoom = getWorkspaceZoom(ws);
    return {
        x: (clientX - rect.left + canvas.scrollLeft) / zoom,
        y: (clientY - rect.top + canvas.scrollTop) / zoom
    };
}

function updateZoomLabel() {
    const zoomLabel = document.getElementById('zoomLabel');
    if (zoomLabel) zoomLabel.textContent = `${Math.round(getWorkspaceZoom(currentWorkspace) * 100)}%`;
}

function getWorkspaceZoom(workspace) {
    return workspace === 'defense' ? uiRuntime.canvasZoomDefense : uiRuntime.canvasZoom;
}

function setWorkspaceZoom(workspace, zoom) {
    if (workspace === 'defense') {
        uiRuntime.canvasZoomDefense = zoom;
    } else {
        uiRuntime.canvasZoom = zoom;
    }
}

function applyCanvasZoom(workspace, nextZoom, anchorClientX = null, anchorClientY = null) {
    const els = getCanvasElements(workspace);
    const canvas = document.getElementById(els.container);
    const stage = document.getElementById(els.stage);
    const world = document.getElementById(els.world);
    if (!canvas || !stage || !world) return;

    const prevZoom = getWorkspaceZoom(workspace);
    const clampedZoom = clamp(nextZoom, uiRuntime.canvasMinZoom, uiRuntime.canvasMaxZoom);
    if (Math.abs(clampedZoom - prevZoom) < 0.001) return;

    const rect = canvas.getBoundingClientRect();
    const anchorX = anchorClientX ?? (rect.left + (canvas.clientWidth / 2));
    const anchorY = anchorClientY ?? (rect.top + (canvas.clientHeight / 2));

    const worldX = (anchorX - rect.left + canvas.scrollLeft) / prevZoom;
    const worldY = (anchorY - rect.top + canvas.scrollTop) / prevZoom;

    setWorkspaceZoom(workspace, clampedZoom);
    stage.style.width = `${uiRuntime.canvasBaseWidth * clampedZoom}px`;
    stage.style.height = `${uiRuntime.canvasBaseHeight * clampedZoom}px`;
    world.style.transform = `scale(${clampedZoom})`;

    canvas.scrollLeft = (worldX * clampedZoom) - (anchorX - rect.left);
    canvas.scrollTop = (worldY * clampedZoom) - (anchorY - rect.top);

    updateZoomLabel();
    updateConnections();
}

// Helper for routing canvas elements based on workspace
function getCanvasElements(workspace) {
    if (workspace === 'defense') {
        return {
            container: 'canvasDefense',
            stage: 'canvasStageDefense',
            world: 'canvasWorldDefense',
            svg: 'canvasSvgDefense'
        };
    }
    return {
        container: 'canvas',
        stage: 'canvasStage',
        world: 'canvasWorld',
        svg: 'canvasSvg'
    };
}

function initCanvasViewport() {
    // Initialize industry canvas
    const els = getCanvasElements('industry');
    const canvas = document.getElementById(els.container);
    const stage = document.getElementById(els.stage);
    const world = document.getElementById(els.world);
    if (canvas && stage && world) {
        const initialZoom = uiRuntime.canvasZoom;
        stage.style.width = `${uiRuntime.canvasBaseWidth * initialZoom}px`;
        stage.style.height = `${uiRuntime.canvasBaseHeight * initialZoom}px`;
        world.style.width = `${uiRuntime.canvasBaseWidth}px`;
        world.style.height = `${uiRuntime.canvasBaseHeight}px`;
        world.style.transform = `scale(${initialZoom})`;
        // Start scrolled to the upper-left quarter (where machines begin)
        canvas.scrollLeft = Math.max(0, Math.round((uiRuntime.canvasBaseWidth * initialZoom - canvas.clientWidth) * 0.1));
        canvas.scrollTop  = Math.max(0, Math.round((uiRuntime.canvasBaseHeight * initialZoom - canvas.clientHeight) * 0.1));
    }

    // Initialize defense canvas if it exists
    const defenseEls = getCanvasElements('defense');
    const defenseCanvas = document.getElementById(defenseEls.container);
    const defenseStage = document.getElementById(defenseEls.stage);
    const defenseWorld = document.getElementById(defenseEls.world);
    if (defenseCanvas && defenseStage && defenseWorld) {
        const defenseZoom = uiRuntime.canvasZoomDefense;
        defenseStage.style.width = `${uiRuntime.canvasBaseWidth * defenseZoom}px`;
        defenseStage.style.height = `${uiRuntime.canvasBaseHeight * defenseZoom}px`;
        defenseWorld.style.width = `${uiRuntime.canvasBaseWidth}px`;
        defenseWorld.style.height = `${uiRuntime.canvasBaseHeight}px`;
        defenseWorld.style.transform = `scale(${defenseZoom})`;
        defenseCanvas.scrollLeft = Math.max(0, Math.round((uiRuntime.canvasBaseWidth * defenseZoom - defenseCanvas.clientWidth) * 0.1));
        defenseCanvas.scrollTop = Math.max(0, Math.round((uiRuntime.canvasBaseHeight * defenseZoom - defenseCanvas.clientHeight) * 0.1));
    }

    // Zoom buttons work for current workspace
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    if (zoomInBtn) zoomInBtn.addEventListener('click', () => {
        const zoom = getWorkspaceZoom(currentWorkspace);
        applyCanvasZoom(currentWorkspace, zoom + 0.1);
    });
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => {
        const zoom = getWorkspaceZoom(currentWorkspace);
        applyCanvasZoom(currentWorkspace, zoom - 0.1);
    });

    updateZoomLabel();
}
function calcPortY(index, total) {
    if (total <= 1) return '50%';
    return `${15 + ((index + 1) * 70 / (total + 1))}%`;
}
function getWorldPos(element) {
    if (!element) return { x: 0, y: 0 };
    // Find the closest canvas container (industry or defense)
    const worldEl = element.closest('.canvas-world');
    const containerEl = worldEl?.closest('.canvas-container');
    const canvasId = containerEl?.id;
    const ws = canvasId === 'canvasDefense' ? 'defense' : 'industry';
    const els = getCanvasElements(ws);
    const canvas = document.getElementById(els.container);
    if (!canvas) return { x: 0, y: 0 };

    const rect = element.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const zoom = getWorkspaceZoom(ws) || 1;

    return {
        x: (rect.left - canvasRect.left + canvas.scrollLeft) / zoom,
        y: (rect.top - canvasRect.top + canvas.scrollTop) / zoom
    };
}
