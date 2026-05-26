# Changelog

## 0.1.0

- Initial release.
- Right-click PNG/JPG/JPEG/WEBP/GIF/BMP → "Vibecode Image - Redact" opens a webview panel.
- Three redaction styles: **Blur** (canvas blur filter), **Pixelate** (downsample + nearest-neighbor upscale), **Solid** (filled color block).
- Drag rectangles on the image — each region added to a list and applied immediately to the preview.
- Per-region remove, clear-all, and Save PNG actions.
- Output saved next to the source as `<basename>-<YYMMDDHHMMSS>.png`.
