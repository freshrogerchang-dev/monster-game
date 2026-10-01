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

// 火焰槍：低沉的轟轟聲＋劈啪聲，按住時持續
let flame = null;
export function setFlaming(on) {
  if (!ctx) return;
  if (on && !flame) {
    const t = ctx.currentTime, roar = ctx.createBufferSource(), low = ctx.createBiquadFilter(), roarGain = ctx.createGain(), crackle = ctx.createBufferSource(), high = ctx.createBiquadFilter(), crackleGain = ctx.createGain(), flutter = ctx.createOscillator(), flutterGain = ctx.createGain();
    roar.buffer = noiseBuffer; roar.loop = true; low.type = 'lowpass'; low.frequency.value = 520; low.Q.value = 1.4;
    roarGain.gain.setValueAtTime(0, t); roarGain.gain.linearRampToValueAtTime(.42, t + .12);
    flutter.frequency.value = 13; flutterGain.gain.value = 140; flutter.connect(flutterGain).connect(low.frequency);
    crackle.buffer = noiseBuffer; crackle.loop = true; crackle.playbackRate.value = .37; high.type = 'highpass'; high.frequency.value = 2600; crackleGain.gain.value = .07;
    roar.connect(low).connect(roarGain).connect(master); crackle.connect(high).connect(crackleGain).connect(master);
    roar.start(t, Math.random()); crackle.start(t, Math.random()); flutter.start(t); flame = { roar, crackle, flutter, roarGain, crackleGain };
    noise({ dur: .35, vol: .3, filter: 'bandpass', freq: 300, to: 1600, q: .7 });
  }
  if (!on && flame) { const f = flame, t = ctx.currentTime; flame = null; f.roarGain.gain.setTargetAtTime(0, t, .07); f.crackleGain.gain.setTargetAtTime(0, t, .05); for (const n of [f.roar, f.crackle, f.flutter]) n.stop(t + .4); }
}

export const sfx = {
  burnDeath() { noise({ dur: .7, vol: .35, filter: 'lowpass', freq: 900, to: 200 }); noise({ start: .05, dur: .5, vol: .12, filter: 'highpass', freq: 3500 }); tone({ freq: 160, to: 60, type: 'sawtooth', dur: .6, vol: .1 }); },
  refuel() { noise({ dur: .25, vol: .15, filter: 'bandpass', freq: 900, q: 3 }); tone({ freq: 300, to: 520, type: 'sine', start: .5, dur: .6, vol: .06 }); noise({ start: 1.6, dur: .12, vol: .18, filter: 'highpass', freq: 1500 }); },
  gunshot(sniper=false) { noise({dur:sniper?.32:.12,vol:.42,filter:'lowpass',freq:sniper?2100:3800,to:160}); tone({freq:sniper?100:160,to:40,type:'triangle',dur:.18,vol:.25}); noise({dur:.055,vol:.2,filter:'highpass',freq:6000}); },
  reload() { [0,.35,1.2].forEach(start=>noise({start,dur:.08,vol:.16,filter:'highpass',freq:1800})); },
  freeze() { [1320, 1760, 2350].forEach((f, i) => tone({ freq: f, type: 'triangle', start: i * .06, dur: .35, vol: .14 })); noise({ dur: .4, vol: .08, filter: 'highpass', freq: 5000 }); },
  shatter() { noise({ dur: .35, vol: .45, filter: 'highpass', freq: 2500, to: 6000 }); noise({ dur: .15, vol: .3, filter: 'lowpass', freq: 600 }); for (let i = 0; i < 6; i++) tone({ freq: 2000 + Math.random() * 3000, type: 'triangle', start: .03 + i * .04, dur: .18, vol: .08 }); tone({ freq: 880, to: 1760, type: 'square', start: .05, dur: .15, vol: .05 }); },
  hurt() { tone({ freq: 220, to: 70, type: 'sawtooth', dur: .35, vol: .22 }); noise({ dur: .2, vol: .3, filter: 'lowpass', freq: 400 }); },
  powerUp() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ freq: f, type: 'square', start: i * .07, dur: .18, vol: .08 })); tone({ freq: 1568, type: 'triangle', start: .35, dur: .5, vol: .12 }); },
  itemSpawn() { tone({ freq: 1175, type: 'sine', dur: .5, vol: .14 }); tone({ freq: 1568, type: 'sine', start: .12, dur: .6, vol: .12 }); },
  wave() { tone({ freq: 392, type: 'square', dur: .14, vol: .09 }); tone({ freq: 523, type: 'square', start: .15, dur: .14, vol: .09 }); tone({ freq: 659, type: 'square', start: .3, dur: .3, vol: .1 }); },
  gameOver() { [523, 440, 349, 262].forEach((f, i) => tone({ freq: f, type: 'triangle', start: i * .22, dur: .4, vol: .16 })); },
  shield() { tone({ freq: 500, to: 1400, type: 'sine', dur: .25, vol: .18 }); noise({ start: .05, dur: .2, vol: .15, filter: 'highpass', freq: 3000 }); tone({ freq: 1800, type: 'triangle', start: .12, dur: .3, vol: .08 }); },
  levelClear() { [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, type: 'square', start: i * .12, dur: .22, vol: .1 })); [1047, 1319, 1568].forEach(f => tone({ freq: f, type: 'triangle', start: .55, dur: .9, vol: .09 })); },
  boss() { tone({ freq: 110, to: 55, type: 'sawtooth', dur: 1.1, vol: .25 }); tone({ freq: 165, to: 80, type: 'square', start: .05, dur: 1, vol: .08 }); noise({ dur: .9, vol: .15, filter: 'lowpass', freq: 500, to: 150 }); },
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
