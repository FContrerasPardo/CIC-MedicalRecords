# Mapeo de procesos (Custom UI)

El plugin `medical-records` identifica los procesos de Automate por su **key** de definición (el id del proceso BPMN, por ejemplo `Process_1777481415500`). El nombre visible puede cambiar en Automate. Por ejemplo, el proceso raíz se mostró como «Radicación» durante varias versiones, después de añadir un pool al BPMN. Por eso el nombre solo se usa como respaldo.

Código: `CustomUI/medicalrecords-pq7lr-source/libs/plugins/medical-records/src/lib/dashboard/definitions/process-mapping.ts`.

## Mapeo por defecto

Valores tomados del export de Automate (versión 105) y del diagnóstico del runtime:

| Rol | Keys | Nombres |
| --- | --- | --- |
| `root` | `Process_1777481415500` | `medical-records`, `Radicación` |
| `documentAi` | `Process_1767797409502` | `Document AI Process` |
| `agentMesh` | `Process_1777579089863`, `agentmesh-hk5kb` | `AgentMesh` |
| `initializeBatch` | `Process_1753464285348` | `initialize-batch` |
| `preanalysis` | `Process_1794866470316` | `Preanalysis` |

La primera key de cada rol es la **key canónica**: es la que guardan los widgets nuevos. `matchesProcessRole(row, role, mapping)` acepta la key o el nombre. Ignora mayúsculas y espacios, y prueba la key antes que el nombre.

## Cómo se usa

- **Consultas del Query service.** `/query/v1/process-instances/search` y `/query/v1/tasks/search` solo filtran la definición por `processDefinitionName`. Lo comprobamos en `ProcessListCloudService.buildQueryData` y `TaskListCloudService.buildQueryData` de `@alfresco/adf-process-services-cloud`: ninguno envía `processDefinitionKey`. Por eso la UI hace dos cosas:
  1. Envía al servidor todos los nombres conocidos del rol. Para la raíz son `medical-records` y `Radicación`.
  2. En el cliente, acepta cada fila por key o por nombre a través del mapeo. Una fila con la key de la raíz nunca se descarta, aunque su nombre no coincida.
- **Radicación.** Arranca siempre la definición raíz más reciente con formulario de inicio. Primero busca por key y solo usa el nombre si ninguna definición coincide por key. Los subprocesos del mapeo quedan excluidos. Si no hay coincidencia, no se arranca nada.
- **Progreso, vista de caso y tareas.** Los subprocesos (Document AI, AgentMesh, initialize-batch, Preanalysis) se reconocen por rol, no por un nombre fijo.
- **Vista técnica.** Registra el mapeo efectivo y su origen (`default`, `layout` o `widget`). También cuenta cuántas filas se aceptaron por key y cuántas por nombre en cada consulta de procesos.

## Cómo configurarlo

### Por widget (lugar principal)

En el constructor del dashboard (`#/medical-records/configure`), abre el widget y ve al panel de datos (`dashboard-builder-data-binding`), con la fuente `process`:

- El selector de proceso raíz lista las definiciones desplegadas con nombre, key y versión. El widget guarda la key en `processQuery.processDefinitionKey` y el nombre desplegado en `processQuery.processDefinitionName`.
- Las fichas de subprocesos muestran los roles del mapeo con la definición desplegada. Se guardan por key en `processQuery.includedSubprocessDefinitionKeys`.
- Los layouts antiguos que guardan nombres, como `processDefinitionKey: 'medical-records'` o `includedSubprocessDefinitionKeys: ['AgentMesh']`, siguen funcionando porque se resuelven por el mapeo a la key real. Si el valor guardado no es la key de una definición desplegada, el panel muestra un aviso y propone la definición equivalente por key.

### Por layout (respaldo global)

El layout guardado en el repositorio (`/MedRec/Appdata/Dashboards`) admite un campo opcional `processMapping`. Las listas que se indiquen para un rol **sustituyen** las de ese rol; los roles que se omitan conservan los valores por defecto:

```json
{
  "processMapping": {
    "root": { "keys": ["Process_1777481415500"], "names": ["medical-records", "Radicación"] }
  }
}
```

El override se aplica al cargar el layout y afecta a todo lo que no es un widget: la lista de tareas, la vista de caso y la radicación, si se abre en la misma sesión.

No añadimos un archivo propio (`process-mapping.json`) porque el layout ya se guarda y se carga desde el repositorio. La key de la raíz es estable entre despliegues, así que los valores por defecto del código cubren la radicación aunque no se haya cargado ningún layout.

## Si Automate cambia keys o nombres

- **Cambia solo el nombre** (por ejemplo, otra vez «Radicación»). No hace falta hacer nada para las filas: se aceptan por key. Para que el servidor devuelva las instancias con el nombre nuevo, añade ese nombre a `names` del rol, en el código o en `processMapping` del layout.
- **Cambia la key** (por ejemplo, porque se importó un BPMN nuevo). Pon la key nueva primero en `keys` del rol y deja la antigua detrás mientras queden instancias suyas. Después, en cada widget, acepta la definición equivalente que propone el aviso.
- **Proceso nuevo** que no está en el mapeo. Elígelo en el selector del widget, que guarda su key y su nombre. Si otras pantallas lo necesitan, añade un rol al mapeo en el código.

Comprueba el resultado en la vista técnica: origen del mapeo, nombres enviados, keys comprobadas y filas aceptadas por key o por nombre.
