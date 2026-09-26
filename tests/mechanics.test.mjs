import assert from 'node:assert/strict';
import { advanceEnemy, applyWater, clamp, MAX_AIM_YAW, resolveContact, stepAim } from '../src/mechanics.js';

assert.equal(clamp(140, 0, 100), 100);
const target = { alive: true, freeze: 0, freezeRate: 50 };
assert.deepEqual(applyWater(target, 2), { shattered: false, justFrozen: true });
assert.deepEqual(applyWater(target, .7), { shattered: true, justFrozen: false });
const walker = { alive: true, freeze: 0, speed: 2, distance: 10 };
assert.equal(advanceEnemy(walker, 2), 6);
walker.freeze = 100;
assert.equal(advanceEnemy(walker, 2), 6, 'fully frozen enemies do not advance');
const attacker = { alive: true, distance: 1.2, damage: 25 };
assert.deepEqual(resolveContact(100, attacker), { health: 75, hit: true });
assert.equal(attacker.alive, false);
assert.deepEqual(resolveContact(75, attacker), { health: 75, hit: false });
assert.ok(Math.abs(MAX_AIM_YAW * 2 - 150 * Math.PI / 180) < 1e-9, 'total aim range is 150 degrees');
assert.ok(Math.abs(stepAim(0, 3, .05) - 1.4 * .05) < 1e-9, 'aim turn speed is capped');
assert.ok(Math.abs(stepAim(0, .01, .05) - .01 * .2) < 1e-9, 'small aim changes are smoothed');
console.log('3D mechanics tests passed');
