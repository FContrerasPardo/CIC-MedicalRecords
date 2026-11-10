# Catálogo de skills

Consultar antes de explorar el repositorio (canon skill-first en
[README.md](README.md)). Mantener cada fila breve; el detalle vive en el
`SKILL.md` de cada skill. Estados: **instalada** (existe en el repo y se usó con
evidencia), **disponible** (existe en el entorno del usuario, sin uso verificado
aquí), **candidata** (procedimiento identificado, sin skill todavía).

## Instaladas

Las skills de proyecto viven en `.claude/skills/`.

| Skill | Ubicación | Disparador | Límites |
| --- | --- | --- | --- |
| i18n-key-audit | `.claude/skills/i18n-key-audit/` (la skill es de Claude Code; su script `scripts/audit.cjs` corre con Node 20+ desde cualquier cliente) | Revisar claves faltantes, sobrantes, `[TODO]` y deriva de código entre `en.json` y los otros idiomas de un plugin; antes de un commit o PR que toque `assets/i18n` o plantillas con `\| translate` | Solo cuenta claves: no compara placeholders ni juzga calidad, y las claves armadas en ejecución no son verificables. Disparador sin medir. Evidencia en [references/verification.md](../../.claude/skills/i18n-key-audit/references/verification.md) |

## Disponibles en el entorno

No viven en este repo: dependen del plugin `hyland` o de `~/.claude/skills/` del
usuario. Quien no las tenga aplica el perfil del rol directamente en el chat.
Reutilizarlas antes de crear otra (regla 2 de skill first).

| Skill | Ubicación | Disparador | Límites |
| --- | --- | --- | --- |
| hyland:ux-discovery | plugin `hyland` | Personas, journeys, críticas de wireframe y riesgos UX antes de implementar | Genérica; la narrativa de la demo vive en proyecto.md |
| hyland:issue-triage | plugin `hyland` | Triage de un issue: reproducción, análisis y reporte | Requiere un issue tracker; sin backlog en GitHub aún no aplica |
| hyland:fix-issue | plugin `hyland` | Corrección de un issue de punta a punta (plan, rama, prueba, PR) | Ídem; comandos y PR sujetos a las autorizaciones del turno |
| hyland:finalize-commit-message | plugin `hyland` | Aplastar la rama en un commit y redactar su mensaje antes de fusionar | Reescribe historia: requiere autorización explícita; crea una rama de respaldo |
| hyland:write-documentation | plugin `hyland` | Escribir o editar documentación técnica con la guía de estilo de Hyland | No sustituye las convenciones de `docs/` de este repo |
| hyland:cin-cli | plugin `hyland` | Agent Builder, Content Lake, ontologías, trazas y RAG con la CLI `cin` | Requiere la CLI y un perfil autenticados; ejecuta comandos |
| ontology-builder | `~/.claude/skills/` (solo Claude Code) | Ontologías y BusinessObjects de Knowledge Enrichment / ECE | No define contratos de Automate |

## Candidatas

| Candidata | Disparador | Rol responsable | Origen |
| --- | --- | --- | --- |
| custom-ui-repackage | Re-empaquetar la Custom UI y preparar la subida a Automate (checkpoint Git, prebuild, zip) | hyland-platform | Runbook `docs/custom-ui/repackage-and-upload-runbook.md` |
| automate-export-diff | Comparar dos exportaciones de Automate (BPMN, variables, formularios, agentes) | hyland-integration | Candidata en AgenticBank; aquí el export de `Automate/` es la fuente de verdad de los agentes |
| synthetic-doc-set | Generar documentos y variantes desde datos maestros sintéticos | hyland-demo-data | Candidata en AgenticBank; aplicaría a los sets de cuentas médicas |
| feature-start, feature-close | Empezar un issue (leerlo, rama, sub-sesión) y cerrarlo (PR con `Closes #N`, continuidad) | hyland-platform, hyland-issues | Dependen de la capa C (issues en GitHub) |

## Reglas

- Una candidata pasa a instalada solo tras verificar el procedimiento en un caso
  real y documentar entradas, resultado, verificación y límites.
- Las skills genéricas parametrizan lo que varía según
  [proyecto.md](proyecto.md); no incluir rutas, hosts ni contratos de una demo.
- Retirar o fusionar duplicados con trazabilidad en el issue correspondiente.
