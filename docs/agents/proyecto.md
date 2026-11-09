# Parámetros del proyecto para los roles

Los perfiles de `docs/agents/hyland-*.md` son genéricos para demos de Content
Innovation Cloud con Custom UI. Este archivo concentra lo específico de esta
demo; al replicar los roles en otro repositorio, copiar solo esta plantilla y
completarla con sus datos.

Estado: borrador del 2026-11-09, redactado desde `IA_CONTEXT.md`, `CONTEXT.md` y
`CLAUDE.md`. Las filas marcadas **por confirmar** no tienen una regla escrita en
el repo y requieren decisión del usuario.

| Parámetro | Valor en Medical Records |
| --- | --- |
| Demo | Cuentas Médicas (Latam Medical Billing): armado y validación de cuentas médicas con malla agéntica sobre Hyland CIC/Automate (demostración, no productivo) |
| Repositorio GitHub | `FContrerasPardo/CIC-MedicalRecords` |
| Ramas | `main` es la base estable. Las ramas de trabajo vigentes se listan en `IA_CONTEXT.md` |
| Workspace Custom UI | `CustomUI/medicalrecords-pq7lr-source/` (plantilla exportada por Automate). `CustomUI/workspace-hxp-edited/` es solo referencia |
| Plugin | `CustomUI/medicalrecords-pq7lr-source/libs/plugins/medical-records/` |
| Exportación Automate | `Automate/OMEGA BUILDER - Latam Medical Billing CUI/`, fuente de verdad de BPMN y agentes: leerla antes de inferir prompts, inputs o mappings; índice en `Automate/README.md`. El contexto de despliegue está en `CustomUI/medicalrecords-pq7lr-source/config/contexts.json5` (no registrar secretos) |
| Documentación de agentes | `docs/Agent Builder Config/`; si contradice el export, se actualiza el markdown |
| Idiomas | `assets/i18n/` del plugin: `en.json` es la fuente; `de`, `es`, `fr`, `it`, `pl` y `pt` la siguen sin claves faltantes ni sobrantes. Las claves nuevas entran como `[TODO] <inglés>` (`es` se traduce). Detalle en `CLAUDE.md` |
| Dominio sensible | Salud: cuentas médicas, glosas y apelaciones. **Por confirmar:** el repo no declara una política de datos ni tiene `SECURITY.md`. Mientras tanto, los roles tratan todo contenido como sintético y señalan cualquier dato que parezca real (PII/PHI) |
| Datos | **Por confirmar** el origen y el alcance de los documentos de prueba. Los sets sintéticos se generan desde datos maestros (perfil hyland-demo-data) |
| Artefactos vivos | `docs/medical-records-demo-process-specification.md` es la fuente de la narrativa y del paso a paso por etapas; los documentos de widgets y agentes son anexos técnicos (`docs/Agent Builder Config/`, `docs/custom-ui/`). No hay `docs/demo/` en este repo |
| Backlog | Propuesta en preparación en `docs/backlog/` (epics, historias y tareas; aún no versionada ni creada en GitHub) y su tracker de origen en `docs/` (`Proyecto Omega Build - Tracker v2 (realineado demo).xlsx`). Pasa a GitHub Issues con la capa C |
| Reclamo | Pendiente de la capa C (labels `agente:claude` y `agente:codex`). Mientras tanto: declarar rama y áreas al abrir la sub-sesión (ver README) |
| Runtime | Node `>=24.14.0 <25`, npm `>=11.9.0 <12` y Nx. Comandos solo con autorización y en PowerShell local de Windows, fuera del sandbox (falsos `EPERM`; ver `IA_CONTEXT.md`) |
| Verificación | Durante la iteración no se corre el build AOT: el dev server del usuario (HMR) da el feedback. Antes de un commit o push: `npx nx build workspace-hxp --configuration=development` desde la plantilla, el único chequeo que tipa las plantillas Angular. Los specs del plugin usan solo `describe`/`it`/`expect`: el build de la app los tipa con Jasmine (`apps/workspace-hxp/tsconfig.app.json`), así que no hay `jest` global. Detalle en `CLAUDE.md` |
| Tiempos | El build AOT es lento: no hacer polling ni relanzar por impaciencia. Duración típica por medir |
| Dev server | El usuario valida en `http://localhost:4200/` (no `127.0.0.1`: CORS), que sirve el checkout principal. Las features con UI se trabajan allí, una a la vez; las sub-sesiones en worktree no levantan entorno ni validan visualmente. `.claude/launch.json` define `workspace-hxp (dev)`, solo con autorización |
| Worktrees | Un worktree no tiene `node_modules`, así que no corre Nx. En Windows, crearlo en una ruta corta fuera del repo (p. ej. `C:\CIC-MR-canon`): la ruta más larga de la plantilla mide 233 caracteres y bajo `.claude\worktrees\…` supera el límite de 260 (`Filename too long`). Comprobado el 2026-11-09 |

No copiar nombres de clases, procesos, variables ni contratos de otras demos
(AgenticBank, Governance, IDP). Cada repositorio declara los suyos aquí.
