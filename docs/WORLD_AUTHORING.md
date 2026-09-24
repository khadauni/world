# Building a Wonderverse world

A world is a self-contained folder in `src/worlds/<world-id>/` whose `index.ts` default-exports a
`WorldModule` (see `src/core/types.ts`). The platform shell (`src/engine/WorldShell.tsx`) runs the same
learning loop for every world and draws all the 2D UI; a world supplies **content** + a **3D scene**
(+ optionally a DOM **overlay** for task controls).

```
intro → map → travel → explore → task → quiz → reward → map … → finale (badge)
```

## 1. The contract

```ts
export default {
  content,             // WorldContent — guide, intro, stops[], outro, badge
  canvas,              // WorldCanvasConfig — camera start, background colour, bloom
  Scene,               // rendered INSIDE the shared <Canvas> (R3F)
  Overlay,             // optional, rendered as DOM above the canvas
} satisfies WorldModule;
```

`Scene` and `Overlay` receive `WorldRuntimeProps`:

| prop | meaning |
| --- | --- |
| `band` | `'tiny'` (3–5, pre-readers) · `'junior'` (6–8) · `'senior'` (9–12) |
| `quality` | `{ tier, particleScale, detail, shadows, bloom, … }` — scale particle counts & segments by these |
| `reducedMotion` | snap cameras, skip shakes/flashes, keep ambient motion minimal |
| `phase` | current flow phase |
| `stopId` | the current stop during travel/explore/task/quiz/reward, else `null` |
| `task` | the active `StopTask` when `phase === 'task'` |
| `completedStops` | ids of finished stops (show them as "done" in the scene) |
| `explorer` | `{ name, avatar }` — avatar id, see `src/core/avatars.ts` (`avatarById(id).emoji`) |
| `actions` | `arrive()`, `selectStop(id)`, `taskProgress(done,total)`, `completeTask()`, `sfx(name)`, `say(text)` |

Rules for the flow:

* **travel** — animate the camera/ship to the stop, then call `actions.arrive()` **once**. The shell
  auto-arrives after 9 s as a safety net; with `reducedMotion` it arrives after 0.7 s, so snap instantly.
* **map / intro** — show all stops in 3D; tapping one may call `actions.selectStop(id)` (the shell ignores
  locked stops).
* **task** — the world owns the interaction. Report progress with `actions.taskProgress(done, total)`
  (≤ 8 renders dots, more renders a bar) and call `actions.completeTask()` when finished. Celebrate small
  wins with `actions.sfx('collect')` and short `actions.say(...)` lines.
* **quiz / reward / finale** — the shell shows modals; the canvas is paused (`frameloop="demand"`) while a
  quiz is open, so do not rely on `useFrame` running then.

The HUD reserves the **top ~150 px** (top bar + task banner) and, outside the task phase, the **bottom
~260 px** (guide bubble + stop track). During `task` the bottom area is free for your `Overlay` controls.
The overlay root has `pointer-events: none`; set `pointer-events: auto` on your own interactive elements.

## 2. Content rules

* Every user-facing string is `Tiered<string>` — either one string for all ages or
  `{ tiny, junior, senior }`. **Write genuinely different text per band**:
  * **tiny (3–5)**: 3–10 words per line, concrete, joyful, sensory ("The Sun is SO hot! Hot hot hot! 🔥").
    Everything is read aloud. Quiz choices must be **pictures** (emoji or colour) with ≤ 3 options.
  * **junior (6–8)**: 1–2 short sentences, one idea each, simple numbers ("Mars is red because of rusty dust").
  * **senior (9–12)**: real vocabulary + numbers + why/how ("Olympus Mons is ~22 km tall — about 2.5× Everest").
* `{name}` in any string is replaced with the explorer's nickname.
* **Accuracy is non-negotiable.** Only state facts you are confident are correct and current; prefer
  well-established figures (NASA / ISRO / standard physiology). Round sensibly and say "about".
* Quizzes: each question lists the `bands` that see it. Per stop, provide at least 2 tiny, 3 junior and
  4 senior questions (bands can share questions). `explain` teaches — kind, never scolding.
* `src/worlds/content.test.ts` enforces most of this — it must pass.

## 3. Look & feel — "animated film" style

Stylised, warm and toy-like rather than photoreal: rounded shapes, saturated but harmonious colour,
soft rim light, gentle bloom on emissive things, bouncy squash-and-stretch motion, cute faces where it
fits. Use the kit in `src/engine/kit`:

* `StudioLights` — key/rim/fill + procedural environment reflections (no HDR download).
* `Starfield`, `Glow`, `Tappable` (hover grow + press squash + enlarged hit area), `CameraRig`,
  `Label3D` (DOM name tags), GLSL `SIMPLEX_3D` / `FBM_3D` / `FRESNEL` snippets, `emojiTexture()`.
* Prefer `meshPhysicalMaterial` / `meshStandardMaterial` with clearcoat/sheen, or small custom
  `shaderMaterial`s for procedural surfaces. Emissive + `toneMapped={false}` for things that should glow.

## 4. Hard constraints (security, privacy, performance)

* **No network.** CSP is `default-src 'self'`. Never load remote files. **Banned**: drei `<Text>`/`<Text3D>`
  (fetch fonts), `<Environment preset/files>` (fetch HDRs), `useGLTF`/Draco/KTX loaders, `<Cloud>`/`<Clouds>`
  (fetch a texture), `useTexture` with URLs, `DetectGPU`, anything from a CDN. Build geometry and textures
  procedurally (geometry primitives, `LatheGeometry`, `TubeGeometry`, `ExtrudeGeometry`, shaders,
  `CanvasTexture`).
* No `eval`, `new Function`, `innerHTML`, `dangerouslySetInnerHTML`, `localStorage` (the store handles
  persistence), `fetch`.
* Performance budget: ~60 fps on a mid-range tablet at `quality.tier === 'medium'`.
  * Multiply particle/instance counts by `quality.particleScale`, segments by `quality.detail`.
  * Use `instancedMesh`/`points` for crowds (asteroids, blood cells, dust). Keep draw calls < ~150.
  * **Never allocate in `useFrame`** (reuse `Vector3`s via `useMemo`/module constants) and never call
    React `setState` per frame — mutate refs.
  * Memoise geometries/materials; R3F disposes on unmount.
  * Only cast shadows when `quality.shadows`.
* Accessibility: every task must be completable with simple taps/clicks (drag is optional sugar — always
  offer a tap alternative), and the shell's "Help me → Skip" path must keep working. Honour
  `reducedMotion`. Never rely on colour alone for meaning.

## 5. Checklist before you ship a world

- [ ] `npm run lint && npm run typecheck && npx vitest run` pass
- [ ] Every stop looks great at 1280×800 and at 768×1024 (screenshots)
- [ ] Every task works for tiny/junior/senior (difficulty adapts)
- [ ] No console errors, no requests to other origins
