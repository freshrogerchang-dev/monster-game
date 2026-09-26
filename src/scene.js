import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

// 夜晚遊樂園場景：回傳 update(elapsed) 讓摩天輪、旋轉木馬、燈泡等動起來
function canvasTexture(size, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(...repeat); tex.anisotropy = 4; return tex;
}
const rand = (a, b) => a + Math.random() * (b - a);
const BULB_COLORS = [0xffe066, 0xff6b9d, 0x6be4ff, 0xa3ff78, 0xffa94d, 0xd7a8ff];

export function buildScene(scene) {
  const animated = [];

  // 天空：漸層 + 星星
  const sky = new THREE.Mesh(new THREE.SphereGeometry(95, 32, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false, map: canvasTexture(256, (g, s) => { const grad = g.createLinearGradient(0, 0, 0, s); grad.addColorStop(0, '#050b24'); grad.addColorStop(.45, '#1b2458'); grad.addColorStop(.58, '#4a3a78'); grad.addColorStop(.7, '#0b1a26'); g.fillStyle = grad; g.fillRect(0, 0, s, s); }) }));
  scene.add(sky);
  const starGeo = new THREE.BufferGeometry(), starPos = [];
  for (let i = 0; i < 600; i++) { const th = Math.random() * Math.PI * 2, ph = rand(.08, 1.2); starPos.push(Math.cos(th) * Math.cos(ph) * 90, Math.sin(ph) * 90, Math.sin(th) * Math.cos(ph) * 90); }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xfff6d8, size: .35, fog: false, transparent: true })); scene.add(stars);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(4.2, 28, 18), new THREE.MeshBasicMaterial({ color: 0xfff3c4, fog: false })); moon.position.set(22, 30, -70); scene.add(moon);
  const moonHalo = new THREE.Mesh(new THREE.CircleGeometry(8, 32), new THREE.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, opacity: .12, fog: false })); moonHalo.position.copy(moon.position).add(new THREE.Vector3(0, 0, -1)); moonHalo.lookAt(0, 2, 5); scene.add(moonHalo);

  // 地面：草地 + 石磚路
  const grass = canvasTexture(256, (g, s) => { g.fillStyle = '#1f3a2a'; g.fillRect(0, 0, s, s); for (let i = 0; i < 2600; i++) { g.fillStyle = `hsl(${rand(120, 150)}, ${rand(25, 45)}%, ${rand(12, 26)}%)`; g.fillRect(rand(0, s), rand(0, s), 2, rand(2, 6)); } }, [24, 30]);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 150), new THREE.MeshStandardMaterial({ map: grass, roughness: .95 })); ground.rotation.x = -Math.PI / 2; ground.position.z = -35; ground.receiveShadow = true; scene.add(ground);
  const bricks = canvasTexture(256, (g, s) => { g.fillStyle = '#3a3440'; g.fillRect(0, 0, s, s); const h = s / 8; for (let r = 0; r < 8; r++) for (let c = -1; c < 5; c++) { const w = s / 4, x = c * w + (r % 2 ? w / 2 : 0); g.fillStyle = `hsl(${rand(260, 290)}, ${rand(8, 16)}%, ${rand(30, 40)}%)`; g.fillRect(x + 3, r * h + 3, w - 6, h - 6); } }, [3, 26]);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(13, 110), new THREE.MeshStandardMaterial({ map: bricks, roughness: .9 })); road.rotation.x = -Math.PI / 2; road.position.set(0, .012, -32); road.receiveShadow = true; scene.add(road);
  for (const side of [-1, 1]) { const edge = new THREE.Mesh(new THREE.BoxGeometry(.35, .12, 110), new THREE.MeshStandardMaterial({ color: 0x9a8fb0, roughness: .8 })); edge.position.set(side * 6.6, .06, -32); scene.add(edge); }

  // 攤位：條紋遮雨棚 + 燈泡
  const bulbGeo = new THREE.SphereGeometry(.09, 8, 6), bulbMats = BULB_COLORS.map(c => new THREE.MeshBasicMaterial({ color: c })), bulbs = [];
  const addBulb = (x, y, z, i) => { const b = new THREE.Mesh(bulbGeo, bulbMats[i % bulbMats.length]); b.position.set(x, y, z); scene.add(b); bulbs.push(b); };
  const awningColors = [['#ff5d73', '#fff4e0'], ['#4cc9f0', '#fff4e0'], ['#ffd166', '#7b4bb7'], ['#06d6a0', '#fff4e0']];
  const signText = ['棉花糖', '爆米花', '套圈圈', '射水球', '冰淇淋', '抽獎', '熱狗'];
  for (const side of [-1, 1]) for (let i = 0; i < 7; i++) {
    const x = side * rand(10, 12.5), z = -6 - i * 11, w = 5, d = 4.2, h = 3;
    const booth = new THREE.Group(); booth.position.set(x, 0, z); booth.rotation.y = -side * Math.PI / 2; scene.add(booth);
    const wood = new THREE.MeshStandardMaterial({ color: i % 2 ? 0x8a5a3c : 0x6f4a8a, roughness: .8 });
    const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, .3), wood); back.position.set(0, h / 2, -d / 2); back.castShadow = true; booth.add(back);
    for (const sx of [-1, 1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, h + .4, 8), new THREE.MeshStandardMaterial({ color: 0xf2e6d0 })); post.position.set(sx * (w / 2 - .15), (h + .4) / 2, d / 2 - .2); booth.add(post); const side = new THREE.Mesh(new THREE.BoxGeometry(.25, h, d), wood); side.position.set(sx * (w / 2 - .12), h / 2, 0); booth.add(side); }
    const counter = new THREE.Mesh(new THREE.BoxGeometry(w - .3, 1.1, .6), new THREE.MeshStandardMaterial({ color: 0xf2e6d0, roughness: .7 })); counter.position.set(0, .55, d / 2 - .3); counter.castShadow = true; booth.add(counter);
    const [c1, c2] = awningColors[i % awningColors.length];
    const stripe = canvasTexture(128, (g, s) => { for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? c2 : c1; g.fillRect(k * s / 8, 0, s / 8, s); } });
    const awning = new THREE.Mesh(new THREE.BoxGeometry(w + .4, .12, d + .6), new THREE.MeshStandardMaterial({ map: stripe, roughness: .7 })); awning.position.set(0, h + .5, .2); awning.rotation.x = .18; awning.castShadow = true; booth.add(awning);
    for (let k = 0; k < 8; k++) { const flap = new THREE.Mesh(new THREE.ConeGeometry(.33, .45, 3), new THREE.MeshStandardMaterial({ color: k % 2 ? c2 : c1 })); flap.position.set(-w / 2 + .15 + k * (w + .1) / 8 + .2, h + .02, d / 2 + .55); flap.rotation.set(Math.PI, 0, 0); booth.add(flap); }
    const sign = canvasTexture(256, (g, s) => { g.fillStyle = '#2b1740'; g.fillRect(0, 0, s, s); g.strokeStyle = c1; g.lineWidth = 14; g.strokeRect(8, 8, s - 16, s - 16); g.fillStyle = '#fff4c2'; g.font = 'bold 64px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(signText[(i + (side > 0 ? 3 : 0)) % signText.length], s / 2, s / 2); });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.1), new THREE.MeshBasicMaterial({ map: sign })); board.position.set(0, h + 1.35, d / 2 + .1); booth.add(board);
    // 攤位上的小玩偶
    for (let k = 0; k < 4; k++) { const toy = new THREE.Mesh(new THREE.SphereGeometry(.2, 12, 10), new THREE.MeshStandardMaterial({ color: BULB_COLORS[(k + i) % BULB_COLORS.length], roughness: .5 })); toy.position.set(-1.4 + k * .95, 1.3, d / 2 - .35); booth.add(toy); }
    booth.updateMatrixWorld(true);
    for (let k = 0; k <= 10; k++) { const p = new THREE.Vector3(-w / 2 - .1 + k * (w + .2) / 10, h + .3, d / 2 + .7).applyMatrix4(booth.matrixWorld); addBulb(p.x, p.y, p.z, k + i); }
  }

  // 橫跨道路的串燈
  for (let z = -4; z > -70; z -= 9) {
    const y0 = 5.2; for (let k = 0; k <= 16; k++) { const t = k / 16, x = -8 + 16 * t, sag = Math.sin(t * Math.PI) * 1.1; addBulb(x, y0 - sag, z + (t - .5) * 1.5, k); }
    const wire = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-8, 5.2, z - .75), new THREE.Vector3(0, 4.1, z), new THREE.Vector3(8, 5.2, z + .75)]), 16, .015, 4), new THREE.MeshBasicMaterial({ color: 0x222222 })); scene.add(wire);
  }

  // 路燈
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x2c2d3f, roughness: .5, metalness: .4 }), glowMat = new THREE.MeshBasicMaterial({ color: 0xfff0b3 });
  for (const side of [-1, 1]) for (let z = -2; z > -70; z -= 14) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.07, .1, 4.4, 8), lampMat); pole.position.set(side * 7.3, 2.2, z); scene.add(pole);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(.35, .3, 8), lampMat); cap.position.set(side * 7.3, 4.75, z); scene.add(cap);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(.22, 12, 10), glowMat); glow.position.set(side * 7.3, 4.45, z); scene.add(glow);
  }
  for (const [x, z, c] of [[-7, -8, 0xffd9a0], [7, -20, 0xffb3d9], [-7, -34, 0xa0e8ff]]) { const l = new THREE.PointLight(c, 10, 16); l.position.set(x, 4.2, z); scene.add(l); }

  // 摩天輪
  const wheel = new THREE.Group(); wheel.position.set(-24, 13, -50); scene.add(wheel);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xd66bff, emissive: 0x6b1f8a, emissiveIntensity: .8, roughness: .4 });
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(10, .25, 8, 48), rimMat)); wheel.add(new THREE.Mesh(new THREE.TorusGeometry(7, .12, 6, 40), rimMat));
  for (let i = 0; i < 12; i++) { const spoke = new THREE.Mesh(new THREE.BoxGeometry(.12, 20, .12), rimMat); spoke.rotation.z = i * Math.PI / 12; wheel.add(spoke); }
  wheel.add(new THREE.Mesh(new THREE.CylinderGeometry(.8, .8, .8, 16).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffe066 })));
  const wheelBulbs = []; for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2, b = new THREE.Mesh(bulbGeo, bulbMats[i % bulbMats.length]); b.position.set(Math.cos(a) * 10, Math.sin(a) * 10, .3); b.scale.setScalar(1.6); wheel.add(b); wheelBulbs.push(b); }
  const cabins = []; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, cabin = new THREE.Group(); cabin.position.set(Math.cos(a) * 10, Math.sin(a) * 10, 0); const box = new THREE.Mesh(new THREE.CylinderGeometry(.8, .7, 1.2, 10), new THREE.MeshStandardMaterial({ color: BULB_COLORS[i % BULB_COLORS.length], roughness: .5 })); box.position.y = -1.1; cabin.add(box); const roof = new THREE.Mesh(new THREE.ConeGeometry(.9, .5, 10), new THREE.MeshStandardMaterial({ color: 0xfff4e0 })); roof.position.y = -.3; cabin.add(roof); wheel.add(cabin); cabins.push(cabin); }
  for (const side of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(.3, .45, 15, 8), new THREE.MeshStandardMaterial({ color: 0x5a4a78 })); leg.position.set(-24 + side * 4, 6.5, -50.5); leg.rotation.z = side * .27; scene.add(leg); }
  animated.push(t => { wheel.rotation.z = t * .12; cabins.forEach(c => { c.rotation.z = -wheel.rotation.z; }); });

  // 旋轉木馬
  const carousel = new THREE.Group(); carousel.position.set(22, 0, -40); scene.add(carousel);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(6, 6.3, .6, 32), new THREE.MeshStandardMaterial({ color: 0xf2e6d0, roughness: .6 })); base.position.y = .3; carousel.add(base);
  const roofTex = canvasTexture(256, (g, s) => { for (let k = 0; k < 16; k++) { g.fillStyle = k % 2 ? '#ff5d73' : '#fff4e0'; g.fillRect(k * s / 16, 0, s / 16, s); } });
  const cRoof = new THREE.Mesh(new THREE.ConeGeometry(6.8, 3, 32), new THREE.MeshStandardMaterial({ map: roofTex, roughness: .6 })); cRoof.position.y = 6.3; carousel.add(cRoof);
  const topper = new THREE.Mesh(new THREE.SphereGeometry(.5, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffe066 })); topper.position.y = 8; carousel.add(topper);
  const spin = new THREE.Group(); carousel.add(spin); const center = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 4.2, 16), new THREE.MeshStandardMaterial({ color: 0x7b4bb7, emissive: 0x2a1040 })); center.position.y = 2.7; spin.add(center);
  const horses = []; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, r = 4.2, holder = new THREE.Group(); holder.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); holder.rotation.y = -a; spin.add(holder); const pole = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 4.6, 6), new THREE.MeshStandardMaterial({ color: 0xffd166, metalness: .6, roughness: .3 })); pole.position.y = 2.9; holder.add(pole); const horse = new THREE.Group(), hm = new THREE.MeshStandardMaterial({ color: BULB_COLORS[i % BULB_COLORS.length], roughness: .5 }); horse.add(new THREE.Mesh(new THREE.CapsuleGeometry(.3, .7, 4, 8).rotateX(Math.PI / 2).rotateY(Math.PI / 2), hm)); const hh = new THREE.Mesh(new THREE.CapsuleGeometry(.18, .35, 4, 8), hm); hh.position.set(0, .35, 0); hh.rotation.z = -.5; hh.position.x = .55; horse.add(hh); horse.position.y = 2; holder.add(horse); horses.push(horse); }
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, b = new THREE.Mesh(bulbGeo, bulbMats[i % bulbMats.length]); b.position.set(Math.cos(a) * 6.5, 4.85, Math.sin(a) * 6.5); b.scale.setScalar(1.5); carousel.add(b); bulbs.push(b); }
  const cLight = new THREE.PointLight(0xffc0e0, 14, 20); cLight.position.set(22, 4, -36); scene.add(cLight);
  animated.push(t => { spin.rotation.y = t * .4; horses.forEach((h, i) => { h.position.y = 2 + Math.sin(t * 2 + i) * .35; }); });

  // 樹、南瓜燈、墓碑、氣球
  const treeMat = new THREE.MeshStandardMaterial({ color: 0x1f5a45, roughness: .9 }), trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3a2a });
  for (let i = 0; i < 26; i++) { const side = i % 2 ? 1 : -1, x = side * rand(16, 34), z = rand(-80, 2); if (Math.abs(x - 22) < 8 && Math.abs(z + 40) < 8) continue; const tree = new THREE.Group(); tree.position.set(x, 0, z); const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.2, .3, 1.4, 6), trunkMat); trunk.position.y = .7; tree.add(trunk); for (let k = 0; k < 3; k++) { const cone = new THREE.Mesh(new THREE.ConeGeometry(1.6 - k * .4, 1.8, 8), treeMat); cone.position.y = 1.8 + k * 1; tree.add(cone); } tree.scale.setScalar(rand(.9, 1.6)); scene.add(tree); }
  const pumpkinMat = new THREE.MeshStandardMaterial({ color: 0xff8c2a, emissive: 0x7a2a00, emissiveIntensity: .6, roughness: .6 }), stemMat = new THREE.MeshStandardMaterial({ color: 0x3a6a2a });
  for (let i = 0; i < 14; i++) { const side = i % 2 ? 1 : -1, p = new THREE.Group(); p.position.set(side * rand(7.2, 8.6), .3, -3 - i * 5); const body = new THREE.Mesh(new THREE.SphereGeometry(.35, 14, 10), pumpkinMat); body.scale.set(1.2, .85, 1.2); p.add(body); const stem = new THREE.Mesh(new THREE.CylinderGeometry(.04, .05, .2, 6), stemMat); stem.position.y = .35; p.add(stem); for (const ex of [-.12, .12]) { const eye = new THREE.Mesh(new THREE.ConeGeometry(.06, .1, 3), new THREE.MeshBasicMaterial({ color: 0xffe066 })); eye.position.set(ex, .06, .38); eye.rotation.x = Math.PI / 2; p.add(eye); } p.rotation.y = -side * .9; scene.add(p); }
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8a8aa0, roughness: .9 });
  for (let i = 0; i < 8; i++) { const side = i % 2 ? 1 : -1, s = new THREE.Mesh(new THREE.CapsuleGeometry(.35, .5, 4, 10), stoneMat); s.scale.set(1, 1, .35); s.position.set(side * rand(14, 17), .55, -12 - i * 8); s.rotation.z = rand(-.15, .15); scene.add(s); }
  const balloons = []; for (let i = 0; i < 12; i++) { const side = i % 2 ? 1 : -1, g = new THREE.Group(); g.position.set(side * rand(8.5, 14), rand(5, 8), rand(-60, -6)); const b = new THREE.Mesh(new THREE.SphereGeometry(.45, 14, 12), new THREE.MeshStandardMaterial({ color: BULB_COLORS[i % BULB_COLORS.length], roughness: .25, emissive: BULB_COLORS[i % BULB_COLORS.length], emissiveIntensity: .15 })); b.scale.y = 1.2; g.add(b); const str = new THREE.Mesh(new THREE.CylinderGeometry(.01, .01, 1.6, 4), new THREE.MeshBasicMaterial({ color: 0xdddddd })); str.position.y = -1.3; g.add(str); scene.add(g); balloons.push({ g, y: g.position.y, p: Math.random() * 6 }); }
  animated.push(t => balloons.forEach(b => { b.g.position.y = b.y + Math.sin(t * .8 + b.p) * .3; b.g.rotation.z = Math.sin(t * .6 + b.p) * .1; }));

  // 螢火蟲
  const flyGeo = new THREE.BufferGeometry(), flyBase = []; for (let i = 0; i < 80; i++) flyBase.push(rand(-14, 14), rand(.5, 4), rand(-50, 2));
  flyGeo.setAttribute('position', new THREE.Float32BufferAttribute(flyBase.slice(), 3));
  const flies = new THREE.Points(flyGeo, new THREE.PointsMaterial({ color: 0xd8ff8a, size: .12, transparent: true, opacity: .9 })); scene.add(flies);
  animated.push(t => { const pos = flyGeo.attributes.position; for (let i = 0; i < 80; i++) { pos.setXYZ(i, flyBase[i * 3] + Math.sin(t * .5 + i) * .6, flyBase[i * 3 + 1] + Math.sin(t * .9 + i * 1.7) * .3, flyBase[i * 3 + 2] + Math.cos(t * .4 + i) * .6); } pos.needsUpdate = true; flies.material.opacity = .6 + Math.sin(t * 3) * .3; });

  // 燈泡閃爍（換色而非開關，避免閃得刺眼）
  animated.push(t => { const step = Math.floor(t * 2.5); bulbs.forEach((b, i) => { b.material = bulbMats[(i + step) % bulbMats.length]; }); wheelBulbs.forEach((b, i) => { b.visible = (i + step) % 3 !== 0; }); stars.material.opacity = .75 + Math.sin(t * 1.3) * .2; });

  return elapsed => animated.forEach(fn => fn(elapsed));
}
