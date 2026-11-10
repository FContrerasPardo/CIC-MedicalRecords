# Parámetros de MedicalRecords

Fuentes inspeccionadas el 2026-11-10. Los estados remotos y el descubrimiento
de perfiles/skills requieren comprobación en el cliente correspondiente.

| Parámetro | Valor |
| --- | --- |
| Demo | Prevención de glosas: validar la cuenta médica antes de enviarla; CIC/Automate, demostración |
| Repositorio | `FContrerasPardo/CIC-MedicalRecords` |
| Checkout | `C:\CIC-MedicalRecords`; rama observada `refactor/integrated-ui` |
| Canon recuperado | Worktree `C:\CIC-MR-canon`, rama `docs/agents-canon`, commit `2851908` |
| Base de referencia | `C:\CIC-FIn`; adaptar patrones, no contratos financieros |
| Kit de aprendizaje | `C:\CIC-Learn`; alcance en [cic-learn.md](cic-learn.md) |
| Workspace | `CustomUI/medicalrecords-pq7lr-source/` |
| Plugin | `libs/plugins/medical-records/` dentro del workspace |
| Plataforma | Angular 19, ADF 8.5; no asumir compatibilidad con ADF 9.2 de CIC-Fin |
| Runtime | Node `>=24.14.0 <25`, npm `>=11.9.0 <12`; comandos autorizados en Windows local fuera del sandbox según IA_CONTEXT |
| Entorno local | `http://localhost:4200/`; no levantar otro servidor ni cambiar a 127.0.0.1 por iniciativa propia |
| Export Automate | `Automate/OMEGA BUILDER - Latam Medical Billing CUI/`; índice `Automate/README.md` |
| Configuración | `config/contexts.json5` es fuente de verdad; `.env` se genera y no se publica |
| Contratos UI | `batchState` para intake; `unifiedWidgetPayloadText` para análisis; confirmar mappings en el export antes de cambiarlos |
| Navegación | Overview de tareas abiertas; las etapas reales viven en formularios/widgets de Automate |
| i18n | `assets/i18n/en.json` es fuente; de/es/fr/it/pl/pt sincronizados. Convenciones en `CLAUDE.md` |
| Narrativa | `docs/medical-records-demo-process-specification.md` y `CONTEXT.md` |
| UI | `UI Change Instructions/`, `docs/superpowers/specs/2026-04-25-custom-ui-medical-records-design.md`, mockups en `UI design/` |
| Empaquetado | `docs/custom-ui/repackage-and-upload-runbook.md`; subida manual según el runbook |
| Backlog | `docs/backlog/.state.json` registra issues y proyecto MedRec. Consultar GitHub para el estado actual; PROPUESTA.md aún contiene una nota previa a la migración |
| Reclamos | No trasladar labels o permisos de CIC-Fin. Revisar coordinación actual antes de publicar un reclamo |
| Datos | No asumir que los documentos existentes son sintéticos. Identificar origen antes de reutilizarlos o publicarlos; los sets nuevos de demo deben distinguir datos maestros, variantes y esperados |
| Worktrees | Usar rutas cortas de Windows. Un worktree sin dependencias no acredita compilación; no instalar dependencias automáticamente |
| Verificación | Sin builds/tests/lint en esta integración documental. Para cambios Angular y commit autorizado, proponer la compuerta AOT de CLAUDE.md y respetar AGENTS.md |

## Precedencia por materia

- Alcance funcional: `CONTEXT.md` y especificación de la demo.
- Estado técnico y decisiones: `IA_CONTEXT.md` y documentación cercana al cambio.
- BPMN, formularios, agentes y mappings: export en `Automate/`; los markdown
  de `docs/Agent Builder Config/` son anexos derivados.
- Versiones y APIs usadas por UI: plantilla instalada; CIC-Learn es referencia.
- Estado de trabajo: issue actual cuando exista; el manifiesto y .state.json
  son evidencia local de migración, no una consulta remota actualizada.

No copiar ambientes, IDs, reglas financieras, permisos ni contratos de otras demos.
