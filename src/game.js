import { applyWater, chainFreeze, clamp } from './mechanics.js';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const ui = {
  score: document.querySelector('#score'), blast: document.querySelector('#blastCount'),
  panel: document.querySelector('#startPanel'), start: document.querySelector('#startButton'),
  message: document.querySelector('#message'), left: document.querySelector('#leftButton'),
  right: document.querySelector('#rightButton'), spray: document.querySelector('#sprayButton'),
  blastButton: document.querySelector('#blastButton')
};

const TYPES = {
  normal: { color: '#9bbf75', size: 62, freezeRate: 45, speed: 10, points: 100 },
  fast: { color: '#e1ad62', size: 48, freezeRate: 54, speed: 22, points: 160 },
  tank: { color: '#7e9a70', size: 82, freezeRate: 26, speed: 6, points: 250 },
  shield: { color: '#b08b70', size: 66, freezeRate: 34, speed: 8, points: 220 }
};
const state = { running: false, view: 0, score: 0, blasts: 3, spraying: false, left: false, right: false, enemies: [], particles: [], last: 0, wave: 0, waveDelay: 0, shake: 0 };

function spawnWave() {
  state.wave += 1;
  const count = Math.min(3 + state.wave, 9);
  const names = Object.keys(TYPES);
  state.enemies = Array.from({ length: count }, (_, i) => {
    const type = state.wave < 2 ? 'normal' : names[Math.floor(Math.random() * names.length)];
    return { ...TYPES[type], type, worldX: state.view + (i - (count - 1) / 2) * 170 + (Math.random() - .5) * 80, y: 430 + Math.random() * 105, freeze: 0, alive: true, bob: Math.random() * 10 };
  });
  announce(`第 ${state.wave} 波`);
}

function startGame() {
  Object.assign(state, { running: true, view: 0, score: 0, blasts: 3, enemies: [], particles: [], wave: 0, waveDelay: 0 });
  ui.panel.classList.add('hidden');
  spawnWave(); updateHud(); state.last = performance.now(); requestAnimationFrame(loop);
}

function announce(text) { ui.message.textContent = text; ui.message.classList.add('show'); clearTimeout(announce.timer); announce.timer = setTimeout(() => ui.message.classList.remove('show'), 850); }
function updateHud() { ui.score.textContent = String(state.score).padStart(6, '0'); ui.blast.textContent = state.blasts; }
function screenX(enemy) { return canvas.width / 2 + (enemy.worldX - state.view); }
function targetEnemy() {
  return state.enemies.filter(e => e.alive).map(e => ({ e, d: Math.hypot(screenX(e) - canvas.width / 2, e.y - canvas.height / 2) })).filter(v => v.d < v.e.size * .75).sort((a, b) => a.d - b.d)[0]?.e;
}

function update(dt) {
  const turn = (state.right ? 1 : 0) - (state.left ? 1 : 0);
  state.view += turn * 330 * dt;
  for (const enemy of state.enemies) { if (enemy.alive && enemy.freeze < 100) enemy.y += enemy.speed * dt * (1 - enemy.freeze / 130); enemy.bob += dt * 4; }
  if (state.spraying) {
    const enemy = targetEnemy();
    if (enemy) {
      const result = applyWater(enemy, dt);
      if (Math.random() < .55) state.particles.push({ x: canvas.width / 2 + (Math.random() - .5) * 20, y: canvas.height / 2 + (Math.random() - .5) * 20, tx: screenX(enemy), ty: enemy.y, life: 1 });
      if (result.justFrozen) announce('完全冰凍！');
      if (result.shattered) { const chained = chainFreeze(state.enemies, enemy); state.score += enemy.points + chained * 40; state.shake = 9; burst(screenX(enemy), enemy.y); announce(chained ? `冰裂連鎖 ×${chained + 1}` : '冰塊擊破！'); updateHud(); }
    }
  }
  state.particles.forEach(p => p.life -= dt * 3); state.particles = state.particles.filter(p => p.life > 0);
  state.shake *= .82;
  if (state.enemies.length && state.enemies.every(e => !e.alive)) { state.waveDelay += dt; if (state.waveDelay > 1.2) { state.waveDelay = 0; spawnWave(); } }
}

function burst(x, y) { for (let i = 0; i < 28; i++) state.particles.push({ x, y, vx: (Math.random() - .5) * 360, vy: (Math.random() - .5) * 360, life: 1, shard: true }); }

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height); g.addColorStop(0, '#162a3a'); g.addColorStop(.58, '#384541'); g.addColorStop(1, '#13181a'); ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#d9d0a0'; ctx.beginPath(); ctx.arc(1000 - state.view * .05, 110, 55, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0d171c';
  for (let i = -2; i < 9; i++) { const x = i * 230 - (state.view * .18 % 230); ctx.fillRect(x, 245, 170, 260); ctx.beginPath(); ctx.moveTo(x - 18, 245); ctx.lineTo(x + 85, 170); ctx.lineTo(x + 188, 245); ctx.fill(); }
  ctx.strokeStyle = '#533857'; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(250 - state.view * .38, 320, 170, Math.PI, 0); ctx.stroke();
  for (let i = 0; i < 8; i++) { const a = Math.PI + i * Math.PI / 7, cx = 250 - state.view * .38; ctx.strokeStyle = '#533857'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, 320); ctx.lineTo(cx + Math.cos(a) * 170, 320 + Math.sin(a) * 170); ctx.stroke(); }
  ctx.fillStyle = '#121719'; ctx.fillRect(0, 520, canvas.width, 200);
}

function drawEnemy(e) {
  const x = screenX(e), y = e.y + Math.sin(e.bob) * 4; if (x < -130 || x > canvas.width + 130 || !e.alive) return;
  ctx.save(); ctx.translate(x, y); const ice = e.freeze / 100; ctx.globalAlpha = .35; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(0, e.size * .82, e.size * .72, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  ctx.fillStyle = e.color; ctx.fillRect(-e.size * .44, -e.size * .15, e.size * .88, e.size); ctx.beginPath(); ctx.arc(0, -e.size * .28, e.size * .46, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1b2020'; ctx.beginPath(); ctx.arc(-e.size * .17, -e.size * .34, 6, 0, 7); ctx.arc(e.size * .17, -e.size * .34, 6, 0, 7); ctx.fill();
  if (e.type === 'shield') { ctx.fillStyle = '#596c74'; ctx.fillRect(-e.size * .7, 0, e.size * 1.4, e.size * .72); ctx.strokeStyle = '#a8c3cd'; ctx.lineWidth = 5; ctx.strokeRect(-e.size * .7, 0, e.size * 1.4, e.size * .72); }
  if (ice > 0) { ctx.globalAlpha = clamp(ice, 0, .84); ctx.fillStyle = '#75eaff'; ctx.beginPath(); ctx.arc(0, e.size * .12, e.size * .76, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = '#d7fbff'; ctx.lineWidth = 4; for (let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(-e.size*.5+i*e.size*.25,-e.size*.5);ctx.lineTo(-e.size*.25+i*e.size*.18,e.size*.75);ctx.stroke();} }
  ctx.fillStyle = '#071014cc'; ctx.fillRect(-48, -e.size - 28, 96, 12); ctx.fillStyle = e.freeze >= 100 ? '#c7faff' : '#49dceb'; ctx.fillRect(-48, -e.size - 28, 96 * clamp(e.freeze / 100, 0, 1), 12); ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`${Math.floor(clamp(e.freeze,0,100))}%`, 0, -e.size - 34); ctx.restore();
}

function drawAim() { const x=canvas.width/2,y=canvas.height/2; ctx.strokeStyle=state.spraying?'#baf8ff':'#ffdc66';ctx.lineWidth=4;ctx.beginPath();ctx.arc(x,y,28,0,7);ctx.moveTo(x-45,y);ctx.lineTo(x-16,y);ctx.moveTo(x+16,y);ctx.lineTo(x+45,y);ctx.moveTo(x,y-45);ctx.lineTo(x,y-16);ctx.moveTo(x,y+16);ctx.lineTo(x,y+45);ctx.stroke(); }
function drawParticles() { for (const p of state.particles) { if (p.shard) { p.x += p.vx/60; p.y += p.vy/60; p.vy += 7; } else { p.x += (p.tx-p.x)*.28; p.y += (p.ty-p.y)*.28; } ctx.globalAlpha=p.life;ctx.fillStyle=p.shard?'#bff9ff':'#5feaff';ctx.fillRect(p.x,p.y,p.shard?12:7,p.shard?12:7); } ctx.globalAlpha=1; }
function draw() { ctx.save(); ctx.translate((Math.random()-.5)*state.shake,(Math.random()-.5)*state.shake); drawBackground(); state.enemies.forEach(drawEnemy); drawParticles(); drawAim(); ctx.restore(); }
function loop(now) { if (!state.running) return; const dt=Math.min((now-state.last)/1000,.05);state.last=now;update(dt);draw();requestAnimationFrame(loop); }

function bindHold(element, key) { const on=e=>{e.preventDefault();state[key]=true;element.classList.add('active')},off=e=>{e.preventDefault();state[key]=false;element.classList.remove('active')}; element.addEventListener('pointerdown',on);window.addEventListener('pointerup',off);element.addEventListener('pointercancel',off); }
function iceBlast() { if (!state.running || state.blasts<=0) return; state.blasts--; let hits=0; for(const e of state.enemies){if(e.alive && Math.abs(screenX(e)-canvas.width/2)<420){e.freeze=clamp(e.freeze+70,0,100);hits++;}} state.shake=14;announce(`全畫面冰爆！${hits ? ` ×${hits}`:''}`);updateHud(); }
bindHold(ui.left,'left');bindHold(ui.right,'right');bindHold(ui.spray,'spraying');ui.blastButton.addEventListener('click',iceBlast);ui.start.addEventListener('click',startGame);
window.addEventListener('keydown',e=>{if(e.code==='ArrowLeft')state.left=true;if(e.code==='ArrowRight')state.right=true;if(e.code==='Space'){e.preventDefault();state.spraying=true}if(e.code==='KeyE')iceBlast()});
window.addEventListener('keyup',e=>{if(e.code==='ArrowLeft')state.left=false;if(e.code==='ArrowRight')state.right=false;if(e.code==='Space')state.spraying=false});
drawBackground(); drawAim();
