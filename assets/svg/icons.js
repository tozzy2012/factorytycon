// Carregador de ícones SVG das máquinas
// Carrega os SVGs de arquivos separados e disponibiliza como cache em memória

const MACHINE_ICON_TYPES = [
    'usina_solar', 'compressor_ar', 'mineradora_fe', 'mineradora_cu',
    'mina_carvao', 'pedreira_calcario', 'captacao_agua', 'eta',
    'britador', 'coqueria', 'forno_cal', 'forno_sinterizacao',
    'alto_forno', 'flotacao', 'forno_fundicao_cu', 'eletrolise',
    'aciaria', 'laminador', 'trefiladora', 'hub', 'deposito', 'mercado'
];

const MACHINE_ICONS = {};

async function loadMachineIcons() {
    const basePath = 'assets/svg/machines/';
    const promises = MACHINE_ICON_TYPES.map(async (type) => {
        try {
            const resp = await fetch(`${basePath}${type}.svg`);
            if (resp.ok) {
                MACHINE_ICONS[type] = await resp.text();
            } else {
                console.warn(`Failed to load icon: ${type}`);
                MACHINE_ICONS[type] = '';
            }
        } catch (e) {
            console.warn(`Error loading icon ${type}:`, e);
            MACHINE_ICONS[type] = '';
        }
    });
    await Promise.all(promises);

    // Mapeamento para chave com acento (eletrólise)
    MACHINE_ICONS['eletrólise'] = MACHINE_ICONS['eletrolise'] || '';

    console.log(`Loaded ${Object.keys(MACHINE_ICONS).length} machine icons`);
}

function getMachineIcon(type) {
    // Normalizar chave (remover acentos para lookup)
    const normalized = type.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const svg = MACHINE_ICONS[type] || MACHINE_ICONS[normalized];

    if (svg) return svg;

    // Fallback para emojis das máquinas de defesa
    const EMOJI_FALLBACK = {
        'terminal_suprimentos': '📦',
        'forno_pudlagem': '🔥',
        'martelo_hidraulico': '🔨',
        'prensa_vapor': '🗜️',
        'oficina_afiacao': '⚔️',
        'bancada_montagem': '🛠️',
        'quartel_defesa': '🛡️'
    };

    const emoji = EMOJI_FALLBACK[type];
    return emoji ? `<span style="font-size:24px;">${emoji}</span>` : '';
}
