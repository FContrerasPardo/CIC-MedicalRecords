# Agente de preanálisis documental: alta y cableado en Automate

Para la entrega del 24-11 (#146). La definición del agente está en `docs/automate/agents/preanalisis-documental.agent.json`. Copia la forma de los agentes del proyecto (Coding Integrity, Compliance Alert, Financial Variance) y la salida de CIC-Fin (`agentResponseJSON`).
Datos de ejemplo solo sintéticos.

## 1. Crear el agente en Studio
1. En el proyecto «OMEGA BUILDER - Latam Medical Billing», crea un agente nuevo de tipo *task*, llamado **Preanalisis Documental Agent**.
2. Copia del JSON los campos `jobDescription`, `behaviorAndConstraints`, `inputSchema` y `outputSchema`, junto con el modelo y los parámetros.
3. Anota la **key** que asigna Studio, por ejemplo `preanalisis-documental-xxxxx`. Va en el conector del paso 3.

## 2. Variables del proceso raíz `medical-records`

| Variable | Tipo | Valor inicial |
|---|---|---|
| `documentationChecklist` | json | El contenido del checklist de Appdata (`/MedRec/Appdata/Checklists/documentation-checklist.json`), que se descarga desde Convenios. En v1 es una constante; cuando exista un conector de contenido, se lee desde Appdata. |
| `externalVerifications` | json | `{}`. Lo llenará la simulación de interoperabilidad; en v1 puede quedar vacío. |
| `preanalysisLanguage` | string | `es` |
| `docSummary` | json | — (lo llena el script `docs/automate/doc-summary.script.js`) |
| `SdocSummary`, `SdocumentationChecklist`, `SexternalVerifications`, `SpreanalysisResult` | string (local) | — |
| `preanalysisResult` | json (salida) | — |

## 3. Pasos nuevos entre «Document IA» y «Nueva Cuenta»
Deben ir en orden y repetirse también después de «Document IA New Docs» → «Append Documents», antes de volver a «Nueva Cuenta»:
0. Script nuevo **docSummary** (contenido de `docs/automate/doc-summary.script.js`): entradas `batchState` y `accountSummary`, salida `docSummary`. Va después del script de accountSummary, como el docSummary de CIC-Fin: versión compacta de batchState (clase, campos, tablas clave-valor y líneas de servicio por documento, agrupada por factura/paciente) para no pasarle al agente todo el ruido de IDP.
1. Script `jsontostring` (ya existe: `jsontostring-uyetl`): `in_Json = docSummary` → `SdocSummary`.
2. Script `jsontostring`: `in_Json = documentationChecklist` → `SdocumentationChecklist`.
3. Script `jsontostring`: `in_Json = externalVerifications` → `SexternalVerifications`.
4. Service task **Preanálisis documental**, con `implementation="agentic-task-bstla.AI_AGENT"`:
   - entradas:
     - `agent` = la key del paso 1;
     - `docSummary` = `SdocSummary`;
     - `documentationChecklist` = `SdocumentationChecklist`;
     - `externalVerifications` = `SexternalVerifications`;
     - `language` = `preanalysisLanguage`;
   - salida: `SpreanalysisResult` ← `preanalysisResult`.
5. Script `stringtojson` (ya existe: `stringtojson-9zrjb`): `in_String = SpreanalysisResult` → `preanalysisResult`.
   Ese script ya quita los bloques de código y vuelve a parsear un JSON que llega como string.

Mientras el agente corre, la página de radicación sigue mostrando «Procesando» porque «Nueva Cuenta» todavía no está abierta. Como el agente corre antes de abrir Intake, no hace falta otro estado de espera en el front.

## 4. Formulario de «Nueva Cuenta» (Intake): comentarios por hallazgo
Es el patrón de CIC-Fin (`saveReviewUserComment`):
1. Agrega al formulario un campo **Data table** (o un texto multilínea JSON) con id `preanalysisResultTable`. Sus columnas son ClassName, Status, Comment, InvoiceNumber, UserComment y Attended.
2. Mapeo de la tarea «Nueva Cuenta»:
   - entrada: `preanalysisResultTable` ← `preanalysisResult`;
   - salida: `preanalysisResult` ← `preanalysisResultTable`.
3. El front guarda el comentario del prestador en `UserComment` y `Attended=true` de la fila. Usa `saveTaskForm`, sin completar la tarea, y luego relee para confirmar. `providerFindingComments` se mantiene por compatibilidad mientras se migra.

## 5. Publicar
Haz *release* y despliega la aplicación. Luego radica una cuenta de prueba con documentos sintéticos y revisa en el diagnóstico flotante que aparezca `preanalysisResult (array)` en las variables del proceso.

## Comportamiento del front
- Lee `preanalysisResult`. Si no existe, usa el checklist determinista (`radication-preanalysis.util`), así que la demo no queda vacía si el agente falla o no está desplegado.
- Muestra cada fila en la etapa **Revisión** con su factura o paciente (`InvoiceNumber`), el estado, el comentario dividido en Verificado, Pendiente y Acción, los documentos (`DocumentIDs` → visor) y la caja de comentario.

## Cableado aplicado en V88 (2026-11-16, construido por el usuario)
- **Subproceso «Preanalysis»** (call activity entre «Document IA» y «Nueva Cuenta»):
  1. «Get Rules» lee `/MedRec/Appdata/Checklists/documentation-checklist.json` con `hxp-content-service.READ_FILE` y lo deja en `rules`.
  2. El agente recibe las entradas con expresiones `${x.toString()}`, sin scripts `jsontostring`.
  3. «Convert To Json» pasa `agentResponse` a `preanalysisResult`.
- **Guardas para valores vacíos:** `toString()` de una variable json sin valor envía `null` y el agente falla. Usa:
  - `${empty externalVerifications ? '[]' : externalVerifications.toString()}` (igual para `docSummary` y `rules`). No uses `"{}"` dentro de la expresión: el editor corta la expresión en la primera `}` y falla el parseo.
  - y un valor inicial `{}` en `externalVerifications` del proceso raíz.
- **Idioma:** `language` es una variable de entrada del proceso raíz. Como en CIC-Fin (campo `Text0djt39` «Language» del formulario de inicio, mapeado en el start event `language ← Text0djt39`), el valor llega por un campo del formulario de inicio:
  - campo de texto oculto `Text0aiukv` («Language») en «Document Upload» (hecho);
  - mapea en el start event `language ← Text0aiukv`.
  - El front lo envía solo si el formulario desplegado tiene ese campo, porque el servicio de formularios rechaza ids desconocidos.
- **Pendiente:**
  - «Append Documents» va directo a «Nueva Cuenta»: el preanálisis no se repite con documentos nuevos y `docSummary` no se recalcula.
  - `preanalysisResultTable` aún no está en el formulario de Intake.

## Revisión de V93 (2026-11-16)
- **Hecho:** valor inicial `{}` en `externalVerifications` (la guarda con `"{}"` falla al parsear; usa `'[]'`); «Append Documents» ya pasa por «Preanalysis Agent»; datatable `DataTable0hznuv` en Intake, mapeado de entrada y salida a `preanalysisResult`.
- **Bloqueante:** la tarea del agente en «Preanalysis» perdió su salida. Mapea `agentResponse ← preanalysisResult` (salida del agente); sin eso, «Convert To Json» recibe vacío y la página usa el checklist de respaldo.
- **Idioma:** el campo del formulario de inicio es `Text0aiukv`; el start event solo mapea `contents`. Agrega `language ← Text0aiukv`.
- **Documentos nuevos:** «Document IA New Docs» no devuelve `docSummary`, así que el preanálisis repetido usa el resumen viejo. Mapea `docSummary` y recalcula tras «Append Documents».
- **Comentarios:** `saveTaskForm` deja los comentarios en la variable de la tarea; el front la lee mientras Intake está abierta y `preanalysisResult` los recibe al completar.
- **Origen de `externalVerifications`:** hoy nadie la llena. Es una variable de entrada del proceso raíz con valor inicial `{}`. Las validaciones simuladas de la página solo se muestran en el front; no se escriben en Automate. Para que el agente las use, un script de Automate debe generarlas después de `docSummary`, con la misma lógica determinista del front.
- **Runtime 2026-11-17 («Incorrect request to Agent Builder service»):** el front envió `Text0aiukv` = `es`, pero el proceso raíz no tenía `language`, porque el start event no lo mapeaba. El agente recibió un `language` nulo. Arreglo: en el start event, `language ← Text0aiukv`. Además, en la tarea del agente usa `language` = `${empty language ? 'es' : language}` (valor), sin llaves en el texto.

## Política de preanálisis (2026-11-17, reemplaza al checklist como entrada del agente)
- Archivo: `docs/automate/policies/preanalysis-policy.json`. Mismo patrón que la política de CIC-Fin, con `profileSelection`, `evidenceRules` y `profiles`. Los nombres de clase son los de IDP.
- Perfiles:
  - `SINGLE_INVOICE_FULL`, una factura: soporte clínico completo y validaciones cruzadas de paciente, factura, fechas, totales, autorización y afiliado.
  - `MULTI_INVOICE_INVOICE_ONLY`, varias facturas: solo la factura de cada paciente.
- El agente devuelve además una fila por cada clase entregada que no se exige (`RuleId` `DELIVERED`), con las validaciones que hizo.
- **En Automate:**
  1. Sube el JSON a `/MedRec/Appdata/Policies/preanalysis-policy.json`.
  2. En «Preanalysis» → «Get Rules», cambia la ruta a ese archivo. La entrada del agente sigue llamándose `documentationChecklist`.
  3. En Studio, actualiza `behaviorAndConstraints` y la descripción de la entrada con `docs/automate/agents/preanalisis-documental.agent.json`.
- El checklist de Convenios (`/MedRec/Appdata/Checklists/documentation-checklist.json`) se mantiene para la página de convenios y como respaldo.

## Convenios por prestador (2026-11-17, reemplaza las rutas globales)
- El checklist y la política ahora son por convenio, en `/MedRec/Appdata/Agreements/<agreementId>/`. Los archivos globales de `/Checklists` y `/Policies` quedan solo como respaldo de lectura.
- Rutas, qué archivo lee cada agente y cómo resolver el convenio del prestador en «Get Rules» y en Agent Mesh: [convenios-appdata.md](convenios-appdata.md).
