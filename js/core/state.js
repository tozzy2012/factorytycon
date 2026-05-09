window.SAVE_VERSION = 2;

window.gameState = {
    saveVersion: 2,
    gold: 1500,
    machines: [],
    connections: [],
    selectedMachine: null,
    connectingFrom: null,
    nextId: 1,
    simulationRunning: true,
    resourceFlow: {},
    era: 0,
    eraProgress: 0,
    totalProducedGlobal: {},
    globalInventory: {},
    activeWorkspace: 'industry',
    securityLevel: 100,
    lastSecurityTick: 0,
    worldMap: {},
    pollutionLevel: 0,
    discoveryPoints: 100,
    planetViewCenter: { x: 0, y: 0 },
    planetZoom: 1,
    selectedHex: null,
    city: null,
    tutorial: { done: false, step: 0 },
    stats: { playTime: 0, firstSale: false },
    tickStats: {
        totalTicks: 0,
        simulationRuns: 0,
        lastSimulationMs: 0,
        avgSimulationMs: 0,
        droppedTicks: 0,
        measuredTps: 20
    }
};
