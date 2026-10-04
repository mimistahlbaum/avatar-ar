'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const BM = require('../js/bloom-mapping.js');

const side = (o) => Object.assign({ openness: 0.5, spread: 0.3, wristAngle: 0, palmLength: 0.1, present: 1 }, o);

test('base preset has Avatar I proportions, a distinct palette and is flagged hand-mediated', () => {
  const p = BM.BASE_PRESET;
  assert.equal(p.label, 'V');
  assert.equal(p.handMediated, true);
  for (const k of ['headScale', 'torsoRxScale', 'torsoRyScale', 'armScale', 'legScale', 'armLen', 'legLen', 'asymL', 'asymR', 'asymLLen', 'asymRLen']) {
    assert.equal(p[k], 1.0, k);
  }
  assert.notEqual(p.fill, 'rgba(230, 225, 215, 0.92)');
});

test('no hands or neutral hands reproduce the base preset', () => {
  const none = BM.mapHandFeaturesToAvatar({ left: null, right: null });
  assert.ok(Math.abs(none.cfg.asymL - 1) < 1e-9);
  assert.ok(Math.abs(none.cfg.asymR - 1) < 1e-9);
  assert.ok(Math.abs(none.cfg.torsoRxScale - 1) < 1e-9);
  assert.ok(Math.abs(none.cfg.headScale - 1) < 1e-9);
  assert.equal(none.field.left.width, 0);
  assert.equal(none.field.ring.alpha, 0);
  const neutral = BM.mapHandFeaturesToAvatar({ left: side({ openness: 0.5, spread: 0 }), right: side({ openness: 0.5, spread: 0 }) });
  assert.ok(Math.abs(neutral.cfg.asymL - 1) < 1e-9);
  assert.ok(Math.abs(neutral.cfg.torsoRyScale - 1) < 1e-9);
});

test('open hands expand the contour, closed hands contract it', () => {
  const open = BM.mapHandFeaturesToAvatar({ left: side({ openness: 1 }), right: side({ openness: 1 }) });
  const closed = BM.mapHandFeaturesToAvatar({ left: side({ openness: 0 }), right: side({ openness: 0 }) });
  assert.ok(open.cfg.asymL > 1.3 && open.cfg.asymR > 1.3);
  assert.ok(open.cfg.torsoRxScale > 1.3);
  assert.ok(open.cfg.headScale > 1);
  assert.ok(closed.cfg.asymL < 0.7 && closed.cfg.asymR < 0.7);
  assert.ok(closed.cfg.torsoRxScale < 0.7);
  assert.ok(closed.cfg.headScale < 1);
  assert.ok(open.cfg.asymLLen > 1 && closed.cfg.asymLLen < 1);
});

test('left/right hand difference produces asymmetric deformation', () => {
  const r = BM.mapHandFeaturesToAvatar({ left: side({ openness: 1 }), right: side({ openness: 0 }) });
  assert.ok(r.cfg.asymL > r.cfg.asymR);
  assert.ok(r.cfg.asymLLen > r.cfg.asymRLen);
  assert.ok(Math.abs(r.cfg.torsoRxScale - 1) < 1e-9, 'mean expansion stays neutral');
});

test('finger spread grows the field width, spoke count and torso ring', () => {
  const tight = BM.mapHandFeaturesToAvatar({ left: side({ spread: 0 }), right: side({ spread: 0 }) });
  const wide = BM.mapHandFeaturesToAvatar({ left: side({ spread: 1 }), right: side({ spread: 1 }) });
  assert.equal(tight.field.left.width, 0);
  assert.ok(wide.field.left.width > 0.8);
  assert.ok(wide.field.left.spokes > tight.field.left.spokes);
  assert.ok(wide.field.ring.offset > tight.field.ring.offset);
  assert.ok(wide.cfg.wobble > tight.cfg.wobble);
});

test('wrist angle passes through to the field orientation', () => {
  const r = BM.mapHandFeaturesToAvatar({ left: side({ wristAngle: 1.2 }), right: side({ wristAngle: -0.4 }) });
  assert.equal(r.field.left.angle, 1.2);
  assert.equal(r.field.right.angle, -0.4);
});

test('a partially present hand blends toward neutral rather than snapping', () => {
  const full = BM.mapHandFeaturesToAvatar({ left: side({ openness: 1, present: 1 }), right: null });
  const half = BM.mapHandFeaturesToAvatar({ left: side({ openness: 1, present: 0.5 }), right: null });
  assert.ok(half.cfg.asymL > 1 && half.cfg.asymL < full.cfg.asymL);
  assert.ok(half.field.left.alpha === 0.5);
  assert.ok(Math.abs(full.cfg.asymR - 1) < 1e-9, 'missing right side stays neutral');
});

test('outputs stay bounded for out-of-range or malformed input', () => {
  const r = BM.mapHandFeaturesToAvatar({ left: side({ openness: 7, spread: -3 }), right: { openness: NaN, spread: 'x' } });
  assert.ok(r.cfg.asymL <= BM.MAPPING.expandMin + BM.MAPPING.expandRange + 1e-9);
  assert.ok(r.cfg.asymR >= BM.MAPPING.expandMin - 1e-9);
  assert.ok(r.field.left.width >= 0);
  assert.ok(Number.isFinite(r.cfg.torsoRxScale));
  assert.ok(Number.isFinite(r.cfg.wobble));
});

test('mapping carries the base preset identity and colours', () => {
  const r = BM.mapHandFeaturesToAvatar({ left: side(), right: side() });
  assert.equal(r.cfg.id, 'bloom');
  assert.equal(r.cfg.fill, BM.BASE_PRESET.fill);
  assert.equal(r.cfg.stroke, BM.BASE_PRESET.stroke);
});
