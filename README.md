# 🌌 Wonderverse

**Step inside learning.** Wonderverse is a platform of immersive, animated 3D worlds where children aged
**3–12** learn by exploring. They fly an astronaut's rocket through the Solar System, launch and land
ISRO's **Chandrayaan‑3** on the Moon, and shrink down to take apart a beating **human heart**. Every world
adapts its words, tasks and quizzes to the child's age.

| World | What kids do |
| --- | --- |
| 🪐 **Solar System Voyage** | Pilot a rocket (with their own avatar in the window) to all 8 planets and the Sun: collect solar sparks, find Jupiter's moons, fly through Saturn's rings, tilt Uranus… |
| 🌙 **Chandrayaan Moon Mission** | Launch the LVM3, boost the orbit, separate Vikram, land it near the lunar south pole, drive Pragyan and zap rocks for sulphur, then tuck them in for the lunar night. |
| ❤️ **Inside the Human Heart** | Find the heart, tap along to lub‑dub, explore the four chambers, **pull every part out to see what happens** and rebuild it, fix leaky valves, ride a red blood cell through the lungs. |

## How it feels

- **Made for each age.** Every line of content has three voices: *Little Explorer* (3–5, voice‑led, picture answers, big buttons), *Junior Explorer* (6–8) and *Senior Explorer* (9–12, real science and numbers). Tasks get more targets or more precision as kids grow.
- **A friend who talks.** A guide character narrates everything aloud (on‑device speech), with captions and replay. Pre‑readers can play without reading a word.
- **Kind by design.** Wrong answers get a gentle nudge and another go, and the littlest explorers get the answer highlighted. Every task has a *Help me → Skip* path, so no child gets stuck.
- **Stars, badges and a certificate** with the child's name when they master a world.
- **Grown‑ups zone** behind a parental gate: per‑child progress, 7‑day play time, break reminders, graphics quality, reduced motion, voice speed, delete data.

## The learning loop

Every world runs the same loop inside a shared shell:

```
intro → map → travel → explore (narration + facts) → hands-on task → quiz → reward → … → finale badge
```

Worlds only provide **content** (age‑tiered text and quizzes) and a **3D scene**. Everything else (HUD, narration, quizzes, rewards, progress, accessibility) is shared. Adding a world means adding one folder: see [`docs/WORLD_AUTHORING.md`](docs/WORLD_AUTHORING.md).

## Tech

- React 19 + TypeScript (strict), Vite 8, three.js via React Three Fiber and drei
- All 3D is procedural (geometry and GLSL shaders), so there are no model or texture downloads
- Zustand for state. Motion (LazyMotion) for UI animation. The design system uses CSS modules and tokens.

### Performance
- The home screen loads about 115 KB gzipped. three.js and each world are code‑split and fetched only when a world opens, prefetched when a child hovers or focuses its card.
- Quality tiers (auto‑detected, overridable by parents) scale resolution, particles, geometry detail, shadows and bloom. `PerformanceMonitor` adapts resolution to the frame rate in real time.
- The canvas pauses under quiz modals. Particles are instanced, and nothing is allocated per frame.
- Offline after the first visit (service worker), with long‑lived caching for hashed assets.

### Security & privacy
No accounts, servers, cookies, analytics or third‑party requests. The app runs under a strict CSP with Trusted Types. Local data is validated on load. Full details in [SECURITY.md](SECURITY.md).

### Accessibility
Keyboard‑navigable UI with visible focus, screen‑reader labels, narration captions, reduced‑motion support (OS or parent setting), large touch targets (64 px for ages 3–5), and meaning never carried by colour alone.

## Develop

```bash
npm install
npm run dev          # http://localhost:5173
npm run check        # lint + typecheck + unit tests + production build
npm run e2e          # Playwright end-to-end (builds + previews)
```

Deploy `dist/` to any static host. The security headers are ready for Netlify/Cloudflare Pages (`public/_headers`) and Vercel (`vercel.json`). Hash routing means no rewrite rules are needed.

## Project layout

```
src/
  app/        routes + screens (welcome/onboarding, hub, world loader, grown-ups zone)
  core/       types, age tiers, quiz engine, validated local store, speech + sound, quality tiers
  engine/     WorldShell (learning loop + HUD), shared Canvas, 3D kit (lights, stars, glow, tappable, camera rig)
  ui/         design system (buttons, guide character, modal, stars, confetti, world art)
  worlds/     one folder per world + registry + content quality gate
e2e/          Playwright journeys and screenshots
```
