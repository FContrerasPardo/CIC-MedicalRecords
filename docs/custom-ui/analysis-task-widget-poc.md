# Analysis Task Widget POC

Fecha: 2026-04-29.

Este documento resume el estado actual del POC del widget personalizado para la
fase `Analysis` dentro de la arquitectura `medical-records`.

Nota de mantenimiento: la especificacion general de la demo y el paso a paso
end-to-end viven en `docs/medical-records-demo-process-specification.md`. Este
documento debe conservarse como anexo tecnico del widget `analysis-task-widget`.

Decision vigente: `analysis-task-widget` es la superficie real de la etapa
`Analysis` porque vive dentro del formulario de la tarea de Automate. La
navegacion por etapas del plugin general no debe usarse para ejecutar Analysis.
El plugin solo debe servir como overview y entrada hacia tareas activas.

Actualizacion 2026-05-03:

- El POC de tarjeta de caso ya evoluciono a la primera version real del widget
  de analisis.
- La UI real vive en el mismo custom widget Angular `analysis-task-widget`.
- El formulario de `Analysis` actualmente recibe unicamente el custom widget
  como campo visible/funcional.
- El contrato principal actual es un envelope generico producido por el script
  `BuildIncrementalUnifiedWidgetPayload.ts`.
- Automate debe mapear el campo unico del widget contra
  `unifiedWidgetPayloadText`.
- El flujo de Automate, el script de consolidacion y las actividades de agentes
  ya estan configurados para la primera version funcional.

## Objetivo del POC

Validar que una tarea real de Automate abierta en:

```text
/task-details-cloud/:taskId
```

pueda renderizar una UI personalizada usando un Custom Form Widget, sin perder
las acciones nativas del formulario (`Save`, `Cancel`, `Complete`).

El objetivo funcional actual es centralizar en la etapa `Analysis` los
resultados de la malla agentica, despues de la etapa `Nueva Cuenta` y de las
validaciones documentales previas.

## Implementacion actual en Angular

El widget se implemento dentro del plugin oficial:

```text
CustomUI/medicalrecords-pq7lr-source/libs/plugins/medical-records/
```

Archivos agregados o conectados:

```text
libs/plugins/medical-records/src/lib/form-widgets/analysis-task-widget/analysis-task-widget.component.ts
libs/plugins/medical-records/src/lib/form-widgets/analysis-task-widget/analysis-task-widget.component.html
libs/plugins/medical-records/src/lib/form-widgets/analysis-task-widget/analysis-task-widget.component.scss
libs/plugins/medical-records/src/lib/form-widgets/analysis-task-widget/analysis-task-widget.module.ts
libs/plugins/medical-records/src/lib/medical-records.module.ts
```

Comportamiento actual del widget:

- Extiende `WidgetComponent`.
- Lee `field.value` como JSON string u objeto JSON.
- Soporta el envelope generico producido por Agent Builder/Automate:
  `schemaVersion`, `agents`, `agentOrder`, `warnings`, `summary`.
- Resuelve las tarjetas funcionales por key, `agentKey`, `slotName`,
  `agentName` o nombre dentro de `result`.
- Mantiene fallback temporal a campos separados:
  `codingIntegrityResult`, `complianceAlertResult`,
  `financialVarianceResult`.
- Renderiza una consola interna de analisis con:
  - resumen de metricas
  - score de riesgo de glosa
  - tarjetas de Coding Integrity, Compliance Alert y Financial Variance
  - acciones recomendadas
  - tabla de billed items normalizada por `serviceCode`, `procedureCode` o
    `findingId`
- Si un agente falta, muestra `Pending agent result`.
- Si el script reporta JSON invalido en `warnings`, muestra
  `Invalid agent JSON` en la tarjeta correspondiente.
- La accion `Approve Proceed` queda bloqueada hasta que los tres agentes
  requeridos esten listos para aprobacion y ninguno requiera revision manual.

## Contrato de payload actual

El formulario de `Analysis` debe contener solo el campo custom
`analysis-task-widget`. Ese campo recibe en `field.value` el valor de
`variables.unifiedWidgetPayloadText`, generado por:

```text
docs/Agent Builder Config/BuildIncrementalUnifiedWidgetPayload.ts
```

Estructura general:

```json
{
  "schemaVersion": "incremental-widget-payload-envelope/v1",
  "agents": {
    "codingIntegrityAgent": {
      "status": "AVAILABLE",
      "slotName": "json1",
      "agentKey": "codingIntegrityAgent",
      "agentName": "Coding Integrity Agent",
      "result": {}
    }
  },
  "agentOrder": ["codingIntegrityAgent"],
  "warnings": [],
  "summary": {}
}
```

Mapeo funcional de v1:

| Tarjeta del widget | Resolucion esperada |
|---|---|
| Coding Integrity | `agentKey`/nombre con `coding` + `integrity`, fallback `json1` |
| Compliance Alert | `agentKey`/nombre con `compliance` + `alert`, fallback `json2` |
| Financial Variance | `agentKey`/nombre con `financial` + `variance`, fallback `json3` |

El envelope puede incluir mas agentes en el futuro. El widget v1 solo usa las
tres tarjetas funcionales anteriores, pero no rompe si aparecen otros agentes.

## Registro del widget en Angular

El widget quedo registrado con `FormRenderingService.register(...)`.

Estado actual del registro:

- alias principal: `analysis-task-widget`
- alias de compatibilidad: `analysis-task-widget-qixf4`

Motivo del doble alias:

- Inicialmente Studio genero una clave tecnica con sufijo aleatorio.
- Despues, en Automate, el `type` del widget fue normalizado manualmente a
  `analysis-task-widget`.
- Angular conserva ambos nombres para evitar roturas durante la prueba manual.

## Configuracion realizada en Automate / Studio Modeler

### 1. Proceso de negocio

El flujo principal se esta configurando sobre el proceso:

```text
medical-records
```

La prueba funcional esperada inicia creando una instancia del proceso mediante
la carga de un documento. Ese documento inicial sera usado como entrada de
prueba para disparar la cuenta medica y las validaciones posteriores.

### 2. Etapa `Nueva Cuenta` / Intake

Despues de iniciar el proceso, Automate crea la tarea:

```text
Nueva Cuenta
```

Esta tarea corresponde a la fase de intake. En esta etapa el usuario revisa la
cuenta inicial y puede cargar documentos adicionales antes de continuar.

Contexto actualizado de esta etapa:

- La etapa `Nueva Cuenta` ocurre antes de la malla agentica.
- El usuario puede completar la tarea cuando considera que la documentacion
  inicial esta lista.
- Al completar la tarea, el flujo decide si debe revalidar documentos o avanzar
  al analisis automatico.
- Esta etapa no renderiza la consola `analysis-task-widget`; su funcion es
  preparar o completar el material documental de la cuenta.

### 3. Bifurcacion posterior a Intake

Al completar `Nueva Cuenta`, pueden ocurrir dos caminos:

1. Reejecutar IDP sobre los documentos.
2. Continuar a la malla agentica.

El primer camino existe para los casos en los que el usuario agrego nuevos
documentos o se necesita volver a validar la cuenta contra la extraccion
documental. En ese caso, el flujo reejecuta IDP y actualiza el contexto de la
cuenta antes de decidir si puede avanzar.

El segundo camino continua directamente al analisis automatico cuando la cuenta
ya tiene suficiente informacion para que los agentes revisen codificacion,
cumplimiento y variaciones financieras.

### 4. Malla agentica

La malla agentica actual ejecuta tres agentes configurados en Agent Builder:

- `Coding Integrity Agent`, con outcome `codingIntegrityResult`.
- `Compliance Alert Agent`, con outcome `complianceAlertResult`.
- `Financial Variance Agent`, con outcome `financialVarianceResult`.

Cada outcome se mantiene como string JSON. El frontend no vuelve a ejecutar las
reglas de negocio; solo presenta y cruza los resultados producidos por los
agentes.

### 5. Script de consolidacion

Despues de la ejecucion de los tres agentes, Automate ejecuta:

```text
BuildIncrementalUnifiedWidgetPayload.ts
```

El script ya esta configurado como una pieza generica. Su responsabilidad es
recibir resultados JSON en `json1` a `json10`, preservar resultados previos si
existen, registrar warnings cuando un input es invalido y producir un envelope
unificado.

Mapeo actual recomendado:

```text
json1 = codingIntegrityResult
json2 = complianceAlertResult
json3 = financialVarianceResult
```

Salida que consume el widget:

```text
unifiedWidgetPayloadText
```

### 6. Formulario y tarea `Analysis`

La etapa `Analysis` centraliza el resultado de la malla agentica. El formulario
de esta etapa debe tener un unico campo funcional:

```text
analysis-task-widget
```

Ese campo recibe el JSON unificado:

```text
analysis-task-widget -> unifiedWidgetPayloadText
```

No se deben mapear como campos visibles separados:

```text
codingIntegrityResult
complianceAlertResult
financialVarianceResult
case_payload
caseJSON
```

El widget lee el envelope, resuelve los agentes por key/nombre/slot y convierte
esos resultados al modelo visual interno de tarjetas, metricas, acciones y tabla
de items facturados.

## Resultado validado

Resultado observado en la prueba manual inicial del POC:

- al crear una nueva instancia del proceso, se crea correctamente la tarea de
  usuario
- al abrir la tarea en `task-details-cloud`, el widget personalizado se
  visualiza correctamente
- las acciones nativas `CANCEL`, `SAVE` y `COMPLETE` permanecen visibles

Conclusion del POC:

- la arquitectura `dashboard custom + tarea real de Automate + custom form
  widget por fase` ya quedo validada para la fase `Analysis`

Resultado tecnico actual de la version real:

- el widget Angular ya implementa la consola interna basada en los resultados de
  agentes
- el contrato de entrada soporta el envelope generico con `agents`
- el fallback a campos separados se conserva solo para transicion
- el formulario de `Analysis` queda documentado como un formulario de un solo
  campo funcional: `analysis-task-widget`
- el flujo de Automate ya contempla intake, posible reejecucion IDP, malla de
  tres agentes, script generico y etapa `Analysis`
- la validacion de build/test/lint no se ejecuto como parte de estos cambios de
  documentacion

Validacion funcional pendiente:

- iniciar una instancia del proceso cargando un documento real de prueba
- completar la tarea `Nueva Cuenta`
- validar el camino de reejecucion IDP cuando se agregan documentos
- validar el camino directo hacia la malla agentica
- confirmar que `Analysis` recibe `unifiedWidgetPayloadText` y renderiza la
  informacion consolidada

## Limitaciones actuales

- La version actual esta orientada a lectura, visualizacion y decision; los
  botones internos son visuales y no mutan variables de Automate.
- El formulario actual de `Analysis` no debe depender de `case_payload` ni
  `caseJSON`; esos nombres pertenecen al POC inicial y quedan como referencia
  historica.
- El script de consolidacion es generico; si se agregan agentes futuros, el
  widget debera decidir si los renderiza o solo los conserva disponibles en el
  envelope.
- No se ejecuto build ni suite automatizada como parte de esta documentacion.
- La validacion end-to-end con documento real aun queda pendiente.

## Siguiente paso recomendado

Probar el flujo end-to-end con un documento real o de prueba:

1. iniciar el proceso cargando el documento
2. abrir y completar `Nueva Cuenta`
3. probar el camino con reejecucion IDP si se cargan documentos adicionales
4. probar el camino hacia la malla agentica
5. abrir `Analysis` y confirmar que el widget presenta el analisis unificado
6. revisar si los botones visuales del widget deben empezar a escribir variables
   de Automate en una siguiente version
