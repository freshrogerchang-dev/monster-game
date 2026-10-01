import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { bakeStatic, buildScene } from './scene.js?v=flame1';
import { createFirearm } from './weapon-model.js?v=flame1';
import { WEAPONS, WEAPON_ORDER, createLoadout, fireWeapon, hitWithBullet, hitWithFlame, reloadWeapon, selectWeapon, switchWeapon, tickBurn, tickWeapon, useFlamer } from './weapons.js?v=flame1';
import { animateZombie, createZombieModel, ZOMBIE_TYPES } from './zombie.js?v=flame1';
import { initAudio, isMuted, setFlaming, setSpraying, sfx, toggleMute } from './audio.js?v=flame1';
import { LEVELS, MAX_ALIVE, loadProgress, saveProgress, waveTypes } from './levels.js';
import { advanceEnemy, applyModeStats, applyPowerUp, applyWater, clamp, emptyBoosts, enemyTimeScale, MODE_RULES, MAX_AIM_PITCH, MAX_AIM_YAW, MIN_AIM_PITCH, POWER_UP_TYPES, relativeAngle, resolveContact, stepAim, tickBoosts } from './mechanics.js';

const EYE_HEIGHT = 2.05, GYRO_SENSITIVITY = .5, AIM_SMOOTHING = 3, AIM_MAX_SPEED = .9;
const POWER_UPS = {
  water: { label: '超級水柱', icon: '💧', color: 0x3fd8ff },
  bomb: { label: '冰凍炸彈', icon: '❄️', color: 0xb8f6ff },
  heal: { label: '補血 +30', icon: '❤️', color: 0xff6f91 },
  slow: { label: '殭屍變慢', icon: '🐢', color: 0xc38bff },
  shield: { label: '泡泡護盾', icon: '🫧', color: 0x7fe0ff },
  double: { label: '分數加倍', icon: '⭐', color: 0xffd84a },
  stop: { label: '時間暫停', icon: '⏰', color: 0xa0ffb0 }
};
const TIMED = ['water', 'slow', 'shield', 'double', 'stop'];
const ADULT_LEVEL_NAMES=['荒廢遊樂園','廢棄加工廠','暴雪隔離區','撤離海岸','荒廢墓園','月球前哨'];
function levelName(index){return state.mode==='adult'?ADULT_LEVEL_NAMES[index]:LEVELS[index].name;}

const $ = s => document.querySelector(s);
const canvas = $('#game');
const ui = { shell: $('#gameShell'), levelInfo: $('#levelInfo'), mute: $('#muteButton'), powerUp: $('#powerUp'), panel: $('#startPanel'), title: $('#startPanel h1'), text: $('#panelText'), start: $('#startButton'), grid: $('#levelGrid'), modeButtons: [...document.querySelectorAll('.mode-button')], modeBadge: $('#modeBadge'), healthBar: $('#healthBar'), healthText: $('#healthText'), score: $('#score'), message: $('#message'), flash: $('#hitFlash'), meter: $('#freezeMeter'), meterFill: $('#freezeMeter i'), crosshair: $('.crosshair') };

// ── 渲染器：畫面不順時自動降低解析度，最後關掉陰影 ──
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const quality = { ratios: [Math.min(devicePixelRatio, 1.75), 1.25, 1], level: 0, frames: 0, time: 0 };
renderer.setPixelRatio(quality.ratios[0]); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
function watchPerformance(dt) {
  quality.frames++; quality.time += dt;
  if (quality.time < 2.5) return; const fps = quality.frames / quality.time; quality.frames = 0; quality.time = 0;
  if (fps >= 40 || quality.level >= quality.ratios.length) return;
  quality.level++;
  if (quality.level < quality.ratios.length) renderer.setPixelRatio(quality.ratios[quality.level]);
  else { renderer.shadowMap.enabled = false; lights.sun.castShadow = false; scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => { m.needsUpdate = true; }); }); }
  resize();
}

const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b1a26); scene.fog = new THREE.FogExp2(0x1a2240, 0.018);
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, .05, 200); camera.position.set(0, EYE_HEIGHT, 4.8); camera.rotation.order = 'YXZ'; scene.add(camera);
const lights = { hemi: new THREE.HemisphereLight(0x9fb8ff, 0x2a2a3a, 2.1), sun: new THREE.DirectionalLight(0xb9eaff, 3.4) };
lights.sun.position.set(-8, 16, 2); lights.sun.castShadow = true; lights.sun.shadow.mapSize.set(1024, 1024); Object.assign(lights.sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -30, far: 60 });
scene.add(lights.hemi, lights.sun);

const state = { running: false, spraying: false, mode: null, health: 100, score: 0, levelScore: 0, level: 0, wave: 0, queue: [], spawnTimer: 0, waveTimer: 0, enemies: [], items: [], itemTimer: 0, boosts: emptyBoosts(), yaw: 0, pitch: 0, baseYaw: null, basePitch: null, dragX: 0, dragY: 0, dragging: false, groanTimer: 3, unlocked: loadProgress(localStorage) };
const raycaster = new THREE.Raycaster(), center = new THREE.Vector2(0, 0), clock = new THREE.Clock(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), tmp3 = new THREE.Vector3();
let world = null, worldTheme = null;
function useTheme(theme) { const key = `${state.mode || 'child'}:${theme}`; if (worldTheme === key) return; world?.dispose(); world = buildScene(scene, theme, lights, state.mode || 'child'); worldTheme = key; }

function createBlaster() {
  const gun = new THREE.Group(), blue = new THREE.MeshStandardMaterial({ color: 0x21bfd5, roughness: .35, metalness: .15 }), yellow = new THREE.MeshStandardMaterial({ color: 0xffd849, roughness: .45 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.16, .24, 1.15, 16), blue); body.rotation.x = Math.PI / 2; body.position.z = -.4; gun.add(body);
  const tank = new THREE.Mesh(new THREE.SphereGeometry(.3, 16, 12), new THREE.MeshPhysicalMaterial({ color: 0x5feeff, transparent: true, opacity: .66, transmission: .25 })); tank.scale.set(1, 1.25, 1); tank.position.set(0, .08, .02); gun.add(tank);
  const flower = new THREE.Group(); flower.position.z = -.98; for (let i = 0; i < 8; i++) { const petal = new THREE.Mesh(new THREE.SphereGeometry(.11, 10, 8), yellow); const a = i * Math.PI / 4; petal.position.set(Math.cos(a) * .17, Math.sin(a) * .17, 0); petal.scale.set(1.25, .7, .45); flower.add(petal); } const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(.1, .12, .12, 14), blue); nozzle.rotation.x = Math.PI / 2; flower.add(nozzle); gun.add(flower);
  gun.position.set(.42, -.5, -1.05); gun.rotation.set(-.06, -.06, 0); camera.add(gun); return { gun, flower };
}
const blaster = createBlaster();
const firearm = createFirearm(camera);
let loadout = createLoadout(), iceCooldown = 0, flamingNow = false;
const WEAPON_ICONS = { rifle: '🔫 步槍', sniper: '🎯 狙擊', flamer: '🔥 火焰' };
const adultControls = document.createElement('div'); adultControls.id = 'adultControls'; adultControls.hidden = true;
adultControls.innerHTML = '<div class="ammo-readout"><small id="weaponName"></small><strong id="ammoCount"></strong><span id="reloadState"></span><i id="fuelBar"><b></b></i></div><div class="combat-buttons"><button id="weaponSwitch" aria-label="切換武器：步槍、狙擊槍、火焰槍">切換槍械</button><button id="scopeButton" aria-label="開鏡" aria-pressed="false">⊕ 開鏡</button><button id="reloadButton">換彈</button><button id="iceButton">❄ 冰爆</button><button id="fireButton" aria-label="按住射擊">射擊</button></div>';
ui.shell.append(adultControls);
const scopeOverlay = document.createElement('div'); scopeOverlay.id='scopeOverlay'; scopeOverlay.hidden=true; scopeOverlay.innerHTML='<div class="scope-ring"><i></i><b></b><span>CRYO OPTICS · 4×</span></div>'; ui.shell.append(scopeOverlay);
function renderWeapons() {
  const adult = state.mode==='adult' && state.running, kind = loadout.selected, cfg=WEAPONS[kind], flamer = kind==='flamer';
  adultControls.hidden=!adult; blaster.gun.visible=state.mode!=='adult';
  scopeOverlay.hidden=!(adult && loadout.scoped); ui.shell.classList.toggle('scoped', adult && loadout.scoped); ui.shell.classList.toggle('flamer', adult && flamer);
  $('#weaponName').textContent = flamer ? '火焰槍 / 凝固燃料' : cfg.name+' / 冰凍彈';
  $('#ammoCount').textContent = flamer ? `${Math.ceil(loadout.ammo.flamer)}%` : `${loadout.ammo[kind]} / ${cfg.capacity}`;
  $('#fuelBar').hidden = !flamer; $('#fuelBar b').style.width = `${loadout.ammo.flamer}%`;
  $('#reloadState').textContent=loadout.reloadLeft>0 ? `${flamer ? '補充燃料' : '裝填中'} ${loadout.reloadLeft.toFixed(1)}s` : flamer ? '燃料罐 ∞' : '備彈 ∞';
  const next = WEAPON_ORDER[(WEAPON_ORDER.indexOf(kind) + 1) % WEAPON_ORDER.length]; $('#weaponSwitch').textContent = `換${WEAPON_ICONS[next]}`;
  $('#scopeButton').disabled = flamer; $('#scopeButton').setAttribute('aria-pressed',String(loadout.scoped)); $('#scopeButton').textContent=loadout.scoped?'⊕ 收鏡':'⊕ 開鏡';
  $('#fireButton').textContent = flamer ? '噴火' : '射擊';
  $('#iceButton').disabled=iceCooldown>0; $('#iceButton').textContent=iceCooldown>0?`❄ ${Math.ceil(iceCooldown)}s`:'❄ 冰爆';
  const fov=adult && loadout.scoped ? cfg.zoom : 72; if(camera.fov!==fov){camera.fov=fov;camera.updateProjectionMatrix();}
}
function reloadGun() { if(state.running && reloadWeapon(loadout)) {(loadout.selected==='flamer'?sfx.refuel:sfx.reload)();renderWeapons();} }
$('#weaponSwitch').onclick=()=>{if(!state.running)return; switchWeapon(loadout);state.spraying=false;renderWeapons();};
$('#scopeButton').onclick=()=>{if(!state.running || loadout.reloadLeft>0 || loadout.selected==='flamer')return;loadout.scoped=!loadout.scoped;renderWeapons();};
$('#reloadButton').onclick=reloadGun;
$('#iceButton').onclick=()=>{if(!state.running || iceCooldown>0)return;iceCooldown=18;applyPowerUp(state,'bomb',state.enemies.map(e=>e.userData));sfx.freeze();announce('冰凍衝擊');};
$('#fireButton').addEventListener('pointerdown',e=>{if(!state.running)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);state.spraying=true;sprayAt(targetEnemy(),0);renderWeapons();});
document.addEventListener('keydown',e=>{if(!state.running||state.mode!=='adult'||e.repeat)return;if(e.code==='KeyR')reloadGun();if(e.code==='KeyQ')$('#weaponSwitch').click();if(e.code==='KeyE')$('#scopeButton').click();const pick={Digit1:'rifle',Digit2:'sniper',Digit3:'flamer'}[e.code];if(pick&&selectWeapon(loadout,pick)){state.spraying=false;renderWeapons();}if(e.code==='Space'){e.preventDefault();state.spraying=true;}});
document.addEventListener('keyup',e=>{if(e.code==='Space')state.spraying=false;});
window.addEventListener('blur',()=>{state.spraying=false;state.dragging=false;});

// ── 粒子池：水滴與冰塊碎片都用 InstancedMesh，不再每幀新建幾何體與材質 ──
function createPool(geometry, material, size) {
  const mesh = new THREE.InstancedMesh(geometry, material, size); mesh.frustumCulled = false; mesh.count = 0; scene.add(mesh);
  return { mesh, items: [], size, matrix: new THREE.Matrix4(), quat: new THREE.Quaternion(), scale: new THREE.Vector3(), axis: new THREE.Vector3(1, 1, 0).normalize() };
}
const waterPool = createPool(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0x60eaff, transparent: true, opacity: .8 }), 360);
const shardPool = createPool(new THREE.TetrahedronGeometry(1), new THREE.MeshBasicMaterial({ color: 0x9af3ff, transparent: true, opacity: .9 }), 300);
// 火焰與煙：面向鏡頭的方形貼圖粒子（同一個 InstancedMesh，一次繪製），顏色隨時間由白黃 → 橘 → 暗紅
function softTexture(stops) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); stops.forEach(([at, col]) => r.addColorStop(at, col)); g.fillStyle = r; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function createBillboards(texture, size, blending, opacity = 1) {
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, blending, opacity }), mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), material, size);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(size * 3).fill(1), 3); mesh.frustumCulled = false; mesh.count = 0; mesh.renderOrder = 4; scene.add(mesh);
  return { mesh, items: [], size, matrix: new THREE.Matrix4(), scale: new THREE.Vector3(), color: new THREE.Color(), quat: new THREE.Quaternion(), spinQ: new THREE.Quaternion(), zAxis: new THREE.Vector3(0, 0, 1) };
}
const firePool = createBillboards(softTexture([[0, 'rgba(255,255,255,1)'], [.35, 'rgba(255,255,255,.75)'], [1, 'rgba(255,255,255,0)']]), 420, THREE.AdditiveBlending);
const smokePool = createBillboards(softTexture([[0, 'rgba(255,255,255,.9)'], [.5, 'rgba(255,255,255,.4)'], [1, 'rgba(255,255,255,0)']]), 160, THREE.NormalBlending, .42);
const FIRE_RAMP = [[0, new THREE.Color(.55, .5, .42)], [.15, new THREE.Color(.62, .36, .1)], [.5, new THREE.Color(.5, .13, .02)], [1, new THREE.Color(.05, .01, 0)]];
function fireColor(t, out) { for (let i = 1; i < FIRE_RAMP.length; i++) if (t <= FIRE_RAMP[i][0]) return out.lerpColors(FIRE_RAMP[i - 1][1], FIRE_RAMP[i][1], (t - FIRE_RAMP[i - 1][0]) / (FIRE_RAMP[i][0] - FIRE_RAMP[i - 1][0])); return out.copy(FIRE_RAMP[FIRE_RAMP.length - 1][1]); }
function emitBillboard(pool, position, velocity, life, size0, size1, kind) { if (pool.items.length >= pool.size) return; pool.items.push({ p: position.clone(), v: velocity.clone(), life, max: life, size0, size1, kind, spin: Math.random() * 6, spinRate: (Math.random() - .5) * 3 }); }
function updateBillboards(pool, dt) {
  for (let i = pool.items.length - 1; i >= 0; i--) { const it = pool.items[i]; if ((it.life -= dt) <= 0) { if (it.kind === 'fire' && Math.random() < .12) emitBillboard(smokePool, it.p, tmp2.set((Math.random() - .5) * .6, 1.1 + Math.random(), (Math.random() - .5) * .6), 1.6, .5, 2.2, 'smoke'); pool.items[i] = pool.items[pool.items.length - 1]; pool.items.pop(); } }
  let n = 0;
  for (const it of pool.items) {
    const t = 1 - it.life / it.max; it.v.multiplyScalar(Math.exp(-dt * (it.kind === 'fire' ? 1.3 : .6))); it.v.y += (it.kind === 'fire' ? 2.4 : .5) * dt; it.p.addScaledVector(it.v, dt); it.spin += it.spinRate * dt;
    const size = it.size0 + (it.size1 - it.size0) * (it.kind === 'fire' ? t * Math.sqrt(t) : Math.sqrt(t)); pool.quat.copy(camera.quaternion).multiply(pool.spinQ.setFromAxisAngle(pool.zAxis, it.spin));
    pool.matrix.compose(it.p, pool.quat, pool.scale.set(size, size, size)); pool.mesh.setMatrixAt(n, pool.matrix);
    if (it.kind === 'fire') fireColor(t, pool.color); else pool.color.setScalar(.16 + (1 - t) * .12).multiplyScalar(1 - t * t);
    pool.mesh.setColorAt(n++, pool.color);
  }
  pool.mesh.count = n; pool.mesh.instanceMatrix.needsUpdate = true; pool.mesh.instanceColor.needsUpdate = true;
}
function emit(pool, position, velocity, life, size, gravity = 0) { if (pool.items.length >= pool.size) return; pool.items.push({ p: position.clone(), v: velocity.clone(), life, max: life, size, gravity, spin: Math.random() * 6 }); }
function updatePool(pool, dt) {
  for (let i = pool.items.length - 1; i >= 0; i--) { if ((pool.items[i].life -= dt) <= 0) { pool.items[i] = pool.items[pool.items.length - 1]; pool.items.pop(); } }
  let n = 0;
  for (const it of pool.items) { it.v.y -= it.gravity * dt; it.p.addScaledVector(it.v, dt); it.spin += dt * 6; const s = it.size * Math.min(1, it.life / it.max * 1.6); pool.quat.setFromAxisAngle(pool.axis, it.spin); pool.matrix.compose(it.p, pool.quat, pool.scale.set(s, s, s)); pool.mesh.setMatrixAt(n++, pool.matrix); }
  pool.mesh.count = n; pool.mesh.instanceMatrix.needsUpdate = true;
}

// ── 殭屍 ──
function createZombie(type = 'normal') {
  const cfg = ZOMBIE_TYPES[type], tuned = applyModeStats({ speed: cfg.speed, damage: cfg.damage, freezeRate: cfg.rate }, state.mode), model = createZombieModel(type, state.mode), group = model.root; group.userData.enemyRoot = group;
  const boss = type === 'boss', distance = boss ? 32 : 18 + Math.random() * 18, angle = boss ? 0 : (Math.random() - .5) * 1.25; group.position.set(Math.sin(angle) * distance, state.mode==='adult' ? .2*cfg.scale : 0, camera.position.z - Math.cos(angle) * distance);
  Object.assign(group.userData, { type, alive: true, freeze: 0, freezeRate: tuned.freezeRate, speed: tuned.speed, damage: tuned.damage, distance, points: cfg.points, phase: Math.random() * 6, animTime: 0, contact: 1.35 + (cfg.scale - 1) * .9, hitbox: model.hitbox, body: model.body, head: model.head, limbs: model.limbs, parts: model.parts, baseColors: model.baseColors });
  // 會動的部位（身體、四肢、頭）各自當一個框架，框架內不動的零件依材質合併，大幅減少每隻殭屍的繪製次數
  for (const part of [model.body, model.head, ...model.limbs]) part.userData.dynamic = true; bakeStatic(group);
  scene.add(group); state.enemies.push(group);
  group.userData.hp = {normal:100,fast:75,tank:260,boss:1600}[type];
  if (boss) { announce('大魔王出現了！'); sfx.boss(); }
}
const charColor = new THREE.Color(0x1d1714);
// 著火：材質變焦黑、發出橘色火光，身上冒火
function burnVisual(enemy, data, dt) {
  const flicker = data.burn > 0 ? .45 + Math.random() * .35 : 0;
  data.parts.forEach(mat => { mat.color.lerp(charColor, data.char * .75); mat.emissive.setRGB(flicker * .9, flicker * .28, flicker * .04); });
  if (data.burn > 0 && Math.random() < dt * 40) { const s = ZOMBIE_TYPES[data.type].scale; emitBillboard(firePool, tmp3.copy(enemy.position).add(tmp2.set((Math.random() - .5) * .5 * s, (.4 + Math.random() * 1.5) * s, (Math.random() - .5) * .5 * s)), tmp2.set((Math.random() - .5) * .4, 1 + Math.random(), (Math.random() - .5) * .4), .5 + Math.random() * .3, .25 * s, .7 * s, 'fire'); }
}
function removeEnemy(enemy) { scene.remove(enemy); enemy.userData.parts.forEach(m => m.dispose()); enemy.traverse(o => { if (o.userData.baked) o.geometry.dispose(); }); enemy.userData.ownedGeometries?.forEach(g=>g.dispose()); state.enemies = state.enemies.filter(e => e !== enemy); }
function updateEnemy(enemy, dt) {
  const data = enemy.userData; if (!data.alive) return;
  tmp.set(camera.position.x - enemy.position.x, 0, camera.position.z - enemy.position.z); data.distance = tmp.length(); advanceEnemy(data, dt);
  if (data.freeze < 100) enemy.position.addScaledVector(tmp.normalize(), data.speed * (1 - clamp(data.freeze / 125, 0, .8)) * dt);
  enemy.lookAt(camera.position.x, enemy.position.y, camera.position.z);
  data.animTime += dt; animateZombie(data, data.animTime, data.freeze);
  if (data.burn > 0 || data.char > 0) burnVisual(enemy, data, dt);
  if (tickBurn(data, dt)) { shatter(enemy, 'fire'); return; }
  if (data.distance > data.contact) return;
  if (state.boosts.shield > 0) { shatter(enemy); sfx.shield(); announce('泡泡護盾擋住了！'); return; }
  const contact = resolveContact(state.health, data, data.contact); if (contact.hit) { state.health = contact.health; removeEnemy(enemy); hitPlayer(); updateHud(); if (state.health <= 0) gameOver(); }
}

// ── 瞄準：只對每隻殭屍的隱形碰撞體做射線判定 ──
function aimOffsets() { const spread = state.mode==='adult' ? (loadout.scoped ? .012 : .035) : state.boosts.water > 0 ? .2 : .13, aspect = camera.aspect; const offsets = [[0, 0]]; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; offsets.push([Math.cos(a) * spread / aspect, Math.sin(a) * spread]); } return offsets; }
function castAim(objects, recursive) { if (!objects.length) return null; let best = null; for (const [x, y] of aimOffsets()) { center.set(x, y); raycaster.setFromCamera(center, camera); const hit = raycaster.intersectObjects(objects, recursive)[0]; if (hit && (!best || hit.distance < best.distance)) best = hit; if (best && x === 0 && y === 0) break; } center.set(0, 0); return best; }
function targetEnemy() { const hit = castAim(state.enemies.filter(e => e.userData.alive).map(e => e.userData.hitbox), false); return hit ? hit.object.userData.enemyRoot : null; }
function sprayAt(enemy, dt) {
  if(state.mode==='adult' && loadout.selected==='flamer') { flamerFrame(dt); return; }
  if(state.mode==='adult') {
    if(!fireWeapon(loadout)) return;
    firearm.shot(loadout.selected);sfx.gunshot(loadout.selected==='sniper');collectAimedItem();
    if(enemy) {
      const dead=hitWithBullet(enemy.userData,loadout.selected,state.boosts.water>0?1.7:1);
      ui.crosshair.classList.add('locked');ui.meter.classList.add('visible');ui.meterFill.style.width=`${enemy.userData.freeze}%`;
      tmp.copy(enemy.position);tmp.y=1.5*ZOMBIE_TYPES[enemy.userData.type].scale;
      for(let i=0;i<9;i++)emit(shardPool,tmp,tmp2.set((Math.random()-.5)*3,Math.random()*3,(Math.random()-.5)*3),.45,.04+Math.random()*.08,3);
      if(dead)shatter(enemy);
    }
    return;
  }
  blaster.gun.position.y = -.5 + Math.sin(performance.now() * .035) * .012; blaster.flower.rotation.z += dt * 13;
  const big = state.boosts.water > 0 ? 1.5 : 1; tmp3.set(.42, -.5, -1.95).applyMatrix4(camera.matrixWorld);
  for (let i = 0; i < (big > 1 ? 4 : 3); i++) emit(waterPool, tmp3, tmp2.set((Math.random() - .5) * .09 * big, (Math.random() - .5) * .09 * big, -1).normalize().applyQuaternion(camera.quaternion).multiplyScalar(18 + Math.random() * 6), .55, (.12 + Math.random() * .1) * big);
  collectAimedItem();
  if (!enemy) { ui.crosshair.classList.remove('locked'); ui.meter.classList.remove('visible'); return; }
  ui.crosshair.classList.add('locked'); ui.meter.classList.add('visible');
  const result = applyWater(enemy.userData, big > 1 ? dt * 2 : dt); ui.meterFill.style.width = `${Math.min(enemy.userData.freeze, 100)}%`;
  if (result.justFrozen) { announce('完全冰凍！繼續噴！'); sfx.freeze(); } if (result.shattered) shatter(enemy);
}
const flameDir = new THREE.Vector3(), flameOrigin = new THREE.Vector3(), toEnemy = new THREE.Vector3();
// 火焰槍每幀：消耗燃料、噴出火焰粒子、對錐形範圍內的敵人造成傷害
function flamerFrame(dt) {
  if (!dt || !useFlamer(loadout, dt)) return;
  flamingNow = true; collectAimedItem();
  firearm.muzzle(flameOrigin); camera.getWorldDirection(flameDir);
  const cfg = WEAPONS.flamer, boost = state.boosts.water > 0 ? 1.6 : 1, count = Math.min(14, Math.floor((boost > 1 ? 520 : 380) * dt + Math.random()));
  for (let i = 0; i < count; i++) { const speed = 15 + Math.random() * 4; emitBillboard(firePool, tmp3.copy(flameOrigin).addScaledVector(flameDir, Math.random() * .4), tmp2.copy(flameDir).multiplyScalar(speed).add(tmp3.set((Math.random() - .5) * 1.8, (Math.random() - .5) * 1.2 + .3, (Math.random() - .5) * 1.8)), .55 + Math.random() * .25, .05, (.75 + Math.random() * .5) * boost, 'fire'); }
  let hitAny = false;
  for (const enemy of [...state.enemies]) {
    const data = enemy.userData; if (!data.alive) continue; const s = ZOMBIE_TYPES[data.type].scale;
    toEnemy.copy(enemy.position).setY(enemy.position.y + 1.1 * s).sub(camera.position); const dist = toEnemy.length(); if (dist > cfg.range * (boost > 1 ? 1.25 : 1)) continue;
    if (toEnemy.normalize().angleTo(flameDir) > cfg.cone * boost + Math.atan(.5 * s / Math.max(dist, .5))) continue;
    hitAny = true; if (hitWithFlame(data, dt, boost)) shatter(enemy, 'fire');
  }
  ui.crosshair.classList.toggle('locked', hitAny);
}
function shatter(enemy, kind = 'ice') {
  if (kind === 'fire') {
    const data = enemy.userData; data.alive = false; const points = data.points * (state.boosts.double > 0 ? 2 : 1); state.score += points; state.levelScore += points; updateHud();
    announce(data.type === 'boss' ? '大魔王燒毀了！' : state.boosts.double > 0 ? `燒毀！+${points} ⭐` : '燒毀！'); sfx.burnDeath();
    const s = ZOMBIE_TYPES[data.type].scale;
    for (let i = 0; i < 26 * s; i++) emitBillboard(firePool, tmp3.copy(enemy.position).add(tmp2.set((Math.random() - .5) * .8 * s, Math.random() * 2 * s, (Math.random() - .5) * .8 * s)), tmp2.set((Math.random() - .5) * 2, 1.5 + Math.random() * 2.5, (Math.random() - .5) * 2), .6 + Math.random() * .5, .3 * s, 1.1 * s, 'fire');
    for (let i = 0; i < 8 * s; i++) emitBillboard(smokePool, tmp3.copy(enemy.position).add(tmp2.set((Math.random() - .5) * s, (.5 + Math.random()) * s, (Math.random() - .5) * s)), tmp2.set((Math.random() - .5) * .8, 1 + Math.random(), (Math.random() - .5) * .8), 1.8 + Math.random(), .8 * s, 2.6 * s, 'smoke');
    removeEnemy(enemy); ui.meter.classList.remove('visible'); return;
  }
  const data = enemy.userData; data.alive = false; const points = data.points * (state.boosts.double > 0 ? 2 : 1); state.score += points; state.levelScore += points; updateHud();
  announce(state.boosts.double > 0 ? `冰塊擊破！+${points} ⭐` : data.type === 'boss' ? '打倒大魔王了！' : '冰塊擊破！'); sfx.shatter();
  const scale = ZOMBIE_TYPES[data.type].scale, count = data.type === 'boss' ? 70 : 22;
  for (let i = 0; i < count; i++) emit(shardPool, tmp.copy(enemy.position).add(tmp3.set((Math.random() - .5) * scale, (.5 + Math.random() * 2) * scale, (Math.random() - .5) * scale)), tmp2.set((Math.random() - .5) * 5, Math.random() * 5, (Math.random() - .5) * 5), 1.2, (.09 + Math.random() * .15) * Math.sqrt(scale), 6);
  removeEnemy(enemy); ui.meter.classList.remove('visible'); ui.crosshair.classList.remove('locked');
}

// ── 道具 ──
const iconTextures = {};
function iconTexture(type) { if (iconTextures[type]) return iconTextures[type]; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.fillStyle = 'rgba(255,255,255,.92)'; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.fill(); g.font = '72px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(POWER_UPS[type].icon, 64, 70); const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return (iconTextures[type] = tex); }
function spawnItem() {
  const type = POWER_UP_TYPES[Math.floor(Math.random() * POWER_UP_TYPES.length)], color = POWER_UPS[type].color, item = new THREE.Group();
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(.42), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .7, roughness: .3 })), halo = new THREE.Mesh(new THREE.TorusGeometry(.62, .05, 8, 28), new THREE.MeshBasicMaterial({ color }));
  const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTexture(type), depthTest: false })); icon.scale.setScalar(.8); icon.position.y = 1; icon.renderOrder = 5;
  item.add(core, halo, icon);
  const distance = 7 + Math.random() * 7, angle = (Math.random() - .5) * 1.6; item.position.set(Math.sin(angle) * distance, 1.6 + Math.random() * .6, camera.position.z - Math.cos(angle) * distance);
  Object.assign(item.userData, { itemRoot: item, type, life: 12, baseY: item.position.y, halo }); scene.add(item); state.items.push(item); announce(`出現道具：${POWER_UPS[type].icon} ${POWER_UPS[type].label}`); sfx.itemSpawn();
}
function removeItem(item) { scene.remove(item); item.traverse(o => { if (!o.isSprite) o.geometry?.dispose(); o.material?.dispose(); }); state.items = state.items.filter(i => i !== item); }
function updateItems(dt, elapsed) {
  state.itemTimer += dt; if (state.itemTimer > 10 && state.items.length < 2) { state.itemTimer = 0; spawnItem(); }
  for (const item of [...state.items]) { const data = item.userData; data.life -= dt; item.rotation.y += dt * 1.6; item.position.y = data.baseY + Math.sin(elapsed * 2.5 + data.life) * .18; data.halo.rotation.x = elapsed * 2; item.visible = data.life > 3 || Math.floor(data.life * 6) % 2 === 0; if (data.life <= 0) removeItem(item); }
}
function collectAimedItem() {
  const hit = castAim(state.items, true); if (!hit) return; let root = hit.object; while (root && !root.userData.itemRoot) root = root.parent; if (!root) return;
  const type = root.userData.type; applyPowerUp(state, type, state.enemies.map(e => e.userData)); removeItem(root); announce(`獲得 ${POWER_UPS[type].icon} ${POWER_UPS[type].label}！`); sfx.powerUp(); updateHud();
}
function updatePowerUpHud() {
  const text = TIMED.filter(k => state.boosts[k] > 0).map(k => `${POWER_UPS[k].icon} ${Math.ceil(state.boosts[k])}s`).join('　');
  if (ui.powerUp.textContent !== text) ui.powerUp.textContent = text; ui.powerUp.classList.toggle('visible', !!text);
  ui.shell.classList.toggle('shielded', state.boosts.shield > 0); ui.shell.classList.toggle('time-stopped', state.boosts.stop > 0);
}

// ── 關卡流程 ──
function levelLabel() { const lv = LEVELS[state.level]; return `第 ${state.level + 1} 關 ${levelName(state.level)}・第 ${state.wave + 1}/${lv.waves.length} 波`; }
function startWave() { const source = waveTypes(state.level, state.wave); state.queue = state.mode === 'adult' ? [...source, ...source.slice(0, Math.ceil(source.length * .35))] : source.slice(0, Math.max(1, Math.ceil(source.length * .72))); state.spawnTimer = .3; ui.levelInfo.textContent = levelLabel(); announce(state.mode === 'child' ? `第 ${state.wave + 1} 波怪物來囉！` : state.wave === LEVELS[state.level].waves.length - 1 ? '最後一波逼近！' : `第 ${state.wave + 1} 波逼近`); sfx.wave(); }
function updateSpawning(dt) {
  const alive = state.enemies.filter(e => e.userData.alive).length;
  if (state.queue.length) { state.spawnTimer -= dt; if (state.spawnTimer <= 0 && alive < Math.min(MODE_RULES[state.mode].maxEnemies, state.mode === 'adult' ? MAX_ALIVE + 2 : MAX_ALIVE)) { createZombie(state.queue.shift()); state.spawnTimer = state.mode === 'adult' ? .68 : 1.05; } return; }
  if (alive) return;
  state.waveTimer += dt; if (state.waveTimer < 1.6) return; state.waveTimer = 0;
  if (state.wave + 1 < LEVELS[state.level].waves.length) { state.wave++; startWave(); } else levelComplete();
}
function clearField() { [...state.enemies].forEach(removeEnemy); [...state.items].forEach(removeItem); for (const pool of [waterPool, shardPool, firePool, smokePool]) pool.items.length = 0; }
let starting = false;
async function startLevel(index, keepScore = false) {
  if (starting || !state.mode) return; starting = true; // 連點兩下只開始一次
  initAudio(); sfx.start();
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') { try { const permission = await DeviceOrientationEvent.requestPermission(); if (permission !== 'granted') announce('未允許感測器，可用手指拖曳視角'); } catch { announce('可用手指拖曳視角'); } }
  clearField(); useTheme(LEVELS[index].theme); renderer.toneMappingExposure = state.mode === 'child' ? 1.35 : 1.08; document.body.dataset.mode = state.mode;
  Object.assign(state, { running: true, spraying: false, health: 100, score: keepScore ? state.score : 0, levelScore: 0, level: index, wave: 0, queue: [], waveTimer: 0, itemTimer: 5, boosts: emptyBoosts(), baseYaw: null, basePitch: null, groanTimer: 3, yaw: 0, pitch: 0 });
  loadout=createLoadout();iceCooldown=0;renderWeapons();
  camera.rotation.set(0, 0, 0); ui.panel.classList.add('hidden'); ui.levelInfo.classList.add('visible'); updateHud(); startWave(); clock.start(); starting = false;
}
function showPanel(title, text, action, onAction) { ui.title.textContent = title; ui.text.textContent = text; ui.start.textContent = action; ui.start.onclick = onAction; ui.start.hidden = !state.mode; renderLevelGrid(); ui.panel.classList.remove('hidden'); ui.levelInfo.classList.remove('visible'); }
function stopPlay() { state.running = false; state.spraying = false; loadout.scoped=false; renderWeapons(); setSpraying(false); setFlaming(false); ui.shell.classList.remove('shielded', 'time-stopped'); ui.powerUp.classList.remove('visible'); ui.meter.classList.remove('visible'); }
function levelComplete() {
  stopPlay(); sfx.levelClear(); const next = state.level + 1;
  if (next < LEVELS.length && next + 1 > state.unlocked) { state.unlocked = next + 1; saveProgress(localStorage, state.unlocked); }
  if (next >= LEVELS.length) { showPanel('全部通關！🎉', `你打敗了大魔王，總共 ${state.score} 分！`, '再玩一次', () => startLevel(0)); return; }
  showPanel('過關！', `第 ${state.level + 1} 關完成，這關得到 ${state.levelScore} 分。下一關：${levelName(next)}`, '下一關 →', () => startLevel(next, true));
}
function gameOver() { stopPlay(); sfx.gameOver(); showPanel(state.mode === 'child' ? '做得很好！' : '防線失守', state.mode === 'child' ? `你已經守到第 ${state.level + 1} 關，選版本再挑戰一次！` : `第 ${state.level + 1} 關 ${levelName(state.level)}，重新整備！`, '再試一次', () => startLevel(state.level)); }
function renderLevelGrid() {
  if (!state.mode) { ui.grid.replaceChildren(); return; }
  ui.grid.replaceChildren(...LEVELS.map((lv, i) => { const b = document.createElement('button'), locked = i + 1 > state.unlocked; b.type = 'button'; b.className = 'level-button'; b.disabled = locked; b.innerHTML = `<b>${locked ? '🔒' : i + 1}</b><span>${levelName(i)}</span>`; b.classList.toggle('current', i === state.level); b.addEventListener('click', () => startLevel(i)); return b; }));
}

// ── HUD 與訊息 ──
function updateHud() { ui.healthBar.style.width = `${state.health}%`; ui.healthText.textContent = Math.ceil(state.health); ui.score.textContent = state.score; ui.healthBar.style.background = state.health < 35 ? '#ff4d4d' : 'linear-gradient(90deg, #37e0c1, #b6f25a)'; }
function hitPlayer() { ui.flash.classList.add('show'); announce(state.mode === 'child' ? '怪物碰到你了，沒關係再瞄準！' : '殭屍突破防線！'); sfx.hurt(); setTimeout(() => ui.flash.classList.remove('show'), 180); }
function announce(text) { ui.message.textContent = text; ui.message.classList.add('show'); clearTimeout(announce.timer); announce.timer = setTimeout(() => ui.message.classList.remove('show'), 1100); }

// ── 陀螺儀 ──
const deviceEuler = new THREE.Euler(), deviceQuat = new THREE.Quaternion(), screenQuat = new THREE.Quaternion(), backCameraQuat = new THREE.Quaternion(-Math.sqrt(.5), 0, 0, Math.sqrt(.5)), zAxis = new THREE.Vector3(0, 0, 1), lookEuler = new THREE.Euler(0, 0, 0, 'YXZ');
function screenAngle() { return THREE.MathUtils.degToRad(screen.orientation?.angle ?? window.orientation ?? 0); }
// 把手機的方向換算成「手機背面鏡頭朝向」的左右 (yaw) 與上下 (pitch)，直拿、橫拿都正確
function deviceLook(alpha, beta, gamma, orient) { const d = THREE.MathUtils.degToRad; deviceEuler.set(d(beta), d(alpha), -d(gamma), 'YXZ'); deviceQuat.setFromEuler(deviceEuler).multiply(backCameraQuat).multiply(screenQuat.setFromAxisAngle(zAxis, -orient)); lookEuler.setFromQuaternion(deviceQuat, 'YXZ'); return { yaw: lookEuler.y, pitch: lookEuler.x }; }
function handleOrientation(event) {
  if (!state.running || event.alpha == null) return; const look = deviceLook(event.alpha, event.beta ?? 90, event.gamma ?? 0, screenAngle());
  if (state.baseYaw == null) { state.baseYaw = look.yaw; state.basePitch = look.pitch; } // 開始時手機怎麼拿，就當作正前方
  state.yaw = clamp(relativeAngle(look.yaw, state.baseYaw) * GYRO_SENSITIVITY, -MAX_AIM_YAW, MAX_AIM_YAW); state.pitch = clamp((look.pitch - state.basePitch) * GYRO_SENSITIVITY, MIN_AIM_PITCH, MAX_AIM_PITCH);
}

// ── 主迴圈 ──
function updateGroans(dt) { state.groanTimer -= dt; if (state.groanTimer > 0) return; state.groanTimer = 2.5 + Math.random() * 3; const alive = state.enemies.filter(e => e.userData.alive && e.userData.freeze < 100); if (alive.length) sfx.groan(alive[Math.floor(Math.random() * alive.length)].userData.distance); }
function loop() {
  requestAnimationFrame(loop); const dt = Math.min(clock.getDelta(), .05), elapsed = clock.elapsedTime;
  world?.update(performance.now() / 1000); setSpraying(state.running && state.spraying && state.mode!=='adult', state.boosts.water > 0);
  const wasFlaming = flamingNow; flamingNow = false;
  if (state.running) {
    camera.rotation.y = stepAim(camera.rotation.y, state.yaw, dt, AIM_SMOOTHING, AIM_MAX_SPEED); camera.rotation.x = stepAim(camera.rotation.x, state.pitch, dt, AIM_SMOOTHING, AIM_MAX_SPEED); camera.updateMatrixWorld();
    tickBoosts(state.boosts, dt); updatePowerUpHud();
    if(state.mode==='adult'){tickWeapon(loadout,dt);iceCooldown=Math.max(0,iceCooldown-dt);renderWeapons();}
    const enemy = targetEnemy(); if (state.spraying) sprayAt(enemy, dt); else { ui.crosshair.classList.toggle('locked', !!enemy); ui.meter.classList.remove('visible'); }
    const enemyDt = dt * enemyTimeScale(state.boosts); for (const e of [...state.enemies]) { updateEnemy(e, enemyDt); if (!state.running) break; }
    if (state.running) { updateItems(dt, elapsed); updateSpawning(dt); updateGroans(dt); watchPerformance(dt); }
  }
  firearm.update(dt, loadout, state.mode==='adult', performance.now()/1000, flamingNow || (wasFlaming && state.spraying)); setFlaming(flamingNow);
  updatePool(waterPool, dt); updatePool(shardPool, dt); updateBillboards(firePool, dt); updateBillboards(smokePool, dt);
  renderer.render(scene, camera);
}
function renderMute() { ui.mute.textContent = isMuted() ? '🔇' : '🔊'; ui.mute.setAttribute('aria-label', isMuted() ? '開啟音效' : '關閉音效'); }
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }

// ── 事件 ──
window.addEventListener('resize', resize); resize();
window.addEventListener('deviceorientation', handleOrientation, true); screen.orientation?.addEventListener?.('change', () => { state.baseYaw = null; });
ui.mute.addEventListener('click', () => { initAudio(); toggleMute(); renderMute(); }); renderMute();
canvas.addEventListener('pointerdown', e => { if (!state.running) return; e.preventDefault(); state.spraying = true; state.dragging = true; state.dragX = e.clientX; state.dragY = e.clientY; canvas.setPointerCapture?.(e.pointerId); });
canvas.addEventListener('pointermove', e => { if (!state.dragging || e.pointerType !== 'mouse') return; state.yaw = clamp(state.yaw - (e.clientX - state.dragX) * .0018, -MAX_AIM_YAW, MAX_AIM_YAW); state.pitch = clamp(state.pitch - (e.clientY - state.dragY) * .0014, MIN_AIM_PITCH, MAX_AIM_PITCH); state.dragX = e.clientX; state.dragY = e.clientY; });
window.addEventListener('pointerup', () => { state.spraying = false; state.dragging = false; }); window.addEventListener('pointercancel', () => { state.spraying = false; state.dragging = false; });
// 擋掉連點兩下出現的「拷貝／翻譯」選單、長按選單與雙擊縮放
for (const type of ['contextmenu', 'selectstart', 'dblclick', 'gesturestart']) document.addEventListener(type, e => e.preventDefault(), { passive: false });
let lastTouchEnd = 0; document.addEventListener('touchend', e => { const now = performance.now(); if (now - lastTouchEnd < 350 && !e.target.closest('button')) e.preventDefault(); lastTouchEnd = now; }, { passive: false });
document.addEventListener('selectionchange', () => { const sel = document.getSelection(); if (sel && !sel.isCollapsed) sel.removeAllRanges(); });

function selectMode(mode) {
  state.mode = mode; const child = mode === 'child'; ui.modeBadge.textContent = child ? '🌈 小孩版' : '🌙 成人版';
  ui.modeButtons.forEach(button => button.classList.toggle('selected', button.dataset.mode === mode));
  ui.text.textContent = child ? '可愛怪物速度較慢、傷害較低。選擇關卡開始冒險！' : '步槍連射／狙擊開鏡，轉動手機瞄準、按住射擊。換彈補滿彈匣，冰爆阻止敵人前進。';
  ui.start.hidden = false; ui.start.textContent = state.unlocked > 1 ? `繼續第 ${state.unlocked} 關` : '開始第 1 關'; ui.start.onclick = () => startLevel(state.unlocked - 1); renderLevelGrid();
}
ui.modeButtons.forEach(button => button.addEventListener('click', () => selectMode(button.dataset.mode)));
state.level = state.unlocked - 1; useTheme(LEVELS[state.level].theme);
showPanel('冰水特攻隊', '轉動手機瞄準。小孩版使用花朵水槍，成人版使用步槍與狙擊槍。', '', () => {});
loop();
