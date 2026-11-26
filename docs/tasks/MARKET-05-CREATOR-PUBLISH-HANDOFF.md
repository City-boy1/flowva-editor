# MARKET-05 — Creator export to FlowvaMarket listing workflow

**Goal:** Let a creator move a finished, supported file from FlowvaEditor into the existing FlowvaMarket creator upload/listing process.

## First increment
- Identify the existing Market creator upload/listing-draft URL.
- Add a clear editor action that prepares/downloads the selected supported source and preview, then opens that Market page.
- Creator manually uploads the files if no safe prefill mechanism exists.

## Later optional increment
- Add a short-lived upload-init/draft-attachment token scoped to authenticated creator + draft + permitted files.
- Do not build a new creator listing system in editor.

## Market remains responsible for
Creator authentication/eligibility, listing category, title/description, price/free choice, type validation, upload scanning, draft creation, moderation, publication, payments and payouts.

## Acceptance
- Creator can reach the existing Market upload flow with the correct source/preview prepared.
- Submission creates a draft and does not bypass validation or moderation.
- After Market approval, listing appears in public catalogue.
- Unsupported source types are not offered for publishing as editable Market files.

**Suggested commit:** `feat: hand off creator exports to FlowvaMarket`
