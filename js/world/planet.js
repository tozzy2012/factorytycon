const HEX_SIZE = 28; // radius in pixels
const HEX_TERRAIN_COLORS = {
    plains:   '#111820',
    forest:   '#0a2e1f',
    mountain: '#1a1520',
    water:    '#0a1525',
    village:  '#1f0a0a'
};
const HEX_RESOURCE_GLYPHS = {
    coal: { glyph: '⬡', color: '#e2e8f0' },
    iron: { glyph: '⛏', color: '#a0845c' },
    water_source: { glyph: '💧', color: '#60a5fa' },
    copper: { glyph: '⬡', color: '#f59e0b' },
    gold: { glyph: '✦', color: '#fbbf24' },
    titanium: { glyph: '◆', color: '#a78bfa' }
};
const HEX_OWNER_LABELS = { player: 'Jogador', neutral: 'Neutro', native_tribe: 'Tribo Nativa' };

// ── Axial coordinate math (pointy-top hexagons) ──
function hexDistance(q1, r1, q2, r2) {
    return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
}
function hexNeighbors(q, r) {
    return [[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,1]].map(([dq,dr]) => [q+dq, r+dr]);
}
function hexToPixel(q, r) {
    const x = HEX_SIZE * (Math.sqrt(3) * q + Math.sqrt(3)/2 * r);
    const y = HEX_SIZE * (3/2 * r);
    return { x, y };
}
function hexCorners(cx, cy) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 180 * (60 * i - 30);
        pts.push(`${cx + HEX_SIZE * Math.cos(angle)},${cy + HEX_SIZE * Math.sin(angle)}`);
    }
    return pts.join(' ');
}
function hexRichness(d) {
    return +(1 + 0.5 * Math.sqrt(d * 2)).toFixed(2);
}

// ── Seeded RNG for deterministic generation ──
let _hexSeed = 42;
function hexRandom(q, r) {
    let h = (q * 374761393 + r * 668265263 + _hexSeed) | 0;
    h = ((h ^ (h >> 13)) * 1274126177) | 0;
    h = h ^ (h >> 16);
    return (h >>> 0) / 4294967296;
}

// ── Procedural generator ──
function generateSector(q, r) {
    const key = `${q},${r}`;
    if (gameState.worldMap[key]) return gameState.worldMap[key];

    const d = hexDistance(q, r, 0, 0);
    const cell = {
        id: key, q, r,
        type: 'plains',
        resource: null,
        richness: hexRichness(d),
        owner: 'neutral',
        aggro: 0,
        pollution: 0,
        discovered: false
    };

    // Base do jogador
    if (q === 0 && r === 0) {
        cell.type = 'plains';
        cell.owner = 'player';
        cell.discovered = true;
        gameState.worldMap[key] = cell;
        return cell;
    }

    // Spawn garantido (raio <= 1)
    if (d <= 1) {
        cell.discovered = true;
        cell.richness = 1.0;
        // Garantir 1 carvão e 1 água nos vizinhos
        const neighbors = hexNeighbors(0, 0);
        const idx = neighbors.findIndex(([nq,nr]) => nq === q && nr === r);
        if (idx === 0) { cell.type = 'mountain'; cell.resource = 'coal'; }
        else if (idx === 1) { cell.type = 'water'; cell.resource = 'water_source'; }
        else {
            const rnd = hexRandom(q, r);
            if (rnd < 0.3) { cell.type = 'forest'; }
            else if (rnd < 0.5) { cell.type = 'mountain'; cell.resource = 'iron'; }
            else { cell.type = 'plains'; }
        }
        gameState.worldMap[key] = cell;
        return cell;
    }

    // Gerador de ruído (raio > 1)
    const rnd = hexRandom(q, r);
    if (rnd < 0.20) {
        cell.type = 'mountain';
        const rr = hexRandom(q + 100, r + 100);
        if (rr < 0.5) cell.resource = 'coal';
        else if (rr < 0.85) cell.resource = 'iron';
        else if (d > 8) cell.resource = 'copper';
    } else if (rnd < 0.50) {
        cell.type = 'forest';
    } else if (rnd < 0.60) {
        cell.type = 'water';
        cell.resource = 'water_source';
    } else {
        cell.type = 'plains';
        if (hexRandom(q + 200, r + 200) < 0.15 && d > 4) {
            cell.resource = 'iron';
        }
    }

    // Riqueza rara em distância grande
    if (d > 15 && hexRandom(q + 300, r + 300) < 0.08) {
        cell.resource = d > 25 ? 'titanium' : 'gold';
        cell.richness = hexRichness(d) * 1.5;
    }

    // Tribos nativas
    if (d > 5 && cell.resource) {
        const rareResource = cell.resource === 'gold' || cell.resource === 'titanium';
        if (rareResource || hexRandom(q + 500, r + 500) < 0.7) {
            cell.owner = 'native_tribe';
            cell.type = 'village';
            cell.aggro = 10 + Math.floor(d * 2);
        }
    }
    if (d > 8 && !cell.resource && hexRandom(q + 600, r + 600) < 0.1) {
        cell.type = 'village';
        cell.owner = 'native_tribe';
        cell.aggro = 5;
    }

    gameState.worldMap[key] = cell;
    return cell;
}

// ── Initialize map (generate spawn ring) ──
function initWorldMap() {
    if (Object.keys(gameState.worldMap).length > 0) return;
    // Generate radius 0..3
    for (let q = -3; q <= 3; q++) {
        for (let r = -3; r <= 3; r++) {
            if (hexDistance(q, r, 0, 0) <= 3) {
                generateSector(q, r);
            }
        }
    }
}

// ── Planet SVG Renderer ──
let planetPan = { x: 0, y: 0 };
let planetZoom = 1;
let planetDragging = false;
let planetDragStart = { x: 0, y: 0 };

function renderPlanetMap() {
    const svg = document.getElementById('planetSvg');
    const g = document.getElementById('planetMapGroup');
    if (!svg || !g) return;

    // Use window dimensions — always reliable
    const navW = 64; // nav sidebar width
    const topH = 48; // top bar height
    const w = window.innerWidth - navW;
    const h = window.innerHeight - topH;

    const cx = w / 2;
    const cy = h / 2;

    // Determine visible range (culling) — min 8, max 20 rings
    const viewRadius = Math.min(20, Math.max(8, Math.ceil(Math.max(w, h) / (HEX_SIZE * 2 * planetZoom)) + 2));

    // Center of view in hex coords (approximate)
    const invSqrt3 = 1 / Math.sqrt(3);
    const viewCenterQ = Math.round((-planetPan.x / planetZoom) * invSqrt3 / HEX_SIZE);
    const viewCenterR = Math.round((-planetPan.y / planetZoom) * (2/3) / HEX_SIZE);

    // Generate sectors in view
    for (let dq = -viewRadius; dq <= viewRadius; dq++) {
        for (let dr = -viewRadius; dr <= viewRadius; dr++) {
            const q = viewCenterQ + dq;
            const r = viewCenterR + dr;
            if (hexDistance(q, r, viewCenterQ, viewCenterR) <= viewRadius) {
                generateSector(q, r);
            }
        }
    }

    // Force explicit pixel dimensions on the SVG — bypasses CSS layout chain issues
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = w + 'px';
    svg.style.height = h + 'px';
    svg.style.display = 'block';
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

    // Clear and redraw
    g.innerHTML = '';
    const transform = `translate(${cx + planetPan.x}, ${cy + planetPan.y}) scale(${planetZoom})`;
    g.setAttribute('transform', transform);


    // DEBUG: bright background to confirm SVG is visible
    const dbgBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    dbgBg.setAttribute('x', '0'); dbgBg.setAttribute('y', '0');
    dbgBg.setAttribute('width', String(w)); dbgBg.setAttribute('height', String(h));
    dbgBg.setAttribute('fill', '#001122'); dbgBg.setAttribute('stroke', '#ff0000'); dbgBg.setAttribute('stroke-width', '4');
    svg.insertBefore(dbgBg, svg.firstChild);
    // DEBUG: bright circle at center
    const dbgCirc = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dbgCirc.setAttribute('cx', String(cx)); dbgCirc.setAttribute('cy', String(cy));
    dbgCirc.setAttribute('r', '30'); dbgCirc.setAttribute('fill', '#ff0000');
    svg.insertBefore(dbgCirc, svg.firstChild);

    // Terrain fill colors (inline for SVG reliability)
    const TERRAIN_FILL = {
        plains: '#1a2535', forest: '#0e2818', mountain: '#251e30',
        water: '#0e1f38', village: '#2e1010'
    };

    // Render all cells
    Object.values(gameState.worldMap).forEach(cell => {
        const px = hexToPixel(cell.q, cell.r);

        // Culling check
        const screenX = (px.x * planetZoom + cx + planetPan.x);
        const screenY = (px.y * planetZoom + cy + planetPan.y);
        if (screenX < -80 || screenX > w + 80 || screenY < -80 || screenY > h + 80) return;

        if (!cell.discovered) {
            // Fog hex
            const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            poly.setAttribute('points', hexCorners(px.x, px.y));
            // Adjacent to discovered? Make discoverable
            const neighbors = hexNeighbors(cell.q, cell.r);
            const adjDiscovered = neighbors.some(([nq,nr]) => {
                const nc = gameState.worldMap[`${nq},${nr}`];
                return nc && nc.discovered;
            });
            if (adjDiscovered) {
                poly.setAttribute('fill', '#0c1a28');
                poly.setAttribute('stroke', 'rgba(34,211,238,0.35)');
                poly.setAttribute('stroke-width', '1');
                poly.setAttribute('stroke-dasharray', '4 3');
                poly.style.cursor = 'pointer';
                poly.addEventListener('click', () => discoverHex(cell.q, cell.r));
            } else {
                poly.setAttribute('fill', '#080e16');
                poly.setAttribute('stroke', 'rgba(34,211,238,0.07)');
                poly.setAttribute('stroke-width', '0.8');
            }
            g.appendChild(poly);
            return;
        }

        // Discovered hex — apply inline fill/stroke for SVG reliability
        const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        poly.setAttribute('points', hexCorners(px.x, px.y));
        const isBase = cell.q === 0 && cell.r === 0;
        poly.setAttribute('fill', isBase ? '#0d2040' : (TERRAIN_FILL[cell.type] || '#1a2535'));
        poly.setAttribute('stroke', isBase ? '#22d3ee' : 'rgba(34,211,238,0.5)');
        poly.setAttribute('stroke-width', isBase ? '2.5' : '1.2');
        poly.style.cursor = 'pointer';
        if (gameState.selectedHex === cell.id) {
            poly.setAttribute('stroke', '#22d3ee');
            poly.setAttribute('stroke-width', '2.5');
        }
        if (cell.owner === 'native_tribe' && cell.aggro > 50) {
            poly.classList.add('hex-aggro-pulse');
        }
        poly.addEventListener('click', (e) => {
            e.stopPropagation();
            selectHex(cell.q, cell.r);
        });
        g.appendChild(poly);

        // Resource icon
        if (cell.resource) {
            const info = HEX_RESOURCE_GLYPHS[cell.resource];
            if (info) {
                const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                txt.setAttribute('x', px.x);
                txt.setAttribute('y', px.y + 1);
                txt.classList.add('hex-resource-icon');
                txt.style.fill = info.color;
                txt.style.fontSize = '11px';
                txt.textContent = info.glyph;
                g.appendChild(txt);
            }
        }

        // Base marker
        if (cell.q === 0 && cell.r === 0) {
            const base = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            base.setAttribute('x', px.x);
            base.setAttribute('y', px.y + 2);
            base.classList.add('hex-resource-icon');
            base.style.fill = '#22d3ee';
            base.style.fontSize = '14px';
            base.textContent = '🏭';
            g.appendChild(base);
        }

        // Owner indicator (tribe dot)
        if (cell.owner === 'native_tribe') {
            const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dot.setAttribute('cx', px.x + HEX_SIZE * 0.55);
            dot.setAttribute('cy', px.y - HEX_SIZE * 0.4);
            dot.setAttribute('r', 3);
            dot.style.fill = cell.aggro > 80 ? '#ef4444' : '#7f1d1d';
            dot.style.pointerEvents = 'none';
            g.appendChild(dot);
        }
    });
}

// ── Discovery ──
function discoverHex(q, r) {
    const cost = 10;
    if (gameState.discoveryPoints < cost) {
        showMessage('Pontos de descoberta insuficientes!', 'error');
        return;
    }
    gameState.discoveryPoints -= cost;
    const cell = gameState.worldMap[`${q},${r}`];
    if (cell) cell.discovered = true;
    updatePlanetHud();
    renderPlanetMap();
}

// ── Hex selection & info panel ──
function selectHex(q, r) {
    const key = `${q},${r}`;
    const cell = gameState.worldMap[key];
    if (!cell || !cell.discovered) return;
    gameState.selectedHex = key;

    const panel = document.getElementById('hexInfoPanel');
    const title = document.getElementById('hexInfoTitle');
    const body = document.getElementById('hexInfoBody');
    if (!panel || !body) return;

    const terrainNames = { plains: 'Planície', forest: 'Floresta', mountain: 'Montanha', water: 'Água', village: 'Vila Nativa' };
    const resourceNames = { coal: 'Carvão', iron: 'Ferro', water_source: 'Fonte de Água', copper: 'Cobre', gold: 'Ouro', titanium: 'Titânio' };
    const ownerClass = cell.owner === 'native_tribe' ? 'danger' : cell.owner === 'player' ? 'good' : '';
    const aggroClass = cell.aggro > 80 ? 'danger' : cell.aggro > 40 ? 'rich' : '';

    title.textContent = `Setor (${q}, ${r})`;
    body.innerHTML = `
        <div class="hex-stat"><span class="hex-stat-label">Terreno</span><span class="hex-stat-value">${terrainNames[cell.type] || cell.type}</span></div>
        <div class="hex-stat"><span class="hex-stat-label">Recurso</span><span class="hex-stat-value ${cell.resource ? 'rich' : ''}">${cell.resource ? resourceNames[cell.resource] : 'Nenhum'}</span></div>
        <div class="hex-stat"><span class="hex-stat-label">Riqueza</span><span class="hex-stat-value rich">${cell.richness}x</span></div>
        <div class="hex-stat"><span class="hex-stat-label">Proprietário</span><span class="hex-stat-value ${ownerClass}">${HEX_OWNER_LABELS[cell.owner]}</span></div>
        <div class="hex-stat"><span class="hex-stat-label">Poluição</span><span class="hex-stat-value">${cell.pollution.toFixed(1)}</span></div>
        ${cell.owner === 'native_tribe' ? `<div class="hex-stat"><span class="hex-stat-label">Aggro</span><span class="hex-stat-value ${aggroClass}">${Math.round(cell.aggro)}%</span></div>` : ''}
        ${cell.type === 'forest' ? `<div style="margin-top:8px;font-size:10px;color:#34d399;">🌲 Absorve 0.5 poluição/tick</div>` : ''}
    `;
    panel.style.display = '';
    renderPlanetMap();
}

function closeHexPanel() {
    gameState.selectedHex = null;
    const panel = document.getElementById('hexInfoPanel');
    if (panel) panel.style.display = 'none';
    renderPlanetMap();
}

function updatePlanetHud() {
    const dp = document.getElementById('hudDiscoveryPts');
    const pl = document.getElementById('hudPollution');
    if (dp) dp.textContent = Math.floor(gameState.discoveryPoints);
    if (pl) pl.textContent = gameState.pollutionLevel.toFixed(1);
}

// ── Pollution propagation (called every 100 ticks) ──
function updatePollution() {
    // Emission: count polluting machines
    let emission = 0;
    gameState.machines.forEach(m => {
        if (['caldeira_carvao', 'usina_termoeletrica', 'coqueria', 'forno_cal', 'forno_sinterizacao'].includes(m.type)) {
            if (m.status === 'active' || m.status === 'partial') emission += 0.5;
        }
    });
    gameState.pollutionLevel += emission;

    // Apply emission to base hex
    const base = gameState.worldMap['0,0'];
    if (base) base.pollution += emission;

    // Diffusion: 20% leaks to neighbors
    const newPollution = {};
    Object.values(gameState.worldMap).forEach(cell => {
        if (cell.pollution <= 0.01) return;
        const leak = cell.pollution * 0.2;
        const neighbors = hexNeighbors(cell.q, cell.r);
        neighbors.forEach(([nq, nr]) => {
            const nk = `${nq},${nr}`;
            const nc = gameState.worldMap[nk];
            if (!nc) return;
            newPollution[nk] = (newPollution[nk] || 0) + leak / 6;
        });
        newPollution[cell.id] = (newPollution[cell.id] || 0) - leak;
    });

    // Apply diffusion
    Object.entries(newPollution).forEach(([key, delta]) => {
        const cell = gameState.worldMap[key];
        if (cell) cell.pollution = Math.max(0, cell.pollution + delta);
    });

    // Forest absorption
    Object.values(gameState.worldMap).forEach(cell => {
        if (cell.type === 'forest' && cell.pollution > 0) {
            cell.pollution = Math.max(0, cell.pollution - 0.5);
        }
    });

    // Aggro from pollution
    Object.values(gameState.worldMap).forEach(cell => {
        if (cell.owner !== 'native_tribe') return;
        if (cell.pollution > 50) {
            cell.aggro = Math.min(100, cell.aggro + 1);
        }
        // Security impact
        if (cell.aggro > 80) {
            gameState.securityLevel = Math.max(0, gameState.securityLevel - 0.5);
        }
    });

    updatePlanetHud();
}

// ── Planet pan/zoom setup ──
function initPlanetControls() {
    const container = document.getElementById('planetContainer');
    if (!container) return;

    container.addEventListener('mousedown', (e) => {
        if (e.target.closest('.hex-info-panel') || e.target.closest('.planet-hud')) return;
        planetDragging = true;
        planetDragStart = { x: e.clientX - planetPan.x, y: e.clientY - planetPan.y };
    });
    container.addEventListener('mousemove', (e) => {
        if (!planetDragging) return;
        planetPan.x = e.clientX - planetDragStart.x;
        planetPan.y = e.clientY - planetDragStart.y;
        renderPlanetMap();
        const hudCoords = document.getElementById('hudCoords');
        if (hudCoords) {
            const wx = (container.clientWidth/2 - planetPan.x) / planetZoom;
            const wy = (container.clientHeight/2 - planetPan.y) / planetZoom;
            const rr = Math.round(wy / (HEX_SIZE * 1.5));
            const qq = Math.round((wx / (HEX_SIZE * Math.sqrt(3))) - rr * 0.5);
            hudCoords.textContent = `Setor: (${qq}, ${rr})`;
        }
    });
    window.addEventListener('mouseup', () => { planetDragging = false; });

    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        planetZoom = Math.max(0.3, Math.min(3, planetZoom + delta));
        renderPlanetMap();
    }, { passive: false });
}

// ═══ WORKSPACE SYSTEM ═══
