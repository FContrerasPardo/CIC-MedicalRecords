# Analysis Widget Payload Integration

Fecha: 2026-05-03.

Este documento describe el contrato actual entre Agent Builder, Automate y el
custom widget `analysis-task-widget`.

## Decision actual

- Los agentes siguen produciendo outcomes independientes como string JSON.
- Un script generico de Automate consolida esos resultados en un envelope unico.
- El widget recibe el envelope completo como string JSON y resuelve internamente
  que agente alimenta cada tarjeta funcional.
- El script no debe generar un payload especifico del widget como
  `analysisWidgetPayload`; la intencion es que sea reutilizable con mas agentes
  en el futuro.

## Variables de agentes

Los outcomes actuales recomendados son:

- `codingIntegrityResult`
- `complianceAlertResult`
- `financialVarianceResult`

Cada outcome debe ser tipo `string` y contener un JSON valido producido por el
agente. Si Automate o Agent Builder entrega doble encoding, el script lo intenta
parsear de forma profunda.

## Script generico

Archivo:

```text
docs/Agent Builder Config/BuildIncrementalUnifiedWidgetPayload.ts
```

Entradas genericas:

```text
variables.json1 ... variables.json10
```

Para la primera version del widget se recomienda mapear:

```text
json1 = codingIntegrityResult
json2 = complianceAlertResult
json3 = financialVarianceResult
```

Salida principal para el widget:

```text
variables.unifiedWidgetPayloadText
```

La salida es un string JSON con esta estructura general:

```json
{
  "schemaVersion": "incremental-widget-payload-envelope/v1",
  "generatedAt": "2026-05-03T00:00:00.000Z",
  "source": "Automate Script - BuildIncrementalUnifiedWidgetPayload",
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

## Mapeo en Automate

Flujo recomendado:

1. Ejecutar los tres agentes.
2. Ejecutar `BuildIncrementalUnifiedWidgetPayload`.
3. Guardar `variables.unifiedWidgetPayloadText`.
4. Mapear el campo unico del widget:

```text
analysis-task-widget -> unifiedWidgetPayloadText
```

No mapear `codingIntegrityResult`, `complianceAlertResult` ni
`financialVarianceResult` directamente al widget, salvo como fallback temporal
durante pruebas.

## Resolucion dentro del widget

El widget intenta leer primero `field.value` como JSON string u objeto JSON.

Si encuentra un envelope con `agents`, resuelve cada tarjeta usando este orden:

1. Key directa esperada: `codingIntegrityResult`, `complianceAlertResult`,
   `financialVarianceResult`.
2. Key del mapa `agents`, por ejemplo `codingIntegrityAgent`.
3. `agent.agentKey`.
4. `agent.slotName`, por ejemplo `json1`, `json2`, `json3`.
5. `agent.agentName` o `agent.name`.
6. `agent.result.agentName` o `agent.result.name`.

Para el mapeo funcional actual, el widget considera:

```text
Coding Integrity    -> tokens CODING + INTEGRITY, fallback json1
Compliance Alert    -> tokens COMPLIANCE + ALERT, fallback json2
Financial Variance  -> tokens FINANCIAL + VARIANCE, fallback json3
```

Esto permite agregar agentes futuros al mismo envelope sin romper la UI actual.
Los agentes nuevos quedaran disponibles en `agents`, aunque v1 solo renderiza
las tres tarjetas funcionales existentes.

## Errores y datos parciales

Si un input esta vacio, el script lo ignora y no elimina resultados previos.

Si un input tiene JSON invalido, el script agrega una entrada en `warnings` con
el `slotName`, `type`, `message` y `rawPreview`. El widget interpreta esas
warnings como `Invalid agent JSON` para la tarjeta correspondiente.

Si falta un agente requerido, el widget muestra `Pending agent result` y bloquea
la aprobacion.

## Compatibilidad temporal

El widget conserva fallback a campos separados con:

```text
field.form.getFieldById("codingIntegrityResult")
field.form.getFieldById("complianceAlertResult")
field.form.getFieldById("financialVarianceResult")
```

Ese fallback existe para pruebas o transicion, pero el contrato recomendado para
Automate es el envelope generico en `unifiedWidgetPayloadText`.

## Validacion manual

Checklist minimo en Automate:

- Confirmar que `unifiedWidgetPayloadText` empieza con `{`.
- Confirmar que contiene `agents`.
- Confirmar que cada agente disponible tiene `status`, `slotName`, `agentKey`,
  `agentName` y `result`.
- Abrir la tarea con los tres agentes completos.
- Probar un input vacio y confirmar estado pendiente.
- Probar un input con JSON invalido y confirmar tarjeta `Invalid agent JSON`.
- Confirmar que `Approve Proceed` solo se habilita si los tres agentes requeridos
  estan listos y ninguno requiere revision manual.

