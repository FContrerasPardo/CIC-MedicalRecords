# Project conventions (Claude Code)

This repo also has an `AGENTS.md` with token-saving rules — follow those too. This file adds the **verification workflow** for the Medical Records Angular 19 plugin under `CustomUI/medicalrecords-pq7lr-source/`.

## Verification workflow

**During iteration (template / SCSS / logic tweaks): do NOT run the AOT build.** It's slow and competes with the user's running dev server.
- A dev server (`nx serve workspace-hxp`) is usually running with HMR — rely on it for compile feedback. If the user reports a compile error from their terminal, fix it.
- Run only fast, relevant checks:
  - `npx nx test medical-records --testPathPattern=<spec>` — only when changing mapper / pure logic.
  - i18n validation — only when changing translations.
- For purely visual tweaks, run nothing; let HMR show the result.

**Before a git commit/push: run the AOT build as the final gate.**
- `npx nx build workspace-hxp --configuration=development` (run from `CustomUI/medicalrecords-pq7lr-source`).
- This is the only thing that type-checks the plugin's **templates**: the `medical-records` library has no `build` target (only `lint`, `stylelint`, `test`), and unit tests don't compile component templates. So the app build is what catches template/binding/type/SCSS errors.
- Fix any failure before committing.

## i18n
- `libs/plugins/medical-records/assets/i18n/en.json` is the source of truth.
- The 6 other locales (de, es, fr, it, pl, pt) must stay in sync: **0 missing, 0 extra**, and **0 code drift** (every key used in `.ts`/`.html` must exist in en.json). New locale keys land as `[TODO] <english>` placeholders.

## Notes
- `nx lint` and `nx stylelint` currently fail for environment/config reasons unrelated to code changes (the `hxp/restrict-changes-to-plugins` rule can't resolve git from the workspace subdir; stylelint lacks a config for some files). Don't treat their failures as caused by your change.
- The analysis task widget is read-only v1 — its buttons are visual only and do not write Automate variables.
