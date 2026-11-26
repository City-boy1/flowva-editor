# HOMEPAGE-01 — Visual homepage refresh

## Objective
Replace the sparse, icon-led homepage start area with six visual workspace cards and meaningful first-visit content while preserving existing creation and storage flows.

## Files changed
- `index.html` — homepage layout and workspace cards
- `app.css` — responsive homepage presentation
- `app.js` — six workspace-to-existing-preset mapping, search, and conditional project/purchase sections
- `assets/workspaces/*.svg` — locally bundled workspace artwork
- `docs/HOMEPAGE_SPEC.md` — homepage behavior contract

## Must preserve
- Existing preset IDs, dimensions and timeline flags
- Existing editor navigation and project creation flow
- Existing local project and asset storage
- Existing marketplace API client and purchase ownership boundary
- Existing format support and export capabilities

## Acceptance criteria
- Six workspace cards appear on the homepage.
- Five workspaces route to existing creation categories/presets.
- 3D is clearly marked as planned and does not imply working 3D editing.
- Search filters workspace cards; Enter opens the first available match.
- No editor login is required to browse or start local creation.
- Recent projects are hidden until at least one project exists.
- Purchased-template section is hidden until purchase records exist.
- The marketplace template area remains visible with an honest endpoint-pending state; it shows only real endpoint data when connected.
- All workspace artwork is local; homepage visuals do not depend on third-party image URLs.
- No existing editor/export functionality is intentionally removed or changed.

## Verification
Run JavaScript syntax checks for `app.js`, inspect the homepage at desktop and mobile widths, test each workspace route, test search, verify zero-project and non-empty-project states, and verify catalogue/purchase placeholders with `BACKEND_ENABLED=false`.

## Deliberate non-goals
No new format support, 3D editor, marketplace API, authentication flow, export changes, or full folder migration in this task.
