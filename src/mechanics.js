export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

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

export const MIN_AIM_PITCH = -.3; // 往下最多約 17 度
export const MAX_AIM_PITCH = .25; // 往上最多約 14 度

export const POWER_UP_TYPES = ['water', 'bomb', 'heal', 'slow'];
export const POWER_UP_SECONDS = 8;

export function applyPowerUp(game, type, enemies = []) {
  if (type === 'heal') game.health = clamp(game.health + 30, 0, 100);
  if (type === 'water') game.boosts.water = POWER_UP_SECONDS;
  if (type === 'slow') game.boosts.slow = POWER_UP_SECONDS;
  if (type === 'bomb') for (const enemy of enemies) if (enemy.alive) enemy.freeze = clamp(enemy.freeze + 100, 0, 134);
  return game;
}

export function tickBoosts(boosts, seconds) {
  for (const key of Object.keys(boosts)) boosts[key] = Math.max(0, boosts[key] - seconds);
  return boosts;
}
