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
