# SmartProBono Pocket — Next Steps

## Immediate: Add Your Logo

**Replace the placeholder logo** with your actual SmartProBono logo:

1. Add your logo file to: `SmartProBonoPocket/assets/logo.png`
2. Recommended: 144×144 px or 288×288 px (2x) for sharp display
3. Use a transparent or light-background version for the home screen
4. Optionally update `app.json` icon/splash to match your brand

The home screen is set up to show the logo with "SmartProBono Pocket" and the teaser line that eases users into the full app.

---

## Roadmap (from your blueprint)

### Day 3 — Polish + test
- [ ] Replace `assets/logo.png` with real SmartProBono logo
- [ ] Update `app.json` icon + splash to match brand
- [ ] Test full Safety Mode flow on device (location, SMS, guidance)
- [ ] Record 30-second demo (use script in `MARKETING.md`)
- [ ] Test dark mode
- [ ] Test with/without emergency contact set

### Day 4 — Deploy
- [ ] Run `eas build` (Expo Application Services) for iOS/Android
- [ ] Submit to TestFlight (iOS) / internal testing (Android)
- [ ] Invite small pilot group (5–10 people)
- [ ] Collect feedback: Did it help you stay calm? Would you use it again?

### Phase 2 — Paperwork Mode (after wedge proves out)
- DMV checklist
- Real ID checklist
- Appointment prep
- Document checklist + reminders

### Phase 3 — Legal workflow navigator
- Eviction, traffic court, benefits denial, IRS, jury duty
- Stages, deadlines, document generation

---

## Quick commands

```bash
cd SmartProBonoPocket
npm install
npx expo start          # Dev server
npx expo export         # Verify build
npx eas build --platform ios     # Production build (requires EAS setup)
```

---

## App Store / TestFlight notes

- Use the description in `MARKETING.md` (non-inflammatory)
- Screenshot the home screen with your real logo
- Demo video: follow the 30-second script in `MARKETING.md`
