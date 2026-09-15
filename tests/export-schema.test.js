'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const ES = require('../js/export-schema.js');
const HF = require('../js/hand-features.js');
const CS = require('../js/condition-sets.js');
const { makeHand, v02Metadata, v02LandmarkLog } = require('./fixtures.js');

test('schema version bumped, legacy version recorded', () => {
  assert.equal(ES.SCHEMA_VERSION, '0.3.0');
  assert.equal(ES.LEGACY_SCHEMA_VERSION, '0.2.0');
});

test('a v0.2 metadata fixture passes the legacy compatibility check', () => {
  const r = ES.checkLegacyMetadataCompatibility(v02Metadata());
  assert.deepEqual(r, { ok: true, missing: [] });
});

test('extendMetadata keeps every v0.2 key and value, adds v0.3 keys only', () => {
  const base = v02Metadata();
  const snapshot = JSON.parse(JSON.stringify(base));
  const out = ES.extendMetadata(base, {
    conditionSet: CS.getConditionSet('legacy-4'),
    handTracking: { enabled: false },
    handLandmarkFilename: null
  });
  // input untouched
  assert.deepEqual(base, snapshot);
  // legacy reader still satisfied
  assert.deepEqual(ES.checkLegacyMetadataCompatibility(out), { ok: true, missing: [] });
  // every v0.2 key except schemaVersion is byte-identical; nested objects gain keys only
  for (const k of ES.METADATA_V02_KEYS) {
    if (k === 'schemaVersion' || k === 'conditionSequence' || k === 'landmarkLogging') continue;
    assert.deepEqual(out[k], snapshot[k], k);
  }
  for (const k of Object.keys(snapshot.conditionSequence)) assert.deepEqual(out.conditionSequence[k], snapshot.conditionSequence[k], k);
  for (const k of Object.keys(snapshot.landmarkLogging)) assert.deepEqual(out.landmarkLogging[k], snapshot.landmarkLogging[k], k);
  assert.equal(out.schemaVersion, '0.3.0');
  assert.equal(out.conditionSet.id, 'legacy-4');
  assert.equal(out.conditionSequence.conditionSetId, 'legacy-4');
  assert.equal(out.handTracking.enabled, false);
  assert.equal(out.handTracking.library, null);
  assert.equal(out.landmarkLogging.handLandmarkFilename, null);
});

test('hand tracking metadata is fully populated when enabled and neutral when disabled', () => {
  const on = ES.buildHandTrackingMetadata({
    enabled: true, libraryVersion: '0.4.x', modelComplexity: 0, maxNumHands: 2,
    minDetectionConfidence: 0.5, minTrackingConfidence: 0.5, targetFps: 15,
    measuredFps: 13.3333, meanInferenceMs: 21.55555, resultCount: 400, debugVisualization: true,
    labelsMirroredAssumption: true
  });
  assert.equal(on.library, 'MediaPipe Hands');
  assert.equal(on.targetFps, 15);
  assert.equal(on.measuredFps, 13.333);
  assert.equal(on.meanInferenceMs, 21.556);
  assert.equal(on.debugVisualization, true);
  assert.equal(on.scoring, 'none');
  const off = ES.buildHandTrackingMetadata({ enabled: false, targetFps: 15 });
  assert.equal(off.enabled, false);
  assert.equal(off.targetFps, null);
  assert.equal(off.resultCount, 0);
  const missing = ES.buildHandTrackingMetadata(undefined);
  assert.equal(missing.enabled, false);
});

test('hand frame separates raw landmarks from derived features and handles missing hands', () => {
  const left = { landmarks: makeHand({ openness: 'open', fan: 0.8 }), handedness: 'Left', score: 0.97, method: 'pose-proximity' };
  const dl = HF.deriveHandFeatures(left.landmarks);
  const frame = ES.buildHandFrame(1234.6, { avatarIndex: 4, avatarId: 'bloom', conditionLabel: 'x' }, { left, right: null }, { left: dl, right: null, asymmetry: HF.computeAsymmetry(dl, null) });
  assert.equal(frame.t, 1235);
  assert.equal(frame.handsDetected, 1);
  assert.equal(frame.leftHand.landmarks.length, 21);
  assert.equal(frame.leftHand.landmarks[0].length, 3);
  assert.equal(frame.leftHand.label, 'Left');
  assert.equal(frame.leftHand.score, 0.97);
  assert.equal(frame.rightHand, null);
  assert.equal(frame.derivedHandFeatures.right, null);
  assert.ok(frame.derivedHandFeatures.left.openness > 0.8);
  assert.equal(frame.derivedHandFeatures.left.fingerExtension.length, 5);
  assert.equal(frame.derivedHandFeatures.asymmetry.present, 'left');
  // rounding keeps files small
  const flat = JSON.stringify(frame);
  assert.ok(!/\d\.\d{5,}/.test(flat), 'no more than 4 decimals');
  // no scoring language anywhere in the frame
  assert.ok(!/score(?!")|correct|quality|technique/i.test(flat.replace(/"score":/g, '')));
});

test('hand frame with no hands at all still records the moment (body detected, hands not detected)', () => {
  const frame = ES.buildHandFrame(10, { avatarIndex: 4, avatarId: 'bloom' }, { left: null, right: null }, { left: null, right: null, asymmetry: HF.computeAsymmetry(null, null) });
  assert.equal(frame.handsDetected, 0);
  assert.equal(frame.leftHand, null);
  assert.equal(frame.rightHand, null);
  assert.equal(frame.derivedHandFeatures.asymmetry.present, 'none');
  assert.ok(JSON.stringify(frame).length < 400, 'empty frames stay small');
});

test('hand landmark export is a separate companion file with its own kind', () => {
  const out = ES.buildHandLandmarkExport({
    sessionId: 's', participantId: 'P1', bodyLandmarkFilename: 'a.landmarks.json',
    samplingFps: 10, handTargetFps: 15, maxFrames: 20000, truncated: false,
    startedAt: 'x', endedAt: 'y', calibration: HF.CALIBRATION
  }, [{ t: 0 }]);
  assert.equal(out.kind, 'hand-landmark-log');
  assert.equal(out.schemaVersion, '0.3.0');
  assert.equal(out.frameCount, 1);
  assert.equal(out.bodyLandmarkFilename, 'a.landmarks.json');
  assert.ok(out.landmarkFormat.includes('MediaPipe Hands'));
  assert.equal(out.calibration.fingerOpenRatio, HF.CALIBRATION.fingerOpenRatio);
});

test('body landmark log fixture from v0.2 passes the legacy check and a v0.3 body log must too', () => {
  assert.deepEqual(ES.checkLegacyLandmarkLogCompatibility(v02LandmarkLog()), { ok: true, missing: [] });
  const v03 = Object.assign(v02LandmarkLog(), { schemaVersion: '0.3.0' });
  assert.deepEqual(ES.checkLegacyLandmarkLogCompatibility(v03), { ok: true, missing: [] });
  const broken = v02LandmarkLog();
  delete broken.landmarkFormat;
  assert.equal(ES.checkLegacyLandmarkLogCompatibility(broken).ok, false);
});

test('a simulated v0.2 reader works unchanged on v0.3 metadata', () => {
  function v02Reader(meta) {
    return {
      order: meta.conditionSequence.order.join('>'),
      avatar: meta.selectedAvatar.id,
      fps: meta.landmarkLogging.enabled ? meta.landmarkLogging.samplingFps : null,
      events: meta.conditionEvents.length
    };
  }
  const base = v02Metadata();
  const ext = ES.extendMetadata(base, { conditionSet: CS.getConditionSet('extended-5'), handTracking: { enabled: true, targetFps: 15 }, handLandmarkFilename: 'x.hands.json' });
  assert.deepEqual(v02Reader(ext), v02Reader(base));
});
