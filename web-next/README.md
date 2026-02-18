# SmartPocketBuddy Web (Next.js)

Three pages for App Store Connect & marketing:

- **`/`** — App info, features, and "Get on App Store" link
- **`/support`** — Support URL for App Store Connect (FAQ, setup, contact)
- **`/marketing`** — Marketing URL for App Store Connect

## Run locally

```bash
npm run dev
```

## Build

```bash
npm run build
```

Static output goes to `out/`.

## Deploy to Netlify

1. In Netlify: **Site settings** → **Build & deploy**
2. **Base directory:** `web-next`
3. **Build command:** `npm run build`
4. **Publish directory:** `web-next/out`

Or connect your repo and Netlify will use the `netlify.toml` in `web-next`.

## Update App Store link

Edit `src/lib/constants.ts` and set `APP_STORE_URL` to your App Store listing once the app is approved.
