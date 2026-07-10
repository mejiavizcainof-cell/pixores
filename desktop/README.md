# Pixores Video Maker Desktop Base

This folder contains the safe starter structure for a future Electron + Next.js
desktop build of Pixores Video Maker.

The web app remains the source of the React UI. Desktop should load the same
VideoMaker route and provide local capabilities through Electron IPC:

- local Remotion + FFmpeg rendering
- local project packages using `.pixores-video`
- local asset copying into a project assets folder

Electron dependencies are intentionally not installed in this phase. The files
under `desktop/electron` are `.mjs` so `npm run build` for the web app remains
unaffected until the desktop toolchain is added.

## Planned Commands

```text
npm run desktop:dev
npm run desktop:build:win
```

## Runtime Layout

```text
Pixores Video Maker
├─ web UI: Next.js /video-maker
├─ desktop shell: Electron BrowserWindow
├─ preload bridge: window.pixoresDesktop
├─ render adapter: local Remotion + FFmpeg
├─ asset adapter: copy to local project assets folder
└─ project package: .pixores-video
```

## `.pixores-video` Package

The desktop project file should be a zip-compatible package:

```text
my-project.pixores-video
├─ manifest.json
├─ project.json
└─ assets/
   ├─ image-1.png
   ├─ clip-1.mp4
   └─ audio-1.mp3
```

`project.json` must keep the existing `PixoresVideoProject` shape so web and
desktop can open the same project data.
