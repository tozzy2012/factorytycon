// ═══ AUDIO ENGINE — Web Audio API (sintético, sem assets) ═══
// web-games skill: Audio context requires user interaction
window.AudioEngine = (function () {
    let ctx = null;
    let enabled = true;

    function getCtx() {
        if (!ctx) {
            try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
        }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }

    function play(type) {
        if (!enabled) return;
        const c = getCtx();
        if (!c) return;
        const now = c.currentTime;
        const o = c.createOscillator();
        const g = c.createGain();
        o.connect(g);
        g.connect(c.destination);

        const presets = {
            click:      { freq: 880,  wave: 'sine',     attack: 0,    decay: 0.08, vol: 0.15 },
            place:      { freq: 440,  wave: 'sine',     attack: 0.01, decay: 0.15, vol: 0.2  },
            connect:    { freq: 660,  wave: 'triangle', attack: 0.01, decay: 0.12, vol: 0.18 },
            sell:       { freq: 523,  wave: 'sine',     attack: 0.01, decay: 0.25, vol: 0.25 },
            firstsale:  { freq: 660,  wave: 'sine',     attack: 0.01, decay: 0.6,  vol: 0.3  },
            era:        { freq: 880,  wave: 'sine',     attack: 0.05, decay: 1.2,  vol: 0.35 },
            delete:     { freq: 200,  wave: 'sawtooth', attack: 0,    decay: 0.1,  vol: 0.12 },
            error:      { freq: 160,  wave: 'sawtooth', attack: 0,    decay: 0.2,  vol: 0.15 },
            house:      { freq: 392,  wave: 'triangle', attack: 0.02, decay: 0.3,  vol: 0.2  },
            population: { freq: 523,  wave: 'sine',     attack: 0.02, decay: 0.4,  vol: 0.22 },
        };

        const p = presets[type] || presets.click;
        o.type = p.wave;
        o.frequency.setValueAtTime(p.freq, now);

        if (type === 'era') {
            // Chord arpeggio for era unlock
            o.frequency.setValueAtTime(p.freq, now);
            o.frequency.setValueAtTime(p.freq * 1.25, now + 0.2);
            o.frequency.setValueAtTime(p.freq * 1.5, now + 0.4);
        }
        if (type === 'firstsale') {
            o.frequency.setValueAtTime(523, now);
            o.frequency.setValueAtTime(659, now + 0.15);
            o.frequency.setValueAtTime(784, now + 0.30);
        }

        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(p.vol, now + p.attack + 0.001);
        g.gain.exponentialRampToValueAtTime(0.001, now + p.attack + p.decay);
        o.start(now);
        o.stop(now + p.attack + p.decay + 0.05);
    }

    function toggle() { enabled = !enabled; return enabled; }
    function isEnabled() { return enabled; }

    // Unlock on first user interaction (web-games skill requirement)
    document.addEventListener('click', () => getCtx(), { once: true });

    return { play, toggle, isEnabled };
})();
