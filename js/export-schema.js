/*
 * Avatar AR · export schema helpers (v0.3.0)
 *
 * Schema policy:
 *   - v0.2.0 readers must keep working. Every top-level key that existed in a
 *     v0.2.0 recording-metadata file still exists with the same meaning and
 *     type. New information is added as new keys only.
 *   - The body landmark log (`.landmarks.json`) is unchanged apart from the
 *     schemaVersion string. Hand landmarks go to a separate companion file
 *     (`.hands.json`, kind `hand-landmark-log`) so body log size and shape
 *     stay as they were.
 *   - Hand data is written only when landmark logging is enabled AND hand
 *     tracking is on.
 *
 * Browser global: window.ExportSchema. CommonJS export for Node tests.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ExportSchema = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SCHEMA_VERSION = '0.3.0';
  const LEGACY_SCHEMA_VERSION = '0.2.0';

  // Top-level keys a v0.2.0 recording-metadata reader may rely on.
  const METADATA_V02_KEYS = [
    'tool', 'schemaVersion', 'kind', 'sessionId', 'participantId', 'conditionLabel',
    'sessionNotes', 'consent', 'timestamp', 'sessionStartedAt', 'startedAt', 'endedAt',
    'durationMs', 'selectedAvatarIndex', 'selectedAvatar', 'opacity', 'cameraVisible',
    'conditionSequence', 'conditionEvents', 'landmarkLogging', 'environment', 'canvas',
    'video', 'recording', 'poseDetection'
  ];

  const CONDITION_SEQUENCE_V02_KEYS = ['mode', 'order', 'position', 'active', 'completed', 'startedAt', 'endedAt'];
  const LANDMARK_LOGGING_V02_KEYS = ['enabled', 'samplingFps', 'frameCount', 'truncated', 'maxFrames', 'filename'];

  // Keys a v0.2.0 body landmark-log reader may rely on.
  const LANDMARK_LOG_V02_KEYS = [
    'tool', 'schemaVersion', 'kind', 'sessionId', 'participantId', 'samplingFps', 'maxFrames',
    'truncated', 'frameCount', 'startedAt', 'endedAt', 'landmarkFormat', 'frames'
  ];

  const HAND_LANDMARK_FORMAT = 'MediaPipe Hands, up to 2 hands per frame, 21 landmarks per hand, each landmark is [x, y, z] with x/y normalised to the video frame and z relative to the wrist';

  function round4(v) {
    return typeof v === 'number' && v === v ? Math.round(v * 10000) / 10000 : null;
  }

  function round3(v) {
    return typeof v === 'number' && v === v ? Math.round(v * 1000) / 1000 : null;
  }

  /**
   * Metadata block describing hand tracking for one recording.
   * state: {
   *   enabled, libraryVersion, modelComplexity, maxNumHands,
   *   minDetectionConfidence, minTrackingConfidence, targetFps,
   *   measuredFps, meanInferenceMs, resultCount, debugVisualization,
   *   labelsMirroredAssumption
   * }
   */
  function buildHandTrackingMetadata(state) {
    const s = state || {};
    const enabled = !!s.enabled;
    return {
      enabled,
      library: enabled ? 'MediaPipe Hands' : null,
      libraryVersion: enabled ? (s.libraryVersion || null) : null,
      modelComplexity: enabled ? (typeof s.modelComplexity === 'number' ? s.modelComplexity : null) : null,
      maxNumHands: enabled ? (typeof s.maxNumHands === 'number' ? s.maxNumHands : null) : null,
      minDetectionConfidence: enabled ? (typeof s.minDetectionConfidence === 'number' ? s.minDetectionConfidence : null) : null,
      minTrackingConfidence: enabled ? (typeof s.minTrackingConfidence === 'number' ? s.minTrackingConfidence : null) : null,
      targetFps: enabled ? (typeof s.targetFps === 'number' ? s.targetFps : null) : null,
      measuredFps: enabled ? round3(s.measuredFps) : null,
      meanInferenceMs: enabled ? round3(s.meanInferenceMs) : null,
      resultCount: enabled ? (typeof s.resultCount === 'number' ? s.resultCount : 0) : 0,
      debugVisualization: enabled ? !!s.debugVisualization : false,
      sideAssignment: enabled ? 'pose-wrist-proximity, fallback MediaPipe handedness label' : null,
      labelsMirroredAssumption: enabled ? (typeof s.labelsMirroredAssumption === 'boolean' ? s.labelsMirroredAssumption : null) : null,
      scoring: 'none'
    };
  }

  /**
   * Metadata block describing which condition set the session used.
   */
  function buildConditionSetMetadata(set) {
    if (!set) return null;
    return {
      id: set.id,
      label: set.label,
      avatarIndices: set.avatarIndices.slice(),
      protocolVersion: set.protocolVersion,
      requiresHandTracking: !!set.requiresHandTracking
    };
  }

  function compactHand(hand) {
    if (!hand || !Array.isArray(hand.landmarks)) return null;
    return {
      landmarks: hand.landmarks.map(l => [round4(l.x), round4(l.y), round4(l.z)]),
      label: hand.handedness || null,
      score: round3(hand.score),
      method: hand.method || null
    };
  }

  function compactDerived(d) {
    if (!d) return null;
    return {
      openness: round3(d.openness),
      spread: round3(d.spread),
      wristAngle: round3(d.wristAngle),
      palmLength: round4(d.palmLength),
      palmWidth: round4(d.palmWidth),
      pointing: d.pointing || null,
      palmNormalSign: typeof d.palmNormalSign === 'number' ? d.palmNormalSign : null,
      fingerExtension: Array.isArray(d.fingerExtension) ? d.fingerExtension.map(round3) : null
    };
  }

  function compactAsymmetry(a) {
    if (!a) return null;
    return {
      present: a.present,
      opennessDiff: round3(a.opennessDiff),
      spreadDiff: round3(a.spreadDiff),
      sizeRatio: round3(a.sizeRatio),
      wristAngleDiff: round3(a.wristAngleDiff),
      magnitude: round3(a.magnitude)
    };
  }

  /**
   * One frame of the hand landmark log.
   * sides:   { left: hand|null, right: hand|null } where hand = { landmarks, handedness, score, method }
   * derived: { left: features|null, right: features|null, asymmetry }
   */
  function buildHandFrame(t, context, sides, derived) {
    const c = context || {};
    const s = sides || {};
    const d = derived || {};
    return {
      t: Math.round(t),
      avatarIndex: c.avatarIndex,
      avatarId: c.avatarId,
      conditionLabel: c.conditionLabel || '',
      handsDetected: (s.left ? 1 : 0) + (s.right ? 1 : 0),
      leftHand: compactHand(s.left),
      rightHand: compactHand(s.right),
      derivedHandFeatures: {
        left: compactDerived(d.left),
        right: compactDerived(d.right),
        asymmetry: compactAsymmetry(d.asymmetry)
      }
    };
  }

  /**
   * Companion file for hand landmarks. Separate from the body log so that the
   * body log keeps its v0.2 size and shape.
   */
  function buildHandLandmarkExport(header, frames) {
    const h = header || {};
    return {
      tool: 'Avatar AR',
      schemaVersion: SCHEMA_VERSION,
      kind: 'hand-landmark-log',
      sessionId: h.sessionId || null,
      participantId: h.participantId || '',
      bodyLandmarkFilename: h.bodyLandmarkFilename || null,
      samplingFps: typeof h.samplingFps === 'number' ? h.samplingFps : null,
      handTargetFps: typeof h.handTargetFps === 'number' ? h.handTargetFps : null,
      maxFrames: typeof h.maxFrames === 'number' ? h.maxFrames : null,
      truncated: !!h.truncated,
      frameCount: Array.isArray(frames) ? frames.length : 0,
      startedAt: h.startedAt || null,
      endedAt: h.endedAt || null,
      landmarkFormat: HAND_LANDMARK_FORMAT,
      derivedFeatureNote: 'Derived values describe hand configuration only (openness, spread, wrist angle, size, left-right asymmetry). They are not quality, technique or correctness measures.',
      calibration: h.calibration || null,
      frames: Array.isArray(frames) ? frames : []
    };
  }

  /**
   * Add v0.3 fields to a v0.2-shaped metadata object without touching any
   * existing key. Returns a new object.
   * extras: { conditionSet, handTracking, handLandmarkFilename }
   */
  function extendMetadata(baseMetadata, extras) {
    const e = extras || {};
    const out = Object.assign({}, baseMetadata);
    out.schemaVersion = SCHEMA_VERSION;
    out.conditionSet = buildConditionSetMetadata(e.conditionSet);
    out.handTracking = buildHandTrackingMetadata(e.handTracking);
    out.landmarkLogging = Object.assign({}, baseMetadata.landmarkLogging, {
      handLandmarkFilename: e.handLandmarkFilename || null
    });
    if (baseMetadata.conditionSequence) {
      out.conditionSequence = Object.assign({}, baseMetadata.conditionSequence, {
        conditionSetId: e.conditionSet ? e.conditionSet.id : null
      });
    }
    return out;
  }

  /**
   * Checks that an object still satisfies what a v0.2.0 reader expects.
   * Returns { ok, missing } where missing lists dotted key paths.
   */
  function checkLegacyMetadataCompatibility(meta) {
    const missing = [];
    if (!meta || typeof meta !== 'object') return { ok: false, missing: ['<root>'] };
    for (const k of METADATA_V02_KEYS) if (!(k in meta)) missing.push(k);
    if (meta.conditionSequence && typeof meta.conditionSequence === 'object') {
      for (const k of CONDITION_SEQUENCE_V02_KEYS) if (!(k in meta.conditionSequence)) missing.push(`conditionSequence.${k}`);
    }
    if (meta.landmarkLogging && typeof meta.landmarkLogging === 'object') {
      for (const k of LANDMARK_LOGGING_V02_KEYS) if (!(k in meta.landmarkLogging)) missing.push(`landmarkLogging.${k}`);
    }
    if (meta.kind !== 'recording-metadata') missing.push('kind=recording-metadata');
    return { ok: missing.length === 0, missing };
  }

  function checkLegacyLandmarkLogCompatibility(log) {
    const missing = [];
    if (!log || typeof log !== 'object') return { ok: false, missing: ['<root>'] };
    for (const k of LANDMARK_LOG_V02_KEYS) if (!(k in log)) missing.push(k);
    if (log.kind !== 'landmark-log') missing.push('kind=landmark-log');
    if (Array.isArray(log.frames) && log.frames.length > 0) {
      const f = log.frames[0];
      for (const k of ['t', 'avatarIndex', 'avatarId', 'conditionLabel', 'opacity', 'cameraVisible', 'landmarks']) {
        if (!(k in f)) missing.push(`frames[0].${k}`);
      }
      if (Array.isArray(f.landmarks) && f.landmarks.length !== 33) missing.push('frames[0].landmarks.length=33');
    }
    return { ok: missing.length === 0, missing };
  }

  return {
    SCHEMA_VERSION,
    LEGACY_SCHEMA_VERSION,
    METADATA_V02_KEYS,
    LANDMARK_LOG_V02_KEYS,
    HAND_LANDMARK_FORMAT,
    round4,
    round3,
    buildHandTrackingMetadata,
    buildConditionSetMetadata,
    buildHandFrame,
    buildHandLandmarkExport,
    extendMetadata,
    checkLegacyMetadataCompatibility,
    checkLegacyLandmarkLogCompatibility
  };
}));
