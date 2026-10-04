'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const HF = require('../js/hand-features.js');
const { makeHand } = require('./fixtures.js');

test('openness: open hand near 1, closed fist near 0', () => {
  const open = HF.computeOpenness(makeHand({ openness: 'open' }));
  const closed = HF.computeOpenness(makeHand({ openness: 'closed' }));
  assert.ok(open.openness > 0.8, `open=${open.openness}`);
  assert.ok(closed.openness < 0.15, `closed=${closed.openness}`);
  assert.equal(open.fingerExtension.length, 5);
  open.fingerExtension.forEach(v => assert.ok(v >= 0 && v <= 1));
});

test('openness is scale invariant', () => {
  const small = HF.computeOpenness(makeHand({ openness: 'open', scale: 0.05 }));
  const large = HF.computeOpenness(makeHand({ openness: 'open', scale: 0.2 }));
  assert.ok(Math.abs(small.openness - large.openness) < 1e-6);
});

test('openness is monotonic in the fixture openness parameter', () => {
  const vals = [0, 0.25, 0.5, 0.75, 1].map(o => HF.computeOpenness(makeHand({ openness: o })).openness);
  for (let i = 1; i < vals.length; i++) assert.ok(vals[i] >= vals[i - 1] - 1e-9, vals.join(','));
});

test('finger spread: parallel fingers 0, fanned fingers clearly higher', () => {
  const together = HF.computeSpread(makeHand({ openness: 'open', fan: 0 }));
  const fanned = HF.computeSpread(makeHand({ openness: 'open', fan: 0.9 }));
  assert.equal(together.spread, 0);
  assert.ok(fanned.spread > 0.6, `fanned=${fanned.spread}`);
  assert.ok(fanned.fanAngle > together.fanAngle);
  assert.ok(fanned.spread <= 1);
});

test('wrist orientation: palm up gives angle 0 and pointing up, rotated hand points right', () => {
  const up = HF.computeWristOrientation(makeHand());
  assert.ok(Math.abs(up.angle) < 1e-6, `angle=${up.angle}`);
  assert.equal(up.pointing, 'up');
  const right = HF.computeWristOrientation(makeHand({ rotation: Math.PI / 2 }));
  assert.ok(Math.abs(right.angle - Math.PI / 2) < 1e-6, `angle=${right.angle}`);
  assert.equal(right.pointing, 'right');
  const down = HF.computeWristOrientation(makeHand({ rotation: Math.PI }));
  assert.equal(down.pointing, 'down');
});

test('palm normal sign flips when the hand is mirrored', () => {
  const a = HF.computeWristOrientation(makeHand());
  const b = HF.computeWristOrientation(makeHand({ mirrorX: true }));
  assert.equal(a.palmNormalSign, -b.palmNormalSign);
  assert.notEqual(a.palmNormalSign, 0);
});

test('size: palm length follows the fixture scale and aspect correction', () => {
  const s1 = HF.computeSize(makeHand({ scale: 0.1 }));
  const s2 = HF.computeSize(makeHand({ scale: 0.2 }));
  assert.ok(Math.abs(s1.palmLength - 0.1) < 1e-6);
  assert.ok(Math.abs(s2.palmLength - 0.2) < 1e-6);
  assert.ok(s2.palmWidth > s1.palmWidth);
  const wide = HF.computeSize(makeHand({ scale: 0.1 }), { aspect: 4 / 3 });
  assert.ok(wide.palmWidth > s1.palmWidth);
  assert.ok(Math.abs(wide.palmLength - 0.1) < 1e-6);
});

test('deriveHandFeatures returns null for invalid input and a full record for a hand', () => {
  assert.equal(HF.deriveHandFeatures(null), null);
  assert.equal(HF.deriveHandFeatures([{ x: 0, y: 0 }]), null);
  const f = HF.deriveHandFeatures(makeHand({ openness: 'open', fan: 0.6 }));
  for (const k of ['openness', 'spread', 'wristAngle', 'pointing', 'palmLength', 'palmWidth', 'fingerExtension', 'centre']) {
    assert.ok(k in f, `missing ${k}`);
  }
  assert.ok(!('score' in f) && !('quality' in f) && !('correct' in f));
});

test('asymmetry: both hands, one hand, no hands', () => {
  const L = HF.deriveHandFeatures(makeHand({ openness: 'open', fan: 0.9 }));
  const R = HF.deriveHandFeatures(makeHand({ openness: 'closed', mirrorX: true }));
  const both = HF.computeAsymmetry(L, R);
  assert.equal(both.present, 'both');
  assert.ok(both.opennessDiff > 0.6, `opennessDiff=${both.opennessDiff}`);
  assert.ok(both.spreadDiff > 0.5);
  assert.ok(both.magnitude > 0.3 && both.magnitude <= 1);
  assert.ok(Math.abs(both.sizeRatio - 1) < 1e-6);

  const same = HF.computeAsymmetry(L, L);
  assert.equal(same.magnitude, 0);
  assert.equal(same.opennessDiff, 0);

  const onlyLeft = HF.computeAsymmetry(L, null);
  assert.equal(onlyLeft.present, 'left');
  assert.equal(onlyLeft.opennessDiff, null);
  assert.equal(onlyLeft.magnitude, 0);

  const none = HF.computeAsymmetry(null, null);
  assert.equal(none.present, 'none');
});

test('assignHandSides: proximity to pose wrists wins, even when labels disagree', () => {
  const handA = { landmarks: makeHand({ wristX: 0.3, wristY: 0.6 }), handedness: 'Right', score: 0.9 };
  const handB = { landmarks: makeHand({ wristX: 0.7, wristY: 0.6 }), handedness: 'Left', score: 0.9 };
  const wrists = { left: { x: 0.31, y: 0.61, visibility: 0.9 }, right: { x: 0.69, y: 0.6, visibility: 0.9 } };
  const r = HF.assignHandSides([handA, handB], wrists);
  assert.equal(r.method, 'pose-proximity');
  assert.equal(r.left, handA);
  assert.equal(r.right, handB);
  assert.equal(r.assignments.length, 2);
});

test('assignHandSides: one hand only goes to the nearest wrist', () => {
  const hand = { landmarks: makeHand({ wristX: 0.7, wristY: 0.6 }), handedness: null, score: 0.9 };
  const wrists = { left: { x: 0.3, y: 0.6, visibility: 0.9 }, right: { x: 0.68, y: 0.62, visibility: 0.9 } };
  const r = HF.assignHandSides([hand], wrists);
  assert.equal(r.left, null);
  assert.equal(r.right, hand);
});

test('assignHandSides: falls back to handedness label without pose, honouring the mirror assumption', () => {
  const hand = { landmarks: makeHand(), handedness: 'Left', score: 0.9 };
  const a = HF.assignHandSides([hand], null);
  assert.equal(a.method, 'handedness-label');
  assert.equal(a.left, hand);
  const b = HF.assignHandSides([hand], null, { labelsMirrored: false });
  assert.equal(b.right, hand);
  assert.equal(b.left, null);
});

test('assignHandSides: low-visibility pose wrists are ignored', () => {
  const hand = { landmarks: makeHand({ wristX: 0.3 }), handedness: 'Right', score: 0.9 };
  const wrists = { left: { x: 0.3, y: 0.7, visibility: 0.1 }, right: { x: 0.7, y: 0.7, visibility: 0.1 } };
  const r = HF.assignHandSides([hand], wrists);
  assert.equal(r.method, 'handedness-label');
  assert.equal(r.right, hand);
});

test('assignHandSides: far-away hands are not forced onto a wrist', () => {
  const hand = { landmarks: makeHand({ wristX: 0.9, wristY: 0.1 }), handedness: 'Left', score: 0.9 };
  const wrists = { left: { x: 0.3, y: 0.7, visibility: 0.9 }, right: { x: 0.4, y: 0.7, visibility: 0.9 } };
  const r = HF.assignHandSides([hand], wrists);
  assert.equal(r.method, 'handedness-label');
});

test('assignHandSides: empty input', () => {
  const r = HF.assignHandSides([], null);
  assert.equal(r.left, null);
  assert.equal(r.right, null);
  assert.equal(r.method, 'none');
});

test('feature smoother converges toward the hand and decays to neutral when lost', () => {
  const sm = HF.createFeatureSmoother();
  const open = HF.deriveHandFeatures(makeHand({ openness: 'open', fan: 0.9 }));
  let s;
  for (let i = 0; i < 60; i++) s = sm.update('left', open);
  assert.ok(s.openness > 0.85);
  assert.ok(s.present > 0.95);
  for (let i = 0; i < 200; i++) s = sm.update('left', null);
  assert.ok(Math.abs(s.openness - 0.5) < 0.01, `openness=${s.openness}`);
  assert.ok(s.present < 0.01);
  assert.equal(sm.update('nope', open), null);
  sm.reset();
  assert.equal(sm.get('left').present, 0);
});
