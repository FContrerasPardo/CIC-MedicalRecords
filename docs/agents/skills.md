# Catálogo de skills

Consultar solo la fila aplicable y después su SKILL.md. **Incorporada** significa
que el archivo existe; **disponible en sesión** significa que el cliente la
ofrece; **verificada** requiere evidencia de ejecución. No confundir los estados.

## Incorporadas al proyecto

| Skill | Entrada | Uso y límites |
| --- | --- | --- |
| hyland-ui-refactor | `.agents/skills/hyland-ui-refactor/SKILL.md` | UX y Satori compatibles para cambios UI acotados; sin migraciones ni builds automáticos |
| hyland-technical-docs | `.agents/skills/hyland-technical-docs/SKILL.md` | Documentación técnica con fuentes; sin publicar ni editar Pages por iniciativa propia |
| hyland-issue-triage | `.agents/skills/hyland-issue-triage/SKILL.md` | Investigar un issue y proponer corrección; no publica comentarios ni ejecuta reproducciones sin autorización |
| hyland-cin-cli | `.agents/skills/hyland-cin-cli/SKILL.md` | Planear consultas y diagnóstico de Content Intelligence; CLI y auth no comprobadas |
| i18n-key-audit | `.agents/skills/i18n-key-audit/SKILL.md` y `.claude/skills/i18n-key-audit/` | Codex referencia el único script existente; claves, no calidad ni placeholders |

Las cuatro adaptaciones Hyland provienen de [CIC-Learn](cic-learn.md).
El descubrimiento de estas entradas en Codex queda pendiente de una sesión nueva.
La auditoría i18n conserva sus casos y evidencia histórica del worktree de canon;
no se ha vuelto a ejecutar durante esta integración.

## Disponible en esta sesión

| Skill | Origen | Uso |
| --- | --- | --- |
| automate-custom-ui-task-forms | Skill personal de Codex, `~/.codex/skills/` | Resolver/renderizar/enviar/reprocesar formularios de tareas; no start forms ni Custom UI genérica |
| skill-creator | Skill de sistema | Crear o adaptar instrucciones reutilizables |

No se presupone un plugin Hyland instalado en Codex ni skills personales de Claude.
Si el cliente no descubre una entrada, leer su archivo explícitamente; no anunciar
su instalación como plugin.

## Candidatas

| Candidata | Fuente | Pendiente |
| --- | --- | --- |
| custom-ui-repackage | Runbook local de empaquetado | Verificar procedimiento autorizado antes de extraer una skill |
| automate-export-diff | Export local de Automate | Caso real y comparación acotada |
| synthetic-doc-set | Rol hyland-demo-data | Datos maestros y evidencia de extracción |
| feature-start / feature-close | Coordinación por issues | Acordar flujo sin trasladar permisos de CIC-Fin |

Registrar procedimientos repetidos sin duplicar herramientas existentes.
No ejecutar scripts al consultar este catálogo. La aprobación del alcance de
una tarea no concede permisos nuevos de instalación, publicación o migración.
