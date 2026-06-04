# Avatar AR

A browser-based AR tool for movement generation in dance practice.

## What it does

Uses your phone camera to detect your body position and overlays an organic, non-anatomical avatar silhouette in real time. The avatar form — rather than your own reflection — becomes the visual reference for movement.

Inspired by research into how avatar body form shapes movement decision-making in choreographic practice.

## How to use

Open the URL on your phone browser (Safari or Chrome), tap **Start**, and allow camera access.

Controls in the top bar:
- **camera** — toggle your camera feed on or off (avatar tracking continues either way)
- **opacity** — adjust how opaque the avatar appears

## Current avatar

A single organic humanoid silhouette: rounded, joint-free, non-anatomical. Each body segment is a soft blob shape that follows your movement.

## Tech

- [MediaPipe Pose](https://google.github.io/mediapipe/solutions/pose) — real-time body tracking in the browser
- Canvas 2D rendering
- No installation required — runs entirely in the browser

## Planned

- Additional avatar forms (non-humanoid)
- Avatar switching during a session
