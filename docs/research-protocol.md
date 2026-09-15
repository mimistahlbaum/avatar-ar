# Avatar AR research protocol (v0.3)

A short working protocol for using Avatar AR in practice-led research sessions. It assumes the tool is opened from GitHub Pages on a phone, tablet or laptop with a front camera.

This document supports session consistency. It does not replace ethics approval or a formal consent process for your institution.

Two protocol options exist from v0.3:

- **Legacy I–IV (default).** The four-condition protocol from v0.2. Body pose only. Sections 1 to 7 describe it and are unchanged in substance from v0.2
- **Extended I–V (hand-mediated).** The four legacy conditions plus Avatar V, which uses hand landmarks. This is a separate protocol option described in section 8. It is not mixed into a legacy session automatically, and a legacy session never has its number of conditions changed by the tool

The tool does not score movement under either option. Body and hand data shape the avatar and are logged for analysis. Nothing in the tool or its exports rates quality, correctness, technique, posture, flexibility or appearance.

## 1. Before the session

- Confirm ethics and consent requirements for your study are in place. If you plan to use the extended option, confirm your approval covers hand landmark capture as well as body landmarks
- Decide the protocol option: Legacy I–IV or Extended I–V. Do not switch options within one participant's session
- Decide the condition order policy: manual (you choose) or randomised (the tool shuffles the chosen set)
- Decide whether landmark logging is needed and at what sampling rate. 10 fps is a reasonable default; 30 fps only for short clips on capable devices
- Prepare a local folder per participant, for example `P001/2026-07-03/`
- Check the device has enough free storage for recordings
- Load the page once on the session device to confirm the CDN loads and the camera works. If using the extended option, also switch hand tracking on once to confirm the hands library loads on that device

## 2. Starting a session

1. Open the tool. Wait for pose detection to load
2. Enter the participant ID (use a pseudonym, not a name)
3. Optionally enter a condition label and session notes
4. Read the consent screen with the participant. The Start button stays disabled until the checkbox is ticked. The consent text now includes a paragraph on optional hand tracking; read it even for legacy sessions, since it describes what the tool can do
5. Tick the checkbox and press **Start camera**. Allow camera access when the browser asks

If the camera is denied or missing, the consent screen explains the problem. Fix permissions in the browser settings and reload.

## 3. Running conditions (Legacy I–IV)

1. In the research panel, leave the condition **set** on **Legacy I–IV**, choose **manual order** or **randomised order** and press **start**. The panel shows the current condition number, the next condition and how many remain
2. If logging landmarks, tick **Log landmarks** and choose a sampling rate before pressing rec. These controls lock during a recording
3. Press **rec** to start the recording for the condition
4. Run the movement task
5. Press **stop**. The video, metadata JSON and, if enabled, landmarks JSON download immediately
6. Press **next** to advance to the next condition. The avatar switches automatically and the condition change is timestamped
7. Repeat until the sequence reports complete

Notes:

- Manual avatar switches during a sequence are also timestamped in `conditionEvents`, marked with source `manual`, so unplanned changes remain visible in the data
- Leave hand tracking off for legacy sessions. The V button does not appear while hand tracking is off, so participants cannot reach Avatar V by accident
- The exported video contains only the avatar rendering. If you also need footage of the dancer, use a separate camera under its own consent arrangement
- Landmark logging stops at 20,000 frames per recording and the export is flagged `truncated`

## 4. Ending a session

1. End or complete the sequence
2. Move all downloaded files from the device's download folder into the participant's session folder
3. Verify each recording has its matching `.metadata.json` (and `.landmarks.json` and `.hands.json` where expected). Files from one recording share the same base name
4. Delete the files from shared or borrowed devices after transfer
5. Close the page. Nothing persists in the browser between sessions

## 5. File naming

Each recording produces up to four files with a shared base name:

```
avatar-ar-<sessionId>-<timestamp>.webm            (or .mp4 on Safari)
avatar-ar-<sessionId>-<timestamp>.metadata.json
avatar-ar-<sessionId>-<timestamp>.landmarks.json  (only when logging is enabled)
avatar-ar-<sessionId>-<timestamp>.hands.json      (only when logging and hand tracking are both enabled)
```

`sessionId` is a random UUID generated per recording. The participant ID lives inside the JSON files, not in the filename, so rename or folder the files by participant during transfer.

## 6. Data handling

- All data stays on the local device until you move it. The tool has no server and uploads nothing
- Treat recordings, landmark logs, hand landmark logs and metadata as sensitive research material. Movement data can be identifying in combination with other records
- Store the participant ID key list separately from the data
- Follow your institution's storage, retention and deletion requirements
- Metadata files carry `schemaVersion` `0.3.0`. Every field from `0.2.0` is still present, so analysis scripts written for v0.2 sessions keep working. New fields (`conditionSet`, `handTracking`, `landmarkLogging.handLandmarkFilename`) can be ignored by legacy scripts

## 7. Known limitations (both options)

- The in-tool consent screen records consent inside the metadata (`consent.givenAt`, statement version) but is not a signed consent form
- Randomisation is per-session shuffling, with no counterbalancing across participants. If you need a balanced design, use manual order and assign orders yourself
- Landmark logging only runs during recordings
- Tracking quality depends on lighting, framing and the device. The tool warns on screen when no pose is detected
- The page needs an internet connection at load time for the MediaPipe CDN; after loading, tracking runs locally

## 8. Extended hand-mediated option (I–V)

This option adds Avatar V "Bloom" as a fifth condition. Treat it as a different protocol, not a longer version of the legacy one:

- **Comparability.** A five-condition session differs from a four-condition session in duration, order effects and participant load. Do not pool extended sessions with legacy sessions as if they were the same design. If a comparison with legacy data is needed, plan it explicitly, for example by analysing conditions I to IV within extended sessions as a nested subset and reporting the difference in design
- **What Avatar V does.** At rest it has Avatar I proportions in a slate fill with a pale stroke. Each side of the body expands as that hand opens and contracts as it closes. Finger spread grows a radiating field around the wrist and a thin ring around the torso and head. Wrist rotation turns the field. If a hand is not detected, that side returns to neutral within about a second. Left-right asymmetry is therefore produced by the dancer's own hands, unlike Avatar IV where it is a fixed preset
- **What is recorded.** With landmark logging on, a `.hands.json` companion file holds raw hand landmarks (up to 21 points per hand) and derived features (openness, spread, wrist angle, size, left-right asymmetry) per sampled frame, plus the calibration constants used. The body `.landmarks.json` is unchanged. The metadata records the hand tracking configuration and the measured hand frame rate and inference time for that recording

### 8.1 Running the extended option

1. In the research panel, switch **Hand tracking** on. Wait for the status line to read "hand tracking on". The **V** button appears in the top bar. The default target rate is 15 fps; use 10 fps on slower phones
2. Optionally tick **Show hand landmarks** to confirm both hands are being tracked and assigned to the correct sides, then untick it before the task unless the study wants it visible
3. Set the condition **set** to **Extended I–V (hand)**. Selecting it switches hand tracking on if it was off
4. Choose manual or randomised order and press **start**. Avatar V is shuffled like any other condition in randomised order
5. Run each condition as in section 3. Keep hand tracking on for the whole sequence, including conditions I to IV, so that the hand log and hand metadata are consistent across the session
6. Before the Avatar V condition, tell the participant that this form responds to their hands as well as their body. Do not describe a target hand shape; the study is about perception of the mapping, not about producing a shape

### 8.2 Notes and cautions

- Hand tracking adds a second model to the device. Watch the body avatar for stutter. If the body frame rate drops, lower the hand rate to 10 fps or switch to a more capable device. The measured values in the metadata help you compare devices afterwards
- Side assignment uses the pose wrists. When a hand is far from its wrist landmark, for example arms crossed behind the back, the tool falls back to MediaPipe's handedness label, which may be mirrored on some devices. The method used is logged per hand
- The feature calibration constants are initial values. Before a study, run a short check with a fist and an open hand, fingers together and fanned, and confirm the derived values approach 0 and 1. Record any tuning in the session notes
- Low light and hands at the frame edge reduce hand detection before they reduce body detection. Avatar V then behaves like Avatar I with a slate palette. This is expected and is visible in the data as `handsDetected: 0` frames
- The extended option has been tested with a simulated MediaPipe in a desktop browser only. Complete the device checklist in the README before using it with participants

## 9. Known limitations of the extended option

- No Web Worker for hand inference (legacy MediaPipe build), so hands and body share the main thread
- Handedness mirror convention and feature calibration not yet verified on real devices
- Hand data is logged only during recordings, like body data
- Avatar V is one hand-mediated mapping. Other mappings are possible and would be separate conditions, not variants of V
