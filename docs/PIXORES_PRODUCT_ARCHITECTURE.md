# Pixores product architecture

## Product positioning

- **Pixores Video Maker Pro** is the installed Windows editor. It owns long-form editing, local media, proxy generation, Audio AI, native FFmpeg/GPU rendering, Smart Clips batch export and direct publishing.
- **Pixores Quick Video Maker** is the authenticated web editor. It is intended for short social projects, templates, text, light editing and browser export.
- **Pixores Thumbnail Maker** is an authenticated web creator tool and uses the same Pixores account.

## Shared contract

Both editors, autosave, project packages, cloud projects and every renderer consume `PixoresVideoProject` from `src/video-render/types.ts`. Geometry is resolution-independent and stored as canvas percentages. Timeline placement and media trimming are stored as seconds and converted to integer frames at render boundaries.

Compatibility rules:

1. Never introduce a renderer-only layer property.
2. New project fields must remain optional until a schema migration exists.
3. Desktop and web must save the same project JSON.
4. A release is not render-compatible until `npm run test:video-parity` passes.
5. Smart Clips must derive projects through `createSmartClipProject`; it must not create an independent timeline model.

## Current readiness

| Area | State | Release requirement |
| --- | --- | --- |
| Local project packages and autosave | Implemented | Recovery smoke test on packaged build |
| Proxy/media preparation | Implemented | Benchmark with long H.264 and phone VFR media |
| Magnetic cuts and non-overlap timeline | Implemented | Interaction regression test remains desirable |
| Hybrid frame render | Implemented | Parity and cut-point tests must pass |
| Audio effects, synchronization and Audio AI paths | Implemented | Existing automated tests must pass |
| Smart Clips | Implemented | Instagram, Facebook, YouTube, TikTok and custom size tests |
| Cloud project sync | Implemented for project JSON | User authentication is mandatory; original media is local by default |
| My Library | Local/Desktop implementation exists | Cloud asset binary synchronization is not yet complete |
| Collaboration | Deferred | Add only after project/media sync telemetry proves demand |
| Cloud rendering | Deferred | Requires durable queue, object storage and dedicated render workers |

## Near-term operating limits

Quick Video Maker must remain a lightweight authenticated editor. GPU render, Audio AI, large batch Smart Clips and native publishing remain Pro features. The web application may store project JSON and lightweight reusable metadata, but must not upload original source video without an explicit user action.

## Release gate

Before publishing a Desktop installer or web deployment:

1. Run TypeScript and ESLint.
2. Run Smart Clips, audio, SVG, lower-third and YouTube publisher tests.
3. Run `test:video-parity` and inspect its frame/timestamp results.
4. Build the production Next.js application.
5. Smoke-test the packaged Desktop application with a reopened autosave and a second consecutive export.
