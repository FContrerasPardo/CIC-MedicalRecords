# Catálogo de skills

Consultar solo la fila aplicable y después su SKILL.md. **Incorporada** significa
archivo presente; **disponible** requiere descubrimiento del cliente;
**verificada** requiere evidencia de ejecución. No confundir los estados.

## Incorporadas al proyecto

| Skill | Entrada | Uso y límites |
| --- | --- | --- |
| hyland-ui-refactor | `.agents/skills/hyland-ui-refactor/SKILL.md` | UI/Satori compatibles; no instala ni migra el shell |
| hyland-technical-docs | `.agents/skills/hyland-technical-docs/SKILL.md` | Documentación con fuentes; publicar conserva autorización |
| hyland-issue-triage | `.agents/skills/hyland-issue-triage/SKILL.md` | Diagnóstico acotado; no publica ni ejecuta reproducciones automáticamente |
| hyland-cin-cli | `.agents/skills/hyland-cin-cli/SKILL.md` | Consultas/diagnóstico; CLI y autenticación no comprobadas |
| i18n-key-audit | `.agents/skills/i18n-key-audit/SKILL.md` y `.claude/skills/i18n-key-audit/` | Codex referencia el único script existente; claves, no calidad ni placeholders |

Las cuatro adaptaciones Hyland provienen de [CIC-Learn](cic-learn.md).
La auditoría i18n conserva sus casos y
[evidencia de 2026-11-09](../../.claude/skills/i18n-key-audit/references/verification.md):
Node 20+, sin npm/Nx; cuenta claves y deriva estática, no cadenas dinámicas.
No se volvió a ejecutar durante esta integración. La carga del cliente se
comprueba por máquina; si falta descubrimiento, leer el archivo explícitamente.

## Skills personales y referencias del toolkit

`automate-custom-ui-task-forms` se ofreció en Codex en la máquina original:
resolver/renderizar/enviar/reprocesar formularios de tareas, no start forms.
`skill-creator` es la herramienta de autoría usada para estas adaptaciones.
Su disponibilidad en otro cliente no se presume.

El canon original referenciaba las siguientes skills de Claude/Hyland.
Conservarlas como referencias opcionales; no se afirma instalación en Codex:

| Referencia | Aplicación | Límite |
| --- | --- | --- |
| hyland:ux-discovery | Personas, journeys, wireframes | Adaptación acotada en hyland-ui-refactor |
| hyland:issue-triage / fix-issue | Triage y corrección de issues | Permisos de comandos, commits y PR no se heredan |
| hyland:write-documentation | Estilo técnico Hyland | Adaptación local hyland-technical-docs |
| hyland:cin-cli | Agent Builder, Content Lake, ontologías, trazas | CLI y perfil autenticados requieren comprobación |
| hyland:finalize-commit-message | Consolidar historia | Reescribe historia; no forma parte automática del cierre |
| ontology-builder | Ontologías / BusinessObjects en Claude | Disponibilidad no comprobada en esta máquina; no define contratos Automate |

## Candidatas y reglas

| Candidata | Fuente | Pendiente |
| --- | --- | --- |
| custom-ui-repackage | Runbook local de empaquetado | Verificar caso autorizado antes de extraer skill |
| automate-export-diff | Export de Automate | Comparación acotada y evidencia |
| synthetic-doc-set | hyland-demo-data | Datos maestros y evidencia de extracción |
| feature-start / feature-close | Coordinación por issues | Acordar el flujo y los permisos de este proyecto |

Un procedimiento repetido se evalúa para mejorar una skill existente antes de
crear otra. Parametrizar rutas y contratos; no copiar hosts o datos de otra demo.
Registrar evidencia y límites antes de llamarla verificada. No ejecutar scripts
al consultar el catálogo ni instalar plugins para comprobar descubrimiento.
