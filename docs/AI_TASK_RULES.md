# AI/developer task rules

Use these rules for every FlowvaEditor implementation task.

## Before editing
1. Read `README.md`, the relevant section of `IMPLEMENTATION_ROADMAP.md`, and the specific task brief.
2. Inspect only the named files and their direct dependencies first. If another file must change, explain why before editing it.
3. Identify current behaviour and working functionality that must be preserved.
4. State the intended visible result and the acceptance checks before making changes.

## Scope control
- Complete only the requested task. Do not start the next roadmap stage.
- Do not redesign unrelated screens, rename broad sets of files, migrate frameworks or replace working subsystems without explicit approval.
- Prefer small changes to existing code. Do not delete a vendor dependency until all references are removed and tests pass.
- Do not create fake data, nonfunctional buttons, mock success messages or unsupported export choices.
- Keep API URLs in `api/client.js`; keep public deployment values in `config.js`; never put secrets in client code.
- Do not change FlowvaMarket-owned authentication, checkout, purchases, listing, moderation or payout logic in the editor repository.

## Verification and hand-off
- Run syntax checks for every changed JavaScript file.
- Run the task's automated checks and manual browser acceptance steps.
- Report checks that passed, failed or were not run. Do not say "tested" when only static inspection was performed.
- Include exact changed-file list and any new dependency/licence implications.
- Update the roadmap tracker only for work actually completed and verified.
- Provide a focused Git commit message and concise PR summary.
- If blocked by missing Market endpoint/schema, stop at a clear adapter boundary and list the exact information required. Do not invent an endpoint contract silently.

## Required completion report

```text
Task:
Visible result:
Files changed:
Existing behaviour preserved:
Checks run and results:
Manual QA performed:
Known limitations / not verified:
Next task (do not implement it yet):
Suggested commit:
```
