# Reporting dashboard bindings (OnBase-style)

This document maps Hyland OnBase Reporting Dashboard concepts to the Medical Records dashboard builder **data bindings** model.

## OnBase concepts

| OnBase | Medical Records binding | Widget |
|--------|-------------------------|--------|
| Data Provider (query + columns) | `dataSource` + `contentQuery` / `processQuery` + **Detect fields** | metric, chart, table |
| Arguments | `bindings.argumentField` | chart |
| Values (count) | `bindings.valueAggregation: 'count'` | metric, chart |
| Values (sum) | `bindings.valueAggregation: 'sum'` + `bindings.valueField` | metric, chart |
| Series | `bindings.seriesField` (stored; aggregation v1.1) | chart |
| Columns | `bindings.columnFields[]` (ordered) | table |
| Date bucket | `bindings.dateBucket` when argument is `date` | chart |

## Builder flow

1. Select a **metric**, **chart**, or **table** widget on the canvas.
2. In the **Data provider** panel, choose `demo`, `content`, or `process` and configure the query.
3. Click **Detect fields** to load `DashboardFieldDescriptor[]` (`date`, `number`, `category`).
4. Drag fields into **Data items** slots:
   - **Chart**: Arguments (date/category) → Values (count or sum + numeric field) → Series (optional, saved only).
   - **Metric**: Values (count uses query `totalCount`; sum aggregates rows).
   - **Table**: Columns (any fields, multi-drop, order preserved).
5. Edit **title** / **helper** in the widget properties panel.
6. **Save layout** → `localStorage` key `medical-records.dashboard.layout.v4`.

## Slot validation

| Slot | Accepted field kinds |
|------|----------------------|
| Arguments | `date`, `category` |
| Values (sum) | `number` |
| Values (count) | no field required |
| Series | `category` |
| Columns | any |

## Runtime

- [`dashboard-widget-bindings.mapper.ts`](../CustomUI/medicalrecords-pq7lr-source/libs/plugins/medical-records/src/lib/dashboard/mappers/dashboard-widget-bindings.mapper.ts) — `resolveChartConfig()`, `resolveTableColumnKeys()`, legacy `chart.*` sync.
- [`DashboardWidgetRegistryService`](../CustomUI/medicalrecords-pq7lr-source/libs/plugins/medical-records/src/lib/dashboard/services/dashboard-widget-registry.service.ts) — reads `bindings` first, falls back to `chart.*`.
- Layout normalization migrates existing `chart` config into `bindings` on load.

## Legacy chart config

Existing layouts with `chart.xField`, `chart.yAggregation`, etc. continue to work. On normalize/save, equivalent `bindings` are written and `chart` is kept in sync for backward compatibility.

## Out of scope (v1)

- OnBase permissions and runtime parameters
- Cross-filter between widgets
- Series aggregation in charts (UI slot visible; runtime uses Arguments + Values only)
- Stimulsoft chart type parity

## Reference

- Lab: [`docs/Reporting dashboard/Hand on Lab.docx`](../Reporting%20dashboard/Hand%20on%20Lab.docx)
- Widget overview: [`dashboard-widgets.md`](./dashboard-widgets.md)
