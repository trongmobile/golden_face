# TikTok tutorial video

Renders a 1080×1920 Vietnamese walkthrough of the app: real browser run of `dist/` + macOS "Linh" voice-over.

```bash
npm run build                                   # dist/ must match the code
npm run promo                                   # → promo/out/goldenface-tiktok.mp4 (+ -cover.jpg)
npm run promo -- --photo path/to/face.jpg       # use your own photo (only with the person's consent)
```

- `script.mjs` — narration + on-screen text (edit here, then re-run).
- `stage/stage.html` — layout around the app (title, captions, tap indicator, end card).
- `record.mjs` — drives the app, records frames, builds audio, encodes with ffmpeg.
- `avatar.html` / `make-avatar.mjs` — the synthetic demo face (`assets/avatar.jpg`); no real person is analysed.

Needs macOS (`say`), Google Chrome, ffmpeg (`brew install ffmpeg`). The end card shows the public URL from
`SITE_LABEL` in `script.mjs`; change it if the site lives elsewhere.
