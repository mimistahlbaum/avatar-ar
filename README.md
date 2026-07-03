# Avatar AR

A browser-based AR tool for movement generation in dance practice.

Avatar AR uses a live camera feed, MediaPipe Pose and Canvas 2D rendering to generate an organic, non-anatomical avatar silhouette from the dancer's body landmarks in real time. The avatar form, rather than the dancer's own reflection, becomes the visual reference for movement.

Version 0.2 is a minimal research prototype for practice-led research. It adds a consent workflow, optional per-frame landmark logging, condition sequencing and a richer metadata export, while keeping the tool local-only with no server and no build step.

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
- Supports manual or randomised condition sequencing with start and end timestamps
- Allows opacity adjustment
- Allows the live camera feed to be shown or hidden
- Records a video clip as `.webm`, falling back to `.mp4` on browsers without WebM recording support such as Safari
- Optionally logs per-frame pose landmarks at a selectable sampling rate during recordings
- Exports a companion `.metadata.json` file for each recording, and a separate `.landmarks.json` file when logging is enabled
- Includes participant ID, condition label and session notes fields
- Surfaces clear on-screen errors for CDN load failure, denied camera permission, unsupported recording and missing pose detection
- Runs entirely in the browser

## How to use

Open the GitHub Pages URL on a phone browser, Safari or Chrome. Read the consent screen, tick the consent checkbox and tap **Start camera**. The Start button stays disabled until consent is given.

Controls in the top bar:

- **I / II / III / IV**: switch between avatar forms
- **camera**: toggle the live camera feed on or off while avatar tracking continues
- **rec**: record a video clip, downloaded as `.webm` (or `.mp4` on Safari) when stopped
- **opacity**: adjust how opaque the avatar appears

Research panel (bottom left):

- **Participant ID**: optional participant/session identifier
- **Condition label**: optional free-text label for the current task
- **Session notes**: optional notes saved into the metadata export
- **Landmark logging**: enable per-frame landmark capture and choose a sampling rate (5, 10, 15 or 30 fps). Settings are locked while a recording is running
- **Condition sequence**: choose manual or randomised order, then step through Avatar I to IV as conditions. The panel shows the current condition number, the next condition and how many remain

## Avatar forms

Four distinct forms are currently available. Each is designed to pull movement attention in a different direction.

| | Name | Form | Colour |
|---|---|---|---|
| **I** | Default | Balanced proportions, moderate organic wobble | Cream |
| **II** | Wisp | Tiny head, limbs 4x longer and very thin, near-static | Pale blue |
| **III** | Bubble | Head 4x size, wide jelly torso, very short legs, heavy wobble | Warm gold |
| **IV** | Split | Left side 2x longer and thicker, right side less than half | Dusty rose |

The avatar presets use different body transformation parameters, including:

- head scale
- torso width and height
- arm and leg scale
- arm and leg length
- organic wobble
- left/right asymmetry
- fill and stroke colour

These presets should be understood as movement-perception conditions, not character designs.

## Research workflow

A suggested session flow, described in more detail in [docs/research-protocol.md](docs/research-protocol.md):

1. Enter the participant ID before starting
2. Read the consent screen with the participant and confirm the checkbox together
3. Start a condition sequence (manual or randomised)
4. For each condition: enable landmark logging if needed, press **rec**, run the task, press **stop**, then advance with **next**
5. Move all downloaded files into the session folder for that participant

### Session naming

Recordings are named `avatar-ar-<sessionId>-<timestamp>` with matching `.metadata.json` and optional `.landmarks.json` files. The `sessionId` is a random UUID per recording, so the three files of one recording always share a base name. Use the participant ID field so recordings can be grouped afterwards; a folder convention such as `P001/2026-07-03/` works well.

### Data handling

All files are downloaded to the local device. Nothing is uploaded. Recorded movement data should still be treated as sensitive research material:

- move files off shared devices promptly and store them according to your ethics approval
- landmark logs contain body movement data that may be identifying in combination with other records
- participant IDs should be pseudonyms, with the key list stored separately

## Metadata export

Each recording exports a companion metadata JSON file with `schemaVersion` `0.2.0`. It includes:

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

## Error handling

The tool reports these situations in plain language on screen:

- MediaPipe failing to load from the CDN (with a reload button)
- camera permission denied, camera missing or camera in use by another app
- MediaRecorder not supported, so recording is unavailable
- no pose detected while the camera is running
- recording failing to start or erroring mid-recording

## Technical structure

The prototype is intentionally simple:

- single main HTML file
- lightweight GitHub Pages entry point
- inline CSS
- inline JavaScript
- MediaPipe Pose loaded from jsDelivr CDN
- Canvas 2D rendering
- MediaRecorder for browser-based video export
- metadata and landmark JSON exports generated in-browser
- no build step
- no server
- no database

This keeps the tool easy to deploy through GitHub Pages and easy to adapt during early research development.

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

## Planned development

Suggested next steps:

1. Counterbalanced or Latin square condition ordering across participants
2. Landmark logging outside of recordings, for observation-only sessions
3. Configurable consent text for different studies
4. Separate CSS and JavaScript into dedicated files once the prototype stabilises

## Privacy note

The tool runs in the browser. It does not upload camera footage, landmark data or metadata to a server. Recordings, metadata files and landmark logs are downloaded locally by the user, and the exported video contains only the avatar rendering, never the camera image.

Recorded movement data should still be treated as sensitive research material. Consent, storage and access should be managed appropriately before using this tool with participants. See [docs/research-protocol.md](docs/research-protocol.md).
