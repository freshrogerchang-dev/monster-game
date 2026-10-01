import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { addRuins } from './ruins.js?v=flame1';

// 成人版場景：以程式產生的建築立面、廢棄車輛、街道雜物、燃燒的油桶與煙柱，
// 再依關卡加上各自的主題場景。所有不會動的東西最後都會被 scene.js 依材質合併。

const rand = (a, b) => a + Math.random() * (b - a);
const pick = list => list[Math.floor(Math.random() * list.length)];
const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .85, ...extra });
const glow = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra });
const V3 = THREE.Vector3;

export const ADULT_SCENES = {
  carnival: { sky: [['#6f93a1', 0], ['#a9bcbd', .5], ['#e0d6b8', .72]], ground: '#6b695e', path: '#55564f', wall: ['#a39c88', '#8c8a7c', '#b0a58c'], night: false, sun: [0xfff0c8, 26, 34, -80], signs: ['SOUVENIRS', 'ARCADE', 'DINER', 'MOTEL'] },
  candy: { sky: [['#06090b', 0], ['#1a2122', .5], ['#3a352c', .72]], ground: '#22241f', path: '#2e302c', wall: ['#4f4c44', '#3d3e3a', '#5a5345'], night: true, moon: [0xd9d2b8, -24, 30, -78], signs: ['PLANT 7', 'LOADING', 'NO ENTRY', 'BAY 3'] },
  snow: { sky: [['#1d2733', 0], ['#4a5866', .5], ['#8a96a0', .72]], ground: '#c9d2d8', path: '#7d878e', wall: ['#7a7f80', '#676d70', '#8b8a84'], night: false, snow: true, signs: ['QUARANTINE', 'CHECKPOINT', 'CLINIC', 'NO ENTRY'] },
  beach: { sky: [['#151b2c', 0], ['#5a4a5c', .45], ['#c0714a', .62], ['#e8a25e', .72]], ground: '#9b8a6c', path: '#4b4a45', wall: ['#8a8170', '#7b7466', '#9a8c74'], night: false, sun: [0xffa860, 0, 6, -86], signs: ['EVAC POINT', 'SURF SHOP', 'MOTEL', 'BAIT'] },
  graveyard: { sky: [['#05070a', 0], ['#141a1f', .5], ['#2b2d2a', .72]], ground: '#1d201b', path: '#33302b', wall: ['#3d3c38', '#33322f', '#47433b'], night: true, moon: [0xe6dcc0, -16, 24, -72], signs: ['FUNERAL HOME', 'FLOWERS', 'CHAPEL', 'CLOSED'] },
  moon: { sky: [['#000003', 0], ['#04060c', .5], ['#0c111b', .72]], ground: '#6f727a', path: '#3d424b', wall: ['#a9adb5', '#8f949c'], night: true, signs: [] }
};
export const ADULT_LIGHTING = {
  carnival: { fog: [0xa1b0aa, .011], hemi: [0xd5e8ed, 0x948970, 2.6], sun: [0xffe3ad, 3.6] },
  candy: { fog: [0x2a2d2a, .019], hemi: [0x96aaaa, 0x2e2e28, 1.6], sun: [0xd2bc92, 1.9] },
  snow: { fog: [0x8a96a0, .03], hemi: [0xc4d0da, 0x5a6268, 1.5], sun: [0xe0e6ea, 1.7] },
  beach: { fog: [0x6a5a5c, .018], hemi: [0xe0b090, 0x3a3236, 1.5], sun: [0xffa060, 2.6] },
  graveyard: { fog: [0x1f262a, .024], hemi: [0x8fa2ae, 0x1c1f1f, 1.75], sun: [0xc0ccdc, 2.1] },
  moon: { fog: [0x05070c, .01], hemi: [0x8090b0, 0x101218, .9], sun: [0xf4f6ff, 3.2] }
};

// ── 程式產生的貼圖 ──
function textures(tex) {
  const cache = new Map(), once = (key, make) => cache.get(key) || cache.set(key, make()).get(key);
  return {
    // 建築立面：4 層 × 4 開間，有窗框、破窗、雨水汙漬、一樓鐵捲門與塗鴉
    facade: (wall, night, variant) => once(`f${wall}${night}${variant}`, () => tex.canvasTexture(512, (g, s) => {
      g.fillStyle = wall; g.fillRect(0, 0, s, s);
      for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${Math.random() < .6 ? '0,0,0' : '255,255,255'},${rand(.02, .09)})`; g.fillRect(rand(0, s), rand(0, s), rand(1, 3), rand(1, 3)); }
      const fh = s / 4, bw = s / 4;
      for (let f = 0; f < 3; f++) for (let b = 0; b < 4; b++) {
        const x = b * bw + bw * .2, y = f * fh + fh * .2, w = bw * .6, h = fh * .55, r = Math.random();
        g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - 5, y - 5, w + 10, h + 14);
        g.fillStyle = night && r < .14 ? '#c9a45c' : r < .3 ? '#0b0d0e' : '#26323a'; g.fillRect(x, y, w, h);
        if (!night || r >= .14) { g.fillStyle = 'rgba(160,190,200,.18)'; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x + w * .45, y); g.lineTo(x + w * .7, y); g.lineTo(x + w * .2, y + h); g.fill(); }
        if (r > .78) { g.fillStyle = '#060707'; g.beginPath(); g.moveTo(x + w * .2, y + h * .1); for (let k = 0; k < 7; k++) g.lineTo(x + rand(0, w), y + rand(0, h)); g.fill(); }
        g.strokeStyle = '#2b2a27'; g.lineWidth = 4; g.strokeRect(x, y, w, h); g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.stroke();
        g.fillStyle = 'rgba(40,36,30,.25)'; g.fillRect(x + w * .1, y + h + 6, w * .8, rand(20, 60));
        g.fillStyle = '#5c584f'; g.fillRect(x - 8, y + h + 2, w + 16, 8);
      }
      g.fillStyle = 'rgba(0,0,0,.35)'; for (let f = 1; f < 4; f++) g.fillRect(0, f * fh - 6, s, 6);
      const gy = 3 * fh;
      for (let b = 0; b < 4; b += 2) { const x = b * bw + 18, w = bw * 2 - 36; g.fillStyle = '#4b4f4f'; g.fillRect(x, gy + 26, w, fh - 26); g.fillStyle = 'rgba(0,0,0,.35)'; for (let y = gy + 30; y < s; y += 7) g.fillRect(x, y, w, 2); }
      if (variant !== 2) { g.font = 'bold 44px Impact, sans-serif'; g.fillStyle = pick(['#b23a2e', '#2f6e8e', '#d8c24a', '#ececec']); g.globalAlpha = .7; g.save(); g.translate(rand(40, 220), gy + rand(70, 110)); g.rotate(rand(-.15, .1)); g.fillText(pick(['RUN', 'NO HOPE', 'X-23', 'GO WEST', 'HELP', '404']), 0, 0); g.restore(); g.globalAlpha = 1; }
      for (let i = 0; i < 14; i++) { const x = rand(0, s); const grad = g.createLinearGradient(0, 0, 0, s); grad.addColorStop(0, 'rgba(30,26,20,.35)'); grad.addColorStop(1, 'rgba(30,26,20,0)'); g.fillStyle = grad; g.fillRect(x, rand(0, s * .5), rand(3, 10), rand(80, 260)); }
    })),
    sign: (text, color) => once(`s${text}${color}`, () => tex.canvasTexture(256, (g, s) => { g.fillStyle = '#1c1d1c'; g.fillRect(0, 0, s, s); g.fillStyle = color; g.font = `bold ${text.length > 8 ? 30 : 40}px Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, s / 2, s / 2); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${rand(.1, .5)})`; g.fillRect(rand(0, s), rand(0, s), rand(1, 8), rand(1, 3)); } })),
    asphalt: path => once(`a${path}`, () => tex.canvasTexture(512, (g, s) => {
      g.fillStyle = path; g.fillRect(0, 0, s, s);
      for (let i = 0; i < 9000; i++) { const v = rand(20, 120); g.fillStyle = `rgba(${v},${v},${v},${rand(.08, .3)})`; g.fillRect(rand(0, s), rand(0, s), rand(1, 2.5), rand(1, 2.5)); }
      for (let i = 0; i < 5; i++) { g.fillStyle = `rgba(0,0,0,${rand(.08, .2)})`; g.fillRect(rand(0, s), rand(0, s), rand(60, 160), rand(40, 120)); }
      g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 1.6; for (let i = 0; i < 20; i++) { let x = rand(0, s), y = rand(0, s); g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 6; j++) { x += rand(-18, 18); y += rand(-18, 18); g.lineTo(x, y); } g.stroke(); }
      g.fillStyle = 'rgba(0,0,0,.18)'; for (const x of [s * .3, s * .38, s * .62, s * .7]) g.fillRect(x, 0, 14, s);
    }, [2, 14])),
    corrugated: color => once(`c${color}`, () => tex.canvasTexture(128, (g, s) => { g.fillStyle = color; g.fillRect(0, 0, s, s); for (let x = 0; x < s; x += 8) { g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x, 0, 3, s); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x + 4, 0, 2, s); } for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(90,45,20,${rand(.1, .4)})`; g.fillRect(rand(0, s), rand(0, s), rand(2, 14), rand(4, 30)); } })),
    soft: (inner, outer) => once(`p${inner}${outer}`, () => tex.canvasTexture(64, (g, s) => { const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, inner); r.addColorStop(1, outer); g.fillStyle = r; g.fillRect(0, 0, s, s); }))
  };
}

function materials(cfg, T, tex) {
  return {
    concrete: std(0xa6a397, { map: tex.grungeTexture('#979c92', [2, 2]), roughness: 1 }),
    darkConcrete: std(0x3a3d3d, { roughness: .98 }),
    rust: std(0x6a4632, { map: tex.grungeTexture('#6a4632', [2, 2]), metalness: .35, roughness: .85 }),
    metal: std(0x50585a, { metalness: .6, roughness: .55 }),
    darkMetal: std(0x22272a, { metalness: .5, roughness: .6 }),
    glass: std(0x12191c, { metalness: .5, roughness: .15 }),
    rubber: std(0x151617, { roughness: .95 }),
    charred: std(0x1b1715, { roughness: 1, metalness: .2 }),
    white: std(0xd8d4c8, { roughness: .9 }),
    snow: std(0xeef3f6, { roughness: 1 }),
    wood: std(0x5f4a36, { map: tex.grungeTexture('#6a5038', [1, 3], false), roughness: .95 }),
    cloth: std(0x6e6a4e, { roughness: 1, map: tex.grungeTexture('#76704f', [2, 2], false) }),
    orange: std(0xd2541c, { roughness: .7 }),
    yellow: std(0xc9a432, { roughness: .8 }),
    puddle: std(new THREE.Color(cfg.sky[1][0]).lerp(new THREE.Color(0x000000), .35).getHex(), { metalness: .3, roughness: .04, transparent: true, opacity: .55 }),
    lineWhite: std(0xb9b6a8, { roughness: .9, transparent: true, opacity: .75 }),
    lineYellow: std(0xb8962e, { roughness: .9, transparent: true, opacity: .75 }),
    bag: std(0x16191a, { roughness: .4, metalness: .1 }),
    paints: [0x5b6e78, 0x7b2e28, 0x8a8a84, 0x2c3a2e, 0xa58a5a, 0x2b3550].map(c => std(c, { metalness: .45, roughness: .45, map: tex.grungeTexture('#bdbdbd', [1, 1], false) }))
  };
}

// ── 共用道具 ──
function outline(points) { const s = new THREE.Shape(); points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath(); return s; }
function sideExtrude(shape, width, bevel = .04) { const g = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 10 }); g.translate(0, 0, -width / 2); g.rotateY(Math.PI / 2); return g; }
const carBodyShape = (() => { const s = new THREE.Shape(); s.moveTo(-2.15, .28); s.lineTo(-1.8, .28); s.absarc(-1.35, .3, .44, Math.PI, 0, true); s.lineTo(.92, .28); s.absarc(1.35, .3, .44, Math.PI, 0, true); s.lineTo(2.18, .28); s.lineTo(2.2, .62); s.lineTo(2.05, .8); s.lineTo(1.05, .9); s.lineTo(-1.5, .92); s.lineTo(-2.12, .86); s.lineTo(-2.2, .55); s.closePath(); return s; })();
const carGlassShape = outline([[1.0, .9], [.35, 1.4], [-.95, 1.42], [-1.5, .92]]);
let carGeo = null;
function car(k, M, x, z, rotY, variant = 'normal') {
  carGeo ||= { body: sideExtrude(carBodyShape, 1.72), glass: sideExtrude(carGlassShape, 1.56, .02), roof: sideExtrude(outline([[.36, 1.38], [-.94, 1.4], [-.94, 1.46], [.33, 1.44]]), 1.6, .02), wheel: new THREE.CylinderGeometry(.38, .38, .24, 18).rotateZ(Math.PI / 2), hub: new THREE.CylinderGeometry(.2, .2, .26, 10).rotateZ(Math.PI / 2), light: new THREE.BoxGeometry(.32, .12, .05), cap: new THREE.CapsuleGeometry(.28, 1.2, 4, 10) };
  const g = k.group(x, variant === 'burnt' ? -.08 : 0, z); g.rotation.set(0, rotY, rand(-.03, .03));
  const paint = variant === 'burnt' ? M.charred : pick(M.paints);
  const body = k.mesh(carGeo.body, paint, 0, 0, 0, g); body.castShadow = true; body.rotation.y = 0;
  k.mesh(carGeo.glass, variant === 'burnt' ? M.charred : M.glass, 0, 0, 0, g); k.mesh(carGeo.roof, paint, 0, 0, 0, g);
  for (const sx of [-1, 1]) for (const f of [-1.35, 1.35]) { if (variant !== 'burnt') k.mesh(carGeo.wheel, M.rubber, sx * .78, .38, -f, g); k.mesh(carGeo.hub, variant === 'burnt' ? M.rust : M.metal, sx * .8, .38, -f, g); }
  for (const sx of [-1, 1]) { k.mesh(carGeo.light, M.white, sx * .6, .66, -2.2, g); k.mesh(carGeo.light, variant === 'burnt' ? M.charred : std(0x5a1410), sx * .6, .7, 2.2, g); }
  if (variant === 'snow') { const roof = k.mesh(carGeo.cap, M.snow, 0, 1.5, .3, g); roof.rotation.x = Math.PI / 2; roof.scale.set(2.2, 1, .5); const hood = k.mesh(carGeo.cap, M.snow, 0, .96, -1.6, g); hood.rotation.x = Math.PI / 2; hood.scale.set(2.4, .6, .35); }
  return g;
}
let jerseyGeo = null;
function jersey(k, M, x, z, rotY) { jerseyGeo ||= sideExtrude(outline([[-.31, 0], [.31, 0], [.31, .08], [.11, .3], [.08, .81], [-.08, .81], [-.11, .3], [-.31, .08]]).clone(), 3, .02).rotateY(Math.PI / 2); const m = k.mesh(jerseyGeo, M.concrete, x, 0, z); m.rotation.y = rotY; m.castShadow = true; return m; }
function cone(k, M, x, z) { const g = k.group(x, 0, z); k.mesh(new THREE.BoxGeometry(.42, .04, .42), M.rubber, 0, .02, 0, g); k.mesh(new THREE.ConeGeometry(.17, .62, 14), M.orange, 0, .35, 0, g); k.mesh(new THREE.CylinderGeometry(.105, .125, .1, 14), M.white, 0, .38, 0, g); if (Math.random() < .3) { g.rotation.z = Math.PI / 2; g.position.y = .17; } }
function barrel(k, M, x, z, burning = false) { const g = k.group(x, 0, z); const b = k.mesh(new THREE.CylinderGeometry(.3, .3, .9, 16), burning ? M.charred : M.rust, 0, .45, 0, g); b.castShadow = true; for (const y of [.2, .7]) k.mesh(new THREE.TorusGeometry(.305, .02, 6, 18).rotateX(Math.PI / 2), M.darkMetal, 0, y, 0, g); return g; }
function sandbags(k, M, x, z, rotY, length = 3, rows = 3) { const g = k.group(x, 0, z); g.rotation.y = rotY; const geo = new THREE.CapsuleGeometry(.16, .34, 4, 8).rotateZ(Math.PI / 2); for (let r = 0; r < rows; r++) for (let i = 0; i < length / .6; i++) { const m = k.mesh(geo, M.cloth, -length / 2 + i * .6 + (r % 2) * .3, .16 + r * .27, rand(-.03, .03), g); m.scale.set(1, .75, 1.15); m.rotation.y = rand(-.08, .08); } }
function streetSign(k, M, T, x, z, text, rotY = 0) { const g = k.group(x, 0, z); g.rotation.set(0, rotY, rand(-.12, .12)); k.mesh(new THREE.CylinderGeometry(.04, .04, 2.6, 8), M.metal, 0, 1.3, 0, g); k.mesh(new THREE.PlaneGeometry(1.3, .65), std(0xffffff, { map: T.sign(text, '#e8e2d2'), roughness: .7, side: THREE.DoubleSide }), 0, 2.4, .05, g); }
function puddle(k, M, x, z, w, l) { const m = k.mesh(new THREE.CircleGeometry(1, 20), M.puddle, x, .02, z); m.rotation.x = -Math.PI / 2; m.scale.set(w, l, 1); }
function powerLines(k, M) {
  const poles = []; for (let z = 0; z > -82; z -= 18) for (const side of [-1, 1]) { const x = side * 8.2; k.mesh(new THREE.CylinderGeometry(.11, .15, 8.5, 8), M.wood, x, 4.25, z); k.mesh(new THREE.BoxGeometry(1.6, .12, .12), M.wood, x, 7.8, z); for (const dx of [-.6, .6]) k.mesh(new THREE.CylinderGeometry(.05, .05, .16, 6), M.white, x + dx, 7.94, z); poles.push([x, z]); }
  const wireMat = glow(0x111213);
  for (let i = 0; i + 2 < poles.length; i += 2) for (const [a, b] of [[poles[i], poles[i + 2]], [poles[i + 1], poles[i + 3]]]) { if (!b) continue; for (const dx of [-.6, .6]) { const p0 = new V3(a[0] + dx, 7.98, a[1]), p1 = new V3(b[0] + dx, 7.98, b[1]), mid = p0.clone().lerp(p1, .5).setY(7.2); k.mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(p0, mid, p1), 12, .018, 4), wireMat); } }
}
function skyline(k, theme, sides) {
  // 遠方城市剪影：顏色接近霧色，只帶出層次
  const mat = std(new THREE.Color(ADULT_LIGHTING[theme].fog[0]).multiplyScalar(.62).getHex(), { roughness: 1 });
  for (let i = 0; i < 34; i++) { const a = rand(sides.includes(-1) ? -1.7 : .25, sides.includes(1) ? 1.7 : -.25), r = rand(70, 88), w = rand(6, 15), h = rand(10, 30); const m = k.mesh(new THREE.BoxGeometry(w, h, w), mat, Math.sin(a) * r, h / 2, -Math.cos(a) * r + 4); m.rotation.y = -a; }
}
function buildings(k, M, T, cfg, sides) {
  for (const side of sides) for (let i = 0; i < 7; i++) {
    const floors = 2 + Math.floor(Math.random() * 3), bays = 2 + Math.floor(Math.random() * 3), h = floors * 3.2, w = bays * 2.6, d = rand(5, 7);
    const facade = T.facade(pick(cfg.wall), cfg.night, i % 3).clone(); facade.repeat.set(bays / 4, floors / 4); facade.offset.set(0, 1 - floors / 4); facade.needsUpdate = true;
    const g = k.group(side * (13 + d / 2 + rand(0, 1.5)), 0, -10 - i * 11.5 + rand(-1, 1)); g.rotation.y = side * rand(-.04, .04);
    const wall = k.mesh(new THREE.BoxGeometry(d, h, w), std(0xffffff, { map: facade, roughness: .95 }), 0, h / 2, 0, g); wall.castShadow = wall.receiveShadow = true;
    k.mesh(new THREE.BoxGeometry(d + .3, .45, w + .3), M.darkConcrete, 0, h + .2, 0, g);
    const front = -side * (d / 2 + .02);
    if (Math.random() < .6) for (let f = 1; f < floors; f++) { const ac = k.mesh(new THREE.BoxGeometry(.5, .45, .7), M.metal, front - side * .25, f * 3.2 + .3, rand(-w / 2 + 1, w / 2 - 1), g); ac.castShadow = true; }
    if (Math.random() < .45) for (let f = 1; f < floors; f++) { k.mesh(new THREE.BoxGeometry(1, .08, 2.4), M.darkMetal, front - side * .5, f * 3.2 - .1, w * .2, g); const rail = k.mesh(new THREE.BoxGeometry(.04, .9, 2.4), M.darkMetal, front - side * .98, f * 3.2 + .35, w * .2, g); const stair = k.mesh(new THREE.BoxGeometry(.04, .08, 3.6), M.darkMetal, front - side * .5, f * 3.2 - 1.7, w * .2, g); stair.rotation.x = .75; rail.castShadow = true; }
    if (cfg.signs.length && Math.random() < .55) { const sign = k.mesh(new THREE.PlaneGeometry(2.6, .9), std(0xffffff, { map: T.sign(pick(cfg.signs), pick(['#d7c9a3', '#c0574a', '#8fb9c4'])), roughness: .8 }), front - side * .06, 3.1, rand(-w / 4, w / 4), g); sign.rotation.y = -side * Math.PI / 2; }
    if (Math.random() < .35) { const tank = k.group(rand(-d / 4, d / 4), h + .45, rand(-w / 4, w / 4), g); k.mesh(new THREE.CylinderGeometry(1, 1, 1.8, 14), M.wood, 0, 2.1, 0, tank); k.mesh(new THREE.ConeGeometry(1.05, .5, 14), M.darkMetal, 0, 3.25, 0, tank); for (const [dx, dz] of [[-.7, -.7], [.7, -.7], [-.7, .7], [.7, .7]]) k.mesh(new THREE.CylinderGeometry(.05, .05, 1.2, 5), M.darkMetal, dx, .6, dz, tank); }
    if (cfg.snow) k.mesh(new THREE.BoxGeometry(d + .35, .3, w + .35), M.snow, 0, h + .55, 0, g);
  }
}
function roadDetail(k, M, T, cfg, theme) {
  for (let z = 2; z > -82; z -= 6) { const m = k.mesh(new THREE.PlaneGeometry(.16, 2.8), M.lineYellow, 0, .018, z); m.rotation.x = -Math.PI / 2; }
  for (const side of [-1, 1]) { const m = k.mesh(new THREE.PlaneGeometry(.14, 84), M.lineWhite, side * 5.6, .017, -40); m.rotation.x = -Math.PI / 2; }
  for (let z = -6; z > -80; z -= 19) { const m = k.mesh(new THREE.CircleGeometry(.4, 16), M.darkMetal, rand(-3, 3), .02, z); m.rotation.x = -Math.PI / 2; }
  if (theme !== 'snow') for (let i = 0; i < 7; i++) puddle(k, M, rand(-5, 5), rand(-75, -4), rand(.6, 1.6), rand(.4, 1.1));
  const paper = std(0xb8b2a0, { side: THREE.DoubleSide }); for (let i = 0; i < 60; i++) { const m = k.mesh(new THREE.PlaneGeometry(rand(.15, .3), rand(.2, .35)), paper, rand(-6.5, 6.5), .025, rand(-70, 0)); m.rotation.set(-Math.PI / 2, 0, rand(0, 6)); }
}
function litter(k, M, count) {
  for (let i = 0; i < count; i++) { const [x, z] = k.side(5.8, 8.5, -78, -2), kind = i % 5;
    if (kind === 0) cone(k, M, x, z);
    else if (kind === 1) { const t = k.mesh(new THREE.TorusGeometry(.32, .12, 8, 16), M.rubber, x, .12, z); t.rotation.x = Math.PI / 2 + rand(-.3, .3); }
    else if (kind === 2) for (let j = 0; j < 3; j++) { const b = k.mesh(new THREE.SphereGeometry(.32, 10, 8), M.bag, x + rand(-.4, .4), .22, z + rand(-.4, .4)); b.scale.set(1, .7, 1.1); }
    else if (kind === 3) barrel(k, M, x, z);
    else { const box = k.mesh(new THREE.BoxGeometry(.6, .45, .5), M.wood, x, .22, z); box.rotation.y = rand(0, 3); }
  }
}
// 油桶火焰與煙柱：用 Points 一次畫完，火焰附近放閃爍的點光源
function fireAndSmoke(k, T, sources, { lights = 2, smokeHeight = 9 } = {}) {
  if (!sources.length) return;
  const fireN = 22, smokeN = 16, firePos = new Float32Array(sources.length * fireN * 3), smokePos = new Float32Array(sources.length * smokeN * 3), seeds = Array.from({ length: sources.length * Math.max(fireN, smokeN) }, () => [Math.random(), rand(-.5, .5), rand(-.5, .5)]);
  const fireGeo = new THREE.BufferGeometry(), smokeGeo = new THREE.BufferGeometry(); fireGeo.setAttribute('position', new THREE.BufferAttribute(firePos, 3)); smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
  const fire = new THREE.Points(fireGeo, new THREE.PointsMaterial({ map: T.soft('rgba(255,190,90,1)', 'rgba(255,60,0,0)'), size: .9, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffa050 }));
  const smoke = new THREE.Points(smokeGeo, new THREE.PointsMaterial({ map: T.soft('rgba(255,255,255,.75)', 'rgba(255,255,255,0)'), size: 4.2, transparent: true, depthWrite: false, opacity: .4, color: 0x2b2a28 }));
  fire.frustumCulled = smoke.frustumCulled = false; k.root.add(fire, smoke);
  const flick = sources.slice(0, lights).map(([x, y, z]) => { const l = new THREE.PointLight(0xff8a3a, 8, 13, 1.6); l.position.set(x, y + .8, z); k.root.add(l); return l; });
  k.animated.push(t => {
    sources.forEach(([x, y, z], s) => {
      for (let i = 0; i < fireN; i++) { const [p, dx, dz] = seeds[s * fireN + i], life = (t * 1.6 + p) % 1, n = (s * fireN + i) * 3; firePos[n] = x + dx * .5 * (1 - life); firePos[n + 1] = y + life * 1.3; firePos[n + 2] = z + dz * .5 * (1 - life); }
      for (let i = 0; i < smokeN; i++) { const [p, dx, dz] = seeds[s * smokeN + i], life = (t * .12 + p) % 1, n = (s * smokeN + i) * 3; smokePos[n] = x + dx * 2 * life + life * 2.5; smokePos[n + 1] = y + 1 + life * smokeHeight; smokePos[n + 2] = z + dz * 2 * life; }
    });
    fireGeo.attributes.position.needsUpdate = true; smokeGeo.attributes.position.needsUpdate = true;
    flick.forEach((l, i) => { l.intensity = 7 + Math.sin(t * 13 + i * 3) * 1.6 + Math.random() * 1.8; });
  });
}

// ── 各關主題場景 ──
const SETS = {
  carnival(k, M, T) {
    addRuins(k, 'carnival', k.tex.grungeTexture);
    const wheel = k.group(11, 8, -58); wheel.rotation.y = -.25; k.mesh(new THREE.TorusGeometry(7.5, .16, 8, 48), M.rust, 0, 0, 0, wheel); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; k.mesh(new THREE.BoxGeometry(.1, 7.4, .1), M.metal, 0, 0, 0, wheel).rotation.z = a; if (i !== 3) k.mesh(new THREE.BoxGeometry(1.15, .7, .7), M.darkConcrete, Math.sin(a) * 7.5, Math.cos(a) * 7.5, 0, wheel); }
    for (const sx of [-1, 1]) { const leg = k.mesh(new THREE.CylinderGeometry(.16, .22, 9, 8), M.rust, 11 + sx * 3, 4, -58.6); leg.rotation.z = sx * .32; }
    // 倒塌的旋轉木馬與破帳篷
    const faded = std(0xffffff, { map: k.tex.canvasTexture(128, (g, s) => { for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#c9bfa6' : '#8e4a3c'; g.fillRect(i * s / 12, 0, s / 12 + 1, s); } for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(30,25,20,${rand(.05, .3)})`; g.fillRect(rand(0, s), rand(0, s), rand(1, 6), rand(1, 10)); } }), side: THREE.DoubleSide, roughness: 1 });
    const merry = k.group(-17, 0, -40); k.mesh(new THREE.CylinderGeometry(5.5, 5.8, .5, 28), M.concrete, 0, .25, 0, merry); const roof = k.mesh(new THREE.ConeGeometry(6.2, 2.6, 20, 1, true), faded, 1, 3.2, 0, merry); roof.rotation.z = .35;
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, h = i % 3 === 0 ? rand(1, 2) : 3.8; const pole = k.mesh(new THREE.CylinderGeometry(.05, .05, h, 6), M.yellow, Math.cos(a) * 4, .5 + h / 2, Math.sin(a) * 4, merry); pole.rotation.z = i % 3 === 0 ? .4 : 0; }
    for (const [x, z] of [[16, -30], [-12, -66]]) { const tent = k.mesh(new THREE.ConeGeometry(4, 5, 12, 1, true), faded, x, 2.5, z); tent.rotation.y = rand(0, 3); tent.scale.set(1, 1, .9); }
    return { cars: 5, burnt: .3, barrels: [[-5.8, -16], [6.2, -44]], props: 18 };
  },
  candy(k, M, T) {
    addRuins(k, 'candy', k.tex.grungeTexture, { bus: false, booth: false, plants: false });
    // 煙囪、管線架、貨櫃、儲槽
    const stack = std(0xffffff, { map: k.tex.canvasTexture(128, (g, s) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#8c8478' : '#7a3a2c'; g.fillRect(0, i * s / 8, s, s / 8 + 1); } for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(0,0,0,${rand(.05, .3)})`; g.fillRect(rand(0, s), rand(0, s), rand(1, 4), rand(2, 12)); } }), roughness: .95 });
    const tops = []; for (const [x, z, h] of [[-22, -50, 28], [-16, -62, 34], [20, -56, 30]]) { k.mesh(new THREE.CylinderGeometry(1.1, 1.6, h, 16), stack, x, h / 2, z); k.mesh(new THREE.TorusGeometry(1.2, .12, 6, 18).rotateX(Math.PI / 2), M.darkMetal, x, h - 1, z); tops.push([x, h, z]); }
    for (const z of [-26, -48]) { for (const side of [-1, 1]) { k.mesh(new THREE.BoxGeometry(.4, 7, .4), M.rust, side * 7.6, 3.5, z); k.mesh(new THREE.BoxGeometry(.25, .25, 3), M.rust, side * 7.6, 6.2, z); } for (const [y, r, mat] of [[6.6, .35, M.metal], [7.15, .22, M.rust], [6.1, .18, M.darkMetal]]) k.mesh(new THREE.CylinderGeometry(r, r, 16, 12).rotateZ(Math.PI / 2), mat, 0, y, z); k.mesh(new THREE.BoxGeometry(16, .12, 1.4), M.darkMetal, 0, 5.8, z); }
    const containerColors = ['#36566a', '#7b3326', '#3d5a3a', '#8a6a34'];
    for (let i = 0; i < 10; i++) { const [x, z, s] = k.side(9.5, 13, -70, -8), mat = std(0xffffff, { map: T.corrugated(containerColors[i % 4]), roughness: .7, metalness: .3 }); const c = k.mesh(new THREE.BoxGeometry(2.4, 2.6, 6), mat, x, 1.3, z); c.rotation.y = rand(-.15, .15); c.castShadow = true; if (i % 3 === 0) { const top = k.mesh(new THREE.BoxGeometry(2.4, 2.6, 6), std(0xffffff, { map: T.corrugated(containerColors[(i + 1) % 4]), roughness: .7, metalness: .3 }), x + rand(-.2, .2), 3.9, z + rand(-.4, .4)); top.rotation.y = rand(-.2, .2); } }
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) k.mesh(new THREE.CylinderGeometry(2.1, 2.1, 5, 20), M.metal, side * 17, 2.5, -20 - i * 16);
    for (const [x, z] of [[-6.9, -12], [6.9, -34], [-6.9, -56]]) { k.mesh(new THREE.CylinderGeometry(.08, .1, 6, 8), M.darkMetal, x, 3, z); k.mesh(new THREE.BoxGeometry(.6, .18, .3), M.darkMetal, x, 6, z); k.mesh(new THREE.BoxGeometry(.5, .06, .24), glow(0xffb05a), x, 5.9, z); }
    const sodium = new THREE.PointLight(0xffa04a, 10, 18, 1.5); sodium.position.set(-6, 5.5, -12); k.root.add(sodium);
    return { cars: 3, burnt: .5, barrels: [[5.9, -9], [-6.4, -30], [6.6, -52]], props: 16, smokeTops: tops };
  },
  snow(k, M, T) {
    addRuins(k, 'snow', k.tex.grungeTexture, { bus: false, booth: false, plants: false });
    // 軍用帳篷、沙包、雪堆、探照燈
    const canvas = std(0x4d5340, { roughness: 1, map: k.tex.grungeTexture('#5a6148', [2, 2], false) });
    for (const [x, z] of [[-11, -16], [-12, -32], [11.5, -24], [12, -44]]) { const g = k.group(x, 0, z); g.rotation.y = x < 0 ? .1 : -.1; k.mesh(new THREE.CylinderGeometry(2.2, 2.2, 6, 18, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), canvas, 0, 0, 0, g).castShadow = true; k.mesh(new THREE.CylinderGeometry(2.25, 2.25, 6, 18, 1, false, Math.PI * .25, Math.PI * .5).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), M.snow, 0, .05, 0, g); k.mesh(new THREE.PlaneGeometry(1.4, 1.4), std(0xffffff, { map: T.sign('QUARANTINE', '#d84a3c') }), 0, 1.1, 3.02, g); }
    for (const [x, z, r] of [[-4.8, -20, .1], [4.9, -36, -.1], [-5, -52, 0]]) sandbags(k, M, x, z, Math.PI / 2 + r, 3.6, 3);
    for (let i = 0; i < 26; i++) { const [x, z] = k.side(6, 12, -80, 2), d = k.mesh(new THREE.SphereGeometry(1, 12, 8), M.snow, x, 0, z); d.scale.set(rand(1, 2.4), rand(.25, .6), rand(1, 2.4)); }
    const beamMat = glow(0xdfe9ff, { transparent: true, opacity: .1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), beams = [];
    for (const [x, z] of [[-6, -28], [6.5, -40]]) { k.mesh(new THREE.CylinderGeometry(.25, .3, 6.6, 8), M.darkMetal, x, 3.3, z); const head = k.dynamic(k.group(x, 6.8, z)); k.mesh(new THREE.CylinderGeometry(.35, .3, .6, 12).rotateX(Math.PI / 2), M.darkMetal, 0, 0, 0, head); k.mesh(new THREE.ConeGeometry(4, 32, 20, 1, true).translate(0, -16, 0).rotateX(-Math.PI / 2), beamMat, 0, 0, 0, head); beams.push(head); }
    k.animated.push(t => beams.forEach((b, i) => { b.rotation.y = Math.sin(t * .35 + i * 2) * .9 + (i ? -.6 : .6); b.rotation.x = -.35 + Math.sin(t * .5 + i) * .1; }));
    k.floaters(900, 0xeef3f6, [-24, 24, .2, 16, -80, 6], .07, .5);
    return { cars: 4, burnt: .1, snowCars: true, barrels: [[-5.9, -24]], props: 12 };
  },
  beach(k, M, T) {
    addRuins(k, 'beach', k.tex.grungeTexture, { booth: false, tower: false, gate: false });
    // 會起伏的海面、碼頭、沉船、救生員塔
    const seaGeo = new THREE.PlaneGeometry(60, 130, 40, 60).rotateX(-Math.PI / 2), seaBase = seaGeo.attributes.position.array.slice();
    const sea = k.dynamic(k.mesh(seaGeo, std(0x2a3c44, { metalness: .5, roughness: .22, transparent: true, opacity: .95 }), -38, .02, -40));
    k.animated.push(t => { const p = seaGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = seaBase[i * 3], z = seaBase[i * 3 + 2]; p.setY(i, Math.sin(x * .35 + t * 1.3) * .18 + Math.sin(z * .22 - t * .9) * .22); } p.needsUpdate = true; seaGeo.computeVertexNormals(); });
    const foam = k.dynamic(k.mesh(new THREE.PlaneGeometry(2, 130), glow(0xd8dcd6, { transparent: true, opacity: .35 }), -8.3, .06, -40)); foam.rotation.x = -Math.PI / 2; k.animated.push(t => { foam.position.x = -8.3 + Math.sin(t * .7) * .7; foam.material.opacity = .25 + Math.sin(t * .7) * .1; });
    for (let z = -20; z > -60; z -= 3) for (const dx of [-1.4, 1.4]) k.mesh(new THREE.CylinderGeometry(.16, .18, 4, 8), M.wood, -18 + dx, .5, z); k.mesh(new THREE.BoxGeometry(3.4, .22, 42), M.wood, -18, 2.4, -40); for (let z = -19; z > -61; z -= 2) k.mesh(new THREE.CylinderGeometry(.04, .04, 1, 5), M.wood, -19.6, 3, z);
    const hull = k.group(-11.5, .3, -30); hull.rotation.set(.12, .8, .35); const hullShape = outline([[-4, .2], [3.2, .2], [4.4, 2.2], [-4.2, 2.4]]); k.mesh(sideExtrude(hullShape, 2.6, .2), M.rust, 0, 0, 0, hull).castShadow = true; k.mesh(new THREE.BoxGeometry(2.2, 1.4, 2), M.white, 0, 3, .8, hull);
    const tower = k.group(11, 0, -30); for (const [dx, dz] of [[-.8, -.8], [.8, -.8], [-.8, .8], [.8, .8]]) k.mesh(new THREE.CylinderGeometry(.07, .07, 3.4, 6), M.wood, dx, 1.7, dz, tower); k.mesh(new THREE.BoxGeometry(2.2, 1.4, 2.2), std(0x8e4a3c, { roughness: 1 }), 0, 4, 0, tower); k.mesh(new THREE.ConeGeometry(1.9, .9, 4).rotateY(Math.PI / 4), M.wood, 0, 5.15, 0, tower);
    for (const [x, z] of [[5.6, -18], [-5.5, -38]]) sandbags(k, M, x, z, Math.PI / 2, 3, 2);
    // 救難信號彈：紅色閃爍
    const flare = new THREE.PointLight(0xff3a2a, 6, 12, 1.6); flare.position.set(6.4, .6, -26); k.root.add(flare); k.mesh(new THREE.SphereGeometry(.12, 8, 6), glow(0xff5a4a), 6.4, .15, -26);
    k.animated.push(t => { flare.intensity = 4 + Math.sin(t * 9) * 1.5 + Math.random() * 1.5; });
    return { cars: 5, burnt: .6, barrels: [[-6.2, -14], [6.3, -46]], props: 14, buildingSides: [1] };
  },
  graveyard(k, M, T) {
    // 墓碑、陵墓、枯樹、鐵柵欄、教堂破窗、燭光與地面霧氣
    const stone = std(0x8f8d86, { map: k.tex.grungeTexture('#8f8d86', [1, 1]), roughness: 1 });
    for (let i = 0; i < 40; i++) { const [x, z] = k.side(7.6, 16, -78, -2), g = k.group(x, 0, z); g.rotation.set(0, rand(-.3, .3), rand(-.1, .1)); const kind = i % 3, h = rand(.9, 1.6); if (kind === 0) { const s = k.mesh(new THREE.CapsuleGeometry(.35, h * .6, 4, 10), stone, 0, h * .55, 0, g); s.scale.z = .32; s.castShadow = true; } else if (kind === 1) { k.mesh(new THREE.BoxGeometry(.22, h * 1.2, .2), stone, 0, h * .6, 0, g); k.mesh(new THREE.BoxGeometry(.8, .2, .2), stone, 0, h * .85, 0, g); } else { k.mesh(new THREE.BoxGeometry(.85, h, .24), stone, 0, h / 2, 0, g); k.mesh(new THREE.BoxGeometry(1, .14, .34), stone, 0, .07, 0, g); } }
    for (const [x, z] of [[-14, -30], [15, -48]]) { const g = k.group(x, 0, z); g.rotation.y = x < 0 ? .5 : -.5; k.mesh(new THREE.BoxGeometry(4, 3.4, 4.5), stone, 0, 1.7, 0, g).castShadow = true; k.mesh(new THREE.CylinderGeometry(3.3, 3.3, 4.8, 3).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2).rotateY(Math.PI / 2), stone, 0, 4.1, 0, g).scale.y = .4; for (const dx of [-1.4, -.5, .5, 1.4]) k.mesh(new THREE.CylinderGeometry(.18, .2, 3.2, 10), stone, dx, 1.6, 2.4, g); k.mesh(new THREE.BoxGeometry(1.3, 2.2, .1), M.darkMetal, 0, 1.1, 2.26, g); }
    const bark = std(0x2a2522, { roughness: 1 });
    for (let i = 0; i < 12; i++) { const [x, z] = k.side(10, 24), g = k.group(x, 0, z), h = rand(4, 7); k.mesh(new THREE.CylinderGeometry(.16, .38, h, 7), bark, 0, h / 2, 0, g).castShadow = true; for (let j = 0; j < 5; j++) { const len = rand(1.2, 2.6), br = k.mesh(new THREE.CylinderGeometry(.03, .1, len, 5).translate(0, len / 2, 0), bark, 0, h * rand(.45, .95), 0, g); br.rotation.set(rand(-.3, .3), rand(0, 6.3), rand(.6, 1.2) * (j % 2 ? 1 : -1)); } }
    const iron = std(0x1d1e20, { metalness: .6, roughness: .5 });
    for (const side of [-1, 1]) { for (let z = 2; z > -76; z -= .7) { k.mesh(new THREE.CylinderGeometry(.025, .025, 1.5, 5), iron, side * 7.2, .75, z); k.mesh(new THREE.ConeGeometry(.05, .14, 5), iron, side * 7.2, 1.55, z); } for (const y of [.35, 1.25]) k.mesh(new THREE.BoxGeometry(.05, .05, 78), iron, side * 7.2, y, -37); }
    const chapel = k.group(-6, 0, -70); k.mesh(new THREE.BoxGeometry(8, 9, 6), stone, 0, 4.5, 0, chapel); k.mesh(new THREE.CylinderGeometry(4.6, 4.6, 6.2, 3).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2).rotateY(Math.PI / 2), stone, 0, 10.4, 0, chapel).scale.y = .45; k.mesh(new THREE.BoxGeometry(2, 14, 2), stone, 3.4, 7, 2, chapel); k.mesh(new THREE.ConeGeometry(1.6, 4, 4).rotateY(Math.PI / 4), M.darkMetal, 3.4, 16, 2, chapel);
    const stained = std(0xffffff, { map: k.tex.canvasTexture(128, (g, s) => { const cols = ['#7a3a8a', '#c58a2a', '#2a5a8a', '#8a2a2a']; for (let i = 0; i < 40; i++) { g.fillStyle = pick(cols); g.beginPath(); g.moveTo(rand(0, s), rand(0, s)); g.lineTo(rand(0, s), rand(0, s)); g.lineTo(rand(0, s), rand(0, s)); g.fill(); } g.strokeStyle = '#111'; g.lineWidth = 3; for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(rand(0, s), 0); g.lineTo(rand(0, s), s); g.stroke(); } }), emissive: 0xffffff, emissiveIntensity: .55 });
    const win = new THREE.Shape(); win.moveTo(-1, 0); win.lineTo(1, 0); win.lineTo(1, 2.2); win.absarc(0, 2.2, 1, 0, Math.PI, false); win.closePath(); k.mesh(new THREE.ShapeGeometry(win), stained, 0, 3, 3.02, chapel);
    const candles = []; for (let i = 0; i < 26; i++) { const [x, z] = k.side(7.8, 13, -70, -3); k.mesh(new THREE.CylinderGeometry(.04, .04, .18, 6), M.white, x, .09, z); candles.push([x, .24, z]); }
    k.bulbs(candles, { palette: [0xffc070, 0xffa850, 0xffd890], size: .05, rate: 6 });
    for (const [x, z] of [[-9, -20], [9, -38]]) { const l = new THREE.PointLight(0xffa860, 6, 11, 1.6); l.position.set(x, 1, z); k.root.add(l); k.animated.push(t => { l.intensity = 5 + Math.sin(t * 11 + x) + Math.random(); }); }
    const fogTex = T.soft('rgba(170,180,185,.55)', 'rgba(170,180,185,0)'), mists = [];
    for (let i = 0; i < 12; i++) { const m = k.dynamic(k.mesh(new THREE.PlaneGeometry(16, 16), glow(0xffffff, { map: fogTex, transparent: true, depthWrite: false, opacity: .6 }), rand(-20, 20), .25 + i * .03, rand(-70, -4))); m.rotation.x = -Math.PI / 2; mists.push([m, m.position.x, rand(0, 6)]); }
    k.animated.push(t => mists.forEach(([m, x, p]) => { m.position.x = x + Math.sin(t * .15 + p) * 3; }));
    return { cars: 2, burnt: .5, barrels: [], props: 6, gate: true };
  },
  moon(k, M, T) {
    // 地球與行星、居住艙、太陽能板、天線塔、月球車、降落平台
    const earthTex = k.tex.canvasTexture(256, (g, s) => { g.fillStyle = '#1f5fb8'; g.fillRect(0, 0, s, s); g.fillStyle = '#4f8a46'; for (let i = 0; i < 14; i++) { g.beginPath(); g.ellipse(rand(0, s), rand(0, s), rand(15, 45), rand(10, 30), rand(0, 3), 0, 7); g.fill(); } g.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < 24; i++) { g.beginPath(); g.ellipse(rand(0, s), rand(0, s), rand(15, 45), rand(3, 8), rand(-.3, .3), 0, 7); g.fill(); } });
    const earth = k.dynamic(k.mesh(new THREE.SphereGeometry(10, 36, 24), std(0xffffff, { map: earthTex, roughness: .7, fog: false }), -30, 40, -85)); k.animated.push(t => { earth.rotation.y = t * .03; });
    const hull = std(0xd9dde2, { metalness: .35, roughness: .45, map: k.tex.grungeTexture('#dfe2e6', [2, 2], false) }), win = glow(0xffd99a);
    for (const [x, z, r] of [[-13, -22, .2], [14, -30, -.3], [-15, -46, -.1]]) { const g = k.group(x, 0, z); g.rotation.y = r; k.mesh(new THREE.CylinderGeometry(2.2, 2.2, 9, 22).rotateZ(Math.PI / 2), hull, 0, 2.4, 0, g).castShadow = true; for (const dx of [-4.5, 4.5]) k.mesh(new THREE.SphereGeometry(2.2, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ(dx < 0 ? Math.PI / 2 : -Math.PI / 2), hull, dx, 2.4, 0, g); for (const dx of [-2.5, 0, 2.5]) { k.mesh(new THREE.TorusGeometry(2.25, .09, 6, 24).rotateY(Math.PI / 2), M.darkMetal, dx, 2.4, 0, g); k.mesh(new THREE.CircleGeometry(.32, 16), win, dx + 1.2, 2.6, 2.19, g); } for (const dx of [-3, 3]) for (const dz of [-1.3, 1.3]) k.mesh(new THREE.BoxGeometry(.25, .9, .25), M.darkMetal, dx, .45, dz, g); }
    const panelTex = k.tex.canvasTexture(128, (g, s) => { g.fillStyle = '#16264a'; g.fillRect(0, 0, s, s); g.strokeStyle = '#8ea6c8'; g.lineWidth = 2; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * s / 8, 0); g.lineTo(i * s / 8, s); g.stroke(); g.beginPath(); g.moveTo(0, i * s / 4); g.lineTo(s, i * s / 4); g.stroke(); } }), panel = std(0xffffff, { map: panelTex, metalness: .6, roughness: .25 });
    for (const side of [-1, 1]) for (let i = 0; i < 5; i++) { const x = side * 20, z = -12 - i * 7; k.mesh(new THREE.CylinderGeometry(.08, .08, 1.6, 6), M.metal, x, .8, z); const p = k.mesh(new THREE.BoxGeometry(4, .06, 2.2), panel, x, 1.7, z); p.rotation.z = side * .5; }
    const tower = k.group(17, 0, -60); for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const leg = k.mesh(new THREE.CylinderGeometry(.06, .06, 16, 5), M.metal, dx * .6, 8, dz * .6, tower); leg.rotation.set(dz * -.06, 0, dx * .06); } for (let y = 1; y < 16; y += 2) k.mesh(new THREE.BoxGeometry(2.4 - y * .08, .05, .05), M.metal, 0, y, 1.2 - y * .04, tower); k.mesh(new THREE.SphereGeometry(1.6, 18, 10, 0, Math.PI * 2, 0, Math.PI / 3), std(0xeeeeee, { side: THREE.DoubleSide, metalness: .3, roughness: .4 }), 0, 16, 0, tower).rotation.x = -1;
    const blink = new THREE.PointLight(0xff3030, 3, 8); blink.position.set(17, 17, -60); k.root.add(blink); k.animated.push(t => { blink.intensity = Math.sin(t * 3) > .6 ? 5 : 0; });
    const rover = k.group(-7, 0, -14); rover.rotation.y = .7; k.mesh(new THREE.BoxGeometry(1.8, .5, 3), hull, 0, .9, 0, rover).castShadow = true; k.mesh(new THREE.BoxGeometry(1.5, .7, 1.2), M.glass, 0, 1.4, -.5, rover); for (const dx of [-1, 1]) for (const dz of [-1.1, 0, 1.1]) k.mesh(new THREE.CylinderGeometry(.38, .38, .3, 14).rotateZ(Math.PI / 2), M.rubber, dx * 1.05, .38, dz, rover); k.mesh(new THREE.CylinderGeometry(.03, .03, 1.4, 5), M.metal, .6, 1.8, 1, rover);
    k.mesh(new THREE.CylinderGeometry(6, 6, .2, 32), M.concrete, 0, .1, -64); const pad = []; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; pad.push([Math.cos(a) * 5.6, .25, -64 + Math.sin(a) * 5.6]); } k.bulbs(pad, { palette: [0x6bf0ff, 0x1a3a44], size: .12, rate: 4 });
    const crater = std(0x5d6068, { roughness: 1 }); for (let i = 0; i < 14; i++) { const [x, z] = k.side(7, 26), r = rand(1.2, 3); const rim = k.mesh(new THREE.TorusGeometry(r, r * .2, 8, 24), crater, x, .04, z); rim.rotation.x = -Math.PI / 2; rim.scale.z = .35; }
    for (let i = 0; i < 12; i++) { const [x, z] = k.side(6, 12, -70, -4); const c = k.mesh(new THREE.BoxGeometry(1, .8, 1), std(0x9a9b8e, { roughness: .8 }), x, .4, z); c.rotation.y = rand(0, 3); }
    k.floaters(200, 0xa9adb5, [-18, 18, .3, 10, -80, 4], .05, .15);
    return { cars: 0, barrels: [], props: 0, noStreet: true };
  }
};

export function adultEnvironment(k, theme, tex) {
  const cfg = ADULT_SCENES[theme], T = textures(tex), M = materials(cfg, T, tex);
  k.tex = tex;
  k.sky(cfg.sky, { stars: cfg.night ? (theme === 'moon' ? 1200 : 350) : 0, starSize: .2 });
  if (cfg.sun) k.disc(cfg.sun[0], 3.4, cfg.sun[1], cfg.sun[2], cfg.sun[3], 3);
  if (cfg.moon) k.disc(cfg.moon[0], 2.6, cfg.moon[1], cfg.moon[2], cfg.moon[3], 2.4);
  if (!cfg.night) { const cloud = new THREE.SpriteMaterial({ map: T.soft('rgba(240,236,224,.7)', 'rgba(240,236,224,0)'), transparent: true, depthWrite: false, opacity: .55, fog: false }); for (let i = 0; i < 18; i++) { const c = new THREE.Sprite(cloud); c.position.set(rand(-70, 70), rand(18, 34), rand(-88, -55)); c.scale.set(rand(14, 28), rand(4, 8), 1); k.root.add(c); } }
  k.ground(tex.grungeTexture(cfg.ground, [12, 26], !cfg.snow && theme !== 'moon'), T.asphalt(cfg.path), theme === 'moon' ? 0x3f4850 : 0x4a4a46);
  const set = SETS[theme](k, M, T);
  if (!set.noStreet) {
    const sides = set.buildingSides || [-1, 1]; roadDetail(k, M, T, cfg, theme); skyline(k, theme, sides); buildings(k, M, T, cfg, sides); powerLines(k, M); litter(k, M, set.props);
    for (let i = 0; i < set.cars; i++) { const side = i % 2 ? 1 : -1, z = -8 - i * (60 / Math.max(1, set.cars)) + rand(-2, 2); car(k, M, side * rand(4.2, 6.2), z, side * rand(.1, .5) + (Math.random() < .3 ? Math.PI : 0), Math.random() < set.burnt ? 'burnt' : set.snowCars ? 'snow' : 'normal'); }
    for (const [x, z] of [[-4.6, -26], [4.8, -58]]) jersey(k, M, x, z, rand(-.3, .3));
    const signs = { carnival: ['DETOUR', 'PARK CLOSED'], candy: ['DANGER', 'NO ENTRY'], snow: ['STOP', 'QUARANTINE'], beach: ['EVACUATION', 'ROAD CLOSED'], graveyard: ['CEMETERY', 'CURFEW'] }[theme];
    signs.forEach((text, i) => streetSign(k, M, T, (i ? 1 : -1) * 6.4, -14 - i * 22, text, (i ? -1 : 1) * .3));
  }
  for (const [x, z] of set.barrels) barrel(k, M, x, z, true);
  fireAndSmoke(k, T, [...set.barrels.map(([x, z]) => [x, .95, z]), ...(set.smokeTops || []).map(([x, h, z]) => [x, h, z])], { smokeHeight: set.smokeTops ? 14 : 8 });
}
