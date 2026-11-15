# Modelo de la demo: ARS y prestador

Fecha: 2026-11-12. Fuente: explicación directa del usuario. Este documento manda
sobre cualquier interpretación previa de las capturas de Oncopilot/OncoTask.
Solo datos sintéticos; no copiar nombres ni identificaciones de los datos de demo.

## Qué se está construyendo

Un solo plugin (`medical-records`) y un solo proyecto de Automate que muestran
**dos escenarios**, visibles u ocultos según el **rol elegido en un selector de
demo** (no ligado a roles reales):

| Escenario | Estado | Qué muestra |
| --- | --- | --- |
| **ARS (aseguradora)** | Flujo construido en Automate (`Automate/OMEGA BUILDER - Latam Medical Billing CUI/`) | Recibe cuentas médicas de uno o muchos prestadores, las inspecciona y audita; base para glosar |
| **Prestador (oncología)** | **No construido** en este proyecto, ni en Automate ni en interfaces. Referencia: `Automate/BR - Gestão Inteligente de Protocolo/` y las capturas de Oncopilot/OncoTask | Arma el expediente del paciente desde la atención del médico y subsana riesgos antes de enviar a la ARS |

Narrativa: un prestador envía un set de documentos con problemas, fáciles de
detectar y glosar (escenario ARS); otro prestador, con la tecnología, construye
el expediente con IA desde el inicio y evita la glosa (escenario prestador).

## Jerarquía de datos (escenario ARS)

```
Prestador  (1..n)   ← sale de las variables de proceso
  └─ Cuenta médica  (1..n)   ← lo que INICIA el proceso en Automate
       └─ Factura de cliente / paciente  (1..n)   ← dentro de la cuenta
            └─ Etapas de validación  ← las del flujo de Automate
```

- La unidad que inicia el proceso es la **cuenta médica**, no el paciente.
- Una cuenta puede traer **una o muchas facturas de cliente** (cada una de un
  paciente); cada factura tiene su validación. Decisión del usuario, 2026-11-13.
- **Selector de factura de cliente / paciente** al abrir la cuenta: si la cuenta
  tiene **una sola factura**, no se muestra selector y se abre directo la
  factura del paciente para continuar; con varias, el usuario elige una.
- Las etapas son las **del flujo de Automate**, no las de Oncopilot. No usar
  "Conformidad / Elegibilidad / Prontitud / Informe médico" en el escenario ARS:
  esos nombres son del escenario prestador.
- Hoy se prueba con **un solo prestador**: debe verse su información unificada.

## Centro de control de la ARS (lo que se construye ahora)

1. **Tarjetas de prestador**, obtenidas de las variables de los procesos, con KPI
   del proceso de ese prestador.
2. Al abrir un prestador: sus **cuentas médicas**.
3. Al abrir una cuenta: sus **facturas de cliente / pacientes** (selector; con una
   sola factura se abre directo), cada una como una línea con el resumen
   y **un icono por etapa de validación con semáforo** (bloqueante / atención /
   regular / no evaluado). La primera etapa es el **checklist documental**. Este
   patrón visual (línea de paciente + iconos) es lo único que se toma de
   `oncotask?view=pacientes`.
4. La experiencia **no salta a la tarea de Automate**: toma las variables del
   proceso y construye su propia interfaz dentro del plugin.

El dashboard y su configurador se reutilizan por sus conexiones a los helpers.
Vista y configurador deben mostrar lo mismo: todo lo visible en el centro de
control debe ser un elemento del layout, editable en el builder.

## Sin widgets: experiencia integrada (patrón CIC-Fin)

Decisión del usuario (2026-11-12): la prioridad es la experiencia integrada en
páginas del plugin. Iniciar procesos, abrirlos, interactuar con ellos y cargar
documentos se hace desde un servicio del plugin que usa los helpers nativos de
Automate, sin form widgets de tarea. Los widgets se retoman solo cuando la
experiencia completa exista, para que no queden fuera de sintonía.

"Sin widgets" no elimina las etapas de verificación: el proceso las conserva,
porque en ellas se toman decisiones. Lo que cambia es dónde se atienden: desde
las páginas del plugin, gestionando la tarea con los helpers (leer variables,
completar el formulario de la tarea), sin interfaces de widget embebidas en el
form.

Referencia verificada por inspección (no ejecutada): en
`C:\CIC-FIn\CustomUI\agenticbank-j5ez3\libs\plugins\agentic-bank` no hay form
widgets; `services/agentic-bank-process.service.ts` usa `StartProcessCloudService`,
`ProcessListCloudService`, `ProcessTaskListCloudService`,
`FormCloudService.completeTaskForm`, la consulta de variables por
`/query/v1/process-instances/...` y `HxpUploadService` para cargar documentos; sus
páginas construyen la interfaz desde las variables. CIC-Fin usa ADF 9.2 y este
proyecto ADF 8.5: contrastar cada API antes de portar.

## Refactor de widgets a páginas del plugin

| Hoy (form widget de tarea) | Destino |
| --- | --- |
| `form-widgets/intake-account-widget`: checklist documental, con reglas quemadas en código | Página de inspección de la cuenta médica |
| `form-widgets/analysis-task-widget`: análisis de riesgo (Agent Mesh ejecuta agentes sobre `batchState` y consolida análisis y puntaje, para apoyar la auditoría y glosar) | Página integrada del plugin |

### Decisión abierta: checklist documental

Hoy solo se presenta el `batchState`, con todos los servicios. Dos opciones:

- **A.** Panel de configuración de las reglas duras, guardado como archivo en
  Appdata, igual que los layouts del dashboard.
- **B.** Un agente que resume y compara contra una política, como los agentes de
  Agent Builder de CIC-Fin.

Sin decidir. No implementar ninguna hasta que el usuario elija.

## Escenario prestador (posterior)

Página propia dentro del plugin: centro de control paciente por paciente, con
calendario de visitas y el flujo agéntico que valida el histórico de
autorizaciones para armar la cuenta y enviarla a la ARS. El problema que resuelve
es la autorización del procedimiento. Requiere integrar el proyecto de Automate
del prestador en uno solo con el de cuentas médicas; ese trabajo no ha empezado.

## Lo que quedó desalineado (corte del 2026-11-12)

- La lista agrupa tareas en "filas de paciente" con etapas de Oncopilot; debe
  seguir la jerarquía prestador → cuenta → paciente y las etapas de Automate.
- La banda "Distribución" y otros elementos no existen en el builder.
- La fila abre el detalle de caso modelado sobre Oncopilot, que corresponde al
  escenario prestador, no al de la ARS.
