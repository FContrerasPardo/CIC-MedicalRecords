# Intake Account Widget

Fecha: 2026-04-30.

Este documento resume el estado actual del widget `intake-account-widget`
dentro del plugin `medical-records`, incluyendo arquitectura, decisiones de
diseño, evolución funcional y estado actual.

Nota de mantenimiento: la especificacion general de la demo y el paso a paso
end-to-end viven en `docs/medical-records-demo-process-specification.md`. Este
documento debe conservarse como anexo tecnico del widget `intake-account-widget`.

Decision vigente: `intake-account-widget` es la superficie real de la etapa
`Nueva Cuenta` porque vive dentro del formulario de la tarea de Automate. La
navegacion por etapas del plugin general no debe usarse para ejecutar Intake.
Si el widget muestra algun indicador de etapa, es contextual a la tarea y no
reemplaza el workflow.

## Objetivo

`intake-account-widget` representa la etapa real de `Intake` dentro de una User
Task de Automate. La meta no es mostrar un formulario vertical tradicional, sino
una vista operacional de cuenta médica que permita entender rápidamente:

- qué servicios tiene la cuenta
- qué soportes requiere cada servicio
- qué documentos ya están presentes
- qué documentos faltan
- qué elementos requieren revisión
- y si la cuenta está lista para avanzar a `Analysis`

El widget vive dentro de `task-details-cloud/:taskId`, por lo que:

- Automate sigue controlando `Save`, `Cancel`, `Complete`, outcomes y permisos
- el widget solo personaliza la experiencia visual y la lectura de `batchState`

## Registro y estructura en Angular

El widget fue generado siguiendo el patrón oficial Hyland con el generador:

```text
npm run nx:generate -- @hyland/extend:form-widget --pluginName medical-records --formWidgetName intake-account-widget
```

El registro Angular actual usa el `type`:

```text
intake-account-widget
```

Archivos actuales del widget:

```text
CustomUI/medicalrecords-pq7lr-source/libs/plugins/medical-records/src/lib/form-widgets/intake-account-widget/
  batch-state.mapper.ts
  batch-state.model.ts
  intake-account-view.model.ts
  intake-account-widget.component.html
  intake-account-widget.component.scss
  intake-account-widget.component.ts
  intake-account-widget.module.ts
```

Puntos técnicos clave:

- `IntakeAccountWidgetComponent` extiende `WidgetComponent`
- el widget no reemplaza acciones nativas del formulario
- no escribe todavía valores de vuelta al formulario
- la selección visual de nombre reconciliado es local al componente

## Fuente de datos

El widget lee `batchState` desde:

1. `this.field.value`
2. `this.field.form.getFieldById('batchState')?.value`

Soporta:

- objeto JSON
- string JSON parseable

Si el contenido no puede parsearse o no trae documentos, se renderiza un estado
de error amigable.

## Ejemplos reales usados para ajustar el mapper

Se trabajó contra ejemplos reales en:

```text
docs/Examples/Batchstate.json
docs/Examples/Batchstate.multiinvoice.json
docs/Examples/Batchstate.15pagesSingleInvoice.json
```

Estos ejemplos permitieron ajustar el mapper a la salida real de IDP para:

- `Factura y Desglose`
- `Formato de Autorización`
- `Formulario de Objeciones Auditoría Médica`
- `Reporte de Patología`
- `Laboratorios`

## Evolución funcional

### 1. Primer scaffold real de Intake

Se creó el widget real de Intake sobre el scaffold oficial de Hyland.

Se respetó el patrón del proyecto:

- registro vía `FormRenderingService`
- widget standalone
- lectura desde `batchState`
- sin lógica custom de `save` o `complete`

### 2. Reinterpretación visual tipo dashboard

La pantalla dejó de verse como formulario documental y pasó a una experiencia
tipo dashboard premium, alineada con el lenguaje visual de Stitch y del demo
`medical-records`.

Elementos principales introducidos:

- navegación superior por etapas
- header clínico/administrativo del paciente
- cards de resumen
- explorador principal de servicios
- centro documental

### 3. Soporte para single-invoice y multiinvoice

El mapper evolucionó para soportar tres escenarios:

- `single invoice / single patient`
- `multiinvoice` con varios pacientes reales
- un solo paciente con variantes OCR del nombre

### 4. Reconciliación asistida de paciente

Se agregó reconciliación de cuentas por señales, priorizando:

- `Cedula` / `No. Carnet`
- `Record`
- `Numero de Factura`
- y como fallback similitud de nombre OCR

Reglas actuales:

- si el lote termina en una sola cuenta real, no se muestra selector de
  pacientes
- si existen varias cuentas reales, se muestra selector
- si hubo variantes OCR del mismo paciente, se muestra banner de reconciliación

### 5. Selección visual del nombre reconciliado

Se agregó una mejora visual adicional:

- cuando existe reconciliación OCR con varios alias, el usuario puede elegir
  cuál alias usar como nombre visible

Alcance actual:

- la elección es solo visual
- no modifica `batchState`
- no persiste en el formulario
- no cambia la agrupación de documentos ni servicios

La selección visual impacta:

- nombre del header
- iniciales del avatar
- texto del banner de reconciliación
- label visible del paciente seleccionado

### 6. Service Explorer como centro principal

El antiguo resumen/tablas de procedimientos evolucionó a un `Service Explorer`
centrado en servicios facturados.

La vista actual ya no es una tabla clásica. Cada servicio se presenta como una
card expandible con:

- fecha
- código de servicio
- `CUP`
- descripción
- cantidad
- precio
- porcentaje de completitud documental
- badge de estado

Estados actuales de servicio:

- `Complete`
- `Partial`
- `Missing Support`
- `Review Required`
- `Low Confidence`

### 7. Fusión con Support Coverage

El bloque separado `Support Coverage by Procedure` fue eliminado como sección
independiente y su lógica quedó integrada dentro del detalle expandido de cada
servicio.

Cada card expandida muestra:

- soportes requeridos
- soportes presentes
- soportes faltantes
- documento fuente
- confianza de extracción
- acciones futuras visuales

### 8. Filtros funcionales por summary cards

Las cards superiores principales ahora funcionan como filtros del
`Service Explorer`:

- `Total Services`
- `Complete`
- `Missing Support`
- `Pending Review`
- `Low Confidence`

Además existen chips internos equivalentes que reflejan el mismo filtro activo.

### 9. Document Control Center documento-céntrico

La sección lateral de documentos se mantuvo, pero cambió de enfoque:

- ya no repite servicios
- está orientada a documentos de la cuenta
- cada documento es expandible

Cada documento muestra:

- `className`
- estado general
- `classificationStatus`
- `extractionStatus`
- `classificationConfidence`
- `extractionReviewStatus`
- `separationReviewStatus`
- highlights extraídos

### 10. Mejora de extracción documental

El primer mapper de highlights era demasiado corto. Se amplió para mostrar
información más completa por documento.

Hoy los highlights combinan:

- campos clave por tipo documental
- highlights genéricos
- resumen de tablas extraídas
- campos marcados con `ReviewRequired`
- fallback con más campos útiles no usados todavía

También se agregó el contador de `Extracted values` en el detalle documental.

### 11. Readiness unificada

La tarjeta separada de readiness fue retirada del sidebar.

El estado de readiness quedó consolidado en la card secundaria del summary:

- porcentaje de readiness
- tono visual (`success`, `warning`, `danger`)
- mensaje resumido de bloqueo o warning

### 12. Eliminación de review alerts duplicados

La card lateral `review-alerts-card` fue retirada porque esos warnings ya se
encuentran resumidos arriba.

Nota:

- el view model todavía conserva `alerts`
- pero la superficie visual principal de warnings ya es el summary

## ViewModel actual

El widget trabaja con un `IntakeAccountViewModel` que concentra:

- `stageNav`
- `patientSelector`
- `patientResolution`
- `header`
- `summaryCards`
- `activeFilter`
- `services`
- `documents`
- `readiness`
- `alerts`
- `meta`

### Servicios

Cada `IntakeAccountServiceItemViewModel` expone:

- `serviceDate`
- `serviceCode`
- `cup`
- `description`
- `quantity`
- `price`
- `total`
- `coverage`
- `invoiceNumber`
- `category`
- `supportStatus`
- `completionPercent`
- `requiredDocuments`
- `presentDocuments`
- `missingDocuments`
- `extractionSource`
- `classificationConfidence`
- `confidenceSummary`
- `alerts`

### Documentos

Cada `IntakeAccountDocumentItemViewModel` expone:

- `id`
- `name`
- `className`
- `status`
- `classificationStatus`
- `extractionStatus`
- `classificationConfidence`
- `extractionReviewStatus`
- `separationReviewStatus`
- `extractedHighlights`

## Heurísticas actuales del mapper

El widget todavía depende de heurísticas de UI y no de una matriz oficial del
backend.

Ejemplos:

- la relación `servicio -> soportes requeridos` se calcula por señales del
  servicio y por tipos documentales presentes
- `readyForAnalysis` se calcula por bloqueos observados en los datos
- el estado `Low Confidence` depende de umbrales locales de confianza

Esto permite una primera experiencia funcional, pero no debe considerarse
todavía la regla final de negocio.

## Interfaz actual

La composición actual del widget es:

1. `Stage nav`
2. `Alias banner` de reconciliación OCR, con selector visual de nombre si aplica
3. `Patient selector` si hay múltiples cuentas reales
4. `Patient header`
5. `Summary cards`
6. `Service Explorer`
7. `Document Control Center`

## Qué ya no existe visualmente

Elementos retirados del layout:

- card lateral separada de readiness
- card lateral separada de review alerts
- bloque independiente de `Support Coverage by Procedure`
- tabla tradicional principal de servicios

## Validación manual sugerida

### En Studio Modeling

1. Mantener `batchState` mapeado al widget `intake-account-widget`
2. Abrir una tarea real en `task-details-cloud/:taskId`
3. Probar con:
   - `Batchstate.json`
   - `Batchstate.multiinvoice.json`
   - `Batchstate.15pagesSingleInvoice.json`

### Validaciones esperadas

- si hay un solo paciente real, no aparece selector de pacientes
- si hay pacientes reales múltiples, aparece selector
- si hay variantes OCR del nombre, aparece banner de reconciliación
- si hay alias múltiples reconciliados, aparece selector `Use as display name`
- cambiar el alias modifica solo la representación visual
- los servicios se ven como cards expandibles
- las cards superiores filtran correctamente
- el detalle del servicio muestra soportes requeridos, presentes y faltantes
- el `Document Control Center` muestra más información extraída por documento
- la card secundaria del summary muestra readiness y warnings
- `Save`, `Cancel` y `Complete` siguen siendo nativos de Automate

## Limitaciones actuales

- la elección del nombre reconciliado no persiste
- no hay escritura de vuelta al formulario
- la lógica de soportes requeridos sigue siendo heurística
- no existe todavía una integración real para:
  - `Upload`
  - `Acquire Document`
  - `Upload Manually`
  - `Mark as Reviewed`
  - `View`

## Archivos tocados a lo largo de esta evolución

Los cambios del widget se concentraron en:

```text
CustomUI/medicalrecords-pq7lr-source/libs/plugins/medical-records/src/lib/form-widgets/intake-account-widget/
  batch-state.mapper.ts
  batch-state.model.ts
  intake-account-view.model.ts
  intake-account-widget.component.html
  intake-account-widget.component.scss
  intake-account-widget.component.ts
  intake-account-widget.module.ts
```

## Estado actual

`intake-account-widget` ya funciona como la primera etapa real de `medical-records`
dentro de Automate, con:

- UI premium personalizada
- lectura de `batchState`
- soporte inicial para lotes single y multiinvoice
- reconciliación OCR
- exploración de servicios
- repositorio documental enriquecido
- readiness consolidada en summary

La siguiente fase natural sería endurecer reglas de negocio y, cuando haga
sentido, decidir qué interacciones visuales deben empezar a persistirse.
