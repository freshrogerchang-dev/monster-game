import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

// 可愛 Q 版殭屍：大頭、大眼、腮紅，三種造型共用幾何體以節省效能
export const ZOMBIE_TYPES = {
  normal: { scale: 1, speed: 1.15, damage: 20, rate: 40, points: 100, skin: 0x9bd48a, cloth: 0x4a7fc1, pants: 0x6b4f8a },
  fast: { scale: .85, speed: 2.2, damage: 14, rate: 57, points: 170, skin: 0xc7e38f, cloth: 0xf08a4b, pants: 0x3f6e8c },
  tank: { scale: 1.3, speed: .72, damage: 28, rate: 25, points: 300, skin: 0x7fbf9a, cloth: 0x8f5fb8, pants: 0x4d5a66 },
  boss: { scale: 2.1, speed: .5, damage: 45, rate: 9, points: 1500, skin: 0xb59be8, cloth: 0xe0457b, pants: 0x3b3f6e }
};

const geo = {
  head: new THREE.SphereGeometry(.5, 24, 18),
  torso: new THREE.CapsuleGeometry(.3, .32, 6, 14),
  belly: new THREE.SphereGeometry(.34, 16, 12),
  limb: new THREE.CapsuleGeometry(.1, .34, 4, 10),
  leg: new THREE.CapsuleGeometry(.12, .26, 4, 10),
  hand: new THREE.SphereGeometry(.12, 12, 10),
  shoe: new THREE.SphereGeometry(.15, 12, 8),
  eyeWhite: new THREE.SphereGeometry(.15, 18, 14),
  pupil: new THREE.SphereGeometry(.08, 14, 10),
  shine: new THREE.SphereGeometry(.03, 8, 6),
  cheek: new THREE.SphereGeometry(.08, 12, 8),
  mouth: new THREE.TorusGeometry(.09, .025, 8, 16, Math.PI),
  tooth: new THREE.BoxGeometry(.05, .06, .03),
  patch: new THREE.BoxGeometry(.18, .16, .04),
  stitch: new THREE.BoxGeometry(.02, .09, .02),
  sprout: new THREE.ConeGeometry(.05, .22, 8),
  leaf: new THREE.SphereGeometry(.08, 10, 6),
  capTop: new THREE.SphereGeometry(.44, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
  capBrim: new THREE.CylinderGeometry(.34, .34, .04, 20),
  bandage: new THREE.TorusGeometry(.49, .06, 8, 28),
  crown: new THREE.CylinderGeometry(.34, .3, .26, 10, 1, true),
  gem: new THREE.OctahedronGeometry(.07),
  hitbox: new THREE.CylinderGeometry(.55, .55, 2.3, 8)
};
const shared = {
  white: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .25 }),
  pupil: new THREE.MeshStandardMaterial({ color: 0x1b1d2b, roughness: .2 }),
  shine: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  cheek: new THREE.MeshStandardMaterial({ color: 0xff8fa8, roughness: .6, transparent: true, opacity: .85 }),
  mouth: new THREE.MeshStandardMaterial({ color: 0x3b1f2b, roughness: .6 }),
  patch: new THREE.MeshStandardMaterial({ color: 0xffd35c, roughness: .8 }),
  stitch: new THREE.MeshStandardMaterial({ color: 0x2d2d3a, roughness: .8 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x5fd35a, roughness: .6 }),
  cap: new THREE.MeshStandardMaterial({ color: 0xe8474f, roughness: .5 }),
  bandage: new THREE.MeshStandardMaterial({ color: 0xf4efe2, roughness: .9 }),
  crown: new THREE.MeshStandardMaterial({ color: 0xffd84a, metalness: .6, roughness: .3, side: THREE.DoubleSide }),
  gem: new THREE.MeshBasicMaterial({ color: 0xff4f8b }),
  hitbox: new THREE.MeshBasicMaterial({ visible: false })
};

function mesh(geometry, material, x = 0, y = 0, z = 0, parent) { const m = new THREE.Mesh(geometry, material); m.position.set(x, y, z); parent?.add(m); return m; }

function createChildZombieModel(type = 'normal') {
  const cfg = ZOMBIE_TYPES[type];
  const skin = new THREE.MeshStandardMaterial({ color: cfg.skin, roughness: .65 }), cloth = new THREE.MeshStandardMaterial({ color: cfg.cloth, roughness: .75 }), pants = new THREE.MeshStandardMaterial({ color: cfg.pants, roughness: .8 });
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);

  // 身體
  const torso = mesh(geo.torso, cloth, 0, 1.0, 0, body); torso.castShadow = true; if (type === 'tank' || type === 'boss') torso.scale.set(1.25, 1, 1.15);
  mesh(geo.belly, pants, 0, .72, 0, body).scale.set(type === 'tank' ? 1.1 : .92, .55, .88);
  const patch = mesh(geo.patch, shared.patch, .12, 1.05, .29, body); patch.rotation.z = .2;
  for (const x of [-.06, .06]) { const s = mesh(geo.stitch, shared.stitch, .12 + x, 1.05, .32, body); s.rotation.z = .2; }

  // 腳（樞紐在臀部，方便擺動）
  const limbs = [];
  const arms = []; for (const side of [-1, 1]) { const pivot = new THREE.Group(); pivot.position.set(side * .38, 1.18, 0); body.add(pivot); mesh(geo.limb, skin, 0, -.24, 0, pivot); mesh(geo.hand, skin, 0, -.48, 0, pivot); arms.push(pivot); }
  const legs = []; for (const side of [-1, 1]) { const pivot = new THREE.Group(); pivot.position.set(side * .16, .6, 0); body.add(pivot); mesh(geo.leg, pants, 0, -.25, 0, pivot); mesh(geo.shoe, shared.pupil, 0, -.5, .06, pivot).scale.set(1, .6, 1.4); legs.push(pivot); }
  limbs.push(...arms, ...legs);

  // 大頭
  const head = new THREE.Group(); head.position.y = 1.72; body.add(head);
  const skull = mesh(geo.head, skin, 0, 0, 0, head); skull.scale.set(1.08, .98, 1); skull.castShadow = true;
  const bigEye = type === 'fast' ? -1 : 1; // 一大一小的眼睛比較俏皮
  for (const side of [-1, 1]) {
    const eye = new THREE.Group(); eye.position.set(side * .19, .05, .4); eye.scale.setScalar(side === bigEye ? 1.12 : .92); head.add(eye);
    mesh(geo.eyeWhite, shared.white, 0, 0, 0, eye).scale.z = .7;
    mesh(geo.pupil, shared.pupil, side * -.015, -.01, .08, eye);
    mesh(geo.shine, shared.shine, .03, .035, .14, eye);
    mesh(geo.cheek, shared.cheek, side * .1, -.2, .02, eye).scale.set(1.2, .6, .4);
  }
  const mouth = mesh(geo.mouth, shared.mouth, 0, -.2, .45, head); mouth.rotation.z = Math.PI;
  mesh(geo.tooth, shared.white, .04, -.215, .47, head);

  // 造型配件
  if (type === 'normal') { const sprout = mesh(geo.sprout, shared.leaf, 0, .56, 0, head); sprout.rotation.z = .2; for (const side of [-1, 1]) mesh(geo.leaf, shared.leaf, side * .09 + .04, .68, 0, head).scale.set(1.3, .5, .8); }
  if (type === 'fast') { const cap = mesh(geo.capTop, shared.cap, 0, .3, -.06, head); cap.rotation.x = -.3; const brim = mesh(geo.capBrim, shared.cap, 0, .36, .26, head); brim.scale.set(.9, 1, .75); brim.rotation.x = .25; }
  if (type === 'boss') { const crown = mesh(geo.crown, shared.crown, 0, .52, 0, head); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; mesh(geo.gem, shared.gem, Math.sin(a) * .33, .52, Math.cos(a) * .33, head); const spike = mesh(geo.sprout, shared.crown, Math.sin(a) * .3, .75, Math.cos(a) * .3, head); spike.scale.set(1.2, .9, 1.2); } }
  if (type === 'tank') { const band = mesh(geo.bandage, shared.bandage, 0, .16, 0, head); band.rotation.x = Math.PI / 2 - .25; band.scale.set(1.04, 1, 1); }

  // 瞄準用的隱形碰撞體：只對它做射線判定，比逐一檢查三十幾個零件快很多
  const hitbox = mesh(geo.hitbox, shared.hitbox, 0, 1.15, 0, root); hitbox.userData.enemyRoot = root;
  root.scale.setScalar(cfg.scale);
  return { root, hitbox, body, head, limbs, parts: [skin, cloth, pants], baseColors: [skin.color.clone(), cloth.color.clone(), pants.color.clone()] };
}

const realisticGeo = {
  head: new THREE.SphereGeometry(.235, 24, 18),
  jaw: new THREE.BoxGeometry(.28, .16, .22),
  torso: new THREE.CylinderGeometry(.26, .20, .72, 10),
  shoulder: new THREE.BoxGeometry(.68, .16, .28),
  arm: new THREE.CapsuleGeometry(.07, .42, 5, 9),
  forearm: new THREE.CapsuleGeometry(.065, .37, 5, 9),
  leg: new THREE.CapsuleGeometry(.095, .48, 5, 10),
  shin: new THREE.CapsuleGeometry(.085, .43, 5, 10),
  hand: new THREE.BoxGeometry(.13, .18, .08),
  boot: new THREE.BoxGeometry(.19, .14, .34),
  eye: new THREE.SphereGeometry(.035, 10, 8),
  socket: new THREE.SphereGeometry(.07, 10, 8),
  tooth: new THREE.BoxGeometry(.035, .055, .025),
  wound: new THREE.CircleGeometry(.09, 14),
  hitbox: new THREE.CylinderGeometry(.38, .38, 2.25, 8)
};

const adultShared = {
  socket: new THREE.MeshStandardMaterial({ color: 0x17191a, roughness: 1 }),
  eye: new THREE.MeshStandardMaterial({ color: 0xd9c9ae, emissive: 0x6b120e, emissiveIntensity: .65, roughness: .45 }),
  mouth: new THREE.MeshStandardMaterial({ color: 0x241314, roughness: 1 }),
  teeth: new THREE.MeshStandardMaterial({ color: 0xc6b99b, roughness: .85 }),
  wound: new THREE.MeshStandardMaterial({ color: 0x4d1716, roughness: .9, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }),
  boot: new THREE.MeshStandardMaterial({ color: 0x17191a, roughness: .92 }),
  hitbox: new THREE.MeshBasicMaterial({ visible: false })
};

const ADULT_PALETTE = {
  normal: { skin: 0x7d8278, cloth: 0x38434a, pants: 0x252b2d },
  fast: { skin: 0x858779, cloth: 0x51473d, pants: 0x20282b },
  tank: { skin: 0x6d756d, cloth: 0x33383a, pants: 0x202326 },
  boss: { skin: 0x77716d, cloth: 0x342d2d, pants: 0x1d2021 }
};

function createRealisticZombieModel(type) {
  const cfg = ZOMBIE_TYPES[type], palette = ADULT_PALETTE[type];
  const skin = new THREE.MeshStandardMaterial({ color: palette.skin, roughness: .96, metalness: 0 });
  const cloth = new THREE.MeshStandardMaterial({ color: palette.cloth, roughness: 1 });
  const pants = new THREE.MeshStandardMaterial({ color: palette.pants, roughness: .94 });
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  body.rotation.x = type === 'fast' ? .18 : .10;

  const torso = mesh(realisticGeo.torso, cloth, 0, 1.28, 0, body); torso.castShadow = true;
  torso.scale.set(type === 'tank' || type === 'boss' ? 1.35 : type === 'fast' ? .82 : 1, 1, type === 'tank' ? 1.25 : 1);
  mesh(realisticGeo.shoulder, cloth, 0, 1.55, 0, body).scale.x = type === 'tank' || type === 'boss' ? 1.25 : 1;
  const wound = mesh(realisticGeo.wound, adultShared.wound, type === 'tank' ? -.08 : .11, 1.34, .267, body); wound.rotation.z = -.35;

  const limbs = [], arms = [], legs = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(side * (type === 'tank' ? .43 : .35), 1.52, 0); body.add(arm);
    mesh(realisticGeo.arm, skin, 0, -.25, 0, arm);
    const elbow = new THREE.Group(); elbow.position.set(0, -.48, 0); elbow.rotation.x = -.22; arm.add(elbow);
    mesh(realisticGeo.forearm, skin, 0, -.22, 0, elbow); mesh(realisticGeo.hand, skin, 0, -.47, -.015, elbow);
    arm.rotation.z = side * (type === 'tank' ? -.1 : -.03); arms.push(arm);
  }
  for (const side of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(side * .14, .94, 0); body.add(leg);
    mesh(realisticGeo.leg, pants, 0, -.30, 0, leg);
    const knee = new THREE.Group(); knee.position.set(0, -.58, 0); leg.add(knee);
    mesh(realisticGeo.shin, pants, 0, -.27, 0, knee); mesh(realisticGeo.boot, adultShared.boot, 0, -.55, .09, knee);
    legs.push(leg);
  }
  limbs.push(...arms, ...legs);

  const head = new THREE.Group(); head.position.set(type === 'fast' ? .04 : 0, 1.91, .035); head.rotation.z = type === 'normal' ? -.12 : type === 'boss' ? .08 : 0; body.add(head);
  const skull = mesh(realisticGeo.head, skin, 0, 0, 0, head); skull.scale.set(type === 'tank' ? 1.08 : .96, 1.16, .92); skull.castShadow = true;
  const jaw = mesh(realisticGeo.jaw, skin, .025, -.20, .035, head); jaw.rotation.x = type === 'fast' ? .28 : .12;
  for (const side of [-1, 1]) {
    mesh(realisticGeo.socket, adultShared.socket, side * .09, .035, .195, head).scale.set(1.25, .72, .45);
    const eye = mesh(realisticGeo.eye, adultShared.eye, side * .09, .035, .232, head); eye.scale.set(type === 'boss' ? 1.25 : .8, .7, .45);
  }
  const mouth = mesh(new THREE.BoxGeometry(.18, .045, .018), adultShared.mouth, .025, -.205, .158, head); mouth.rotation.x = -.14;
  for (const x of [-.055, 0, .055]) mesh(realisticGeo.tooth, adultShared.teeth, x + .025, -.19, .174, head).rotation.z = x * 2;

  if (type === 'boss') {
    for (const side of [-1, 1]) { const scar = mesh(new THREE.BoxGeometry(.018, .22, .014), adultShared.wound, side * .11, .02, .218, head); scar.rotation.z = side * .25; }
  }
  if (type === 'tank') mesh(new THREE.BoxGeometry(.76, .09, .31), adultShared.boot, 0, 1.63, -.01, body).rotation.z = .04;

  const hitbox = mesh(realisticGeo.hitbox, adultShared.hitbox, 0, 1.08, 0, root); hitbox.userData.enemyRoot = root;
  root.scale.setScalar(cfg.scale);
  return { root, hitbox, body, head, limbs, parts: [skin, cloth, pants], baseColors: [skin.color.clone(), cloth.color.clone(), pants.color.clone()] };
}

export function createZombieModel(type = 'normal', mode = 'child') {
  return mode === 'adult' ? createRealisticZombieModel(type) : createChildZombieModel(type);
}

const iceColor = new THREE.Color(0xa8f1ff);
// 走路動畫與冰凍變色
export function animateZombie(data, elapsed, freeze) {
  const ice = Math.min(freeze / 100, 1), move = 1 - ice;
  const t = elapsed * 7 * data.speed + data.phase, walk = Math.sin(t) * .5 * move;
  data.limbs[0].rotation.x = -1.35 + walk * .35; data.limbs[1].rotation.x = -1.35 - walk * .35;
  data.limbs[2].rotation.x = walk; data.limbs[3].rotation.x = -walk;
  data.body.position.y = Math.abs(Math.sin(t)) * .06 * move;
  data.head.rotation.z = Math.sin(t * .5) * .12 * move; data.head.rotation.x = Math.sin(t * .7) * .05 * move;
  data.parts.forEach((mat, i) => { mat.color.lerpColors(data.baseColors[i], iceColor, ice); mat.emissive.setRGB(0, ice * .1, ice * .16); });
}
