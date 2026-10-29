type Tone = {
  freq: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  slide?: number;
  delay?: number;
};

export function createAudio() {
  let ctx: AudioContext | null = null;
  let muted = false;

  function ac() {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  }

  function tone(opts: Tone) {
    if (muted) return;
    const a = ac();
    const t = a.currentTime + (opts.delay ?? 0);
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = opts.type ?? "sine";
    osc.frequency.setValueAtTime(opts.freq, t);
    if (opts.slide) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(48, opts.freq + opts.slide), t + opts.dur);
    }
    const peak = opts.gain ?? 0.06;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
    osc.connect(gain);
    gain.connect(a.destination);
    osc.start(t);
    osc.stop(t + opts.dur + 0.02);
  }

  function noise(dur: number, level: number, cutoff: number) {
    if (muted) return;
    const a = ac();
    const samples = Math.max(1, Math.floor(a.sampleRate * dur));
    const buffer = a.createBuffer(1, samples, a.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < samples; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / samples);
    const src = a.createBufferSource();
    src.buffer = buffer;
    const filter = a.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    const gain = a.createGain();
    gain.gain.value = level;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(a.destination);
    src.start();
  }

  return {
    unlock() {
      ac();
    },
    get muted() {
      return muted;
    },
    setMuted(next: boolean) {
      muted = next;
    },
    catchClean(combo: number) {
      const base = 540 + Math.min(combo, 16) * 28;
      tone({ freq: base, dur: 0.08, gain: 0.055 });
      tone({ freq: base * 1.25, dur: 0.11, gain: 0.045, delay: 0.045 });
    },
    catchPure() {
      tone({ freq: 660, dur: 0.09, gain: 0.055 });
      tone({ freq: 880, dur: 0.11, gain: 0.048, delay: 0.07 });
      tone({ freq: 1174, dur: 0.16, type: "triangle", gain: 0.04, delay: 0.13 });
    },
    dirty() {
      noise(0.16, 0.07, 420);
      tone({ freq: 150, dur: 0.2, type: "square", gain: 0.035, slide: -90 });
    },
    miss() {
      tone({ freq: 340, dur: 0.16, type: "triangle", gain: 0.05, slide: -150 });
    },
    start() {
      tone({ freq: 494, dur: 0.08, gain: 0.05 });
      tone({ freq: 659, dur: 0.12, gain: 0.05, delay: 0.07 });
    },
    over() {
      tone({ freq: 392, dur: 0.15, type: "triangle", gain: 0.05 });
      tone({ freq: 311, dur: 0.18, type: "triangle", gain: 0.045, delay: 0.12 });
      tone({ freq: 247, dur: 0.28, type: "triangle", gain: 0.04, delay: 0.22 });
    },
    step() {
      noise(0.025, 0.018, 900);
    },
    boost() {
      tone({ freq: 196, dur: 0.16, type: "triangle", gain: 0.04, slide: 520 });
      noise(0.1, 0.035, 1600);
    },
    streak() {
      tone({ freq: 784, dur: 0.08, gain: 0.04 });
      tone({ freq: 988, dur: 0.12, type: "triangle", gain: 0.04, delay: 0.06 });
    },
    sheet() {
      tone({ freq: 523, dur: 0.09, gain: 0.05 });
      tone({ freq: 659, dur: 0.12, gain: 0.05, delay: 0.08 });
      tone({ freq: 784, dur: 0.18, type: "triangle", gain: 0.045, delay: 0.16 });
    },
    destroy() {
      void ctx?.close();
      ctx = null;
    },
  };
}

export type AudioBus = ReturnType<typeof createAudio>;
