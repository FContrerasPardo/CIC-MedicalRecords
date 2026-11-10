# Parámetros de MedicalRecords

Combina el canon de 2026-11-09 con el estado contrastado el 2026-11-10.
Los roles son reutilizables; este archivo conserva los datos de esta demo.

| Parámetro | Valor |
| --- | --- |
| Demo vigente | Cuentas Médicas / Latam Medical Billing: prevención de glosas con CIC/Automate; demostración, no productivo |
| Ampliación propuesta | Clínica oncológica ↔ ARS; ver [handoff](../oncology-clinic-ars-handoff.md). Aún no redefine el proceso vigente |
| Repositorio | `FContrerasPardo/CIC-MedicalRecords` |
| Ramas | `main` es base estable; trabajo UI en `refactor/integrated-ui`. Nuevas ramas según AGENTS.md |
| Canon de origen | Worktree `C:\CIC-MR-canon`, rama `docs/agents-canon`, commit `2851908` |
| Referencias externas locales | `C:\CIC-FIn` y `C:\CIC-Learn`; no se transfieren al clonar |
| Workspace | `CustomUI/medicalrecords-pq7lr-source/`, plantilla de Automate; `workspace-hxp-edited/` es referencia |
| Plugin | `libs/plugins/medical-records/` dentro del workspace |
| Plataforma | Angular 19, ADF 8.5; contrastar APIs antes de portar patrones de CIC-Fin/ADF 9.2 |
| Export Automate | `Automate/OMEGA BUILDER - Latam Medical Billing CUI/`; índice `Automate/README.md` |
| Documentación de agentes | `docs/Agent Builder Config/`; derivada del export, actualizarla si lo contradice |
| Configuración | `config/contexts.json5` es fuente de verdad; .env se genera y no se publica |
| Contratos UI | batchState en intake y unifiedWidgetPayloadText en análisis; confirmar mappings en el export |
| Navegación | Overview de tareas; las etapas reales viven en formularios/widgets de Automate |
| Idiomas | en.json es fuente; de/es/fr/it/pl/pt siguen las convenciones de CLAUDE.md |
| Dominio | Salud: cuentas, autorizaciones, glosas y apelaciones. Origen de documentos por confirmar; no asumir que son sintéticos |
| Artefactos vivos | Spec de demo, `docs/custom-ui/` y anexos de widgets/agentes; no hay un centro `docs/demo/` |
| UI | `UI Change Instructions/`, spec visual histórica en `docs/superpowers/specs/`, mockups en `UI design/` |
| Backlog | GitHub Issues; `docs/backlog/` conserva propuesta/manifiesto y progreso local no versionado. No recrear la migración |
| Coordinación | Revisar trabajo concurrente y reclamos; labels, comentarios y estados necesitan autorización aplicable |
| Runtime | Node >=24.14.0 <25, npm >=11.9.0 <12 y Nx; comandos autorizados en PowerShell Windows según IA_CONTEXT |
| Entorno local | `http://localhost:4200/`, no 127.0.0.1 por CORS; no levantar otro servidor por iniciativa propia |
| Empaquetado | `docs/custom-ui/repackage-and-upload-runbook.md`; subida manual según el runbook |
| Verificación | Proponer AOT antes del commit Angular, pero ejecutar solo con permiso explícito; si no, registrar pendiente. No hacer build por documentos |
| Specs | describe/it/expect, sin jest global: la app tipa specs con Jasmine. Detalle en CLAUDE.md |
| Tiempos | Build lento; duración sin medir. No repetirlo ni hacer polling por impaciencia |
| Worktrees | Rutas cortas fuera del repo; el canon documentó un archivo de 233 caracteres y fallos sobre 260 en Windows (2026-11-09). Sin node_modules no se acredita Nx ni se instalan dependencias automáticamente |

## Precedencia por materia

- Alcance: CONTEXT.md y `docs/medical-records-demo-process-specification.md`.
- Estado técnico: IA_CONTEXT.md y la documentación cercana al cambio.
- BPMN, formularios, agentes y mappings: export de Automate; markdown derivado.
- APIs/versiones: plantilla local; CIC-Learn es referencia, no prueba de compatibilidad.
- Trabajo: issue actual; manifiesto y .state.json son evidencia de migración, no estado remoto actualizado.

No trasladar ambientes, permisos, contratos ni reglas financieras de otras demos.
