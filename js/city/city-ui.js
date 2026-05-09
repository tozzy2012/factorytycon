// ═══ CITY UI — Workspace de Cidade ═══

function renderCityWorkspace() {
    const city = gameState.city;
    if (!city) return;

    // Atualiza stats no painel
    const el = id => document.getElementById(id);
    if (el('city-moradores')) el('city-moradores').textContent = Math.floor(city.moradores);
    if (el('city-moradores-max')) el('city-moradores-max').textContent = city.moradoresMax;
    if (el('city-workers-free')) el('city-workers-free').textContent = city.trabalhadores.livres;
    if (el('city-workers-total')) el('city-workers-total').textContent = city.trabalhadores.total;
    if (el('city-felicidade')) {
        el('city-felicidade').textContent = Math.round(city.felicidade) + '%';
        el('city-felicidade').style.color = city.felicidade > 70 ? '#4ade80' : city.felicidade > 40 ? '#facc15' : '#f87171';
    }
    if (el('city-graos')) el('city-graos').textContent = Math.floor(city.comida.graos || 0);
    if (el('city-carne')) el('city-carne').textContent = Math.floor(city.comida.carne || 0);
    if (el('city-pesquisa')) el('city-pesquisa').textContent = Math.floor(city.pesquisaPoints || 0);

    // Barra de felicidade
    const bar = document.getElementById('city-happiness-bar-fill');
    if (bar) {
        bar.style.width = city.felicidade + '%';
        bar.style.background = city.felicidade > 70 ? '#4ade80' : city.felicidade > 40 ? '#facc15' : '#f87171';
    }

    // Grid de edifícios
    renderCityGrid();
}

function renderCityGrid() {
    const grid = document.getElementById('city-building-grid');
    if (!grid || !gameState.city) return;
    grid.innerHTML = '';

    gameState.city.buildings.forEach(b => {
        const def = cityBuildings[b.type];
        if (!def) return;
        const card = document.createElement('div');
        card.className = 'city-building-card';
        card.innerHTML = `
            <div class="city-building-icon">${def.icon}</div>
            <div class="city-building-name">${def.name}</div>
            <div class="city-building-detail">${def.capacity ? `👥 ${def.capacity}` : def.workers ? `⚒️ ${def.workers} trab.` : ''}</div>
            ${!def.unique ? `<button class="city-demolish-btn" onclick="demolishCityBuilding('${b.id}')" title="Demolir">✕</button>` : ''}
        `;
        grid.appendChild(card);
    });

    // Slots vazios (até 12 edifícios visíveis)
    const empty = Math.max(0, 12 - gameState.city.buildings.length);
    for (let i = 0; i < Math.min(empty, 4); i++) {
        const slot = document.createElement('div');
        slot.className = 'city-building-card city-building-empty';
        slot.innerHTML = `<div class="city-building-icon" style="opacity:0.3">＋</div><div class="city-building-name" style="opacity:0.3">Lote vazio</div>`;
        grid.appendChild(slot);
    }
}

function renderCityBuildMenu() {
    const menu = document.getElementById('city-build-menu');
    if (!menu) return;
    menu.innerHTML = '';
    Object.entries(cityBuildings).forEach(([type, def]) => {
        if (def.unique) return;
        const locked = (def.era || 0) > gameState.era;
        const btn = document.createElement('button');
        btn.className = 'city-build-btn' + (locked ? ' locked' : '');
        const costStr = Object.entries(def.buildCost || {}).map(([r, q]) => `${q} ${getResourceName(r)}`).join(', ') || 'Grátis';
        btn.innerHTML = `<span class="city-build-icon">${def.icon}</span><span class="city-build-label">${def.name}</span><span class="city-build-cost">${costStr}</span>`;
        if (!locked) btn.onclick = () => buildCityBuilding(type);
        menu.appendChild(btn);
    });
}

function initCityWorkspaceUI() {
    const ws = document.getElementById('ws-city');
    if (!ws || ws.dataset.cityInit) return;
    ws.dataset.cityInit = '1';

    ws.innerHTML = `
    <div class="city-layout">
        <div class="city-stats-panel">
            <div class="city-panel-title">🏙️ Cidade</div>

            <div class="city-stat-row">
                <span class="city-stat-label">👥 Moradores</span>
                <span class="city-stat-value"><span id="city-moradores">0</span> / <span id="city-moradores-max">0</span></span>
            </div>
            <div class="city-stat-row">
                <span class="city-stat-label">⚒️ Trabalhadores livres</span>
                <span class="city-stat-value"><span id="city-workers-free">0</span> / <span id="city-workers-total">0</span></span>
            </div>
            <div class="city-stat-row">
                <span class="city-stat-label">😊 Felicidade</span>
                <span class="city-stat-value" id="city-felicidade">0%</span>
            </div>
            <div class="city-happiness-bar">
                <div class="city-happiness-bar-fill" id="city-happiness-bar-fill"></div>
            </div>

            <div class="city-section-title">🍞 Alimentação</div>
            <div class="city-stat-row">
                <span class="city-stat-label">🌾 Grãos</span>
                <span class="city-stat-value" id="city-graos">0</span>
            </div>
            <div class="city-stat-row">
                <span class="city-stat-label">🥩 Carne</span>
                <span class="city-stat-value" id="city-carne">0</span>
            </div>

            <div class="city-section-title">🔬 Pesquisa</div>
            <div class="city-stat-row">
                <span class="city-stat-label">⚗️ Pontos</span>
                <span class="city-stat-value" id="city-pesquisa">0</span>
            </div>

            <div class="city-section-title">🏗️ Construir</div>
            <div id="city-build-menu" class="city-build-menu"></div>

            <div class="city-section-title" style="margin-top:12px">📋 Políticas</div>
            <div class="city-policy-row">
                <label>Imposto <span id="city-tax-label">0%</span></label>
                <input type="range" min="0" max="30" value="0" id="city-tax-slider" oninput="setCityTax(this.value)">
            </div>
        </div>

        <div class="city-main-area">
            <div class="city-grid-header">
                <span>Edifícios da Cidade</span>
                <span style="font-size:11px;color:var(--text-tertiary)">Use os recursos do Armazém para construir</span>
            </div>
            <div id="city-building-grid" class="city-building-grid"></div>

            <div class="city-integration-banner">
                <div class="city-int-item">
                    <span class="city-int-icon">🏭</span>
                    <span class="city-int-label">Indústria abastece madeira e aço</span>
                </div>
                <div class="city-int-item">
                    <span class="city-int-icon">⚒️</span>
                    <span class="city-int-label">Moradores fornecem trabalhadores</span>
                </div>
                <div class="city-int-item">
                    <span class="city-int-icon">🛡️</span>
                    <span class="city-int-label">Defesa recruta da população</span>
                </div>
            </div>
        </div>
    </div>`;

    renderCityBuildMenu();
    renderCityWorkspace();
}

function setCityTax(value) {
    if (!gameState.city) return;
    gameState.city.policies.taxRate = parseInt(value);
    const lbl = document.getElementById('city-tax-label');
    if (lbl) lbl.textContent = value + '%';
}
