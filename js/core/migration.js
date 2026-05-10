// ═══ MIGRATION ENGINE — Roda a cada onNewDay ═══
// Lê o estado atual, avalia os fatores de MIGRATION_FACTORS,
// gera a mensagem mais relevante e atualiza o ticker e o growthLog.

function runMigrationCheck() {
    const gs = gameState;
    const factors = (typeof MIGRATION_FACTORS !== 'undefined') ? MIGRATION_FACTORS : null;
    if (!factors) return;

    // ── Avaliar fatores ─────────────────────────────────────────────────────
    const activeNeg = factors.negative.filter(function(f) {
        try { return f.check(gs); } catch(e) { return false; }
    }).sort(function(a, b) { return b.weight - a.weight; });

    const activePos = factors.positive.filter(function(f) {
        try { return f.check(gs); } catch(e) { return false; }
    }).sort(function(a, b) { return b.weight - a.weight; });

    // ── Escolher mensagem dominante ─────────────────────────────────────────
    var entry;
    var topNeg = activeNeg[0];
    var topPos = activePos[0];

    if (topNeg && (!topPos || topNeg.weight >= topPos.weight)) {
        entry = {
            text: topNeg.getMessage(gs),
            type: 'negative',
            icon: '📉',
            day: (gs.gameTime?.daysPassed || 0) + 1,
            ts: Date.now()
        };
    } else if (topPos) {
        entry = {
            text: topPos.getMessage(gs),
            type: 'positive',
            icon: '📈',
            day: (gs.gameTime?.daysPassed || 0) + 1,
            ts: Date.now()
        };
    } else {
        var neutrals = factors.neutral;
        var msg = neutrals[Math.floor(Math.random() * neutrals.length)];
        entry = {
            text: msg,
            type: 'neutral',
            icon: '📊',
            day: (gs.gameTime?.daysPassed || 0) + 1,
            ts: Date.now()
        };
    }

    // ── Atualizar estado ────────────────────────────────────────────────────
    if (!gs.population) gs.population = { growthLog: [], migrationRate: 0, employmentRate: 0 };

    gs.population.growthLog.push(entry);
    if (gs.population.growthLog.length > 5) gs.population.growthLog.shift();

    // Taxa de migração: soma dos pesos positivos menos negativos
    var posScore = activePos.reduce(function(s, f) { return s + f.weight; }, 0);
    var negScore = activeNeg.reduce(function(s, f) { return s + f.weight; }, 0);
    gs.population.migrationRate = posScore - negScore;

    // Taxa de emprego
    if (gs.city && gs.city.trabalhadores) {
        var t = gs.city.trabalhadores;
        gs.population.employmentRate = t.total > 0
            ? Math.round(((t.alocados || 0) / t.total) * 100)
            : 0;
    }

    // ── Atualizar ticker na tela ────────────────────────────────────────────
    _setTicker(entry);
}

function _setTicker(entry) {
    var el = document.getElementById('newsTickerText');
    var wrap = document.getElementById('newsTicker');
    if (!el || !wrap) return;

    el.textContent = entry.icon + ' Dia ' + entry.day + ': ' + entry.text;
    wrap.className = 'news-ticker news-ticker-' + entry.type;

    // Pulsa brevemente para chamar atenção
    wrap.classList.add('news-ticker-flash');
    setTimeout(function() { wrap.classList.remove('news-ticker-flash'); }, 800);
}

// Inicializa o ticker com mensagem de boas-vindas
function initTicker() {
    _setTicker({ icon: '🏭', day: 1, text: 'Bem-vindo ao Industrial Pipeline! Construa fábricas e faça sua cidade crescer.', type: 'neutral' });
}
