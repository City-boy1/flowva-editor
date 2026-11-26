# Homepage visual refinement — Milestone 02

## Decisions
- Six workspace cards use a varied, responsive mosaic rather than equal-sized tiles.
- Workspace title, description and action sit over full-bleed artwork. Artwork remains replaceable through `assets/workspaces/`.
- Use Flowva pink, purple, white and neutral surfaces; do not introduce unrelated accent palettes.
- Desktop sidebar is an icon rail by default, expands on hover/focus, and is permanently expanded at very wide widths (1700px+). Mobile retains its off-canvas menu.
- One Templates navigation destination contains My templates, Recently used and Discover tabs. Marketplace catalogue content remains endpoint-driven.
- Existing workspace routes, preset IDs, editor behavior, save/export logic and marketplace API configuration must be preserved.
- Modal appearance is explicitly out of scope.

## Artwork replacement
Replace the SVG files under `assets/workspaces/` with optimized WebP/AVIF/JPEG or new SVG assets using the same filenames, or update the `src` values in `index.html`. Use wide high-resolution images with strong focal points and enough contrast for white overlay text.

## Verification still required
Run the app in a browser at desktop, wide desktop, tablet and mobile widths; verify hover/focus sidebar behavior, all six workspace routes, templates tabs, project visibility and marketplace empty/loading states.
