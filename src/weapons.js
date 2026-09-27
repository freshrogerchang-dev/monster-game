export const WEAPONS = Object.freeze({
  rifle: { name: '突擊步槍', capacity: 30, interval: .12, reload: 1.7, damage: 28, freeze: 22, zoom: 48 },
  sniper: { name: '狙擊步槍', capacity: 5, interval: 1.05, reload: 2.5, damage: 125, freeze: 65, zoom: 25 }
});
export function createLoadout() {
  return { selected: 'rifle', ammo: { rifle: 30, sniper: 5 }, cooldown: 0, reloadLeft: 0, scoped: false };
}
export function reloadWeapon(loadout) {
  const cfg = WEAPONS[loadout.selected];
  if (loadout.reloadLeft > 0 || loadout.ammo[loadout.selected] === cfg.capacity) return false;
  loadout.reloadLeft = cfg.reload; loadout.scoped = false; return true;
}
export function tickWeapon(loadout, dt) {
  loadout.cooldown = Math.max(0, loadout.cooldown - dt);
  if (loadout.reloadLeft > 0) {
    loadout.reloadLeft = Math.max(0, loadout.reloadLeft - dt);
    if (!loadout.reloadLeft) loadout.ammo[loadout.selected] = WEAPONS[loadout.selected].capacity;
  }
}
export function switchWeapon(loadout) {
  loadout.selected = loadout.selected === 'rifle' ? 'sniper' : 'rifle';
  loadout.reloadLeft = 0; loadout.scoped = false;
  loadout.cooldown = Math.max(loadout.cooldown, .3);
}
export function fireWeapon(loadout) {
  if (loadout.reloadLeft > 0 || loadout.cooldown > 0) return false;
  if (loadout.ammo[loadout.selected] <= 0) { reloadWeapon(loadout); return false; }
  loadout.ammo[loadout.selected]--; loadout.cooldown = WEAPONS[loadout.selected].interval; return true;
}
export function hitWithBullet(enemy, kind, multiplier = 1) {
  if (!enemy.alive) return false;
  const cfg = WEAPONS[kind], frozen = enemy.freeze >= 100;
  enemy.hp -= cfg.damage * multiplier * (frozen ? 1.6 : 1);
  enemy.freeze = Math.min(100, enemy.freeze + cfg.freeze * multiplier);
  return enemy.hp <= 0;
}
