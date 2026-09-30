# SmartProBono — Next Release Priorities

SmartProBono has moved beyond the original Pocket Buddy MVP and is already publicly shipped on the Apple App Store.

The next work should focus on **release quality and product clarity**, not rebuilding the original MVP.

## Priority 1 — Verify current main as one complete release

The current repository includes flows that go beyond the original App Store launch, including Family Hub, Kid Track scheduling, session persistence/recovery, and Health Check diagnostics.

Before the next store submission:

- [ ] clean-install test on a physical iPhone
- [ ] complete onboarding from zero state
- [ ] verify primary + additional trusted contacts
- [ ] verify Safety Mode
- [ ] verify Travel Mode
- [ ] verify Kid Track
- [ ] verify Family Hub
- [ ] verify Kid Track schedule prompt behavior
- [ ] test audio-only, video, and disabled-recording paths
- [ ] verify location-denied and microphone/camera-denied states
- [ ] interrupt/relaunch an active session and verify recovery behavior
- [ ] verify event history, naming, sharing, and deletion
- [ ] test light/dark mode and larger text sizes

## Priority 2 — Add automated coverage around the risky parts

The mobile package currently does not expose a dedicated automated test script.

Best first test targets:

- [ ] session lifecycle transitions
- [ ] stale-session recovery
- [ ] event history persistence
- [ ] contact storage validation
- [ ] Kid Schedule validation
- [ ] recording preference/disclosure state
- [ ] failure behavior when permissions are denied

## Priority 3 — App Store presentation

The product is now **SmartProBono**, while older repo/internal language still includes Pocket Buddy.

For the next App Store update:

- [ ] keep public naming consistently **SmartProBono**
- [ ] refresh screenshots to show current Safety + Travel + Family/Kid features
- [ ] update What's New from the actual release diff
- [ ] complete Apple's accessibility-feature declarations after an accessibility pass
- [ ] verify privacy/support URLs
- [ ] verify current App Store description matches the shipped feature set

## Priority 4 — Product boundary

Keep the mobile app focused on **personal safety, documentation, trusted contacts, and session history**.

Older roadmap ideas such as DMV paperwork, eviction flows, court workflows, and broad legal navigation belong in the larger SmartProBono platform unless there is a strong reason to pull a focused feature into mobile.

That separation keeps the app understandable:

**SmartProBono mobile = safety companion**

**SmartProBono platform = broader Learn → Prepare → Connect legal/IP workflows**

## Release commands

```bash
cd SmartProBonoPocket
npm install
npx expo start

# production build when intentionally releasing
npx eas build --platform ios --profile production
npx eas submit --platform ios --profile production
```

Do not run production build/submit commands just to verify documentation or local code.
