# Industrial Pipeline — Game Design Document (Technical)

> **Versão:** 0.004.5 · **Engine:** Vanilla JS (browser) · **Repo:** `tozzy2012/factorytycon`

---

## 1. Visão Geral

**Pitch:** Construa fábricas, gerencie sua cidade e domine eras industriais — de carvão a titânio.

**Core Loop (30s):** Colocar máquina → Conectar → Produzir recurso → Vender no Mercado → Ganhar ouro → Expandir

**Workspaces:**

| Workspace   | Descrição                                        | Arquivo UI                    |
|-------------|--------------------------------------------------|-------------------------------|
| `industry`  | Canvas SVG — máquinas, conexões, produção        | `js/ui/renderer.js`           |
| `city`      | Cidade — moradia, comida, felicidade, trabalhadores | `js/city/city-ui.js`       |
| `defense`   | Canvas SVG — cadeia bélica (escudos, armas)      | `js/ui/renderer.js`           |
| `planet`    | Mapa mundial procedural                          | `js/world/planet.js`          |
| `tech`      | Placeholder para árvore tecnológica              | —                             |

---

## 2. Arquitetura de Arquivos

```
/jogo/
├── index.html                  # Shell HTML, nav, workspaces, script imports
├── manifest.json               # PWA manifest
├── sw.js                       # Service Worker (offline cache)
├── css/styles.css              # Todo o CSS (~2800 linhas)
├── js/
│   ├── audio.js                # Web Audio API sintético (zero assets)
│   ├── core/
│   │   ├── state.js            # gameState global, SAVE_VERSION
│   │   ├── engine.js           # Simulação: produção, conexões, buffers, mercado
│   │   └── loop.js             # requestAnimationFrame, tick scheduling, speed control
│   ├── database/
│   │   ├── machines.db.js      # Definições de todas as máquinas (rates, inputs, outputs, workers)
│   │   ├── resources.db.js     # Nomes, cores, unidades, categorias de recursos
│   │   ├── economy.db.js       # Preços de venda no Mercado
│   │   └── eras.db.js          # 5 eras, requisitos de progressão, unlocks
│   ├── city/
│   │   ├── city.db.js          # Edifícios da cidade, custos, políticas, consumo
│   │   ├── city.js             # Simulação: pop, comida, felicidade, migração, workers
│   │   └── city-ui.js          # Render do workspace cidade
│   ├── ui/
│   │   ├── canvas.js           # Zoom, pan, viewport (96000×64000 base, zoom padrão 75%)
│   │   ├── renderer.js         # Render SVG das máquinas e conexões
│   │   └── components.js       # Info panel, toolbar, save/load, tutorial, title screen
│   └── world/
│       └── planet.js           # Geração procedural do mapa mundial
└── assets/svg/icons.js         # SVG icons inline para máquinas
```

### Responsabilidades por arquivo

| Arquivo | O que faz |
|---------|-----------|
| `engine.js` | **Core**: 2-phase simulation (non-flow → connections → flow), buffer management, market sales, depósito→globalInventory, worker factor |
| `loop.js` | Game loop a 20 TPS, speed multiplier (1×/2×/4×), tab visibility pause, tick scheduling |
| `state.js` | `window.gameState` — single source of truth para toda a simulação |
| `machines.db.js` | Schema de cada máquina: `{ inputs, outputs, productionRate, inputRatios, workersMin, workersMax, era, cost, workspace }` |
| `renderer.js` | Cria/atualiza SVG nodes (máquinas) e polyline paths (conexões), buffer bars, efficiency bars |
| `components.js` | Painel lateral (info panel), dock de máquinas, save/load, export/import, tutorial 3-step, title screen, worker UI slider |
| `canvas.js` | Zoom/pan via scroll+drag, viewport 96k×64k, zoom range 10%–200% |
| `city.js` | Simulação da cidade a cada tick: pop, food production/consumption, happiness multi-factor, migration waves, worker allocation |
| `city-ui.js` | Render da aba cidade: topbar chips, build panel, building grid, migration log |
| `city.db.js` | 13 tipos de edifício, custos, capacidades, bônus |

---

## 3. Recursos

### Sistema de Unidades

Cada recurso tem uma unidade base definida em `RESOURCE_UNITS` (resources.db.js):

| Tipo | Unidade | Display rate | Display estoque | Exemplos |
|------|---------|-------------|-----------------|----------|
| Bulk | `kg` | `kg/h` | `kg` ou `t` (≥1000) | carvao_bruto, ferro_gusa, aco_bruto |
| Líquido | `L` | `L/h` | `L` ou `m³` (≥1000) | agua_bruta, agua_tratada |
| Item discreto | `un` | `un/h` | `un` | tabua_madeira, chapa_aco, componente_eletronico |
| Energia | `kW` | `kW/h` | `kW` ou `MW` | eletricidade |
| Mecânica | `HP` | `HP/h` | `HP` | energia_mecanica |
| Gás | `Nm³` | `Nm³/h` | `Nm³` | ar_comprimido |
| Vapor | `kg` | `kg/h` | `kg` | vapor |

**Regra de consistência:** A unidade usada em **produção** (`un/h`), **estoque** (`30 un`), e **custos de construção** (`30 un Tábua de Madeira`) é sempre a mesma. Não existe conversão.

**Itens discretos (un):** tabua_madeira, chapa_aco, vergalhao, cobre_fino, chapa_aluminio, componente_eletronico, explosivo_industrial, liga_titanio, escudo_madeira, flechas_primitivas, armamento_primitivo, muralha_reforcada, componente_cortante, barra_ferro_forjado, chapa_blindagem, lingote_ferro_refinado

### 3.1 Recursos sólidos (armazenáveis)

| Key | Nome | Categoria |
|-----|------|-----------|
| `carvao_bruto` | Carvão Bruto | mineração |
| `madeira_bruta` | Madeira Bruta | mineração |
| `minerio_frag` | Minério Fragmentado | mineração |
| `calcario_bruto` | Calcário Bruto | mineração |
| `agua_bruta` | Água Bruta | água |
| `agua_tratada` | Água Tratada | água |
| `tabua_madeira` | Tábua de Madeira | primário |
| `coque` | Coque | primário |
| `cal` | Cal | primário |
| `sinter` | Sinter | primário |
| `conc_cu` | Concentrado de Cobre | secundário |
| `ferro_gusa` | Ferro-Gusa | secundário |
| `cobre_blister` | Cobre Blister | secundário |
| `aco_bruto` | Aço Bruto | secundário |
| `cobre_elet` | Cobre Eletrolítico | secundário |
| `chapa_aco` | Chapa de Aço | final |
| `vergalhao` | Vergalhão | final |
| `cobre_fino` | Cobre Fino | final |
| `chapa_aluminio` | Chapa de Alumínio | final |
| `componente_eletronico` | Componente Eletrônico | final |
| `explosivo_industrial` | Explosivo Industrial | final |
| `liga_titanio` | Liga de Titânio | final |
| `petroleo_bruto` | Petróleo Bruto | mineração |
| `diesel` | Diesel | primário |
| `nitrato` | Nitrato | mineração |
| `bauxita` | Bauxita | mineração |
| `alumina` | Alumina | primário |
| `aluminio_primario` | Alumínio Primário | secundário |
| `areia_silica` | Areia de Sílica | mineração |
| `silicio_puro` | Silício Puro | primário |
| `minerio_titanio` | Minério de Titânio | mineração |
| `esponja_titanio` | Esponja de Titânio | primário |

### 3.2 Recursos de fluxo (não armazenáveis)

Definidos em `FLOW_RESOURCES` — buffer máximo = 0, transferidos via demand-pull.

| Key | Nome |
|-----|------|
| `vapor` | Vapor |
| `energia_mecanica` | Energia Mecânica |
| `eletricidade` | Eletricidade |
| `ar_comprimido` | Ar Comprimido |

**Mecânica:** Recursos de fluxo não acumulam em buffer. O produtor só produz se houver consumidor downstream com demanda. Transferência via `demandPerTick()` no engine.

---

## 4. Máquinas — Era 0 (Era do Vapor)

> `productionRate` = unidades/segundo a 100% eficiência, 1 worker.
> `inputRatios`: para cada 1 unidade produzida, consome `ratio` unidades do input.
> `workersMin/Max`: trabalhadores da cidade necessários.

### 4.1 Extração

| Key | Nome | Rate | Output | Workers | Custo |
|-----|------|------|--------|---------|-------|
| `mina_carvao_basica` | Mina de Carvão | 3/s | carvao_bruto | 1–4 | 600g |
| `lenhador` | Campo de Lenhadores | 2.5/s | madeira_bruta | 1–4 | 100g |
| `captacao_agua_manual` | Captação Manual de Água | 3/s | agua_bruta | 1–3 | 150g |
| `mineradora_basica` | Mineradora Básica | 2/s | minerio_frag | 1–5 | 500g |
| `pedreira_calcario` | Pedreira de Calcário | 30/s | calcario_bruto | — | 200g |

### 4.2 Processamento primário

| Key | Nome | Rate | Input → Output | InputRatios | Workers | Custo |
|-----|------|------|----------------|-------------|---------|-------|
| `serraria_manual` | Serraria Manual | 1.5/s | madeira_bruta → tabua_madeira | madeira: 1.0 | 1–3 | 200g |
| `britador_mecanico` | Britador Mecânico | 1.5/s | minerio_frag + agua_bruta → coque | frag: 0.6, agua: 0.2 | 1–2 | 400g |
| `filtro_mecanico` | Filtro Mecânico | 2/s | agua_bruta → agua_tratada | agua: 1.0 | 1–2 | 250g |

### 4.3 Energia

| Key | Nome | Rate | Input → Output | InputRatios | Workers | Custo |
|-----|------|------|----------------|-------------|---------|-------|
| `caldeira_carvao` | Caldeira a Carvão | 3/s | carvao + madeira + agua → vapor | c: 0.4, m: 0.5, a: 0.3 | 1–2 | 300g |
| `maquina_vapor` | Máquina a Vapor | 2.5/s | vapor → energia_mecanica | vapor: 0.5 | — | 500g |

### 4.4 Armazenamento & Venda

| Key | Nome | Mecânica |
|-----|------|----------|
| `deposito` | Depósito | Input `*` (universal). Recebe de qualquer máquina. Transfere imediatamente para `globalInventory`. Custo: 400g |
| `mercado` | Mercado | Aceita produtos finais. Vende automaticamente a cada tick. Receita = qty × preço × 3600. Custo: 0g |
| `hub` | Hub Logístico | Roteador: aceita 2 recursos simultâneos, repassa para downstream. Custo: 250g |

---

## 5. Máquinas — Era 1+ (resumo)

### Era 1 — Era Industrial (req: 200 minerio_frag produzido)

| Key | Nome | Rate | Inputs | Outputs |
|-----|------|------|--------|---------|
| `usina_termoeletrica` | Usina Termoelétrica | 60/s | carvao_bruto, agua_tratada | eletricidade |
| `mineradora_fe` | Mineradora de Ferro | 30/s | — | minerio_fe |
| `mineradora_cu` | Mineradora de Cobre | 20/s | — | minerio_cu |
| `mina_carvao` | Mina de Carvão (Elétrica) | 40/s | eletricidade | carvao_bruto |
| `captacao_agua` | Captação de Água | 30/s | eletricidade | agua_bruta |
| `eta` | ETA | 25/s | agua_bruta, eletricidade | agua_tratada |
| `britador` | Britador Industrial | 20/s | minerio_fe/cu | minerio_frag |
| `coqueria` | Coqueria | 15/s | carvao_bruto, agua_tratada | coque |
| `forno_cal` | Forno de Cal | 12/s | calcario, coque | cal |
| `forno_sinterizacao` | Forno de Sinterização | 16/s | frag + coque + agua | sinter |
| `compressor_ar` | Compressor de Ar | 50/s | eletricidade | ar_comprimido |

### Era 2 — Era do Aço (req: 200 ferro_gusa)

Alto-Forno (8/s), Aciaria (7/s), Laminador (9/s), Flotação (10/s), Fundição Cu (6/s), Eletrólise Cu (5/s), Trefiladora (8/s), Poço Petróleo (25/s), Refinaria (15/s), Usina Óleo (80/s), Mina Nitrato (20/s), Planta Explosivos (8/s)

### Era 3 — Era Moderna (req: 100 aco_bruto)

Usina Solar, Mineradora Bauxita, Refinaria Alumina, Eletrólise Alumínio, Laminadora Al, Mineradora Sílica, Purificação Silício, Fábrica Chips

### Era 4 — Era Nuclear (req: 50 componente_eletronico)

Mineradora Titânio, Refinaria Titânio, Forja Titânio

---

## 6. Economia & Mercado

```
Definido em: js/database/economy.db.js
```

| Produto | Preço/unidade |
|---------|---------------|
| Tábua de Madeira | 15 |
| Ferro-Gusa | 60 |
| Aço Bruto | 90 |
| Vergalhão | 140 |
| Chapa de Aço | 180 |
| Cobre Fino | 320 |
| Chapa de Alumínio | 380 |
| Explosivo Industrial | 850 |
| Componente Eletrônico | 1200 |
| Liga de Titânio | 3500 |

**Fórmula de venda (engine.js):**
```
goldEarned = (bufferInput[resource] / simStepSeconds) × price × 3600
```
Venda acontece a cada simulation tick (1/20s por padrão). O Mercado consome todo o buffer de entrada instantaneamente.

---

## 7. Sistema de Produção (engine.js)

### 7.1 Tick Loop

```
TPS = 20 (ticks por segundo)
simStepSeconds = SIMULATION_EVERY_TICKS / TPS = 0.05s
```

Speed multiplier afeta `MS_PER_TICK`: `1000 / (TPS * SPEED_MULTIPLIER)`

### 7.2 Simulation Phases

```
Phase 1: Máquinas SEM input de fluxo
  → Produzem para bufferOutput baseado em bufferInput + workerFactor
  → Hub: move bufferInput → bufferOutput (passthrough)

Phase 2: Conexões (transfers)
  → Sólidos: equal-split do bufferOutput entre conexões de saída
    available = from.bufferOutput[r]
    share = available / numConnections
    transfer = min(share, to.space)
  → Fluxo: demand-pull
    demanded = min(demandPerTick(to), connection.capacity × dt)
    transfer = min(demanded, from.bufferOutput[r])

Phase 3: Máquinas COM input de fluxo
  → Processam após receber fluxo via conexões

Phase 4: Mercado, Depósito, Terminal de Suprimentos
  → Mercado: vende bufferInput, gera gold
  → Depósito: bufferInput → globalInventory (flush total a cada tick)
  → Terminal: globalInventory → bufferOutput (taxa fixa)
```

### 7.3 Worker Factor (engine.js)

```javascript
workerFactor = 1.0  // padrão (sem requisito de workers)

if (workersMin > 0) {
    effectiveWorkers = min(assigned, cityAvailable)
    if (effective < workersMin) → 0.0  // máquina PARADA
    else → 0.5 + 0.5 × ((effective - min) / (max - min))
}

maxProd = baseRate × workerFactor
```

Isso cria curva: `min workers = 50% rate`, `max workers = 100% rate`, `0 workers = 0%`.

### 7.4 Buffer Sizing

```
bufferInputMax[r] = max(50, ceil(perHourConsumption / 12))
bufferOutputMax[r] = max(50, ceil(perHourProduction / 12))
```
Para depósito: `max(1000, baseByTier, ceil(producerRate × 7200))`

### 7.5 Machine Status

| Status | Condição |
|--------|----------|
| `active` | Produzindo a 100% do rate |
| `partial` | Produzindo mas abaixo do máximo |
| `stopped` | Sem inputs suficientes |
| `bottleneck` | Output cheio (gargalo) e inputs disponíveis |
| `idle` | Sem atividade (hub vazio, etc) |

---

## 8. Sistema de Cidade (city.js + city.db.js)

### 8.1 Edifícios

| Key | Nome | Icon | Custo | Capacidade | Workers | Felicidade | Especial |
|-----|------|------|-------|------------|---------|------------|----------|
| `prefeitura` | Prefeitura | 🏛️ | Grátis | — | 0 | +5 | Única |
| `casa_simples` | Casa Simples | 🏠 | 30 tábua | 4 moradores | 0 | — | — |
| `casa_media` | Casa Média | 🏡 | 50 tábua + 10 aço | 8 moradores | 0 | — | Era 1 |
| `campo_graos` | Campo de Grãos | 🌾 | 15 tábua | — | 2 | — | 6 grãos/h |
| `rancho` | Rancho | 🐄 | 25 tábua | — | 3 | — | 3 carne/h (consome grãos) |
| `armazem_comida` | Armazém de Comida | 🏚️ | 20 tábua | — | 0 | — | +200 food storage |
| `praca` | Praça | ⛲ | 20 tábua | — | 0 | +8 | — |
| `taverna` | Taverna | 🍺 | 35 tábua | — | 1 | +12 | — |
| `parque` | Parque | 🌳 | 40 tábua + 20 madeira | — | 0 | +10 | +20% migração |
| `escola` | Escola | 🏫 | 50 tábua | — | 2 | +5 | 2 pesq/h |
| `hospital` | Hospital | 🏥 | 60 tábua + 15 aço | — | 3 | +15 | +30% migração, Era 1 |
| `mercado_cidade` | Mercado Municipal | 🏪 | 30 tábua | — | 1 | +6 | +50% tax income |
| `academia` | Academia de Ciências | 🔬 | 80 tábua + 20 aço + 5 cobre | — | 4 | +5 | 8 pesq/h, Única, Era 1 |

### 8.2 Trabalhadores

```
totalWorkers = floor(moradores × 0.70)    // 70% da pop é mão de obra
cityWorkersNeeded = Σ(building.workers)     // alocação para farms, escolas etc.
industryWorkers = Σ(machine.workersAssigned) // alocação para máquinas
livres = max(0, total - city - industry)

Se total < city + industry:
    → Indústria recebe proporcionalmente: ratio = (total - city) / industry
    → machine._effectiveWorkers = floor(assigned × ratio)
```

### 8.3 Felicidade (0–100)

```
felicidade = foodSurplus × 40
           + housingSurplus × 25
           + carneBonus (10 se carne > 0)
           + Σ(building.happinessBonus)
           + 15 (base)
           - starvationPenalty (30 se fome > 45s)
           - taxPenalty (taxRate × 1.5)
```

### 8.4 Alimentação

```
Consumo: 0.5 / 3600 grãos/morador/segundo
Storage base: 100 (+ armazém de comida)
Starvation grace: 45 segundos sem comida antes de declínio
```

### 8.5 Migração

```
if (felicidade > 40 && moradores < moradoresMax):
    migrationBonus = Σ(building.migrationBonus)  // parks, hospitals
    attractionRate = (0.3/3600) × (felicidade/100) × (1 + migBonus)
    migrationQueue += attractionRate × dt

    if (migrationQueue >= 1):
        arriving = min(floor(queue), availableHousing)
        moradores += arriving
        → Show floating notification (🚶‍♂️ +N)
        → Log event (reason + timestamp)

if (starvation > 45s):
    declineRate = 1.5/3600 moradores/segundo
    moradores -= declineRate × dt
```

---

## 9. Sistema de Eras (eras.db.js)

| Era | Nome | Requisito | Máquinas desbloqueadas |
|-----|------|-----------|----------------------|
| 0 | Era do Vapor | — | 12 máquinas base |
| 1 | Era Industrial | 200 minerio_frag | 11 máquinas elétricas |
| 2 | Era do Aço | 200 ferro_gusa | 12 máquinas metalúrgicas |
| 3 | Era Moderna | 100 aco_bruto | 8 máquinas eletrônicas |
| 4 | Era Nuclear | 50 componente_eletronico | 3 máquinas de titânio |

**Progressão:** `totalProducedGlobal[resource] >= amount` → desbloqueia próxima era.

---

## 10. Workspace Defesa

Cadeia de produção separada no canvas `defense`. Recursos fluem do `globalInventory` via Terminal de Suprimentos.

```
Terminal de Suprimentos (puxa do armazém global)
    └→ Forno de Pudlagem (ferro_gusa + carvao + vapor → lingote)
        ├→ Martelo Hidráulico (lingote + energia → barra forjada)
        │   └→ Oficina de Afiação (barra + agua + energia → componente cortante)
        └→ Prensa a Vapor (lingote + vapor → chapa blindagem)

Bancada Carpinteira (tabua → escudo + flechas)

Bancada de Montagem (cortante + barra + chapa + calcário → armamento + muralha)
    └→ Quartel de Defesa (consome armamento para manter segurança)
```

---

## 11. Cadeia de Produção Completa (Era 0 → 4)

```
Era 0: EXTRAÇÃO
  Mina Carvão ─────────────┐
  Campo Lenhadores ──┐     │
  Captação Água ──┐  │     │
                  │  │     │
  PROCESSAMENTO   │  │     │
  Filtro ←── agua │  │     │
  Serraria ←── madeira     │
  Britador ←── frag + agua │
  Caldeira ←── carvão + madeira + agua → vapor
  Máq.Vapor ←── vapor → energia_mecânica
                  │
  VENDA           │
  Mercado ←── tabua_madeira → gold (15g/un)

Era 1: ELETRICIDADE
  Usina Termoelétrica ←── carvão + agua → eletricidade
  → Alimenta: ETA, Britador, Coqueria, etc.
  Forno Sinterização ←── frag + coque + agua → sinter
  Alto-Forno ←── sinter + coque + cal + ar → ferro_gusa
  → Mercado (60g/un)

Era 2: METALURGIA
  Aciaria ←── ferro_gusa + ar + eletric. → aco_bruto
  Laminador ←── aco_bruto + eletric. + agua → chapa_aco + vergalhao
  → Mercado (180g + 140g)
  
  Flotação → Fundição Cu → Eletrólise → Trefiladora → cobre_fino
  → Mercado (320g)

Era 3: ELETRÔNICA
  Mineradora Bauxita → Alumina → Eletrólise Al → Laminadora → chapa_aluminio (380g)
  Mineradora Sílica → Purificação → Fábrica Chips → componente_eletronico (1200g)

Era 4: TITÂNIO
  Mineradora Ti → Refinaria → Forja → liga_titanio (3500g)
```

---

## 12. Interação UI (components.js)

### Info Panel (gaveta lateral)

Aberto ao clicar em uma máquina no canvas. Mostra:
- Nome, tier, status, ícone
- Produção atual vs máxima (por hora)
- Eficiência %
- Fluxo de entrada/saída em tempo real
- Buffers (entrada/saída com barra de preenchimento)
- **Controle de trabalhadores** (se `def.workersMin > 0`): slider + botões ＋/－
- Diagnóstico textual
- Histórico de eficiência
- Filtros do Hub (se hub)
- Botão de deletar máquina

### Controle de trabalhadores no Info Panel

```
Componente: slider range + botões ＋/－
Função: window.adjustWorkers(machineId, delta, absolute)
  → Atualiza machine.workersAssigned
  → Atualiza DOM in-place (sem re-render do painel)
  → Respeita limites [0, workersMax]
```

### Listeners de clique (canvas)

```javascript
document.addEventListener('click', (e) => {
    if (e.target.closest('#infoPanel')) return;     // cliques no painel são ignorados
    if (e.target.closest('.machine-node')) → selectMachine()
    else → closeInfoPanel()
});
```

---

## 13. Save System (components.js)

```
SAVE_VERSION = 2
Storage key: 'industrialPipeline_save'

Dados salvos: gold, machines[], connections[], nextId, era, eraProgress,
  totalProducedGlobal{}, globalInventory{}, securityLevel, worldMap,
  pollutionLevel, discoveryPoints, city{}, tutorial{}, stats{}

Autosave: a cada 200 ticks (10 segundos a 1×)
Export/Import: JSON via clipboard
Migration: saves sem saveVersion recebem defaults para novos campos
```

---

## 14. Audio (audio.js)

Motor sintético via Web Audio API. Zero assets de áudio.

| Preset | Trigger |
|--------|---------|
| `click` | Clique genérico |
| `place` | Máquina colocada |
| `connect` | Conexão criada |
| `sell` | Venda no mercado |
| `firstSale` | Primeira venda (acorde) |
| `era` | Era desbloqueada |
| `population` | Moradores chegam |
| `house` | Edifício construído |
| `delete` | Máquina/edifício removido |
| `error` | Ação inválida |

---

## 15. Tutorial (components.js)

3 passos guiados com overlay bottom:

| Step | Evento trigger | Conteúdo |
|------|---------------|----------|
| 0 | `machine:placed` | Dock de máquinas + dicas de navegação (zoom/pan) |
| 1 | `connection:made` | Conectar máquinas + dicas de zoom |
| 2 | `first_sale` (via engine) | Colocar Mercado e vender |

---

## 16. Fórmulas de Balanceamento

### Tempo para primeira casa (Era 0, cold start)

```
Pop inicial: 8 moradores → 5 trabalhadores (70%)
Cidade usa 2 (campo de grãos), livre: 3

1× Lenhador (1 worker, rate 2.5 kg/s × 50% = 1.25 kg/s madeira_bruta)
1× Serraria (1 worker, rate 1.5 un/s × 50% = 0.75 un/s tábua_madeira)
1× Captação (1 worker, rate 3 L/s × 50% = 1.5 L/s agua_bruta)

Casa Simples custa 30 un tábua_madeira
Tempo: 30 un / 0.75 un/s = 40 segundos ← primeira casa

Com casa: +4 moradores → 12 total → 8 workers → mais indústria
```

### Progressão de população

```
8 moradores iniciais → 2 casas
Cada casa: 30 tábuas × 40s = ~1 casa/minuto
Felicidade > 50: migração a 0.3/3600 × (felicidade/100)/s
Com 60% felicidade: ~1 morador a cada 33 minutos (sem bonus)
Com parque (+20%): ~1 morador a cada 28 minutos
```

O bottleneck intencional é: **mais casas → mais pop → mais workers → mais produção → mais casas**.

---

## 17. Constantes Globais

| Constante | Valor | Arquivo |
|-----------|-------|---------|
| `TPS` | 20 | loop.js |
| `canvasBaseWidth` | 96000 | canvas.js |
| `canvasBaseHeight` | 64000 | canvas.js |
| `canvasZoom` (default) | 0.75 | canvas.js |
| `canvasMinZoom` | 0.10 | canvas.js |
| `canvasMaxZoom` | 2.00 | canvas.js |
| `AUTOSAVE_EVERY_TICKS` | 200 | loop.js |
| `SAVE_VERSION` | 2 | state.js |
| `SPEED_MULTIPLIER` | 1/2/4 | loop.js |
| `FLOW_RESOURCES` | vapor, energia_mecanica, eletricidade, ar_comprimido | machines.db.js |

---

*Documento gerado automaticamente a partir do código-fonte em v0.004.5*
