# Avatar AR research protocol (v0.2)

A short working protocol for using Avatar AR in practice-led research sessions. It assumes the tool is opened from GitHub Pages on a phone, tablet or laptop with a front camera.

This document supports session consistency. It does not replace ethics approval or a formal consent process for your institution.

## 1. Before the session

- Confirm ethics and consent requirements for your study are in place
- Decide the condition order policy: manual (you choose) or randomised (the tool shuffles I to IV)
- Decide whether landmark logging is needed and at what sampling rate. 10 fps is a reasonable default; 30 fps only for short clips on capable devices
- Prepare a local folder per participant, for example `P001/2026-07-03/`
- Check the device has enough free storage for recordings
- Load the page once on the session device to confirm the CDN loads and the camera works

## 2. Starting a session

1. Open the tool. Wait for pose detection to load
2. Enter the participant ID (use a pseudonym, not a name)
3. Optionally enter a condition label and session notes
4. Read the consent screen with the participant. The Start button stays disabled until the checkbox is ticked
5. Tick the checkbox and press **Start camera**. Allow camera access when the browser asks

If the camera is denied or missing, the consent screen explains the problem. Fix permissions in the browser settings and reload.

## 3. Running conditions

1. In the research panel, choose **manual order** or **randomised order** and press **start**. The panel shows the current condition number, the next condition and how many remain
2. If logging landmarks, tick **Log landmarks** and choose a sampling rate before pressing rec. These controls lock during a recording
3. Press **rec** to start the recording for the condition
4. Run the movement task
5. Press **stop**. The video, metadata JSON and, if enabled, landmarks JSON download immediately
6. Press **next** to advance to the next condition. The avatar switches automatically and the condition change is timestamped
7. Repeat until the sequence reports complete

Notes:

- Manual avatar switches during a sequence are also timestamped in `conditionEvents`, marked with source `manual`, so unplanned changes remain visible in the data
- The exported video contains only the avatar rendering. If you also need footage of the dancer, use a separate camera under its own consent arrangement
- Landmark logging stops at 20,000 frames per recording and the export is flagged `truncated`

## 4. Ending a session

1. End or complete the sequence
2. Move all downloaded files from the device's download folder into the participant's session folder
3. Verify each recording has its matching `.metadata.json` (and `.landmarks.json` where expected). Files from one recording share the same base name
4. Delete the files from shared or borrowed devices after transfer
5. Close the page. Nothing persists in the browser between sessions

## 5. File naming

Each recording produces up to three files with a shared base name:

```
avatar-ar-<sessionId>-<timestamp>.webm            (or .mp4 on Safari)
avatar-ar-<sessionId>-<timestamp>.metadata.json
avatar-ar-<sessionId>-<timestamp>.landmarks.json  (only when logging is enabled)
```

`sessionId` is a random UUID generated per recording. The participant ID lives inside the JSON files, not in the filename, so rename or folder the files by participant during transfer.

## 6. Data handling

- All data stays on the local device until you move it. The tool has no server and uploads nothing
- Treat recordings, landmark logs and metadata as sensitive research material. Movement data can be identifying in combination with other records
- Store the participant ID key list separately from the data
- Follow your institution's storage, retention and deletion requirements

## 7. Known limitations of v0.2

- The in-tool consent screen records consent inside the metadata (`consent.givenAt`, statement version) but is not a signed consent form
- Randomisation is per-session shuffling, with no counterbalancing across participants. If you need a balanced design, use manual order and assign orders yourself
- Landmark logging only runs during recordings
- Tracking quality depends on lighting, framing and the device. The tool warns on screen when no pose is detected
- The page needs an internet connection at load time for the MediaPipe CDN; after loading, tracking runs locally
