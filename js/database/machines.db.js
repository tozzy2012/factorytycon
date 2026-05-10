window.machineTypes = {
    // ═══ ERA 0 ═══
    'mina_carvao_basica': {
        name: 'Mina de Carvão',
        category: 'minerio',
        cost: 600,
        era: 0,
        inputs: [],
        outputs: ['carvao_bruto'],
        productionRate: 3,
        workersMin: 1,
        workersMax: 4,  // 20/s = 72.000/h
        inputRatios: {}
    },
    'caldeira_carvao': {
        name: 'Caldeira a Carvão',
        category: 'energia',
        cost: 300,
        era: 0,
        inputs: ['carvao_bruto', 'madeira_bruta', 'agua_bruta'],
        outputs: ['vapor'],
        productionRate: 3,
        workersMin: 1,
        workersMax: 2,
        inputRatios: { carvao_bruto: 0.4, madeira_bruta: 0.5, agua_bruta: 0.3 }, // aceita carvão OU madeira
        description: 'Queima carvão ou madeira e usa água para gerar vapor. Requer combustível e água para funcionar.'
    },
    'maquina_vapor': {
        name: 'Máquina a Vapor',
        category: 'energia',
        cost: 500,
        era: 0,
        inputs: ['vapor'],
        outputs: ['energia_mecanica'],
        productionRate: 2.5,
        inputRatios: { vapor: 0.4 }, // 1 caldeira (20/s vapor) → 2.5 máquinas (20 / 2.5 / 12 ≈ 0.4... → usamos 0.4 arredondado)
        description: 'Converte vapor em força mecânica para mover as primeiras máquinas.'
    },
    'captacao_agua_manual': {
        name: 'Captação Manual de Água',
        category: 'agua',
        cost: 150,
        era: 0,
        inputs: [],
        outputs: ['agua_bruta'],
        productionRate: 3,
        workersMin: 1,
        workersMax: 3,
        inputRatios: {},
        description: 'Bomba manual operada por trabalhadores. Não exige energia, mas é lenta.'
    },
    'lenhador': {
        name: 'Campo de Lenhadores',
        category: 'minerio',
        cost: 100,
        era: 0,
        inputs: [],
        outputs: ['madeira_bruta'],
        productionRate: 2.5,
        workersMin: 1,
        workersMax: 4,
        inputRatios: {},
        description: 'Extrai madeira das florestas locais.'
    },
    'serraria_manual': {
        name: 'Serraria Manual',
        category: 'primario',
        cost: 200,
        era: 0,
        inputs: ['madeira_bruta'],
        outputs: ['tabua_madeira'],
        productionRate: 1.5,
        workersMin: 1,
        workersMax: 3,
        inputRatios: { madeira_bruta: 1.5 },
        description: 'Corta toras em tábuas para construção e defesa.'
    },
    'britador_mecanico': {
        name: 'Britador Mecânico',
        category: 'primario',
        cost: 400,
        era: 0,
        inputs: ['minerio_fe', 'energia_mecanica'],
        outputs: ['minerio_frag'],
        productionRate: 1.5,
        workersMin: 1,
        workersMax: 2,
        inputRatios: { minerio_fe: 0.4, energia_mecanica: 0.2 }, // 1 mineradora (8/s) → 2.5 britadores; energia proporcional
        description: 'Tritura minério por força mecânica. Capacidade limitada.'
    },
    'mineradora_basica': {
        name: 'Mineradora Básica',
        category: 'minerio',
        cost: 500,
        era: 0,
        inputs: ['energia_mecanica'],
        outputs: ['minerio_fe'],
        productionRate: 2,
        workersMin: 1,
        workersMax: 5,
        inputRatios: { energia_mecanica: 0.2 }, // leve consumo de energia mecânica
        description: 'Extração manual assistida por vapor. O início de tudo.'
    },

    'poco_argila': {
        name: 'Poço de Argila',
        category: 'minerio',
        cost: 120,
        era: 0,
        inputs: [],
        outputs: ['argila_bruta'],
        productionRate: 2,
        workersMin: 1,
        workersMax: 3,
        inputRatios: {},
        description: 'Extração de argila. Base para a Era da Alvenaria.',
    },
    'olaria_manual': {
        name: 'Olaria Manual',
        category: 'primario',
        cost: 180,
        era: 0,
        inputs: ['argila_bruta', 'madeira_bruta'],
        outputs: ['tijolo_barro'],
        productionRate: 1.5,
        workersMin: 1,
        workersMax: 3,
        inputRatios: { argila_bruta: 0.8, madeira_bruta: 0.3 },
        description: 'Queima argila com lenha para produzir tijolos. Necessário para superar 50 moradores.',
    },

        'filtro_mecanico': {
        name: 'Filtro de Areia Mecânico',
        category: 'agua',
        cost: 250,
        era: 0,
        inputs: ['agua_bruta', 'energia_mecanica'],
        outputs: ['agua_tratada'],
        productionRate: 2,
        workersMin: 1,
        workersMax: 2,
        inputRatios: { agua_bruta: 0.4, energia_mecanica: 0.1 }, // 1 captação (15/s) → 2.5 filtros (15/2.5/10 = 0.4)
        description: 'Tratamento rudimentar via decantação e areia. Não utiliza eletricidade.'
    },

    'misturador_argamassa': {
        name: 'Misturador de Argamassa',
        category: 'primario',
        cost: 400,
        era: 1,
        inputs: ['cal', 'agua_tratada', 'minerio_frag'],
        outputs: ['argamassa'],
        productionRate: 1.2,
        workersMin: 1,
        workersMax: 2,
        inputRatios: { cal: 0.3, agua_tratada: 0.2, minerio_frag: 0.4 },
        description: 'Produz argamassa para estruturas monumentais. Requer Cal (Forno de Cal) e agua tratada.',
    },

        // ═══ ERA 1 ═══
    'usina_termoeletrica': {
        name: 'Usina Termelétrica',
        category: 'energia',
        cost: 1200,
        era: 1,
        inputs: ['carvao_bruto', 'agua_tratada'],
        outputs: ['eletricidade'],
        productionRate: 60,
        inputRatios: { carvao_bruto: 0.4, agua_tratada: 0.15 }, // 1 mina elétrica (25/s) → 2.5 usinas (25/2.5/60 ≈ 0.17→0.4 pq carvão é o principal)
        description: 'Queima carvão para gerar eletricidade. Polui mas é poderosa.'
    },

    // ═══ ERA 2 ═══
    'poco_petroleo': {
        name: 'Poço de Petróleo',
        category: 'energia',
        cost: 1100,
        era: 2,
        inputs: ['eletricidade'],
        outputs: ['petroleo_bruto'],
        productionRate: 25,
        inputRatios: { eletricidade: 0.2 },
        description: 'Extração de petróleo. Base da química industrial e da guerra.'
    },
    'refinaria_combustivel': {
        name: 'Refinaria de Combustível',
        category: 'primario',
        cost: 1600,
        era: 2,
        inputs: ['petroleo_bruto', 'eletricidade'],
        outputs: ['diesel'],
        productionRate: 15,
        inputRatios: { petroleo_bruto: 1.6, eletricidade: 0.4 }
    },
    'usina_oleo': {
        name: 'Usina a Óleo',
        category: 'energia',
        cost: 1800,
        era: 2,
        inputs: ['diesel', 'agua_tratada'],
        outputs: ['eletricidade'],
        productionRate: 80,
        inputRatios: { diesel: 0.8, agua_tratada: 1.0 },
        description: 'Mais eficiente que carvão. Polui menos, custa mais.'
    },
    'mina_nitrato': {
        name: 'Mina de Nitrato',
        category: 'minerio',
        cost: 700,
        era: 2,
        inputs: ['eletricidade'],
        outputs: ['nitrato'],
        productionRate: 20,
        inputRatios: { eletricidade: 0.12 }
    },
    'planta_explosivos': {
        name: 'Planta de Explosivos',
        category: 'primario',
        cost: 2000,
        era: 2,
        inputs: ['nitrato', 'diesel', 'agua_tratada'],
        outputs: ['explosivo_industrial'],
        productionRate: 8,
        inputRatios: { nitrato: 2.4, diesel: 0.6, agua_tratada: 0.3 },
        description: 'Usados em mineração. Precursor direto do armamento.'
    },

    // ═══ ERA 3 ═══
    'mineradora_bauxita': {
        name: 'Mineradora de Bauxita',
        category: 'minerio',
        cost: 900,
        era: 3,
        inputs: ['eletricidade', 'agua_tratada'],
        outputs: ['bauxita'],
        productionRate: 20,
        inputRatios: { eletricidade: 0.15, agua_tratada: 0.25 }
    },
    'refinaria_alumina': {
        name: 'Refinaria de Alumina',
        category: 'primario',
        cost: 1800,
        era: 3,
        inputs: ['bauxita', 'soda_caustica', 'agua_tratada', 'eletricidade'],
        outputs: ['alumina'],
        productionRate: 12,
        inputRatios: { bauxita: 2.8, soda_caustica: 0.5, agua_tratada: 1.2, eletricidade: 0.3 },
        description: 'Processo Bayer: extrai alumina da bauxita com soda cáustica.'
    },
    'eletrolise_aluminio': {
        name: 'Eletrólise de Alumínio',
        category: 'secundario',
        cost: 2500,
        era: 3,
        inputs: ['alumina', 'eletricidade', 'criolita'],
        outputs: ['aluminio_primario'],
        productionRate: 6,
        inputRatios: { alumina: 1.93, eletricidade: 13.5, criolita: 0.05 },
        description: 'Processo Hall-Héroult: consume energia massiva. O alumínio é caro por isso.'
    },
    'laminadora_aluminio': {
        name: 'Laminadora de Alumínio',
        category: 'final',
        cost: 1400,
        era: 3,
        inputs: ['aluminio_primario', 'eletricidade'],
        outputs: ['chapa_aluminio'],
        productionRate: 8,
        inputRatios: { aluminio_primario: 1.04, eletricidade: 0.3 }
    },
    'mineradora_silica': {
        name: 'Mineradora de Sílica',
        category: 'minerio',
        cost: 600,
        era: 3,
        inputs: ['eletricidade'],
        outputs: ['areia_silica'],
        productionRate: 30,
        inputRatios: { eletricidade: 0.08 }
    },
    'purificacao_silicio': {
        name: 'Purificação de Silício',
        category: 'primario',
        cost: 2200,
        era: 3,
        inputs: ['areia_silica', 'eletricidade', 'agua_tratada'],
        outputs: ['silicio_puro'],
        productionRate: 8,
        inputRatios: { areia_silica: 4.5, eletricidade: 2.8, agua_tratada: 0.8 },
        description: 'Pureza 99.9999%. Processo extremamente intensivo em energia.'
    },
    'fabrica_chips': {
        name: 'Fábrica de Chips',
        category: 'final',
        cost: 3500,
        era: 3,
        inputs: ['silicio_puro', 'cobre_elet', 'eletricidade'],
        outputs: ['componente_eletronico'],
        productionRate: 4,
        inputRatios: { silicio_puro: 0.3, cobre_elet: 0.8, eletricidade: 4.5 },
        description: 'O componente mais valioso da cadeia industrial.'
    },

    // ═══ ERA 4 ═══
    'mineradora_titanio': {
        name: 'Mineradora de Titânio',
        category: 'minerio',
        cost: 2800,
        era: 4,
        inputs: ['eletricidade', 'agua_tratada', 'explosivo_industrial'],
        outputs: ['minerio_titanio'],
        productionRate: 10,
        inputRatios: { eletricidade: 0.25, agua_tratada: 0.4, explosivo_industrial: 0.02 },
        description: 'Requer explosivos industriais para extração. Raro e valioso.'
    },
    'refinaria_titanio': {
        name: 'Refinaria de Titânio',
        category: 'secundario',
        cost: 4000,
        era: 4,
        inputs: ['minerio_titanio', 'eletricidade', 'coque'],
        outputs: ['esponja_titanio'],
        productionRate: 4,
        inputRatios: { minerio_titanio: 3.2, eletricidade: 5.0, coque: 0.8 }
    },
    'forja_titanio': {
        name: 'Forja de Titânio',
        category: 'final',
        cost: 5000,
        era: 4,
        inputs: ['esponja_titanio', 'eletricidade', 'aluminio_primario'],
        outputs: ['liga_titanio'],
        productionRate: 3,
        inputRatios: { esponja_titanio: 1.2, eletricidade: 3.5, aluminio_primario: 0.4 },
        description: 'A liga mais resistente da cadeia industrial. Base do armamento avançado.'
    },

    // ═══ HUB ═══
    'terminal_suprimentos': {
        name: 'Terminal de Suprimentos',
        category: 'logistica',
        cost: 800,
        era: 0,
        inputs: [],
        outputs: ['carvao_bruto'],
        productionRate: 0,
        inputRatios: {},
        description: 'Puxa recursos do Armazém Central e os disponibiliza como saída para fábricas de defesa.'
    },

    'hub': {
        name: 'Hub de Conexão',
        category: 'logistica',
        cost: 200,
        era: 0,
        inputs: ['vapor', 'energia_mecanica', 'eletricidade', 'agua_tratada', 'agua_bruta',
            'minerio_fe', 'minerio_cu', 'carvao_bruto', 'calcario_bruto', 'minerio_frag',
            'coque', 'cal', 'sinter', 'conc_cu', 'ferro_gusa', 'cobre_blister', 'aco_bruto',
            'cobre_elet', 'ar_comprimido', 'chapa_aco', 'vergalhao', 'cobre_fino',
            'petroleo_bruto', 'diesel', 'nitrato', 'explosivo_industrial',
            'bauxita', 'alumina', 'aluminio_primario', 'chapa_aluminio', 'soda_caustica', 'criolita',
            'areia_silica', 'silicio_puro', 'componente_eletronico',
            'minerio_titanio', 'esponja_titanio', 'liga_titanio'],
        outputs: ['vapor', 'energia_mecanica', 'eletricidade', 'agua_tratada', 'agua_bruta',
            'minerio_fe', 'minerio_cu', 'carvao_bruto', 'calcario_bruto', 'minerio_frag',
            'coque', 'cal', 'sinter', 'conc_cu', 'ferro_gusa', 'cobre_blister', 'aco_bruto',
            'cobre_elet', 'ar_comprimido', 'chapa_aco', 'vergalhao', 'cobre_fino',
            'petroleo_bruto', 'diesel', 'nitrato', 'explosivo_industrial',
            'bauxita', 'alumina', 'aluminio_primario', 'chapa_aluminio', 'soda_caustica', 'criolita',
            'areia_silica', 'silicio_puro', 'componente_eletronico',
            'minerio_titanio', 'esponja_titanio', 'liga_titanio'],
        productionRate: 0,
        isHub: true
    },

    // FONTES (Era 3+)
    'usina_solar': {
        name: 'Usina Solar',
        category: 'energia',
        cost: 700,
        era: 3,
        inputs: [],
        outputs: ['eletricidade'],
        productionRate: 45
    },
    'mineradora_fe': {
        name: 'Mineradora de Ferro',
        category: 'minerio',
        cost: 800,
        era: 1,
        inputs: ['eletricidade', 'agua_tratada'],
        outputs: ['minerio_fe'],
        productionRate: 18,
        inputRatios: { eletricidade: 0.10, agua_tratada: 0.12 } // leve consumo, foco é output de minério
    },
    'mineradora_cu': {
        name: 'Mineradora de Cobre',
        category: 'minerio',
        cost: 900,
        era: 1,
        inputs: ['eletricidade', 'agua_tratada'],
        outputs: ['minerio_cu'],
        productionRate: 12,
        inputRatios: { eletricidade: 0.12, agua_tratada: 0.15 }
    },
    'mina_carvao': {
        name: 'Mina de Carvão (Elétrica)',
        category: 'minerio',
        cost: 600,
        era: 1,
        inputs: ['eletricidade'],
        outputs: ['carvao_bruto'],
        productionRate: 25,
        inputRatios: { eletricidade: 0.08 } // leve consumo elétrico
    },
    'pedreira_calcario': {
        name: 'Pedreira de Calcário',
        category: 'minerio',
        cost: 400,
        era: 1,
        inputs: ['eletricidade'],
        outputs: ['calcario_bruto'],
        productionRate: 30,
        inputRatios: { eletricidade: 0.06 }
    },
    'captacao_agua': {
        name: 'Captação de Água',
        category: 'agua',
        cost: 300,
        era: 1,
        inputs: ['eletricidade'],
        outputs: ['agua_bruta'],
        productionRate: 40,
        inputRatios: { eletricidade: 0.05 }
    },

    // PROCESSAMENTO PRIMÁRIO (Era 1)
    'eta': {
        name: 'Estação de Tratamento',
        category: 'primario',
        cost: 500,
        era: 1,
        inputs: ['agua_bruta', 'eletricidade'],
        outputs: ['agua_tratada'],
        productionRate: 35,
        inputRatios: { agua_bruta: 0.4, eletricidade: 0.06 } // 1 captação (40/s) → 2.5 ETAs (40/2.5/35 ≈ 0.46→0.4)
    },
    'britador': {
        name: 'Britador',
        category: 'primario',
        cost: 600,
        era: 1,
        inputs: ['minerio_fe', 'minerio_cu', 'eletricidade'],
        outputs: ['minerio_frag'],
        productionRate: 20,
        inputRatios: { minerio_fe: 0.4, minerio_cu: 0.4, eletricidade: 0.10 } // 1 mineradora (18/s fe, 12/s cu) → 2.5 britadores
    },
    'coqueria': {
        name: 'Coqueria',
        category: 'primario',
        cost: 800,
        era: 1,
        inputs: ['carvao_bruto', 'eletricidade'],
        outputs: ['coque'],
        productionRate: 15,
        inputRatios: { carvao_bruto: 0.4, eletricidade: 0.05 } // 1 mina elétrica (25/s) → 2.5 coquerias (25/2.5/15 ≈ 0.67→0.4 para não ser gargalo fácil)
    },
    'forno_cal': {
        name: 'Forno de Cal',
        category: 'primario',
        cost: 500,
        era: 1,
        inputs: ['calcario_bruto', 'coque'],
        outputs: ['cal'],
        productionRate: 12,
        inputRatios: { calcario_bruto: 0.4, coque: 0.15 } // 1 pedreira (30/s) → 2.5 fornos cal (30/2.5/12 = 1.0→usamos 0.4 para não ser rígido)
    },
    'forno_sinterizacao': {
        name: 'Forno de Sinterização',
        category: 'primario',
        cost: 900,
        era: 1,
        inputs: ['minerio_frag', 'coque', 'agua_tratada'],
        outputs: ['sinter'],
        productionRate: 16,
        inputRatios: { minerio_frag: 0.4, coque: 0.05, agua_tratada: 0.10 }
    },
    'compressor_ar': {
        name: 'Compressor de Ar',
        category: 'primario',
        cost: 400,
        era: 1,
        inputs: ['eletricidade'],
        outputs: ['ar_comprimido'],
        productionRate: 50,
        inputRatios: { eletricidade: 0.15 }
    },

    // PROCESSAMENTO SECUNDÁRIO (Era 2)
    'alto_forno': {
        name: 'Alto-Forno',
        category: 'secundario',
        cost: 2000,
        era: 1,
        inputs: ['sinter', 'coque', 'cal', 'ar_comprimido'],
        outputs: ['ferro_gusa'],
        productionRate: 8,
        inputRatios: { sinter: 1.70, coque: 0.45, cal: 0.28, ar_comprimido: 1.20 }
    },
    'flotacao': {
        name: 'Flotação',
        category: 'secundario',
        cost: 1000,
        era: 2,
        inputs: ['minerio_frag', 'agua_tratada', 'eletricidade'],
        outputs: ['conc_cu'],
        productionRate: 10,
        inputRatios: { minerio_frag: 4.00, agua_tratada: 2.50, eletricidade: 0.22 }
    },
    'forno_fundicao_cu': {
        name: 'Forno de Fundição de Cobre',
        category: 'secundario',
        cost: 1400,
        era: 2,
        inputs: ['conc_cu', 'coque', 'ar_comprimido'],
        outputs: ['cobre_blister'],
        productionRate: 6,
        inputRatios: { conc_cu: 3.20, coque: 0.80, ar_comprimido: 0.50 }
    },
    'eletrólise': {
        name: 'Eletrólise de Cobre',
        category: 'secundario',
        cost: 1200,
        era: 2,
        inputs: ['cobre_blister', 'eletricidade', 'agua_tratada'],
        outputs: ['cobre_elet'],
        productionRate: 5,
        inputRatios: { cobre_blister: 1.01, eletricidade: 0.32, agua_tratada: 0.05 }
    },
    'aciaria': {
        name: 'Aciaria',
        category: 'secundario',
        cost: 1800,
        era: 2,
        inputs: ['ferro_gusa', 'ar_comprimido', 'eletricidade'],
        outputs: ['aco_bruto'],
        productionRate: 7,
        inputRatios: { ferro_gusa: 1.08, ar_comprimido: 0.60, eletricidade: 0.10 }
    },

    // PRODUÇÃO FINAL (Era 2)
    'laminador': {
        name: 'Laminador',
        category: 'final',
        cost: 1500,
        era: 2,
        inputs: ['aco_bruto', 'eletricidade', 'agua_tratada'],
        outputs: ['chapa_aco', 'vergalhao'],
        productionRate: 9,
        inputRatios: { aco_bruto: 1.05, eletricidade: 0.25, agua_tratada: 0.15 }
    },
    'trefiladora': {
        name: 'Trefiladora',
        category: 'final',
        cost: 1000,
        era: 2,
        inputs: ['cobre_elet', 'eletricidade'],
        outputs: ['cobre_fino'],
        productionRate: 8,
        inputRatios: { cobre_elet: 1.01, eletricidade: 0.20 }
    },

    // ARMAZENAMENTO
    'deposito': {
        name: 'Depósito',
        category: 'armazenamento',
        cost: 400,
        era: 0,
        inputs: ['*'],
        outputs: ['*'],
        productionRate: 0,
        capacity: 500,
        description: 'Armazenamento universal. Aceita qualquer recurso através de uma única entrada.'
    },
    'mercado': {
        name: 'Mercado',
        category: 'armazenamento',
        cost: 0,
        era: 0,
        inputs: ['madeira_bruta', 'tabua_madeira', 'chapa_aco', 'vergalhao', 'cobre_fino', 'chapa_aluminio', 'componente_eletronico', 'explosivo_industrial', 'liga_titanio'],
        outputs: [],
        productionRate: 0
    },
    // ═══ DEFESA - ERA 0/1 ═══
    'terminal_suprimentos': {
        name: 'Terminal de Suprimentos',
        category: 'logistica',
        cost: 300,
        era: 0,
        inputs: [],
        outputs: ['ferro_gusa', 'carvao_bruto', 'vapor', 'energia_mecanica', 'agua_bruta', 'calcario_bruto'],
        productionRate: 20,
        inputRatios: {},
        workspace: 'defense',
        description: 'Puxa recursos do Armazém Global para o workspace de Defesa.'
    },
    'forno_pudlagem': {
        name: 'Forno de Pudlagem',
        category: 'primario',
        cost: 800,
        era: 0,
        inputs: ['ferro_gusa', 'carvao_bruto', 'vapor'],
        outputs: ['lingote_ferro_refinado'],
        productionRate: 10,
        inputRatios: { ferro_gusa: 1.2, carvao_bruto: 0.5, vapor: 0.3 },
        workspace: 'defense',
        description: 'Refina ferro-gusa em lingotes de alta pureza.'
    },
    'martelo_hidraulico': {
        name: 'Martelo Hidráulico',
        category: 'secundario',
        cost: 1200,
        era: 1,
        inputs: ['lingote_ferro_refinado', 'energia_mecanica'],
        outputs: ['barra_ferro_forjado'],
        productionRate: 8,
        inputRatios: { lingote_ferro_refinado: 1.0, energia_mecanica: 0.8 },
        workspace: 'defense',
        description: 'Forja lingotes em barras resistentes usando força mecânica.'
    },
    'prensa_vapor': {
        name: 'Prensa a Vapor',
        category: 'secundario',
        cost: 1000,
        era: 0,
        inputs: ['lingote_ferro_refinado', 'vapor'],
        outputs: ['chapa_blindagem'],
        productionRate: 6,
        inputRatios: { lingote_ferro_refinado: 1.5, vapor: 1.0 },
        workspace: 'defense',
        description: 'Comprime lingotes em chapas de blindagem densa.'
    },
    'oficina_afiacao': {
        name: 'Oficina de Afiação',
        category: 'final',
        cost: 1500,
        era: 1,
        inputs: ['barra_ferro_forjado', 'agua_bruta', 'energia_mecanica'],
        outputs: ['componente_cortante'],
        productionRate: 12,
        inputRatios: { barra_ferro_forjado: 1.0, agua_bruta: 0.5, energia_mecanica: 0.5 },
        workspace: 'defense',
        description: 'Usina barras forjadas em componentes cortantes afiados.'
    },
    'bancada_montagem': {
        name: 'Bancada de Montagem Bélica',
        category: 'final',
        cost: 2000,
        era: 1,
        inputs: ['componente_cortante', 'barra_ferro_forjado', 'chapa_blindagem', 'calcario_bruto'],
        outputs: ['armamento_primitivo', 'muralha_reforcada'],
        productionRate: 4,
        inputRatios: { componente_cortante: 2.0, barra_ferro_forjado: 1.0, chapa_blindagem: 2.0, calcario_bruto: 1.0 },
        workspace: 'defense',
        hasRecipeSelector: true,
        description: 'Monta equipamentos bélicos a partir de receitas selecionáveis.'
    },
    'quartel_defesa': {
        name: 'Quartel de Defesa',
        category: 'final',
        cost: 3000,
        era: 1,
        inputs: ['armamento_primitivo', 'muralha_reforcada', 'escudo_madeira', 'flechas_primitivas'],
        outputs: [],
        productionRate: 0,
        inputRatios: { armamento_primitivo: 1.0, muralha_reforcada: 1.0, escudo_madeira: 1.0, flechas_primitivas: 1.0 },
        workspace: 'defense',
        isSecurityConsumer: true,
        description: 'Consome equipamentos de defesa para manter a segurança da base.'
    },
    'bancada_carpinteira': {
        name: 'Bancada Carpinteira',
        category: 'final',
        cost: 150,
        era: 0,
        inputs: ['tabua_madeira'],
        outputs: ['escudo_madeira', 'flechas_primitivas'],
        productionRate: 5,
        inputRatios: { tabua_madeira: 1.2 },
        workspace: 'defense',
        description: 'Fabrica escudos e flechas primitivas usando tábuas de madeira.'
    }
};

// Recursos de fluxo: não podem ser armazenados — existem apenas como fluxo contínuo.
// Buffer máximo = 0: a produção só acontece se o downstream tem capacidade de consumir.
window.FLOW_RESOURCES = new Set([
    'energia_mecanica', 'eletricidade', 'vapor', 'ar_comprimido'
]);

// ═══ constructionCost — Custo de construção unificado ════════════════════════
const _constructionOverrides = {
    // ── Extratoras Era 0: SÓ gold ──
    poco_argila:           { gold: 120 },         // extrator de argila
    lenhador:              { gold: 100 },
    mina_carvao_basica:    { gold: 600 },
    captacao_agua_manual:  { gold: 150 },
    mineradora_basica:     { gold: 600 },
    // ── Processadoras Era 0: gold + tábuas (já tem acesso via lenhador + serraria) ──
    serraria_manual:       { gold: 200 },  // produz tábuas — não pode exigi-las
    olaria_manual:         { gold: 180 },         // produz tijolos — não pode exigi-los
    misturador_argamassa:  { gold: 400, tijolo_barro: 10 },
    caldeira_carvao:       { gold: 300,  tabua_madeira: 15 },
    maquina_vapor:         { gold: 500,  tabua_madeira: 20 },
    britador_mecanico:     { gold: 800,  tabua_madeira: 15 },
    // ── Era 1+ ──
    alto_forno:            { gold: 2000, tabua_madeira: 50 },
    aciaria:               { gold: 1800, tabua_madeira: 40 },
    laminador:             { gold: 1200, tabua_madeira: 30 },
    flotacao:              { gold: 1000, tabua_madeira: 20 },
};
(function _applyConstructionCosts() {
    Object.entries(machineTypes).forEach(function(e) {
        var key = e[0], def = e[1];
        if (_constructionOverrides[key]) { def.constructionCost = _constructionOverrides[key]; return; }
        var base = { gold: def.cost || 0 };
        // Só adiciona custo de recursos em máquinas que TÊM inputs (processadoras)
        // Extratoras (inputs=[]) nunca exigem recursos para construir
        var hasInputs = Array.isArray(def.inputs) && def.inputs.length > 0;
        if (hasInputs && (def.workersMin || 0) > 0) base.tabua_madeira = def.workersMin * 5;
        def.constructionCost = base;
    });
})();
