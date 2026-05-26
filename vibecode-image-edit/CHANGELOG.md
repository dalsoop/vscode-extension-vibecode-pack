# Changelog

## 0.1.0

- Initial release.
- Right-click PNG/JPG/JPEG/WEBP/GIF/BMP → "Vibecode Image - Edit" opens a webview panel beside the editor.
- Three tools in a single panel:
  - **Eyedropper**: hover image to sample, click to copy hex; live hex/RGB/HSL readout.
  - **Chroma Key**: pick a target color (from image or hex input) + tolerance slider + edge softening; live preview; Save PNG.
  - **Crop**: drag rectangle selection; Crop & Save PNG.
- Output is always PNG (alpha-preserving), saved next to the source as `<basename>-<YYMMDDHHMMSS>.png`.
