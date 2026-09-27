import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

// 六個關卡場景。buildScene(scene, theme, lights) 回傳 { update(elapsed), dispose() }
// 效能：不會動的物件在建好後依材質合併成少數幾個網格（大幅減少繪製次數），燈泡用 InstancedMesh

const rand = (a, b) => a + Math.random() * (b - a);
const pick = list => list[Math.floor(Math.random() * list.length)];
const PARTY = [0xffe066, 0xff6b9d, 0x6be4ff, 0xa3ff78, 0xffa94d, 0xd7a8ff];

function canvasTexture(size, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(...repeat); tex.anisotropy = 4; return tex;
}
const stripeTexture = (colors, count = 8, repeat = [1, 1], diagonal = false) => canvasTexture(128, (g, s) => {
  const w = s / count; if (diagonal) { g.fillStyle = colors[1]; g.fillRect(0, 0, s, s); g.fillStyle = colors[0]; for (let k = -count; k < count * 2; k += 2) { g.beginPath(); g.moveTo(k * w, 0); g.lineTo(k * w + w, 0); g.lineTo(k * w + w - s, s); g.lineTo(k * w - s, s); g.fill(); } return; }
  for (let k = 0; k < count; k++) { g.fillStyle = colors[k % colors.length]; g.fillRect(k * w, 0, w + 1, s); }
}, repeat);
const speckleTexture = (base, hue, sat, light, count, repeat, size = [2, 5]) => canvasTexture(256, (g, s) => { g.fillStyle = base; g.fillRect(0, 0, s, s); for (let i = 0; i < count; i++) { g.fillStyle = `hsl(${rand(...hue)}, ${rand(...sat)}%, ${rand(...light)}%)`; g.fillRect(rand(0, s), rand(0, s), size[0], rand(size[0], size[1])); } }, repeat);

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .7, ...extra });
const glow = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra });

// 場景共用工具
function makeKit(root) {
  const animated = [];
  const kit = {
    root, animated,
    mesh(geometry, material, x = 0, y = 0, z = 0, parent = root) { const m = new THREE.Mesh(geometry, material); m.position.set(x, y, z); parent.add(m); return m; },
    group(x = 0, y = 0, z = 0, parent = root) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; },
    // 會動的物件：不參與合併
    dynamic(obj) { obj.userData.dynamic = true; return obj; },
    sky(stops, { stars = 0, starSize = .35 } = {}) {
      const tex = canvasTexture(256, (g, s) => { const grad = g.createLinearGradient(0, 0, 0, s); stops.forEach(([c, at]) => grad.addColorStop(at, c)); g.fillStyle = grad; g.fillRect(0, 0, s, s); });
      kit.mesh(new THREE.SphereGeometry(95, 32, 16), glow(0xffffff, { side: THREE.BackSide, fog: false, map: tex }));
      if (!stars) return null;
      const pos = []; for (let i = 0; i < stars; i++) { const th = Math.random() * Math.PI * 2, ph = rand(.08, 1.3); pos.push(Math.cos(th) * Math.cos(ph) * 90, Math.sin(ph) * 90, Math.sin(th) * Math.cos(ph) * 90); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const points = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xfff6d8, size: starSize, fog: false, transparent: true })); root.add(points);
      animated.push(t => { points.material.opacity = .75 + Math.sin(t * 1.3) * .2; }); return points;
    },
    ground(groundTex, pathTex, edgeColor) {
      const g = kit.mesh(new THREE.PlaneGeometry(120, 150), std(0xffffff, { map: groundTex, roughness: .95 }), 0, 0, -35); g.rotation.x = -Math.PI / 2; g.receiveShadow = true;
      if (pathTex) { const p = kit.mesh(new THREE.PlaneGeometry(13, 110), std(0xffffff, { map: pathTex, roughness: .9 }), 0, .012, -32); p.rotation.x = -Math.PI / 2; p.receiveShadow = true; }
      if (edgeColor != null) for (const side of [-1, 1]) kit.mesh(new THREE.BoxGeometry(.35, .12, 110), std(edgeColor), side * 6.6, .06, -32);
    },
    disc(color, radius, x, y, z, halo = 0) { const m = kit.mesh(new THREE.SphereGeometry(radius, 28, 18), glow(color, { fog: false }), x, y, z); if (halo) { const h = kit.mesh(new THREE.CircleGeometry(radius * halo, 32), glow(color, { transparent: true, opacity: .14, fog: false }), x, y, z - 1); h.lookAt(0, 2, 5); } return m; },
    // 一串會換色閃爍的燈泡（全部只佔一次繪製）
    bulbs(positions, { palette = PARTY, size = .09, rate = 2.5, parent = root, shape } = {}) {
      const geo = shape || new THREE.SphereGeometry(size, 8, 6), inst = new THREE.InstancedMesh(geo, glow(0xffffff), positions.length), m = new THREE.Matrix4(), col = new THREE.Color();
      positions.forEach((p, i) => { m.makeTranslation(p[0], p[1], p[2]); inst.setMatrixAt(i, m); inst.setColorAt(i, col.setHex(palette[i % palette.length])); });
      parent.add(inst); let last = -1;
      if (rate) animated.push(t => { const step = Math.floor(t * rate); if (step === last) return; last = step; for (let i = 0; i < positions.length; i++) inst.setColorAt(i, col.setHex(palette[(i + step) % palette.length])); inst.instanceColor.needsUpdate = true; });
      return inst;
    },
    floaters(count, color, box, size = .12, drift = .6) {
      const base = []; for (let i = 0; i < count; i++) base.push(rand(box[0], box[1]), rand(box[2], box[3]), rand(box[4], box[5]));
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(base.slice(), 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, transparent: true, opacity: .9 })); root.add(pts);
      animated.push(t => { const pos = geo.attributes.position; for (let i = 0; i < count; i++) pos.setXYZ(i, base[i * 3] + Math.sin(t * .5 + i) * drift, base[i * 3 + 1] + Math.sin(t * .9 + i * 1.7) * drift * .5, base[i * 3 + 2] + Math.cos(t * .4 + i) * drift); pos.needsUpdate = true; pts.material.opacity = .6 + Math.sin(t * 3) * .3; });
      return pts;
    },
    // 路兩旁的隨機位置（避開道路與玩家正前方的戰場中心）
    side(min, max, zMin = -80, zMax = 2) { const s = Math.random() < .5 ? -1 : 1; return [s * rand(min, max), rand(zMin, zMax), s]; }
  };
  return kit;
}

// 把所有靜態網格依材質合併
function materialKey(m) { return [m.type, m.color?.getHex(), m.emissive?.getHex(), m.emissiveIntensity, m.roughness, m.metalness, m.map?.uuid, m.transparent, m.opacity, m.side, m.fog].join('|'); }
// frame 是合併後網格的座標系；遇到會動的子群組就對它自己再做一次（它內部彼此不動的零件一樣能合併）
function bakeStatic(frame) {
  frame.updateMatrixWorld(true);
  const buckets = new Map(), nested = [], toLocal = new THREE.Matrix4().copy(frame.matrixWorld).invert(), m4 = new THREE.Matrix4();
  const walk = obj => { for (const child of [...obj.children]) { if (child.userData.dynamic) { nested.push(child); continue; } if (child.isMesh && !child.isInstancedMesh && !Array.isArray(child.material) && child.geometry.index && child.geometry.attributes.uv) { const key = materialKey(child.material) + `|${child.castShadow}|${child.receiveShadow}`; if (!buckets.has(key)) buckets.set(key, { material: child.material, cast: child.castShadow, receive: child.receiveShadow, items: [] }); buckets.get(key).items.push(child); } walk(child); } };
  walk(frame);
  for (const { material, cast, receive, items } of buckets.values()) {
    if (items.length < 2) continue;
    let vCount = 0, iCount = 0; for (const m of items) { vCount += m.geometry.attributes.position.count; iCount += m.geometry.index.count; }
    const pos = new Float32Array(vCount * 3), nor = new Float32Array(vCount * 3), uv = new Float32Array(vCount * 2), idx = new Uint32Array(iCount);
    let vo = 0, io = 0;
    for (const m of items) { const g = m.geometry.clone().applyMatrix4(m4.multiplyMatrices(toLocal, m.matrixWorld)); pos.set(g.attributes.position.array, vo * 3); nor.set(g.attributes.normal.array, vo * 3); uv.set(g.attributes.uv.array, vo * 2); const src = g.index.array; for (let k = 0; k < src.length; k++) idx[io + k] = src[k] + vo; vo += g.attributes.position.count; io += src.length; g.dispose(); m.parent.remove(m); }
    const merged = new THREE.BufferGeometry(); merged.setAttribute('position', new THREE.BufferAttribute(pos, 3)); merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); merged.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); merged.setIndex(new THREE.BufferAttribute(idx, 1)); merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, material); mesh.castShadow = cast; mesh.receiveShadow = receive; frame.add(mesh);
  }
  nested.forEach(bakeStatic);
}

// ───────────────────────── 第 1 關：夜晚遊樂園 ─────────────────────────
function carnival(k) {
  k.sky([['#050b24', 0], ['#1b2458', .45], ['#4a3a78', .58], ['#0b1a26', .7]], { stars: 600 });
  k.disc(0xfff3c4, 4.2, 22, 30, -70, 1.9);
  const bricks = canvasTexture(256, (g, s) => { g.fillStyle = '#3a3440'; g.fillRect(0, 0, s, s); const h = s / 8; for (let r = 0; r < 8; r++) for (let c = -1; c < 5; c++) { const w = s / 4, x = c * w + (r % 2 ? w / 2 : 0); g.fillStyle = `hsl(${rand(260, 290)}, ${rand(8, 16)}%, ${rand(30, 40)}%)`; g.fillRect(x + 3, r * h + 3, w - 6, h - 6); } }, [3, 26]);
  k.ground(speckleTexture('#1f3a2a', [120, 150], [25, 45], [12, 26], 2600, [24, 30]), bricks, 0x9a8fb0);
  const bulbPos = [];
  const awnings = [['#ff5d73', '#fff4e0'], ['#4cc9f0', '#fff4e0'], ['#ffd166', '#7b4bb7'], ['#06d6a0', '#fff4e0']], signs = ['棉花糖', '爆米花', '套圈圈', '射水球', '冰淇淋', '抽獎', '熱狗'];
  const cream = std(0xf2e6d0), cache = new Map(), cached = (key, make) => cache.get(key) || cache.set(key, make()).get(key);
  for (const side of [-1, 1]) for (let i = 0; i < 7; i++) {
    const w = 5, d = 4.2, h = 3, booth = k.group(side * rand(10, 12.5), 0, -6 - i * 11); booth.rotation.y = -side * Math.PI / 2;
    const wood = std(i % 2 ? 0x8a5a3c : 0x6f4a8a, { roughness: .8 }), [c1, c2] = awnings[i % awnings.length];
    k.mesh(new THREE.BoxGeometry(w, h, .3), wood, 0, h / 2, -d / 2, booth).castShadow = true;
    for (const sx of [-1, 1]) { k.mesh(new THREE.CylinderGeometry(.1, .1, h + .4, 8), cream, sx * (w / 2 - .15), (h + .4) / 2, d / 2 - .2, booth); k.mesh(new THREE.BoxGeometry(.25, h, d), wood, sx * (w / 2 - .12), h / 2, 0, booth); }
    k.mesh(new THREE.BoxGeometry(w - .3, 1.1, .6), cream, 0, .55, d / 2 - .3, booth);
    const awning = k.mesh(new THREE.BoxGeometry(w + .4, .12, d + .6), cached(c1 + c2, () => std(0xffffff, { map: stripeTexture([c1, c2]) })), 0, h + .5, .2, booth); awning.rotation.x = .18; awning.castShadow = true;
    const flapA = cached('f' + c1, () => std(new THREE.Color(c1).getHex())), flapB = cached('f' + c2, () => std(new THREE.Color(c2).getHex()));
    for (let j = 0; j < 8; j++) k.mesh(new THREE.ConeGeometry(.33, .45, 3), j % 2 ? flapB : flapA, -w / 2 + .35 + j * (w + .1) / 8, h + .02, d / 2 + .55, booth).rotation.x = Math.PI;
    const label = signs[(i + (side > 0 ? 3 : 0)) % signs.length], signMat = cached(label + c1, () => glow(0xffffff, { map: canvasTexture(256, (g, s) => { g.fillStyle = '#2b1740'; g.fillRect(0, 0, s, s); g.strokeStyle = c1; g.lineWidth = 14; g.strokeRect(8, 8, s - 16, s - 16); g.fillStyle = '#fff4c2'; g.font = 'bold 64px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, s / 2, s / 2); }) }));
    k.mesh(new THREE.PlaneGeometry(2.6, 1.1), signMat, 0, h + 1.35, d / 2 + .1, booth);
    for (let j = 0; j < 4; j++) k.mesh(new THREE.SphereGeometry(.2, 12, 10), std(PARTY[(j + i) % PARTY.length], { roughness: .5 }), -1.4 + j * .95, 1.3, d / 2 - .35, booth);
    booth.updateMatrixWorld(true); for (let j = 0; j <= 10; j++) { const p = new THREE.Vector3(-w / 2 - .1 + j * (w + .2) / 10, h + .3, d / 2 + .7).applyMatrix4(booth.matrixWorld); bulbPos.push([p.x, p.y, p.z]); }
  }
  const wireMat = glow(0x222222);
  for (let z = -4; z > -70; z -= 9) { for (let j = 0; j <= 16; j++) { const t = j / 16; bulbPos.push([-8 + 16 * t, 5.2 - Math.sin(t * Math.PI) * 1.1, z + (t - .5) * 1.5]); } k.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-8, 5.2, z - .75), new THREE.Vector3(0, 4.1, z), new THREE.Vector3(8, 5.2, z + .75)]), 16, .015, 4), wireMat); }
  lampPosts(k, 0x2c2d3f, 0xfff0b3);
  for (const [x, z, c] of [[-7, -8, 0xffd9a0], [7, -20, 0xffb3d9], [-7, -34, 0xa0e8ff]]) { const l = new THREE.PointLight(c, 10, 16); l.position.set(x, 4.2, z); k.root.add(l); }
  // 摩天輪
  const wheel = k.dynamic(k.group(-24, 13, -50)), rim = std(0xd66bff, { emissive: 0x6b1f8a, emissiveIntensity: .8, roughness: .4 });
  k.mesh(new THREE.TorusGeometry(10, .25, 8, 48), rim, 0, 0, 0, wheel); k.mesh(new THREE.TorusGeometry(7, .12, 6, 40), rim, 0, 0, 0, wheel);
  for (let i = 0; i < 12; i++) k.mesh(new THREE.BoxGeometry(.12, 20, .12), rim, 0, 0, 0, wheel).rotation.z = i * Math.PI / 12;
  k.mesh(new THREE.CylinderGeometry(.8, .8, .8, 16).rotateX(Math.PI / 2), glow(0xffe066), 0, 0, 0, wheel);
  k.bulbs(Array.from({ length: 36 }, (_, i) => [Math.cos(i / 36 * Math.PI * 2) * 10, Math.sin(i / 36 * Math.PI * 2) * 10, .3]), { size: .15, parent: wheel });
  const cabins = []; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, cabin = k.dynamic(k.group(Math.cos(a) * 10, Math.sin(a) * 10, 0, wheel)); k.mesh(new THREE.CylinderGeometry(.8, .7, 1.2, 10), std(PARTY[i % PARTY.length], { roughness: .5 }), 0, -1.1, 0, cabin); k.mesh(new THREE.ConeGeometry(.9, .5, 10), std(0xfff4e0), 0, -.3, 0, cabin); cabins.push(cabin); }
  for (const side of [-1, 1]) { const leg = k.mesh(new THREE.CylinderGeometry(.3, .45, 15, 8), std(0x5a4a78), -24 + side * 4, 6.5, -50.5); leg.rotation.z = side * .27; }
  k.animated.push(t => { wheel.rotation.z = t * .12; cabins.forEach(c => { c.rotation.z = -wheel.rotation.z; }); });
  // 旋轉木馬
  const carousel = k.group(22, 0, -40);
  k.mesh(new THREE.CylinderGeometry(6, 6.3, .6, 32), cream, 0, .3, 0, carousel);
  k.mesh(new THREE.ConeGeometry(6.8, 3, 32), std(0xffffff, { map: stripeTexture(['#ff5d73', '#fff4e0'], 16) }), 0, 6.3, 0, carousel);
  k.mesh(new THREE.SphereGeometry(.5, 12, 10), glow(0xffe066), 0, 8, 0, carousel);
  const spin = k.dynamic(k.group(0, 0, 0, carousel)); k.mesh(new THREE.CylinderGeometry(1.2, 1.2, 4.2, 16), std(0x7b4bb7, { emissive: 0x2a1040 }), 0, 2.7, 0, spin);
  const gold = std(0xffd166, { metalness: .6, roughness: .3 }), horses = [];
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, holder = k.group(Math.cos(a) * 4.2, 0, Math.sin(a) * 4.2, spin); holder.rotation.y = -a; k.mesh(new THREE.CylinderGeometry(.05, .05, 4.6, 6), gold, 0, 2.9, 0, holder); const horse = k.dynamic(k.group(0, 2, 0, holder)), hm = std(PARTY[i % PARTY.length], { roughness: .5 }); k.mesh(new THREE.CapsuleGeometry(.3, .7, 4, 8).rotateZ(Math.PI / 2), hm, 0, 0, 0, horse); k.mesh(new THREE.CapsuleGeometry(.18, .35, 4, 8), hm, .55, .35, 0, horse).rotation.z = -.5; horses.push(horse); }
  k.bulbs(Array.from({ length: 24 }, (_, i) => [22 + Math.cos(i / 24 * Math.PI * 2) * 6.5, 4.85, -40 + Math.sin(i / 24 * Math.PI * 2) * 6.5]), { size: .13 });
  const cl = new THREE.PointLight(0xffc0e0, 14, 20); cl.position.set(22, 4, -36); k.root.add(cl);
  k.animated.push(t => { spin.rotation.y = t * .4; horses.forEach((h, i) => { h.position.y = 2 + Math.sin(t * 2 + i) * .35; }); });
  pineTrees(k, 22, 0x1f5a45, null);
  pumpkins(k, 12, 7.2, 8.6);
  balloons(k, 12);
  k.bulbs(bulbPos);
  k.floaters(80, 0xd8ff8a, [-14, 14, .5, 4, -50, 2]);
}

// ───────────────────────── 第 2 關：糖果森林 ─────────────────────────
function candy(k) {
  k.sky([['#7fd4ff', 0], ['#ffc2e2', .5], ['#ffe4c4', .6], ['#f7a8d0', .7]]);
  k.disc(0xfff6c2, 5, -20, 34, -75, 1.8);
  const sprinkles = canvasTexture(256, (g, s) => { g.fillStyle = '#ffb6d5'; g.fillRect(0, 0, s, s); for (let i = 0; i < 500; i++) { g.save(); g.translate(rand(0, s), rand(0, s)); g.rotate(rand(0, 6.3)); g.fillStyle = pick(['#ffffff', '#ffe066', '#6be4ff', '#a3ff78', '#b784ff', '#ff6b9d']); g.fillRect(-4, -1.5, 8, 3); g.restore(); } }, [20, 26]);
  const wafer = canvasTexture(256, (g, s) => { g.fillStyle = '#7a4a2e'; g.fillRect(0, 0, s, s); g.strokeStyle = '#9b6a44'; g.lineWidth = 10; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * s / 4, 0); g.lineTo(i * s / 4, s); g.stroke(); g.beginPath(); g.moveTo(0, i * s / 4); g.lineTo(s, i * s / 4); g.stroke(); } }, [3, 24]);
  k.ground(sprinkles, wafer, 0xffffff);
  // 棒棒糖樹
  const stick = std(0xfff8ee);
  for (let i = 0; i < 16; i++) {
    const [x, z] = k.side(8.5, 24), h = rand(3, 5.5), r = rand(1, 1.6), colors = pick([['#ff5d8f', '#fff'], ['#6be4ff', '#fff'], ['#ffd166', '#ff6b9d'], ['#a3ff78', '#fff']]);
    const swirl = canvasTexture(128, (g, s) => { g.fillStyle = colors[1]; g.fillRect(0, 0, s, s); g.strokeStyle = colors[0]; g.lineWidth = 12; g.beginPath(); for (let a = 0; a < 30; a += .1) g.lineTo(s / 2 + Math.cos(a) * a * 2.1, s / 2 + Math.sin(a) * a * 2.1); g.stroke(); });
    k.mesh(new THREE.CylinderGeometry(.1, .1, h, 8), stick, x, h / 2, z);
    const holder = k.group(x, h + r * .8, z); holder.lookAt(0, h + r * .8, 4.8); const pop = k.mesh(new THREE.CylinderGeometry(r, r, .25, 28).rotateX(Math.PI / 2), std(0xffffff, { map: swirl, roughness: .35 }), 0, 0, 0, holder); pop.castShadow = true;
  }
  // 蘑菇
  const capRed = std(0xff4f6d, { roughness: .5 }), dot = std(0xffffff), stem = std(0xfff0d8);
  for (let i = 0; i < 12; i++) { const [x, z] = k.side(8, 20), s = rand(.8, 1.6), g = k.group(x, 0, z); g.scale.setScalar(s); k.mesh(new THREE.CylinderGeometry(.35, .45, 1.2, 12), stem, 0, .6, 0, g); const cap = k.mesh(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), capRed, 0, 1.1, 0, g); cap.scale.set(1, .7, 1); cap.castShadow = true; for (let j = 0; j < 7; j++) { const a = rand(0, 6.3), up = rand(.3, 1.2); k.mesh(new THREE.SphereGeometry(.14, 8, 6), dot, Math.cos(a) * Math.sin(up) * .98, 1.1 + Math.cos(up) * .69, Math.sin(a) * Math.sin(up) * .98, g).scale.y = .4; } }
  // 軟糖
  const gumColors = [0xff6b9d, 0x6be4ff, 0xa3ff78, 0xffe066, 0xb784ff].map(c => std(c, { roughness: .25, transparent: true, opacity: .9 }));
  for (let z = 0; z > -70; z -= 3.5) for (const side of [-1, 1]) k.mesh(new THREE.SphereGeometry(.35, 12, 10, 0, Math.PI * 2, 0, Math.PI / 1.6), pick(gumColors), side * rand(7.1, 7.8), 0, z + rand(-1, 1)).scale.y = 1.3;
  // 拐杖糖拱門
  const caneTex = stripeTexture(['#ff3b5c', '#ffffff'], 6, [1, 10], true);
  for (let z = -8; z > -70; z -= 14) { const pts = []; for (let j = 0; j <= 20; j++) { const a = Math.PI * j / 20; pts.push(new THREE.Vector3(Math.cos(a) * 7.3, Math.sin(a) * 6.5, z)); } k.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, .28, 10), std(0xffffff, { map: caneTex, roughness: .35 })); }
  // 甜甜圈雕像
  for (const [x, z, c] of [[-15, -30, 0xff8fc4], [16, -46, 0x8fe3ff]]) { const d = k.group(x, 3.4, z); d.rotation.y = x < 0 ? .6 : -.6; k.mesh(new THREE.TorusGeometry(2.2, 1, 16, 32), std(0xe0a060), 0, 0, 0, d); k.mesh(new THREE.TorusGeometry(2.2, 1.02, 16, 32, Math.PI * 2), std(c, { roughness: .4 }), 0, 0, .15, d).scale.set(1, 1, .75); }
  // 棉花糖雲
  const cloudMat = std(0xffe3f1, { roughness: 1, emissive: 0x553344, emissiveIntensity: .2 }), clouds = [];
  for (let i = 0; i < 9; i++) { const c = k.dynamic(k.group(rand(-40, 40), rand(14, 24), rand(-80, -25))); for (let j = 0; j < 5; j++) k.mesh(new THREE.SphereGeometry(rand(1.5, 2.8), 14, 10), cloudMat, j * 2 - 4, rand(-.6, .6), rand(-1, 1), c); clouds.push(c); }
  k.animated.push(t => clouds.forEach((c, i) => { c.position.x += Math.sin(t * .1 + i) * .004; c.position.y += Math.sin(t * .6 + i) * .003; }));
  k.floaters(90, 0xffffff, [-16, 16, .5, 6, -60, 2], .14, .8);
}

// ───────────────────────── 第 3 關：冰雪村莊 ─────────────────────────
function snow(k) {
  k.sky([['#1c2a5a', 0], ['#4a66a8', .45], ['#9fb8e8', .6], ['#c9d8f0', .7]], { stars: 250 });
  // 極光
  const auroraTex = canvasTexture(256, (g, s) => { const grad = g.createLinearGradient(0, 0, 0, s); grad.addColorStop(0, 'rgba(120,255,200,0)'); grad.addColorStop(.5, 'rgba(120,255,200,.55)'); grad.addColorStop(.8, 'rgba(180,120,255,.35)'); grad.addColorStop(1, 'rgba(180,120,255,0)'); g.fillStyle = grad; g.fillRect(0, 0, s, s); });
  const auroras = []; for (let i = 0; i < 3; i++) { const geo = new THREE.PlaneGeometry(90, 14, 40, 1), a = k.dynamic(k.mesh(geo, glow(0xffffff, { map: auroraTex, transparent: true, side: THREE.DoubleSide, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }), rand(-10, 10), 32 + i * 4, -70 + i * 6)); a.userData.base = geo.attributes.position.array.slice(); auroras.push(a); }
  k.animated.push(t => auroras.forEach((a, n) => { const pos = a.geometry.attributes.position, base = a.userData.base; for (let i = 0; i < pos.count; i++) pos.setZ(i, base[i * 3 + 2] + Math.sin(base[i * 3] * .08 + t * .6 + n) * 4); pos.needsUpdate = true; }));
  const snowTex = speckleTexture('#eef4ff', [200, 220], [30, 60], [82, 95], 1800, [20, 26], [3, 3]);
  const ice = canvasTexture(256, (g, s) => { g.fillStyle = '#b8d8f0'; g.fillRect(0, 0, s, s); g.strokeStyle = '#e8f6ff'; g.lineWidth = 2; for (let i = 0; i < 18; i++) { g.beginPath(); let x = rand(0, s), y = rand(0, s); g.moveTo(x, y); for (let j = 0; j < 4; j++) { x += rand(-40, 40); y += rand(-40, 40); g.lineTo(x, y); } g.stroke(); } }, [3, 22]);
  k.ground(snowTex, ice, 0xffffff);
  pineTrees(k, 34, 0x24604a, 0xf4f9ff);
  // 雪人
  const white = std(0xfbfdff, { roughness: .9 }), coal = std(0x22252e), carrot = std(0xff8a2a), scarf = [std(0xff4f6d), std(0x4cc9f0), std(0x7bd96a)];
  for (let i = 0; i < 7; i++) { const [x, z, s] = k.side(8, 13, -60, -4), g = k.group(x, 0, z); g.rotation.y = -s * .9; g.scale.setScalar(rand(.9, 1.3)); k.mesh(new THREE.SphereGeometry(.8, 16, 12), white, 0, .75, 0, g).castShadow = true; k.mesh(new THREE.SphereGeometry(.58, 16, 12), white, 0, 1.8, 0, g); k.mesh(new THREE.SphereGeometry(.42, 16, 12), white, 0, 2.6, 0, g); for (const ex of [-.14, .14]) k.mesh(new THREE.SphereGeometry(.05, 8, 6), coal, ex, 2.7, .37, g); k.mesh(new THREE.ConeGeometry(.07, .4, 8).rotateX(Math.PI / 2), carrot, 0, 2.6, .55, g); k.mesh(new THREE.TorusGeometry(.43, .09, 8, 20).rotateX(Math.PI / 2), scarf[i % 3], 0, 2.25, 0, g); k.mesh(new THREE.CylinderGeometry(.3, .3, .45, 14), coal, 0, 3.15, 0, g); k.mesh(new THREE.CylinderGeometry(.45, .45, .05, 14), coal, 0, 2.93, 0, g); for (const sx of [-1, 1]) k.mesh(new THREE.CylinderGeometry(.03, .03, .9, 5), std(0x6a4a3a), sx * .8, 2, 0, g).rotation.z = sx * -1.1; }
  // 小木屋
  const logs = std(0x8a5a3c), roofSnow = std(0xf4f9ff), window = glow(0xffd98a), houseLights = [];
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) { const g = k.group(side * rand(13, 16), 0, -12 - i * 18); g.rotation.y = -side * Math.PI / 2; k.mesh(new THREE.BoxGeometry(4, 2.8, 3.4), logs, 0, 1.4, 0, g).castShadow = true; const roof = k.mesh(new THREE.CylinderGeometry(2.6, 2.6, 4.4, 3).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2), roofSnow, 0, 3.7, 0, g); roof.scale.y = .7; k.mesh(new THREE.PlaneGeometry(.8, .8), window, -.9, 1.5, 1.72, g); k.mesh(new THREE.PlaneGeometry(.8, .8), window, .9, 1.5, 1.72, g); k.mesh(new THREE.BoxGeometry(.5, 1.2, .5), std(0x7a6a6a), 1, 4, -.6, g); g.updateMatrixWorld(true); for (let j = 0; j <= 8; j++) { const p = new THREE.Vector3(-2 + j * .5, 2.9, 1.75).applyMatrix4(g.matrixWorld); houseLights.push([p.x, p.y, p.z]); } }
  k.bulbs(houseLights, { palette: [0xff5d73, 0x7bd96a, 0xffe066, 0x6be4ff], rate: 1.5 });
  // 冰屋
  const iglooTex = canvasTexture(128, (g, s) => { g.fillStyle = '#f4f9ff'; g.fillRect(0, 0, s, s); g.strokeStyle = '#bcd4ea'; g.lineWidth = 3; for (let r = 0; r < 6; r++) { g.beginPath(); g.moveTo(0, r * s / 6); g.lineTo(s, r * s / 6); g.stroke(); for (let c = 0; c < 6; c++) { const x = c * s / 6 + (r % 2 ? s / 12 : 0); g.beginPath(); g.moveTo(x, r * s / 6); g.lineTo(x, (r + 1) * s / 6); g.stroke(); } } }, [3, 1]);
  for (const [x, z] of [[-20, -30], [21, -24], [-18, -56]]) { const g = k.group(x, 0, z); g.lookAt(0, 0, 4); k.mesh(new THREE.SphereGeometry(2.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), std(0xffffff, { map: iglooTex }), 0, 0, 0, g).castShadow = true; k.mesh(new THREE.CylinderGeometry(.9, .9, 1.6, 16, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2), std(0xf4f9ff), 0, .1, 2.3, g); k.mesh(new THREE.CircleGeometry(.7, 16, 0, Math.PI), std(0x22304a), 0, .1, 3.11, g); }
  for (const [x, z] of [[-9, -18], [9, -40]]) { const l = new THREE.PointLight(0xffc98a, 10, 16); l.position.set(x, 3, z); k.root.add(l); }
  // 下雪
  const flakes = 600, base = []; for (let i = 0; i < flakes; i++) base.push(rand(-30, 30), rand(0, 20), rand(-70, 6));
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(base.slice(), 3));
  k.root.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: .16, transparent: true, opacity: .9 })));
  k.animated.push(t => { const pos = geo.attributes.position; for (let i = 0; i < flakes; i++) { const y = ((base[i * 3 + 1] - t * 1.2) % 20 + 20) % 20; pos.setXYZ(i, base[i * 3] + Math.sin(t * .7 + i) * .6, y, base[i * 3 + 2]); } pos.needsUpdate = true; });
}

// ───────────────────────── 第 4 關：夕陽海灘 ─────────────────────────
function beach(k) {
  k.sky([['#3a2a6a', 0], ['#b0508a', .4], ['#ff7a59', .55], ['#ffc27a', .63], ['#ffd9a0', .7]]);
  k.disc(0xffa24a, 7, 0, 7, -88, 2);
  const sand = speckleTexture('#f0cf95', [30, 45], [40, 70], [60, 85], 2600, [22, 28]);
  const planks = canvasTexture(256, (g, s) => { for (let i = 0; i < 8; i++) { g.fillStyle = `hsl(28, ${rand(35, 50)}%, ${rand(35, 48)}%)`; g.fillRect(0, i * s / 8, s, s / 8 - 4); g.fillStyle = '#4a2f1c'; g.fillRect(0, i * s / 8 + s / 8 - 4, s, 4); } }, [2, 30]);
  k.ground(sand, planks, 0x8a5a3c);
  // 海
  const waveTex = canvasTexture(256, (g, s) => { g.fillStyle = '#2a8fc9'; g.fillRect(0, 0, s, s); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3; for (let y = 8; y < s; y += 22) { g.beginPath(); for (let x = 0; x <= s; x += 8) g.lineTo(x, y + Math.sin(x / 20 + y) * 4); g.stroke(); } }, [10, 20]);
  const sea = k.dynamic(k.mesh(new THREE.PlaneGeometry(70, 160), std(0xffffff, { map: waveTex, roughness: .2, metalness: .1, transparent: true, opacity: .92 }), -52, .08, -40)); sea.rotation.x = -Math.PI / 2;
  const foam = k.mesh(new THREE.PlaneGeometry(1.6, 160), glow(0xffffff, { transparent: true, opacity: .7 }), -17.2, .1, -40); foam.rotation.x = -Math.PI / 2; k.dynamic(foam);
  k.animated.push(t => { waveTex.offset.set(t * .02, t * .05); foam.position.x = -17.2 + Math.sin(t * .8) * .8; });
  // 椰子樹
  const trunk = std(0x9a6a3c), leaf = std(0x3fae5a, { side: THREE.DoubleSide }), coconut = std(0x5a3a22), palms = [];
  for (let i = 0; i < 14; i++) { const [x, z, s] = k.side(8.5, 22), g = k.group(x, 0, z), lean = rand(.1, .3) * -s, segs = 8; let px = 0, py = 0; for (let j = 0; j < segs; j++) { k.mesh(new THREE.CylinderGeometry(.22 - j * .015, .26 - j * .015, .7, 8), trunk, px, py + .35, 0, g).rotation.z = lean; px += Math.sin(-lean) * .7 * (j / segs + .3); py += .66; } const crown = k.dynamic(k.group(px, py + .1, 0, g)); for (let j = 0; j < 7; j++) { const a = j / 7 * Math.PI * 2, l = k.mesh(new THREE.SphereGeometry(1, 10, 6), leaf, Math.cos(a) * 1.2, -.2, Math.sin(a) * 1.2, crown); l.scale.set(1.5, .08, .38); l.rotation.y = -a; l.rotation.z = -.35; } for (let j = 0; j < 3; j++) k.mesh(new THREE.SphereGeometry(.16, 10, 8), coconut, Math.cos(j * 2) * .25, -.25, Math.sin(j * 2) * .25, crown); palms.push(crown); }
  k.animated.push(t => palms.forEach((c, i) => { c.rotation.z = Math.sin(t * .9 + i) * .06; c.rotation.x = Math.cos(t * .7 + i) * .05; }));
  // 遮陽傘與毛巾
  for (let i = 0; i < 7; i++) { const [x, z] = k.side(8, 14, -60, -4), colors = pick([['#ff5d73', '#fff'], ['#4cc9f0', '#fff'], ['#ffd166', '#ff8a3d']]); k.mesh(new THREE.CylinderGeometry(.05, .05, 2.6, 6), std(0xffffff), x, 1.3, z); k.mesh(new THREE.ConeGeometry(1.6, .7, 16, 1, true), std(0xffffff, { map: stripeTexture(colors, 8), side: THREE.DoubleSide }), x, 2.7, z).castShadow = true; const towel = k.mesh(new THREE.PlaneGeometry(1, 2), std(0xffffff, { map: stripeTexture([colors[0], colors[1]], 6) }), x + .8, .03, z + .3); towel.rotation.x = -Math.PI / 2; }
  // 沙堡
  const castle = std(0xe8c080, { roughness: .95 });
  for (const [x, z] of [[-11, -14], [12, -30], [-12, -48]]) { const g = k.group(x, 0, z); k.mesh(new THREE.BoxGeometry(2.2, 1, 2.2), castle, 0, .5, 0, g); for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { k.mesh(new THREE.CylinderGeometry(.35, .4, 1.6, 10), castle, dx, .8, dz, g); k.mesh(new THREE.ConeGeometry(.42, .5, 10), castle, dx, 1.85, dz, g); } k.mesh(new THREE.CylinderGeometry(.45, .5, 2.2, 10), castle, 0, 1.1, 0, g); k.mesh(new THREE.CylinderGeometry(.02, .02, .8, 4), std(0x333333), 0, 2.6, 0, g); k.mesh(new THREE.PlaneGeometry(.45, .3), std(0xff4f6d, { side: THREE.DoubleSide }), .23, 2.85, 0, g); }
  // 海灘球
  const balls = []; for (let i = 0; i < 5; i++) { const [x, z] = k.side(7.5, 12, -50, -6), b = k.dynamic(k.mesh(new THREE.SphereGeometry(.45, 16, 12), std(0xffffff, { map: stripeTexture(['#ff4f6d', '#fff', '#4cc9f0', '#fff', '#ffd166', '#fff'], 6), roughness: .4 }), x, .45, z)); balls.push({ b, p: Math.random() * 6 }); }
  k.animated.push(t => balls.forEach(({ b, p }) => { b.position.y = .45 + Math.abs(Math.sin(t * 2 + p)) * .9; b.rotation.x = t * 2 + p; }));
  // 燈塔
  const tower = k.group(-30, 0, -70); k.mesh(new THREE.CylinderGeometry(1.4, 2.2, 14, 16), std(0xffffff, { map: stripeTexture(['#ff4f6d', '#ffffff'], 2, [1, 4]) }), 0, 7, 0, tower); k.mesh(new THREE.CylinderGeometry(1.2, 1.2, 1.6, 12), glow(0xfff2a8), 0, 14.8, 0, tower); k.mesh(new THREE.ConeGeometry(1.6, 1.4, 12), std(0x333a4a), 0, 16.3, 0, tower);
  const beam = k.dynamic(k.group(0, 14.8, 0, tower)); const cone = k.mesh(new THREE.ConeGeometry(3, 26, 16, 1, true).rotateZ(Math.PI / 2).translate(13, 0, 0), glow(0xfff2a8, { transparent: true, opacity: .16, side: THREE.DoubleSide, depthWrite: false }), 0, 0, 0, beam);
  k.animated.push(t => { beam.rotation.y = t * .6; });
  const l = new THREE.PointLight(0xffb070, 12, 24); l.position.set(0, 5, -20); k.root.add(l);
  // 海鷗
  birds(k, 8, 0xffffff, 12);
}

// ───────────────────────── 第 5 關：南瓜墓園 ─────────────────────────
function graveyard(k) {
  k.sky([['#120a24', 0], ['#3a1f5a', .45], ['#5a2f6a', .6], ['#1a1028', .7]], { stars: 300 });
  k.disc(0xffa94d, 6, -14, 22, -70, 2.2);
  const dirt = canvasTexture(256, (g, s) => { g.fillStyle = '#4a3a30'; g.fillRect(0, 0, s, s); for (let i = 0; i < 90; i++) { g.fillStyle = `hsl(25, ${rand(8, 18)}%, ${rand(25, 40)}%)`; g.beginPath(); g.ellipse(rand(0, s), rand(0, s), rand(6, 16), rand(4, 10), rand(0, 3), 0, 7); g.fill(); } }, [3, 24]);
  k.ground(speckleTexture('#23202e', [260, 300], [15, 30], [10, 22], 2400, [24, 30]), dirt, 0x5a5068);
  // 墓碑
  const stone = std(0x8a8aa0, { roughness: .95 }), moss = std(0x5a7a5a);
  for (let i = 0; i < 34; i++) { const [x, z] = k.side(7.8, 22), g = k.group(x, 0, z); g.rotation.set(0, rand(-.3, .3), rand(-.12, .12)); const kind = i % 3; if (kind === 0) { const s = k.mesh(new THREE.CapsuleGeometry(.4, .6, 4, 10), stone, 0, .7, 0, g); s.scale.z = .3; s.castShadow = true; } else if (kind === 1) { k.mesh(new THREE.BoxGeometry(.25, 1.6, .2), stone, 0, .8, 0, g); k.mesh(new THREE.BoxGeometry(.9, .22, .2), stone, 0, 1.15, 0, g); } else { k.mesh(new THREE.BoxGeometry(.9, 1.1, .25), stone, 0, .55, 0, g); k.mesh(new THREE.CylinderGeometry(.45, .45, .25, 12, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2), stone, 0, 1.1, 0, g); } k.mesh(new THREE.SphereGeometry(.2, 8, 6), moss, rand(-.3, .3), .1, .1, g).scale.y = .4; }
  // 枯樹
  const bark = std(0x3a2a2a, { roughness: 1 });
  for (let i = 0; i < 14; i++) { const [x, z] = k.side(12, 28), g = k.group(x, 0, z), h = rand(4, 7); k.mesh(new THREE.CylinderGeometry(.18, .4, h, 7), bark, 0, h / 2, 0, g).castShadow = true; for (let j = 0; j < 5; j++) { const len = rand(1.2, 2.4), br = k.mesh(new THREE.CylinderGeometry(.04, .12, len, 5).translate(0, len / 2, 0), bark, 0, h * rand(.5, .95), 0, g); br.rotation.set(rand(-.3, .3), rand(0, 6.3), rand(.6, 1.2) * (j % 2 ? 1 : -1)); } }
  pumpkins(k, 24, 7.2, 12, true);
  // 鐵柵欄
  const iron = std(0x2a2433, { metalness: .5, roughness: .5 });
  for (const side of [-1, 1]) { for (let z = 2; z > -70; z -= .8) { k.mesh(new THREE.CylinderGeometry(.03, .03, 1.3, 5), iron, side * 7.4, .65, z); k.mesh(new THREE.ConeGeometry(.06, .15, 5), iron, side * 7.4, 1.35, z); } for (const y of [.3, 1.1]) k.mesh(new THREE.BoxGeometry(.05, .05, 72), iron, side * 7.4, y, -34); }
  // 鬼屋
  const house = k.group(16, 0, -62); house.rotation.y = -.5; const wall = std(0x3a3050), roof = std(0x241c34), win = glow(0xffc04a);
  k.mesh(new THREE.BoxGeometry(9, 7, 6), wall, 0, 3.5, 0, house); k.mesh(new THREE.ConeGeometry(6.5, 4, 4), roof, 0, 9, 0, house).rotation.y = Math.PI / 4; k.mesh(new THREE.CylinderGeometry(1.4, 1.4, 11, 8), wall, -4.5, 5.5, 2, house); k.mesh(new THREE.ConeGeometry(1.9, 3.5, 8), roof, -4.5, 12.7, 2, house);
  for (const [x, y] of [[-2, 2.2], [2, 2.2], [-2, 5], [2, 5], [-4.5, 8]]) k.mesh(new THREE.PlaneGeometry(1.1, 1.3), win, x, y, x === -4.5 ? 3.42 : 3.01, house);
  // 地面霧氣
  const fogTex = canvasTexture(128, (g, s) => { const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); grad.addColorStop(0, 'rgba(200,180,255,.5)'); grad.addColorStop(1, 'rgba(200,180,255,0)'); g.fillStyle = grad; g.fillRect(0, 0, s, s); }), mists = [];
  for (let i = 0; i < 10; i++) { const m = k.dynamic(k.mesh(new THREE.PlaneGeometry(14, 14), glow(0xffffff, { map: fogTex, transparent: true, depthWrite: false, opacity: .7 }), rand(-18, 18), .3 + i * .02, rand(-60, -5))); m.rotation.x = -Math.PI / 2; mists.push({ m, x: m.position.x, p: rand(0, 6) }); }
  k.animated.push(t => mists.forEach(({ m, x, p }) => { m.position.x = x + Math.sin(t * .2 + p) * 3; }));
  for (const [x, z, c] of [[-8, -10, 0xff8a2a], [8, -26, 0xb070ff], [-8, -42, 0xff8a2a]]) { const l = new THREE.PointLight(c, 10, 15); l.position.set(x, 2, z); k.root.add(l); }
  birds(k, 12, 0x2a1a3a, 9, true);
  k.floaters(60, 0xffb86b, [-14, 14, .5, 3, -50, 2]);
}

// ───────────────────────── 第 6 關：月球基地 ─────────────────────────
function moon(k) {
  k.sky([['#000004', 0], ['#05061a', .5], ['#0a0c24', .7]], { stars: 1100, starSize: .3 });
  const earthTex = canvasTexture(256, (g, s) => { g.fillStyle = '#2a6fd6'; g.fillRect(0, 0, s, s); g.fillStyle = '#4fbf5a'; for (let i = 0; i < 14; i++) { g.beginPath(); g.ellipse(rand(0, s), rand(0, s), rand(15, 45), rand(10, 30), rand(0, 3), 0, 7); g.fill(); } g.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 20; i++) { g.beginPath(); g.ellipse(rand(0, s), rand(0, s), rand(15, 40), rand(3, 8), 0, 0, 7); g.fill(); } });
  const earth = k.dynamic(k.mesh(new THREE.SphereGeometry(9, 32, 20), glow(0xffffff, { map: earthTex, fog: false }), -30, 38, -80));
  const ringed = k.group(40, 30, -70); k.mesh(new THREE.SphereGeometry(5, 24, 16), glow(0xd7a8ff, { fog: false }), 0, 0, 0, ringed); const ring = k.mesh(new THREE.RingGeometry(7, 10, 48), glow(0xffd6a8, { side: THREE.DoubleSide, transparent: true, opacity: .7, fog: false }), 0, 0, 0, ringed); ring.rotation.x = 1.2;
  k.animated.push(t => { earth.rotation.y = t * .05; });
  const regolith = canvasTexture(256, (g, s) => { g.fillStyle = '#8a8a96'; g.fillRect(0, 0, s, s); for (let i = 0; i < 1600; i++) { g.fillStyle = `hsl(240, 5%, ${rand(45, 70)}%)`; g.fillRect(rand(0, s), rand(0, s), 2, 2); } for (let i = 0; i < 12; i++) { const x = rand(0, s), y = rand(0, s), r = rand(6, 18); g.fillStyle = 'rgba(60,60,70,.45)'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.strokeStyle = 'rgba(210,210,225,.5)'; g.lineWidth = 2; g.stroke(); } }, [18, 24]);
  const panels = canvasTexture(256, (g, s) => { g.fillStyle = '#4a4f62'; g.fillRect(0, 0, s, s); g.strokeStyle = '#2a2e3a'; g.lineWidth = 6; for (let i = 0; i <= 4; i++) { g.strokeRect(0, i * s / 4, s, 0); g.strokeRect(i * s / 2, 0, 0, s); } g.fillStyle = '#6bf0ff'; g.fillRect(s / 2 - 3, 0, 6, s); }, [2, 26]);
  k.ground(regolith, panels, 0x6bf0ff);
  // 隕石坑
  const craterMat = std(0x74747f, { roughness: 1 });
  for (let i = 0; i < 14; i++) { const [x, z] = k.side(8, 26), r = rand(1.2, 3); const rim = k.mesh(new THREE.TorusGeometry(r, r * .22, 8, 24), craterMat, x, .05, z); rim.rotation.x = -Math.PI / 2; rim.scale.z = .4; k.mesh(new THREE.CircleGeometry(r, 24), std(0x5a5a66), x, .03, z).rotation.x = -Math.PI / 2; }
  // 玻璃圓頂
  for (const [x, z, c] of [[-14, -20, 0x6bf0ff], [15, -34, 0xb784ff], [-16, -52, 0x7bd96a]]) { k.mesh(new THREE.CylinderGeometry(3.3, 3.5, .5, 24), std(0xc8ccd8, { metalness: .5, roughness: .4 }), x, .25, z); k.mesh(new THREE.SphereGeometry(3.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), std(c, { transparent: true, opacity: .35, roughness: .1, emissive: c, emissiveIntensity: .25 }), x, .5, z); k.mesh(new THREE.SphereGeometry(.8, 12, 10), glow(c), x, 1.2, z); const l = new THREE.PointLight(c, 8, 12); l.position.set(x, 2, z); k.root.add(l); }
  // 火箭
  const rocket = k.group(20, 0, -52); k.mesh(new THREE.CylinderGeometry(3, 3.2, .6, 20), std(0x5a5f70), 0, .3, 0, rocket); k.mesh(new THREE.CylinderGeometry(1.2, 1.3, 8, 20), std(0xf4f6fa, { metalness: .2, roughness: .3 }), 0, 5, 0, rocket); k.mesh(new THREE.ConeGeometry(1.2, 2.6, 20), std(0xff4f6d), 0, 10.3, 0, rocket); k.mesh(new THREE.CircleGeometry(.45, 16), glow(0x6bf0ff), 0, 7, 1.26, rocket);
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2, fin = k.mesh(new THREE.BoxGeometry(.15, 2.2, 1.4), std(0xff4f6d), Math.cos(a) * 1.3, 1.9, Math.sin(a) * 1.3, rocket); fin.rotation.y = -a; }
  const flame = k.dynamic(k.mesh(new THREE.ConeGeometry(.8, 2.2, 14).rotateX(Math.PI), glow(0xffb03a, { transparent: true, opacity: .85 }), 0, 1.4, 0, rocket));
  k.animated.push(t => { flame.scale.set(1, .8 + Math.sin(t * 20) * .15 + Math.random() * .1, 1); });
  // 雷達天線
  const dishes = []; for (const [x, z] of [[-9, -8], [10, -16], [-10, -40]]) { k.mesh(new THREE.CylinderGeometry(.12, .15, 2.4, 8), std(0xc8ccd8), x, 1.2, z); const d = k.dynamic(k.group(x, 2.6, z)); const dish = k.mesh(new THREE.SphereGeometry(1.1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 3), std(0xeef0f6, { side: THREE.DoubleSide, metalness: .3, roughness: .4 }), 0, 0, 0, d); dish.rotation.x = -1.1; k.mesh(new THREE.SphereGeometry(.1, 8, 6), glow(0xff4f6d), 0, .5, .45, d); dishes.push(d); }
  k.animated.push(t => dishes.forEach((d, i) => { d.rotation.y = t * .4 + i; }));
  // 發光水晶
  const crystalMats = [0x6bf0ff, 0xb784ff, 0xff6bd6].map(c => std(c, { emissive: c, emissiveIntensity: .6, transparent: true, opacity: .85, roughness: .15 }));
  for (let i = 0; i < 18; i++) { const [x, z] = k.side(7.5, 20), g = k.group(x, 0, z); for (let j = 0; j < 3; j++) { const c = k.mesh(new THREE.OctahedronGeometry(.5), crystalMats[i % 3], rand(-.4, .4), .5, rand(-.4, .4), g); c.scale.set(.5, rand(1.4, 2.6), .5); c.rotation.set(rand(-.3, .3), rand(0, 3), rand(-.3, .3)); } }
  // 漂浮的石頭
  const rocks = []; for (let i = 0; i < 10; i++) { const [x, z] = k.side(8, 20, -60, -4), r = k.dynamic(k.mesh(new THREE.DodecahedronGeometry(rand(.3, .7)), std(0x9a9aa8, { roughness: 1 }), x, rand(2, 5), z)); rocks.push({ r, y: r.position.y, p: rand(0, 6) }); }
  k.animated.push(t => rocks.forEach(({ r, y, p }) => { r.position.y = y + Math.sin(t * .7 + p) * .5; r.rotation.x = t * .3 + p; r.rotation.y = t * .2; }));
  // 路邊指示燈
  const pathLights = []; for (let z = 2; z > -70; z -= 3) for (const side of [-1, 1]) pathLights.push([side * 6.9, .25, z]);
  k.bulbs(pathLights, { palette: [0x6bf0ff, 0x6bf0ff, 0x2a8fc9], rate: 4, size: .12 });
  const l1 = new THREE.PointLight(0x6bf0ff, 10, 18); l1.position.set(0, 4, -12); k.root.add(l1);
}

// ───────── 共用裝飾 ─────────
function lampPosts(k, poleColor, lightColor) {
  const pole = std(poleColor, { roughness: .5, metalness: .4 }), bulb = glow(lightColor);
  for (const side of [-1, 1]) for (let z = -2; z > -70; z -= 14) { k.mesh(new THREE.CylinderGeometry(.07, .1, 4.4, 8), pole, side * 7.3, 2.2, z); k.mesh(new THREE.ConeGeometry(.35, .3, 8), pole, side * 7.3, 4.75, z); k.mesh(new THREE.SphereGeometry(.22, 12, 10), bulb, side * 7.3, 4.45, z); }
}
function pineTrees(k, count, leafColor, snowColor) {
  const leaf = std(leafColor, { roughness: .9 }), trunk = std(0x5a3a2a), snowMat = snowColor ? std(snowColor, { roughness: 1 }) : null;
  for (let i = 0; i < count; i++) { const [x, z] = k.side(15, 34), t = k.group(x, 0, z); t.scale.setScalar(rand(.9, 1.6)); k.mesh(new THREE.CylinderGeometry(.2, .3, 1.4, 6), trunk, 0, .7, 0, t); for (let j = 0; j < 3; j++) { const c = k.mesh(new THREE.ConeGeometry(1.6 - j * .4, 1.8, 8), leaf, 0, 1.8 + j, 0, t); if (j === 0) c.castShadow = true; if (snowMat) k.mesh(new THREE.ConeGeometry(1.1 - j * .3, .7, 8), snowMat, 0, 2.35 + j, 0, t); } }
}
function pumpkins(k, count, min, max, big = false) {
  const body = std(0xff8c2a, { emissive: 0x7a2a00, emissiveIntensity: .6, roughness: .6 }), stem = std(0x3a6a2a), face = glow(0xffe066);
  for (let i = 0; i < count; i++) { const [x, z, s] = k.side(min, max, -70, -2), g = k.group(x, 0, z), size = big && i % 4 === 0 ? 2.2 : rand(.9, 1.3); g.scale.setScalar(size); g.position.y = .3 * size; g.lookAt(0, g.position.y, 4.8); k.mesh(new THREE.SphereGeometry(.35, 14, 10), body, 0, 0, 0, g).scale.set(1.2, .85, 1.2); k.mesh(new THREE.CylinderGeometry(.04, .05, .2, 6), stem, 0, .35, 0, g); for (const ex of [-.12, .12]) k.mesh(new THREE.ConeGeometry(.06, .1, 3).rotateX(Math.PI / 2), face, ex, .06, .38, g); k.mesh(new THREE.BoxGeometry(.22, .04, .04), face, 0, -.08, .39, g); }
}
function balloons(k, count) {
  const list = [];
  for (let i = 0; i < count; i++) { const [x, z] = k.side(8.5, 14, -60, -6), g = k.dynamic(k.group(x, rand(5, 8), z)), c = PARTY[i % PARTY.length]; k.mesh(new THREE.SphereGeometry(.45, 14, 12), std(c, { roughness: .25, emissive: c, emissiveIntensity: .15 }), 0, 0, 0, g).scale.y = 1.2; k.mesh(new THREE.CylinderGeometry(.01, .01, 1.6, 4), glow(0xdddddd), 0, -1.3, 0, g); list.push({ g, y: g.position.y, p: Math.random() * 6 }); }
  k.animated.push(t => list.forEach(b => { b.g.position.y = b.y + Math.sin(t * .8 + b.p) * .3; b.g.rotation.z = Math.sin(t * .6 + b.p) * .1; }));
}
// 會拍翅膀繞圈飛的鳥（海鷗或蝙蝠）
function birds(k, count, color, height, bat = false) {
  const mat = std(color, { side: THREE.DoubleSide, roughness: .8 }), wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute(bat ? [0, 0, -.2, 0, 0, .2, .9, 0, 0, .9, 0, 0, .6, 0, .35, 0, 0, .2] : [0, 0, -.15, 0, 0, .15, .9, 0, -.05], 3)); wingGeo.computeVertexNormals();
  const list = [];
  for (let i = 0; i < count; i++) { const b = k.dynamic(k.group()), wings = []; k.mesh(new THREE.SphereGeometry(.15, 8, 6), mat, 0, 0, 0, b).scale.set(1, .8, 1.6); for (const s of [-1, 1]) { const w = new THREE.Mesh(wingGeo, mat); w.scale.x = s; b.add(w); wings.push(w); } list.push({ b, wings, r: rand(6, 16), cx: rand(-10, 10), cz: rand(-45, -15), h: height + rand(-2, 3), sp: rand(.3, .6) * (i % 2 ? 1 : -1), p: rand(0, 6) }); }
  k.animated.push(t => list.forEach(o => { const a = t * o.sp + o.p; o.b.position.set(o.cx + Math.cos(a) * o.r, o.h + Math.sin(t * 1.3 + o.p) * .6, o.cz + Math.sin(a) * o.r); o.b.rotation.y = -a + (o.sp > 0 ? 0 : Math.PI); const flap = Math.sin(t * (bat ? 14 : 6) + o.p) * .7; o.wings[0].rotation.z = flap; o.wings[1].rotation.z = -flap; }));
}

const ADULT_SCENES = {
  carnival: { sky: ['#06080b', '#182027', '#29231f'], fog: 0x14191c, accent: 0x8c3b2d, ground: '#171a1b', label: 'ABANDONED MIDWAY' },
  candy: { sky: ['#080b0d', '#1b2223', '#32302b'], fog: 0x1a2020, accent: 0x80613c, ground: '#1a1d1c', label: 'PROCESSING PLANT' },
  snow: { sky: ['#111821', '#34414c', '#68717a'], fog: 0x66717a, accent: 0x46545d, ground: '#7b858b', label: 'QUARANTINE ZONE' },
  beach: { sky: ['#080e12', '#26333a', '#5c5148'], fog: 0x354047, accent: 0x6b4f39, ground: '#292b29', label: 'EVACUATION COAST' },
  graveyard: { sky: ['#050709', '#151b1d', '#282923'], fog: 0x111718, accent: 0x45483e, ground: '#171a17', label: 'MEMORIAL DISTRICT' },
  moon: { sky: ['#020305', '#090d14', '#18202c'], fog: 0x080c12, accent: 0x4c5968, ground: '#24292d', label: 'LUNAR OUTPOST' }
};

function grungeTexture(base, repeat = [10, 18], cracks = true) {
  return canvasTexture(256, (g, s) => {
    g.fillStyle = base; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 1900; i++) { const a = rand(.025, .16); g.fillStyle = `rgba(${Math.random() < .55 ? '0,0,0' : '255,255,255'},${a})`; const n = rand(.4, 2.8); g.fillRect(rand(0, s), rand(0, s), n, n); }
    if (!cracks) return;
    g.strokeStyle = 'rgba(4,5,5,.48)'; g.lineWidth = 1.4;
    for (let i = 0; i < 16; i++) { let x = rand(0, s), y = rand(0, s); g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 5; j++) { x += rand(-14, 14); y += rand(7, 23); g.lineTo(x, y); } g.stroke(); }
  }, repeat);
}

function adultEnvironment(k, theme) {
  const cfg = ADULT_SCENES[theme];
  k.sky([[cfg.sky[0], 0], [cfg.sky[1], .52], [cfg.sky[2], 1]], { stars: theme === 'moon' ? 850 : 0, starSize: .18 });
  const groundTex = grungeTexture(cfg.ground, [12, 26], theme !== 'snow');
  const pathTex = grungeTexture(theme === 'snow' ? '#69737a' : '#202325', [3, 28]);
  k.ground(groundTex, pathTex, theme === 'moon' ? 0x3f4850 : 0x343738);

  const concrete = std(0x3d4140, { map: grungeTexture('#525755', [3, 3]), roughness: 1 });
  const darkConcrete = std(0x232728, { roughness: .98 });
  const rust = std(0x583a2b, { map: grungeTexture('#654333', [2, 3]), metalness: .34, roughness: .88 });
  const metal = std(0x4a5051, { metalness: .58, roughness: .72 });
  const glass = std(0x10191b, { metalness: .15, roughness: .34, emissive: 0x071011, emissiveIntensity: .3 });
  const warning = std(cfg.accent, { roughness: .82 });

  // Derelict structures create a narrow first-person street with realistic scale and depth.
  for (const side of [-1, 1]) for (let i = 0; i < 7; i++) {
    const z = -7 - i * 12 + rand(-1.4, 1.4), width = rand(7, 11), height = rand(6, 13), depth = rand(5, 8);
    const building = k.group(side * rand(11, 14), 0, z); building.rotation.y = side * rand(-.05, .05);
    const wall = k.mesh(new THREE.BoxGeometry(depth, height, width), i % 3 ? concrete : darkConcrete, 0, height / 2, 0, building); wall.castShadow = wall.receiveShadow = true;
    for (let floor = 1.7; floor < height - .8; floor += 2.25) for (const wz of [-width * .27, width * .27]) {
      const win = k.mesh(new THREE.PlaneGeometry(1.15, 1.25), glass, -side * (depth / 2 + .006), floor, wz, building); win.rotation.y = side * Math.PI / 2;
      if ((i + Math.round(floor) + (wz > 0 ? 1 : 0)) % 4 === 0) win.material = darkConcrete;
    }
    if (i % 2 === 0) { const pipe = k.mesh(new THREE.CylinderGeometry(.11, .14, height * .75, 8), rust, -side * (depth / 2 + .18), height * .42, width * .35, building); pipe.rotation.z = .015; }
  }

  // Bent street lamps, barricades, debris and road markings sell the abandoned setting.
  const lamps = [];
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? -1 : 1, z = -5 - i * 10, lamp = k.dynamic(k.group(side * 6.25, 0, z)); lamp.rotation.z = side * rand(-.03, .08);
    k.mesh(new THREE.CylinderGeometry(.055, .09, 4.6, 8), metal, 0, 2.3, 0, lamp);
    const arm = k.mesh(new THREE.BoxGeometry(1.15, .09, .09), metal, -side * .5, 4.55, 0, lamp); arm.rotation.z = side * -.08;
    const bulb = k.mesh(new THREE.SphereGeometry(.12, 10, 8), glow(0xd7d0b0, { transparent: true, opacity: .82 }), -side * 1.02, 4.38, 0, lamp); lamps.push({ bulb, phase: rand(0, 8), dead: i % 3 === 0 });
  }
  k.animated.push(t => lamps.forEach(o => { o.bulb.material.opacity = o.dead ? .05 : (Math.sin(t * 17 + o.phase) > -.82 ? .72 : .16); }));
  for (let i = 0; i < 16; i++) {
    const side = i % 2 ? -1 : 1, z = rand(-78, -3), item = k.group(side * rand(6.9, 9.6), 0, z); item.rotation.y = rand(-1.1, 1.1);
    if (i % 3 === 0) { k.mesh(new THREE.BoxGeometry(1.5, .75, .65), rust, 0, .38, 0, item); k.mesh(new THREE.BoxGeometry(1.6, .08, .74), metal, 0, .8, 0, item); }
    else { const slab = k.mesh(new THREE.BoxGeometry(rand(.7, 1.8), rand(.12, .3), rand(.45, 1.2)), i % 2 ? concrete : rust, 0, rand(.08, .18), 0, item); slab.rotation.set(rand(-.2, .2), rand(-.5, .5), rand(-.12, .12)); }
  }
  for (let z = -12; z > -80; z -= 16) for (const side of [-1, 1]) { const barrier = k.group(side * 5.1, 0, z); barrier.rotation.y = side * rand(-.18, .18); k.mesh(new THREE.BoxGeometry(2.3, .22, .18), warning, 0, .72, 0, barrier).rotation.z = side * .06; for (const x of [-.9, .9]) k.mesh(new THREE.BoxGeometry(.13, 1.15, .13), metal, x, .42, 0, barrier); }

  // Each stage keeps its gameplay identity while staying grounded in a realistic location.
  if (theme === 'carnival') {
    const wheel = k.group(11, 8, -58); wheel.rotation.y = -.25; k.mesh(new THREE.TorusGeometry(7.5, .16, 8, 48), rust, 0, 0, 0, wheel); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; const spoke = k.mesh(new THREE.BoxGeometry(.1, 7.4, .1), metal, 0, 0, 0, wheel); spoke.rotation.z = a; k.mesh(new THREE.BoxGeometry(1.15, .7, .7), darkConcrete, Math.sin(a) * 7.5, Math.cos(a) * 7.5, 0, wheel); }
  } else if (theme === 'graveyard') {
    for (let i = 0; i < 24; i++) { const [x, z] = k.side(7.5, 14, -78, -4), stone = k.group(x, 0, z); stone.rotation.y = rand(-.35, .35); const h = rand(.8, 1.7); k.mesh(new THREE.BoxGeometry(rand(.45, .75), h, .24), concrete, 0, h / 2, 0, stone); if (i % 4 === 0) k.mesh(new THREE.BoxGeometry(.9, .18, .22), concrete, 0, h * .75, 0, stone); }
  } else if (theme === 'moon') {
    for (const side of [-1, 1]) { const dome = k.mesh(new THREE.SphereGeometry(4.3, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), metal, side * 11, 0, -38); dome.scale.y = .65; }
  } else if (theme === 'snow') {
    k.floaters(700, 0xdbe5ea, [-20, 20, .3, 18, -80, 5], .055, .22);
  } else if (theme === 'beach') {
    const water = k.mesh(new THREE.PlaneGeometry(55, 120), std(0x1a3036, { metalness: .25, roughness: .38 }), -30, -.05, -38); water.rotation.x = -Math.PI / 2;
  } else {
    for (const side of [-1, 1]) for (let i = 0; i < 4; i++) { const tank = k.mesh(new THREE.CylinderGeometry(2.1, 2.1, 4.8, 18), metal, side * 11.5, 2.4, -14 - i * 18); tank.rotation.z = i === 3 ? side * .16 : 0; }
  }
  if (theme !== 'snow') k.floaters(theme === 'moon' ? 180 : 95, theme === 'moon' ? 0x9da4aa : 0x484a47, [-18, 18, .3, 12, -82, 4], .045, .12);
}

// 每個場景的天色與燈光
export const THEME_LIGHTING = {
  carnival: { fog: [0x1a2240, .018], hemi: [0x9fb8ff, 0x2a2a3a, 2.1], sun: [0xb9eaff, 3.4] },
  candy: { fog: [0xffc6e0, .014], hemi: [0xfff0f8, 0xb07aa0, 2.6], sun: [0xfff1d6, 3.2] },
  snow: { fog: [0xa9c4e8, .018], hemi: [0xdfefff, 0x8aa0c0, 2.3], sun: [0xe8f4ff, 2.8] },
  beach: { fog: [0xffb38a, .011], hemi: [0xffd6b0, 0x8a6a8a, 2.3], sun: [0xffb070, 3.6] },
  graveyard: { fog: [0x2a1840, .028], hemi: [0x9a7fd0, 0x201830, 1.7], sun: [0xc0a0ff, 2.2] },
  moon: { fog: [0x05060f, .006], hemi: [0xb0c0ff, 0x303040, 1.8], sun: [0xffffff, 3.4] }
};
const ADULT_LIGHTING = {
  carnival: { fog: [0x1a2024, .024], hemi: [0x718493, 0x181b1d, 1.05], sun: [0xc5b59e, 1.65] },
  candy: { fog: [0x202727, .023], hemi: [0x78827d, 0x1b1d1b, 1.08], sun: [0xc4b89e, 1.55] },
  snow: { fog: [0x66717a, .032], hemi: [0x9caab4, 0x343a3e, 1.05], sun: [0xd4d9d8, 1.35] },
  beach: { fog: [0x354047, .024], hemi: [0x78868c, 0x202628, .9], sun: [0xb39a7e, 1.45] },
  graveyard: { fog: [0x161d1e, .032], hemi: [0x5d7070, 0x101414, .88], sun: [0x9ba7a2, 1.22] },
  moon: { fog: [0x080c12, .012], hemi: [0x5e6c83, 0x080a0e, .62], sun: [0xaebbd0, 1.4] }
};
const BUILDERS = { carnival, candy, snow, beach, graveyard, moon };

export function buildScene(scene, theme, lights, mode = 'child') {
  const root = new THREE.Group(); scene.add(root);
  const kit = makeKit(root); if (mode === 'adult') adultEnvironment(kit, theme); else BUILDERS[theme](kit); bakeStatic(root);
  const cfg = mode === 'adult' ? ADULT_LIGHTING[theme] : THEME_LIGHTING[theme];
  scene.fog.color.setHex(cfg.fog[0]); scene.fog.density = cfg.fog[1]; scene.background.setHex(cfg.fog[0]);
  lights.hemi.color.setHex(cfg.hemi[0]); lights.hemi.groundColor.setHex(cfg.hemi[1]); lights.hemi.intensity = cfg.hemi[2];
  lights.sun.color.setHex(cfg.sun[0]); lights.sun.intensity = cfg.sun[1];
  return {
    update: elapsed => kit.animated.forEach(fn => fn(elapsed)),
    dispose() { scene.remove(root); const seen = new Set(); root.traverse(o => { if (o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); } const mats = o.material ? [].concat(o.material) : []; for (const m of mats) { if (seen.has(m)) continue; seen.add(m); m.map?.dispose(); m.dispose(); } }); }
  };
}
