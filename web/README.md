# SmartPocketBuddy — Web (Marketing + Support)

Static pages for App Store Connect:
- **Marketing URL** → `https://yoursite.netlify.app` (index.html)
- **Support URL** → `https://yoursite.netlify.app/support.html`

## Deploy to Netlify

1. **Push the `web` folder** (or connect your repo — see below).

2. **Connect via Git (recommended)**
   - Go to [netlify.com](https://netlify.com) → Add new site → Import from Git
   - Connect your GitHub repo: `BTheCoderr/smartprobonopocketbuddy`
   - **Base directory:** `web`
   - **Build command:** leave empty (or `true`)
   - **Publish directory:** `.` (relative to base) or `web`
   - Deploy

3. **Or drag-and-drop**
   - Zip the contents of `web/` (index.html, support.html, netlify.toml)
   - Go to Netlify → Sites → Add new site → Deploy manually → drag the zip

4. **After deploy**, your URLs will be:
   - Marketing: `https://yoursitename.netlify.app`
   - Support: `https://yoursitename.netlify.app/support.html`

5. **Add to App Store Connect**
   - Support URL: `https://yoursitename.netlify.app/support.html` (required)
   - Marketing URL: `https://yoursitename.netlify.app` (optional)
