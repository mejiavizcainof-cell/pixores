# Pixores Video Maker Desktop Architecture

## Goal

Pixores Video Maker must run in two compatible modes:

- Web: Next.js app, API render jobs, cloud/local web storage.
- Desktop: Electron shell, same React editor, local Remotion + FFmpeg render,
  local project packages and assets.

The editor should keep producing `PixoresVideoProject`. Runtime-specific work
must live behind adapters.

## Current Web Pieces

- UI: `components/VideoMaker.tsx`
- Project JSON contract: `src/video-render/types.ts`
- Project builder: `src/video-render/build-project.ts`
- Web render API: `app/api/render-video`
- Web upload API: `app/api/video-maker/upload-asset`
- Cloud project API: `app/api/video-maker/projects`
- Remotion composition: `src/video-render/remotion/PixoresComposition.tsx`

## Target Boundaries

```text
VideoMaker React UI
├─ buildPixoresProject(...)
├─ VideoRenderAdapter
│  ├─ web: POST /api/render-video
│  └─ desktop: Electron IPC -> local Remotion + FFmpeg
├─ VideoAssetAdapter
│  ├─ web: upload endpoint / cloud storage
│  └─ desktop: copy file into local project assets
└─ Project storage
   ├─ web: JSON/localStorage/Supabase
   └─ desktop: .pixores-video package
```

## Desktop Electron Plan

1. Keep Next.js and VideoMaker as the UI.
2. Add Electron as a shell that opens `/video-maker`.
3. Expose a small preload bridge: `window.pixoresDesktop`.
4. Keep `nodeIntegration: false`, `contextIsolation: true`, and `sandbox: true`.
5. Route desktop actions through IPC handlers:
   - `pixores:assets:import`
   - `pixores:project:open`
   - `pixores:project:save`
   - `pixores:render:start`
   - `pixores:render:status`
6. Use the same Remotion composition for both web and desktop.
7. Store desktop output under a local user folder or project folder.

## `.pixores-video` Format

Desktop project files should be zip-compatible packages:

```text
project.pixores-video
├─ manifest.json
├─ project.json
└─ assets/
   ├─ imported-image.png
   ├─ imported-video.mp4
   └─ imported-audio.mp3
```

`project.json` must remain a normal `PixoresVideoProject`.

Asset references in desktop packages should prefer relative package references,
for example:

```json
{
  "url": "assets/imported-video.mp4",
  "persistentUrl": "assets/imported-video.mp4"
}
```

When opened in desktop, those paths resolve relative to the package folder. When
uploaded to web later, the asset adapter can replace them with public URLs.

## Phase Order

1. Install Electron tooling and add desktop scripts.
2. Run Next + Electron in dev mode.
3. Detect desktop runtime in VideoMaker and select adapters.
4. Replace direct web render call with `VideoRenderAdapter`.
5. Replace direct asset upload call with `VideoAssetAdapter`.
6. Implement local Remotion render in Electron main process.
7. Implement `.pixores-video` open/save with zip packaging.
8. Add Windows installer build.

## Compatibility Rules

- Do not fork `VideoMaker.tsx` into a separate desktop editor.
- Do not change `PixoresVideoProject` only for desktop.
- Do not store blob URLs in long-lived projects.
- Web endpoints must keep working.
- Desktop IPC must stay unavailable in normal web browsers.
