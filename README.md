# GoldenFace — Facial Proportion Analyzer

GoldenFace measures facial proportions from a photo **entirely in your browser** and shows how they relate to the
golden ratio (φ ≈ 1.618) — as a piece of geometry, not as a judgement of people.

- Upload a photo (JPG / PNG / WebP) or take one with the front or rear camera.
- A face-landmark model ([MediaPipe Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker))
  finds 478 points on the face, on your device.
- GoldenFace computes ratios, vertical thirds and left–right symmetry, draws them on the photo and explains every
  formula.
- **Nothing is uploaded or stored.** There is no back end.

> **The golden ratio is one geometric reference, not a standard of beauty.** GoldenFace never produces a "beauty
> score", never ranks faces and never identifies anyone. The only percentage it shows is the _geometric similarity of
> one ratio to φ_, and only for ratios that have a recognised golden-ratio claim.

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Scripts](#scripts)
- [How the analysis works](#how-the-analysis-works)
- [Architecture](#architecture)
- [Privacy](#privacy)
- [Languages](#languages)
- [Deploying](#deploying)
- [Testing](#testing)
- [Limitations](#limitations)

## Features

| Area         | What you get                                                                                                                                                                                                                                              |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home         | Hero, how-it-works, explanation of φ and its limits, privacy statement, footer with privacy + terms.                                                                                                                                                      |
| Upload       | File picker or drag & drop, type + size + real-content (magic byte) validation, preview, rotate, crop (pointer **and** keyboard), EXIF-aware decoding.                                                                                                    |
| Camera       | `getUserMedia` with front/rear switching, live preview with face guide, capture / retake / use. Handles denied, missing, busy and unsupported cameras and non-HTTPS pages. Every track is stopped on capture, close, Escape, route change and `pagehide`. |
| Detection    | Lazy-loaded model with download progress, GPU → CPU fallback, single-face enforcement (extra tile scan catches small faces), pose / size / framing / lighting / sharpness / expression checks.                                                            |
| Measurements | 10 ratios (overall + vertical thirds), symmetry vs. the facial midline, optional **manual hairline** marking.                                                                                                                                             |
| Golden ratio | Documented formula, configurable `k`, only for 3 ratios with a recognised φ claim (see below).                                                                                                                                                            |
| Results      | Overlay on the photo with toggleable layers, face-focused view, zoom, hover/pin highlighting, bar chart, quality report, formula + limitation notes.                                                                                                      |
| Actions      | Analyze another photo, **PNG report**, print / save as PDF, clear photo & results.                                                                                                                                                                        |
| Languages    | English and Tiếng Việt: detected from `?lang=` or the browser, switched with the EN / VI buttons, never stored (see [Languages](#languages)).                                                                                                              |
| Quality      | Responsive, keyboard accessible (WCAG 2.1 AA checked with axe), `prefers-reduced-motion` aware, SEO metadata, per-route static HTML for GitHub Pages.                                                                                                     |

## Tech stack

- [Vite 8](https://vite.dev) · [React 19](https://react.dev) · TypeScript 6 · [Tailwind CSS 4](https://tailwindcss.com)
- [`@mediapipe/tasks-vision`](https://www.npmjs.com/package/@mediapipe/tasks-vision) 1.1.1 — Face Landmarker (WASM)
- [Recharts 3](https://recharts.org) for the chart, [Lucide](https://lucide.dev) icons, React Router 7
- Fonts: Inter + Fraunces via `@fontsource-variable` (self-hosted, no font CDN)
- Vitest + Testing Library (unit/component) · Playwright with Google Chrome + axe (end-to-end)

TypeScript is pinned to 6.0.x because `typescript-eslint` does not support TypeScript 7 yet.

## Getting started

Requirements: **Node.js ≥ 20.19** (22 recommended) and npm.

```bash
npm install        # also copies the MediaPipe WASM and downloads the model (see below)
npm run dev        # http://localhost:5173
```

The camera needs a secure context: `localhost` works in development; deployed sites need HTTPS.

### Model and engine files

`npm install` runs `scripts/prepare-assets.mjs`, which

1. copies the MediaPipe WASM runtime from `node_modules` to `public/mediapipe/wasm/` (git-ignored, regenerated on every
   install), and
2. downloads `face_landmarker.task` (~3.6 MB, float16) to `public/models/` if it is missing.

Both are **self-hosted**, so the app makes no third-party requests. If a self-hosted file cannot be fetched, the app
falls back to Google Cloud Storage (model) and jsDelivr (engine) — those hosts would see the visitor's IP address, but
never the photo. Run `npm run prepare:assets` to repeat the step manually.

The model is only downloaded when a user starts an analysis, so the home page stays light.

## Scripts

| Command             | Purpose                                                 |
| ------------------- | ------------------------------------------------------- |
| `npm run dev`       | Dev server.                                             |
| `npm run build`     | Typecheck (`tsc -b`) and production build to `dist/`.   |
| `npm run preview`   | Serve `dist/` locally.                                  |
| `npm run lint`      | ESLint (typescript-eslint, react-hooks, react-refresh). |
| `npm run typecheck` | `tsc -b --noEmit` for app, tests and tooling.           |
| `npm test`          | Vitest unit + component tests.                          |
| `npm run test:e2e`  | Playwright end-to-end tests (desktop + mobile Chrome).  |
| `npm run check`     | lint → typecheck → test → build.                        |

## How the analysis works

### Coordinates

MediaPipe returns normalised landmarks. They are converted to **image pixels** (so x and y share one scale) and then
expressed in a **face-aligned frame**: the _u_ axis runs through the two pupils and _v_ is perpendicular to it. Distances
are measured along these axes, so they do not change with head roll, image size or position.

### Measurements

Landmark numbers refer to the 478-point face mesh ("right"/"left" = the subject's right/left).

| Ratio                         | Formula (landmarks)                               | Compared with φ?                       |
| ----------------------------- | ------------------------------------------------- | -------------------------------------- |
| Face length ÷ face width      | 10 → 152 ÷ 234 ↔ 454                              | **Yes**                                |
| Forehead ÷ cheekbone width    | 54 ↔ 284 ÷ 234 ↔ 454                              | No                                     |
| Cheekbone ÷ jaw width         | 234 ↔ 454 ÷ 172 ↔ 397                             | No (jaw ÷ cheekbone is its reciprocal) |
| Eye distance ÷ face width     | iris centres 468 ↔ 473 ÷ 234 ↔ 454                | No (classical "five-eye" rule)         |
| Nose width ÷ eye distance     | 129 ↔ 358 ÷ inner corners 133 ↔ 362               | No (classical canon is 1 : 1)          |
| Mouth ÷ nose width            | 61 ↔ 291 ÷ 129 ↔ 358                              | **Yes**                                |
| Lower ÷ upper lip height      | 14 → 17 ÷ 0 → 13 (mouth must be closed)           | **Yes**                                |
| Upper / middle / lower thirds | hairline → brow line → nose base (2) → chin (152) | No (classical canon is equal thirds)   |

Only ratios that have a commonly cited golden-ratio claim are compared with φ. Faces are not expected to equal 1.618
everywhere, so every other ratio is shown as a plain proportion.

The **hairline** is not a MediaPipe landmark (landmark 10 sits on the forehead), so it is **never estimated**. The upper
third is skipped, with an explanation, unless the user marks the hairline on the photo; the face length then runs from
the marked hairline.

Skipped measurements (missing/invalid landmark, mouth open, zero-length segment…) are reported with their reason; no
value or score is ever invented for them.

### Golden-ratio formulas

Implemented and tested in [`src/features/face-analysis/golden-ratio.ts`](src/features/face-analysis/golden-ratio.ts):

```
r          = max(A, B) / min(A, B)        (≥ 1)
φ          = 1.6180339887
error      = |r − φ| / φ
similarity = 100 · exp(−k · error)        k = 3 by default
```

`k` only sets how quickly the percentage falls off (a 10 % deviation scores ≈ 74, a 23 % deviation ≈ 50). It is a
documented presentation parameter — not a medical threshold or a standard of beauty. The UI calls the result
**"Geometric similarity to the reference golden ratio"**. Invalid input (NaN, ∞, zero, negative) yields
`{ valid: false, reason }` and never a number.

### Symmetry

For each left/right landmark pair the signed difference of the distances to the facial midline and the height
difference are reported. The midline position is the median of the pairs' midpoints, so it does not depend on one
landmark. A ring on the photo marks where the right-hand point would land if the face were perfectly mirrored. Perfect
symmetry is never treated as "better".

### Capture-quality checks

Heuristics, documented in [`quality.ts`](src/features/face-analysis/quality.ts): head yaw/pitch/roll (from the model's
transformation matrix), face size, face fully inside the frame, brightness, lighting balance, contrast, sharpness,
resolution and expression (smile / open mouth / blink from blendshapes). A **fail** (turned head, tiny or cut-off face,
almost no light) stops the analysis; **warnings** are shown beside the results. They are not a confidence score from
the model.

### Multiple faces

The Face Landmarker's built-in detector misses small faces in group photos, so after the full-image pass the photo is
also scanned in four overlapping tiles. Faces at least 30 % as wide as the largest one count; more than one is
rejected.

## Architecture

```
src/
  components/            shared UI (layout, ui primitives, brand, illustration)
  i18n/                  translations (locales/en, locales/vi), useI18n(), language detection
  pages/                 Home, Analysis, About, Privacy, NotFound
  features/
    camera/              useCamera hook, camera errors, CameraModal
    image-upload/        validation, decoding, rotate/crop, dropzone, editor
    face-analysis/
      landmarks.ts       landmark index map
      measurements.ts    pure measurement maths (+ metric-catalog.ts: definitions & explanations)
      golden-ratio.ts    φ comparison formulas
      geometry.ts        face-aligned coordinate frame
      pose.ts quality.ts head pose and capture-quality checks
      landmarker.ts      lazy MediaPipe loader (model download, GPU→CPU, fallbacks)
      analyze.ts         the pipeline: detect → single-face → quality → measure
      overlay.ts report.ts   canvas drawing and PNG report
      components/        results UI
  types/                 shared TypeScript types
  utils/                 small helpers
  tests/                 Vitest tests
e2e/                     Playwright tests
scripts/                 asset preparation
```

UI, image handling, measurement maths and scoring are separate: `measurements.ts`, `golden-ratio.ts`, `geometry.ts`,
`pose.ts` and `quality.ts` are pure functions with no DOM access and are tested with a synthetic face of known geometry.
`analyze.ts` receives its collaborators by injection, so the whole pipeline is testable without a browser.

## Privacy

- Photos, camera frames and landmarks are processed in memory in the browser and never sent anywhere.
- Nothing is written to `localStorage`, `sessionStorage`, IndexedDB or cookies. There are no analytics or trackers.
  That includes the language choice: it is detected on every visit and kept in memory only.
- Temporary object URLs are revoked immediately; canvases are released; the camera stream is stopped; the model is
  freed when leaving the Analysis page.
- No face recognition, no identity or sensitive-attribute inference. Expression scores are used locally only to warn
  that a smile/open mouth affects the numbers.
- The Privacy page (`/privacy`) describes this behaviour, including the network requests the app makes.

## Languages

The interface is available in **English** (the default) and **Tiếng Việt**.

- The language is taken from, in order: a `?lang=vi` link, the browser's language preferences, then English. The
  EN / VI buttons in the header change it for the visit. Share `…/?lang=vi` to link straight to a language.
- **The choice is not saved** — GoldenFace promises to store nothing, so the language is detected again on every
  visit and kept in memory while the tab is open.
- The static HTML shells (title, description and Open Graph tags that crawlers and link previews read) are English
  only; the page title and description are translated as soon as the app loads.
- Numbers keep a dot as the decimal separator in every language (`1.618`), matching the formulas shown on screen.

### How it is organised

```
src/i18n/
  locales/en/*.ts   English, the source of truth — one file per area (home, about, results, quality, …)
  locales/vi/*.ts   Vietnamese, typed against the English files: a missing or extra key is a compile error
  translate.ts      lookup, {placeholders}, language detection, msg()
  context.ts        useI18n() → { t, list, rich, lang, setLang }
```

- Components call `const { t } = useI18n()` and `t('home.hero.title')`; keys are type-checked. Messages can contain
  `{name}` placeholders and simple `<b>…</b>` markup (rendered with `rich()`).
- **Analysis code never holds text.** Measurements, quality checks and errors return ids and `Msg` values — for
  example `msg('quality.checks.faceSize.warn', { px: 150 })` — and the interface translates them when it draws. That
  is why switching language while results are on screen translates everything, including the notes and the reasons a
  measurement was skipped, without analysing the photo again. The PNG report and the labels drawn on the photo receive
  a translator the same way.
- A `Msg` can be a parameter of another `Msg`, which is how a list such as "smiling, mouth open" follows the language.

### Adding a language

1. Add its code to `Lang` (`src/i18n/types.ts`), to `LANGUAGES` and `DICTIONARIES` (`src/i18n/translate.ts`).
2. Copy `src/i18n/locales/vi/` to `locales/<code>/` and translate each file. `npm run typecheck` lists anything missing.
3. Run `npm test`: `i18n.test.tsx` checks that every key exists in every language and that the `{placeholders}` and
   `<tags>` match the English text.

The header shows one button per language, which suits two or three; with more, replace `LanguageSwitcher` by a menu.

## Deploying

### GitHub Pages (recommended)

`.github/workflows/deploy.yml` builds and publishes on every push to `main`:

1. In the repository go to **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Push to `main`. The workflow runs lint, typecheck, tests and a production build with

   ```
   VITE_BASE_PATH=/<repository-name>/
   VITE_SITE_URL=https://<owner>.github.io/<repository-name>
   ```

Manual build:

```bash
VITE_BASE_PATH=/golden_face/ VITE_SITE_URL=https://<owner>.github.io/golden_face npm run build
# upload dist/ to any static host
```

| Variable         | Meaning                                                                                                                   | Default |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- | ------- |
| `VITE_BASE_PATH` | Path the site is served from (`/` for a custom domain, `/repo/` for a project page).                                      | `/`     |
| `VITE_SITE_URL`  | Public URL without trailing slash; enables canonical/Open Graph URLs, `sitemap.xml` and the sitemap line in `robots.txt`. | empty   |

The build also emits, for static hosts:

- a pre-rendered HTML shell for every route (`analysis/index.html`, `about/index.html`, `privacy/index.html`) with its
  own `<title>` and description, served with HTTP 200;
- `404.html` as the single-page-app fallback for unknown URLs;
- `robots.txt` and, with `VITE_SITE_URL`, `sitemap.xml`.

HTTPS is required for camera access; GitHub Pages provides it. Any other static host works the same way (Netlify,
Cloudflare Pages, S3…) — set `VITE_BASE_PATH` to match.

## Testing

```bash
npm test            # ~350 unit/component tests
npm run test:e2e    # Playwright, desktop + mobile (Pixel 7) Chrome, real MediaPipe model
```

Unit and component tests cover: the golden-ratio formulas (valid, invalid, divide-by-zero), measurements on a
synthetic face with known answers (scale / translation / roll invariance, asymmetry, missing landmarks, hairline),
pose and quality checks, the analysis pipeline (no face, several faces, tile-only faces, turned head, small/cut-off
face, darkness, model failures, cancellation), file validation and canvas editing, the camera (permission states,
switching, capture/retake, **releasing every track** on close / Escape / unmount / late permission / `pagehide`),
the Analysis page flow with all error states, the results UI, the model loader, pages, navigation and overlay drawing,
and the translations (identical keys, placeholders and tags in every language; the results, errors and PNG report
rendered in Vietnamese; switching language while results are on screen).

End-to-end tests use the locally installed Google Chrome (no browser download) with Chrome's fake camera. They need
network access once to fetch a neutral sample portrait published by MediaPipe into `e2e/.fixtures/` (git-ignored; no
photos of people are stored in the repository); without it, the tests that need a real face skip themselves. They
verify, among other things: the real analysis end to end, that **no external or non-GET request is ever made**, that no
storage is used, camera release in real Chrome, axe WCAG 2.1 A/AA checks across pages and states, keyboard
behaviour, no horizontal scrolling from 320 px to 1440 px, PNG download, print styling and per-route static HTML, plus
language detection, switching and a Vietnamese analysis run (with nothing stored).

## Limitations

- **A 2D photo is not a face.** Camera distance and lens distortion, head angle, expression, lighting and resolution
  all change measurements; a close selfie enlarges the nose relative to the ears.
- **Landmarks are model estimates** (a few pixels of error); hair, glasses, beards, makeup and shadows shift them.
  Occlusion (hands, masks) cannot be detected reliably — MediaPipe provides no per-landmark confidence for the face
  mesh.
- **No hairline detection**, so the top of the face is landmark 10 unless the user marks the hairline.
- **φ is not a rule for faces.** The comparisons are a geometric exercise; perception research does not support φ as a
  predictor of attractiveness.
- Group photos with many tiny faces may still be mis-counted; the tile scan is a heuristic.
- Quality thresholds are heuristics calibrated on a handful of test photos, not a validated clinical protocol.
- The first analysis downloads ~4 MB (model) plus ~13 MB (WASM engine) and needs an internet connection; afterwards
  the browser cache serves them.
- The interface is English and Vietnamese only; the translations were written for this project and have not been
  reviewed by a second native speaker. The static HTML shells stay English.

## Credits

Facial landmarks by [Google MediaPipe](https://ai.google.dev/edge/mediapipe) (Apache-2.0). Code: MIT.
