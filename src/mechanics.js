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
