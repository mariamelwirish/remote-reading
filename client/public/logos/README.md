# VCU logos

Drop the official VCU logo image here and it appears across the whole app
automatically (top bar + every page footer). No code changes needed.

- `vcu.png`         ← the VCU logo (required)
- `vcu-health.png`  ← the VCU Health logo (optional; shows in the footer if present)

Notes:
- PNG with a transparent background looks best (it sits on white cards and,
  in dark mode, on dark cards — transparent avoids a white box around it).
- Use the official asset from VCU Brand (brand.vcu.edu) / VCU Health brand
  resources so it's the approved mark, not a third-party copy.
- If you use `.svg` or `.jpg` instead, update the `src` paths in
  `client/src/components/layout/CoBranding.jsx`.
