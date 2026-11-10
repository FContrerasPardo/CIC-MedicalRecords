# Harness de desarrollo MedicalRecords

Protocolo compartido por Codex y Claude. Integra el canon de la rama
`docs/agents-canon` (commit `2851908`) con las adaptaciones de CIC-Fin y
CIC-Learn del 2026-11-10. Estos roles desarrollan la demo; no son agentes de
Agent Builder ni recursos desplegados en Automate.

## Fuentes y roles

Aplicar `AGENTS.md`, consultar el [catálogo](skills.md) y los
[parámetros del proyecto](proyecto.md), y cargar solo el perfil pertinente.
Los perfiles no amplían permisos ni sustituyen los contratos del export.

| Perfil | Cuándo aplicarlo |
| --- | --- |
| [hyland-ux](hyland-ux.md) | Flujos, estados, textos y narrativa |
| [hyland-frontend](hyland-frontend.md) | Componentes, estilos y accesibilidad |
| [hyland-i18n](hyland-i18n.md) | Textos, claves, placeholders y formatos |
| [hyland-integration](hyland-integration.md) | Tareas, formularios y servicios nativos |
| [hyland-ai-content](hyland-ai-content.md) | IDP, Agent Builder y Knowledge Enrichment |
| [hyland-platform](hyland-platform.md) | Plantilla, herramientas, empaquetado y Git |
| [hyland-demo-data](hyland-demo-data.md) | Datos maestros y variantes sintéticas |
| [hyland-demo-docs](hyland-demo-docs.md) | Artefactos y guion de la demo |
| [hyland-issues](hyland-issues.md) | Backlog, dependencias y continuidad |
| [hyland-quality](hyland-quality.md) | Defectos, evidencia y aceptación |
| [hyland-guardrails](hyland-guardrails.md) | Datos sensibles, secretos y decisiones IA |
| [hyland-skills](hyland-skills.md) | Procedimientos repetibles y catálogo |

## Sesiones y encargos

El principal puede asumir un perfil directamente. Un cambio pequeño se resuelve
en el chat principal. Crear otros chats solo por solicitud del usuario.
Delegar cuando lo permitan el usuario o las instrucciones aplicables; no delegar
recursivamente. Un rol no autoriza procesos paralelos ni comandos de proyecto.

Una sesión cubre una feature o tarea delimitada, con rama y áreas declaradas.
Dos sesiones no escriben los mismos archivos. UI: una a la vez en el checkout
que sirve al usuario; documentación o servicios pueden usar un worktree corto
sin levantar otro entorno. No cambiar ramas con servidor/build activos.

Un encargo delegado incluye objetivo, issue si existe, archivos, fuentes,
criterio de aceptación, permisos y selección de modelo/esfuerzo cuando el
cliente lo permita. El agente devuelve resultado, evidencia, límites y siguiente
acción; no crea ramas ni otras sesiones. Para UI, una secuencia útil es UX →
Frontend → i18n → Calidad; para contratos, Integración → Frontend → Calidad.

Los perfiles no fijan modelos. Elegir capacidad proporcional al encargo si la
herramienta permite seleccionarla y las instrucciones lo autorizan. No confundir
modelo solicitado con modelo efectivo ni afirmar ahorros sin medición.
Si falta capacidad, escalar con evidencia; no escalar por un permiso ausente.

Ejemplos: «Asume hyland-ux para definir estados del overview sin código»;
«Asume hyland-integration para comparar este formulario con el export»;
«Asume hyland-i18n para revisar solo las claves de este diff».

## Skills y clientes

Codex: `.agents/skills/`. Perfiles de cliente: `.codex/agents/*.toml`
y `.claude/agents/*.md`; remiten a estos documentos. El script i18n vive una
sola vez en `.claude/skills/i18n-key-audit/`, con entrada de Codex que lo referencia.
Consultar [CIC-Learn](cic-learn.md) para las adaptaciones y sus límites.

Usar skills existentes antes de crear otras. Si un procedimiento se repite dos
veces, registrarlo como candidato; crear un issue solo cuando esté autorizado.
Aplicar skill-creator antes de crear/adaptar una skill. Registrar entradas,
resultado, fuentes, compatibilidad y evidencia; una candidata no es una skill
verificada. Evitar manuales, scripts y diarios duplicados.

Los formatos se contrastaron con [agentes de Codex](https://learn.chatgpt.com/docs/agent-configuration/subagents)
y [skills de Codex](https://learn.chatgpt.com/docs/build-skills).
La documentación de [agentes de Claude](https://code.claude.com/docs/en/sub-agents)
y [skills de Claude](https://code.claude.com/docs/en/skills) queda como referencia.
No se agregan hooks, MCP ni configuración global. El descubrimiento efectivo se
comprueba en cada cliente; si falta, leer el perfil o SKILL.md explícitamente.

## Continuidad y aceptación

Leer el issue actual antes de usar snapshots de migración. No heredar permisos
de GitHub de CIC-Fin. Revisar reclamos/solapamientos antes de actuar y publicar
comentarios o estados solo con autorización aplicable.
Usar `Refs #N` para avances parciales y `Closes #N` al completar sus criterios.

Conservar cambios ajenos y seleccionar rutas explícitas al preparar commits.
Ramas nuevas con `codex/`, salvo preferencia del usuario; conservar las existentes.
Handoff breve en el issue o PR: hecho, archivos, evidencia, incertidumbre y siguiente
acción. No cerrar validación runtime por inspección o por un build correcto.

Buscar fragmentos con rg, no releer fuentes sin cambios ni cargar todos los roles.
La validación es proporcional al riesgo y conserva las autorizaciones de AGENTS.md.
El contexto para continuar la evaluación oncológica está en
[el handoff clínica–ARS](../oncology-clinic-ars-handoff.md).
