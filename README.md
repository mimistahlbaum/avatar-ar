# Avatar AR

A browser-based AR tool for movement generation in dance practice.

Avatar AR uses a live camera feed, MediaPipe Pose and Canvas 2D rendering to generate an organic, non-anatomical avatar silhouette from the dancer's body landmarks in real time. The avatar form, rather than the dancer's own reflection, becomes the visual reference for movement.

The current version is a lightweight practice-based research prototype. It is intended to support experiments around avatar-mediated movement perception, embodied feedback, choreographic self-observation and movement decision-making.

## Live tool

GitHub Pages:

https://mimistahlbaum.github.io/avatar-ar

Direct file URL, also available:

https://mimistahlbaum.github.io/avatar-ar/avatar-ar.html

## What it does

- Opens the user's camera in the browser
- Tracks body position with MediaPipe Pose
- Draws an organic avatar overlay in real time
- Provides four avatar forms
- Allows opacity adjustment
- Allows the live camera feed to be shown or hidden
- Records a video clip as `.webm`
- Exports a companion `.metadata.json` file for each recording
- Includes participant ID, condition label and session notes fields
- Runs entirely in the browser

## How to use

Open the GitHub Pages URL on a phone browser, Safari or Chrome, tap **Start** and allow camera access.

Controls in the top bar:

- **I / II / III / IV**: switch between avatar forms
- **camera**: toggle the live camera feed on or off while avatar tracking continues
- **rec**: record a video clip, downloaded as `.webm` when stopped
- **opacity**: adjust how opaque the avatar appears

Research fields:

- **Participant ID**: optional participant/session identifier
- **Condition label**: optional label for the current avatar condition or task
- **Session notes**: optional notes saved into the metadata export

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

## Technical structure

The prototype is intentionally simple:

- single main HTML file
- lightweight GitHub Pages entry point
- inline CSS
- inline JavaScript
- MediaPipe Pose loaded from jsDelivr CDN
- Canvas 2D rendering
- MediaRecorder for browser-based video export
- metadata JSON export generated in-browser
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

- No full per-frame landmark logging yet
- No consent workflow
- Recording captures the canvas output only, not the original camera feed
- Browser support depends on camera permissions, MediaRecorder support and MediaPipe loading
- The `/avatar-ar` directory URL uses a small GitHub Pages wrapper around the main `avatar-ar.html` file

## Planned development

Suggested next steps:

1. Add optional per-frame landmark logging for research sessions
2. Add structured condition sequencing for avatar comparison tasks
3. Add a consent and participant workflow for research use
4. Separate CSS and JavaScript into dedicated files once the prototype stabilises
5. Add a short research protocol for practice-based PhD use

## Metadata export

Each recording exports a companion metadata JSON file. The current metadata includes:

```json
{
  "tool": "Avatar AR",
  "schemaVersion": "0.1.0",
  "sessionId": "...",
  "participantId": "...",
  "conditionLabel": "...",
  "sessionNotes": "...",
  "timestamp": "...",
  "startedAt": "...",
  "endedAt": "...",
  "durationMs": 0,
  "selectedAvatarIndex": 0,
  "selectedAvatar": {},
  "opacity": 0.75,
  "cameraVisible": true,
  "canvas": {
    "width": 0,
    "height": 0
  },
  "video": {
    "width": 0,
    "height": 0
  },
  "recording": {
    "videoFilename": "...",
    "mimeType": "video/webm",
    "frameRate": 30
  },
  "poseDetection": {
    "library": "MediaPipe Pose",
    "modelComplexity": 1,
    "smoothLandmarks": true,
    "enableSegmentation": false,
    "minDetectionConfidence": 0.5,
    "minTrackingConfidence": 0.5
  }
}
```

A later version may also export landmark data:

```json
{
  "frames": [
    {
      "t": 0,
      "landmarks": []
    }
  ]
}
```

## Privacy note

The current tool runs in the browser. It does not upload camera footage or landmark data to a server. Recordings and metadata files are downloaded locally by the user.

Recorded movement data should still be treated as sensitive research material. Consent, storage and access should be managed appropriately before using this tool with participants.
