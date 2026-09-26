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

export function chainFreeze(enemies, source, radius = 210) {
  let chained = 0;
  for (const enemy of enemies) {
    if (!enemy.alive || enemy === source) continue;
    const distance = Math.hypot(enemy.worldX - source.worldX, enemy.y - source.y);
    if (distance <= radius) {
      enemy.freeze = clamp(enemy.freeze + 34, 0, 100);
      chained += 1;
    }
  }
  return chained;
}
