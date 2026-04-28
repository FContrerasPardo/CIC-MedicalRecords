# Hyland Generator Reference

## Purpose

This note records the validation performed to compare the current `medical-records` plugin against the official Hyland generators documented in `GLS-Creating a Plugin Page`.

The goal was to answer whether we should replace the manually adjusted plugin with generated Hyland scaffolding, or keep the current plugin and selectively adopt missing generator patterns.

## Commands Used

The validation was intentionally executed with `--dry-run` because the current workspace had active medical-records changes. Running the generators without dry-run would modify shared workspace files such as `apps/workspace-hxp/project.json`, `nx.json`, `tsconfig.base.json`, `tsconfig.adf.json`, and `libs/plugins/index.ts`.

```powershell
$nodeBin = 'C:\Users\ferch\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin'
$env:PATH = "$nodeBin;$env:PATH"
$env:NX_DAEMON = 'false'
$env:NX_ISOLATE_PLUGINS = 'false'

& "$nodeBin\node.exe" ".\node_modules\nx\bin\nx.js" generate @hyland/extend:plugin hyland-reference --author "CIC Reference" --addTranslations true --dry-run --skipFormat

& "$nodeBin\node.exe" ".\node_modules\nx\bin\nx.js" generate @hyland/extend:page medical-records hyland-reference-page --dry-run
```

As with other Nx commands in this template, these commands must run outside the IA sandbox on local Windows.

## Official Plugin Generator Output

Dry-run output for `@hyland/extend:plugin` showed that the official scaffold creates:

- `libs/plugins/<plugin>/project.json`
- `libs/plugins/<plugin>/README.md`
- TypeScript library configs.
- Jest config and test config.
- ESLint config.
- `src/index.ts`.
- `src/lib/<plugin>.module.ts`.
- `assets/README.md`.
- `assets/i18n/{de,en,es,fr,it,pl,pt}.json` when `--addTranslations true` is used.

It also updates:

- `package.json`
- `nx.json`
- `tsconfig.base.json`
- `tsconfig.adf.json`
- `apps/workspace-hxp/project.json`
- `libs/plugins/index.ts`

The important translation behavior from `--addTranslations true` is implemented by:

```ts
TranslateModule
provideTranslations('<plugin>', 'assets/<plugin>')
```

## Official Page Generator Output

Dry-run output for `@hyland/extend:page` showed that the official scaffold creates:

- `src/lib/pages/<page>/<page>-menu-item.component.ts`
- `src/lib/pages/<page>/<page>.component.ts`
- `src/lib/pages/<page>/<page>.module.ts`
- `configs/<plugin>.extension.config.json`

It also updates:

- `src/lib/<plugin>.module.ts`

The generated page component is intentionally minimal:

```ts
@Component({
    template: `<plugin-page-selector> Works! {{ 'PLUGIN_MESSAGE' | translate }}`,
    selector: '<plugin-page-selector>',
    imports: [TranslateModule],
    standalone: true,
})
export class <PageClassName> {}
```

The generated page module registers the page and menu item components through `ExtensionService.setComponents(...)`.

The generated menu item is also minimal. It renders a Material button and navigates to a top-level route matching the page name, for example `/reports`.

## Comparison With Current Medical Records Plugin

Current `medical-records` already has the core plugin wiring expected from the plugin generator:

- Nx project registration.
- `workspace-hxp` asset registration.
- `libs/plugins/index.ts` module registration.
- `tsconfig.base.json` and `tsconfig.adf.json` aliases.
- `TranslateModule`.
- `provideTranslations('medical-records', 'assets/medical-records')`.
- `assets/i18n` dictionaries.
- Extension config loaded with `provideExtensionConfig(['medical-records.extension.json'])`.

Current `medical-records` intentionally differs from the generated page pattern:

- It keeps all phase routes under `/medical-records` and `/medical-records/:phase`.
- It keeps one custom navigation item for the Automate sidenav: `medical-records.sidenav`.
- It includes auth guards on the route config.
- It uses the Hyland shell layout through `layout: app.layout.main`.
- It keeps Stitch phase navigation inside the page, not as separate top-level Automate pages.

## Functional Findings

The official page template does not provide additional process, repository, authentication, or rich UI functionality by itself. It provides a clean registration pattern for a simple page contribution.

The most relevant difference is architectural:

- Official page generator: creates separate page modules and extension config entries for top-level generated pages.
- Current medical-records plugin: creates a single medical-records experience with internal phase navigation.

For this project, the current approach better matches the Stitch designs because Overview, Intake, Analysis, Approval, Execution, Review, and Completed are internal process phases, not independent Automate sidenav entries.

## Recommendation

Do not replace the current `medical-records` implementation with the generated page template.

Recommended path:

- Keep `medical-records` as the working plugin base.
- Keep the custom `medical-records.extension.json` because it already registers the desired Automate nav item and guarded `/medical-records` route.
- Continue migrating Stitch screens into `medical-records-shell`.
- Borrow generator patterns selectively when useful:
  - standalone page/component registration style,
  - dedicated `PageModule` if a future feature needs an independent page,
  - translation-first templates,
  - generated i18n dictionaries,
  - official extension config structure for future top-level pages.

If a true generator-based reference is needed later, create it only after committing or stashing current work, or generate it in an isolated copy/worktree. Do not run the real generator in the dirty main workspace.
