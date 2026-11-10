# Propuesta de backlog: Medical Records (Epics, HU y Tasks)

> Snapshot de la propuesta inicial, generado desde `docs/backlog/manifest.cjs`. La migración ya registra issues en GitHub (consulta confirmada el 2026-11-10); sus estados actuales se consultan allí. `docs/backlog/.state.json` es progreso local y no se versiona. No volver a ejecutar la migración para recrear este backlog.

## Narrativa que ordena el backlog

**Prevención de glosas: validar la cuenta antes de enviarla.** Cargar → estructurar (IDP) → revisar la cuenta (intake) → enriquecer (re-IDP) → validar con la malla agéntica → decidir en la consola de Análisis → seguir en el overview. Lo posterior (aprobación, envío, glosas, apelación, pago) queda en Fase 2 y Fase 3 a nivel de historia, sin tareas hasta activarlas.

## Reglas de depuración

- Una **HU** tiene un usuario real de la demo; los habilitadores y entregables son HU de otro tipo (`tipo:habilitador`, `tipo:entregable`).
- Lo que se configura en Automate, Agent Builder o IDP **no es una tarea** de este backlog: queda como «Dependencias de plataforma» en la HU; el export de `Automate/` es la fuente de verdad.
- Las validaciones de runtime son **criterios de aceptación** (líneas `(runtime)`), no issues sueltos.
- Las subtareas genéricas («Pruebas de…», «Capacitación…», «Validación con cliente…») no se migran; se crean al activar la HU.

## Resumen

| | Cantidad |
|---|---|
| Epics | 10 |
| HU (historias) | 37 |
| Habilitadores | 6 |
| Entregables | 2 |
| Tasks | 55 (✅ 17 · 🔄 14 · ⬜ 24) |
| **Issues en total** | **110** |
| Dependencias (bloqueado por) | 61 |

Tracker de origen: 45 epics y 187 subtareas.

Validación del manifiesto: ✅ sin errores

## Convenciones propuestas

- **Jerarquía**: sub-issues nativos de GitHub (Epic → HU → Task). **Dependencias**: relación nativa «blocked by».
- **Milestones** (sin fechas, para que las definas): Demo, Fase 2, Fase 3.
- **Labels**: `tipo:*` (epic, historia, tarea, habilitador, entregable, bug), `etapa:*` (etapas de la spec), `area:*` (custom-ui, automate, idp, agent-builder, kd, ecm, demo), `P0`–`P3` (CRÍTICA→P1, MEDIA→P2), `skill-candidate`.
- **Estado**: completado → issue cerrado; en progreso → `In Progress` en el proyecto MedRec; pendiente → `Todo`.
- **Responsables** (proponen según el tracker): Fernando → `FContrerasPardo`, Larissa → `larissa-trentin`, Mauricio → `MauricioValdezHyland`. Lo posterior a la demo queda sin asignar.

## Backlog propuesto

### EP-1 · Cuenta lista para analizar

🔄 **Demo** · P1 · etapa `captura` · área `custom-ui` · Fernando

El analista inicia una cuenta médica cargando un documento, ve lo que IDP entendió del expediente y decide si la cuenta puede pasar al análisis agéntico (spec Etapas 0-3).

- 🔄 **HU-1.1** `HU` Iniciar una cuenta cargando un documento — Fernando
  - _Como analista de facturación, quiero iniciar el proceso de cuenta médica cargando un documento desde la Custom UI, para que IDP lo clasifique y se cree la tarea Nueva Cuenta._
  - [x] T-1.1.1 Configurar upload que inicia el proceso (Custom UI) — Fernando
  - [ ] T-1.1.2 Validar inicio E2E con un documento del set aprobado (runtime) — Fernando · ⛔ HU-4.1
- 🔄 **HU-1.2** `HAB` Contrato de datos batchState v1 — Fernando
  - _Como equipo de desarrollo, quiero un contrato documentado y versionado de `batchState`, para que IDP/Automate y los widgets evolucionen sin romperse entre sí._
  - [x] T-1.2.1 Construir batchState (objeto/JSON) para el intake — Fernando
  - [ ] T-1.2.2 Documentar esquema y versión de batchState en la spec — Fernando
  - [x] T-1.2.3 Catálogo CUPS simulado (JSON) como fuente de códigos — Mauricio
- 🔄 **HU-1.3** `HU` Revisar la cuenta en Nueva Cuenta (intake) — Fernando · ⛔ HU-1.2
  - _Como analista de facturación, quiero ver servicios facturados, soportes y estado documental en una sola vista, para saber si la cuenta está lista para el análisis._
  - [x] T-1.3.1 Leer batchState (objeto o string JSON) con estado de error amigable — Fernando
  - [x] T-1.3.2 Service Explorer (servicios facturados y soportes) — Fernando
  - [x] T-1.3.3 Document Control Center (clasificación y extracción) — Fernando
  - [ ] T-1.3.4 Readiness consolidada (readyForAnalysis, heurísticas v1) — Fernando
  - [ ] T-1.3.5 Selector de paciente y banner de reconciliación OCR — Fernando
- 🔄 **HU-1.4** `HU` Enriquecer la cuenta y re-procesar (loop IDP) — Fernando · ⛔ HU-1.3
  - _Como analista de facturación, quiero agregar documentos durante Nueva Cuenta y que IDP los reprocese, para completar el expediente sin avanzar con una cuenta incompleta._
  - [ ] T-1.4.1 Reprocesar documentos y actualizar batchState desde la experiencia — Fernando
  - [ ] T-1.4.2 Validar retorno a Nueva Cuenta o avance a agentes (runtime) — Fernando · ⛔ T-1.4.1

### EP-2 · Prevención de glosas con malla agéntica

🔄 **Demo** · P1 · etapa `validacion-ia` · área `agent-builder` · Fernando

Antes de enviar la cuenta, tres agentes (Coding Integrity, Compliance Alert, Financial Variance) la analizan y la consola de Análisis presenta un score de riesgo de glosa y hallazgos para que el auditor decida. Es el diferenciador de la demo.

- 🔄 **HU-2.1** `HU` Detectar inconsistencias de codificación — Fernando
  - _Como auditor de cuentas médicas, quiero que el agente Coding Integrity detecte incompatibilidades procedimiento-diagnóstico-código y duplicados, para corregirlos antes de enviar la cuenta._
  - [ ] T-2.1.1 Validar findings / recommendedActions / overallRiskLevel contra el schema del widget — Fernando
  - [ ] T-2.1.2 Prueba de outcome no vacío con cin ab invoke + trace (runtime) — Fernando · ⛔ HU-2.6
- 🔄 **HU-2.2** `HU` Detectar documentos y autorizaciones faltantes — Fernando
  - _Como auditor de cuentas médicas, quiero que el agente Compliance Alert señale documentos obligatorios, autorizaciones y servicios bloqueados, para solicitar lo que falta antes de enviar._
  - [ ] T-2.2.1 Validar autorizaciones y servicios bloqueados — Fernando
  - [x] T-2.2.2 Presentar missingDocuments en la consola de Análisis — Fernando
- 🔄 **HU-2.3** `HU` Detectar desviaciones tarifarias — Fernando
  - _Como auditor de cuentas médicas, quiero que el agente Financial Variance compare lo facturado contra el convenio y lo autorizado, para corregir desviaciones antes de que la aseguradora las glose._
  - [ ] T-2.3.1 Pruebas con cuentas de distintas aseguradoras — Fernando · ⛔ T-4.1.5
- ✅ **HU-2.4** `HAB` Consolidar resultados en un envelope único — Fernando
  - _Como equipo de desarrollo, quiero un envelope JSON genérico que una los outcomes de los agentes, para sumar agentes futuros sin cambiar el script ni el widget._
  - [x] T-2.4.1 Script BuildIncrementalUnifiedWidgetPayload (json1..json4) — Fernando
  - [x] T-2.4.2 Warnings y parseo profundo de JSON doblemente encodeado — Fernando
- 🔄 **HU-2.5** `HU` Decidir en la consola de Análisis — Fernando · ⛔ HU-2.4, HU-2.1, HU-2.2, HU-2.3
  - _Como auditor de cuentas médicas, quiero una consola con score de riesgo, hallazgos por agente y acciones recomendadas, para decidir si la cuenta puede aprobarse o debe ajustarse._
  - [x] T-2.5.1 Resolver envelope y tarjetas de los 3 agentes — Fernando
  - [x] T-2.5.2 Score de riesgo de glosa y métricas visuales — Fernando
  - [x] T-2.5.3 Estados Pending / Invalid agent JSON / parciales — Fernando
  - [ ] T-2.5.4 Tabla de Billed Items (unión por serviceCode / procedureCode) — Fernando
  - [ ] T-2.5.5 Gating de Approve Proceed — Fernando
- ⬜ **HU-2.6** `HAB` Validar la malla agéntica con cin (ab + trace) — Fernando · ⛔ HU-4.3
  - _Como equipo de desarrollo, quiero invocar y trazar los tres agentes desde la línea de comandos, para detectar outcomes vacíos, errores y regresiones antes de cada demo sin revisar el event log a mano._
  - [ ] T-2.6.1 Definir casos representativos y de borde (set de entradas) — Fernando
  - [ ] T-2.6.2 Smoke test: cin ab invoke + cin trace traces list --status ERROR — Fernando · ⛔ T-2.6.1
  - [ ] T-2.6.3 Documentar el procedimiento y evaluar como skill-candidate — Fernando · ⛔ T-2.6.2

### EP-3 · Visibilidad operativa: overview y dashboard

🔄 **Demo** · P1 · etapa `transversal` · área `custom-ui` · Fernando

El plugin `medical-records` es la entrada operacional: muestra las tareas abiertas reales de Automate y un tablero configurable de indicadores y métricas. Las etapas viven en las tareas de Automate, no en pantallas del plugin.

- 🔄 **HU-3.1** `HU` Ver mis tareas abiertas y entrar a la correcta — Fernando
  - _Como analista de facturación, quiero ver mis tareas abiertas y abrir la que corresponde, para continuar el flujo de la cuenta sin buscar en menús._
  - [x] T-3.1.1 Preservar el shell nativo e integrar el plugin — Fernando
  - [x] T-3.1.2 Widget Open Tasks con tareas reales de Automate — Fernando
  - [ ] T-3.1.3 Overview operacional sin navegación por etapas — Fernando
  - [ ] T-3.1.4 Abrir / redirigir a tareas activas de Automate — Fernando
  - [ ] T-3.1.5 Retirar rutas visuales por fase (referencia Stitch) — Fernando · ⛔ T-3.1.3
- 🔄 **HU-3.2** `HU` Configurar indicadores y métricas del dashboard — Fernando
  - _Como jefe de facturación, quiero armar mi tablero con indicadores, métricas y gráficos, para seguir las cuentas sin depender de desarrollo._
  - [x] T-3.2.1 Layout de secciones Indicadores / Métricas / Tareas abiertas (v4) — Fernando
  - [x] T-3.2.2 Persistencia del layout — Fernando
  - [ ] T-3.2.3 Builder metric / chart / table con Detect fields — Fernando
  - [ ] T-3.2.4 Data bindings estilo OnBase — Fernando
  - [ ] T-3.2.5 Decidir si el layout se comparte por usuario (hoy localStorage) — Fernando

### EP-4 · Material, entorno y calidad de la demo

🔄 **Demo** · P1 · etapa `demo` · área `demo` · Fernando

Que quien presenta tenga documentos sintéticos aprobados, un guion con lo real y lo simulado explícito, un flujo de desarrollo con el plugin Hyland y `cin`, y un repositorio público sin PII ni material interno.

- 🔄 **HU-4.1** `ENT` Set documental sintético y tipologías aprobadas — Larissa
  - _Como presentador de la demo, quiero un set de documentos y tipologías aprobado, sintético y sin PII, para ejecutar la demo y las pruebas de los agentes con datos confiables._
  - [ ] T-4.1.1 Recolectar muestras documentales — Larissa
  - [ ] T-4.1.2 Validar tipologías de la demo — Larissa
  - [ ] T-4.1.3 Confirmar campos extraídos por tipología — Fernando
  - [ ] T-4.1.4 Aprobar el set final de documentos de la demo — Larissa · ⛔ T-4.1.2, T-4.1.3
  - [ ] T-4.1.5 Variantes de aseguradora o escenario para pruebas tarifarias — Larissa · ⛔ T-4.1.4
  - [x] T-4.1.6 Validar precisión de clasificación ≥ 90 % con el lote de demo — Larissa
- ⬜ **HU-4.2** `ENT` Guion, recorrido y video de respaldo de la demo — Fernando
  - _Como presentador de la demo, quiero un guion por etapas y un video de respaldo, para contar la narrativa de prevención de glosas y tener plan B si falla el ambiente._
  - [ ] T-4.2.1 Redactar el guion por etapas — Fernando · ⛔ HU-4.1
  - [ ] T-4.2.2 Grabar video de respaldo — Fernando · ⛔ T-4.2.1, HU-2.5
  - [ ] T-4.2.3 Checklist pre-demo (ambiente, documentos, agentes) — Fernando
- ⬜ **HU-4.3** `HAB` Flujo de desarrollo con el plugin Hyland y cin — Fernando
  - _Como equipo de desarrollo, quiero conectarnos a los ambientes y trabajar agentes y contenido con el plugin Hyland (`cin`) y los generadores `@hyland/extend`, para tener un flujo repetible y menos configuración manual en Studio._
  - [ ] T-4.3.1 Instalar cin desde el repositorio upstream y comprobar cin --version — Fernando
  - [ ] T-4.3.2 Configurar perfiles con cin cfg y verificar con cin cfg check — Fernando · ⛔ T-4.3.1
  - [ ] T-4.3.3 Validar skills del plugin Hyland aplicables y registrar el catálogo — Fernando
  - [ ] T-4.3.4 Actualizar CLAUDE.md / AGENTS.md con el flujo — Fernando · ⛔ T-4.3.2, T-4.3.3
- ⬜ **HU-4.4** `HAB` Empaquetado, despliegue e i18n de la demo — Fernando
  - _Como equipo de desarrollo, quiero un empaquetado repetible y traducciones completas, para presentar la demo en cualquiera de los idiomas soportados._
  - [ ] T-4.4.1 Completar traducciones [TODO] de de, fr, it, pl (~540 cadenas c/u) y pt (~447) — sin asignar
  - [ ] T-4.4.2 Ensayo de re-empaquetado y subida con el runbook — Fernando
- ⬜ **HU-4.5** `HAB` Higiene del repositorio público — Fernando
  - _Como responsable del repositorio, quiero que no haya PII, secretos ni material interno versionado, para cumplir la política de uso de IA y de datos de Hyland con un repositorio público._
  - [ ] T-4.5.1 Revisar docs/Demo Documents/ en busca de PII antes de versionar — Fernando
  - [ ] T-4.5.2 Decidir el destino de los trackers .xlsx versionados — Fernando
  - [ ] T-4.5.3 Revisar contexts.json5 versionado y la visibilidad del repositorio — Fernando

### EP-5 · Del hallazgo a la acción

⬜ **Fase 2** · P1 · etapa `validacion-ia` · área `custom-ui` · sin asignar · bloqueado por EP-2

Los widgets dejan de ser solo lectura: el auditor actúa sobre los hallazgos, el equipo de facturación recibe las correcciones como tareas y la cuenta se aprueba para pasar al armado (spec Etapa 7).

- ⬜ **HU-5.1** `HU` Ejecutar acciones sobre un hallazgo — sin asignar · ⛔ HU-2.5, HU-1.3
  - _Como auditor de cuentas médicas, quiero ejecutar desde la consola acciones (Actualizar CUPS, Solicitar autorización, Revisar contrato, Rechazar/Ajustar, Aprobar), para cerrar el ciclo sin salir a otra pantalla._
- ⬜ **HU-5.2** `HU` Asignar correcciones al equipo de facturación — sin asignar · ⛔ HU-5.1
  - _Como auditor de cuentas médicas, quiero convertir los hallazgos en tareas asignables por tipo de hallazgo, para que la cuenta se corrija antes de salir._
- ⬜ **HU-5.3** `HU` Aprobar la cuenta y preparar el armado — sin asignar · ⛔ HU-2.5
  - _Como auditor de cuentas médicas, quiero revisar la cuenta tras el análisis, consolidar ajustes y aprobarla, para preparar el paquete de envío._

### EP-6 · Expediente unificado y captura ampliada

⬜ **Fase 2** · P2 · etapa `captura` · área `ecm` · sin asignar

Más allá de la carga manual: documentos que llegan por correo y escáner, expediente unificado por paciente en CIC, imágenes médicas enriquecidas e integración con el HIS.

- 🔄 **HU-6.1** `HU` Recibir documentos por correo y escáner — Mauricio / Larissa
  - _Como analista de facturación, quiero que los documentos lleguen por correo o escáner de red y creen la cuenta, para no depender de la carga manual._
- ⬜ **HU-6.2** `HU` Expediente unificado por paciente en CIC — sin asignar · ⛔ HU-1.2
  - _Como analista de facturación, quiero un expediente único por paciente con sus documentos vinculados, para tener la historia completa de la cuenta en un lugar._
- ⬜ **HU-6.3** `HU` Enriquecer imágenes médicas — Mauricio / Larissa
  - _Como auditor de cuentas médicas, quiero buscar semánticamente RX, ecografías y fotografías con metadatos clínicos, para sustentar una cuenta o una apelación con imágenes._
- ⬜ **HU-6.4** `HU` Sincronizar con el HIS del prestador — sin asignar
  - _Como analista de facturación, quiero sincronizar con el sistema clínico del prestador, para no duplicar digitación._

### EP-7 · Armado y envío de la cuenta

⬜ **Fase 2** · P1 · etapa `envio` · área `automate` · sin asignar · bloqueado por EP-5

El sistema arma el paquete en el formato de cada aseguradora y lo envía de forma trazable (spec Etapa 3).

- ⬜ **HU-7.1** `HU` Generar RIPS automáticamente — sin asignar · ⛔ HU-5.3, HU-1.2
  - _Como analista de facturación, quiero que el RIPS se arme a partir del expediente estructurado, para enviar sin digitación manual._
- ⬜ **HU-7.2** `HU` Adaptar el paquete a cada aseguradora — sin asignar · ⛔ HU-7.1
  - _Como analista de facturación, quiero que el paquete se adapte a XML FHIR, EDI, RIPS o formato propietario según el convenio, para enviar a cada aseguradora en su formato._
- ⬜ **HU-7.3** `HU` Registrar la trazabilidad del envío — sin asignar · ⛔ HU-7.1
  - _Como jefe de facturación, quiero fecha, hora, canal, destinatario y número de radicado guardados en el expediente, para tener evidencia legal del envío._
- ⬜ **HU-7.4** `HU` Seguir el estado de los envíos — sin asignar · ⛔ HU-3.2, HU-7.3
  - _Como jefe de facturación, quiero ver el estado de todas las cuentas enviadas, para saber cuáles están en tránsito, recibidas, en análisis o glosadas._
- ⬜ **HU-7.5** `HU` Reenviar tras un rechazo técnico — sin asignar · ⛔ HU-7.3
  - _Como analista de facturación, quiero que un rechazo técnico se corrija y reenvíe con límite de reintentos, para no perder plazos por errores de formato._

### EP-8 · Glosas y apelación

⬜ **Fase 2** · P1 · etapa `glosas` · área `automate` · sin asignar · bloqueado por EP-7

El sistema recibe las glosas, abre el caso, avisa los plazos y ayuda al auditor a construir y enviar la apelación (spec Etapas 4 y 5).

- ⬜ **HU-8.1** `HU` Recibir una glosa y abrir el caso — sin asignar · ⛔ HU-7.3
  - _Como auditor de cuentas médicas, quiero que la respuesta de la aseguradora se vincule al expediente y abra un caso asignado, para ver de inmediato qué fue objetado y por qué valor._
- ⬜ **HU-8.2** `HU` Alertar los plazos de respuesta — sin asignar · ⛔ HU-8.1
  - _Como auditor de cuentas médicas, quiero alertas T-5, T-2 y T-0 con escalación, para no perder el derecho a apelar._
- ⬜ **HU-8.3** `HU` Clasificar las glosas por tipo — sin asignar · ⛔ HU-8.1
  - _Como auditor de cuentas médicas, quiero que cada glosa se clasifique como técnica, administrativa, documental o de cobertura, para priorizar y asignar._
- ⬜ **HU-8.4** `HU` Ver glosas e impacto financiero — sin asignar · ⛔ HU-8.1, HU-3.2
  - _Como jefe de facturación, quiero un tablero de glosas por aseguradora, tipo y valor objetado con proyección de recupero, para decidir dónde apelar._
- ⬜ **HU-8.5** `HU` Construir la apelación con asistencia de IA — sin asignar · ⛔ HU-8.1
  - _Como auditor de cuentas médicas, quiero que el agente identifique documentos de soporte y redacte un borrador, para responder más rápido y con mejor argumento._
- ⬜ **HU-8.6** `HU` Aprobar y enviar la apelación de forma trazable — sin asignar · ⛔ HU-8.5, HU-7.3
  - _Como jefe de facturación, quiero un flujo de aprobación interna con firma electrónica y envío registrado, para enviar dentro del plazo con evidencia._
- ⬜ **HU-8.7** `HU` Seguir el estado de cada apelación — sin asignar · ⛔ HU-8.6
  - _Como auditor de cuentas médicas, quiero ver si cada apelación está pendiente, aceptada, rechazada o en conciliación, para dar seguimiento hasta el cierre._

### EP-9 · Pago, cierre y analítica de recupero

⬜ **Fase 3** · P2 · etapa `pago-cierre` · área `automate` · sin asignar · bloqueado por EP-8

Conciliar el pago contra la cuenta y los acuerdos de glosa, cerrar el expediente con trazabilidad completa y medir el ciclo y el recupero (spec Etapa 10).

- ⬜ **HU-9.1** `HU` Conciliar el pago automáticamente — sin asignar · ⛔ HU-8.7
  - _Como jefe de facturación, quiero cruzar el valor pagado contra la cuenta y los acuerdos de glosa, para identificar diferencias._
- ⬜ **HU-9.2** `HU` Cerrar el expediente con trazabilidad completa — sin asignar · ⛔ HU-9.1
  - _Como jefe de facturación, quiero cerrar el expediente con todo su historial, para tener la cuenta auditable._
- ⬜ **HU-9.3** `HU` Ver recupero y métricas de ciclo — sin asignar · ⛔ HU-9.1, HU-8.4
  - _Como director financiero, quiero facturado, glosado, recuperado y perdido por aseguradora, con tiempo de pago y tasa de éxito, para medir el valor del proceso._
- ⬜ **HU-9.4** `HU` Actualizar el ERP y cuentas por cobrar — sin asignar · ⛔ HU-9.2
  - _Como director financiero, quiero que el cierre y el estado de las glosas actualicen el sistema contable, para no duplicar registros._
- ⬜ **HU-9.5** `HU` Cumplir la retención documental — sin asignar · ⛔ HU-9.2
  - _Como responsable de cumplimiento, quiero políticas de retención y pistas de auditoría inmutables, para cumplir la normativa por país._

### EP-10 · Inteligencia acumulada (Knowledge Discovery)

⬜ **Fase 3** · P2 · etapa `transversal` · área `kd` · sin asignar · bloqueado por EP-8

El sistema aprende de cada caso resuelto: sabe qué glosas son apelables, con qué argumento y con qué tasa de éxito, y retroalimenta a los agentes de validación previa.

- ⬜ **HU-10.1** `HU` Indexar el histórico de glosas — sin asignar · ⛔ HU-8.1
  - _Como auditor de cuentas médicas, quiero el histórico de glosas (≥ 12 meses) indexado por aseguradora y código, para anticipar objeciones recurrentes._
- ⬜ **HU-10.2** `HU` Ver la recurrencia de una glosa — sin asignar · ⛔ HU-10.1
  - _Como auditor de cuentas médicas, quiero saber si la misma glosa se recibió antes y cómo terminó la apelación, para decidir si aceptar o apelar._
- ⬜ **HU-10.3** `HU` Recuperar precedentes exitosos — sin asignar · ⛔ HU-10.1, HU-8.5
  - _Como auditor de cuentas médicas, quiero ver casos similares donde la apelación fue aceptada y sus argumentos, para apelar con un argumento probado._
- ⬜ **HU-10.4** `HU` Retroalimentar a los agentes de validación previa — sin asignar · ⛔ HU-10.1, HU-9.1
  - _Como jefe de facturación, quiero que las métricas del ciclo cerrado mejoren la validación previa, para reducir glosas desde el origen._

## Qué se retira o se absorbe

| Grupo del tracker | Origen | Por qué | Destino |
|---|---|---|---|
| Configuración de agentes en Agent Builder (configurar agente, mapear reglas, cargar tarifarios, tolerancias, marcar outcome Required ×3, missingDocuments) | E2-001 s1-s3, E2-002 s1-s3, E2-003 s1-s4 | Se hace en la plataforma; el export en `Automate/` es la fuente de verdad. Queda como «Dependencias de plataforma» en cada HU. | HU-2.1, HU-2.2, HU-2.3 (nota de plataforma) + HU-2.6 (validación con `cin`) |
| Configuración IDP (entrenar modelo, subclasificación, excepciones, mapeo de campos, extracción de valores/fechas/tablas, agrupación) | E1-002, E1-003 | Configuración de plataforma; lo que importa para la demo es el resultado aprobado y el contrato `batchState`. | HU-4.1 (set aprobado, precisión ≥ 90 %) y HU-1.2 |
| Orquestación en Studio (bifurcación post-intake) | E1-008 s1 | Se modela en Automate, no en este backlog. | Nota de plataforma de HU-1.4 |
| Conectores y relevamientos por canal (WhatsApp, SharePoint, HIS, ERP, portales) | E1-001 s5-s7, E1-011, E4-008, E3-004 | Un solo ítem por capacidad; se desglosa cuando se active la historia. RPA de portales se retira (configuración de Automate, solo si el cliente lo exige). | HU-6.1, HU-6.4, HU-9.4, nota de HU-7.2 |
| Subtareas genéricas «Pruebas de…», «Capacitación…», «Validación con cliente/auditor», «Relevamiento…» (≈ 103 en E3-E6) | E3-E6 | No son trabajo de desarrollo identificable: pasan a criterios de aceptación y se crean como tareas al activar cada historia. | 28 historias de Fase 2/3 (sin tareas) |
| Modelado del expediente (carpetas por paciente, content types, roles) | E1-005 s2-s5 | Se replantea con las nuevas formas de trabajo de Hyland (ontología, Content Lake) en lugar de carpetas manuales. | HU-6.2 |

## Decisiones que necesito de ti

1. **Visibilidad**: el repositorio es público. Los issues se redactaron sin nombres de cliente y con datos sintéticos; confirma que quieres publicarlos ahí (ver HU-4.5).
2. **Responsables**: ¿asigno a Fernando, Larissa y Mauricio como arriba? Se les notificará por GitHub.
3. **Cerrados**: ¿creo como cerrados los ítems ya completados para conservar el avance (✅)?
4. **Proyecto**: ¿agrego todo al proyecto `MedRec` con el estado inicial?
5. **Esquema de labels**: difiere del de Agentic-bank (que usa `tipo:feature` y epic = milestone) porque aquí el epic es un issue.
