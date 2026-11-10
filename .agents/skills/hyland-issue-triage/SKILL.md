---
name: hyland-issue-triage
description: Investigar un issue o bug concreto de MedicalRecords, localizar su causa probable y producir un diagnóstico con evidencia. Usar para triage, errores y regresiones; no aplica una corrección ni publica comentarios por sí sola.
---

# Triage de issues Hyland

Entrada: issue/enlace o reporte del fallo y comportamiento esperado.
Leer `docs/agents/hyland-issues.md` y el perfil técnico pertinente.

1. Obtener el issue actual con el conector disponible o usar el reporte aportado.
   `.state.json` y PROPUESTA.md no prueban el estado remoto actual.
2. Delimitar disparador, esperado, observado, versión y evidencia disponible.
   Buscar solo el componente/servicio/export relacionado y su historial relevante.
3. Separar error de contrato, de UI, de datos y de entorno. Un EPERM del sandbox
   no prueba una falla de la plantilla; seguir IA_CONTEXT.md.
4. Si falta reproducir, proponer el comando exacto o los pasos manuales y explicar
   qué resolverán. No ejecutar builds, tests, instalaciones ni invocaciones sin
   la autorización exigida por AGENTS.md.
5. Reportar causa respaldada o hipótesis, ruta/línea, impacto, corrección mínima
   recomendada y evidencia que falta. Evitar escanear todo el repo o cerrar runtime
   por lectura estática.
6. Crear/editar/comentar issues, aplicar la corrección o abrir un PR solo dentro
   de la autorización del usuario; no heredar el flujo mutante del plugin original.

Referencia opcional: `C:/CIC-Learn/skills/hyland-ai-toolkit-main/plugins/hyland/skills/issue-triage/SKILL.md`.
Si no está presente, seguir los pasos anteriores sin asumir MCP o herramientas
de otro cliente.

Ejemplo: «Investiga por qué una tarea abre un formulario de otra versión».
Para resolver/renderizar/enviar formularios de tareas, preferir la skill existente
`automate-custom-ui-task-forms` cuando esté disponible; no usarla para start forms.
