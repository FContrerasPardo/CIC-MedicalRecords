'use strict';
// Backlog de la demo Medical Records: Epic -> HU (historia/habilitador/entregable) -> Task.
// Fuente: Epic Tracker v2 (2026-07-03), replanteado a la narrativa vigente
// «prevencion de glosas: validar la cuenta antes de enviarla» (docs/medical-records-demo-process-specification.md).
// Reglas de depuracion: ver `discards` al final.
//
// Claves de responsable -> login de GitHub (todos son colaboradores del repo).
const users = {
  F: 'FContrerasPardo', // Fernando
  L: 'larissa-trentin', // Larissa
  M: 'MauricioValdezHyland', // Mauricio
};

const milestones = {
  demo: { title: 'Demo', description: 'Alcance de la demostración final (spec Etapas 0-6).' },
  f2: { title: 'Fase 2', description: 'Ampliación inmediata tras la demo: aprobación, armado, envío y glosas base.' },
  f3: { title: 'Fase 3', description: 'Roadmap posterior: pago, cierre, conciliación, analítica e inteligencia acumulada.' },
};

const labels = [
  ['tipo:epic', '3E4B9E', 'Epic: resultado de negocio que agrupa historias'],
  ['tipo:historia', '0E8A16', 'Historia de usuario con valor visible para un usuario real de la demo'],
  ['tipo:tarea', 'C5DEF5', 'Trabajo concreto dentro de una historia'],
  ['tipo:habilitador', '5319E7', 'Trabajo técnico que desbloquea una historia o entrega'],
  ['tipo:entregable', '1D76DB', 'Material de la demo (datos, guion, video); no es funcionalidad de la app'],
  ['tipo:bug', 'D73A4A', 'Algo que debería funcionar y no funciona; vincular a su historia'],
  ['etapa:captura', 'BFDADC', 'Etapa 1 de la spec: captura y estructuración'],
  ['etapa:validacion-ia', 'BFDADC', 'Etapa 2 de la spec: validación previa con agentes IA'],
  ['etapa:envio', 'BFDADC', 'Etapa 3 de la spec: armado y envío'],
  ['etapa:glosas', 'BFDADC', 'Etapa 4 de la spec: recepción y gestión de glosas'],
  ['etapa:apelacion', 'BFDADC', 'Etapa 5 de la spec: respuesta y apelación'],
  ['etapa:pago-cierre', 'BFDADC', 'Etapa 6 de la spec: pago, conciliación y cierre'],
  ['etapa:transversal', 'BFDADC', 'Aplica a varias etapas'],
  ['etapa:demo', 'BFDADC', 'Material o entorno de la demo'],
  ['area:custom-ui', 'FEF2C0', 'Plugin Angular medical-records / Custom UI'],
  ['area:automate', 'FEF2C0', 'Procesos, tareas y scripts de Automate'],
  ['area:idp', 'FEF2C0', 'Clasificación y extracción documental'],
  ['area:agent-builder', 'FEF2C0', 'Agentes de Agent Builder'],
  ['area:kd', 'FEF2C0', 'Knowledge Discovery / Knowledge Enrichment'],
  ['area:ecm', 'FEF2C0', 'Contenido en CIC / Content Lake'],
  ['area:demo', 'FEF2C0', 'Guion, datos y entorno de la demo'],
  ['P0', 'B60205', 'Bloqueante'],
  ['P1', 'D93F0B', 'Alta (CRÍTICA en el tracker)'],
  ['P2', 'FBCA04', 'Media'],
  ['P3', 'C2E0C6', 'Baja'],
  ['skill-candidate', 'BFD4F2', 'Procedimiento repetido candidato a skill'],
];

const items = [];
const E = (id, o) => items.push({ kind: 'epic', id, ...o });
const S = (id, parent, o) => items.push({ kind: 'story', id, parent, ...o });
const T = (id, parent, o) => items.push({ kind: 'task', id, parent, ...o });

/* ============================ DEMO ============================ */

E('EP-1', {
  title: 'Cuenta lista para analizar',
  ms: 'demo', pri: 'P1', etapa: 'captura', area: 'custom-ui', who: ['F'], st: 'doing',
  obj: 'El analista inicia una cuenta médica cargando un documento, ve lo que IDP entendió del expediente y decide si la cuenta puede pasar al análisis agéntico (spec Etapas 0-3).',
  origin: 'E1-001, E1-002, E1-003, E1-005, E1-007, E1-008',
});

S('HU-1.1', 'EP-1', {
  type: 'historia', title: 'Iniciar una cuenta cargando un documento', who: ['F'], st: 'doing',
  persona: 'analista de facturación', want: 'iniciar el proceso de cuenta médica cargando un documento desde la Custom UI', why: 'que IDP lo clasifique y se cree la tarea Nueva Cuenta',
  ac: [
    'La carga desde la Custom UI crea una instancia del proceso `medical-records`.',
    'IDP procesa el documento inicial y se crea la tarea Nueva Cuenta.',
    '(runtime) Validado de punta a punta con un documento del set aprobado (HU-4.1).',
  ],
  plat: 'Proceso Automate `medical-records` y clases IDP desplegadas (ver export en `Automate/`).',
  origin: 'E1-001',
});
T('T-1.1.1', 'HU-1.1', { title: 'Configurar upload que inicia el proceso (Custom UI)', who: ['F'], st: 'done', origin: 'E1-001 s1' });
T('T-1.1.2', 'HU-1.1', { title: 'Validar inicio E2E con un documento del set aprobado (runtime)', who: ['F'], st: 'open', blocked: ['HU-4.1'], origin: 'nuevo' });

S('HU-1.2', 'EP-1', {
  type: 'habilitador', title: 'Contrato de datos batchState v1', who: ['F'], st: 'doing',
  persona: 'equipo de desarrollo', want: 'un contrato documentado y versionado de `batchState`', why: 'que IDP/Automate y los widgets evolucionen sin romperse entre sí',
  ac: [
    'Esquema de `batchState` y su versión documentados en la spec (sección variables y contratos).',
    'Los widgets aceptan objeto o string JSON y muestran un estado de error amigable si no parsea.',
    'Todo cambio al contrato actualiza la spec y el checklist E2E.',
  ],
  plat: 'Salida IDP / script de Automate que produce `batchState`.',
  origin: 'E1-005',
});
T('T-1.2.1', 'HU-1.2', { title: 'Construir batchState (objeto/JSON) para el intake', who: ['F'], st: 'done', origin: 'E1-005 s1' });
T('T-1.2.2', 'HU-1.2', { title: 'Documentar esquema y versión de batchState en la spec', who: ['F'], st: 'open', origin: 'nuevo' });
T('T-1.2.3', 'HU-1.2', { title: 'Catálogo CUPS simulado (JSON) como fuente de códigos', who: ['M'], st: 'done', origin: 'E1-001 s2', desc: 'Fase 1: un JSON simula la API de CUPS. La integración real queda para fases posteriores.' });

S('HU-1.3', 'EP-1', {
  type: 'historia', title: 'Revisar la cuenta en Nueva Cuenta (intake)', who: ['F'], st: 'doing', blocked: ['HU-1.2'],
  persona: 'analista de facturación', want: 'ver servicios facturados, soportes y estado documental en una sola vista', why: 'saber si la cuenta está lista para el análisis',
  ac: [
    'Service Explorer: servicios con CUPS, completitud, soportes requeridos/presentes/faltantes y confianza.',
    'Document Control Center: clase, estado, clasificación, extracción y highlights por documento.',
    '`readyForAnalysis` consolidado.',
    'Selector de paciente y banner de reconciliación OCR cuando hay varias cuentas.',
    'Save / Cancel / Complete siguen siendo acciones nativas de Automate.',
  ],
  plat: 'Formulario de la tarea Nueva Cuenta con el campo `intake-account-widget` mapeado a `batchState`.',
  origin: 'E1-007',
});
T('T-1.3.1', 'HU-1.3', { title: 'Leer batchState (objeto o string JSON) con estado de error amigable', who: ['F'], st: 'done', origin: 'E1-007 s1' });
T('T-1.3.2', 'HU-1.3', { title: 'Service Explorer (servicios facturados y soportes)', who: ['F'], st: 'done', origin: 'E1-007 s2' });
T('T-1.3.3', 'HU-1.3', { title: 'Document Control Center (clasificación y extracción)', who: ['F'], st: 'done', origin: 'E1-007 s3' });
T('T-1.3.4', 'HU-1.3', { title: 'Readiness consolidada (readyForAnalysis, heurísticas v1)', who: ['F'], st: 'doing', origin: 'E1-007 s4' });
T('T-1.3.5', 'HU-1.3', { title: 'Selector de paciente y banner de reconciliación OCR', who: ['F'], st: 'doing', origin: 'E1-007 s5' });

S('HU-1.4', 'EP-1', {
  type: 'historia', title: 'Enriquecer la cuenta y re-procesar (loop IDP)', who: ['F'], st: 'doing', blocked: ['HU-1.3'],
  persona: 'analista de facturación', want: 'agregar documentos durante Nueva Cuenta y que IDP los reprocese', why: 'completar el expediente sin avanzar con una cuenta incompleta',
  ac: [
    'Al completar Nueva Cuenta con documentos nuevos, IDP reprocesa y actualiza `batchState`.',
    'El flujo vuelve a Nueva Cuenta o avanza a la malla agéntica según la readiness.',
    '(runtime) Ambos caminos validados.',
  ],
  plat: 'Bifurcación post-intake en Automate (se configura en Studio, no es una tarea de este backlog).',
  origin: 'E1-008',
});
T('T-1.4.1', 'HU-1.4', { title: 'Reprocesar documentos y actualizar batchState desde la experiencia', who: ['F'], st: 'doing', origin: 'E1-008 s2' });
T('T-1.4.2', 'HU-1.4', { title: 'Validar retorno a Nueva Cuenta o avance a agentes (runtime)', who: ['F'], st: 'open', blocked: ['T-1.4.1'], origin: 'E1-008 s3' });

E('EP-2', {
  title: 'Prevención de glosas con malla agéntica',
  ms: 'demo', pri: 'P1', etapa: 'validacion-ia', area: 'agent-builder', who: ['F'], st: 'doing',
  obj: 'Antes de enviar la cuenta, tres agentes (Coding Integrity, Compliance Alert, Financial Variance) la analizan y la consola de Análisis presenta un score de riesgo de glosa y hallazgos para que el auditor decida. Es el diferenciador de la demo.',
  origin: 'E2-001, E2-002, E2-003, E2-004, E2-005',
});

S('HU-2.1', 'EP-2', {
  type: 'historia', title: 'Detectar inconsistencias de codificación', who: ['F'], st: 'doing',
  persona: 'auditor de cuentas médicas', want: 'que el agente Coding Integrity detecte incompatibilidades procedimiento-diagnóstico-código y duplicados', why: 'corregirlos antes de enviar la cuenta',
  ac: [
    'El outcome `codingIntegrityResult` llega como JSON no vacío con findings, recommendedActions, overallRiskLevel, readyForApproval y requiresManualReview.',
    '(runtime) Verificado con trazas (HU-2.6), no solo por revisión estática.',
  ],
  plat: 'Agente `coding-integrity-age-tkfvy`: inputs batchState, codingRules, payerCodingPolicy; outcome marcado Required. Se configura en Agent Builder; el export en `Automate/` es la fuente de verdad.',
  origin: 'E2-001',
});
T('T-2.1.1', 'HU-2.1', { title: 'Validar findings / recommendedActions / overallRiskLevel contra el schema del widget', who: ['F'], st: 'doing', origin: 'E2-001 s4' });
T('T-2.1.2', 'HU-2.1', { title: 'Prueba de outcome no vacío con cin ab invoke + trace (runtime)', who: ['F'], st: 'open', blocked: ['HU-2.6'], origin: 'E2-001 s5' });

S('HU-2.2', 'EP-2', {
  type: 'historia', title: 'Detectar documentos y autorizaciones faltantes', who: ['F'], st: 'doing',
  persona: 'auditor de cuentas médicas', want: 'que el agente Compliance Alert señale documentos obligatorios, autorizaciones y servicios bloqueados', why: 'solicitar lo que falta antes de enviar',
  ac: [
    'El outcome `complianceAlertResult` llega como JSON no vacío con missingDocuments y findings.',
    'Los documentos faltantes se presentan en la Custom UI.',
    '(runtime) Verificado con trazas (HU-2.6).',
  ],
  plat: 'Agente `compliance-alert-age-4x5t2`: inputs batchState (completo) y payerCompliancePolicy; outcome Required.',
  origin: 'E2-002',
});
T('T-2.2.1', 'HU-2.2', { title: 'Validar autorizaciones y servicios bloqueados', who: ['F'], st: 'doing', origin: 'E2-002 s4' });
T('T-2.2.2', 'HU-2.2', { title: 'Presentar missingDocuments en la consola de Análisis', who: ['F'], st: 'done', origin: 'E2-002 s2' });

S('HU-2.3', 'EP-2', {
  type: 'historia', title: 'Detectar desviaciones tarifarias', who: ['F'], st: 'doing',
  persona: 'auditor de cuentas médicas', want: 'que el agente Financial Variance compare lo facturado contra el convenio y lo autorizado', why: 'corregir desviaciones antes de que la aseguradora las glose',
  ac: [
    'El outcome `financialVarianceResult` llega como JSON no vacío con analyzedTotals, authorizationSummary y findings (TARIFF_DEVIATION).',
    'Probado con cuentas de más de una aseguradora o escenario.',
    '(runtime) Verificado con trazas (HU-2.6).',
  ],
  plat: 'Agente `finantial-v3-znvmy`: batchState slim vía script y tariffAgreement; outcome Required.',
  origin: 'E2-003',
});
T('T-2.3.1', 'HU-2.3', { title: 'Pruebas con cuentas de distintas aseguradoras', who: ['F'], st: 'open', blocked: ['T-4.1.5'], origin: 'E2-003 s5', desc: 'Hoy solo hay una cuenta de prueba (cliente piloto).' });

S('HU-2.4', 'EP-2', {
  type: 'habilitador', title: 'Consolidar resultados en un envelope único', who: ['F'], st: 'done',
  persona: 'equipo de desarrollo', want: 'un envelope JSON genérico que una los outcomes de los agentes', why: 'sumar agentes futuros sin cambiar el script ni el widget',
  ac: [
    'El script produce `unifiedWidgetPayload` y `unifiedWidgetPayloadText` (json1..json3 agentes, json4 batchState).',
    'Entradas vacías se ignoran, las inválidas van a warnings y el JSON doblemente encodeado se parsea.',
  ],
  plat: 'Script `BuildIncrementalUnifiedWidgetPayload` en el proceso AgentMesh.',
  origin: 'E2-004',
});
T('T-2.4.1', 'HU-2.4', { title: 'Script BuildIncrementalUnifiedWidgetPayload (json1..json4)', who: ['F'], st: 'done', origin: 'E2-004 s1-s2' });
T('T-2.4.2', 'HU-2.4', { title: 'Warnings y parseo profundo de JSON doblemente encodeado', who: ['F'], st: 'done', origin: 'E2-004 s3-s4' });

S('HU-2.5', 'EP-2', {
  type: 'historia', title: 'Decidir en la consola de Análisis', who: ['F'], st: 'doing', blocked: ['HU-2.4', 'HU-2.1', 'HU-2.2', 'HU-2.3'],
  persona: 'auditor de cuentas médicas', want: 'una consola con score de riesgo, hallazgos por agente y acciones recomendadas', why: 'decidir si la cuenta puede aprobarse o debe ajustarse',
  ac: [
    'Tarjetas de los tres agentes, score de riesgo de glosa y métricas (Inconsistencies, Missing Docs, Tariff Deviations).',
    'Tabla de Billed Items (unión por serviceCode / procedureCode / findingId).',
    '`Approve Proceed` bloqueado si falta un agente, hay JSON inválido o algún agente exige revisión manual.',
    'Estados Pending agent result / Invalid agent JSON / datos parciales.',
    'La recomendación de IA se presenta como asistencia: aprobación humana visible.',
  ],
  plat: 'Formulario de la tarea Analysis con un único campo `analysis-task-widget` mapeado a `unifiedWidgetPayloadText`.',
  origin: 'E2-005',
});
T('T-2.5.1', 'HU-2.5', { title: 'Resolver envelope y tarjetas de los 3 agentes', who: ['F'], st: 'done', origin: 'E2-005 s1' });
T('T-2.5.2', 'HU-2.5', { title: 'Score de riesgo de glosa y métricas visuales', who: ['F'], st: 'done', origin: 'E2-005 s2' });
T('T-2.5.3', 'HU-2.5', { title: 'Estados Pending / Invalid agent JSON / parciales', who: ['F'], st: 'done', origin: 'E2-005 s5' });
T('T-2.5.4', 'HU-2.5', { title: 'Tabla de Billed Items (unión por serviceCode / procedureCode)', who: ['F'], st: 'doing', origin: 'E2-005 s3' });
T('T-2.5.5', 'HU-2.5', { title: 'Gating de Approve Proceed', who: ['F'], st: 'doing', origin: 'E2-005 s4' });

S('HU-2.6', 'EP-2', {
  type: 'habilitador', title: 'Validar la malla agéntica con cin (ab + trace)', who: ['F'], st: 'open', blocked: ['HU-4.3'],
  persona: 'equipo de desarrollo', want: 'invocar y trazar los tres agentes desde la línea de comandos', why: 'detectar outcomes vacíos, errores y regresiones antes de cada demo sin revisar el event log a mano',
  ac: [
    'Set de casos representativos y de borde definido (cuenta completa, agente faltante, JSON inválido, documento ilegible).',
    'Procedimiento de smoke test: invocar, esperar la ingesta de trazas (~1-2 min), listar trazas con ERROR y revisar spans.',
    'Resultado y procedimiento documentados en `docs/Agent Builder Config/`.',
  ],
  plat: 'Plugin Hyland, skill `cin-cli` (`cin ab invoke`, `cin trace traces list|get`, `cin trace run-metrics dashboard`).',
  origin: 'nuevo (reemplaza revisión manual del event log de E2-001/002/003)',
});
T('T-2.6.1', 'HU-2.6', { title: 'Definir casos representativos y de borde (set de entradas)', who: ['F'], st: 'open', origin: 'nuevo' });
T('T-2.6.2', 'HU-2.6', { title: 'Smoke test: cin ab invoke + cin trace traces list --status ERROR', who: ['F'], st: 'open', blocked: ['T-2.6.1'], origin: 'nuevo' });
T('T-2.6.3', 'HU-2.6', { title: 'Documentar el procedimiento y evaluar como skill-candidate', who: ['F'], st: 'open', blocked: ['T-2.6.2'], labels: ['skill-candidate'], origin: 'nuevo' });

E('EP-3', {
  title: 'Visibilidad operativa: overview y dashboard',
  ms: 'demo', pri: 'P1', etapa: 'transversal', area: 'custom-ui', who: ['F'], st: 'doing',
  obj: 'El plugin `medical-records` es la entrada operacional: muestra las tareas abiertas reales de Automate y un tablero configurable de indicadores y métricas. Las etapas viven en las tareas de Automate, no en pantallas del plugin.',
  origin: 'E1-006, E1-009',
});
S('HU-3.1', 'EP-3', {
  type: 'historia', title: 'Ver mis tareas abiertas y entrar a la correcta', who: ['F'], st: 'doing',
  persona: 'analista de facturación', want: 'ver mis tareas abiertas y abrir la que corresponde', why: 'continuar el flujo de la cuenta sin buscar en menús',
  ac: [
    'Lista de tareas `CREATED` + `ASSIGNED` alineada con My Tasks.',
    'Un clic abre `task-details-cloud`; las tareas de subprocesos se filtran por `rootProcessInstanceId`.',
    'El overview no tiene navegación por etapas ni rutas visuales por fase.',
  ],
  plat: 'Servicios de consulta de tareas de Automate (ver `docs/custom-ui/processes-tasks-subprocesses.md`).',
  origin: 'E1-006, E1-009',
});
T('T-3.1.1', 'HU-3.1', { title: 'Preservar el shell nativo e integrar el plugin', who: ['F'], st: 'done', origin: 'E1-006 s1' });
T('T-3.1.2', 'HU-3.1', { title: 'Widget Open Tasks con tareas reales de Automate', who: ['F'], st: 'done', origin: 'E1-009 s2' });
T('T-3.1.3', 'HU-3.1', { title: 'Overview operacional sin navegación por etapas', who: ['F'], st: 'doing', origin: 'E1-006 s2' });
T('T-3.1.4', 'HU-3.1', { title: 'Abrir / redirigir a tareas activas de Automate', who: ['F'], st: 'doing', origin: 'E1-006 s3' });
T('T-3.1.5', 'HU-3.1', { title: 'Retirar rutas visuales por fase (referencia Stitch)', who: ['F'], st: 'open', blocked: ['T-3.1.3'], origin: 'E1-006 s4' });
S('HU-3.2', 'EP-3', {
  type: 'historia', title: 'Configurar indicadores y métricas del dashboard', who: ['F'], st: 'doing',
  persona: 'jefe de facturación', want: 'armar mi tablero con indicadores, métricas y gráficos', why: 'seguir las cuentas sin depender de desarrollo',
  ac: [
    'Secciones Indicadores / Métricas / Tareas abiertas.',
    'Builder de metric / chart / table con Detect fields y data providers (content / process / demo).',
    'Data bindings estilo OnBase (arguments / values / series / columns).',
    'El layout persiste; se decide si es por usuario (hoy `localStorage`).',
  ],
  plat: 'Variables y fuentes de datos expuestas por Automate/CIC para los bindings.',
  origin: 'E1-009',
});
T('T-3.2.1', 'HU-3.2', { title: 'Layout de secciones Indicadores / Métricas / Tareas abiertas (v4)', who: ['F'], st: 'done', origin: 'E1-009 s1' });
T('T-3.2.2', 'HU-3.2', { title: 'Persistencia del layout', who: ['F'], st: 'done', origin: 'E1-009 s5' });
T('T-3.2.3', 'HU-3.2', { title: 'Builder metric / chart / table con Detect fields', who: ['F'], st: 'doing', origin: 'E1-009 s3' });
T('T-3.2.4', 'HU-3.2', { title: 'Data bindings estilo OnBase', who: ['F'], st: 'doing', origin: 'E1-009 s4' });
T('T-3.2.5', 'HU-3.2', { title: 'Decidir si el layout se comparte por usuario (hoy localStorage)', who: ['F'], st: 'open', origin: 'nuevo' });

E('EP-4', {
  title: 'Material, entorno y calidad de la demo',
  ms: 'demo', pri: 'P1', etapa: 'demo', area: 'demo', who: ['F'], st: 'doing',
  obj: 'Que quien presenta tenga documentos sintéticos aprobados, un guion con lo real y lo simulado explícito, un flujo de desarrollo con el plugin Hyland y `cin`, y un repositorio público sin PII ni material interno.',
  origin: 'E1-002, E1-003, E1-004 + nuevos',
});
S('HU-4.1', 'EP-4', {
  type: 'entregable', title: 'Set documental sintético y tipologías aprobadas', who: ['L'], st: 'doing',
  persona: 'presentador de la demo', want: 'un set de documentos y tipologías aprobado, sintético y sin PII', why: 'ejecutar la demo y las pruebas de los agentes con datos confiables',
  ac: [
    'Taxonomía acotada y aprobada: Factura y Desglose, Formato de Autorización, Formulario de Objeciones, Reporte de Patología, Laboratorios.',
    'Clasificación con precisión ≥ 90 % sobre el lote de la demo.',
    'Campos extraídos por tipología confirmados.',
    'Documentos sintéticos o anonimizados (verificado en HU-4.5).',
    'Al menos una variante de aseguradora o escenario para pruebas tarifarias.',
  ],
  plat: 'Clases y extracción IDP (se configuran en la plataforma; aquí solo se aprueba el resultado).',
  origin: 'E1-002, E1-003, E1-004',
});
T('T-4.1.1', 'HU-4.1', { title: 'Recolectar muestras documentales', who: ['L'], st: 'doing', origin: 'E1-004 s1' });
T('T-4.1.2', 'HU-4.1', { title: 'Validar tipologías de la demo', who: ['L'], st: 'doing', origin: 'E1-004 s2, E1-002 s1' });
T('T-4.1.3', 'HU-4.1', { title: 'Confirmar campos extraídos por tipología', who: ['F'], st: 'doing', origin: 'E1-004 s3, E1-003' });
T('T-4.1.4', 'HU-4.1', { title: 'Aprobar el set final de documentos de la demo', who: ['L'], st: 'open', blocked: ['T-4.1.2', 'T-4.1.3'], origin: 'E1-004 s4' });
T('T-4.1.5', 'HU-4.1', { title: 'Variantes de aseguradora o escenario para pruebas tarifarias', who: ['L'], st: 'open', blocked: ['T-4.1.4'], origin: 'E2-003 s5' });
T('T-4.1.6', 'HU-4.1', { title: 'Validar precisión de clasificación ≥ 90 % con el lote de demo', who: ['L'], st: 'done', origin: 'E1-002 s4' });

S('HU-4.2', 'EP-4', {
  type: 'entregable', title: 'Guion, recorrido y video de respaldo de la demo', who: ['F'], st: 'open',
  persona: 'presentador de la demo', want: 'un guion por etapas y un video de respaldo', why: 'contar la narrativa de prevención de glosas y tener plan B si falla el ambiente',
  ac: [
    'El guion cubre: inicio → intake → re-IDP → malla agéntica → Análisis → overview.',
    'Queda explícito qué es real y qué es simulado (CUPS en JSON, acciones visuales v1).',
    'Video de respaldo y checklist pre-demo (ambiente, documentos, agentes con outcomes).',
  ],
  origin: 'nuevo (narrativa de la spec)',
});
T('T-4.2.1', 'HU-4.2', { title: 'Redactar el guion por etapas', who: ['F'], st: 'open', blocked: ['HU-4.1'], origin: 'nuevo' });
T('T-4.2.2', 'HU-4.2', { title: 'Grabar video de respaldo', who: ['F'], st: 'open', blocked: ['T-4.2.1', 'HU-2.5'], origin: 'nuevo' });
T('T-4.2.3', 'HU-4.2', { title: 'Checklist pre-demo (ambiente, documentos, agentes)', who: ['F'], st: 'open', origin: 'nuevo' });

S('HU-4.3', 'EP-4', {
  type: 'habilitador', title: 'Flujo de desarrollo con el plugin Hyland y cin', who: ['F'], st: 'open',
  persona: 'equipo de desarrollo', want: 'conectarnos a los ambientes y trabajar agentes y contenido con el plugin Hyland (`cin`) y los generadores `@hyland/extend`', why: 'tener un flujo repetible y menos configuración manual en Studio',
  ac: [
    '`cin` instalado y perfiles dev/staging configurados; `cin cfg check` en verde.',
    'Skills del plugin Hyland aplicables validadas contra este repo (`cin-cli`, `ontology-builder`).',
    'Definido qué se gestiona con `cin ab` y qué sigue en Studio.',
    '`CLAUDE.md` / `AGENTS.md` actualizados con el flujo, sin credenciales.',
  ],
  plat: 'Plugin Hyland (skills `cin-cli`, `ontology-builder`). No instalar `cin` fuera del procedimiento upstream.',
  origin: 'nuevo',
});
T('T-4.3.1', 'HU-4.3', { title: 'Instalar cin desde el repositorio upstream y comprobar cin --version', who: ['F'], st: 'open', origin: 'nuevo', desc: 'En la máquina de desarrollo actual `cin` no está instalado.' });
T('T-4.3.2', 'HU-4.3', { title: 'Configurar perfiles con cin cfg y verificar con cin cfg check', who: ['F'], st: 'open', blocked: ['T-4.3.1'], origin: 'nuevo', desc: 'No versionar credenciales ni tokens.' });
T('T-4.3.3', 'HU-4.3', { title: 'Validar skills del plugin Hyland aplicables y registrar el catálogo', who: ['F'], st: 'open', origin: 'nuevo' });
T('T-4.3.4', 'HU-4.3', { title: 'Actualizar CLAUDE.md / AGENTS.md con el flujo', who: ['F'], st: 'open', blocked: ['T-4.3.2', 'T-4.3.3'], origin: 'nuevo' });

S('HU-4.4', 'EP-4', {
  type: 'habilitador', title: 'Empaquetado, despliegue e i18n de la demo', who: ['F'], st: 'open',
  persona: 'equipo de desarrollo', want: 'un empaquetado repetible y traducciones completas', why: 'presentar la demo en cualquiera de los idiomas soportados',
  ac: [
    'Build AOT de `workspace-hxp` (configuración development) pasa como gate previo a cada commit.',
    'Runbook de re-empaquetado ensayado de punta a punta (la subida a Automate es manual).',
    'Locales sincronizados (0 faltantes, 0 sobrantes, 0 deriva de código) y sin `[TODO]` en los idiomas que se presentan.',
  ],
  origin: 'nuevo',
});
T('T-4.4.1', 'HU-4.4', { title: 'Completar traducciones [TODO] de de, fr, it, pl (~540 cadenas c/u) y pt (~447)', who: [], st: 'open', origin: 'nuevo' });
T('T-4.4.2', 'HU-4.4', { title: 'Ensayo de re-empaquetado y subida con el runbook', who: ['F'], st: 'open', origin: 'nuevo' });

S('HU-4.5', 'EP-4', {
  type: 'habilitador', title: 'Higiene del repositorio público', who: ['F'], st: 'open', pri: 'P0',
  persona: 'responsable del repositorio', want: 'que no haya PII, secretos ni material interno versionado', why: 'cumplir la política de uso de IA y de datos de Hyland con un repositorio público',
  ac: [
    'Los documentos de `docs/Demo Documents/` se verifican como sintéticos antes de versionarlos (hoy sin versionar).',
    'Se decide el destino de los trackers `.xlsx` versionados, ahora que el backlog vive en issues.',
    'Se revisa lo versionado en `contexts.json5` y se decide la visibilidad del repositorio.',
    'Los issues y PRs solo contienen datos sintéticos.',
  ],
  origin: 'nuevo',
});
T('T-4.5.1', 'HU-4.5', { title: 'Revisar docs/Demo Documents/ en busca de PII antes de versionar', who: ['F'], st: 'open', origin: 'nuevo' });
T('T-4.5.2', 'HU-4.5', { title: 'Decidir el destino de los trackers .xlsx versionados', who: ['F'], st: 'open', origin: 'nuevo', desc: 'Decisión del usuario.' });
T('T-4.5.3', 'HU-4.5', { title: 'Revisar contexts.json5 versionado y la visibilidad del repositorio', who: ['F'], st: 'open', origin: 'nuevo' });

/* ============================ FASE 2 ============================ */

E('EP-5', {
  title: 'Del hallazgo a la acción',
  ms: 'f2', pri: 'P1', etapa: 'validacion-ia', area: 'custom-ui', who: [], st: 'open', blocked: ['EP-2'],
  obj: 'Los widgets dejan de ser solo lectura: el auditor actúa sobre los hallazgos, el equipo de facturación recibe las correcciones como tareas y la cuenta se aprueba para pasar al armado (spec Etapa 7).',
  origin: 'E1-007 s6, E2-005 s6, E2-006, spec Etapa 7',
});
S('HU-5.1', 'EP-5', {
  type: 'historia', title: 'Ejecutar acciones sobre un hallazgo', st: 'open', blocked: ['HU-2.5', 'HU-1.3'],
  persona: 'auditor de cuentas médicas', want: 'ejecutar desde la consola acciones (Actualizar CUPS, Solicitar autorización, Revisar contrato, Rechazar/Ajustar, Aprobar)', why: 'cerrar el ciclo sin salir a otra pantalla',
  ac: ['Las acciones escriben en variables de Automate y respetan las acciones nativas Save/Cancel/Complete.', 'Aprobación humana visible; sin decisiones automáticas adversas.', '(runtime) Validado en el ambiente.'],
  plat: 'Variables de escritura mapeadas en el formulario (Studio).', origin: 'E1-007 s6, E2-005 s6',
});
S('HU-5.2', 'EP-5', {
  type: 'historia', title: 'Asignar correcciones al equipo de facturación', st: 'open', blocked: ['HU-5.1'],
  persona: 'auditor de cuentas médicas', want: 'convertir los hallazgos en tareas asignables por tipo de hallazgo', why: 'que la cuenta se corrija antes de salir',
  ac: ['Cada hallazgo accionable crea una tarea con asignación por tipo.', 'El equipo recibe notificación.', '(runtime) Flujo de corrección completo probado.'],
  origin: 'E2-006',
});
S('HU-5.3', 'EP-5', {
  type: 'historia', title: 'Aprobar la cuenta y preparar el armado', st: 'open', blocked: ['HU-2.5'],
  persona: 'auditor de cuentas médicas', want: 'revisar la cuenta tras el análisis, consolidar ajustes y aprobarla', why: 'preparar el paquete de envío',
  ac: ['Tarea de aprobación de Automate con su propio widget o campos.', 'Ajustes recomendados consolidados y trazables.', 'El plugin solo abre la tarea; no es la fuente de verdad de la etapa.'],
  origin: 'spec Etapa 7',
});

E('EP-6', {
  title: 'Expediente unificado y captura ampliada',
  ms: 'f2', pri: 'P2', etapa: 'captura', area: 'ecm', who: [], st: 'open',
  obj: 'Más allá de la carga manual: documentos que llegan por correo y escáner, expediente unificado por paciente en CIC, imágenes médicas enriquecidas e integración con el HIS.',
  origin: 'E1-001, E1-005, E1-010, E1-011',
});
S('HU-6.1', 'EP-6', {
  type: 'historia', title: 'Recibir documentos por correo y escáner', who: ['M', 'L'], st: 'doing',
  persona: 'analista de facturación', want: 'que los documentos lleguen por correo o escáner de red y creen la cuenta', why: 'no depender de la carga manual',
  ac: ['Conector de correo operativo.', 'Conector de escáner de red operativo.', 'Opcional: WhatsApp y SharePoint.'],
  plat: 'Conectores configurados en Automate (hoy en progreso: escáner y correo).', origin: 'E1-001 s3-s6',
});
S('HU-6.2', 'EP-6', {
  type: 'historia', title: 'Expediente unificado por paciente en CIC', st: 'open', blocked: ['HU-1.2'],
  persona: 'analista de facturación', want: 'un expediente único por paciente con sus documentos vinculados', why: 'tener la historia completa de la cuenta en un lugar',
  ac: ['Modelo del expediente y reglas de agrupación definidos.', 'Vinculación automática por ID de paciente.', 'Acceso por roles.'],
  plat: 'Replantear con las nuevas formas de trabajo de Hyland: ontología (`ontology-builder`) y contenido en Content Lake (`cin cl`, `cin ingest`) en lugar de carpetas manuales.', origin: 'E1-005 s2-s5',
});
S('HU-6.3', 'EP-6', {
  type: 'historia', title: 'Enriquecer imágenes médicas', who: ['M', 'L'], st: 'open',
  persona: 'auditor de cuentas médicas', want: 'buscar semánticamente RX, ecografías y fotografías con metadatos clínicos', why: 'sustentar una cuenta o una apelación con imágenes',
  ac: ['Pipeline de Knowledge Enrichment operativo.', 'Integración con Nilread definida.', 'Búsqueda semántica desde un agente de KD.'],
  origin: 'E1-010',
});
S('HU-6.4', 'EP-6', {
  type: 'historia', title: 'Sincronizar con el HIS del prestador', st: 'open',
  persona: 'analista de facturación', want: 'sincronizar con el sistema clínico del prestador', why: 'no duplicar digitación',
  ac: ['APIs del HIS del cliente relevadas.', 'Sincronización bidireccional probada.'], origin: 'E1-011',
});

E('EP-7', {
  title: 'Armado y envío de la cuenta',
  ms: 'f2', pri: 'P1', etapa: 'envio', area: 'automate', who: [], st: 'open', blocked: ['EP-5'],
  obj: 'El sistema arma el paquete en el formato de cada aseguradora y lo envía de forma trazable (spec Etapa 3).',
  origin: 'E3-001 … E3-006',
});
S('HU-7.1', 'EP-7', { type: 'historia', title: 'Generar RIPS automáticamente', st: 'open', blocked: ['HU-5.3', 'HU-1.2'], persona: 'analista de facturación', want: 'que el RIPS se arme a partir del expediente estructurado', why: 'enviar sin digitación manual', ac: ['Campos del expediente mapeados al estándar RIPS.', 'Archivo validado con el validador oficial.', 'Probado con varios tipos de evento.'], origin: 'E3-001' });
S('HU-7.2', 'EP-7', { type: 'historia', title: 'Adaptar el paquete a cada aseguradora', st: 'open', blocked: ['HU-7.1'], persona: 'analista de facturación', want: 'que el paquete se adapte a XML FHIR, EDI, RIPS o formato propietario según el convenio', why: 'enviar a cada aseguradora en su formato', ac: ['Formatos por aseguradora catalogados.', 'Generación probada por formato.', 'Portales sin API (RPA): solo si el cliente lo exige (retirado del backlog base).'], origin: 'E3-002, E3-004' });
S('HU-7.3', 'EP-7', { type: 'historia', title: 'Registrar la trazabilidad del envío', st: 'open', blocked: ['HU-7.1'], persona: 'jefe de facturación', want: 'fecha, hora, canal, destinatario y número de radicado guardados en el expediente', why: 'tener evidencia legal del envío', ac: ['Metadatos de trazabilidad definidos y escritos automáticamente.', 'Registro inmutable verificado.'], origin: 'E3-003' });
S('HU-7.4', 'EP-7', { type: 'historia', title: 'Seguir el estado de los envíos', st: 'open', blocked: ['HU-3.2', 'HU-7.3'], persona: 'jefe de facturación', want: 'ver el estado de todas las cuentas enviadas', why: 'saber cuáles están en tránsito, recibidas, en análisis o glosadas', ac: ['Se consolida con el dashboard configurable de HU-3.2.', 'KPIs definidos con el cliente.'], origin: 'E3-005' });
S('HU-7.5', 'EP-7', { type: 'historia', title: 'Reenviar tras un rechazo técnico', st: 'open', blocked: ['HU-7.3'], persona: 'analista de facturación', want: 'que un rechazo técnico se corrija y reenvíe con límite de reintentos', why: 'no perder plazos por errores de formato', ac: ['Tipos de rechazo mapeados por aseguradora.', 'Autocorrección con límite de reintentos y escalación.'], origin: 'E3-006' });

E('EP-8', {
  title: 'Glosas y apelación',
  ms: 'f2', pri: 'P1', etapa: 'glosas', area: 'automate', who: [], st: 'open', blocked: ['EP-7'],
  obj: 'El sistema recibe las glosas, abre el caso, avisa los plazos y ayuda al auditor a construir y enviar la apelación (spec Etapas 4 y 5).',
  origin: 'E4-001 … E4-008, E5-001 … E5-006',
});
S('HU-8.1', 'EP-8', { type: 'historia', title: 'Recibir una glosa y abrir el caso', st: 'open', blocked: ['HU-7.3'], persona: 'auditor de cuentas médicas', want: 'que la respuesta de la aseguradora se vincule al expediente y abra un caso asignado', why: 'ver de inmediato qué fue objetado y por qué valor', ac: ['Captura por correo, portal o EDI vinculada al expediente.', 'Caso con reglas de asignación y notificación.'], origin: 'E4-001, E4-002' });
S('HU-8.2', 'EP-8', { type: 'historia', title: 'Alertar los plazos de respuesta', st: 'open', blocked: ['HU-8.1'], persona: 'auditor de cuentas médicas', want: 'alertas T-5, T-2 y T-0 con escalación', why: 'no perder el derecho a apelar', ac: ['Plazos legales por aseguradora y país mapeados.', 'Escalación ante inacción probada.'], origin: 'E4-005' });
S('HU-8.3', 'EP-8', { type: 'historia', title: 'Clasificar las glosas por tipo', st: 'open', blocked: ['HU-8.1'], persona: 'auditor de cuentas médicas', want: 'que cada glosa se clasifique como técnica, administrativa, documental o de cobertura', why: 'priorizar y asignar', ac: ['Taxonomía definida.', 'Precisión de clasificación medida.'], origin: 'E4-006' });
S('HU-8.4', 'EP-8', { type: 'historia', title: 'Ver glosas e impacto financiero', st: 'open', blocked: ['HU-8.1', 'HU-3.2'], persona: 'jefe de facturación', want: 'un tablero de glosas por aseguradora, tipo y valor objetado con proyección de recupero', why: 'decidir dónde apelar', ac: ['Dimensiones definidas con el cliente.', 'Fórmulas de proyección de recupero definidas.'], origin: 'E4-004, E4-007' });
S('HU-8.5', 'EP-8', { type: 'historia', title: 'Construir la apelación con asistencia de IA', st: 'open', blocked: ['HU-8.1'], etapa: 'apelacion', persona: 'auditor de cuentas médicas', want: 'que el agente identifique documentos de soporte y redacte un borrador', why: 'responder más rápido y con mejor argumento', ac: ['Recuperación de documentos relevantes del expediente.', 'Borrador generado y validado con un auditor senior.', 'La IA asiste; la decisión es humana.'], origin: 'E5-001' });
S('HU-8.6', 'EP-8', { type: 'historia', title: 'Aprobar y enviar la apelación de forma trazable', st: 'open', blocked: ['HU-8.5', 'HU-7.3'], etapa: 'apelacion', persona: 'jefe de facturación', want: 'un flujo de aprobación interna con firma electrónica y envío registrado', why: 'enviar dentro del plazo con evidencia', ac: ['Flujo multinivel en Automate.', 'Envío y acuse registrados de forma inmutable.'], origin: 'E5-003, E5-004' });
S('HU-8.7', 'EP-8', { type: 'historia', title: 'Seguir el estado de cada apelación', st: 'open', blocked: ['HU-8.6'], etapa: 'apelacion', persona: 'auditor de cuentas médicas', want: 'ver si cada apelación está pendiente, aceptada, rechazada o en conciliación', why: 'dar seguimiento hasta el cierre', ac: ['Estados del caso de apelación configurados.', 'Alertas de cambio de estado.'], origin: 'E5-005' });

/* ============================ FASE 3 ============================ */

E('EP-9', {
  title: 'Pago, cierre y analítica de recupero',
  ms: 'f3', pri: 'P2', etapa: 'pago-cierre', area: 'automate', who: [], st: 'open', blocked: ['EP-8'],
  obj: 'Conciliar el pago contra la cuenta y los acuerdos de glosa, cerrar el expediente con trazabilidad completa y medir el ciclo y el recupero (spec Etapa 10).',
  origin: 'E6-001 … E6-006, E4-008',
});
S('HU-9.1', 'EP-9', { type: 'historia', title: 'Conciliar el pago automáticamente', st: 'open', blocked: ['HU-8.7'], persona: 'jefe de facturación', want: 'cruzar el valor pagado contra la cuenta y los acuerdos de glosa', why: 'identificar diferencias', ac: ['Reglas por tipo de acuerdo.', 'Alerta por diferencias no esperadas.', 'Probado con pagos parciales.'], origin: 'E6-001' });
S('HU-9.2', 'EP-9', { type: 'historia', title: 'Cerrar el expediente con trazabilidad completa', st: 'open', blocked: ['HU-9.1'], persona: 'jefe de facturación', want: 'cerrar el expediente con todo su historial', why: 'tener la cuenta auditable', ac: ['Checklist de cierre y sellado.', 'Acceso posterior de solo lectura.'], origin: 'E6-002' });
S('HU-9.3', 'EP-9', { type: 'historia', title: 'Ver recupero y métricas de ciclo', st: 'open', blocked: ['HU-9.1', 'HU-8.4'], persona: 'director financiero', want: 'facturado, glosado, recuperado y perdido por aseguradora, con tiempo de pago y tasa de éxito', why: 'medir el valor del proceso', ac: ['Métricas y KPIs definidos con el cliente.', 'Exportación a Excel/PDF.'], origin: 'E6-003, E6-005' });
S('HU-9.4', 'EP-9', { type: 'historia', title: 'Actualizar el ERP y cuentas por cobrar', st: 'open', blocked: ['HU-9.2'], persona: 'director financiero', want: 'que el cierre y el estado de las glosas actualicen el sistema contable', why: 'no duplicar registros', ac: ['API del ERP relevada.', 'Consistencia contable end-to-end probada.'], origin: 'E6-004, E4-008' });
S('HU-9.5', 'EP-9', { type: 'historia', title: 'Cumplir la retención documental', st: 'open', blocked: ['HU-9.2'], persona: 'responsable de cumplimiento', want: 'políticas de retención y pistas de auditoría inmutables', why: 'cumplir la normativa por país', ac: ['Normativa de retención mapeada por país.', 'Pistas de auditoría inmutables verificadas.'], origin: 'E6-006' });

E('EP-10', {
  title: 'Inteligencia acumulada (Knowledge Discovery)',
  ms: 'f3', pri: 'P2', etapa: 'transversal', area: 'kd', who: [], st: 'open', blocked: ['EP-8'],
  obj: 'El sistema aprende de cada caso resuelto: sabe qué glosas son apelables, con qué argumento y con qué tasa de éxito, y retroalimenta a los agentes de validación previa.',
  origin: 'E2-007, E4-003, E5-002, E5-006, E6-007',
});
S('HU-10.1', 'EP-10', { type: 'historia', title: 'Indexar el histórico de glosas', st: 'open', blocked: ['HU-8.1'], persona: 'auditor de cuentas médicas', want: 'el histórico de glosas (≥ 12 meses) indexado por aseguradora y código', why: 'anticipar objeciones recurrentes', ac: ['Histórico del cliente cargado e indexado.', 'Consulta de precedentes desde el agente validada.'], plat: 'Evaluar Content Lake / ingesta (`cin ingest`, `cin cl`) y ontología.', origin: 'E2-007 s1-s3, E4-003 s1' });
S('HU-10.2', 'EP-10', { type: 'historia', title: 'Ver la recurrencia de una glosa', st: 'open', blocked: ['HU-10.1'], persona: 'auditor de cuentas médicas', want: 'saber si la misma glosa se recibió antes y cómo terminó la apelación', why: 'decidir si aceptar o apelar', ac: ['Panel de recurrencia en el caso.', 'Tasa histórica de éxito calculada y validada con un auditor de referencia.'], origin: 'E4-003' });
S('HU-10.3', 'EP-10', { type: 'historia', title: 'Recuperar precedentes exitosos', st: 'open', blocked: ['HU-10.1', 'HU-8.5'], persona: 'auditor de cuentas médicas', want: 'ver casos similares donde la apelación fue aceptada y sus argumentos', why: 'apelar con un argumento probado', ac: ['Criterios de similitud y ranking por tasa de éxito.', 'Cada glosa resuelta retroalimenta la base.'], origin: 'E5-002, E5-006' });
S('HU-10.4', 'EP-10', { type: 'historia', title: 'Retroalimentar a los agentes de validación previa', st: 'open', blocked: ['HU-10.1', 'HU-9.1'], persona: 'jefe de facturación', want: 'que las métricas del ciclo cerrado mejoren la validación previa', why: 'reducir glosas desde el origen', ac: ['Pipeline KD → agentes definido.', 'Mejora de precisión medida ciclo a ciclo.'], origin: 'E2-007 s4, E6-007' });

/* ============== Que se retira o se absorbe (para el documento de revision) ============== */
const discards = [
  { group: 'Configuración de agentes en Agent Builder (configurar agente, mapear reglas, cargar tarifarios, tolerancias, marcar outcome Required ×3, missingDocuments)', refs: 'E2-001 s1-s3, E2-002 s1-s3, E2-003 s1-s4', why: 'Se hace en la plataforma; el export en `Automate/` es la fuente de verdad. Queda como «Dependencias de plataforma» en cada HU.', dest: 'HU-2.1, HU-2.2, HU-2.3 (nota de plataforma) + HU-2.6 (validación con `cin`)' },
  { group: 'Configuración IDP (entrenar modelo, subclasificación, excepciones, mapeo de campos, extracción de valores/fechas/tablas, agrupación)', refs: 'E1-002, E1-003', why: 'Configuración de plataforma; lo que importa para la demo es el resultado aprobado y el contrato `batchState`.', dest: 'HU-4.1 (set aprobado, precisión ≥ 90 %) y HU-1.2' },
  { group: 'Orquestación en Studio (bifurcación post-intake)', refs: 'E1-008 s1', why: 'Se modela en Automate, no en este backlog.', dest: 'Nota de plataforma de HU-1.4' },
  { group: 'Conectores y relevamientos por canal (WhatsApp, SharePoint, HIS, ERP, portales)', refs: 'E1-001 s5-s7, E1-011, E4-008, E3-004', why: 'Un solo ítem por capacidad; se desglosa cuando se active la historia. RPA de portales se retira (configuración de Automate, solo si el cliente lo exige).', dest: 'HU-6.1, HU-6.4, HU-9.4, nota de HU-7.2' },
  { group: 'Subtareas genéricas «Pruebas de…», «Capacitación…», «Validación con cliente/auditor», «Relevamiento…» (≈ 103 en E3-E6)', refs: 'E3-E6', why: 'No son trabajo de desarrollo identificable: pasan a criterios de aceptación y se crean como tareas al activar cada historia.', dest: '28 historias de Fase 2/3 (sin tareas)' },
  { group: 'Modelado del expediente (carpetas por paciente, content types, roles)', refs: 'E1-005 s2-s5', why: 'Se replantea con las nuevas formas de trabajo de Hyland (ontología, Content Lake) en lugar de carpetas manuales.', dest: 'HU-6.2' },
];

module.exports = { users, milestones, labels, items, discards };
