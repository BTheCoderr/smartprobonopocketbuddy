# Catching Up — SmartPocketBuddy

Use this when resuming work or handing off. Last updated: Feb 18, 2026.

---

## Project Location

```
/Users/baheemferrell/Desktop/smartprobonopocketbuddy/SmartProBonoPocket
```

**GitHub:** `https://github.com/BTheCoderr/smartprobonopocketbuddy` (connect with `git remote add origin` when ready)

---

## Quick Start

```bash
cd /Users/baheemferrell/Desktop/smartprobonopocketbuddy/SmartProBonoPocket
npx expo start --lan
```

Scan QR code with Expo Go. Use `--clear` if assets or native modules misbehave.

---

## What’s Built (MVP Checklist ✓)

| # | Feature | Status |
|---|---------|--------|
| 1 | **One-tap Safety Mode** — Big button, 2 taps (Start → Confirm), no login | ✅ |
| 2 | **Emergency Contact + Auto Location** — GPS, map link, SMS: *"I'm in Safety Mode. My location: [link]. Please stay available."* | ✅ |
| 3 | **Automatic Recording** — Toggle in Settings, auto-start in Safety Mode, subtle dot + timer, save locally, Share/Done | ✅ |
| 4 | **De-escalation Guidance** — Checklist (Hands visible, Speak slowly, etc.) + script: *"Officer, I want to cooperate. My license and registration are [location]. May I reach for them?"* | ✅ |
| 5 | **Event History** — Last 10 events, time, location link, Share recording; stored locally, no cloud | ✅ |

---

## Navigation

- **Bottom Tabs:** Home | Record | History | Settings
- **Stack Screens:** SetupContact, Active (Safety Mode), Recording (standalone)
- **Flow:** Home → Safety Mode → Confirm → Active (checklist + recording) → End → Share/Done → History

---

## Key Files

| Purpose | Path |
|---------|------|
| App entry | `App.tsx` |
| Navigation | `src/navigation/RootNavigator.tsx`, `TabNavigator.tsx` |
| Screens | `src/screens/HomeScreen.tsx`, `ActiveScreen.tsx`, `RecordingScreen.tsx`, `HistoryScreen.tsx`, `SettingsScreen.tsx`, `SetupContactScreen.tsx` |
| Theme | `src/theme/colors.ts` |
| Storage | `src/storage/settingsStorage.ts`, `contactStorage.ts`, `recordingStorage.ts`, `eventStorage.ts` |
| Components | `src/components/Button.tsx`, `Card.tsx` |
| Logo | `src/assets/logo.png`, `assets/logo.png` |

---

## Brand / Design

- **Primary:** Deep navy `#0F2B46`
- **Accent:** Teal `#3FAE9D`
- **Background:** Soft off-white `#F7F9FB`
- **Corners:** 16–20px
- **Tone:** Calm, institutional

---

## Known Issues & Fixes

1. **NativeSharedObjectNotFoundException** — Addressed with defensive `try/catch` around recorder in `ActiveScreen` and `RecordingScreen`. If it recurs, fully restart Expo Go.
2. **AsyncStorage / asset resolve errors** — Use `npx expo start --lan --clear`. Logo is at `assets/logo.png` and `src/assets/logo.png`.

---

## Not Yet Built

- Paperwork mode
- Eviction flow
- Chat AI
- Legal database
- Siri Shortcuts (requires full app build, not Expo Go)

---

## Commands

```bash
# Start dev server
npx expo start --lan

# Start with cache clear
npx expo start --lan --clear

# Connect to GitHub
git remote add origin https://github.com/BTheCoderr/smartprobonopocketbuddy.git
git add .
git commit -m "Initial commit - SmartPocketBuddy app"
git push -u origin main
```
