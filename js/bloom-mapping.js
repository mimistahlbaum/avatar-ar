/*
 * Avatar AR · Avatar V "Bloom" parameter mapping
 *
 * Maps derived hand features (see hand-features.js) onto the avatar
 * deformation parameters already used by Avatar I to IV, plus a separate
 * "field" description for the radiating contour drawn around the wrists and
 * torso. The mapping is a pure function so it can be unit tested and so the
 * calibration is recorded explicitly.
 *
 * Design intent (movement-perception condition, not a character):
 *   - hand openness      -> contour expands (open) or contracts (closed)
 *   - finger spread      -> radiating field width and spoke count grow
 *   - left/right hands   -> each side of the body follows its own hand, so
 *                           asymmetry emerges from the dancer, not a preset
 *   - wrist orientation  -> rotates the field around each wrist
 *   - hand not detected  -> that side decays to a neutral, Avatar I-like state
 *
 * No value here is a score. Nothing is compared to a target.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BloomMapping = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Base preset for Avatar V. Body proportions match Avatar I so that any
  // visible deformation comes from the hands. Colour is deliberately the
  // inverse of I (dark fill, pale stroke) so the condition reads as distinct.
  const BASE_PRESET = {
    id: 'bloom',
    label: 'V',
    handMediated: true,
    headScale: 1.0, torsoRxScale: 1.0, torsoRyScale: 1.0,
    armScale: 1.0, legScale: 1.0, armLen: 1.0, legLen: 1.0,
    wobble: 0.06, headWobble: 0.04,
    asymL: 1.0, asymR: 1.0, asymLLen: 1.0, asymRLen: 1.0,
    fill: 'rgba(52, 62, 68, 0.92)',
    stroke: 'rgba(225, 232, 230, 0.90)'
  };

  const MAPPING = {
    // contour scale at openness 0, 0.5 and 1 -> 0.55, 1.0, 1.45
    expandMin: 0.55,
    expandRange: 0.9,
    // how much limb length follows expansion (0 = thickness only)
    lengthFollow: 0.3,
    torsoRyFollow: 0.4,
    headFollow: 0.5,
    // field around each wrist, in units of shoulder width
    fieldWidthMax: 0.9,
    fieldSpokesMin: 4,
    fieldSpokesMax: 16,
    // outer torso ring offset in units of torso radius
    ringOffsetMax: 0.35,
    wobbleBase: 0.06,
    wobbleSpreadGain: 0.12
  };

  const NEUTRAL_SIDE = { openness: 0.5, spread: 0.3, wristAngle: 0, palmLength: 0, present: 0 };

  function clamp01(v) {
    if (v !== v) return 0;
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  function sideOrNeutral(s) {
    if (!s) return Object.assign({}, NEUTRAL_SIDE);
    return {
      openness: clamp01(typeof s.openness === 'number' ? s.openness : NEUTRAL_SIDE.openness),
      spread: clamp01(typeof s.spread === 'number' ? s.spread : NEUTRAL_SIDE.spread),
      wristAngle: typeof s.wristAngle === 'number' ? s.wristAngle : 0,
      palmLength: typeof s.palmLength === 'number' ? s.palmLength : 0,
      present: clamp01(typeof s.present === 'number' ? s.present : 1)
    };
  }

  function expansion(openness) {
    return MAPPING.expandMin + clamp01(openness) * MAPPING.expandRange;
  }

  /**
   * features: { left, right } smoothed per-side features (either may be null).
   * Returns { cfg, field, inputs }.
   *   cfg   - full avatar preset for this frame (BASE_PRESET with overrides)
   *   field - { left: {width, spokes, angle, alpha}, right: {...}, ring: {offset, alpha} }
   */
  function mapHandFeaturesToAvatar(features, basePreset) {
    const base = basePreset || BASE_PRESET;
    const f = features || {};
    const L = sideOrNeutral(f.left);
    const R = sideOrNeutral(f.right);

    // When a side is only partly present, blend toward neutral so a lost hand
    // never snaps the body shape.
    const openL = NEUTRAL_SIDE.openness + (L.openness - NEUTRAL_SIDE.openness) * L.present;
    const openR = NEUTRAL_SIDE.openness + (R.openness - NEUTRAL_SIDE.openness) * R.present;
    const spreadL = L.spread * L.present;
    const spreadR = R.spread * R.present;

    const expandL = expansion(openL);
    const expandR = expansion(openR);
    const meanExpand = (expandL + expandR) / 2;
    const meanSpread = (spreadL + spreadR) / 2;

    const cfg = Object.assign({}, base, {
      asymL: expandL,
      asymR: expandR,
      asymLLen: 1 + (expandL - 1) * MAPPING.lengthFollow,
      asymRLen: 1 + (expandR - 1) * MAPPING.lengthFollow,
      torsoRxScale: base.torsoRxScale * meanExpand,
      torsoRyScale: base.torsoRyScale * (1 + (meanExpand - 1) * MAPPING.torsoRyFollow),
      headScale: base.headScale * (1 + (meanExpand - 1) * MAPPING.headFollow),
      wobble: MAPPING.wobbleBase + meanSpread * MAPPING.wobbleSpreadGain
    });

    const sideField = (side) => ({
      width: side.spread * side.present * MAPPING.fieldWidthMax,
      spokes: Math.round(MAPPING.fieldSpokesMin + side.spread * (MAPPING.fieldSpokesMax - MAPPING.fieldSpokesMin)),
      angle: side.wristAngle,
      alpha: side.present
    });

    const field = {
      left: sideField(L),
      right: sideField(R),
      ring: {
        offset: meanSpread * MAPPING.ringOffsetMax,
        alpha: Math.max(L.present, R.present)
      }
    };

    return {
      cfg,
      field,
      inputs: { openL, openR, spreadL, spreadR, expandL, expandR, meanExpand, meanSpread }
    };
  }

  return {
    BASE_PRESET,
    MAPPING,
    NEUTRAL_SIDE,
    expansion,
    mapHandFeaturesToAvatar
  };
}));
