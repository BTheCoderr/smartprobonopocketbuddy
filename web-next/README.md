# SmartProBono Support + Marketing Site

This Next.js app provides the public support/legal/marketing surface for the **SmartProBono** mobile application.

## Routes

The app includes public pages for:

- general product/support content
- SmartProBono / Pocket Buddy product information
- privacy
- support
- marketing
- Pocket Buddy legal/privacy/terms routes used by the deployed static site

## Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- static export
- Netlify configuration at the repository root

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

The repository-level `netlify.toml` uses this directory as the Netlify build base and publishes the static export.

Do not trigger a production deployment just to test README/documentation changes.
