# Pixores Video Maker Desktop Release

Use GitHub Releases for the Windows installer because the Electron `.exe` is larger than the Supabase Storage free upload limit.

## Current Release

- Repository: `mejiavizcainof-cell/pixores`
- Tag: `pixores-video-maker-v0.1.3-beta.1`
- Installer: `Pixores Video Maker Setup 0.1.3-beta.1.exe`
- Local file: `C:\Users\mejia\image-tools\release-beta\Pixores Video Maker Setup 0.1.3-beta.1.exe`
- Public URL:

```text
https://downloads.pixores.com/video-maker/Pixores%20Video%20Maker%20Setup%200.1.3-beta.1.exe
```

## Manual Upload

1. Open GitHub.
2. Go to `mejiavizcainof-cell/pixores`.
3. Open `Releases`.
4. Create a new release.
5. Use tag `pixores-video-maker-v0.1.3-beta.1`.
6. Upload the installer from:

```text
C:\Users\mejia\image-tools\release-beta\Pixores Video Maker Setup 0.1.3-beta.1.exe
```

7. Upload `beta.yml` and the `.blockmap` file too if this release will be used for beta auto-update.
8. Publish the release.

The `/desktop` page points to the default URL in `app/desktop/page.tsx`. For future versions, update the tag, file name, and `defaultDesktopDownloadUrl`.
