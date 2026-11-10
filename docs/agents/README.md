# Harness de desarrollo MedicalRecords

Integrado el 2026-11-10. Recupera los perfiles preparados en el worktree
`C:\CIC-MR-canon` (rama `docs/agents-canon`, commit `2851908`) y adapta
elementos de CIC-Fin y CIC-Learn. Estos son roles de desarrollo, distintos de
los agentes de Agent Builder del proceso de cuentas médicas.

## Fuentes y reglas

Leer `AGENTS.md`, después solo el [catálogo de skills](skills.md), los
[parámetros del proyecto](proyecto.md) y el perfil que corresponda.
`AGENTS.md` conserva las reglas de ahorro de tokens y autorización de comandos.
Los perfiles no agregan permisos. La jerarquía de fuentes funcionales y técnicas
está en proyecto.md; los exports de Automate prevalecen sobre sus anexos.

## Roles bajo demanda

| Perfil | Cuándo aplicarlo |
| --- | --- |
| [hyland-ux](hyland-ux.md) | Flujos, estados, textos y narrativa antes de implementar |
| [hyland-frontend](hyland-frontend.md) | Componentes, estilos y accesibilidad de Custom UI |
| [hyland-i18n](hyland-i18n.md) | Textos, claves, placeholders y formatos regionales |
| [hyland-integration](hyland-integration.md) | Contratos de tareas, formularios y servicios nativos |
| [hyland-ai-content](hyland-ai-content.md) | IDP, Agent Builder y Knowledge Enrichment |
| [hyland-platform](hyland-platform.md) | Plantilla, herramientas, empaquetado y Git |
| [hyland-demo-data](hyland-demo-data.md) | Datos maestros y escenarios sintéticos |
| [hyland-demo-docs](hyland-demo-docs.md) | Guion y documentación de la demo |
| [hyland-issues](hyland-issues.md) | Backlog, dependencias y continuidad |
| [hyland-quality](hyland-quality.md) | Evidencia, defectos y límites de validación |
| [hyland-guardrails](hyland-guardrails.md) | Datos sensibles, secretos y decisiones de IA |
| [hyland-skills](hyland-skills.md) | Procedimientos repetibles y catálogo |

El principal puede asumir un perfil directamente. Un cambio pequeño no necesita
subagentes. Si el usuario pide delegación, asignar objetivo, archivos, fuentes,
criterio de aceptación y permisos concretos; evitar escrituras superpuestas.
No delegar recursivamente ni crear otros chats sin solicitud del usuario.
Elegir modelo/esfuerzo solo cuando las herramientas e instrucciones lo permitan,
sin fijar modelos en los perfiles ni inventar ahorro medido.

## Skills y clientes

Las skills de proyecto para Codex están en `.agents/skills/`. Los perfiles
de cliente en `.codex/agents/*.toml` y `.claude/agents/*.md` remiten a estos
documentos para evitar duplicarlos. El script i18n existente se conserva una
sola vez en `.claude/skills/i18n-key-audit/`; Codex tiene una entrada que lo
referencia. Las adaptaciones de [CIC-Learn](cic-learn.md) no instalan sus plugins.

Los TOML siguen el [formato documentado de agentes de Codex](https://learn.chatgpt.com/docs/agent-configuration/subagents).
La [documentación de skills de Codex](https://learn.chatgpt.com/docs/build-skills)
describe la ubicación de proyecto. La carga real queda pendiente de comprobar
en una sesión nueva; si no se descubren, leer el perfil o SKILL.md directamente.
No se agregaron hooks, MCP ni configuración global.

## Continuidad y aceptación

Trabajar una tarea o tramo por rama; mantener las ramas existentes.
Ramas nuevas: prefijo `codex/`, salvo preferencia del usuario.
No cambiar de rama bajo el servidor local sin coordinar con el usuario.
En un checkout compartido, conservar cambios ajenos y seleccionar rutas explícitas.

Leer el issue actual antes de usar los snapshots de migración. No publicar
comentarios, reclamar issues, cambiar estados ni crear PRs sin autorización
aplicable; los permisos de CIC-Fin no se trasladan aquí.

Entregar: resultado, archivos, evidencia, incertidumbre y siguiente acción.
Distinguir revisión estática, comandos ejecutados y runtime confirmado por el
usuario. Una inspección no cierra una validación runtime.

Si un procedimiento se repite dos veces, registrarlo como candidato en el
catálogo; crear un issue solo si está autorizado. Aplicar skill-creator antes
de crear o adaptar skills. Evitar diarios, backlogs y manuales duplicados.
