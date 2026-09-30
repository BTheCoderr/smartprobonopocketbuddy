# SmartProBono Pocket

<!-- repo-intro:start -->
**Project snapshot:** SmartProBono Pocket is a mobile legal-engagement companion designed to help users stay calm, share location with a trusted contact, follow de-escalation guidance, and optionally document stressful interactions.

**What it demonstrates:** Expo/React Native · TypeScript · device/location APIs · local history · App Store support site.
<!-- repo-intro:end -->

## Product structure

This repository contains both the mobile application and the supporting web presence used for marketing and App Store support.

- `SmartProBonoPocket/` — Expo mobile app
- `web-next/` — Next.js marketing and support pages
- `MARKETING.md` — App Store / launch messaging
- `NEXT_STEPS.md` — product follow-up work

## Core mobile flow

1. Configure a trusted emergency contact.
2. Activate Safety Mode for a supported scenario.
3. Share location information with the trusted contact.
4. Follow calm, step-by-step guidance.
5. Optionally record, save, share, or delete audio where lawful.
6. Review a local session summary/history.

## Stack

- Expo SDK 54
- React Native + TypeScript
- React Navigation
- AsyncStorage
- Expo location, contacts, audio, file-system, and sharing APIs
- Next.js support/marketing site

## Local setup

For the mobile app:

```bash
cd SmartProBonoPocket
npm install
npx expo start
```

For the support/marketing site:

```bash
cd web-next
npm install
npm run dev
```

Recording and privacy rules vary by jurisdiction; the product includes user-facing disclaimers and is designed as a support tool rather than a substitute for professional legal advice.
