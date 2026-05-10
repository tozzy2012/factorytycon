// ═══ MIGRATION DATABASE — Fatores de Atração e Repulsa Migratória ═══
// Cada fator define: peso, condição de ativação e mensagem explicativa.
// Peso maior = exibido primeiro quando múltiplos fatores são verdadeiros.

window.MIGRATION_FACTORS = {

    // ── Fatores Positivos (atraem moradores) ─────────────────────────────────
    positive: [
        {
            id: 'jobs_open',
            weight: 5,
            check: function(gs) {
                if (!gs.city) return false;
                // Mais empregos do que trabalhadores disponíveis → vagas abertas
                return (gs.city.trabalhadores?.livres || 0) < 0;
            },
            getMessage: function(gs) {
                const deficit = Math.abs(gs.city.trabalhadores?.livres || 0);
                return 'Trabalhadores imigraram atraídos por ' + deficit + ' vaga(s) aberta(s) nas fábricas.';
            }
        },
        {
            id: 'high_happiness',
            weight: 4,
            check: function(gs) {
                return gs.city && (gs.city.felicidade || 0) > 75;
            },
            getMessage: function(gs) {
                return 'Alta qualidade de vida (' + Math.round(gs.city.felicidade) + '% felicidade) atrai novas famílias.';
            }
        },
        {
            id: 'housing_available',
            weight: 3,
            check: function(gs) {
                if (!gs.city) return false;
                return gs.city.moradoresMax > (gs.city.moradores || 0) + 2;
            },
            getMessage: function(gs) {
                const vagas = Math.floor(gs.city.moradoresMax - gs.city.moradores);
                return 'Há ' + vagas + ' vagas de moradia disponíveis. Novas famílias estão chegando.';
            }
        },
        {
            id: 'leisure_infrastructure',
            weight: 2,
            check: function(gs) {
                if (!gs.city) return false;
                const leisureBuildings = (gs.city.buildings || []).filter(function(b) {
                    var def = (typeof cityBuildings !== 'undefined') ? cityBuildings[b.type] : null;
                    return def && (def.happinessBonus || 0) > 8;
                });
                return leisureBuildings.length >= 2;
            },
            getMessage: function() {
                return 'A infraestrutura social da cidade (parques, tavernas) está atraindo moradores.';
            }
        },
        {
            id: 'food_surplus',
            weight: 2,
            check: function(gs) {
                if (!gs.city) return false;
                const food = (gs.city.comida?.graos || 0) + (gs.city.comida?.carne || 0);
                return food > gs.city.moradores * 10;
            },
            getMessage: function() {
                return 'Abundância de alimentos atrai famílias que fogem da fome.';
            }
        },
    ],

    // ── Fatores Negativos (expulsam moradores) ────────────────────────────────
    negative: [
        {
            id: 'pollution_critical',
            weight: 5,
            check: function(gs) {
                return (gs.pollutionLevel || 0) > 60;
            },
            getMessage: function(gs) {
                return 'Moradores saindo: poluição industrial em ' + Math.round(gs.pollutionLevel) + '% — o ar está irrespirável!';
            }
        },
        {
            id: 'pollution_high',
            weight: 3,
            check: function(gs) {
                return (gs.pollutionLevel || 0) > 35 && (gs.pollutionLevel || 0) <= 60;
            },
            getMessage: function(gs) {
                return 'Poluição elevada (' + Math.round(gs.pollutionLevel) + '%) está afastando famílias jovens.';
            }
        },
        {
            id: 'starvation',
            weight: 5,
            check: function(gs) {
                return gs.city && (gs.city.starvationTimer || 0) > 15;
            },
            getMessage: function() {
                return 'Crise alimentar! Moradores estão abandonando a cidade com fome.';
            }
        },
        {
            id: 'overcrowded',
            weight: 4,
            check: function(gs) {
                if (!gs.city) return false;
                return gs.city.moradores >= gs.city.moradoresMax && gs.city.moradoresMax > 0;
            },
            getMessage: function() {
                return 'Sem moradia disponível. Construa mais casas para continuar crescendo.';
            }
        },
        {
            id: 'unemployment',
            weight: 3,
            check: function(gs) {
                if (!gs.city) return false;
                const livres = gs.city.trabalhadores?.livres || 0;
                const total = gs.city.trabalhadores?.total || 0;
                return total > 0 && livres > total * 0.4;
            },
            getMessage: function(gs) {
                const rate = Math.round((gs.city.trabalhadores.livres / gs.city.trabalhadores.total) * 100);
                return 'Desemprego em ' + rate + '%. Moradores estão partindo em busca de oportunidades.';
            }
        },
        {
            id: 'low_happiness',
            weight: 2,
            check: function(gs) {
                return gs.city && (gs.city.felicidade || 0) < 30;
            },
            getMessage: function(gs) {
                return 'Felicidade em ' + Math.round(gs.city.felicidade) + '%. A população está desesperançosa.';
            }
        },
    ],

    // ── Mensagens neutras (quando tudo está estável) ──────────────────────────
    neutral: [
        'Cidade estável. Infraestrutura equilibrada.',
        'Fluxo migratório normal. Sem grandes mudanças.',
        'A cidade cresce no seu ritmo natural.',
        'Situação controlada. Mantenha a produção de alimentos.',
    ],
};
