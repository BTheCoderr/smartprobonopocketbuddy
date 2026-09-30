# SmartProBono Mobile — Current Handoff

Use this file when resuming mobile work.

## Product status

**SmartProBono is shipped on the Apple App Store.**

App Store:
https://apps.apple.com/us/app/smartprobono/id6759347017

The public product name is **SmartProBono**. The repository/directory still contains older **Pocket Buddy / SmartPocketBuddy** naming from the original MVP.

## Current app structure

### Main tabs
- Home
- Record
- History
- Settings

### Stack flows
- Gate
- Onboarding
- Family Hub
- Emergency Contact / Trusted Circle
- Kid Schedule
- Active Safety / Travel / Kid Track session
- Health Check

## Current capabilities

- guided onboarding
- trusted emergency contact + additional trusted contacts
- Safety Mode
- Travel Mode
- Kid Track
- local route/session persistence
- optional audio/video recording
- calm guidance
- local history
- Family Hub
- Kid Track in-app scheduling prompts
- read-only diagnostics
- system light/dark theme
- EAS production build/update configuration

## Architecture

Core state remains local-first.

| Purpose | Path |
| --- | --- |
| App entry | `App.tsx` |
| Root navigation | `src/navigation/RootNavigator.tsx` |
| Main tabs | `src/navigation/TabNavigator.tsx` |
| Screens | `src/screens/` |
| Session runtime | `src/services/liveSessionRuntime.ts` |
| Session orchestration | `src/services/sessionService.ts` |
| Contacts | `src/storage/contactStorage.ts` |
| Events/history | `src/storage/eventStorage.ts` |
| Recordings | `src/storage/recordingStorage.ts` |
| Settings | `src/storage/settingsStorage.ts` |
| Kid schedule | `src/storage/kidScheduleStorage.ts` |
| Persisted live session | `src/storage/liveSessionStorage.ts` |
| App config | `app.json` |
| EAS profiles | `eas.json` |

## Resume commands

```bash
npm install
npx expo start
```

For a cache reset:

```bash
npm run start:clear
```

## Next release focus

Do not rebuild the MVP.

Focus on:

1. physical-device regression across Safety, Travel, and Kid Track
2. session interruption/recovery
3. permission-denied behavior
4. Family Hub/Kid Schedule polish
5. automated tests around storage/session lifecycle
6. accessibility pass
7. current App Store screenshots + release notes

See the repository-level `NEXT_STEPS.md` for the current release checklist.
