# Dashboard design guide (Hyland)

Visual and configuration guidelines for the Medical Records reporting dashboard.

See also: [dashboard-widgets.md](./dashboard-widgets.md).

## Brand palette

Primary secondary colors from Hyland brand guidelines:

| Token | Hex | Usage |
|-------|-----|--------|
| Hyland Purple | `#6E33FF` | Primary accent, icons, chart gradient start |
| Hyland Blue | `#52A1FF` | Chart gradient mid-tone, secondary series |
| Hyland Teal | `#13EAC1` | Chart gradient end, success / created status |
| Hyland Yellow | `#F1CB61` | Highlights (use sparingly) |
| Hyland Dark Blue | `#191F5E` | Headings, body text on light surfaces |
| Hyland Gray | `#F4F6FE` | Card backgrounds, track fills |

**Rule:** Secondary colors elevate content; they should not dominate large surfaces. Prefer white cards on `#F4F6FE` page background with purple accents.

## Default series gradient

Bars and progress tracks default to:

`linear-gradient(180deg, #6E33FF 0%, #52A1FF 55%, #13EAC1 100%)`

Configured globally in the dashboard builder under **Dashboard appearance**, stored in `layout.theme.defaultSeriesStyle`.

## CSS variables

Applied on the dashboard host (overview + builder) via `DashboardThemeService`:

| Variable | Description |
|----------|-------------|
| `--dash-brand-purple` | Hyland purple |
| `--dash-brand-blue` | Hyland blue |
| `--dash-brand-teal` | Hyland teal |
| `--dash-accent` | Primary accent (default purple) |
| `--dash-series-gradient` | Default bar/progress gradient |
| `--dash-brand-dark-blue` | Text on light backgrounds |
| `--dash-brand-gray` | Muted surfaces |

Per-chart override: `widget.chartSeriesStyle` in the widget editor appearance panel.

## Widget patterns

### Link card (`link-card`)

White card, circular purple icon, title + helper, pill outline CTA. Supports internal route or external URL.

### Task status summary (`task-status-summary`)

Horizontal bars grouped by task status (CREATED / ASSIGNED). Uses theme palette for bar fills. Does **not** replace Open Tasks.

### Task recent list (`task-recent-list`)

Compact list with status badges colored from `theme.statusColors`. Footer CTA links to full task section.

### Chart (`chart`)

Uses global or per-widget series style. **Max X-axis buckets** (`maxBuckets`) limits how many intervals/categories appear on the X axis—not the raw row count from the query.

## Reference mockups

HTML demos under `UI design/` (legacy `#005EB8` accents). New dashboard work should use the Hyland 2025 palette above.

## Persistence

Theme is stored in `DashboardLayoutState.theme` (localStorage key `medical-records.dashboard.layout.v5`).
