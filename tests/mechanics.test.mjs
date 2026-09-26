import assert from 'node:assert/strict';
import { applyWater, chainFreeze, clamp } from '../src/mechanics.js';

assert.equal(clamp(140, 0, 100), 100);
const enemy = { alive: true, freeze: 0, freezeRate: 50 };
assert.deepEqual(applyWater(enemy, 2), { shattered: false, justFrozen: true });
assert.equal(enemy.freeze, 100);
assert.deepEqual(applyWater(enemy, .7), { shattered: true, justFrozen: false });
assert.equal(enemy.alive, false);
const source = { alive: false, worldX: 0, y: 0 };
const near = { alive: true, worldX: 100, y: 0, freeze: 80 };
const far = { alive: true, worldX: 400, y: 0, freeze: 0 };
assert.equal(chainFreeze([source, near, far], source), 1);
assert.equal(near.freeze, 100);
assert.equal(far.freeze, 0);
console.log('mechanics tests passed');
