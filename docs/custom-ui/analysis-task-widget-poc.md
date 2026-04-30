# Analysis Task Widget POC

Fecha: 2026-04-29.

Este documento resume el estado actual del POC del widget personalizado para la
fase `Analysis` dentro de la arquitectura `medical-records`.

## Objetivo del POC

Validar que una tarea real de Automate abierta en:

```text
/task-details-cloud/:taskId
```

pueda renderizar una UI personalizada usando un Custom Form Widget, sin perder
las acciones nativas del formulario (`Save`, `Cancel`, `Complete`).

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
- Lee el payload del caso desde `field.value`.
- Como compatibilidad adicional, tambien intenta leer:
  - `case_payload`
  - `casePayload`
- Acepta payload en formato objeto JSON o string JSON parseable.
- Renderiza una tarjeta visual con:
  - fase
  - `caseId`
  - paciente
  - pagador / plan
  - montos (`totalBilled`, `totalExpected`, `totalGlosado`)
  - hallazgo principal
  - fecha `updatedAt`
- Si no encuentra payload valido, muestra un estado vacio.

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

### 1. Creacion del custom widget en Automate

Se creo un Form Widget personalizado en Studio Modeler y luego se ajusto
manualmente en JSON para trabajar con JSON como valor principal.

Estado final reportado del widget:

```json
{
  "id": "d96fca8d-c2d8-40d1-9795-7541dd2cae73",
  "name": "analysis-task-widget",
  "key": "analysis-task-widget-qixf4",
  "description": "",
  "type": "analysis-task-widget",
  "isCustomType": true,
  "valueType": "json",
  "icon": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAEZ0FNQQAAsY58+1GTAAAAAXNSR0IArs4c6QAAAAZiS0dEAP8A/wD/oL2nkwAAAAlwSFlzAAAOxAAADsQBlSsOGwAAAOZJREFUeNpjYBjqgJlC/bJAXAzEjED8AJsCRjR+FwEDy9AMTwFiTih/OxDvR9fARKbL5YA4FWr4QyD+B8SeQOyIrpCFCJei+0wO6nIOIL4IxMuB2BCIQ6GWMCD7hIUMl6MbDnL9Wag8zBJQ0O8jJ4jcoIb/gYb5PyS580D8CMp2IDcOlkANYYHGgQCSOeFArADEP4B4DiWpiAMaTKDgegvEs4DYAxoPMMMfUZKKkA0RBuJSXIZj8wEpANknWA2nBkC2hIGaOZnoHM9E68KOnJxMkjqa+2DoW4ArDrqI1N814D4YBQQBACr8LonbEIBuAAAAAElFTkSuQmCC",
  "className": ""
}
```

Decision importante:

- El `type` efectivo actual en Studio es `analysis-task-widget`.
- El `key` mantiene el sufijo tecnico generado por Studio, pero ya no es el
  binding principal usado por el formulario.

### 2. Validacion del procedimiento manual

Antes del caso real de `Analysis`, se creo un custom widget vacio para validar
que el flujo manual de Studio funcionaba correctamente.

Ese paso sirvio para confirmar que:

- el widget podia crearse manualmente en Automate
- el formulario podia consumirlo
- el render en `task-details-cloud` funcionaba antes de cargar la UI real

### 3. Proceso de negocio

Se creo un proceso llamado:

```text
medical-records
```

Dentro del proceso se agregaron al menos estas etapas:

- una etapa inicial de validacion de usuario
- una etapa de `Analysis`

### 4. Variable JSON del caso

En el proceso se creo una variable JSON para almacenar la informacion del caso.

Nombre observado en Studio:

```text
caseJSON
```

Configuracion reportada:

- categoria: `Local`
- tipo: `json`
- default value: payload estatico de prueba

Payload usado para la prueba:

```json
{
  "schemaVersion": 1,
  "caseId": "ACC-2026-8901",
  "taskId": "12345",
  "processInstanceId": "67890",
  "phase": "analysis",
  "patient": {
    "id": "P-10293",
    "name": "Carlos Mendoza",
    "dob": "1980-05-14"
  },
  "payer": {
    "name": "SURA",
    "plan": "Platinum"
  },
  "financials": {
    "totalBilled": 15400000,
    "totalExpected": 15400000,
    "totalGlosado": 2400000
  },
  "findings": [
    {
      "id": "F-1",
      "type": "authorization",
      "severity": "high",
      "title": "Authorization missing"
    }
  ],
  "documents": [
    {
      "id": "DOC-1",
      "name": "Epicrisis",
      "status": "verified"
    }
  ],
  "nativeRef": {
    "taskId": "12345",
    "taskProcessName": "Analysis"
  },
  "updatedAt": "2026-04-28T00:00:00Z"
}
```

### 5. Formulario de Analysis

Se creo un formulario llamado `Analysis` y se agregaron al menos estos
elementos:

- un campo `case_payload`
- el custom widget `analysis-task-widget`

### 6. Mapeo en la tarea de usuario

En la tarea de usuario del proceso se mapeo el formulario con la variable del
proceso que almacena la informacion del caso.

Resultado esperado de este mapeo:

- la tarea recibe el JSON del caso
- el widget puede leer ese JSON al abrir la tarea
- la informacion mostrada en el widget corresponde al caso en proceso

## Resultado validado

Resultado observado en la prueba manual:

- al crear una nueva instancia del proceso, se crea correctamente la tarea de
  usuario
- al abrir la tarea en `task-details-cloud`, el widget personalizado se
  visualiza correctamente
- la tarjeta muestra el caso `ACC-2026-8901`, el paciente, el pagador, los
  montos y el hallazgo principal
- las acciones nativas `CANCEL`, `SAVE` y `COMPLETE` permanecen visibles

Conclusion del POC:

- la arquitectura `dashboard custom + tarea real de Automate + custom form
  widget por fase` ya quedo validada para la fase `Analysis`

## Limitaciones actuales

- El POC actual esta orientado a visualizacion; todavia no implementa edicion
  rica del caso desde el widget.
- El campo nativo `case_payload` sigue presente en el formulario y puede
  ocultarse o refinarse despues.
- No se ejecuto build ni suite automatizada como parte de esta documentacion.
- La validacion realizada hasta ahora es manual y visual sobre la tarea real de
  Automate.

## Siguiente paso recomendado

Tomar este POC como base para uno de estos caminos:

1. ocultar o minimizar el campo nativo `case_payload` y dejar el widget como UI
   principal
2. agregar interaccion y sincronizacion bidireccional entre widget y campos del
   formulario
3. repetir el patron en otras fases del proceso (`Intake`, `Approval`,
   `Execution`, `Review`, `Completed`)
