/* ============================================================
   AMBIENT SYNTH
   Inspired by Eno's asynchronous loop technique (Music for Airports):
   Multiple independent voices, each on a different irrational interval,
   so note combinations never repeat in the same way.
   D pentatonic scale, long convolution reverb, sine-based tones.
   ============================================================ */

// D pentatonic across three octaves
const SCALE = [
  146.83, // D3
  164.81, // E3
  184.99, // F#3
  220.00, // A3
  246.94, // B3
  293.66, // D4
  329.63, // E4
  369.99, // F#4
  440.00, // A4
  493.88, // B4
  587.33, // D5
  659.25, // E5
  739.99, // F#5
];

// Four voices, each with its own loop interval (seconds), note pool,
// and note duration. Irrational intervals ensure they drift apart over time.
const VOICE_DEFS = [
  { interval: 11.3, pool: [3, 5, 7, 9],  dur: 7.5, peak: 0.16 }, // mid register
  { interval: 17.8, pool: [0, 2, 5, 10], dur: 9.0, peak: 0.13 }, // low + high
  { interval: 13.7, pool: [4, 6, 8, 11], dur: 6.5, peak: 0.14 }, // upper mid
  { interval: 22.4, pool: [1, 5, 9, 12], dur: 8.5, peak: 0.11 }, // sparse highs
];

class AmbientSynth {
  constructor() {
    this.ac          = null;
    this.reverb      = null;
    this.dry         = null;
    this.wet         = null;
    this.master      = null;
    this.initialized = false;
    this.timers      = [];

    // Kaleidoscope t drives tempo scaling — 1.0 = nominal, higher = faster notes
    this.tempoScale  = 1.0;
  }

  async start() {
    if (this.initialized) return;
    this.initialized = true;

    this.ac = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ac.state === 'suspended') await this.ac.resume();

    this._buildGraph();
    this._startVoices();
  }

  // Called each frame with the kaleidoscope's t increment
  syncToKaleidoscope(tIncrement) {
    // Nominal tIncrement is 0.006. Scale note intervals inversely.
    this.tempoScale = tIncrement / 0.006;
  }

  _buildGraph() {
    const ac = this.ac;

    // Master output
    this.master = ac.createGain();
    this.master.gain.value = 0.72;
    this.master.connect(ac.destination);

    // Dry path
    this.dry = ac.createGain();
    this.dry.gain.value = 0.28;
    this.dry.connect(this.master);

    // Reverb + wet path
    this.reverb = this._makeReverb(7, 3.2);
    this.wet = ac.createGain();
    this.wet.gain.value = 0.72;
    this.reverb.connect(this.wet);
    this.wet.connect(this.master);
  }

  // Synthesise a hall reverb impulse response programmatically
  _makeReverb(duration, decay) {
    const ac  = this.ac;
    const sr  = ac.sampleRate;
    const len = Math.floor(sr * duration);
    const buf = ac.createBuffer(2, len, sr);

    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        // Exponential decay envelope over noise
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }

    const conv = ac.createConvolver();
    conv.buffer = buf;
    return conv;
  }

  _startVoices() {
    for (const def of VOICE_DEFS) {
      // Stagger initial fires so voices don't all sound at once
      const initialDelay = Math.random() * def.interval * 0.85 * 1000;
      const timer = setTimeout(() => this._scheduleVoice(def), initialDelay);
      this.timers.push(timer);
    }
  }

  _scheduleVoice(def) {
    this._playNote(def);

    // Interval with gentle jitter (+/- 15%) and tempo sync
    const base    = def.interval / this.tempoScale;
    const jitter  = (Math.random() - 0.5) * base * 0.3;
    const next    = Math.max(4000, (base + jitter) * 1000);
    const timer   = setTimeout(() => this._scheduleVoice(def), next);
    this.timers.push(timer);
  }

  _playNote(def) {
    const ac   = this.ac;
    const now  = ac.currentTime;
    const freq = SCALE[def.pool[Math.floor(Math.random() * def.pool.length)]];

    const attack  = 0.5;
    const hold    = def.dur * 0.25;
    const release = def.dur - attack - hold;

    // Two sine oscillators detuned by ~4 cents — natural chorus shimmer
    const osc1 = ac.createOscillator();
    const osc2 = ac.createOscillator();
    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.value = freq;
    osc2.frequency.value = freq * 1.0023; // 4 cents up

    // Gain envelope: fade in → hold → exponential tail
    const env = ac.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(def.peak, now + attack);
    env.gain.setValueAtTime(def.peak, now + attack + hold);
    env.gain.exponentialRampToValueAtTime(0.0001, now + def.dur);

    // Warm low-pass filter — removes harsh upper partials
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1600;
    filter.Q.value = 0.6;

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(env);
    env.connect(this.dry);
    env.connect(this.reverb);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + def.dur + 0.2);
    osc2.stop(now + def.dur + 0.2);
  }

  stop() {
    this.timers.forEach(clearTimeout);
    if (this.master) this.master.gain.linearRampToValueAtTime(0, this.ac.currentTime + 2);
  }
}
