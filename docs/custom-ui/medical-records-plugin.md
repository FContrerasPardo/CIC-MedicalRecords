# Medical Records Plugin

Nota de mantenimiento: la especificacion general de la demo y el paso a paso
end-to-end viven en `docs/medical-records-demo-process-specification.md`. Este
documento queda como anexo tecnico de arquitectura del plugin Custom UI.

## Decision

The first custom experience for this project must be built as the official Hyland/Nx plugin `medical-records` inside the exported Automate template:

```text
CustomUI/medicalrecords-pq7lr-source/libs/plugins/medical-records/
```

This keeps the implementation attached to the existing `workspace-hxp` shell, authentication, process services, repository connectivity, asset pipeline, extension loading, and packaging flow from the Automate Custom UI template.

Current product decision:

- The plugin general experience should not own the workflow stages.
- Workflow stages are represented by Automate user tasks and custom form
  widgets.
- The plugin should become an overview/task entry point that redirects users to
  active tasks in Automate.
- This widgets-first model was chosen to keep workflow changes controlled in
  Automate instead of rebuilding a fully custom application coupled through
  integrations.
- A fully custom phase UI inside the plugin would only make sense later if the
  project intentionally replaces task-form based execution with direct service
  integrations.

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
- Early screens were custom-built inside `medical-records-shell` to match Stitch designs and wired to `/medical-records/:phase`.
- That phase-route model is now considered a historical/visual direction, not the current functional architecture.

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

The first translation pass covered the navigation and primary title layer that existed at that time:

- Automate left navigation item: `Cuentas Medicas` / `Medical Accounts`.
- Medical records brand and top links.
- Global plugin actions: export report, new intake, filter, search, notifications, user profile aria labels.
- Legacy phase navigation labels: overview, intake, analysis, approval, execution, review, completed.
- Top page titles and descriptions for the legacy phase pages.
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

Use this plugin as the overview and task-entry layer for the demo. The plugin should preserve the Hyland shell and avoid recreating process/repository/task behavior.

Do not continue investing in plugin-owned phase pages as the primary workflow UI. The operational stages should be implemented as Automate forms with custom widgets, for example `intake-account-widget` and `analysis-task-widget`.

The main plugin screen should eventually show a process/account overview and redirect users to active tasks in execution so they can continue the exact workflow step controlled by Automate.

## UI Migration Status

On 2026-04-25, the first Stitch migration pass was implemented in:

```text
CustomUI/medicalrecords-pq7lr-source/libs/plugins/medical-records/src/lib/pages/medical-records-shell/
```

Historical routes created during the initial UI migration:

- `/medical-records`: Process Overview Dashboard.
- `/medical-records/intake`: Expediente Unificado / Intake.
- `/medical-records/analysis`: AI Pre-validation / Analysis.
- `/medical-records/approval`: Account Assembly / Approval.
- `/medical-records/execution`: Unified Appeals Management / Execution.
- `/medical-records/review`: Final Review & Audit Phase.
- `/medical-records/completed`: Conciliacion y Cierre de Pagos.

Current decision:

- Only `/medical-records` should be treated as the product-facing plugin entry point for now.
- The phase routes should not be used as the workflow execution surface.
- Intake, Analysis, and future stages should be reached through Automate tasks and rendered by form widgets.
- The plugin overview should not show the phase navigation as the main interaction model.
- It should show overview/status/work-in-progress information and open the relevant active task.

Important visual rule: do not rebuild the overview screen from imagination. Use the exported Stitch HTML/PNG files in:

```text
UI design/armado-de-cuentas/
```

The first implementation mistake was a custom hero-style layout that did not match Stitch. The corrected visual direction is to keep the compact 1440px Stitch canvas, glass cards, Manrope typography, and bento-style content sections. The phase navigation should be removed or demoted because workflow stages now live in widgets.

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

Updated behavior:

- `medical-records` remains a normal CIC/Automate navigation item.
- The plugin should open the overview, not a full stage-by-stage application.
- The overview should link or redirect to active Automate tasks.
- Stage-specific UI belongs inside task widgets.
- Do not treat `/medical-records/:phase` as the source of truth for workflow progress.

## Horizontal Scroll Finding

On 2026-04-27, the medical records pages still produced horizontal overflow after navigation was corrected. The cause was in the plugin layout CSS, not in the Hyland shell: the custom shell allowed visible X overflow, several grid/flex containers kept their default minimum content width, and the phase navigation forced each step to reserve fixed width.

The fix is intentionally scoped to the plugin:

- Keep the host and `.medical-records-experience` at `width: 100%`, `max-width: 100%`, `min-width: 0`, and clip only horizontal overflow.
- Use `min-width: 0` on the dashboard shell, grids, cards, rows, and menu item text so Automate's left navigation can resize the content area without pushing the viewport.
- If legacy phase navigation remains in the code temporarily, make it shrink inside the available width instead of creating an internal horizontal scrollbar. Product direction is to remove or demote it from the main overview.
- Do not hide global document overflow as a workaround. If horizontal scroll returns, inspect the plugin component first before changing global `body` or app-shell styles.

## Vertical Scroll Finding

On 2026-04-27, the remaining scroll issue was clarified as vertical scrolling inside the main medical-records panel, not horizontal scrolling. The plugin root was using `min-height: 100vh`, which is too tall inside the Hyland application chrome because the Workspace header already consumes part of the viewport. That can place the scroll on the wrong ancestor or leave the route content visually clipped.

The medical-records shell now owns the scroll inside the plugin panel:

- `:host` uses a viewport height minus the Workspace chrome header and hides overflow.
- `.medical-records-experience` uses `height: 100%` and `overflow-y: auto`.
- Keep this scoped to the plugin. Do not restore the old `min-height: 100vh` on the route host unless the Hyland shell structure changes.

User validation: after the CSS change, the user confirmed the vertical scroll works correctly in the browser. Future layout work should preserve this scroll ownership model unless the Hyland chrome/header height changes.

## Dashboard y cola de trabajo

The overview dashboard lists **open user tasks** for the `medical-records` process
(`CREATED` + `ASSIGNED`), aligned with native **My Tasks** — not background
`RUNNING` process instances.

- Service: `MedicalRecordsTaskQueryService` (`TaskListCloudService` + variables via `rootProcessInstanceId`).
- Row click → `/task-details-cloud/{taskId}` (form widgets execute the workflow stage).
- Bulk approve (custom overview only): select multiple tasks of the same type and complete eligible ones via `MedicalRecordsBulkTaskService` without opening each form. Eligibility reuses widget rules (`readyForAnalysis`, agent readiness, validate-rules issues).
- Configurable insight/metric widgets and builder: `docs/custom-ui/dashboard-widgets.md`.
- Process/subprocess/task model: `docs/custom-ui/processes-tasks-subprocesses.md`.
- CIC reference: `docs/custom-ui/reference-docs/hyland/Vibecoding.md`.
