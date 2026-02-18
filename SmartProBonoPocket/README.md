# SmartPocketBuddy

A calm legal engagement companion that helps users de-escalate and document interactions during police or legal situations.

**Positioning:** AAA for legal situations. NOT anti-law-enforcement. Calm guidance and optional documentation tools.

**Business model:** $2.99 one-time purchase for core features.

## Setup

```bash
npm install
npx expo start
```

Then scan the QR code with Expo Go or press `i` for iOS / `a` for Android.

## MVP Features

1. **One-tap Safety Mode**
2. **Emergency Contact** (1 required, 1 optional)
3. **Auto drop pin + SMS** — "I'm in Safety Mode. I've been [scenario]. My location: [link]"
4. **De-escalation guidance** — Calm checklist + cooperation script
5. **Audio recording** — Start/Stop, then Save / Share / Delete. Stored via expo-file-system.

## Flow

1. **Home** → Set Emergency Contact (required) → Safety history
2. **Safety Mode** → Select scenario → **Confirm & Activate** → Start
3. **Safety Mode Active** → Auto location + SMS → **Start Recording** or **Guidance**
4. **Guidance** → Checklist + script + step-by-step tips → Record link
5. **Recording** → Start → Stop → Save / Share / Delete (with state law disclaimer)
6. **Summary** → Time, scenario, location link, recording if saved
7. **History** → Last 10 events, tap location to open in maps

## Tech Stack

- Expo SDK 54
- TypeScript
- React Navigation
- AsyncStorage
- expo-location, expo-contacts, expo-audio, expo-file-system, expo-sharing

## Disclaimer

Recording laws vary by state. Users are responsible for complying with local laws.
