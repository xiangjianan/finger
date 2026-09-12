# Finger

**English** | [简体中文](README.zh-CN.md)

A real-time hand-gesture particle experiment in the browser. Once the camera is on, the app uses MediaPipe to detect the 21 hand landmarks of one or both hands, then maps those landmarks onto a full-screen Canvas particle field, making particles swirl around fingertips, the hand skeleton, and the palm.

## Features

- Real-time camera hand tracking with single-hand and two-hand recognition
- Canvas particle field that follows hand landmarks
- Three visual styles: Neon, Aurora, and Ember
- Adjustable particle intensity
- Toggleable camera feed, energy links, and skeleton display
- Fullscreen immersive mode
- Fully local with no back end — easy to deploy to static hosting platforms like Cloudflare Pages

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- MediaPipe Tasks Vision
- Zustand
- Lucide React

## Run Locally

```bash
pnpm install
pnpm dev
```

Then open the local URL printed by Vite in your browser. Hand recognition requires camera permission; Chrome or Edge is recommended.

## Build

```bash
pnpm build
```

Build output is written to `dist/`.

## Lint

```bash
pnpm lint
pnpm check
```

## Cloudflare Pages Deployment

This project is a pure static Vite app. The recommended Cloudflare Pages configuration:

- Framework preset: `Vite`
- Build command: `pnpm build`
- Build output directory: `dist`
- Root directory: `/`

You can also upload the current build output directly with Wrangler:

```bash
pnpm build
npx wrangler pages deploy dist --project-name finger
```

After deployment, the page must be accessed over HTTPS, because the browser camera API generally requires a secure context in production.

## Usage

1. Open the page and wait for the hand recognition model to load.
2. Click "Enable Camera" and grant the browser camera access.
3. Hold your palm facing the camera with all five fingers spread.
4. Use the control panel in the top-right corner to switch styles, display layers, and fullscreen mode.

## Notes

- The first load fetches the MediaPipe WASM runtime and hand recognition model from a CDN, which may take a few seconds on a slow connection.
- If camera permission was denied, re-allow it in the browser's site settings.
- If the camera is in use by another program, close that program and refresh the page to try again.
