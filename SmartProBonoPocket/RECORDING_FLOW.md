# SmartPocketBuddy Recording Flow – Quick Reference

## Where Recordings Are Saved

- **File location:** `FileSystem.documentDirectory` (iOS: app's Documents folder)
- **Format:** `.m4a` (e.g., `recording_1739927400000.m4a`)
- **Metadata:** Stored in AsyncStorage under `@smartpocketbuddy_recordings`
- **Access:** Recordings show up in the app under **History** → tap an event → "Share recording"

## Two Recording Modes

### 1. Record Tab (manual start/stop)

| Step | What happens |
|------|--------------|
| 1 | Tap **Start Recording** → mic turns on |
| 2 | Timer runs while recording |
| 3 | Tap **Stop** → modal appears |
| 4 | Choose: **Save (local)**, **Share to emergency contact**, **Share**, or **Delete** |

- **Save (local)** → copies file into Documents, adds to History
- **Share** → opens system share sheet (Messages, Mail, etc.)

### 2. Safety Mode (from Home – auto start)

| Step | What happens |
|------|--------------|
| 1 | Tap **Safety Mode** → confirmation sheet |
| 2 | Tap **Start** → GPS → navigate to Safety Mode screen → SMS opens with location |
| 3 | Recording starts automatically when the screen loads |
| 4 | Timer runs; follow on-screen guidance |
| 5 | Tap **End Safety Mode** → recording is saved automatically to Documents |

- No modal. Recording is saved when you tap **End Safety Mode**
- Event (and recording link) appears in **History**

## Fixing the "Identifier already declared" Error

If you see: `Identifier 'isRecording' has already been declared`:

1. Stop the Expo server (Ctrl+C)
2. Restart with cache cleared:
   ```bash
   npx expo start --clear
   ```
3. Reload the app (press `r` in terminal or shake device → Reload)
