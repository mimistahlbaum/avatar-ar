'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const CS = require('../js/condition-sets.js');

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

test('default condition set is the legacy four-condition protocol', () => {
  assert.equal(CS.DEFAULT_CONDITION_SET, 'legacy-4');
  const set = CS.getConditionSet(CS.DEFAULT_CONDITION_SET);
  assert.deepEqual(set.avatarIndices, [0, 1, 2, 3]);
  assert.equal(set.requiresHandTracking, false);
  assert.equal(set.protocolVersion, '0.2');
});

test('legacy-4 manual order is exactly I, II, III, IV (v0.2 behaviour preserved)', () => {
  assert.deepEqual(CS.buildSequenceOrder('legacy-4', 'manual'), [0, 1, 2, 3]);
});

test('legacy-4 randomised order is a permutation of 0..3 and never includes Avatar V', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const order = CS.buildSequenceOrder('legacy-4', 'random', seeded(seed));
    assert.ok(CS.isPermutationOf(order, [0, 1, 2, 3]), order.join(','));
    assert.ok(!order.includes(4));
  }
  // both spellings used by the UI and by metadata are accepted
  assert.ok(CS.isPermutationOf(CS.buildSequenceOrder('legacy-4', 'randomised', seeded(7)), [0, 1, 2, 3]));
});

test('extended-5 manual order is I to V and requires hand tracking', () => {
  assert.deepEqual(CS.buildSequenceOrder('extended-5', 'manual'), [0, 1, 2, 3, 4]);
  assert.equal(CS.getConditionSet('extended-5').requiresHandTracking, true);
});

test('extended-5 randomised order is a permutation of 0..4', () => {
  let sawFourNotLast = false;
  for (let seed = 1; seed <= 50; seed++) {
    const order = CS.buildSequenceOrder('extended-5', 'random', seeded(seed));
    assert.ok(CS.isPermutationOf(order, [0, 1, 2, 3, 4]), order.join(','));
    if (order[4] !== 4) sawFourNotLast = true;
  }
  assert.ok(sawFourNotLast, 'Avatar V should be shuffled like any other condition');
});

test('unknown condition set ids fall back to legacy-4', () => {
  assert.deepEqual(CS.buildSequenceOrder('does-not-exist', 'manual'), [0, 1, 2, 3]);
  assert.deepEqual(CS.buildSequenceOrder(undefined, 'manual'), [0, 1, 2, 3]);
});

test('shuffle does not mutate its input and normaliseMode maps UI values', () => {
  const base = [0, 1, 2, 3];
  CS.shuffle(base, seeded(3));
  assert.deepEqual(base, [0, 1, 2, 3]);
  assert.equal(CS.normaliseMode('random'), 'randomised');
  assert.equal(CS.normaliseMode('randomised'), 'randomised');
  assert.equal(CS.normaliseMode('manual'), 'manual');
  assert.equal(CS.normaliseMode(undefined), 'manual');
});
