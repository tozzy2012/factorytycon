function getResourceName(resource) {
    const names = {
        'minerio_fe': 'Minério de Ferro',
        'minerio_cu': 'Minério de Cobre',
        'carvao_bruto': 'Carvão Bruto',
        'calcario_bruto': 'Calcário Bruto',
        'agua_bruta': 'Água Bruta',
        'eletricidade': 'Eletricidade',
        'agua_tratada': 'Água Tratada',
        'minerio_frag': 'Minério Fragmentado',
        'coque': 'Coque',
        'cal': 'Cal',
        'sinter': 'Sinter',
        'conc_cu': 'Concentrado de Cobre',
        'ferro_gusa': 'Ferro-Gusa',
        'cobre_blister': 'Cobre Blister',
        'aco_bruto': 'Aço Bruto',
        'cobre_elet': 'Cobre Eletrolítico',
        'ar_comprimido': 'Ar Comprimido',
        'chapa_aco': 'Chapa de Aço',
        'vergalhao': 'Vergalhão',
        'cobre_fino': 'Cobre Fino',
        'vapor': 'Vapor',
        'energia_mecanica': 'Energia Mecânica',
        'petroleo_bruto': 'Petróleo Bruto',
        'diesel': 'Diesel',
        'nitrato': 'Nitrato',
        'explosivo_industrial': 'Explosivo Industrial',
        'bauxita': 'Bauxita',
        'soda_caustica': 'Soda Cáustica',
        'alumina': 'Alumina',
        'criolita': 'Criolita',
        'aluminio_primario': 'Alumínio Primário',
        'chapa_aluminio': 'Chapa de Alumínio',
        'areia_silica': 'Areia de Sílica',
        'silicio_puro': 'Silício Puro',
        'componente_eletronico': 'Componente Eletrônico',
        'minerio_titanio': 'Minério de Titânio',
        'esponja_titanio': 'Esponja de Titânio',
        'liga_titanio': 'Liga de Titânio',
        'lingote_ferro_refinado': 'Lingote de Ferro Refinado',
        'barra_ferro_forjado': 'Barra de Ferro Forjado',
        'chapa_blindagem': 'Chapa de Blindagem',
        'componente_cortante': 'Componente Cortante',
        'armamento_primitivo': 'Armamento Primitivo',
        'muralha_reforcada': 'Muralha Reforçada',
        'madeira_bruta': 'Madeira Bruta',
        'tabua_madeira': 'Tábua de Madeira',
        'escudo_madeira': 'Escudo de Madeira',
        'flechas_primitivas': 'Flechas Primitivas',
        'argila_bruta':  'Argila Bruta',
        'tijolo_barro':  'Tijolo de Barro',
        'argamassa':     'Argamassa',
        'blocos_pedra':  'Blocos de Pedra',
        'pedra_polida':  'Pedra Polida',
        'vigas_aco':     'Vigas de Aço',
        'vidro':         'Vidro'
    };
    return names[resource] || resource;
}

function getResourceColor(resource) {
    const colors = {
        'minerio_fe': '#8B4513',
        'minerio_cu': '#B87333',
        'carvao_bruto': '#333',
        'calcario_bruto': '#F5F5DC',
        'agua_bruta': '#378ADD',
        'eletricidade': '#FFD700',
        'agua_tratada': '#378ADD',
        'minerio_frag': '#8B4513',
        'coque': '#666',
        'cal': '#FFF8DC',
        'sinter': '#CD853F',
        'conc_cu': '#DAA520',
        'ferro_gusa': '#708090',
        'cobre_blister': '#B8860B',
        'aco_bruto': '#71797E',
        'cobre_elet': '#C0C0C0',
        'ar_comprimido': '#87CEEB',
        'chapa_aco': '#434343',
        'vergalhao': '#696969',
        'cobre_fino': '#E5E4E2',
        'vapor': '#a0d8ef',
        'energia_mecanica': '#8B6914',
        'petroleo_bruto': '#2d1b00',
        'diesel': '#8B7536',
        'nitrato': '#c8f0c8',
        'explosivo_industrial': '#cc4400',
        'bauxita': '#cc7755',
        'soda_caustica': '#f0e8ff',
        'alumina': '#e8e8ff',
        'criolita': '#b0d0ff',
        'aluminio_primario': '#d0d8e8',
        'chapa_aluminio': '#b8c8d8',
        'areia_silica': '#e8d898',
        'silicio_puro': '#8899bb',
        'componente_eletronico': '#00cc88',
        'minerio_titanio': '#6677aa',
        'esponja_titanio': '#8899cc',
        'liga_titanio': '#aabbdd',
        'lingote_ferro_refinado': '#C0C0C0',
        'barra_ferro_forjado': '#4682B4',
        'chapa_blindagem': '#2F4F4F',
        'componente_cortante': '#E5E4E2',
        'armamento_primitivo': '#DC143C',
        'muralha_reforcada': '#D2B48C',
        'madeira_bruta': '#5d4037',
        'tabua_madeira': '#a1887f',
        'escudo_madeira': '#8d6e63',
        'flechas_primitivas': '#795548',
        'argila_bruta': '#c68642',
        'tijolo_barro': '#c1440e',
        'argamassa':    '#b8a090',
        'blocos_pedra': '#9e9e8c',
        'pedra_polida': '#e8dcc8',
        'vigas_aco':    '#5b7a8a',
        'vidro':        '#a8d8ea'
    };
    return colors[resource] || '#666';
}
// Unidades por recurso — consistente entre produção, estoque e custos
const RESOURCE_UNITS = {
    // Bulk (kg)
    carvao_bruto: 'kg', madeira_bruta: 'kg', minerio_frag: 'kg', calcario_bruto: 'kg',
    coque: 'kg', cal: 'kg', sinter: 'kg', conc_cu: 'kg',
    ferro_gusa: 'kg', cobre_blister: 'kg', aco_bruto: 'kg', cobre_elet: 'kg',
    bauxita: 'kg', alumina: 'kg', aluminio_primario: 'kg', areia_silica: 'kg',
    silicio_puro: 'kg', esponja_titanio: 'kg', minerio_titanio: 'kg',
    petroleo_bruto: 'kg', diesel: 'kg', nitrato: 'kg',
    soda_caustica: 'kg', criolita: 'kg', minerio_fe: 'kg', minerio_cu: 'kg',
    // Líquidos (L)
    agua_bruta: 'L', agua_tratada: 'L',
    // Energia/Fluxo
    eletricidade: 'kW', vapor: 'kg', energia_mecanica: 'HP', ar_comprimido: 'Nm³',
    // Itens discretos (un)
    tabua_madeira: 'un', chapa_aco: 'un', vergalhao: 'un', cobre_fino: 'un',
    chapa_aluminio: 'un', componente_eletronico: 'un', explosivo_industrial: 'un',
    liga_titanio: 'un', escudo_madeira: 'un', flechas_primitivas: 'un',
    armamento_primitivo: 'un', muralha_reforcada: 'un', componente_cortante: 'un',
    barra_ferro_forjado: 'un', chapa_blindagem: 'un', lingote_ferro_refinado: 'un',
};
window.RESOURCE_UNITS = RESOURCE_UNITS;

function getResourceUnit(resource) {
    const u = RESOURCE_UNITS[resource] || 'kg';
    return u + '/h';
}

function getResourceUnitBase(resource) {
    return RESOURCE_UNITS[resource] || 'kg';
}

function formatRatePerHour(valuePerSec, resource = null) {
    const hourly = Math.max(0, valuePerSec || 0) * 3600;
    const decimals = hourly >= 1000 ? 0 : hourly >= 100 ? 1 : 2;
    const numeric = hourly.toLocaleString('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
    if (!resource) return `${numeric} /h`;
    const unit = getResourceUnitBase(resource);
    return `${numeric} ${unit}/h`;
}

function formatNumericPerHour(valuePerSec, resource = null) {
    return formatRatePerHour(valuePerSec, resource);
}

function formatStoredAmount(quantity, resource = null) {
    const value = Math.max(0, quantity || 0);
    const unit = getResourceUnitBase(resource);

    if (unit === 'un') {
        // Discrete items — show as integer or 1 decimal
        if (value >= 10000) return `${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k un`;
        return `${value.toLocaleString('pt-BR', { maximumFractionDigits: value >= 100 ? 0 : 1 })} un`;
    }
    if (unit === 'kW') {
        if (value >= 1000) return `${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} MW`;
        return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kW`;
    }
    if (unit === 'L') {
        if (value >= 1000) return `${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} m³`;
        return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L`;
    }
    if (unit === 'Nm³') {
        if (value >= 1000) return `${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kNm³`;
        return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} Nm³`;
    }
    if (unit === 'HP') {
        return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} HP`;
    }
    // kg default
    if (value >= 1000) return `${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} t`;
    return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`;
}

function formatDecimal(value, decimals = 1) {
    return Number(value || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

function formatDurationCompact(seconds) {
    const total = Math.max(0, Math.floor(seconds || 0));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}h ${m}min`;
    if (m > 0) return `${m}min ${s}s`;
    return `${s}s`;
}
window.RESOURCE_CATEGORY = {
    eletricidade: 'energia',
    agua_bruta: 'agua',
    agua_tratada: 'agua',
    minerio_fe: 'minerio',
    minerio_cu: 'minerio',
    carvao_bruto: 'minerio',
    calcario_bruto: 'minerio',
    minerio_frag: 'primario',
    coque: 'primario',
    cal: 'primario',
    ar_comprimido: 'primario',
    sinter: 'secundario',
    conc_cu: 'secundario',
    ferro_gusa: 'secundario',
    cobre_blister: 'secundario',
    aco_bruto: 'secundario',
    cobre_elet: 'secundario',
    chapa_aco: 'final',
    vergalhao: 'final',
    cobre_fino: 'final',
    vapor: 'energia',
    energia_mecanica: 'energia',
    petroleo_bruto: 'minerio',
    diesel: 'primario',
    nitrato: 'minerio',
    explosivo_industrial: 'final',
    bauxita: 'minerio',
    soda_caustica: 'primario',
    alumina: 'primario',
    criolita: 'primario',
    aluminio_primario: 'secundario',
    chapa_aluminio: 'final',
    areia_silica: 'minerio',
    silicio_puro: 'primario',
    componente_eletronico: 'final',
    minerio_titanio: 'minerio',
    esponja_titanio: 'secundario',
    liga_titanio: 'final',
    argila_bruta: 'minerio',
    tijolo_barro: 'primario',
    argamassa:    'primario',
    blocos_pedra: 'primario',
    pedra_polida: 'final',
    vigas_aco:    'final',
    vidro:        'final'
};

window.PRODUCTION_CATEGORIES = {
    energia: { label: 'Energia', colorVar: 'var(--cat-energia)' },
    agua: { label: 'Água', colorVar: 'var(--cat-agua)' },
    minerio: { label: 'Mineração', colorVar: 'var(--cat-minerio)' },
    primario: { label: 'Processamento Primário', colorVar: 'var(--cat-primario)' },
    secundario: { label: 'Processamento Secundário', colorVar: 'var(--cat-secundario)' },
    final: { label: 'Produtos Finais', colorVar: 'var(--cat-final)' },
    outros: { label: 'Outros', colorVar: 'var(--text-secondary)' }
};

function getResourceCategory(resource) {
    return RESOURCE_CATEGORY[resource] || 'outros';
}

function isEssentialResource(resource) {
    return !['chapa_aco', 'vergalhao', 'cobre_fino'].includes(resource);
}

function estimateMachineHourlyRevenue(machine) {
    const def = machineTypes[machine.type];
    const rate = machine.production || 0;
    if (!def || !def.outputs.length || rate <= 0) return 0;
    return def.outputs.reduce((sum, resource) => sum + ((marketPrices[resource] || 0) * rate * 3600), 0);
}

function shortResource(resource) {
    const n = getResourceName(resource);
    return n.length > 10 ? `${n.slice(0, 9)}…` : n;
}
