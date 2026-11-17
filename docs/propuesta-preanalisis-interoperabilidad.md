# Propuesta: agente de preanálisis e interoperabilidad simulada

Estado: propuesta para revisar antes de implementar. Relacionado con #146 (preradicación) y #147 (workspace ARS).
Datos solo sintéticos; el repositorio es público.

## 1. Agente de preanálisis (Agent Builder)

### Qué hay hoy
El preanálisis es determinista y vive en el front (`radication-preanalysis.util`): evalúa el checklist del convenio
(Appdata `/MedRec/Appdata/Checklists/documentation-checklist.json`) contra las clases documentales de `batchState`.
Siempre funciona, pero no redacta nada: solo dice presente o faltante.

### Qué aportó en CIC-Fin
- **Variable:** `agentResponseJSON`. Un script de Automate la llena con `JSON.parse(agentResponse)`.
- **Forma de la salida:** una fila por clase documental:
  ```json
  [{ "ClassName": "Factura", "Status": "⚠️ Needs Attention", "Comment": "Verificado: … Pendiente: … Acción: …", "DocumentIDs": ["…"] }]
  ```
- **Comentarios del usuario:** se escriben sobre la misma fila (`UserComment` y `Attended: true`). Se guardan con `saveTaskForm` en el datatable del formulario de la tarea, que se mapea de entrada y salida a `agentResponseJSON`.
- **Interfaz:** tabla Documento | Descripción | Estado | Acciones, con un comentario por fila, un visor de los documentos de esa fila y alertas en el panel lateral.

### Valor para esta demo
- **A favor:** el webinar se llama «Preanálisis *inteligente*». Un agente que explica qué verificó, qué falta y qué
  acción toma el prestador, por factura o paciente, cuenta la historia mejor que un checklist binario. Además,
  esa misma salida alimenta luego a la ARS.
- **Costo:**
  - crear el agente y su policy en Agent Builder;
  - en Automate, llamar al agente entre «Document IA» y «Nueva Cuenta», agregar el script que convierte la respuesta a JSON, declarar la variable y añadir un datatable en el formulario de Intake con mapeo de entrada y salida;
  - aceptar unos 30 a 60 s más de latencia.
- **Riesgo:** queda poco tiempo antes del 24-11 y la salida del modelo puede variar.

### Recomendación: híbrido, con la misma forma que CIC-Fin
1. El checklist determinista se queda como base y como respaldo: la demo nunca queda vacía.
2. El agente «Preanálisis documental» recibe el checklist de Appdata, el `accountSummary` y los resultados de interoperabilidad (sección 2). Devuelve el arreglo de CIC-Fin con dos campos opcionales: `InvoiceNumber` y `PatientId` sintético, para ubicar cada hallazgo en su factura o paciente.
3. El front lee `preanalysisResult`, o `agentResponseJSON` como alias. Si no existe, usa el checklist.
4. **Comentarios:**
   - **v1 (ya hecho):** van en `providerFindingComments`.
   - **Con el agente:** pasan a `UserComment` y `Attended` sobre la fila, como en CIC-Fin, y `providerFindingComments` se deja como compatibilidad.

**Decisión pendiente del usuario:** ¿se crea el agente para el 24-11 o queda solo el checklist?

## 2. Interoperabilidad simulada (concepto de los burós de CIC-Fin)

### Lo que existe en CIC-Fin
- **Componente:** `components/external-checks/external-checks-animation.component.ts` (`agentic-bank-external-checks`).
  - Es standalone, OnPush y lleva el template y los estilos inline.
  - Cada fila muestra un nodo origen, un enlace con paquetes animados que van y vuelven, y un nodo destino que pulsa.
  - Los estados son «Consultando…» y «Validado».
- **Sus límites:** termina por temporizador fijo y no espera ningún resultado real. Solo tiene dos filas, por país. Guarda en localStorage.

### Adaptación propuesta (portar, no reconstruir)
1. Copiar el componente como `pages/radication/external-checks/` y mantener el arte y la animación.
2. **Generalizarlo:**
   - `@Input() checks: ExternalCheckDefinition[]`, con `{ key, icon, labelKey, mode: 'simulated' | 'real', durationMs }`;
   - `@Input() channel: 'provider' | 'ars'`;
   - `@Input() context`, con las facturas y pacientes de `buildCaseAccountView(batchState)`;
   - `@Input() holdUntil: boolean`: la última fila no se cierra hasta que llega el resultado del análisis;
   - la animación termina, pero el estado final se toma del resultado.
3. **Estados por fila:** `querying | ok | alert | inconsistency | no_response`. El ícono y el color cambian según el estado, y la fila muestra el detalle sintético.
4. **Insignia «Simulado»** en cada fila con `mode: 'simulated'`, para distinguirla de una integración real.

### Contrato para futuras integraciones
```ts
interface ExternalVerificationAdapter {
  key: 'affiliation' | 'authorization' | 'contract' | 'priorClaims' | 'providerHis';
  query(ctx: { providerId: string; invoices: InvoiceRef[] }): Observable<ExternalVerificationResult>;
}
interface ExternalVerificationResult {
  key: string; mode: 'simulated' | 'real'; status: 'ok' | 'alert' | 'inconsistency' | 'no_response';
  items: { invoiceNumber: string; patientRef: string; status: string; detailKey: string; data?: Record<string, unknown> }[];
  checkedAt: string;
}
```
- **v1:** un adaptador mock por sistema, determinista. El resultado se deriva del número de factura sintético, así que la misma factura da siempre el mismo resultado y las facturas A, B y C de la demo muestran casos distintos.
- **Proveedor Angular:** `EXTERNAL_VERIFICATION_ADAPTERS` (multi). Integrar un sistema real será sustituir su adaptador mock.

### Sistemas y canal

| Sistema | Ícono | Prestador | ARS | Ejemplo sintético de alerta |
|---|---|---|---|---|
| Afiliaciones y cobertura | `verified_user` | sí | sí | afiliado suspendido en la fecha del servicio |
| Autorizaciones médicas | `approval` | sí | sí | procedimiento sin autorización vigente |
| Contratos y tarifarios | `request_quote` | sí | sí | valor facturado por encima del tarifario |
| Reclamaciones previas y duplicidad | `content_copy` | no | sí | factura con el mismo paciente, fecha y CUPS ya radicada |
| HIS del prestador | `local_hospital` | solo si hay acceso autorizado | sí (si aplica) | sin respuesta |

### Dónde se muestra
- **Preradicación, paso Procesamiento:** aparece cuando termina «Extract», en paralelo con la apertura de Intake o con el agente de preanálisis. No se cierra hasta tener el resultado del análisis.
- **Workspace ARS, pestaña Intake:** resumen de las cinco verificaciones por factura, con las alertas listas para convertirse en hallazgos.
- **Uso por el agente:** los resultados son su entrada, junto con los documentos extraídos; el componente no lo reemplaza. En v1, el front pasa los resultados al preanálisis determinista como contexto. Con el agente, se escriben en una variable `externalVerifications`, que habría que declarar en Automate.

**Sin integraciones reales** con HIS, ERP ni afiliaciones en esta entrega.
