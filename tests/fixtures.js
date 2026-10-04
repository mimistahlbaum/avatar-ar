'use strict';

/*
 * Synthetic MediaPipe Hands landmark fixtures for unit tests.
 * Coordinates are normalised (0..1). Palm points "up" the image (negative y)
 * unless rotated. Not real tracking data.
 */

function rotate(p, cx, cy, rad) {
  const dx = p.x - cx;
  const dy = p.y - cy;
  return {
    x: cx + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: cy + dx * Math.sin(rad) + dy * Math.cos(rad),
    z: p.z
  };
}

/**
 * options:
 *   openness: 'open' | 'closed' | number in [0,1]
 *   fan: total fan angle in radians across index..pinky (0 = parallel)
 *   wristX, wristY: wrist position
 *   scale: palm length in normalised units (default 0.1)
 *   rotation: rotate the whole hand around the wrist, radians, clockwise on screen
 *   mirrorX: flip left/right around the wrist (to make the other hand)
 */
function makeHand(options) {
  const o = Object.assign({ openness: 'open', fan: 0, wristX: 0.5, wristY: 0.7, scale: 0.1, rotation: 0, mirrorX: false }, options || {});
  const open = o.openness === 'open' ? 1 : o.openness === 'closed' ? 0 : o.openness;
  const s = o.scale;
  const wx = o.wristX;
  const wy = o.wristY;
  const pts = new Array(21);
  pts[0] = { x: wx, y: wy, z: 0 };

  // MCP row, palm length s above the wrist. The middle MCP sits directly above
  // the wrist so wrist->middle MCP is exactly vertical with length s.
  const mcpX = [-0.35, 0, 0.3, 0.6].map(k => k * s);
  const fingerBase = [5, 9, 13, 17];
  const fingerLenFactor = [0.85, 0.95, 0.9, 0.75]; // relative to palm length
  const fanDirs = [1.5, 0.5, -0.5, -1.5].map(k => o.fan === 0 ? 0 : k * (o.fan / 3));

  fingerBase.forEach((base, i) => {
    const mx = wx + mcpX[i];
    const my = wy - s;
    pts[base] = { x: mx, y: my, z: 0 };
    const len = s * fingerLenFactor[i];
    // direction: up (negative y) tilted by fan angle; fanDirs positive tilts toward -x
    const dirX = -Math.sin(fanDirs[i]);
    const dirY = -Math.cos(fanDirs[i]);
    // open: finger extends straight along dir. closed: joints fold back toward the palm.
    const ext = open;
    const segs = [0.4, 0.3, 0.3];
    let px = mx, py = my;
    let cum = 0;
    for (let j = 0; j < 3; j++) {
      cum += segs[j];
      if (ext >= 0.5) {
        px = mx + dirX * len * cum * (0.5 + ext * 0.5);
        py = my + dirY * len * cum * (0.5 + ext * 0.5);
      } else {
        // curled: first joint goes up a bit, then folds back down toward the wrist
        const fold = 1 - ext * 2; // 1 fully closed
        const up = j === 0 ? 0.4 * len : 0.4 * len - (cum - 0.4) * len * 1.2 * fold;
        px = mx + dirX * 0.1 * len;
        py = my - up;
      }
      pts[base + 1 + j] = { x: px, y: py, z: 0 };
    }
  });

  // Thumb: CMC near the wrist on the index side, opens outward.
  const thumbSide = -1;
  pts[1] = { x: wx + thumbSide * 0.35 * s, y: wy - 0.3 * s, z: 0 };
  pts[2] = { x: wx + thumbSide * 0.6 * s, y: wy - 0.6 * s, z: 0 };
  if (open >= 0.5) {
    pts[3] = { x: wx + thumbSide * 1.1 * s, y: wy - 0.75 * s, z: 0 };
    pts[4] = { x: wx + thumbSide * 1.6 * s, y: wy - 0.9 * s, z: 0 };
  } else {
    pts[3] = { x: wx + thumbSide * 0.3 * s, y: wy - 0.75 * s, z: 0 };
    pts[4] = { x: wx + thumbSide * 0.0 * s, y: wy - 0.7 * s, z: 0 };
  }

  let out = pts;
  if (o.mirrorX) out = out.map(p => ({ x: wx - (p.x - wx), y: p.y, z: p.z }));
  if (o.rotation) out = out.map(p => rotate(p, wx, wy, o.rotation));
  return out;
}

function v02Metadata() {
  return {
    tool: 'Avatar AR',
    schemaVersion: '0.2.0',
    kind: 'recording-metadata',
    sessionId: 'abc',
    participantId: 'P001',
    conditionLabel: 'task A',
    sessionNotes: '',
    consent: { given: true, givenAt: '2026-07-03T10:00:00.000Z', statementVersion: '0.2' },
    timestamp: '2026-07-03T10:05:00.000Z',
    sessionStartedAt: '2026-07-03T10:00:00.000Z',
    startedAt: '2026-07-03T10:01:00.000Z',
    endedAt: '2026-07-03T10:05:00.000Z',
    durationMs: 240000,
    selectedAvatarIndex: 1,
    selectedAvatar: { id: 'wisp', label: 'II' },
    opacity: 0.75,
    cameraVisible: true,
    conditionSequence: { mode: 'manual', order: ['I', 'II', 'III', 'IV'], position: 1, active: true, completed: false, startedAt: '2026-07-03T10:00:30.000Z', endedAt: null },
    conditionEvents: [{ avatarIndex: 0, avatarId: 'default', avatarLabel: 'I', source: 'session-start', startedAt: '2026-07-03T10:00:00.000Z', endedAt: '2026-07-03T10:00:30.000Z' }],
    landmarkLogging: { enabled: true, samplingFps: 10, frameCount: 2400, truncated: false, maxFrames: 20000, filename: 'x.landmarks.json' },
    environment: { userAgent: 'ua', language: 'en-AU', screen: { width: 390, height: 844, pixelRatio: 3 } },
    canvas: { width: 390, height: 844 },
    video: { width: 640, height: 480 },
    recording: { videoFilename: 'x.webm', mimeType: 'video/webm', requestedFrameRate: 30, status: 'completed', error: null },
    poseDetection: { library: 'MediaPipe Pose', modelComplexity: 1, smoothLandmarks: true, enableSegmentation: false, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 }
  };
}

function v02LandmarkLog() {
  return {
    tool: 'Avatar AR',
    schemaVersion: '0.2.0',
    kind: 'landmark-log',
    sessionId: 'abc',
    participantId: 'P001',
    samplingFps: 10,
    maxFrames: 20000,
    truncated: false,
    frameCount: 1,
    startedAt: '2026-07-03T10:01:00.000Z',
    endedAt: '2026-07-03T10:05:00.000Z',
    landmarkFormat: 'MediaPipe Pose, 33 landmarks per frame, each landmark is [x, y, z, visibility] with x/y normalised to the video frame',
    frames: [{ t: 0, avatarIndex: 0, avatarId: 'default', conditionLabel: '', opacity: 0.75, cameraVisible: true, landmarks: new Array(33).fill([0.5, 0.3, -0.1, 0.99]) }]
  };
}

module.exports = { makeHand, v02Metadata, v02LandmarkLog };
