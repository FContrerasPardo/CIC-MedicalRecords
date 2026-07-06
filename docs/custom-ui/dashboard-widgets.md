# Dashboard widgets configurables



Overview del sistema de widgets del tablero Medical Records: layout, fuentes de datos y builder.



## Secciones del overview



Orden por defecto (layout v4):



1. **Indicadores** (`section: insights`) — tarjetas grandes y gráficas

2. **Métricas** (`section: metrics`) — KPIs compactos

3. **Tareas abiertas** (`section: tasks`) — lista real desde Automate



## Título y helper (texto libre)

Los widgets usan un único `title` y `helper`. El usuario escribe el texto en el idioma que prefiera:

```json
"title": "Open Tasks",
"helper": "Tasks assigned to you or ready to claim."
```

En runtime se muestra con el pipe `dashboardWidgetText` (texto configurado → fallback `titleKey` legacy).



## Widget Open Tasks (`process-list`)



- **Sin data source**: siempre consulta tareas abiertas vía `MedicalRecordsTaskQueryService`.

- Editor dedicado con toggles: búsqueda, refresh, bulk approve, subtítulo, badge de conteo.

- `processListOptions` en el layout.



## Fuentes de datos (metric, chart, table)



| Badge | Significado |

|-------|-------------|

| **Content** | Consulta CMIS/Content (`contentQuery`) vía `SearchService` |

| **Process** | Instancias de proceso vía `ProcessListCloudService` |

| **Demo** | Valor estático (`demoValue`) — fallback si la query falla o no está configurada |

| **Table** | Reporte plano con filas/columnas — ideal para explorar qué devuelve una query |



Implementación:



- [`ContentQueryDataProvider`](../CustomUI/medicalrecords-pq7lr-source/libs/plugins/medical-records/src/lib/dashboard/providers/content-query-data.provider.ts)

- [`ProcessQueryDataProvider`](../CustomUI/medicalrecords-pq7lr-source/libs/plugins/medical-records/src/lib/dashboard/providers/process-query-data.provider.ts)

- [`DashboardWidgetRegistryService`](../CustomUI/medicalrecords-pq7lr-source/libs/plugins/medical-records/src/lib/dashboard/services/dashboard-widget-registry.service.ts)



Widget de referencia con datos reales: **Repository Documents** (`document-volume`) con `SELECT * FROM hxp:document`.



## Widget histograma (`chart`)



Configura ejes mediante **bindings** (estilo OnBase Reporting Dashboard) o legacy `chart.*`:



| Binding | Rol |
|---------|-----|
| `bindings.argumentField` | Eje X (fecha o categoría) |
| `bindings.valueAggregation` | `count` o `sum` |
| `bindings.valueField` | Campo numérico cuando Y es suma |
| `bindings.dateBucket` | Agrupación temporal cuando argument es `date` |
| `bindings.seriesField` | Segmentación (guardado; agregación en v1.1) |



1. **Detect fields** — infiere columnas desde filas de la query.
2. Arrastra campos a **Arguments** y **Values** en el panel Data binding del builder.
3. Sin `argumentField` o con `demo`, muestra barras de demostración.



Ver [`reporting-dashboard-bindings.md`](./reporting-dashboard-bindings.md) para el mapping completo OnBase ↔ bindings.

**Max X-axis buckets** (`bindings.maxBuckets`, default 12): límite de intervalos/categorías en el eje X (p. ej. 12 semanas), no el total de filas de la query.

**Tema y colores:** ver [dashboard-design-guide.md](./dashboard-design-guide.md). Degradado por defecto morado → azul → verde Hyland; override por widget con `chartSeriesStyle`.

Mappers: `dashboard-field-schema.mapper.ts`, `dashboard-chart.mapper.ts`, `dashboard-widget-bindings.mapper.ts`.



## Widget tabla (reporte plano)



Tipo `table` en la paleta del builder. Muestra hasta **N filas** con **todas las columnas** detectadas en la respuesta (máx. 24 columnas).



| Data source | Qué filas trae |

|-------------|----------------|

| `content` | Documentos del CMIS query (`sys_id`, `sys_title`, etc.) |

| `process` | Instancias de proceso (`id`, `name`, `status`, `processDefinitionKey`, …) |

| `demo` | 2 filas de ejemplo |



Campos en el editor:



- **Rows to fetch** (`tablePageSize`, default 25)
- **Columns** — arrastra campos al slot **Columns** (`bindings.columnFields[]`); legacy `tableColumnKeys` sigue soportado



### Ayuda integrada en el builder



Al elegir **Data source = content** o **process**, el panel **Data provider** muestra presets y la query.



## Builder



Ruta: `/medical-records/configure` — enlace **Configure reports** en el **hero** del overview (no en el header superior).



Layout del builder: **Palette | Data binding | Widget properties | Canvas**



- Paleta: agregar metric, chart, **table** o open tasks
- **Data binding**: proveedor de datos + drag-and-drop a Arguments / Values / Series / Columns
- **Widget properties**: título, helper, toggles de Open Tasks
- Canvas: reordenar con drag-and-drop (CDK) dentro y entre secciones
- **Guardar layout** → `localStorage` clave `medical-records.dashboard.layout.v4` (lee v3 legacy)
- **Reset demo layout** → restaura defaults



Hero del overview y builder usan el patrón **page-hero** (eyebrow azul, título grande, barra vertical).



## Formato del layout (localStorage)



```json

{

  "widgetOrder": ["document-volume", "recovery-rate", "...", "process-list"],

  "widgets": {

    "document-volume": {

      "id": "document-volume",

      "type": "metric",

      "section": "insights",

      "dataSource": "content",

      "contentQuery": "SELECT * FROM hxp:document",

      "title": "Repository Documents"

    },

    "process-list": {

      "id": "process-list",

      "type": "process-list",

      "section": "tasks",

      "title": "Open Tasks",

      "processListOptions": {

        "showSearch": true,

        "showRefresh": true,

        "showBulkActions": true,

        "showSubtitle": true,

        "showCountBadge": true

      }

    }

  }

}

```



## Tema global del dashboard

`DashboardLayoutState.theme` persiste acento, degradado de series y paleta. Configurable en el builder (**Dashboard appearance**). CSS variables aplicadas en overview y builder.

## Widgets nuevos (v5)

| Tipo | Descripción |
|------|-------------|
| `link-card` | Tarjeta con icono, título y CTA; ruta interna o URL externa |
| `task-status-summary` | Barras por estado (CREATED / ASSIGNED); no reemplaza Open Tasks |
| `task-recent-list` | Lista compacta de N tareas recientes con badges |

Open Tasks (`process-list`) sigue siendo el widget completo con búsqueda, refresh y bulk actions.

## Header / hero



- **Agreement Configuration** → `/medical-records/agreements` (placeholder) — header superior
- **Configure reports** → builder — botón en el **page-hero** del overview
- **New Intake** → hero (overview) o header (otras fases)



## Roadmap



- Process query avanzado (filtros por variables)

- Persistencia server-side del layout

- Resize libre de celdas (paridad Kibana)


