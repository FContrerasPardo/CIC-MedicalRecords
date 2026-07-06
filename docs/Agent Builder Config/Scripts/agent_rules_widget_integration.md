# Agent Rules Widget — Script + BPMN Integration

Guia para crear el Script task en Automate y alimentar el widget
`agent-rules-widget` en la User Task **New Form** del subproceso **AgentMesh**.

Codigo fuente del script:

```text
docs/Agent Builder Config/BuildAgentRulesWidgetPayload.ts
```

---

## 1. Crear el Script en Studio Modeler

1. Abre el proyecto en **Studio Modeler**.
2. En el panel izquierdo, entra a **Scripts**.
3. Clic en **New Script** (o **+**).
4. Nombre sugerido:

   ```text
   BuildAgentRulesWidgetPayload
   ```

5. Copia el contenido completo de `BuildAgentRulesWidgetPayload.ts` en el editor
   del script.
6. Guarda el script.

Patron igual al script existente `BuildIncrementalUnifiedWidgetPayload`:

- Entradas/salidas via `variables.<nombre>`.
- **No usar `return`** al final del script.
- JavaScript compatible con runtime de Automate (`var`, `for`, sin arrow functions
  si el entorno es restrictivo; este script ya usa ese estilo).

---

## 2. Agregar el Script Task en el BPMN

Ubicacion recomendada en **AgentMesh**:

```text
[Parallel gateway join]
        |
        v
[Script: BuildAgentRulesWidgetPayload]   <-- nuevo
        |
        v
[User Task: New Form]
        |
        v
[Agentes + UnifyJson ...]
```

Pasos:

1. Abre el diagrama **AgentMesh**.
2. Arrastra un **Script task** entre el join de las variables iniciales y la
   User Task **New Form**.
3. Selecciona el script `BuildAgentRulesWidgetPayload` en la configuracion de
   la tarea.
4. Abre **Edit variables** del Script task.

---

## 3. Mapeo del Script Task

### Inputs (Process variable -> Script variable)

| Script input | Process variable | Type en Automate |
|--------------|------------------|------------------|
| `batchState` | `$batchState` | `json` |
| `documentationRules` | `$documentationRules` | `string` |
| `payerCompliancePolicy` | `$payerCompliancePolicy` | `string` |
| `preAuthorization` | `$preAuthorization` | `string` |
| `tariffAgreement` | `$tariffAgreement` | `string` |
| `payerCodingPolicy` | `$payerCodingPolicy` | `string` |
| `codingRules` | `$codingRules` | `string` |

Usa la pestana **Process variable** para cada input (`$nombreVariable`).

Notas de tipo:

- Las reglas (`documentationRules`, `payerCompliancePolicy`, etc.) llegan como
  **string** con contenido JSON embebido. Ese es el mismo contrato que usan los
  agentes en Agent Builder.
- `batchState` debe ser **`json`** si la variable de proceso ya es objeto JSON.
  Si en tu proceso esta tipada como texto, usa **`string`**; el script igual la
  acepta.

### Outputs (Script variable -> Process variable)

| Script output | Process variable | Type en Automate |
|---------------|------------------|------------------|
| `agentRulesWidget` | `$agentRulesWidget` | `Array<json>` |
| `agentRulesWidgetSummary` | `$agentRulesWidgetSummary` | `json` |

`agentRulesWidgetSummary` no va al formulario; sirve para revisar en logs si
alguna regla llego vacia.

---

## Formulario New Form

En la User Task **New Form**, abre **Edit variables** y configura el widget:

| Form parameter | Mapping | Type en formulario |
|----------------|---------|-------------------|
| `agent-rules-widget` | **Process variable** -> `$agentRulesWidget` | `Array<any>` o `Array<json>` |

El **Form parameter** en Studio debe coincidir exactamente con el tipo registrado en
Custom UI. Si Studio crea el parametro como `agent-rules-widget-oxfam`, el modulo
Angular registra ese alias tambien. Lo recomendado es usar el nombre canonico
`agent-rules-widget` al crear el parametro del formulario.

Mantener tambien los campos ocultos del formulario (`documentationRules`,
`codingRules`, `batchState` / `BatchState`, etc.) con mapping de **entrada y salida**
a sus variables de proceso. El widget sincroniza los cambios hacia esos campos
automaticamente al editar reglas (alias de IDs soportados, p. ej. `BatchState`).

### Output mapping (Validate Rules)

| Form parameter | Process variable | Notas |
|----------------|------------------|-------|
| `agent-rules` o `agent-rules-widget` | `$agentRulesWidget` | Array unificado del widget |
| `documentationRules` | `$documentationRules` | Actualizado al editar en widget |
| `payerCompliancePolicy` | `$payerCompliancePolicy` | Actualizado al editar en widget |
| `tariffAgreement` | `$tariffAgreement` | Actualizado al editar en widget |
| `payerCodingPolicy` | `$payerCodingPolicy` | Actualizado al editar en widget |
| `codingRules` | `$codingRules` | Actualizado al editar en widget |
| `batchState` / `BatchState` | `$batchState` | Contexto de comparacion |
| `preAuthorization` | `$preAuthorization` | Opcional en piloto |

Al completar la tarea, Automate debe leer las variables individuales (no solo el
array unificado) para reenviar las reglas modificadas a los agentes en el loop
**Reprocess**.

Custom UI widget:

```text
CustomUI/medicalrecords-pq7lr-source/libs/plugins/medical-records/src/lib/form-widgets/agent-rules-widget/
```

Registro del widget:

```text
agent-rules-widget
```

---

## 5. Formato que recibe el widget

Cada item del array tiene esta forma:

```json
{
  "id": "documentationRules",
  "label": "Documentation Rules",
  "agent": "Compliance Alert Agent",
  "group": "Compliance",
  "value": "{...}",
  "valueType": "json-string",
  "isEmpty": false,
  "preview": "{...truncado...}"
}
```

En Angular, lee `this.field.value` y agrupa por `group` o `agent`.

Ejemplo minimo:

```typescript
get rules(): Array<{ id: string; label: string; group: string; value: unknown; isEmpty: boolean; preview: string }> {
  const raw = this.field?.value;
  return Array.isArray(raw) ? raw : [];
}
```

---

## 6. Validacion rapida

1. **Release** del proceso con el Script task nuevo.
2. Ejecuta hasta **New Form**.
3. En el widget, confirma:
   - `batchState` con datos del lote.
   - reglas de Compliance / Financial / Coding no vacias.
4. Si alguna fila muestra `isEmpty: true`, el problema esta **antes** del
   formulario (service task upstream o variable mal mapeada), no en el prompt del
   agente.
5. Opcional: revisa `agentRulesWidgetSummary.emptyCount` en el event log.

---

## 7. Relacion con agentes vacios

Si el widget muestra valores correctos pero los agentes siguen devolviendo vacio:

- Revisa el mapeo **desde** la User Task **hacia** cada Agent task.
- Valida cada agente con los JSON de `docs/Agent Builder Config/test/`.
- Revisa `BuildIncrementalUnifiedWidgetPayload` solo despues de la etapa de
  agentes, no en esta etapa previa.

Referencia de prueba manual de agentes:

```text
docs/Agent Builder Config/test/README.md
```

---

## 8. Matriz widget vs agentes (piloto jun 2026)

Fuente de verdad: `automate/.../processes/agentmesh-hk5kb-extensions.json`.

| Variable | agent-rules widget | Compliance agent | Coding agent | Financial agent |
|----------|-------------------|------------------|--------------|-----------------|
| `batchState` | Context (read-only) | Input (full) | Input (full) | Slim via `BuildFinancialAgentBatchPayload` |
| `documentationRules` | Intake tab | — | — | — |
| `payerCompliancePolicy` | Compliance tab | Input | — | — |
| `preAuthorization` | Hidden if empty | — | — | — |
| `tariffAgreement` | Financial tab | — | — | Input |
| `codingRules` | Coding tab | — | Input | — |
| `payerCodingPolicy` | Coding tab | — | Input | — |

**Regla operativa:** Compliance y Financial fallaron cuando recibían inputs extra
(`documentationRules`, `preAuthorization`, etc.). Mantener solo las columnas
marcadas como Input arriba.

### Flujo AgentMesh (orden real)

```text
batchState + rule vars
  → BuildAgentRulesWidgetPayload
  → User Task New Form (agent-rules-widget)
  → jsontostring ($SbatchState, $ScodingRules, …)
  → Parallel:
       Compliance  ← $SbatchState + $SpayerCompliancePolicy
       Coding      ← $SbatchState + $ScodingRules + $SpayerCodingPolicy
       Financial   ← $financialBatchState (slim) + $StariffAgreement
  → UnifyJsons (json1=coding, json2=compliance, json3=financial, json4=batchState)
  → User Task Analysis (analysis-task-widget)
```

Indice del export: `automate/README.md`.

---

## UI layout MVP (convenio + Stitch)

El widget `agent-rules-widget` usa layout **Stitch**: sidebar de pagadores (320px) + area principal con header, tabs y contenido.

| Area | Contenido | Sync agent-bound |
|------|-----------|------------------|
| Sidebar payers | 3 perfiles demo (ARS Primera, Sura ARL, Nueva EPS) | No |
| General | Detalles del contrato + resumen financiero del payer activo | No (`agreementGeneral`, UI-only) |
| Tarifas | Tabla de `tariffAgreement` (editable solo ARS Primera) | Si (solo payer real) |
| Reglas AI | Sub-tabs Intake / Compliance / Coding con tarjetas | Si |
| Documentos | Visor inline del contrato + metadata del payer activo | No (`agreementDocuments`, UI-only) |

**Sidebar payers (MVP):**

- Solo **ARS Primera** (`bindsRealPayload: true`) edita el payload real de `tariffAgreement` y sincroniza campos ocultos.
- **Sura ARL** y **Nueva EPS** son perfiles demo read-only; muestran banner "Demo profile — not sent to agents" en Tarifas.
- La seleccion de payer cambia header, General y Documentos; Reglas AI siguen leyendo el payload agent-bound real.

**Notas:**

- Se elimino la toolbar de metricas Populated / Missing / Rules; busqueda y filtro "Only issues" viven dentro de Tarifas y Reglas AI.
- `batchState` no se muestra en el workspace principal; solo **Copy JSON** en panel debug colapsado.
- Si `agreementGeneral` / `agreementDocuments` no vienen en `agentRulesWidget`, el widget inyecta fixtures demo (CM-UCE / ARS Primera) y el contrato `07b0dd64-d021-4795-821e-f45d857956b4`.
- Los JSON agent-bound (`documentationRules`, `payerCompliancePolicy`, `tariffAgreement`, `codingRules`, `payerCodingPolicy`) **no cambian de estructura**; solo mejora visual y organizacion por tabs.
- Campos ocultos opcionales `agreementGeneral` / `agreementDocuments` se sincronizan si existen en el formulario.
