// ═══ CITY UI v2 — Visual redesign (2d-games + game-design skills) ═══

function renderCityWorkspace() {
    const city = gameState.city;
    if (!city) return;

    // Top bar chips
    _cityEl('city-pop').textContent = Math.floor(city.moradores) + ' / ' + city.moradoresMax;
    _cityEl('city-workers-v').textContent = city.trabalhadores.livres + ' livres';
    _cityEl('city-graos-v').textContent = Math.floor(city.comida.graos || 0);
    _cityEl('city-carne-v').textContent = Math.floor(city.comida.carne || 0);
    _cityEl('city-happy-v').textContent = Math.round(city.felicidade) + '%';
    _cityEl('city-pesq-v').textContent = Math.floor(city.pesquisaPoints || 0) + ' pts';

    // Happiness mini bar
    const fill = document.getElementById('city-happy-fill');
    if (fill) {
        fill.style.width = city.felicidade + '%';
        fill.style.background = city.felicidade > 70 ? '#4ade80' : city.felicidade > 40 ? '#facc15' : '#f87171';
    }

    // Chips color coding
    const popChip = document.getElementById('city-pop-chip');
    if (popChip) {
        popChip.className = 'city-stat-chip' + (city.moradores >= city.moradoresMax ? ' warning' : '');
    }
    const foodChip = document.getElementById('city-food-chip');
    if (foodChip) {
        const hasFood = (city.comida.graos || 0) + (city.comida.carne || 0) > 0;
        foodChip.className = 'city-stat-chip' + (!hasFood ? ' danger' : '');
    }

    // Starvation warning
    const warn = document.getElementById('city-starvation-warn');
    if (warn) warn.classList.toggle('visible', city.starvationTimer > 10);

    // Tax label
    const taxLbl = document.getElementById('city-tax-val');
    if (taxLbl) taxLbl.textContent = (city.policies?.taxRate || 0) + '%';

    // Industry workers
    const indW = getTotalIndustryWorkers();
    _cityEl('city-indworkers-v').textContent = indW.assigned + ' alocados';
    const indChip = document.getElementById('city-indworkers-chip');
    if (indChip) indChip.className = 'city-stat-chip' + (city.trabalhadores.livres < 0 ? ' danger' : '');

    // Migration log
    const logEl = document.getElementById('city-migration-log');
    if (logEl && city.migrationLog && city.migrationLog.length) {
        const recent = city.migrationLog.slice(-5).reverse();
        logEl.innerHTML = recent.map(e => {
            const icon = e.count > 0 ? '🟢' : '🔴';
            const sign = e.count > 0 ? '+' : '';
            const ago = Math.round((Date.now() - e.time) / 1000);
            const agoStr = ago < 60 ? ago + 's' : Math.round(ago/60) + 'min';
            return '<div class="city-mig-entry">' + icon + ' <b>' + sign + e.count + '</b> — ' + e.reason + ' <span class="city-mig-time">' + agoStr + ' atrás</span></div>';
        }).join('');
    }

    // Buildings grid
    _renderCityGrid();
}

function _cityEl(id) {
    const el = document.getElementById(id);
    return el || { textContent: '' };
}

function _renderCityGrid() {
    const grid = document.getElementById('city-grid');
    if (!grid || !gameState.city) return;
    grid.innerHTML = '';

    gameState.city.buildings.forEach(b => {
        const def = cityBuildings[b.type];
        if (!def) return;
        const card = document.createElement('div');
        card.className = 'city-bcard';

        let detail = '';
        if (def.capacity) detail = `👥 ${def.capacity} moradores`;
        else if (def.workers) detail = `⚒️ ${def.workers} trabalhadores`;
        else if (def.storageBonus) detail = `📦 +${def.storageBonus} storage`;

        let badge = '';
        if (def.output) badge = `<div class="city-bcard-badge">+${def.outputRate}/h</div>`;

        card.innerHTML = `
            ${!def.unique ? `<button class="city-bcard-demolish" onclick="demolishCityBuilding('${b.id}')" title="Demolir">✕</button>` : ''}
            ${badge}
            <div class="city-bcard-icon">${def.icon}</div>
            <div class="city-bcard-name">${def.name}</div>
            <div class="city-bcard-detail">${detail}</div>`;
        grid.appendChild(card);
    });

    // Empty slots
    const empty = Math.max(0, 12 - gameState.city.buildings.length);
    for (let i = 0; i < Math.min(empty, 6); i++) {
        const slot = document.createElement('div');
        slot.className = 'city-bcard city-bcard-empty';
        slot.innerHTML = '<div class="city-bcard-icon">＋</div><div class="city-bcard-name">Lote vazio</div>';
        grid.appendChild(slot);
    }
}

function _renderBuildPanel() {
    const list = document.getElementById('city-build-list');
    if (!list) return;
    list.innerHTML = '';

    Object.entries(cityBuildings).forEach(([type, def]) => {
        if (def.unique) return;
        const locked = (def.era || 0) > gameState.era;
        const btn = document.createElement('button');
        btn.className = 'city-build-card' + (locked ? ' locked' : '');

        const costEntries = Object.entries(def.buildCost || {});
        const costStr = costEntries.length
            ? costEntries.map(([r, q]) => `${q} ${getResourceName(r)}`).join(' · ')
            : 'Grátis';
        const isFree = costEntries.length === 0;

        btn.innerHTML = `
            <div class="city-build-card-icon">${def.icon}</div>
            <div class="city-build-card-info">
                <div class="city-build-card-name">${def.name}</div>
                <div class="city-build-card-desc">${def.description}</div>
                <div class="city-build-card-cost ${isFree ? 'free' : ''}">🪵 ${locked ? '🔒 Era ' + def.era : costStr}</div>
            </div>`;
        if (!locked) btn.onclick = () => buildCityBuilding(type);
        list.appendChild(btn);
    });
}

function initCityWorkspaceUI() {
    const ws = document.getElementById('ws-city');
    if (!ws || ws.dataset.cityInit) return;
    ws.dataset.cityInit = '1';

    ws.innerHTML = `
    <div class="city-layout">

        <!-- TOP STATS BAR -->
        <div class="city-topbar">
            <span style="font-size:13px;font-weight:700;color:#fff;margin-right:8px;">🏙️ Cidade</span>

            <div class="city-stat-chip" id="city-pop-chip">
                <span class="city-stat-chip-icon">👥</span>
                <span class="city-stat-chip-label">Pop.</span>
                <span class="city-stat-chip-value" id="city-pop">0/0</span>
            </div>

            <div class="city-stat-chip">
                <span class="city-stat-chip-icon">⚒️</span>
                <span class="city-stat-chip-label">Trab.</span>
                <span class="city-stat-chip-value" id="city-workers-v">0</span>
            </div>

            <div class="city-stat-chip">
                <span class="city-stat-chip-icon">😊</span>
                <span class="city-stat-chip-label">Felicidade</span>
                <span class="city-stat-chip-value" id="city-happy-v">0%</span>
                <div class="city-happiness-mini">
                    <div class="city-happiness-mini-fill" id="city-happy-fill" style="width:0%"></div>
                </div>
            </div>

            <div class="city-stat-chip" id="city-food-chip">
                <span class="city-stat-chip-icon">🌾</span>
                <span class="city-stat-chip-label">Grãos</span>
                <span class="city-stat-chip-value" id="city-graos-v">0</span>
            </div>

            <div class="city-stat-chip">
                <span class="city-stat-chip-icon">🥩</span>
                <span class="city-stat-chip-label">Carne</span>
                <span class="city-stat-chip-value" id="city-carne-v">0</span>
            </div>

            <div class="city-stat-chip">
                <span class="city-stat-chip-icon">⚗️</span>
                <span class="city-stat-chip-label">Pesquisa</span>
                <span class="city-stat-chip-value" id="city-pesq-v">0 pts</span>
            </div>

            <div class="city-stat-chip" id="city-indworkers-chip">
                <span class="city-stat-chip-icon">🏭</span>
                <span class="city-stat-chip-label">Ind.</span>
                <span class="city-stat-chip-value" id="city-indworkers-v">0</span>
            </div>
        </div>

        <!-- BODY -->
        <div class="city-body">

            <!-- LEFT: BUILD PANEL -->
            <div class="city-build-panel">
                <div class="city-build-panel-header">🏗️ Construir</div>
                <div class="city-build-list" id="city-build-list"></div>
                <div class="city-policy-section">
                    <div class="city-policy-title">📋 Políticas</div>
                    <div class="city-policy-row">
                        <label>Imposto <span id="city-tax-val">0%</span></label>
                        <input type="range" min="0" max="30" value="0" oninput="setCityTax(this.value)">
                    </div>
                </div>
            </div>

            <!-- CENTER: BUILDINGS -->
            <div class="city-center">

                <div class="city-starvation-warning" id="city-starvation-warn">
                    ⚠️ <strong>Atenção:</strong> Moradores passando fome! Construa um Campo de Grãos.
                </div>

                <div>
                    <div class="city-section-label">Edifícios</div>
                    <div class="city-grid" id="city-grid"></div>
                </div>

                <div>
                    <div class="city-section-label">Migração recente</div>
                    <div class="city-migration-log" id="city-migration-log"></div>
                </div>

                <div>
                    <div class="city-section-label">Integração</div>
                    <div class="city-integration-row">
                        <div class="city-int-pill"><span class="city-int-pill-icon">🏭</span>Indústria fornece madeira e aço para construção</div>
                        <div class="city-int-pill"><span class="city-int-pill-icon">⚒️</span>Moradores são trabalhadores das fábricas</div>
                        <div class="city-int-pill"><span class="city-int-pill-icon">🛡️</span>Defesa recruta soldados da população</div>
                        <div class="city-int-pill"><span class="city-int-pill-icon">🔬</span>Escolas geram pontos de pesquisa</div>
                    </div>
                </div>

            </div>
        </div>
    </div>`;

    _renderBuildPanel();
    renderCityWorkspace();
}

function setCityTax(value) {
    if (!gameState.city) return;
    gameState.city.policies.taxRate = parseInt(value);
    const lbl = document.getElementById('city-tax-val');
    if (lbl) lbl.textContent = value + '%';
}
