import assert from 'node:assert/strict';
import {createLoadout,fireWeapon,reloadWeapon,switchWeapon,selectWeapon,tickWeapon,hitWithBullet,hitWithFlame,tickBurn,useFlamer,WEAPONS} from '../src/weapons.js';
const w=createLoadout();assert.equal(fireWeapon(w),true);assert.equal(w.ammo.rifle,29);assert.equal(fireWeapon(w),false);
tickWeapon(w,.12);assert.equal(fireWeapon(w),true);assert.equal(reloadWeapon(w),true);assert.equal(fireWeapon(w),false);
tickWeapon(w,1.7);assert.equal(w.ammo.rifle,30);assert.equal(reloadWeapon(w),false);
switchWeapon(w);tickWeapon(w,.3);assert.equal(w.selected,'sniper');assert.equal(fireWeapon(w),true);assert.equal(w.ammo.sniper,4);
reloadWeapon(w);switchWeapon(w);tickWeapon(w,3);assert.equal(w.ammo.sniper,4,'switching cancels reload without free ammunition');
selectWeapon(w,'sniper');tickWeapon(w,.3);w.ammo.sniper=0;tickWeapon(w,2);assert.equal(fireWeapon(w),false);assert.ok(w.reloadLeft>0);tickWeapon(w,2.5);assert.equal(w.ammo.sniper,5);
const normal={alive:true,hp:100,freeze:0};assert.equal(hitWithBullet(normal,'sniper'),true);
const tank={alive:true,hp:260,freeze:100};assert.equal(hitWithBullet(tank,'rifle'),false);assert.equal(tank.hp,215.2);
// 火焰槍：切換順序、燃料消耗、換燃料
const f=createLoadout();switchWeapon(f);switchWeapon(f);assert.equal(f.selected,'flamer');switchWeapon(f);assert.equal(f.selected,'rifle','switching cycles rifle → sniper → flamer → rifle');
selectWeapon(f,'flamer');assert.equal(useFlamer(f,.1),false,'switch delay applies');tickWeapon(f,.3);
assert.equal(fireWeapon(f),false,'flamer is not a single-shot weapon');
assert.equal(useFlamer(f,1),true);assert.equal(f.ammo.flamer,100-WEAPONS.flamer.fuelPerSecond);
f.ammo.flamer=0;assert.equal(useFlamer(f,.1),false);assert.ok(f.reloadLeft>0,'empty tank starts refuelling');tickWeapon(f,WEAPONS.flamer.reload);assert.equal(f.ammo.flamer,100);
// 火焰傷害：融冰、著火、燒焦、持續傷害到死
const target={alive:true,hp:100,freeze:100};assert.equal(hitWithFlame(target,.5),false);
assert.equal(target.hp,100-WEAPONS.flamer.dps*.5);assert.equal(target.freeze,100-WEAPONS.flamer.melt*.5,'fire melts ice');assert.equal(target.burn,WEAPONS.flamer.burn);assert.ok(target.char>0);
const burning={alive:true,hp:30,freeze:0,burn:3};assert.equal(tickBurn(burning,1),false);assert.equal(burning.hp,30-WEAPONS.flamer.burnDps);assert.equal(tickBurn(burning,5),true,'burn damage can finish an enemy');assert.equal(burning.burn,0);
assert.equal(tickBurn({alive:true,hp:5,burn:0},1),false,'no burn, no damage');
console.log('Flamethrower fuel, burn and melt tests passed');
console.log('Weapon timing, ammo, reload cancellation and damage tests passed');
