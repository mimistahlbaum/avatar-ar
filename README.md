# Avatar AR

A browser-based AR tool for movement generation in dance practice.

Avatar AR uses a live camera feed, MediaPipe Pose and Canvas 2D rendering to generate an organic, non-anatomical avatar silhouette from the dancer's body landmarks in real time. The avatar form, rather than the dancer's own reflection, becomes the visual reference for movement.

Version 0.2 is a minimal research prototype for practice-led research. It adds a consent workflow, optional per-frame landmark logging, condition sequencing and a richer metadata export, while keeping the tool local-only with no server and no build step.

Version 0.3 adds an optional, hand-mediated research condition (Avatar V "Bloom") driven by MediaPipe Hands. It is off by default. Avatar I to IV, the body landmark log and the four-condition protocol are unchanged. See [Hand tracking and Avatar V](#hand-tracking-and-avatar-v-extended-condition).

This tool does not score dancing. Hand and body data are used for visual transformation and research logging only. There is no good/bad, correct/incorrect, technique, posture, flexibility or aesthetic measure anywhere in the tool or its exports.

## Live tool

GitHub Pages:

https://mimistahlbaum.github.io/avatar-ar

Direct file URL, also available:

https://mimistahlbaum.github.io/avatar-ar/avatar-ar.html

## What it does

- Shows a consent screen before any camera access, explaining what is captured and where data goes
- Opens the user's camera in the browser after consent
- Tracks body position with MediaPipe Pose
- Draws an organic avatar overlay in real time
- Provides four avatar forms, usable as research conditions
- Optionally adds a fifth, hand-mediated form (Avatar V) using MediaPipe Hands, loaded only when switched on
- Supports manual or randomised condition sequencing with start and end timestamps, over a Legacy I–IV or Extended I–V condition set
- Allows opacity adjustment
- Allows the live camera feed to be shown or hidden
- Records a video clip as `.webm`, falling back to `.mp4` on browsers without WebM recording support such as Safari
- Optionally logs per-frame pose landmarks at a selectable sampling rate during recordings
- Exports a companion `.metadata.json` file for each recording, a separate `.landmarks.json` file when logging is enabled, and a separate `.hands.json` file when logging and hand tracking are both enabled
- Includes participant ID, condition label and session notes fields
- Surfaces clear on-screen errors for CDN load failure, denied camera permission, unsupported recording and missing pose detection
- Runs entirely in the browser

## How to use

Open the GitHub Pages URL on a phone browser, Safari or Chrome. Read the consent screen, tick the consent checkbox and tap **Start camera**. The Start button stays disabled until consent is given.

Controls in the top bar:

- **I / II / III / IV**: switch between avatar forms
- **V**: appears only while hand tracking is on (or while V is the active condition). Switches to the hand-mediated form
- **camera**: toggle the live camera feed on or off while avatar tracking continues
- **rec**: record a video clip, downloaded as `.webm` (or `.mp4` on Safari) when stopped
- **opacity**: adjust how opaque the avatar appears

Research panel (bottom left):

- **Participant ID**: optional participant/session identifier
- **Condition label**: optional free-text label for the current task
- **Session notes**: optional notes saved into the metadata export
- **Landmark logging**: enable per-frame landmark capture and choose a sampling rate (5, 10, 15 or 30 fps). Settings are locked while a recording is running
- **Hand tracking**: switch MediaPipe Hands on or off and choose its target rate (10, 15 or 30 fps, default 15). **Show hand landmarks** draws the raw hand points for checking tracking. Both are locked while a recording is running
- **Condition sequence**: choose the condition **set** (Legacy I–IV, the default, or Extended I–V), choose manual or randomised order, then step through the conditions. The panel shows the current condition number, the next condition and how many remain. The extended set refuses to start until hand tracking is on

## Avatar forms

Four body-pose forms are always available. A fifth, hand-mediated form is available when hand tracking is on. Each is designed to pull movement attention in a different direction.

| | Name | Form | Colour |
|---|---|---|---|
| **I** | Default | Balanced proportions, moderate organic wobble | Cream |
| **II** | Wisp | Tiny head, limbs 4x longer and very thin, near-static | Pale blue |
| **III** | Bubble | Head 4x size, wide jelly torso, very short legs, heavy wobble | Warm gold |
| **IV** | Split | Left side 2x longer and thicker, right side less than half | Dusty rose |
| **V** | Bloom (optional) | Avatar I proportions at rest. Each side of the body expands or contracts with that hand's openness, finger spread grows a radiating field at the wrist and an outer ring around torso and head, wrist rotation turns the field. Requires hand tracking | Slate fill, pale stroke |

The avatar presets use different body transformation parameters, including:

- head scale
- torso width and height
- arm and leg scale
- arm and leg length
- organic wobble
- left/right asymmetry
- fill and stroke colour

These presets should be understood as movement-perception conditions, not character designs.

## Hand tracking and Avatar V (extended condition)

Hand tracking is an optional layer added in v0.3. It is off by default and the MediaPipe Hands library is only fetched from the CDN when the researcher switches it on, so the default page load is the same as v0.2.

### What is tracked

- Up to 2 hands, 21 landmarks each (MediaPipe Hands, legacy Solutions API, same loading style as Pose)
- Each detected hand is assigned to the body's left or right side by proximity to the MediaPipe Pose wrists (landmarks 15 and 16). MediaPipe's own handedness label is only a fallback, because that label assumes a mirrored selfie image and the raw camera frame may not be mirrored. Both the label and the assignment method are logged so the convention can be checked and corrected after the fact

### Derived features

Computed in `js/hand-features.js`, separately from the raw landmarks:

| Feature | Definition | Range |
|---|---|---|
| openness | mean per-finger extension (tip-to-wrist over MCP-to-wrist distance, thumb via thumb tip to pinky MCP) | 0 closed to 1 open |
| finger spread | total fan angle across index to pinky finger directions | 0 together to 1 fanned |
| wrist orientation | angle of wrist to middle MCP from image "up", plus a palm normal sign | radians |
| hand size / distance | palm length and palm width in aspect-corrected normalised image units, as a relative distance proxy | normalised units |
| left-right asymmetry | signed left minus right differences of openness, spread, wrist angle, plus a size ratio and a 0 to 1 magnitude | see `computeAsymmetry` |

The calibration constants that map raw ratios to 0 to 1 are exported as `HandFeatures.CALIBRATION` and written into every `.hands.json` file. They are starting values and will need tuning against real hands on real devices.

### Visual mapping

`js/bloom-mapping.js` maps smoothed features onto the same deformation parameters Avatar I to IV already use (`asymL`, `asymR`, `torsoRxScale`, `headScale` and so on) plus a field description drawn as stroke-only spokes and rings. A hand that is not detected decays toward a neutral, Avatar I-like state for that side rather than snapping. The mapping constants are in `BloomMapping.MAPPING`.

### Performance approach

Body pose runs on every camera frame exactly as before. Hands are dispatched after the pose call without being awaited, at a lower target rate (default 15 fps), with at most one hand inference in flight. Render frames reuse the latest hand result until a newer one arrives, and a result older than 700 ms is treated as "no hands". Per-recording measured hand fps and mean inference time are written into the metadata so device performance is part of the record.

A Web Worker was considered and not used: the legacy MediaPipe Solutions build needs the page's DOM and WebGL context. Moving to MediaPipe Tasks Vision (`HandLandmarker`) would make a Worker possible and is the natural next step if mobile frame rates prove insufficient. The hand model defaults to the lite variant (`modelComplexity 0`); this and the other constants sit at the top of the script in `avatar-ar.html`.

### Privacy

Hand landmarks are numbers, not images, and are treated as sensitive movement data in the same way as body landmarks. Nothing is uploaded. Hand data is written to disk only when landmark logging is on and hand tracking is on, into a separate `.hands.json` file. The consent screen explains hand tracking, and the consent statement version is now `0.3`.

## Research workflow

A suggested session flow, described in more detail in [docs/research-protocol.md](docs/research-protocol.md):

1. Enter the participant ID before starting
2. Read the consent screen with the participant and confirm the checkbox together
3. Choose the condition set. Legacy I–IV reproduces the v0.2 protocol. Extended I–V is a separate protocol option that requires hand tracking. Start a condition sequence (manual or randomised)
4. For each condition: enable landmark logging if needed, press **rec**, run the task, press **stop**, then advance with **next**
5. Move all downloaded files into the session folder for that participant

### Session naming

Recordings are named `avatar-ar-<sessionId>-<timestamp>` with matching `.metadata.json`, optional `.landmarks.json` and optional `.hands.json` files. The `sessionId` is a random UUID per recording, so the files of one recording always share a base name. Use the participant ID field so recordings can be grouped afterwards; a folder convention such as `P001/2026-07-03/` works well.

### Data handling

All files are downloaded to the local device. Nothing is uploaded. Recorded movement data should still be treated as sensitive research material:

- move files off shared devices promptly and store them according to your ethics approval
- landmark logs contain body movement data that may be identifying in combination with other records. Hand landmark logs are the same kind of data
- participant IDs should be pseudonyms, with the key list stored separately

## Metadata export

Each recording exports a companion metadata JSON file with `schemaVersion` `0.3.0`. Every key that existed in `0.2.0` is still present with the same meaning and type, so v0.2 readers keep working (this is checked by `tests/export-schema.test.js`). It includes:

- consent status, consent timestamp and consent statement version
- session fields: participant ID, condition label, session notes
- recording timing: session start, recording start and end, duration
- the selected avatar preset and its full parameter set
- opacity and camera visibility at the time of export
- the condition sequence (mode, order, position, completion, start and end timestamps)
- a `conditionEvents` list with a start and end timestamp for every avatar condition period in the session
- landmark logging settings: enabled, sampling fps, frame count, truncation flag, companion filename
- environment: browser user agent, language, screen size and pixel ratio
- canvas and camera video dimensions
- recording details: filename, MIME type, requested frame rate, status and any recorder error
- MediaPipe Pose configuration

New in `0.3.0`, all additive:

- `conditionSet`: id (`legacy-4` or `extended-5`), label, avatar indices, protocol version, whether it requires hand tracking. `conditionSequence.conditionSetId` carries the same id
- `handTracking`: enabled flag, library and version, model complexity, max hands, confidence thresholds, target fps, measured fps and mean inference time for the recording, result count, debug visualisation flag, the side-assignment rule, the mirrored-label assumption, and `scoring: "none"`
- `landmarkLogging.handLandmarkFilename`: the companion hand file, or `null`
- `selectedAvatar.handMediated: true` when Avatar V was selected (Avatar I to IV objects are unchanged)

## Landmark export

When landmark logging is enabled, stopping a recording also downloads a `.landmarks.json` file:

```json
{
  "tool": "Avatar AR",
  "schemaVersion": "0.2.0",
  "kind": "landmark-log",
  "sessionId": "...",
  "participantId": "...",
  "samplingFps": 10,
  "maxFrames": 20000,
  "truncated": false,
  "frameCount": 0,
  "startedAt": "...",
  "endedAt": "...",
  "landmarkFormat": "MediaPipe Pose, 33 landmarks per frame, each landmark is [x, y, z, visibility] with x/y normalised to the video frame",
  "frames": [
    {
      "t": 0,
      "avatarIndex": 0,
      "avatarId": "default",
      "conditionLabel": "",
      "opacity": 0.75,
      "cameraVisible": true,
      "landmarks": [[0.5, 0.3, -0.1, 0.99]]
    }
  ]
}
```

`t` is milliseconds since the recording started. Coordinates are rounded to four decimal places to keep files small. Logging stops at 20,000 frames per recording (about 33 minutes at 10 fps, or 11 minutes at 30 fps) and the file is marked `truncated`. Higher sampling rates produce larger files and may cost performance on older phones; 10 fps is a reasonable default.

The body landmark file is unchanged in v0.3 apart from the `schemaVersion` string. Hand data is never added to it.

## Hand landmark export

When landmark logging **and** hand tracking are both enabled, stopping a recording also downloads a `.hands.json` companion file (`kind: "hand-landmark-log"`). It is written as compact single-line JSON because it can carry 42 landmarks per frame.

```json
{
  "tool": "Avatar AR",
  "schemaVersion": "0.3.0",
  "kind": "hand-landmark-log",
  "sessionId": "...",
  "participantId": "...",
  "bodyLandmarkFilename": "....landmarks.json",
  "samplingFps": 10,
  "handTargetFps": 15,
  "maxFrames": 20000,
  "truncated": false,
  "frameCount": 0,
  "startedAt": "...",
  "endedAt": "...",
  "landmarkFormat": "MediaPipe Hands, up to 2 hands per frame, 21 landmarks per hand, each landmark is [x, y, z] ...",
  "derivedFeatureNote": "Derived values describe hand configuration only ... They are not quality, technique or correctness measures.",
  "calibration": { "fingerClosedRatio": 1.05, "fingerOpenRatio": 1.85, "...": "..." },
  "frames": [
    {
      "t": 0,
      "avatarIndex": 4,
      "avatarId": "bloom",
      "conditionLabel": "",
      "handsDetected": 2,
      "leftHand":  { "landmarks": [[0.3, 0.58, 0.0]], "label": "Left",  "score": 0.97, "method": "pose-proximity" },
      "rightHand": { "landmarks": [[0.7, 0.58, 0.0]], "label": "Right", "score": 0.95, "method": "pose-proximity" },
      "derivedHandFeatures": {
        "left":  { "openness": 0.82, "spread": 0.41, "wristAngle": 0.12, "palmLength": 0.09, "palmWidth": 0.08, "pointing": "up", "palmNormalSign": -1, "fingerExtension": [0.7, 0.9, 0.9, 0.8, 0.8] },
        "right": { "...": "..." },
        "asymmetry": { "present": "both", "opennessDiff": 0.3, "spreadDiff": 0.1, "sizeRatio": 1.02, "wristAngleDiff": -0.2, "magnitude": 0.14 }
      }
    }
  ]
}
```

Frames are added when a new hand result arrives, at most at the body sampling rate, so the hand file never has more frames than the body file. A result with no hands still produces a small frame (`handsDetected: 0`, both hands `null`) so "body detected, hands not detected" moments remain in the data. `leftHand` and `rightHand` are body sides, assigned as described above. `label` is MediaPipe's raw handedness label, kept so the side assignment can be audited.

## Error handling

The tool reports these situations in plain language on screen:

- MediaPipe failing to load from the CDN (with a reload button)
- camera permission denied, camera missing or camera in use by another app
- MediaRecorder not supported, so recording is unavailable
- no pose detected while the camera is running
- recording failing to start or erroring mid-recording
- MediaPipe Hands failing to load when hand tracking is switched on (body tracking continues)
- Avatar V selected while hand tracking is off (the avatar stays in its neutral form)
- body detected but no hands detected while Avatar V is active

## Technical structure

The prototype is intentionally simple:

- single main HTML file with inline CSS and the page-level JavaScript
- four small dependency-free modules in `js/` for logic that is unit tested outside the browser: `hand-features.js`, `bloom-mapping.js`, `condition-sets.js`, `export-schema.js`. Each is a plain script tag in the page and a CommonJS module in Node
- lightweight GitHub Pages entry point
- MediaPipe Pose loaded from jsDelivr CDN at page load; MediaPipe Hands loaded from jsDelivr only when hand tracking is switched on
- Canvas 2D rendering
- MediaRecorder for browser-based video export
- metadata and landmark JSON exports generated in-browser
- no build step
- no server
- no database

This keeps the tool easy to deploy through GitHub Pages and easy to adapt during early research development.

If the `js/` modules fail to load, the page falls back to v0.2 behaviour: Avatar I to IV, body logging and the four-condition sequence keep working and hand tracking reports that it is unavailable.

## Tests

Unit tests use Node's built-in test runner, no dependencies:

```
npm test
```

They cover hand openness, finger spread, wrist orientation, hand size, left-right asymmetry, side assignment, feature smoothing, the Avatar V parameter mapping, condition set ordering (Legacy I–IV preserved, Extended I–V works) and metadata backward compatibility with `0.2.0`. CI runs `html-validate` and the unit tests on every pull request.

### Browser testing still needed

The hand layer has been exercised with a stubbed MediaPipe in headless Chromium (render path, scheduling, exports). The following need checking on real devices before the extended condition is used in a study:

| Check | What to look for |
|---|---|
| iPhone Safari | Hands library loads over the CDN, hand result rate near target, body frame rate not degraded when hands are on, `.mp4` recording still works with hands on |
| Chrome Android | Same as above on a mid-range device. Try 10 fps hands if the body avatar stutters |
| Desktop Chrome | Baseline reference for hand fps and inference ms in the metadata |
| Camera permission denied | Consent screen explains the problem; enabling hand tracking afterwards does not throw |
| One hand only | The visible hand drives its own side; the other side decays to neutral within about a second |
| Both hands | Sides are assigned correctly when hands are near their wrists; check `method` is `pose-proximity` in `.hands.json` |
| Hands outside frame | Avatar V returns to neutral, the "no hands detected" hint appears after 3 s, no errors |
| Low light | Note how hand detection fails relative to body detection; expect hands to drop first |
| Body detected, hands not detected | `.hands.json` frames with `handsDetected: 0` appear, body log continues unchanged |
| Handedness convention | With hands crossed or far from the pose wrists the label fallback is used. Confirm whether MediaPipe's `Left`/`Right` label matches the person's own hand on that device and adjust `HANDEDNESS_LABELS_MIRRORED` if not |
| Calibration | Fist and open hand should reach roughly 0 and 1 openness; fingers together and fanned should reach roughly 0 and 1 spread. Tune `HandFeatures.CALIBRATION` if not |
| Mirroring | The wrist field rotates with the hand in the mirrored view without appearing reversed |

## Research positioning

Avatar AR may support questions such as:

- How does avatar-mediated visual feedback alter a dancer's perception of their own movement?
- How do distortion, asymmetry and scale affect choreographic decision-making?
- Can simple browser-based tools support embodied research without requiring a full XR production pipeline?
- How might avatar transformation become a rehearsal, teaching or performance research method?

## Current limitations

- Recording captures the canvas output only, so the exported video contains the avatar rendering, not the camera image
- Landmark logging runs only while a recording is active
- The consent screen is a working prompt, not a substitute for a formal ethics-approved consent process
- Randomised condition order uses a simple in-browser shuffle, without counterbalancing across participants
- Browser support depends on camera permissions, MediaRecorder support and MediaPipe loading from the CDN, so the tool needs an internet connection at load time
- The `/avatar-ar` directory URL uses a small GitHub Pages wrapper around the main `avatar-ar.html` file
- Hand feature calibration constants and the handedness mirror assumption have not yet been verified on real devices
- Hand tracking uses the legacy MediaPipe Solutions build, which cannot run in a Web Worker. Mobile performance with Pose and Hands together is untested
- Avatar V data is not comparable with Legacy I–IV sessions without a study design that accounts for the extra condition

## Planned development

Suggested next steps:

1. Counterbalanced or Latin square condition ordering across participants
2. Landmark logging outside of recordings, for observation-only sessions
3. Configurable consent text for different studies
4. Separate CSS and the remaining page JavaScript into dedicated files once the prototype stabilises
5. Device calibration pass for hand features, then a move to MediaPipe Tasks Vision so hand inference can run in a Worker

## Privacy note

The tool runs in the browser. It does not upload camera footage, landmark data or metadata to a server. Recordings, metadata files, body landmark logs and hand landmark logs are downloaded locally by the user, and the exported video contains only the avatar rendering, never the camera image.

Recorded movement data should still be treated as sensitive research material. Consent, storage and access should be managed appropriately before using this tool with participants. See [docs/research-protocol.md](docs/research-protocol.md).
