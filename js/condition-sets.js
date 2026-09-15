/*
 * Avatar AR · condition sets and sequence ordering
 *
 * A condition set names which avatar conditions a study session cycles
 * through. The legacy set reproduces the v0.2 four-condition protocol exactly
 * (Avatar I to IV). The extended set adds the hand-mediated Avatar V as a
 * separate protocol option. Neither set changes the other.
 *
 * Browser global: window.ConditionSets. CommonJS export for Node tests.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ConditionSets = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const CONDITION_SETS = {
    'legacy-4': {
      id: 'legacy-4',
      label: 'Legacy I–IV',
      description: 'Four-condition protocol from v0.2. Body pose only.',
      avatarIndices: [0, 1, 2, 3],
      protocolVersion: '0.2',
      requiresHandTracking: false
    },
    'extended-5': {
      id: 'extended-5',
      label: 'Extended I–V (hand-mediated)',
      description: 'Legacy four conditions plus Avatar V, which uses hand landmarks. Separate protocol option, not comparable to legacy-4 sessions without adjustment.',
      avatarIndices: [0, 1, 2, 3, 4],
      protocolVersion: '0.3-extended',
      requiresHandTracking: true
    }
  };

  const DEFAULT_CONDITION_SET = 'legacy-4';

  function getConditionSet(id) {
    return CONDITION_SETS[id] || CONDITION_SETS[DEFAULT_CONDITION_SET];
  }

  function normaliseMode(value) {
    return value === 'random' || value === 'randomised' ? 'randomised' : 'manual';
  }

  // Fisher-Yates with an injectable random source so tests are deterministic.
  function shuffle(arr, rng) {
    const rand = typeof rng === 'function' ? rng : Math.random;
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  /**
   * Returns the ordered list of avatar indices for a sequence.
   * mode: 'manual' | 'random' | 'randomised'
   */
  function buildSequenceOrder(setId, mode, rng) {
    const set = getConditionSet(setId);
    const base = set.avatarIndices.slice();
    return normaliseMode(mode) === 'randomised' ? shuffle(base, rng) : base;
  }

  function isPermutationOf(order, base) {
    if (!Array.isArray(order) || order.length !== base.length) return false;
    const sorted = order.slice().sort((a, b) => a - b);
    const ref = base.slice().sort((a, b) => a - b);
    return sorted.every((v, i) => v === ref[i]);
  }

  return {
    CONDITION_SETS,
    DEFAULT_CONDITION_SET,
    getConditionSet,
    normaliseMode,
    shuffle,
    buildSequenceOrder,
    isPermutationOf
  };
}));
