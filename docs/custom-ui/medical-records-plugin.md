# Medical Records Plugin

## Decision

The first custom experience for this project must be built as the official Hyland/Nx plugin `medical-records` inside the exported Automate template:

```text
CustomUI/medicalrecords-pq7lr-source/libs/plugins/medical-records/
```

This keeps the implementation attached to the existing `workspace-hxp` shell, authentication, process services, repository connectivity, asset pipeline, extension loading, and packaging flow from the Automate Custom UI template.

## Official Generator Command

When the local environment has the required dependencies installed, the intended command is:

```powershell
cd C:\CIC-MedicalRecords\CustomUI\medicalrecords-pq7lr-source
npm run nx:generate -- @hyland/extend:plugin medical-records --author "Fernando Contreras" --addTranslations true
```

The template requires:

```text
node >=24.14.0 <25.0.0
npm >=11.9.0 <12.0.0
```

## Current Implementation Note

On 2026-04-25, the generator was not used for the initial scaffold because the local workspace first had incomplete dependencies and later the IA sandbox produced false Windows `EPERM` failures for Node/Nx operations. The root cause validated later was not the plugin design: the sandbox blocks operations required by Nx, including `child_process.spawn` and atomic `fs.rename`.

After running outside the sandbox with Node `24.14.0` and npm `11.9.0`, dependency installation and `workspace-hxp` local serve were validated successfully. Future generator, build, preserve, pack-build, and serve commands must run in the local Windows environment, not in sandbox.

To keep progress moving without changing the architecture, the plugin scaffold was created manually following the checked-in Hyland generator source:

```text
libs/shared/plugins/src/generators/create-plugin/plugin.ts
libs/shared/plugins/src/generators/shared/normalize-options.ts
tools/shared/generators/utils/add-project-defaults.ts
```

Important generator parity finding:

- The plugin was **not** created by running `npx nx generate @hyland/extend:plugin --name medical-records --author "..." --addTranslations true`.
- The current scaffold manually includes the important translation equivalent: `provideTranslations('medical-records', 'assets/medical-records')` in `MedicalRecordsModule`.
- The medical-records screens were **not** created with `npx nx generate @hyland/extend:page --pluginName medical-records --pageName ...`.
- The screens were custom-built inside `medical-records-shell` to match the Stitch designs and then wired to the Hyland extension route `/medical-records/:phase`.

## Files Registered

The scaffold registers:

- `MedicalRecordsModule` in `libs/plugins/index.ts`.
- Plugin assets in `apps/workspace-hxp/project.json`.
- `medical-records` as an implicit dependency of `workspace-hxp`.
- `@plugins/medical-records` in `tsconfig.base.json` and `tsconfig.adf.json`.
- Translation assets under `libs/plugins/medical-records/assets/i18n`.

## Translation Behavior

On 2026-04-27, the language menu was validated against the plugin. The Hyland shell was changing language, but the plugin content did not because the template still used hardcoded labels even though translation assets existed.

The root cause was template-level, not provider-level:

- `MedicalRecordsModule` already imported `TranslateModule`.
- `MedicalRecordsModule` already registered `provideTranslations('medical-records', 'assets/medical-records')`.
- The i18n files existed, but only contained `PLUGIN_MESSAGE`.
- The shell and menu templates did not use `| translate` for the visible medical-records labels.

The first translation pass now covers the navigation and primary title layer:

- Automate left navigation item: `Cuentas Medicas` / `Medical Accounts`.
- Medical records brand and top links.
- Global plugin actions: export report, new intake, filter, search, notifications, user profile aria labels.
- Phase navigation: overview, intake, analysis, approval, execution, review, completed.
- Top page titles and descriptions for every phase.
- Overview dashboard section titles, main cards, and performance metric labels/helpers.
- Translation dictionaries were populated for `de`, `en`, `es`, `fr`, `it`, `pl`, and `pt`.

Remaining scope:

- Clinical sample data, patient names, payer names, mock account rows, and deeper phase-body copy are still hardcoded intentionally because they represent demo/business content rather than the primary navigation/title layer.
- If those texts must also change with the language selector, add keys under `MEDICAL_RECORDS` and replace each literal with the `translate` pipe.

## Hyland Generator Reference Check

On 2026-04-27, the official plugin and page generators were validated with `--dry-run` to compare the current implementation against the documented Hyland flow without modifying the dirty workspace.

Detailed findings are documented in:

```text
docs/custom-ui/hyland-generator-reference.md
```

Conclusion: the official page generator is useful as a registration reference, but it does not provide additional process/repository/auth UI functionality beyond the extension wiring. The current `medical-records` plugin should not be replaced by the generated page template. Continue using the current plugin and selectively borrow generator patterns where they help.

## Local Execution Finding

Detailed environment findings are documented in:

```text
docs/custom-ui/local-development-findings.md
```

Important summary:

- `workspace-hxp:preserve` already existed in the original Automate template.
- It generates `apps/workspace-hxp/.tmp/app.config.json` before local serve.
- `spawn EPERM` and `.nx/workspace-data` rename `EPERM` are sandbox artifacts.
- The correct local auth config uses code flow, not implicit flow.

## Next Implementation Rule

Use this plugin as the base for the Stitch migration. The default page/navbar generated by `@hyland/extend:page` can be reviewed later, but the medical-records phase navigation should be implemented inside this plugin so we preserve the Hyland shell and avoid recreating process/repository capabilities from scratch.

## UI Migration Status

On 2026-04-25, the first Stitch migration pass was implemented in:

```text
CustomUI/medicalrecords-pq7lr-source/libs/plugins/medical-records/src/lib/pages/medical-records-shell/
```

Current routes:

- `/medical-records`: Process Overview Dashboard.
- `/medical-records/intake`: Expediente Unificado / Intake.
- `/medical-records/analysis`: AI Pre-validation / Analysis.
- `/medical-records/approval`: Account Assembly / Approval.
- `/medical-records/execution`: Unified Appeals Management / Execution.
- `/medical-records/review`: Final Review & Audit Phase.
- `/medical-records/completed`: Conciliacion y Cierre de Pagos.

Important design rule: do not rebuild these screens from imagination. Use the exported Stitch HTML/PNG files in:

```text
UI design/armado-de-cuentas/
```

The first implementation mistake was a custom hero-style layout that did not match Stitch. The corrected direction is to keep the compact 1440px Stitch canvas, glass cards, Manrope typography, phase navigation, and bento-style content sections.

## Shell Navigation Behavior

The medical records entry must be registered through the official extension mechanism from the Hyland plugin page flow, not only as a manual Angular route. The plugin now contributes:

```text
libs/plugins/medical-records/assets/medical-records.extension.json
features.navbar -> app.navbar.medical-records
routes -> /medical-records and /medical-records/:phase
```

The menu item component is registered from:

```text
libs/plugins/medical-records/src/lib/components/medical-records-menu-item/
```

The earlier focus-mode experiment was removed because it left a broken/ghost Automate sidenav and could block scrolling. The application shell should remain responsible for the left navigation. `medical-records` should appear as a normal CIC/Automate navigation item, and the internal Overview/Intake/Analysis/Approval/Execution/Review/Completed navigation should remain inside the medical records page only.

## Horizontal Scroll Finding

On 2026-04-27, the medical records pages still produced horizontal overflow after navigation was corrected. The cause was in the plugin layout CSS, not in the Hyland shell: the custom shell allowed visible X overflow, several grid/flex containers kept their default minimum content width, and the phase navigation forced each step to reserve fixed width.

The fix is intentionally scoped to the plugin:

- Keep the host and `.medical-records-experience` at `width: 100%`, `max-width: 100%`, `min-width: 0`, and clip only horizontal overflow.
- Use `min-width: 0` on the dashboard shell, grids, cards, rows, and menu item text so Automate's left navigation can resize the content area without pushing the viewport.
- Make the phase navigation shrink inside the available width instead of creating an internal horizontal scrollbar; on small screens it wraps into multiple rows.
- Do not hide global document overflow as a workaround. If horizontal scroll returns, inspect the plugin component first before changing global `body` or app-shell styles.

## Vertical Scroll Finding

On 2026-04-27, the remaining scroll issue was clarified as vertical scrolling inside the main medical-records panel, not horizontal scrolling. The plugin root was using `min-height: 100vh`, which is too tall inside the Hyland application chrome because the Workspace header already consumes part of the viewport. That can place the scroll on the wrong ancestor or leave the route content visually clipped.

The medical-records shell now owns the scroll inside the plugin panel:

- `:host` uses a viewport height minus the Workspace chrome header and hides overflow.
- `.medical-records-experience` uses `height: 100%` and `overflow-y: auto`.
- Keep this scoped to the plugin. Do not restore the old `min-height: 100vh` on the route host unless the Hyland shell structure changes.

User validation: after the CSS change, the user confirmed the vertical scroll works correctly in the browser. Future layout work should preserve this scroll ownership model unless the Hyland chrome/header height changes.
