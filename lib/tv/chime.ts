/** Synthesised winning chime (no audio file). Browsers block autoplay, so enable() must run from a click. */
export function createChime() {
  let ctx: AudioContext | null = null;
  return {
    async enable() { ctx ??= new AudioContext(); await ctx.resume(); return ctx.state === "running"; },
    play() {
      const c = ctx; if (!c || c.state !== "running") return;
      [523, 659, 784, 1047].forEach((f, i) => {
        const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + i * 0.14;
        o.type = "triangle"; o.frequency.value = f; o.connect(g); g.connect(c.destination);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
        o.start(t); o.stop(t + 0.45);
      });
    },
  };
}
