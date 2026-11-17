# Reorientación funcional y de UX — Demo de auditoría inteligente de cuentas médicas (ARS)

> **Tipo:** Documento de contexto, propuesta y guía de implementación para Claude Code / repositorio Git.  
> **Estado:** Propuesta funcional para revisar contra el código existente.  
> **Hitos:** Entrega interna objetivo: **24 de noviembre de 2026**. Presentación a ARS: **27 de noviembre de 2026**.  
> **Idioma de las interfaces:** español, salvo convención existente del proyecto.

## 1. Propósito de este documento

Este documento explica por qué la demostración cambió de enfoque y cómo reorientar las interfaces que ya se están construyendo. **No se pide rehacer la aplicación desde cero.** Se busca aprovechar los widgets, diseños e integraciones existentes, corregir el modelo de navegación y completar el flujo de auditoría y glosas que falta.

Está dirigido al asistente de desarrollo que trabaja en el repositorio. Antes de modificar código, debe **inspeccionar el proyecto actual**, mapear componentes y funcionalidades ya disponibles, identificar qué falta y plantear un plan incremental. **No asumir nombres de archivos, tecnologías, rutas o agentes que no se hayan verificado en Git.**

## 2. Problema: cómo evolucionó el alcance

### 2.1 Enfoque original: el prestador

Se partió de una solución para el **prestador de servicios de salud**: preparar una cuenta médica, organizar documentos y soportes, comprobar consistencia antes de radicarla y enviarla a la **Administradora de Riesgos de Salud (ARS)** para obtener el pago. Los primeros diseños de Stitch y los widgets nacieron bajo este enfoque.

Posteriormente surgió otra demo, centrada en oncología, que muestra un análisis profundo durante la **construcción de la cuenta por paciente desde el prestador**. Este flujo es válido, pero corresponde al ámbito del prestador, **no debe mezclarse con el flujo operativo de la ARS**.

### 2.2 Enfoque actual: la ARS

La mayor parte de lo construido ahora se orienta a la ARS: recepción de una cuenta/lote que puede contener **una o varias facturas y pacientes**, procesamiento con IDP, validaciones documentales y análisis mediante **tres agentes ya existentes** para detectar inconsistencias y riesgos de las facturas.

Actualmente existen interfaces de tipo **Intake** y de **análisis de agentes**, pero el análisis está presentado de manera demasiado concentrada en una sola pantalla. El eslabón funcional que falta es la **auditoría formal**: consolidar observaciones, convertir las pertinentes en hallazgos y glosas, comunicar las glosas al prestador y permitir la respuesta/conciliación.

### 2.3 Motivo de la entrega

Para la sesión del **27 de noviembre** el público son las **ARS**. Una demostración anterior para ARS Primera era básica: procesar documentos con IDP, pasarlos a un agente y mostrar inconsistencias documentales. Se solicitó mostrarla de nuevo con **documentos sintéticos**, pero esa demo antigua **no está operativa actualmente**. En lugar de limitarse a reconstruirla, se busca una historia de negocio completa y más persuasiva centrada en las necesidades de una ARS.

## 3. Decisión de producto: dos experiencias conectadas

La solución tendrá **dos espacios de trabajo separados** unidos por el mismo ciclo de vida de la cuenta médica:

| Experiencia | Usuario | Objetivo | Indicadores prioritarios |
|---|---|---|---|
| **Portal del prestador** | Personal administrativo / facturación del prestador | Construir, validar, radicar y dar respuesta a glosas | Facturación presentada, aceptada, glosada, recuperada por apelación, pendientes de subsanación |
| **Portal ARS** | Radicador, analista de cuentas, auditor médico/financiero, supervisor | Recibir, revisar, auditar, glosar, conciliar y gestionar pagos | Monto recibido, auditado, glosado, reconocido y pagado; cartera en revisión; tiempos; glosas por causa |

**No fusionar dashboards ni KPIs:** una ARS ve el dinero desde la perspectiva del pagador; el prestador desde facturación, cobro y recuperación. Para la entrega de noviembre, **la experiencia ARS es el protagonista**. El prestador puede aparecer brevemente al inicio (preradicación) y al final (recepción/respuesta a glosas).

## 4. Modelo de negocio y jerarquía de datos

El asistente debe verificar la semántica y estructura del modelo actual; de ser necesario, normalizarlo conceptualmente a:

```text
Prestador
  └─ Radicación / lote / cuenta presentada (ID, fecha, total, estado, prestador)
      ├─ Factura 1 (ID, importe, estado, paciente/s asociados)
      │   ├─ Paciente o episodio de atención (según relación real)
      │   ├─ Servicios / cargos / procedimientos
      │   ├─ Documentos y evidencias
      │   ├─ Validaciones Intake
      │   ├─ Resultados de agentes
      │   └─ Hallazgos, glosas y decisiones
      ├─ Factura 2 ...
      └─ Resumen agregado de la radicación
```

**Regla:** no asumir que una factura equivale siempre a un paciente; para la demo se puede utilizar un caso 1:1, pero el modelo debe admitir lote multif factura, pacientes múltiples y relaciones apropiadas entre factura, paciente, episodio y servicios.

**Trazabilidad:** cada riesgo, inconsistencia, hallazgo o glosa debe poder apuntar a la **factura y, cuando aplique, servicio, documento, página/campo y resultado del agente** que le dio origen. No perder evidencia al pasar entre pestañas o etapas.

## 5. Flujo funcional objetivo (prioridad ARS)

### Etapa 0 — Preparación y preradicación (prestador)

- El prestador adjunta factura(s), documentos clínicos, autorizaciones y soportes correspondientes.
- **IDP** extrae información estructurada de facturas y soportes.
- Un **agente de preradicación** cruza los datos extraídos contra el checklist documental y las reglas del negocio aplicables.
- La UI muestra claramente **completo / inconsistente / faltante**, permite revisar evidencias y corregir antes de la radicación formal.
- La preradicación **no debe confundirse con una glosa**; es un control preventivo.
- Tras radicar, queda un identificador, fecha y estado de recepción y se transfiere al espacio ARS.

### Etapa 1 — Recepción: dashboard operativo de la ARS

- Bandeja de radicaciones/cuentas recibidas, filtro por prestador, fecha, estado, prioridad y valor.
- Vista agregada del lote con facturas y pacientes asociados.
- KPIs relevantes para ARS y navegación al detalle de cada factura.
- Estados distinguibles: recibida, en validación, pendiente de soporte, en análisis, en auditoría, glosada/notificada, en respuesta, en conciliación, cerrada/pagada (ajustables al negocio real).

### Etapa 2 — Intake: consistencia documental por factura

Mantener y mejorar el widget existente **Intake**:

- Checklist y comparación de la factura con los documentos, servicios, órdenes y soportes.
- Mostrar qué pasó, qué no pasó, cuál evidencia respalda el resultado y cuál es el impacto potencial.
- Permitir: **(a) solicitar documentos adicionales, (b) registrar una observación como hallazgo preliminar de auditoría, (c) continuar**.
- Los hallazgos preliminares deben persistir y estar disponibles en la consolidación final.
- Solicitar documentos es un flujo con estado, responsable y fecha; no equivale automáticamente a emitir una glosa.

### Etapa 3 — Agent Mesh: análisis especializado por factura

La interfaz actual mezcla los resultados de los tres agentes. **Refactorizar la presentación, no necesariamente la lógica**, en **tres pestañas independientes**, una por agente real implementado.

Cada pestaña debe mostrar:

1. Nombre y propósito del agente (leer del código/configuración; **no inventar nombres**).
2. Resultado o conclusión resumida en lenguaje de negocio.
3. Visuales apropiados al análisis: semáforos, distribución de observaciones, desglose de valores o diagramas comparativos, **solo si los datos lo soportan**.
4. Inconsistencias/riesgos detectados con severidad y nivel de confianza **solo si existe una medida fundamentada**; no inventar scores.
5. Evidencias y vínculos a servicios/documentos/facturas.
6. Acción para **añadir hallazgo a auditoría**, descartar con justificación o solicitar revisión adicional.

Los hallazgos recolectados en Intake y en las tres pestañas alimentan **una misma bandeja de auditoría por factura**. Evitar duplicados al incorporar observaciones relacionadas.

### Etapa 4 — Auditoría y formalización de glosas (brecha principal)

**Esta etapa es prioritaria: convierte análisis técnico en una decisión de negocio.** Diseñar una pantalla o pestaña **Auditoría / Hallazgos y glosas** con:

- Consolidado de todos los hallazgos registrados en Intake y agentes.
- Origen, factura/paciente/servicio, descripción, evidencia, severidad, estado, responsable y acción.
- Capacidad de **aceptar, solicitar revisión, descartar o convertir en glosa** cada hallazgo.
- Al formalizar una glosa: motivo/código según catálogo aplicable, descripción, sustentación, servicio afectado y **monto objetado**, con validación de no exceder los importes elegibles y sin doble conteo.
- Vista de resumen financiero por factura: total facturado, total observado, total glosado y monto no objetado/pendiente de determinación. Evitar llamar “pagado” a un monto aún no desembolsado.
- Generación de **comunicación/notificación de glosas al prestador** con trazabilidad y estado (borrador, revisada, notificada).
- Una **decisión humana identificable** valida la emisión; la IA propone y documenta, no glosa automáticamente en firme.

### Etapa 5 — Prestador: consulta y respuesta a glosas

- Una vez notificada, la glosa aparece en el **portal independiente del prestador**.
- El prestador ve motivo, importe, evidencia y plazo aplicable; puede aportar documentos o presentar respuesta/apelación según el proceso y reglas aplicables.
- Mostrar desde la perspectiva del prestador el **valor glosado y potencialmente recuperable**, y posteriormente el **valor efectivamente recuperado por aceptación de la respuesta**; no equiparar recuperación con pago hasta confirmación.
- Para noviembre puede demostrarse mediante navegación/prototipo o datos simulados con etiquetado explícito.

### Etapa 6 — ARS: evaluación de respuesta, conciliación y cierre

- ARS recibe respuesta, audita evidencia y decide mantener, ajustar o levantar glosa.
- Registrar resultados de conciliación y valores definitivos reconocidos.
- Distinguir **aprobado/reconocido**, **programado para pago** y **pagado efectivamente**.
- Actualizar KPIs del dashboard ARS según estado y eventos.

## 6. Distinciones conceptuales obligatorias

| Concepto | Significado en UI | ¿Es glosa? |
|---|---|---|
| **Inconsistencia documental** | Diferencia/faltante detectado por checklist o verificación cruzada | No |
| **Riesgo / alerta de agente** | Señal analítica que requiere evaluación | No |
| **Hallazgo preliminar** | Observación registrada por analista con referencia y evidencia | No |
| **Glosa propuesta** | Hallazgo seleccionado, tipificado, con sustento y valor potencialmente objetado | Todavía no notificada |
| **Glosa formal/notificada** | Objeción aprobada y comunicada según procedimiento | Sí |
| **Respuesta/apelación** | Acción del prestador frente a una glosa | No es el cierre |
| **Conciliación** | Revisión de respuesta y resolución de valores discutidos | Resuelve total/parcialmente |
| **Pago** | Desembolso confirmado | No confundir con valor aceptado |

No proponer reglas regulatorias, códigos de glosa ni plazos específicos como hechos sin validarlos con los expertos de República Dominicana/ARS y la documentación de negocio pertinente.

## 7. Diseño UX sugerido para reutilizar widgets

### A. Dashboard ARS

- Cuatro a seis tarjetas iniciales: valor recibido/radicado, valor en auditoría, valor glosado, valor reconocido, valor pagado (y opcionalmente cuentas pendientes).
- Gráfica de distribución por estado, tendencia de glosas y principales causas **si existe data para ello**.
- Tabla de radicaciones con acceso a sus facturas y navegación al detalle.
- Los KPIs deben definir período, moneda (ej. DOP/RD$ si corresponde), denominador y estado temporal.

### B. Workspace de factura / paciente

Header persistente: prestador, factura, paciente/episodio, importe, estado, paso actual.

Propuesta de pestañas (ajustar a componentes existentes):

```text
[Documentación / Intake] [Agente 1] [Agente 2] [Agente 3] [Auditoría y glosas]
```

- Usar nombres reales de agentes en lugar de “Agente 1/2/3” cuando estén verificados.
- Mantener un **contador global de hallazgos** visible desde todas las pestañas.
- Acciones coherentes y persistentes entre vistas.
- Cada pestaña conserva contexto de la factura activa; no mostrar análisis global de varias facturas como si correspondiera a una sola.
- Diseño gráfico limpio, legible y apropiado para audiencia ejecutiva y auditores; visualizaciones que expliquen conclusiones y no sean decorativas.

### C. Bandeja de auditoría

- Lista consolidada de observaciones con filtros por origen/estado/criticidad.
- Vista detalle de hallazgo con evidencia y botón para incorporar a glosa.
- Editor/revisión de glosas y resumen económico sin doble conteo.
- Vista previa de notificación al prestador y constancia de envío (real o simulado).

### D. Portal del prestador

- Dashboard propio (no reutilizar el dashboard ARS cambiando solo el título).
- Bandeja de glosas recibidas, opción de responder y seguimiento de apelaciones.
- KPI específico: **recuperación por apelación**, separado del monto glosado y efectivamente cobrado.

## 8. Prioridades y alcance de la primera entrega

**Hito de desarrollo: 24 de noviembre de 2026. Demostración: 27 de noviembre de 2026.**

### P0 — Necesario para una narrativa ARS creíble

1. Recuperar/estabilizar la recepción con **documentos sintéticos** y procesamiento IDP (o simular explícitamente los pasos no integrados).
2. Dashboard ARS con datos y KPIs coherentes.
3. Entrada desde radicación/lote a detalle de factura y paciente.
4. Reutilización de Intake con checklist y acción **Registrar hallazgo**.
5. Separación visible del análisis de los tres agentes en tres tabs.
6. **Consolidación de hallazgos y formalización de glosas** con valores y evidencias.
7. Generar una comunicación de glosa al prestador (puede ser simulada si no hay backend operativo).

### P1 — Si hay capacidad antes de la demo

- Preradicación interactiva con validaciones completas.
- Solicitud de documentos con ciclo de estados.
- Paso visible al dashboard del prestador para consulta de glosas.
- Respuesta/apelación simulada y actualización de un caso.
- Gráficas especializadas por agente con datos consistentes.

### P2 — Evolución posterior

- Integración completa prestador ↔ ARS, notificaciones reales y conciliación integral.
- Flujo oncológico profundo de construcción de cuenta del prestador.
- Automatización de pagos y trazabilidad financiera real.
- Reglas parametrizadas y catálogo oficial de glosas, si procede.

**Si hay poco tiempo:** priorizar **Intake → agentes → hallazgos → glosa → comunicación** sobre ampliar módulos accesorios. La auditoría es la pieza faltante que hace que los tres agentes aporten valor de negocio.

## 9. Escenario sintético de demostración

Crear un conjunto **consistente y reproducible** de datos ficticios:

- Un prestador con una radicación que contiene **tres facturas de pacientes distintos** (caso simplificado).
- Factura A: documentos y análisis sin observaciones; continúa sin glosa.
- Factura B: soporte ausente o inconsistente en Intake; amerita solicitud o hallazgo según reglas.
- Factura C: los agentes identifican dos observaciones relevantes; el auditor descarta una y convierte la otra en glosa con importe definido.
- La ARS emite una notificación por la glosa de la factura C.
- Opcional: vista del prestador recibiendo la glosa y preparando respuesta.

Mantener coherencia referencial y financiera de importes, documentos, servicios, estados y eventos. Marcar los importes y resultados como **datos sintéticos**, sin utilizar datos reales de pacientes.

## 10. Indicadores: definiciones mínimas

Definir y calcular desde el modelo de datos —no codificar tarjetas con cifras inconexas—:

- **Monto recibido:** suma de importes de facturas radicadas y recibidas en el período.
- **Monto auditado:** suma de importes revisados según criterio de auditoría acordado (evitar sumar una factura varias veces).
- **Monto glosado:** suma de importes formalmente objetados, distinguiendo glosa vigente, inicial y levantada.
- **Tasa de glosa:** establecer un denominador explícito (p. ej. monto glosado inicial / monto auditado del período), mantenerlo consistente.
- **Monto reconocido:** valor aceptado como pagadero según el estado de resolución.
- **Monto pagado:** valor confirmado como desembolsado.
- **Pendiente de respuesta:** glosas notificadas sin respuesta registrada.
- **Tiempo medio de auditoría:** desde el evento de inicio definido al evento de cierre definido.
- **Recuperación por apelación (prestador):** monto de glosa revertido/levantado tras respuesta, con cobro distinguido cuando aplique.

Si el sistema aún no soporta estos eventos, usar mocks coherentes y señalar cuáles indicadores están simulados.

## 11. Criterios de aceptación

La reorientación estará lograda cuando:

- [ ] La navegación diferencia claramente **portal ARS** y **portal del prestador**.
- [ ] El flujo principal de la demo cuenta una historia **desde la perspectiva ARS**.
- [ ] Se puede abrir una radicación con múltiples facturas y entrar al análisis de una factura específica.
- [ ] Intake cruza documentos/servicios y deja registrar hallazgos o solicitar soporte.
- [ ] Los **tres agentes reales** se presentan en **pestañas individuales** con sus hallazgos y evidencias.
- [ ] Los hallazgos añadidos desde distintas pantallas se ven consolidados en Auditoría, sin duplicarse.
- [ ] Un auditor puede seleccionar un hallazgo y construir una glosa con motivo, importe y evidencia.
- [ ] Se genera una comunicación legible al prestador y cambia el estado de la glosa de manera consistente.
- [ ] El dashboard ARS prioriza importes **recibidos, auditados, glosados, reconocidos y pagados**; el del prestador muestra **recuperación por apelación**.
- [ ] Se usan documentos y datos **sintéticos consistentes**, y cualquier funcionalidad simulada se indica como tal.
- [ ] No se rompe funcionalidad previa ni se reorganiza la lógica de agentes innecesariamente.

## 12. Instrucciones para Claude Code: qué hacer con este MD

**Primero, auditar el repositorio; después, implementar.**

1. **Exploración:** localizar páginas, componentes, rutas, widgets, estado global, modelos de datos, servicios/mock data, flujos de IDP, Agent Mesh y los tres agentes reales; ubicar además cualquier estructura de portal prestador, portal ARS, Intake, auditoría, glosas y diseños heredados de Stitch.
2. **Inventario:** producir una tabla `Funcionalidad | componente/ruta existente | estado actual | reutilizable | cambio requerido | prioridad`.
3. **Brechas:** contrastar el código con las secciones 5–11 de este documento; identificar inconsistencias de conceptos, métricas y navegación.
4. **Plan incremental:** proponer cambios en pequeños PRs/commits: (i) navegación/modelo, (ii) Intake y persistencia de hallazgos, (iii) tabs de agentes, (iv) auditoría y glosas, (v) dashboard/escenario sintético. Adaptar al estado real del proyecto.
5. **Implementación:** preservar estilos, convenciones, componentes y APIs existentes; no hacer un rediseño completo sin necesidad. Evitar alterar el comportamiento interno de los agentes cuando solo se requiere cambiar su presentación.
6. **Pruebas:** verificar navegación, independencia de facturas, persistencia de hallazgos, ausencia de duplicados, cálculos de importes, cambios de estado y reproducción de la demo con datos sintéticos.
7. **Reporte final:** señalar archivos modificados, funcionalidades implementadas, partes simuladas, dependencias/bloqueos y trabajo pendiente para el 24/27 de noviembre.

### Prompt recomendado para ejecutar en Claude Code

> Lee `ARS_DEMO_REORIENTACION.md` y úsalo como guía de negocio y UX para reorientar la demo actual. **No empieces reescribiendo la aplicación.** Inspecciona primero el repositorio, identifica los widgets y los tres agentes que ya existen, compáralos con el documento y entrégame un diagnóstico de reutilización y un plan de cambios priorizado para la entrega del 24 de noviembre y la demostración del 27. Tu prioridad es completar el circuito ARS: **radicación → Intake → tres agentes separados → registro/consolidación de hallazgos → auditoría/glosado → comunicación al prestador**. Señala explícitamente cualquier función que deba simularse. Cuando tengamos el plan, implementa de forma incremental manteniendo la arquitectura y diseño actuales.

## 13. Preguntas de negocio pendientes (no bloquear el diagnóstico técnico)

- ¿Cuáles son exactamente los **tres agentes** que ya están implementados y qué devuelve cada uno?
- ¿Cuál es la **unidad jurídica/operativa de radicación y de glosa** en el caso concreto: factura, servicio, cuenta o lote?
- ¿Qué catálogo de motivos/códigos y reglas económicas utilizará esta ARS?
- ¿En qué etapa ocurre la solicitud formal de soportes y qué SLA/estados corresponden?
- ¿Qué operaciones están conectadas de verdad (IDP, Agent Mesh, notificaciones) y cuáles son mocks de interfaz?
- ¿Es posible definir un caso de demo con importes y glosas realistas validados por el experto funcional?

> **Principio rector:** la IA identifica inconsistencias y ayuda a fundamentarlas; el auditor toma y registra la decisión; la ARS comunica y gestiona la resolución. El prestador responde desde su experiencia separada. La demo del 27 de noviembre debe evidenciar este circuito desde la perspectiva de la ARS.
