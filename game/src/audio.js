// Synthesized sound effects: no audio files, everything is an oscillator and a
// gain envelope built on the first user gesture (browsers block audio before
// one). Every method is safe to call before the context exists — it just
// does nothing until the player has interacted.
export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return true;
    }
    try {
      const Ctor = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctor) return false;
      context = new Ctor();
      master = context.createGain();
      master.gain.value = 0.35;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freqFrom, freqTo, seconds, type, volume, when = 0) {
    if (!context || muted) return;
    const start = context.currentTime + when;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqFrom, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), start + seconds);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + seconds + 0.02);
  }

  function noise(seconds, volume, freqFrom, freqTo) {
    if (!context || muted) return;
    const start = context.currentTime;
    const length = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freqFrom, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, freqTo), start + seconds);
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
  }

  return {
    ensure,
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    shoot() {
      tone(880, 320, 0.08, 'square', 0.1);
    },
    boom(big) {
      noise(big ? 0.5 : 0.28, big ? 0.5 : 0.32, 2400, 120);
      tone(big ? 160 : 220, 40, big ? 0.45 : 0.25, 'sawtooth', 0.22);
    },
    pickup() {
      tone(660, 660, 0.07, 'sine', 0.22);
      tone(990, 990, 0.12, 'sine', 0.2, 0.07);
    },
    hit() {
      tone(200, 55, 0.35, 'sawtooth', 0.3);
      noise(0.25, 0.3, 1200, 100);
    },
    wave() {
      tone(523, 523, 0.09, 'triangle', 0.2);
      tone(659, 659, 0.09, 'triangle', 0.2, 0.09);
      tone(784, 784, 0.16, 'triangle', 0.22, 0.18);
    },
    over() {
      tone(392, 392, 0.18, 'triangle', 0.22);
      tone(311, 311, 0.18, 'triangle', 0.2, 0.18);
      tone(233, 110, 0.5, 'triangle', 0.22, 0.36);
    },
  };
}
