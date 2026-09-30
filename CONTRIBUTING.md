# Contributing to SmartProBono

SmartProBono is a shipped local-first iOS safety companion. It helps users document important moments, share selected information with trusted contacts, and follow calm structured guidance.

## Mobile checks

```bash
cd SmartProBonoPocket
npm ci
npx tsc --noEmit
```

## Support-site checks

```bash
cd web-next
npm ci
npm run build
```

## Privacy and safety

Never commit real user contacts, precise location history, recordings, personal session details, credentials, or private device artifacts.

Recording and location features require special care: preserve user-facing disclosures, explicit user control, and local-first defaults.

## Scope

SmartProBono is not emergency dispatch, a substitute for emergency services, a lawyer, or individualized legal advice.

## Deployment

GitHub merge, EAS/App Store release, and Netlify publication are separate release steps.
