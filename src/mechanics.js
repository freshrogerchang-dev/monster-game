export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const MODE_RULES = Object.freeze({
  child: { speedMultiplier: 0.62, damageMultiplier: 0.5, freezeMultiplier: 1.3, baseEnemies: 1, maxEnemies: 5 },
  adult: { speedMultiplier: 1.22, damageMultiplier: 1.3, freezeMultiplier: 0.85, baseEnemies: 3, maxEnemies: 10 }
});

export function applyModeStats(stats, mode) {
  const rules = MODE_RULES[mode] || MODE_RULES.child;
  return {
    ...stats,
    speed: stats.speed * rules.speedMultiplier,
    damage: Math.round(stats.damage * rules.damageMultiplier),
    freezeRate: stats.freezeRate * rules.freezeMultiplier
  };
}

export function applyWater(enemy, seconds) {
  if (!enemy.alive) return { shattered: false, justFrozen: false };
  const wasFrozen = enemy.freeze >= 100;
  enemy.freeze = clamp(enemy.freeze + seconds * enemy.freezeRate, 0, 135);
  const justFrozen = !wasFrozen && enemy.freeze >= 100;
  const shattered = enemy.freeze >= 135;
  if (shattered) enemy.alive = false;
  return { shattered, justFrozen };
}

export function advanceEnemy(enemy, seconds) {
  if (!enemy.alive || enemy.freeze >= 100) return enemy.distance;
  const slow = 1 - clamp(enemy.freeze / 125, 0, .8);
  enemy.distance = Math.max(0, enemy.distance - enemy.speed * slow * seconds);
  return enemy.distance;
}

export function resolveContact(playerHealth, enemy, contactDistance = 1.35) {
  if (!enemy.alive || enemy.distance > contactDistance) return { health: playerHealth, hit: false };
  enemy.alive = false;
  return { health: clamp(playerHealth - enemy.damage, 0, 100), hit: true };
}

export const MAX_AIM_YAW = 75 * Math.PI / 180; // 左右各 75 度，總共 150 度

export function stepAim(current, target, seconds, smoothing = 4, maxSpeed = 1.4) {
  const step = (target - current) * Math.min(1, seconds * smoothing);
  const limit = maxSpeed * seconds;
  return current + clamp(step, -limit, limit);
}

export const MIN_AIM_PITCH = -.22; // 往下最多約 13 度
export const MAX_AIM_PITCH = .2; // 往上最多約 11 度

// 兩個角度的差，換算到 -π～π 之間
export function relativeAngle(value, base) { let d = value - base; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }

export const POWER_UP_TYPES = ['water', 'bomb', 'heal', 'slow', 'shield', 'double', 'stop'];
// 有持續時間的道具（秒）
export const POWER_UP_SECONDS = { water: 8, slow: 8, shield: 10, double: 10, stop: 5 };
export const emptyBoosts = () => Object.fromEntries(Object.keys(POWER_UP_SECONDS).map(k => [k, 0]));

export function applyPowerUp(game, type, enemies = []) {
  if (type === 'heal') game.health = clamp(game.health + 30, 0, 100);
  else if (type === 'bomb') { for (const enemy of enemies) if (enemy.alive) enemy.freeze = clamp(enemy.freeze + 100, 0, 134); }
  else if (type in POWER_UP_SECONDS) game.boosts[type] = POWER_UP_SECONDS[type];
  return game;
}

// 殭屍實際移動的時間倍率：時間暫停 > 變慢 > 正常
export function enemyTimeScale(boosts) { return boosts.stop > 0 ? 0 : boosts.slow > 0 ? .4 : 1; }

export function tickBoosts(boosts, seconds) {
  for (const key of Object.keys(boosts)) boosts[key] = Math.max(0, boosts[key] - seconds);
  return boosts;
}
