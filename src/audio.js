// 以 Web Audio 即時合成所有音效，不需要額外的音檔
let ctx = null, master = null, noiseBuffer = null, spray = null, muted = false;
try { muted = localStorage.getItem('monster-muted') === '1'; } catch {}

export function initAudio() {
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  if (!ctx) {
    ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : .7; master.connect(ctx.destination);
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const data = noiseBuffer.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
}
export const isMuted = () => muted;
export function toggleMute() { muted = !muted; try { localStorage.setItem('monster-muted', muted ? '1' : '0'); } catch {} if (master) master.gain.setTargetAtTime(muted ? 0 : .7, ctx.currentTime, .05); return muted; }

function tone({ freq = 440, to = null, type = 'sine', start = 0, dur = .2, vol = .3, attack = .01 }) {
  if (!ctx) return; const t = ctx.currentTime + start, osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, t); if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  osc.connect(g).connect(master); osc.start(t); osc.stop(t + dur + .05);
}
function noise({ start = 0, dur = .3, vol = .3, filter = 'bandpass', freq = 1000, q = 1, to = null }) {
  if (!ctx) return; const t = ctx.currentTime + start, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noiseBuffer; f.type = filter; f.frequency.setValueAtTime(freq, t); if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur); f.Q.value = q;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  src.connect(f).connect(g).connect(master); src.start(t, Math.random()); src.stop(t + dur + .05);
}

// 噴水：按住時持續的水流聲
export function setSpraying(on, strong = false) {
  if (!ctx) return;
  if (on && !spray) {
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
    src.buffer = noiseBuffer; src.loop = true; f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = .8;
    lfo.frequency.value = 9; lfoGain.gain.value = 300; lfo.connect(lfoGain).connect(f.frequency);
    g.gain.setValueAtTime(0, ctx.currentTime); g.gain.linearRampToValueAtTime(.22, ctx.currentTime + .06);
    src.connect(f).connect(g).connect(master); src.start(); lfo.start(); spray = { src, f, g, lfo };
  }
  if (spray) spray.f.frequency.setTargetAtTime(strong ? 900 : 1400, ctx.currentTime, .1);
  if (!on && spray) { const s = spray; spray = null; s.g.gain.setTargetAtTime(0, ctx.currentTime, .05); s.src.stop(ctx.currentTime + .3); s.lfo.stop(ctx.currentTime + .3); }
}

export const sfx = {
  freeze() { [1320, 1760, 2350].forEach((f, i) => tone({ freq: f, type: 'triangle', start: i * .06, dur: .35, vol: .14 })); noise({ dur: .4, vol: .08, filter: 'highpass', freq: 5000 }); },
  shatter() { noise({ dur: .35, vol: .45, filter: 'highpass', freq: 2500, to: 6000 }); noise({ dur: .15, vol: .3, filter: 'lowpass', freq: 600 }); for (let i = 0; i < 6; i++) tone({ freq: 2000 + Math.random() * 3000, type: 'triangle', start: .03 + i * .04, dur: .18, vol: .08 }); tone({ freq: 880, to: 1760, type: 'square', start: .05, dur: .15, vol: .05 }); },
  hurt() { tone({ freq: 220, to: 70, type: 'sawtooth', dur: .35, vol: .22 }); noise({ dur: .2, vol: .3, filter: 'lowpass', freq: 400 }); },
  powerUp() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ freq: f, type: 'square', start: i * .07, dur: .18, vol: .08 })); tone({ freq: 1568, type: 'triangle', start: .35, dur: .5, vol: .12 }); },
  itemSpawn() { tone({ freq: 1175, type: 'sine', dur: .5, vol: .14 }); tone({ freq: 1568, type: 'sine', start: .12, dur: .6, vol: .12 }); },
  wave() { tone({ freq: 392, type: 'square', dur: .14, vol: .09 }); tone({ freq: 523, type: 'square', start: .15, dur: .14, vol: .09 }); tone({ freq: 659, type: 'square', start: .3, dur: .3, vol: .1 }); },
  gameOver() { [523, 440, 349, 262].forEach((f, i) => tone({ freq: f, type: 'triangle', start: i * .22, dur: .4, vol: .16 })); },
  start() { tone({ freq: 300, to: 1200, type: 'sine', dur: .3, vol: .15 }); noise({ start: .05, dur: .3, vol: .12, freq: 1500 }); },
  // 殭屍可愛的「嗚～」聲，距離越遠越小聲
  groan(distance = 10) {
    if (!ctx) return; const vol = Math.max(.03, .16 - distance * .006), t = ctx.currentTime, osc = ctx.createOscillator(), vib = ctx.createOscillator(), vibGain = ctx.createGain(), f = ctx.createBiquadFilter(), g = ctx.createGain(), base = 140 + Math.random() * 80;
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(base, t); osc.frequency.linearRampToValueAtTime(base * .75, t + .7);
    vib.frequency.value = 6; vibGain.gain.value = 8; vib.connect(vibGain).connect(osc.frequency);
    f.type = 'bandpass'; f.frequency.setValueAtTime(700, t); f.frequency.linearRampToValueAtTime(450, t + .7); f.Q.value = 4;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .12); g.gain.exponentialRampToValueAtTime(.001, t + .8);
    osc.connect(f).connect(g).connect(master); osc.start(t); vib.start(t); osc.stop(t + .85); vib.stop(t + .85);
  }
};
