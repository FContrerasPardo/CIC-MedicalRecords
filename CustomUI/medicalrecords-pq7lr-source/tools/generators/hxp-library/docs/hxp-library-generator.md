# HXP Library Generator

Custom Nx generator for creating Angular libraries that follow DDD (Domain-Driven Design) principles. It scaffolds a library with the correct project structure, tags, ESLint configuration, and dependency constraints.

## Usage

```shell
npx nx g @alfresco-dbp/tools:hxp-library --type=<type> --category=<category> --importPath=<path>
```

### Using the VS Code UI

You can also run the generator through the Nx Console UI in VS Code:

1. In the Explorer panel, **navigate to the folder** where you want the new library to be created (e.g., `libs/studio-hxp/project/settings`).
2. **Right-click** on that folder and select **Nx Generate**.
3. In the search input that appears, type **`hxp-library`** to find the generator.
4. Fill in the prompted fields (type, category, import path, etc.) using the guided form.

> **Important:** The folder you right-click on determines the directory where the library will be generated. Make sure you click at the correct path level.

### Quick examples

```shell
# Data-access library for Studio HxP
npx nx g @alfresco-dbp/tools:hxp-library \
  --type=data-access \
  --category=studio-hxp \
  --importPath=@hxp/studio-hxp/project/settings/data-access

# UI library for Studio Shared
npx nx g @alfresco-dbp/tools:hxp-library \
  --type=ui \
  --category=studio-shared \
  --importPath=@hxp/studio-shared/form-editor/field-picker/ui

# Utils library with external workstream scope
npx nx g @alfresco-dbp/tools:hxp-library \
  --type=utils \
  --category=studio-hxp \
  --importPath=@hxp/studio-hxp/idp/helpers/utils \
  --externalWorkstreamScope=idp
```

---

## Required Inputs

### `type` (required)

The DDD layer type of the library. This is the most important input — it determines the library's role in the architecture and what it is allowed to depend on.

| Value | Purpose | What belongs here | Can contain components? |
|---|---|---|---|
| `domain-shell` | Top-level entry point for an entire domain. Provides routing and lazy loading at the domain level. | Route configurations, lazy-loaded module wiring, domain-level orchestration. | No (delegates to feature-shells) |
| `feature-shell` | Entry point for a specific feature within a domain. Provides routing and lazy loading at the feature level. | Feature route configs, feature-level orchestration, page-level containers. | Yes (page-level containers) |
| `smart` | Container components that wire business logic to the UI. They inject services, manage state, and pass data down to `ui` components. | Container components, components that inject services, components with business logic. | Yes |
| `ui` | Purely presentational components. They receive data via `@Input()` / signal inputs and emit events via `@Output()` / output functions. No services, no state, no side effects. | Dumb/presentational components, reusable visual building blocks. | Yes |
| `data-access` | Services, state management, API clients, and data models. This is the layer that talks to backends and manages application state. | Angular services, NgRx stores/effects/selectors, API clients, data models/interfaces. | No |
| `utils` | Pure utility code with no Angular-specific dependencies (ideally). Helpers, constants, pipes, directives. | Pure functions, helper classes, constants, Angular pipes, Angular directives. | No |
| `external` | Cross-domain contracts. Interfaces, models, constants, and store actions that are shared across domain boundaries. | TypeScript interfaces, type definitions, constants, NgRx action definitions for cross-domain communication. | No |

### `category` (required)

The domain category the library belongs to. Used for tagging (`category:<value>`) and organizational grouping. Does **not** affect the file path.

| Value | Description |
|---|---|
| `adf-enterprise` | ADF enterprise extensions |
| `admin-apa` | Admin APA application domain |
| `admin-hxp` | Admin HxP application domain |
| `admin-shared` | Shared libraries across Admin apps |
| `content-ee` | Content EE (process extension) domain |
| `hxviewer` | HxViewer application domain |
| `shared` | Globally shared libraries |
| `shared-hxp` | Shared libraries specific to HxP |
| `studio-admin-shared` | Shared across Studio and Admin |
| `studio-admin-shared-hxp` | Shared across Studio and Admin (HxP-specific) |
| `studio-apa` | Studio APA application domain |
| `studio-hxp` | Studio HxP application domain |
| `studio-shared` | Shared libraries across Studio apps |
| `workspace-hxp` | Workspace HxP application domain |

> **Note:** Categories containing `shared` in the name automatically get an additional ESLint constraint preventing them from depending on app-specific categories (`studio-apa`, `studio-hxp`) and external workstream scopes (`idp`, `rpa`, `cicgov`).

### `importPath` (required)

The TypeScript import path for the library. The library name is automatically derived from this path.

- **Format:** `@hxp/{category}/{path-to-your-library}`
- The `@hxp/` prefix is stripped, and slashes are replaced with dashes to produce the project name.

**Example:**
```
--importPath=@hxp/studio-shared/process-editor/external
```
Produces:
- **Project name:** `studio-shared-process-editor-external`
- **Import in code:** `import { Something } from '@hxp/studio-shared/process-editor/external';`

---

## Important Inputs

### `buildable`

| Property | Value |
|---|---|
| Type | `boolean` |
| Default | `true` |
| Prompted | Yes |

Whether the library can be built independently and cached by Nx.

- **Recommended:** Always keep as `true` for better scalability and caching.
- **Constraint:** Buildable libraries can **only** depend on other buildable libraries. A non-buildable library cannot be consumed by a buildable one.
- When `true`, the generated ESLint config includes an `ignores` block for `package.json` to support dependency checks.

### `unitTestRunner`

| Property | Value |
|---|---|
| Type | `string` |
| Default | `jest` |
| Options | `jest`, `none` |
| Prompted | Yes |

The test runner to use for the library's unit tests.

- `jest` — Generates Jest configuration files and a test setup.
- `none` — Skips test runner setup entirely. Use for libraries that don't need their own tests (e.g., pure type definitions).

### `externalWorkstreamScope`

| Property | Value |
|---|---|
| Type | `string` |
| Default | `none` |
| Options | `none`, `idp`, `cicgov`, `rpa`, `ai` |
| Prompted | Yes |

Adds an additional `scope:<value>` tag to the project for cross-team boundary enforcement.

- When set to anything other than `none`, the tag `scope:{value}` is added to the project's tags.
- Shared-category libraries are automatically prevented from depending on `scope:idp`, `scope:rpa`, and `scope:cicgov`.

---

## Optional Inputs

### `routing`

| Property | Value |
|---|---|
| Type | `boolean` |
| Default | `false` |

Adds router configuration to the library. Typically used with `domain-shell` or `feature-shell` types.

### `lazy`

| Property | Value |
|---|---|
| Type | `boolean` |
| Default | `false` |

When `true`, configures the library for lazy loading with `loadChildren`. When `false`, uses a simple array of routes.

---

## Internal Inputs (rarely changed)

These inputs have sensible defaults and are typically not modified. They exist for advanced use cases or internal tooling.

| Input | Type | Default | Description |
|---|---|---|---|
| `directory` | `string` | `libs/{category}` | Override the directory where the library is generated. |
| `publishable` | `boolean` | `false` | Generate a publishable library (with a public npm package). |
| `compilationMode` | `string` | `full` | Angular compilation mode. Always `full` for buildable libraries. |
| `prefix` | `string` | `hxp` | Selector prefix for components/directives. Always `hxp`. |
| `skipFormat` | `boolean` | `false` | Skip automatic code formatting after generation. |
| `simpleModuleName` | `boolean` | `false` | Keep the module name simple when using `--directory`. |
| `flat` | `boolean` | `true` | Generate files at the library root without a nested `src` folder. |
| `addModuleSpec` | `boolean` | `false` | Add a module spec file. |
| `skipPackageJson` | `boolean` | `false` | Do not add dependencies to the root `package.json`. |
| `skipTsConfig` | `boolean` | `false` | Do not update `tsconfig.json`. |
| `skipModule` | `boolean` | `true` | Skip generating NgModule files (standalone-first approach). |
| `parentModule` | `string` | — | Path to a parent module to update with `loadChildren`/`children`. |
| `tags` | `string` | auto-generated | Custom tags. Leave empty to use auto-generated tags. |
| `strict` | `boolean` | `true` | Strict type checking and build optimization. |
| `linter` | `string` | `eslint` | Lint tool. Always `eslint`. |
| `standaloneConfig` | `boolean` | `true` | Use `project.json` instead of `workspace.json`. |
| `setParserOptionsProject` | `boolean` | `true` | Configure ESLint `parserOptions.project` for type-aware linting. |

---

## Auto-Generated Tags

Every library is automatically tagged with three tags in its `project.json`:

| Tag | Example | Purpose |
|---|---|---|
| `scope:{projectName}` | `scope:studio-hxp-project-settings-data-access` | Uniquely identifies the project for fine-grained ESLint boundary rules. |
| `type:{type}` | `type:data-access` | Identifies the DDD layer for architectural dependency enforcement. |
| `category:{category}` | `category:studio-hxp` | Groups the project by domain for category-level constraints. |

If `externalWorkstreamScope` is set (not `none`), an additional tag is added:

| Tag | Example |
|---|---|
| `scope:{externalWorkstreamScope}` | `scope:idp` |

---

## DDD Dependency Rules

The generator automatically configures ESLint `@nx/enforce-module-boundaries` rules based on the library type. These rules enforce the correct dependency direction per DDD layered architecture:

```
domain-shell / feature-shell
        ↓
      smart
        ↓
   ui    data-access
        ↓
   utils / external
```

### Forbidden dependencies by type

| Library Type | Cannot Depend On | Rationale |
|---|---|---|
| `data-access` | `smart`, `ui`, `feature-shell`, `domain-shell` | Data layer must not know about presentation or orchestration layers. |
| `smart` | `feature-shell`, `domain-shell` | Container components must not depend on routing/orchestration layers. |
| `ui` | `smart`, `data-access`, `feature-shell`, `domain-shell` | Presentational components must be pure — no services, no state, no routing. |
| `utils` | `smart`, `ui`, `data-access`, `feature-shell`, `domain-shell` | Utilities must be self-contained with no app-layer dependencies. |
| `external` | `smart`, `ui`, `data-access`, `feature-shell`, `domain-shell` | Cross-domain contracts must only contain types, interfaces, and constants. |
| `domain-shell` | _(no type restrictions)_ | Top-level orchestration can depend on anything below it. |
| `feature-shell` | _(no type restrictions)_ | Feature orchestration can depend on anything below it. |

### Example: generated ESLint constraint for a `data-access` library

```javascript
{
    sourceTag: 'type:data-access',
    notDependOnLibsWithTags: ['type:smart', 'type:ui', 'type:feature-shell', 'type:domain-shell'],
}
```

---

## What the Generator Creates

When you run the generator, it:

1. **Scaffolds the Angular library** via `@nx/angular:library` under the resolved directory.
2. **Configures `project.json`** with the correct name, tags (`scope:`, `type:`, `category:`), and targets.
3. **Generates `eslint.config.mjs`** with:
   - Component selector rules (for `smart` and `ui` types only, using the `hxp` prefix).
   - `@nx/enforce-module-boundaries` with DDD-based `notDependOnLibsWithTags` constraints.
   - Category-level constraints for shared libraries.
   - Banned external imports (e.g., ADF packages) for non-process-extension categories.
   - `@nx/dependency-checks` for JSON files.
4. **Adds common files** (barrel exports, etc.).
5. **Configures the test runner** (Jest setup if selected).
6. **Updates `tsconfig.adf.json` and `tsconfig.base.json`** with the new library path mappings.
