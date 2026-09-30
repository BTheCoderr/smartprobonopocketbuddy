# SmartProBono Architecture

## Product surfaces

```text
iPhone / iPad
Expo + React Native
      │
      ├── local session runtime
      ├── AsyncStorage / local files
      ├── Location / Contacts
      ├── Audio / Camera
      └── platform share / SMS flows

web-next/
Next.js support + privacy + marketing site
```

## Mobile

`SmartProBonoPocket/` contains the primary shipped app. It uses React Native / Expo, React Navigation, AsyncStorage, location, contacts, audio, camera, file-system, and sharing APIs.

## Data model

The app is intentionally local-first. Sensitive safety-session data remains on-device unless the user explicitly shares it using platform flows.

## Active-session runtime

Session services coordinate Safety, Travel, and Kid Track flows, persist live state for recovery, and write finished sessions into local history.

## Permissions

Location, contacts, microphone, and camera are requested for specific user-facing functions. Permission copy and fallback behavior are part of the safety model and should be treated as product-critical.

## Web

`web-next/` contains the current support/marketing/legal surface. The older `web/` directory remains historical/supporting work.

## Release boundary

GitHub code, EAS builds, App Store submissions, and Netlify publishing are separate release stages.
