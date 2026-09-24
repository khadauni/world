# Security & privacy

Wonderverse is built for children, so it is private and locked down by default.

## Data
- **No accounts, no servers, no analytics, no ads, no cookies.** The app makes no requests to any other origin (enforced by CSP and by an end-to-end test that fails on any third-party request).
- Explorer nicknames, progress, play time and settings live only in the browser's local storage, under one key. That data is **validated as untrusted input** on every load, so corrupted or tampered data can't crash or inject anything.
- Nicknames are sanitised: control, bidi and markup characters are stripped, and email, URL and phone-number patterns are removed (children sometimes type these into name boxes).
- Narration uses the device's built-in speech synthesis. The microphone, camera and location are never used, and are denied by `Permissions-Policy`.
- Grown-ups can delete one explorer or all data from the parent zone, which sits behind a parental gate.

## Browser hardening
- Strict **Content-Security-Policy**: `default-src 'self'`, no inline script or style, `object-src 'none'`, `base-uri 'self'`, `form-action 'none'`, `frame-ancestors 'none'`.
- **Trusted Types** (`require-trusted-types-for 'script'`) blocks DOM-XSS sinks. The only policy is `wonderverse`, and it allows exactly one URL, the service worker `./sw.js`.
- The headers `HSTS`, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `COOP` and `CORP` are shipped for Netlify/Cloudflare (`public/_headers`) and Vercel (`vercel.json`). The Vite dev and preview servers send the same set.
- Lint bans `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, direct `localStorage` and `fetch`.
- All 3D content is procedural. There are no remote models, textures, fonts or HDRs, so there is no third-party content surface.

## Supply chain
- A committed lockfile, `npm ci --ignore-scripts` in CI, `npm audit --omit=dev --audit-level=high` as a CI gate, and Dependabot for npm and GitHub Actions.

## Reporting
Please report vulnerabilities privately to the maintainers rather than in a public issue.
