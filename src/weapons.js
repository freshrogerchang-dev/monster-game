export const WEAPONS = Object.freeze({
  rifle: { name: '突擊步槍', capacity: 30, interval: .12, reload: 1.7, damage: 28, freeze: 22, zoom: 48 },
  sniper: { name: '狙擊步槍', capacity: 5, interval: 1.05, reload: 2.5, damage: 125, freeze: 65, zoom: 25 },
  // 火焰槍：彈匣是燃料（每秒消耗 fuelPerSecond），射程內的錐形範圍持續造成傷害並讓敵人著火
  flamer: { name: '火焰槍', capacity: 100, reload: 2.2, fuelPerSecond: 16, dps: 95, range: 10, cone: .3, burn: 3, burnDps: 22, melt: 80 }
});
export const WEAPON_ORDER = Object.freeze(['rifle', 'sniper', 'flamer']);
export function createLoadout() {
  return { selected: 'rifle', ammo: { rifle: 30, sniper: 5, flamer: 100 }, cooldown: 0, reloadLeft: 0, scoped: false };
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
export function selectWeapon(loadout, kind) {
  if (!WEAPONS[kind] || loadout.selected === kind) return false;
  loadout.selected = kind; loadout.reloadLeft = 0; loadout.scoped = false;
  loadout.cooldown = Math.max(loadout.cooldown, .3); return true;
}
export function switchWeapon(loadout) {
  selectWeapon(loadout, WEAPON_ORDER[(WEAPON_ORDER.indexOf(loadout.selected) + 1) % WEAPON_ORDER.length]);
}
export function fireWeapon(loadout) {
  if (loadout.selected === 'flamer' || loadout.reloadLeft > 0 || loadout.cooldown > 0) return false;
  if (loadout.ammo[loadout.selected] <= 0) { reloadWeapon(loadout); return false; }
  loadout.ammo[loadout.selected]--; loadout.cooldown = WEAPONS[loadout.selected].interval; return true;
}
// 按住火焰槍時每幀呼叫；回傳這一幀是否真的有噴火
export function useFlamer(loadout, dt) {
  if (loadout.selected !== 'flamer' || loadout.reloadLeft > 0 || loadout.cooldown > 0) return false;
  if (loadout.ammo.flamer <= 0) { reloadWeapon(loadout); return false; }
  loadout.ammo.flamer = Math.max(0, loadout.ammo.flamer - WEAPONS.flamer.fuelPerSecond * dt); return true;
}
export function hitWithBullet(enemy, kind, multiplier = 1) {
  if (!enemy.alive) return false;
  const cfg = WEAPONS[kind], frozen = enemy.freeze >= 100;
  enemy.hp -= cfg.damage * multiplier * (frozen ? 1.6 : 1);
  enemy.freeze = Math.min(100, enemy.freeze + cfg.freeze * multiplier);
  return enemy.hp <= 0;
}
// 火焰直接傷害：融化冰凍、點燃（burn 秒數重新計時），char 是燒焦程度（0～1，用來把模型變黑）
export function hitWithFlame(enemy, dt, multiplier = 1) {
  if (!enemy.alive) return false;
  const cfg = WEAPONS.flamer;
  enemy.hp -= cfg.dps * multiplier * dt;
  enemy.freeze = Math.max(0, enemy.freeze - cfg.melt * dt);
  enemy.burn = cfg.burn; enemy.char = Math.min(1, (enemy.char || 0) + dt * .45);
  return enemy.hp <= 0;
}
// 著火的持續傷害；回傳是否燒死
export function tickBurn(enemy, dt) {
  if (!enemy.alive || !(enemy.burn > 0)) return false;
  const step = Math.min(dt, enemy.burn);
  enemy.burn -= step; enemy.hp -= WEAPONS.flamer.burnDps * step; enemy.char = Math.min(1, (enemy.char || 0) + step * .12);
  return enemy.hp <= 0;
}
