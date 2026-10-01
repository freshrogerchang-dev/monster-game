import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { bakeStatic } from './scene.js?v=flame1';
import { surface } from './surface.js?v=flame1';

// 第一人稱槍械模型：以側面輪廓擠出（ExtrudeGeometry）與車床旋轉體（LatheGeometry）製作，
// 建好後依材質合併成少數網格。座標：f = 往前的距離（實際是 -z），y = 往上，x = 左右。

const V3 = THREE.Vector3;
function outline(points, holes = []) {
  const s = new THREE.Shape(); points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath();
  for (const hole of holes) { const p = new THREE.Path(); hole.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath(); s.holes.push(p); }
  return s;
}
// 側面輪廓（x = 往前，y = 往上）往左右擠出 width 的厚度
function side(g, shape, width, mat, bevel = .003) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 10 });
  geo.translate(0, 0, -width / 2); geo.rotateY(Math.PI / 2);
  const m = new THREE.Mesh(geo, mat); g.add(m); return m;
}
// 正面輪廓（x = 左右，y = 往上）往前擠出 length，從 f0 開始
function tube(g, shape, length, mat, f0, y, bevel = .002) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 8 });
  geo.translate(0, 0, -length); const m = new THREE.Mesh(geo, mat); m.position.set(0, y, -f0); g.add(m); return m;
}
function rod(g, r0, r1, f0, f1, y, mat, x = 0, seg = 18, open = false) {
  const geo = new THREE.CylinderGeometry(r1, r0, f1 - f0, seg, 1, open).rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, -(f0 + f1) / 2); g.add(m); return m;
}
// 繞著往前軸旋轉的車床體，points = [[半徑, f], ...]
function lathe(g, points, mat, y, x = 0, seg = 28) {
  const geo = new THREE.LatheGeometry(points.map(([r, f]) => new THREE.Vector2(r, f)), seg).rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, 0); g.add(m); return m;
}
function box(g, w, h, l, mat, f, y, x = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), mat); m.position.set(x, y, -f); g.add(m); return m; }
function limb(g, a, b, r0, r1, mat, seg = 16) {
  const A = new V3(...a), d = new V3(...b).sub(A), m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, d.length(), seg), mat);
  m.position.copy(A).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); g.add(m); return m;
}
function canvasMap(w, h, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 4; return t;
}
function grain(repeat) { const t = surface('metal').clone(); t.repeat.set(repeat, repeat); t.needsUpdate = true; return t; }

function materials() {
  const metalGrain = grain(9), fabric = surface('fabric').clone(); fabric.repeat.set(3, 3); fabric.needsUpdate = true;
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, ...extra });
  return {
    receiver: std(0x2c3033, { metalness: .6, roughness: .42, bumpMap: metalGrain, bumpScale: .0015 }),
    barrel: std(0x3b3f41, { metalness: .85, roughness: .32 }),
    polymer: std(0x1e2123, { metalness: .05, roughness: .78, bumpMap: metalGrain, bumpScale: .002 }),
    tan: std(0x7f6d50, { metalness: .04, roughness: .82, bumpMap: metalGrain, bumpScale: .002 }),
    dark: std(0x0d0e0f, { roughness: .6, metalness: .3 }),
    rubber: std(0x141515, { roughness: .96 }),
    glass: std(0x5e9aa8, { transparent: true, opacity: .28, roughness: .05, metalness: .2, emissive: 0x0a2228, emissiveIntensity: .4 }),
    lens: std(0x13323a, { metalness: .7, roughness: .08, emissive: 0x051418 }),
    reticle: new THREE.MeshBasicMaterial({ color: 0xff3b30 }),
    olive: std(0x4a5036, { metalness: .35, roughness: .58, bumpMap: metalGrain, bumpScale: .002 }),
    brass: std(0xb08d4a, { metalness: .85, roughness: .35 }),
    glove: std(0x2a2c29, { map: fabric, roughness: .92 }),
    knuckle: std(0x161716, { roughness: .7 }),
    sleeve: std(0x5d5c48, { map: fabric, roughness: 1 }),
    cuff: std(0x3a3b2f, { map: fabric, roughness: 1 })
  };
}

// 共用：下機匣、握把、扳機護弓、扳機
function lowerAndGrip(g, m, gripMat) {
  side(g, outline([[-.12, 0], [.2, 0], [.2, -.03], [.125, -.035], [.105, -.06], [.02, -.06], [0, -.04], [-.12, -.04]]), .056, m.receiver);
  side(g, outline([[-.064, -.035], [-.012, -.035], [-.03, -.172], [-.072, -.18], [-.09, -.166]]), .048, gripMat, .006);
  for (let i = 0; i < 4; i++) box(g, .05, .004, .006, m.dark, -.04 - i * .006, -.07 - i * .025, 0);
  side(g, outline([[-.014, -.038], [.052, -.038], [.052, -.076], [-.014, -.076]], [[[-.006, -.044], [.044, -.044], [.044, -.069], [-.006, -.069]]]), .012, m.receiver, .002);
  side(g, outline([[.006, -.044], [.016, -.044], [.013, -.068], [.003, -.064]]), .006, m.dark, .001);
}
// 戴手套的手：fingers 繞著一根往下的握柄（握柄局部座標：y 往上），palmSide = 手背在哪一側
function glove(g, m, at, tilt, side = 1) {
  const h = new THREE.Group(); h.position.copy(at); h.rotation.set(tilt, 0, 0); g.add(h);
  const back = new THREE.Mesh(new THREE.CapsuleGeometry(.03, .06, 6, 12), m.glove); back.scale.set(.95, 1, .62); back.position.set(side * .03, -.01, .012); h.add(back);
  const knuckles = new THREE.Mesh(new THREE.CapsuleGeometry(.012, .05, 4, 8), m.knuckle); knuckles.position.set(side * .045, .0, -.012); h.add(knuckles);
  for (let i = 0; i < 4; i++) {
    const y = .025 - i * .023, len = i === 3 ? .03 : .038;
    const f = new THREE.Mesh(new THREE.CapsuleGeometry(.0115, len, 4, 8), m.glove); f.rotation.z = Math.PI / 2; f.position.set(side * .006, y, -.03); h.add(f);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(.012, 8, 6), m.glove); tip.position.set(-side * .026, y, -.018); h.add(tip);
  }
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(.012, .045, 4, 8), m.glove); thumb.rotation.set(.9, 0, side * .3); thumb.position.set(-side * .024, .04, .006); h.add(thumb);
  return h;
}
function arm(g, m, wrist, elbow) {
  limb(g, wrist, elbow, .036, .05, m.sleeve);
  const cuff = limb(g, wrist, new V3(...wrist).lerp(new V3(...elbow), .12).toArray(), .038, .039, m.cuff); return cuff;
}

function buildRifle(m) {
  const g = new THREE.Group();
  lowerAndGrip(g, m, m.tan);
  side(g, outline([[-.12, 0], [.22, 0], [.22, .062], [.2, .074], [-.1, .074], [-.12, .06]]), .06, m.receiver);
  for (const s of [-1, 1]) { box(g, .004, .022, .07, m.dark, .09, .035, s * .031); box(g, .004, .012, .03, m.dark, -.02, .02, s * .03); }
  box(g, .012, .018, .018, m.receiver, .02, .055, .034);
  // 彎曲的彈匣
  const mag = new THREE.Shape(); mag.moveTo(.025, -.055); mag.lineTo(.098, -.055); mag.quadraticCurveTo(.115, -.16, .152, -.245); mag.lineTo(.088, -.264); mag.quadraticCurveTo(.056, -.17, .025, -.055);
  side(g, mag, .05, m.tan, .004);
  for (let i = 0; i < 3; i++) box(g, .052, .004, .05, m.dark, .065 + i * .015, -.1 - i * .045, 0).rotation.x = -.35;
  // 槍托（中間有挖空）＋ 托底橡膠 ＋ 緩衝管
  side(g, outline([[-.12, .058], [-.12, -.028], [-.2, -.034], [-.37, -.085], [-.43, -.092], [-.44, .07], [-.3, .074]], [[[-.355, .045], [-.245, .045], [-.245, .004], [-.355, -.036]]]), .05, m.tan, .005);
  side(g, outline([[-.452, .078], [-.43, .078], [-.43, -.096], [-.452, -.1]]), .056, m.rubber, .003);
  rod(g, .017, .017, -.3, -.12, .035, m.receiver);
  // 護木：兩側有 M-LOK 長孔，可以看見裡面的槍管
  const slots = []; for (let i = 0; i < 5; i++) { const x = .255 + i * .064; slots.push([[x, .008], [x + .042, .008], [x + .042, .026], [x, .026]]); }
  side(g, outline([[.215, -.026], [.585, -.026], [.585, .066], [.215, .066]], slots), .066, m.receiver, .006);
  rod(g, .011, .011, .2, .74, .022, m.barrel);
  rod(g, .019, .019, .725, .795, .022, m.dark, 0, 18); for (const s of [-1, 1]) for (let i = 0; i < 3; i++) box(g, .006, .012, .011, m.rubber, .738 + i * .02, .022, s * .017);
  // 上方皮卡汀尼導軌
  box(g, .026, .008, .69, m.receiver, .24, .078); for (let f = -.085; f < .58; f += .02) box(g, .03, .006, .008, m.receiver, f, .085);
  box(g, .05, .008, .02, m.dark, -.11, .07);
  // 前握把
  const fg = rod(g, .016, .018, 0, .1, 0, m.polymer); fg.rotation.x = 0; fg.geometry.rotateX(Math.PI / 2); fg.position.set(0, -.075, -.43);
  // 全像瞄準鏡：中空外框可以看穿，裡面有紅點
  tube(g, outline([[-.02, 0], [.02, 0], [.02, .044], [-.02, .044]], [[[-.016, .009], [.016, .009], [.016, .039], [-.016, .039]]]), .062, m.polymer, .03, .088);
  box(g, .032, .01, .055, m.receiver, .06, .085); box(g, .006, .012, .016, m.dark, .055, .112, .024);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(.032, .03), m.glass); glass.position.set(0, .112, -.08); g.add(glass);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(.0025, 10), m.reticle); dot.position.set(0, .112, -.079); g.add(dot);
  const ring = new THREE.Mesh(new THREE.RingGeometry(.007, .0085, 24), m.reticle); ring.position.copy(dot.position); g.add(ring);
  // 雙手
  glove(g, m, new V3(.0, -.08, .05), -.32, 1); arm(g, m, [.03, -.14, .09], [.16, -.42, .32]);
  glove(g, m, new V3(0, -.09, -.43), 0, -1); arm(g, m, [-.03, -.13, -.41], [-.2, -.5, -.12]);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, .022, -.81); g.add(muzzle);
  return { g, muzzle };
}

function buildSniper(m) {
  const g = new THREE.Group();
  lowerAndGrip(g, m, m.polymer);
  side(g, outline([[-.12, 0], [.24, 0], [.24, .06], [.22, .07], [-.1, .07], [-.12, .058]]), .062, m.receiver);
  // 槍機拉柄
  limb(g, [.03, .045, -.06], [.075, .02, -.06], .006, .006, m.barrel); const knob = new THREE.Mesh(new THREE.SphereGeometry(.012, 12, 8), m.dark); knob.position.set(.078, .018, -.06); g.add(knob);
  side(g, outline([[.03, -.055], [.1, -.055], [.1, -.12], [.03, -.12]]), .05, m.dark, .003);
  // 狙擊槍托：有腮墊與握把孔
  side(g, outline([[-.12, .058], [-.12, -.04], [-.22, -.05], [-.42, -.1], [-.48, -.105], [-.49, .07], [-.34, .07], [-.3, .1], [-.18, .1], [-.16, .07]], [[[-.4, .04], [-.27, .04], [-.27, -.005], [-.4, -.06]]]), .054, m.polymer, .006);
  side(g, outline([[-.5, .074], [-.48, .074], [-.48, -.108], [-.5, -.112]]), .058, m.rubber);
  // 長護木＋凹槽槍管＋滅音器
  side(g, outline([[.235, -.03], [.56, -.022], [.56, .055], [.235, .062]]), .06, m.polymer, .008);
  rod(g, .013, .011, .2, .98, .02, m.barrel);
  for (let i = 0; i < 6; i++) box(g, .002, .004, .3, m.dark, .74, .02 + Math.sin(i) * .009, Math.cos(i) * .012);
  lathe(g, [[0, .96], [.022, .962], [.024, .975], [.024, 1.13], [.02, 1.14], [0, 1.141]], m.polymer, .02);
  // 收起的兩腳架
  for (const s of [-1, 1]) limb(g, [s * .02, -.03, -.5], [s * .028, -.035, -.25], .006, .006, m.barrel);
  box(g, .05, .02, .03, m.dark, .52, -.03);
  // 狙擊鏡（車床旋轉體）
  const scopeY = .135;
  lathe(g, [[.0, -.1], [.024, -.1], [.027, -.09], [.027, -.035], [.018, -.015], [.017, .17], [.02, .19], [.034, .25], [.034, .3], [.03, .305], [0, .305]], m.dark, scopeY);
  for (const f of [-.098, .303]) { const lens = new THREE.Mesh(new THREE.CircleGeometry(f < 0 ? .022 : .029, 24), m.lens); lens.position.set(0, scopeY, -f); if (f < 0) lens.rotation.y = Math.PI; g.add(lens); }
  rod(g, .011, .011, .05, .078, scopeY + .028, m.dark).geometry.rotateX(Math.PI / 2); box(g, .022, .018, .022, m.dark, .065, scopeY + .028);
  const turret = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .02, 16).rotateZ(Math.PI / 2), m.dark); turret.position.set(.026, scopeY, -.065); g.add(turret);
  for (const f of [.0, .14]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(.0195, .006, 8, 24), m.receiver); ring.position.set(0, scopeY, -f); g.add(ring); box(g, .024, .045, .018, m.receiver, f, .1); }
  box(g, .026, .008, .4, m.receiver, .06, .074);
  glove(g, m, new V3(.0, -.08, .05), -.32, 1); arm(g, m, [.03, -.14, .09], [.16, -.42, .32]);
  glove(g, m, new V3(0, -.04, -.38), .2, -1).scale.set(1, .9, 1); arm(g, m, [-.03, -.09, -.36], [-.2, -.5, -.08]);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, .02, -1.16); g.add(muzzle);
  return { g, muzzle };
}

function buildFlamer(m) {
  const g = new THREE.Group();
  side(g, outline([[-.064, -.035], [-.012, -.035], [-.03, -.172], [-.072, -.18], [-.09, -.166]]), .05, m.rubber, .006);
  side(g, outline([[-.014, -.038], [.052, -.038], [.052, -.076], [-.014, -.076]], [[[-.006, -.044], [.044, -.044], [.044, -.069], [-.006, -.069]]]), .012, m.olive, .002);
  side(g, outline([[.006, -.044], [.016, -.044], [.013, -.068], [.003, -.064]]), .006, m.dark, .001);
  // 機身與閥門
  side(g, outline([[-.13, -.035], [.16, -.035], [.19, -.005], [.19, .05], [.02, .065], [-.09, .058], [-.14, .02]]), .072, m.olive, .006);
  for (const s of [-1, 1]) { box(g, .004, .03, .1, m.dark, .06, .015, s * .038); rod(g, .012, .012, -.04, -.01, .03, m.brass, s * .04, 12); }
  const valve = new THREE.Mesh(new THREE.TorusGeometry(.022, .005, 6, 18), m.dark); valve.position.set(0, .085, -.06); valve.rotation.x = Math.PI / 2; g.add(valve); rod(g, .004, .004, -.06, -.06 + .001, .07, m.dark);
  // 噴管＋有孔的隔熱罩＋噴嘴
  rod(g, .018, .018, .18, .66, .015, m.barrel);
  const holes = canvasMap(64, 64, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#000'; for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { c.beginPath(); c.arc(16 + x * 32 + (y % 2) * 16, 16 + y * 32, 9, 0, 7); c.fill(); } }, [10, 6]);
  const shield = new THREE.MeshStandardMaterial({ color: 0x3a3c3a, metalness: .75, roughness: .4, alphaMap: holes, alphaTest: .5, side: THREE.DoubleSide });
  rod(g, .036, .036, .24, .6, .015, shield, 0, 28, true);
  for (const f of [.24, .6]) { const r = new THREE.Mesh(new THREE.TorusGeometry(.036, .004, 6, 24), m.receiver); r.position.set(0, .015, -f); g.add(r); }
  const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x2b2522, metalness: .8, roughness: .35, emissive: 0xff5a14, emissiveIntensity: 0 });
  const nozzle = lathe(g, [[.017, .6], [.024, .62], [.028, .67], [.034, .71], [.031, .715], [.016, .715]], nozzleMat, .015); nozzle.userData.dynamic = true;
  box(g, .016, .016, .06, m.brass, .67, -.022); rod(g, .004, .004, .7, .712, -.022, m.dark);
  // 燃料罐：紅色漆＋警示條紋，兩條束帶
  const tankMap = canvasMap(256, 128, (c, w, h) => { c.fillStyle = '#7d1d16'; c.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(0,0,0,${Math.random() * .2})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); } c.fillStyle = '#d8a51e'; c.fillRect(0, h * .42, w, h * .16); c.fillStyle = '#151515'; for (let x = -20; x < w; x += 22) { c.beginPath(); c.moveTo(x, h * .42); c.lineTo(x + 11, h * .42); c.lineTo(x + 22, h * .58); c.lineTo(x + 11, h * .58); c.fill(); } c.fillStyle = '#e8dcc0'; c.font = 'bold 22px monospace'; c.fillText('FUEL', 18, h * .3); c.fillText('FUEL', 150, h * .3); });
  const tank = new THREE.MeshStandardMaterial({ map: tankMap, metalness: .35, roughness: .5 });
  // LatheGeometry 的貼圖 v 是依點的順序分配，所以在罐身中間多放幾個點，讓警示條只在中段
  lathe(g, [[0, .02], [.038, .024], [.054, .036], [.06, .056], ...Array.from({ length: 9 }, (_, i) => [.06, .056 + (i + 1) * .0274]), [.054, .348], [.038, .358], [0, .362]], tank, -.1);
  for (const f of [.09, .29]) { const strap = new THREE.Mesh(new THREE.TorusGeometry(.0615, .006, 6, 28), m.dark); strap.position.set(0, -.1, -f); g.add(strap); }
  box(g, .03, .05, .06, m.olive, .09, -.045); box(g, .03, .05, .06, m.olive, .29, -.045);
  // 壓力錶：指針會跟著燃料量轉動
  const dial = canvasMap(128, 128, (c, w) => { c.fillStyle = '#e9e3cf'; c.beginPath(); c.arc(64, 64, 62, 0, 7); c.fill(); c.strokeStyle = '#222'; c.lineWidth = 4; c.stroke(); c.lineWidth = 3; for (let i = 0; i <= 10; i++) { const a = Math.PI * .75 + i / 10 * Math.PI * 1.5; c.beginPath(); c.moveTo(64 + Math.cos(a) * 50, 64 + Math.sin(a) * 50); c.lineTo(64 + Math.cos(a) * 58, 64 + Math.sin(a) * 58); c.stroke(); } c.strokeStyle = '#c62b1d'; c.lineWidth = 8; c.beginPath(); c.arc(64, 64, 52, Math.PI * .75, Math.PI * 1.05); c.stroke(); });
  const gauge = new THREE.Group(); gauge.position.set(-.068, -.06, -.16); gauge.rotation.y = -Math.PI / 2; g.add(gauge); gauge.userData.dynamic = true;
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(.024, .024, .014, 24).rotateX(Math.PI / 2), m.brass); gauge.add(rim);
  const face = new THREE.Mesh(new THREE.CircleGeometry(.02, 24), new THREE.MeshBasicMaterial({ map: dial })); face.position.z = .0075; gauge.add(face);
  const needle = new THREE.Mesh(new THREE.BoxGeometry(.0025, .017, .001).translate(0, .007, 0), new THREE.MeshBasicMaterial({ color: 0x111111 })); needle.position.z = .009; gauge.add(needle);
  // 燃料軟管（有螺紋）
  const ribs = canvasMap(16, 64, (c, w, h) => { c.fillStyle = '#1b1c1c'; c.fillRect(0, 0, w, h); c.fillStyle = '#353636'; for (let y = 0; y < h; y += 8) c.fillRect(0, y, w, 3); }, [1, 30]);
  const hose = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(0, -.1, -.02), new V3(.01, -.13, .06), new V3(.06, -.26, .2), new V3(.12, -.55, .32)]), 30, .014, 10);
  g.add(new THREE.Mesh(hose, new THREE.MeshStandardMaterial({ map: ribs, roughness: .9 })));
  // 前握把
  const fg = rod(g, .016, .018, 0, .1, 0, m.rubber); fg.geometry.rotateX(Math.PI / 2); fg.position.set(0, -.04, -.44);
  // 引燃小火（藍色）
  const pilotTex = canvasMap(64, 64, (c) => { const r = c.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(220,240,255,1)'); r.addColorStop(.35, 'rgba(70,140,255,.8)'); r.addColorStop(1, 'rgba(40,80,255,0)'); c.fillStyle = r; c.fillRect(0, 0, 64, 64); });
  const pilot = new THREE.Sprite(new THREE.SpriteMaterial({ map: pilotTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); pilot.scale.setScalar(.03); pilot.position.set(0, -.022, -.722); g.add(pilot); pilot.userData.dynamic = true;
  glove(g, m, new V3(.0, -.08, .05), -.32, 1); arm(g, m, [.03, -.14, .09], [.16, -.42, .32]);
  glove(g, m, new V3(0, -.09, -.44), 0, -1); arm(g, m, [-.03, -.13, -.42], [-.2, -.5, -.12]);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, .015, -.73); g.add(muzzle);
  // 噴火時從噴嘴延伸出去的火柱：亮度漸層放在頂點顏色（不會跟著捲動），貼圖只負責往前捲動的火紋
  const streaks = canvasMap(64, 256, (c, w, h) => { c.fillStyle = '#d8d8d8'; c.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(0,0,0,${.3 + Math.random() * .6})`; c.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 5, 20 + Math.random() * 80); } });
  const coneLength = 3.2, coneGeo = new THREE.ConeGeometry(.42, coneLength, 18, 8, true).translate(0, -coneLength / 2, 0).rotateX(Math.PI / 2);
  const ramp = [[0, [.75, .85, 1]], [.08, [1, .9, .6]], [.35, [1, .5, .12]], [.75, [.45, .1, .02]], [1, [0, 0, 0]]], cols = [], pos = coneGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const t = Math.min(1, -pos.getZ(i) / coneLength); let k = 1; while (k < ramp.length - 1 && ramp[k][0] < t) k++; const [t0, c0] = ramp[k - 1], [t1, c1] = ramp[k], u = (t - t0) / (t1 - t0); cols.push(...c0.map((v, n) => v + (c1[n] - v) * u)); }
  coneGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const cone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ map: streaks, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  cone.position.copy(muzzle.position); cone.visible = false; cone.userData.dynamic = true; g.add(cone);
  return { g, muzzle, nozzleMat, needle, pilot, cone, streaks };
}

export function createFirearm(camera) {
  const root = new THREE.Group(); root.scale.setScalar(.6); camera.add(root);
  const m = materials();
  const rifle = buildRifle(m), sniper = buildSniper(m), flamer = buildFlamer(m), guns = { rifle, sniper, flamer };
  for (const gun of Object.values(guns)) { root.add(gun.g); bakeStatic(gun.g); gun.g.traverse(o => { if (o.isMesh) o.frustumCulled = false; }); }
  // 槍口火光：星形貼圖 + 一盞點光源
  const flashTex = canvasMap(128, 128, (c) => { c.translate(64, 64); const r = c.createRadialGradient(0, 0, 0, 0, 0, 60); r.addColorStop(0, 'rgba(255,250,220,1)'); r.addColorStop(.25, 'rgba(255,190,90,.9)'); r.addColorStop(1, 'rgba(255,120,30,0)'); c.fillStyle = r; for (let i = 0; i < 6; i++) { c.rotate(Math.PI / 3); c.beginPath(); c.moveTo(0, -8); c.lineTo(60, 0); c.lineTo(0, 8); c.fill(); } c.beginPath(); c.arc(0, 0, 22, 0, 7); c.fill(); });
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); flash.visible = false; root.add(flash);
  const muzzleLight = new THREE.PointLight(0xffb060, 0, 6, 1.6); root.add(muzzleLight);
  const flameLight = new THREE.PointLight(0xff7a2a, 0, 14, 1.4); root.add(flameLight);
  const fill = new THREE.PointLight(0xdce7e8, 1.1, 3); fill.position.set(-.4, .8, .2); root.add(fill);
  const tmpPos = new THREE.Vector3();
  let kick = 0, flashTime = 0, heat = 0;
  return {
    root,
    shot(kind) { kick = kind === 'sniper' ? .11 : .045; flashTime = .05; flash.material.rotation = Math.random() * 6; flash.scale.setScalar(kind === 'sniper' ? .32 : .2); },
    // 目前武器槍口的世界座標
    muzzle(target) { return guns[this.selected || 'rifle'].muzzle.getWorldPosition(target); },
    update(dt, loadout, active, time, firing = false) {
      this.selected = loadout.selected;
      root.visible = active && !loadout.scoped;
      for (const [kind, gun] of Object.entries(guns)) gun.g.visible = kind === loadout.selected;
      const flaming = firing && loadout.selected === 'flamer';
      kick *= Math.exp(-dt * 16); flashTime = Math.max(0, flashTime - dt); heat = THREE.MathUtils.clamp(heat + (flaming ? dt * .6 : -dt * .35), 0, 1);
      const gun = guns[loadout.selected]; gun.muzzle.getWorldPosition(tmpPos); root.worldToLocal(tmpPos);
      flash.visible = flashTime > 0; flash.position.copy(tmpPos); muzzleLight.position.copy(tmpPos); muzzleLight.intensity = flash.visible ? 4 : 0;
      flameLight.position.copy(tmpPos).add(new THREE.Vector3(0, 0, -2.5)); flameLight.intensity = flaming ? 9 + Math.sin(time * 37) * 2.5 + Math.random() * 2 : 0;
      flamer.nozzleMat.emissiveIntensity = heat * 1.4;
      flamer.needle.rotation.z = -Math.PI * .75 + (1 - loadout.ammo.flamer / 100) * Math.PI * 1.5;
      flamer.cone.visible = flaming; if (flaming) { flamer.streaks.offset.set(Math.random(), -time * 2.6); const flick = .85 + Math.random() * .3; flamer.cone.scale.set(flick, flick, .9 + Math.random() * .2); flamer.cone.rotation.z = Math.random() * 6; }
      flamer.pilot.scale.setScalar(.026 + Math.sin(time * 31) * .004 + Math.random() * .004);
      const shake = flaming ? (Math.random() - .5) * .004 : 0, reloading = loadout.reloadLeft > 0;
      // 直拿手機（畫面窄）時把槍往中間移、稍微縮小，避免擠在右邊
      const narrow = camera.aspect < 1; root.scale.setScalar(narrow ? .5 : .6);
      root.position.set((narrow ? .085 : .15) + shake, (narrow ? -.13 : -.15) + Math.sin(time * 1.5) * .002 - (reloading ? .09 : 0), -.2 + kick * .6);
      root.rotation.set(kick * .6 + (reloading ? .25 : 0), .07, reloading ? -.45 : -.02);
    }
  };
}
