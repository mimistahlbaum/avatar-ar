/*
 * Avatar AR · hand feature utilities
 *
 * Pure functions that turn MediaPipe Hands landmarks (21 points per hand)
 * into a small set of derived, research-oriented movement descriptors.
 *
 * Raw landmarks and derived values are kept separate on purpose:
 *   - raw:     the 21 [x, y, z] points as MediaPipe reports them
 *   - derived: openness, finger spread, wrist orientation, size, asymmetry
 *
 * None of these values is a quality, correctness or technique measure. They
 * describe hand configuration only, for visual transformation and logging.
 *
 * The file works both as a browser global (window.HandFeatures) and as a
 * CommonJS module for Node tests. No dependencies, no build step.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.HandFeatures = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // MediaPipe Hands landmark indices.
  const LM = {
    WRIST: 0,
    THUMB_CMC: 1, THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4,
    INDEX_MCP: 5, INDEX_PIP: 6, INDEX_DIP: 7, INDEX_TIP: 8,
    MIDDLE_MCP: 9, MIDDLE_PIP: 10, MIDDLE_DIP: 11, MIDDLE_TIP: 12,
    RING_MCP: 13, RING_PIP: 14, RING_DIP: 15, RING_TIP: 16,
    PINKY_MCP: 17, PINKY_PIP: 18, PINKY_DIP: 19, PINKY_TIP: 20
  };

  const FINGERS = [
    { name: 'thumb',  mcp: LM.THUMB_MCP,  tip: LM.THUMB_TIP },
    { name: 'index',  mcp: LM.INDEX_MCP,  tip: LM.INDEX_TIP },
    { name: 'middle', mcp: LM.MIDDLE_MCP, tip: LM.MIDDLE_TIP },
    { name: 'ring',   mcp: LM.RING_MCP,   tip: LM.RING_TIP },
    { name: 'pinky',  mcp: LM.PINKY_MCP,  tip: LM.PINKY_TIP }
  ];

  // Landmark pairs used for debug drawing of the hand skeleton.
  const CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [5, 9], [9, 10], [10, 11], [11, 12],
    [9, 13], [13, 14], [14, 15], [15, 16],
    [13, 17], [17, 18], [18, 19], [19, 20],
    [0, 17]
  ];

  // Calibration constants. These are empirical ranges for the ratios below
  // and are the values to tune after device testing. They are exported so a
  // study can record exactly which calibration produced its derived values.
  const CALIBRATION = {
    // tip-to-wrist distance divided by MCP-to-wrist distance, per finger
    fingerClosedRatio: 1.05,
    fingerOpenRatio: 1.85,
    // thumb tip to pinky MCP distance divided by palm length
    thumbClosedRatio: 0.85,
    thumbOpenRatio: 1.55,
    // total fan angle (radians) across index to pinky directions
    spreadClosedAngle: 0.15,
    spreadOpenAngle: 0.95,
    // maximum normalised distance between a hand wrist and a pose wrist for
    // side assignment by proximity
    sideAssignMaxDistance: 0.25,
    // pose wrist visibility needed before it is used for side assignment
    sideAssignMinVisibility: 0.5
  };

  function clamp01(v) {
    if (v !== v) return 0; // NaN guard
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  function lerpInv(v, a, b) {
    if (b === a) return 0;
    return clamp01((v - a) / (b - a));
  }

  function hasZ(landmarks) {
    return landmarks.every(l => typeof l.z === 'number' && l.z === l.z);
  }

  // Scale x by the frame aspect ratio so normalised distances are isotropic.
  function toPoint(l, aspect, useZ) {
    return { x: l.x * aspect, y: l.y, z: useZ ? l.z * aspect : 0 };
  }

  function dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = (a.z || 0) - (b.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  function sub(a, b) {
    return { x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) };
  }

  function angleBetween(u, v) {
    const dot = u.x * v.x + u.y * v.y + u.z * v.z;
    const lu = Math.sqrt(u.x * u.x + u.y * u.y + u.z * u.z);
    const lv = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (lu === 0 || lv === 0) return 0;
    const c = Math.max(-1, Math.min(1, dot / (lu * lv)));
    return Math.acos(c);
  }

  function isValidHand(landmarks) {
    return Array.isArray(landmarks) && landmarks.length === 21 &&
      landmarks.every(l => l && typeof l.x === 'number' && typeof l.y === 'number');
  }

  /**
   * Per-finger extension in [0, 1] and their mean as `openness`.
   * 0 = all fingers curled toward the palm, 1 = all fingers extended.
   */
  function computeOpenness(landmarks, opts) {
    const o = normaliseOpts(opts);
    const useZ = o.useZ && hasZ(landmarks);
    const p = landmarks.map(l => toPoint(l, o.aspect, useZ));
    const wrist = p[LM.WRIST];
    const palmLength = dist(wrist, p[LM.MIDDLE_MCP]);
    if (palmLength <= 0) {
      return { openness: 0, fingerExtension: FINGERS.map(() => 0), palmLength: 0 };
    }
    const fingerExtension = FINGERS.map(f => {
      if (f.name === 'thumb') {
        const ratio = dist(p[LM.THUMB_TIP], p[LM.PINKY_MCP]) / palmLength;
        return lerpInv(ratio, CALIBRATION.thumbClosedRatio, CALIBRATION.thumbOpenRatio);
      }
      const mcpToWrist = dist(p[f.mcp], wrist);
      if (mcpToWrist <= 0) return 0;
      const ratio = dist(p[f.tip], wrist) / mcpToWrist;
      return lerpInv(ratio, CALIBRATION.fingerClosedRatio, CALIBRATION.fingerOpenRatio);
    });
    const openness = fingerExtension.reduce((s, v) => s + v, 0) / fingerExtension.length;
    return { openness, fingerExtension, palmLength };
  }

  /**
   * Finger spread in [0, 1] from the fan angle between adjacent finger
   * directions (index, middle, ring, pinky), plus the thumb to index angle.
   * 0 = fingers together, 1 = widely fanned.
   */
  function computeSpread(landmarks, opts) {
    const o = normaliseOpts(opts);
    const useZ = o.useZ && hasZ(landmarks);
    const p = landmarks.map(l => toPoint(l, o.aspect, useZ));
    const dirs = FINGERS.slice(1).map(f => sub(p[f.tip], p[f.mcp]));
    let fanAngle = 0;
    for (let i = 0; i < dirs.length - 1; i++) {
      fanAngle += angleBetween(dirs[i], dirs[i + 1]);
    }
    const thumbDir = sub(p[LM.THUMB_TIP], p[LM.THUMB_MCP]);
    const thumbIndexAngle = angleBetween(thumbDir, dirs[0]);
    return {
      spread: lerpInv(fanAngle, CALIBRATION.spreadClosedAngle, CALIBRATION.spreadOpenAngle),
      fanAngle,
      thumbIndexAngle
    };
  }

  /**
   * Wrist orientation in the image plane.
   * `angle` is the direction from wrist to middle MCP in radians, measured
   * from image "up" (negative y), positive clockwise on screen, range (-PI, PI].
   * `palmNormalSign` is the sign of the z component of the palm normal
   * (index MCP - wrist) x (pinky MCP - wrist). Together with handedness it
   * indicates whether the palm or the back of the hand faces the camera.
   */
  function computeWristOrientation(landmarks, opts) {
    const o = normaliseOpts(opts);
    const p = landmarks.map(l => toPoint(l, o.aspect, false));
    const wrist = p[LM.WRIST];
    const mid = p[LM.MIDDLE_MCP];
    const dx = mid.x - wrist.x;
    const dy = mid.y - wrist.y;
    const angle = Math.atan2(dx, -dy);
    const a = sub(p[LM.INDEX_MCP], wrist);
    const b = sub(p[LM.PINKY_MCP], wrist);
    const cz = a.x * b.y - a.y * b.x;
    let pointing = 'up';
    const deg = angle * 180 / Math.PI;
    if (deg > 45 && deg <= 135) pointing = 'right';
    else if (deg > 135 || deg <= -135) pointing = 'down';
    else if (deg <= -45) pointing = 'left';
    return { angle, pointing, palmNormalSign: cz > 0 ? 1 : cz < 0 ? -1 : 0 };
  }

  /**
   * Size and distance proxies in normalised (aspect-corrected) image units.
   * A larger palm length means the hand is closer to the camera or the
   * person is nearer. This is a relative metric only.
   */
  function computeSize(landmarks, opts) {
    const o = normaliseOpts(opts);
    const p = landmarks.map(l => toPoint(l, o.aspect, false));
    const palmLength = dist(p[LM.WRIST], p[LM.MIDDLE_MCP]);
    const palmWidth = dist(p[LM.INDEX_MCP], p[LM.PINKY_MCP]);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const q of p) {
      if (q.x < minX) minX = q.x;
      if (q.x > maxX) maxX = q.x;
      if (q.y < minY) minY = q.y;
      if (q.y > maxY) maxY = q.y;
    }
    return {
      palmLength,
      palmWidth,
      bboxWidth: maxX - minX,
      bboxHeight: maxY - minY,
      centre: { x: landmarks[LM.WRIST].x, y: landmarks[LM.WRIST].y }
    };
  }

  /**
   * All derived features for one hand.
   */
  function deriveHandFeatures(landmarks, opts) {
    if (!isValidHand(landmarks)) return null;
    const open = computeOpenness(landmarks, opts);
    const spread = computeSpread(landmarks, opts);
    const orient = computeWristOrientation(landmarks, opts);
    const size = computeSize(landmarks, opts);
    return {
      openness: open.openness,
      fingerExtension: open.fingerExtension,
      spread: spread.spread,
      fanAngle: spread.fanAngle,
      thumbIndexAngle: spread.thumbIndexAngle,
      wristAngle: orient.angle,
      pointing: orient.pointing,
      palmNormalSign: orient.palmNormalSign,
      palmLength: size.palmLength,
      palmWidth: size.palmWidth,
      bboxWidth: size.bboxWidth,
      bboxHeight: size.bboxHeight,
      centre: size.centre
    };
  }

  /**
   * Left/right asymmetry from two derived feature sets (either may be null).
   * Signed differences are left minus right. `magnitude` is the mean of the
   * absolute normalised differences that could be computed, or 0 when only
   * one hand or no hand is present.
   */
  function computeAsymmetry(left, right) {
    const present = left && right ? 'both' : left ? 'left' : right ? 'right' : 'none';
    if (present !== 'both') {
      return {
        present,
        opennessDiff: null,
        spreadDiff: null,
        sizeRatio: null,
        wristAngleDiff: null,
        magnitude: 0
      };
    }
    const opennessDiff = left.openness - right.openness;
    const spreadDiff = left.spread - right.spread;
    const sizeRatio = right.palmLength > 0 ? left.palmLength / right.palmLength : null;
    let wristAngleDiff = left.wristAngle - right.wristAngle;
    while (wristAngleDiff > Math.PI) wristAngleDiff -= 2 * Math.PI;
    while (wristAngleDiff <= -Math.PI) wristAngleDiff += 2 * Math.PI;
    const sizeTerm = sizeRatio === null ? 0 : clamp01(Math.abs(Math.log(sizeRatio)));
    const magnitude = (Math.abs(opennessDiff) + Math.abs(spreadDiff) + sizeTerm) / 3;
    return { present, opennessDiff, spreadDiff, sizeRatio, wristAngleDiff, magnitude };
  }

  /**
   * Assign detected hands to the body's left and right side.
   *
   * hands:  [{ landmarks, handedness: 'Left'|'Right'|null, score }]
   * wrists: { left: {x, y, visibility}, right: {x, y, visibility} } from
   *         MediaPipe Pose landmarks 15 and 16, in the same normalised frame,
   *         or null when no pose is available.
   *
   * Primary rule: proximity of the hand wrist to the pose wrists, which is
   * independent of camera mirroring. Fallback: the MediaPipe handedness
   * label, which assumes a mirrored (selfie) input image. When the raw
   * camera frame is not mirrored the label is swapped; opts.labelsMirrored
   * (default true) says whether the label already matches the person's own
   * left/right. This convention must be verified on device.
   *
   * Returns { left: hand|null, right: hand|null, method, assignments }.
   */
  function assignHandSides(hands, wrists, opts) {
    const o = Object.assign({ labelsMirrored: true, aspect: 1 }, opts || {});
    const result = { left: null, right: null, method: 'none', assignments: [] };
    if (!Array.isArray(hands) || hands.length === 0) return result;
    const valid = hands.filter(h => h && isValidHand(h.landmarks)).slice(0, 2);
    if (valid.length === 0) return result;

    const usable = wrists && ['left', 'right'].filter(side => {
      const w = wrists[side];
      return w && typeof w.x === 'number' && typeof w.y === 'number' &&
        (typeof w.visibility !== 'number' || w.visibility >= CALIBRATION.sideAssignMinVisibility);
    });

    if (usable && usable.length > 0) {
      const d = (hand, side) => {
        const w = wrists[side];
        const hw = hand.landmarks[LM.WRIST];
        return Math.sqrt(((hw.x - w.x) * o.aspect) ** 2 + (hw.y - w.y) ** 2);
      };
      const candidates = [];
      if (valid.length === 1) {
        const h = valid[0];
        const sides = usable.map(s => ({ side: s, dist: d(h, s) })).sort((a, b) => a.dist - b.dist);
        if (sides[0].dist <= CALIBRATION.sideAssignMaxDistance) {
          candidates.push({ hand: h, side: sides[0].side, dist: sides[0].dist });
        }
      } else if (usable.length === 2) {
        const straight = d(valid[0], 'left') + d(valid[1], 'right');
        const crossed = d(valid[0], 'right') + d(valid[1], 'left');
        const pairing = straight <= crossed
          ? [{ hand: valid[0], side: 'left', dist: d(valid[0], 'left') }, { hand: valid[1], side: 'right', dist: d(valid[1], 'right') }]
          : [{ hand: valid[0], side: 'right', dist: d(valid[0], 'right') }, { hand: valid[1], side: 'left', dist: d(valid[1], 'left') }];
        for (const c of pairing) if (c.dist <= CALIBRATION.sideAssignMaxDistance) candidates.push(c);
      } else {
        // Two hands but only one usable pose wrist: nearest hand takes it.
        const side = usable[0];
        const sorted = valid.map(h => ({ hand: h, side, dist: d(h, side) })).sort((a, b) => a.dist - b.dist);
        if (sorted[0].dist <= CALIBRATION.sideAssignMaxDistance) candidates.push(sorted[0]);
      }
      if (candidates.length > 0) {
        for (const c of candidates) {
          result[c.side] = c.hand;
          result.assignments.push({ side: c.side, method: 'pose-proximity', distance: c.dist, label: c.hand.handedness || null });
        }
        result.method = 'pose-proximity';
        // Any hand still unassigned falls to the label rule for the free side.
        const leftover = valid.filter(h => h !== result.left && h !== result.right);
        for (const h of leftover) {
          const side = labelSide(h.handedness, o.labelsMirrored);
          const free = side && !result[side] ? side : (!result.left ? 'left' : !result.right ? 'right' : null);
          if (free) {
            result[free] = h;
            result.assignments.push({ side: free, method: 'handedness-label', distance: null, label: h.handedness || null });
            result.method = 'mixed';
          }
        }
        return result;
      }
    }

    // Fallback: handedness labels.
    for (const h of valid) {
      const side = labelSide(h.handedness, o.labelsMirrored);
      const free = side && !result[side] ? side : (!result.left ? 'left' : !result.right ? 'right' : null);
      if (!free) continue;
      result[free] = h;
      result.assignments.push({ side: free, method: 'handedness-label', distance: null, label: h.handedness || null });
    }
    result.method = 'handedness-label';
    return result;
  }

  function labelSide(label, labelsMirrored) {
    if (label !== 'Left' && label !== 'Right') return null;
    const own = label === 'Left' ? 'left' : 'right';
    if (labelsMirrored) return own;
    return own === 'left' ? 'right' : 'left';
  }

  function normaliseOpts(opts) {
    const o = opts || {};
    return {
      aspect: typeof o.aspect === 'number' && o.aspect > 0 ? o.aspect : 1,
      useZ: o.useZ !== false
    };
  }

  /**
   * Exponential smoother for derived features with decay toward a neutral
   * state when a hand disappears. Keeps the visual mapping stable when
   * tracking flickers, and makes "hand lost" a gradual return rather than a
   * jump. Pure state machine, no timers.
   */
  function createFeatureSmoother(options) {
    const cfg = Object.assign({
      alphaPresent: 0.25,
      alphaMissing: 0.06,
      neutral: { openness: 0.5, spread: 0.3, wristAngle: 0, palmLength: 0 }
    }, options || {});
    const state = {
      left: Object.assign({}, cfg.neutral, { present: 0 }),
      right: Object.assign({}, cfg.neutral, { present: 0 })
    };
    function mix(prev, target, alpha) {
      return prev + (target - prev) * alpha;
    }
    function mixAngle(prev, target, alpha) {
      let d = target - prev;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d <= -Math.PI) d += 2 * Math.PI;
      return prev + d * alpha;
    }
    return {
      update(side, features) {
        const s = state[side];
        if (!s) return null;
        if (features) {
          s.openness = mix(s.openness, features.openness, cfg.alphaPresent);
          s.spread = mix(s.spread, features.spread, cfg.alphaPresent);
          s.wristAngle = mixAngle(s.wristAngle, features.wristAngle, cfg.alphaPresent);
          s.palmLength = mix(s.palmLength, features.palmLength, cfg.alphaPresent);
          s.present = mix(s.present, 1, cfg.alphaPresent);
        } else {
          s.openness = mix(s.openness, cfg.neutral.openness, cfg.alphaMissing);
          s.spread = mix(s.spread, cfg.neutral.spread, cfg.alphaMissing);
          s.wristAngle = mixAngle(s.wristAngle, cfg.neutral.wristAngle, cfg.alphaMissing);
          s.palmLength = mix(s.palmLength, cfg.neutral.palmLength, cfg.alphaMissing);
          s.present = mix(s.present, 0, cfg.alphaMissing);
        }
        return Object.assign({}, s);
      },
      get(side) { return Object.assign({}, state[side]); },
      reset() {
        state.left = Object.assign({}, cfg.neutral, { present: 0 });
        state.right = Object.assign({}, cfg.neutral, { present: 0 });
      }
    };
  }

  return {
    LM,
    FINGERS,
    CONNECTIONS,
    CALIBRATION,
    isValidHand,
    computeOpenness,
    computeSpread,
    computeWristOrientation,
    computeSize,
    deriveHandFeatures,
    computeAsymmetry,
    assignHandSides,
    createFeatureSmoother
  };
}));
