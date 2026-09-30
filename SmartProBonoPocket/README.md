# SmartProBono Mobile

This directory contains the shipped Expo / React Native app behind **SmartProBono**, the public App Store product.

**App Store:** https://apps.apple.com/us/app/smartprobono/id6759347017

## Current product

SmartProBono is a local-first personal safety companion built around fast, understandable actions during stressful moments.

### Built flows

- guided onboarding
- primary emergency contact + trusted circle
- Safety Mode
- Travel Mode
- Kid Track sessions
- Family Hub
- Kid Track schedule prompts while the app is open
- optional audio/video recording
- calm guidance
- automatic location capture
- local session persistence/recovery
- local event history
- share/delete recording controls
- settings and permissions
- read-only Health Check diagnostics
- light/dark system theme support

## Navigation

**Gate / setup**
- Gate
- Onboarding

**Main tabs**
- Home
- Record
- History
- Settings

**Stack flows**
- Family Hub
- Emergency Contact / Trusted Circle
- Kid Schedule
- Active session
- Health Check

## Architecture

The app intentionally uses local device storage for core user state rather than a hosted account/database layer.

Key storage modules include:

- `contactStorage.ts`
- `eventStorage.ts`
- `recordingStorage.ts`
- `settingsStorage.ts`
- `kidScheduleStorage.ts`
- `liveSessionStorage.ts`

The active-session runtime separates in-memory session state from persisted recovery state so interrupted sessions can be handled more safely.

## Stack

- Expo SDK 54
- React Native 0.81
- React 19
- TypeScript
- React Navigation
- AsyncStorage
- Expo Location / Contacts / Audio / Camera / File System / Sharing
- EAS Build / Submit / Updates

## Setup

```bash
npm install
npx expo start
```

Useful variants:

```bash
npm run start:clear
npm run ios
npm run android
npm run tunnel
```

## Release

`eas.json` includes development, preview, and production build profiles. Production uses remote app-version management and auto-incrementing builds.

Before submitting a new build:

1. run the full onboarding flow on a physical device
2. test Safety, Travel, and Kid Track sessions
3. verify contact/location/recording permissions from clean install
4. test session recovery after app interruption
5. test History share/delete behavior
6. test Family Hub and Kid Schedule
7. verify support/privacy links used by the store listing

## Scope

SmartProBono is a support/documentation product, not emergency dispatch and not individualized legal advice.

Recording laws vary by jurisdiction. Users are responsible for complying with applicable law.
