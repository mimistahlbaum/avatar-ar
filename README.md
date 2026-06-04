# Avatar AR

A browser-based AR tool for movement generation in dance practice.

## What it does

Uses your phone camera to detect your body position and overlays an organic, non-anatomical avatar silhouette in real time. The avatar form — rather than your own reflection — becomes the visual reference for movement.

Inspired by research into how avatar body form shapes movement decision-making in choreographic practice.

## How to use

Open the URL on your phone browser (Safari or Chrome), tap **Start**, and allow camera access.

Controls in the top bar:
- **I / II / III / IV** — switch between avatar forms
- **camera** — toggle your camera feed on or off (avatar tracking continues either way)
- **rec** — record a video clip (downloads as .webm when stopped)
- **opacity** — adjust how opaque the avatar appears

## Avatars

Four distinct forms, each designed to pull movement in a different direction:

| | Name | Form | Colour |
|---|---|---|---|
| **I** | Default | Balanced proportions, moderate organic wobble | Cream |
| **II** | Wisp | Tiny head, limbs 4× longer and very thin, near-static | Pale blue |
| **III** | Bubble | Head 4× size, wide jelly torso, very short legs, heavy wobble | Warm gold |
| **IV** | Split | Left side 2× longer and thicker, right side less than half | Dusty rose |

## Tech

- [MediaPipe Pose](https://google.github.io/mediapipe/solutions/pose) — real-time body tracking in the browser
- Canvas 2D rendering
- No installation required — runs entirely in the browser
