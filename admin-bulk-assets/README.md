# Admin Bulk Assets

Put files in these folders, then run:

```bash
npm run sync:admin-assets
```

Folders map to Pixores admin asset categories:

- `people`
- `objects`
- `shapes`
- `frames`
- `backgrounds`

Supported image files:

- `.png`
- `.jpg`
- `.jpeg`
- `.webp`
- `.svg`

Optional sidecar JSON:

For `objects/youtube-logo.png`, create `objects/youtube-logo.json`:

```json
{
  "name": "YouTube Logo",
  "alt_text": "YouTube logo for thumbnail designs",
  "tags": ["youtube", "social", "logo"],
  "sort_order": 10,
  "is_published": true,
  "metadata": {
    "source": "admin-bulk"
  }
}
```

The image files in this folder are ignored by Git so large admin uploads do not get committed.
