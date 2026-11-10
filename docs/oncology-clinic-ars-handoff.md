# Continuidad: MedicalRecords, Oncopilot y conexión clínica–ARS

Fecha: 2026-11-10. Este documento permite retomar el trabajo desde otra máquina.
Describe el encargo del usuario, la evidencia disponible y los próximos pasos.
La evaluación oncológica sigue abierta; no acredita una integración desplegada.

Seguimiento y destino de capturas:
[issue #126](https://github.com/FContrerasPardo/CIC-MedicalRecords/issues/126).

## Objetivo y contexto aportado por el usuario

Larissa trabajó en una solución semejante para una clínica oncológica, enfocada
en la gestión de autorizaciones. Según el usuario, en nuestro ambiente se
implementaron Automate y backend; un partner construyó el frontend de referencia.
El usuario describe ese frontend como una demo visual que presenta información
del backend. No se ha inspeccionado su implementación ni verificado esa conexión.

Referencia: [Oncopilot](https://oncopilot-v2.libertyti.com.br/).
La aplicación ofrece experiencias por rol mediante un selector superior derecho.
También existe una experiencia médica separada en
[OncoTask](https://oncopilot-v2.libertyti.com.br/oncotask), que muestra cómo se
integraría la información en el entorno de trabajo del médico.

El objetivo nuevo es conectar ambos mundos en una sola demostración:

- **Clínica:** solicitud y seguimiento de autorización oncológica, gestión de
  pendientes y participación del médico desde OncoTask.
- **ARS / aseguradora:** recepción de solicitudes, revisión de soportes y
  gestión de autorizaciones y excepciones, manteniendo otras fuentes de entrada.
- **CIC:** procesar información estructurada y documentos heterogéneos; mostrar
  el camino directo cuando se cumplen las condiciones definidas y el camino de
  excepciones cuando falta información o se requiere revisión.

La demo debe tener información oncológica coherente y útil. Los escenarios y
sus reglas se definirán con evidencia y revisión de dominio, sin inventar
criterios clínicos ni presentar recomendaciones de IA como decisiones médicas.
El alcance de automatización del camino directo aún debe definirse; no se ha
aprobado automatizar decisiones clínicas ni negativas de cobertura.

## Relación con la demo actual

El alcance documentado actual parte de cuentas médicas del prestador y prevención
de glosas. El usuario quiere evolucionar hacia la perspectiva de la aseguradora
y conectar a la clínica; ese cambio lógico aún no está diseñado ni implementado.
No reinterpretar silenciosamente el flujo vigente como si ya fuera un proceso ARS.

La base funcional y técnica actual se consulta en:

- `CONTEXT.md` y `docs/medical-records-demo-process-specification.md`.
- `IA_CONTEXT.md`, con rutas, contratos y restricciones del entorno.
- `Automate/OMEGA BUILDER - Latam Medical Billing CUI/`, fuente de verdad local
  de BPMN, formularios, variables y agentes. No se aportó todavía el export
  específico de la solución oncológica de Larissa.
- `CustomUI/medicalrecords-pq7lr-source/`, plantilla Angular principal.

Se deben evaluar para reutilización el intake documental, la clasificación y
extracción, `batchState`, el reproceso de documentos, las tareas de Automate,
el overview, la consola de análisis y su envelope `unifiedWidgetPayloadText`.
La compatibilidad con autorización oncológica no está demostrada: requiere
comparar entidades, estados, reglas y contratos de ambos procesos.

## Evidencia obtenida y límites

| Fuente | Qué se observó | Qué no prueba |
| --- | --- | --- |
| Explicación del usuario | Contexto de Larissa, partner, backend y objetivo clínica–ARS | Contratos ni funcionamiento desplegado |
| Recursos públicos de navegación | Perfiles `analista`, `gestor`, `comissao`; rutas de autorizaciones, revisión documental, gestión y directrices | Permisos reales del backend, contenido completo ni funcionamiento de cada pantalla |
| Captura compartida de OncoTask | Inicio con tareas/calendario, buscador de protocolos, indicadores, avisos y navegación a tareas/pacientes | Recorrido completo ni ejecución de acciones |
| Nota visible en OncoTask | Las comprobaciones se atribuyen a OncoPilot; la corrección de campos estructurados permanece en Tasy | Integración real con Tasy ni sincronización efectiva |
| Backlog consultado | Existen issues de MedicalRecords en GitHub | Que el manifiesto local refleje sus estados actuales |

No se completó el recorrido visual por perfiles. El controlador del navegador
falló antes de interactuar, incluso tras reiniciar Codex, con
`windows sandbox failed: helper_unknown_error: setup refresh had errors`.
La ejecución elevada de comandos locales funcionó, pero el controlador visual
no ofreció esa opción. Algunas consultas HTTP a rutas encontraron una barrera
de acceso y se detuvo esa vía; no se intentó sortearla.

El usuario decidió realizar el recorrido fuera de este entorno y subir capturas
a GitHub. Esas capturas serán la siguiente fuente de evidencia. No describir
este trabajo como una validación visual completa ni como pruebas end-to-end.

## Trabajo ya incorporado en esta integración

- Panel de apariencia persistente para ocultar/restaurar el menú de aplicación.
- Mejoras de tamaño móvil, cierre exterior y foco del panel.
- Tokens semánticos compartidos `--mr-*`, aliases para dashboard, reglas y KPI.
- Refactor visual del overview, cabecera responsive y estilos de sus ocho tipos
  de widget, con conservación de datos y colores de series/estados.
- Doce perfiles de desarrollo para Codex y Claude; canon y catálogo en `docs/agents/`.
- Cinco entradas de skills de proyecto para Codex: UI/Satori, documentación,
  triage, CIN CLI y auditoría i18n. El script i18n no se duplicó.
- Adaptaciones selectivas de CIC-Learn; no instalación global del plugin Hyland,
  hooks, MCP ni actualización de paquetes de Satori/ADF.

El usuario confirmó el primer tramo de apariencia. La revisión visual completa
del segundo tramo del overview sigue pendiente. Se revisaron los diffs y se
ejecutó `git diff --check`; no se ejecutaron build AOT, tests ni lint.
La regla del repo exige autorización explícita para esos comandos. Integrar el
código no equivale a compilarlo ni desplegarlo en Studio.

## Próximo trabajo y propuesta de desglose

Primero completar el descubrimiento. Los frentes siguientes son candidatos a
épicas, no funcionalidades aprobadas ni una lista de issues ya creados:

| Frente candidato | Resultado a evaluar |
| --- | --- |
| Experiencias por rol | Matriz de pantallas, tareas y acceso para clínica, médico y ARS |
| Solicitud oncológica | Expediente, soportes y trazabilidad desde la clínica hasta la ARS |
| Recepción multicanal | Entrada estructurada y entrada documental convergen en un caso correlacionado |
| Camino directo y excepciones | Condiciones explícitas, pendientes, revisión y reproceso; sin decisiones ocultas |
| Continuidad médica / OncoTask | Tareas médicas y seguimiento, con límites de corrección entre sistemas definidos |
| Operación y narrativa | Indicadores y guion único con escenarios oncológicos coherentes |

Secuencia para retomar:

1. Leer el issue de seguimiento y las capturas que suba el usuario.
2. Recorrer analista, gestor, comisión y médico/OncoTask; registrar URL, rol,
   pantalla, acción, entrada/salida, estados y evidencia de cada observación.
3. Separar navegación funcional, simulación visual, datos de ejemplo y conexiones
   reales. Un selector de perfiles de demo no acredita autorización del backend.
4. Obtener/ubicar el export y los contratos oncológicos; compararlos con el export
   vigente de MedicalRecords antes de decidir reutilización o adaptación.
5. Definir la perspectiva de cada actor y el significado de solicitud, autorización,
   cuenta, paciente, tratamiento/ciclo y caso; correlacionar sin duplicar procesos.
6. Dibujar ambos caminos y su retorno: recepción → validación → avance directo o
   pendiente/revisión → respuesta y seguimiento. Definir qué se demuestra realmente.
7. Convertir hallazgos en épicas e historias de usuario con criterios verificables,
   dependencias de plataforma y evidencia; acordar prioridades con el usuario.
8. Elegir un primer corte vertical de demo y solo entonces implementar el refactor lógico.

Antes de crear issues, contrastar al menos los existentes #15 (intake), #32
(análisis agéntico), #54 (overview), #67 (demo/datos), #91 (acciones), #95
(captura ampliada) y #100 (armado/envío). Reutilizar o vincular cuando corresponda;
no cerrar validaciones runtime por el hecho de haber integrado estilos o documentación.

## Retomar desde otra máquina

La rama de destino de esta integración es `main`. Una vez fusionada, clonar o
actualizar ese branch y leer primero `AGENTS.md`, `IA_CONTEXT.md`, este documento
y el issue enlazado en el PR. Mantener una rama de trabajo propia para cambios nuevos.

Las rutas `C:/CIC-FIn`, `C:/CIC-Learn` y `C:/CIC-MR-canon` describen fuentes de la
máquina original; no se transfieren al clonar este repositorio. Los perfiles y
adaptaciones sí están versionados. Consultar `docs/agents/cic-learn.md` si hace
falta el bundle original para referencias detalladas. No ejecutar instalaciones,
generadores, migraciones de backlog o servidores solo para comprobar descubrimiento.

Quedan fuera del repositorio público los cuatro PDF de `docs/Demo Documents/`,
cuyo origen/síntesis no se confirmó, y `docs/backlog/.state.json`, que conserva
progreso local de migración. También son locales `.env`, credenciales y dependencias.
Si se necesitan en otra máquina, coordinar su transferencia por el canal apropiado;
no asumir que están en Git ni volver a crear los issues desde el manifiesto.

Subir a GitHub únicamente capturas y ejemplos aptos para el repositorio público,
sin datos clínicos identificables, credenciales ni material interno del partner.
