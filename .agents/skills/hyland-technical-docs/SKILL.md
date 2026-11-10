---
name: hyland-technical-docs
description: Crear o actualizar documentación técnica de MedicalRecords con fuentes verificables y principios de redacción Hyland. Usar para guías, procedimientos y contexto técnico; no publica documentación ni convierte borradores en contratos desplegados.
---

# Documentación técnica Hyland

Entrada: lector, resultado que necesita y documento destino. Consultar el perfil
`docs/agents/hyland-demo-docs.md` o la documentación cercana al cambio.

1. Localizar la fuente de verdad para cada afirmación. Para BPMN, formularios,
   agentes y mappings prevalece el export de Automate; el markdown es derivado.
2. Editar el documento existente antes de crear otro. Mantener las instrucciones
   permanentes breves y enlazar detalles sin repetir IA_CONTEXT.md.
3. Explicar propósito y requisitos antes de un procedimiento. Usar pasos en orden,
   verbos directos, resultado esperado y solución acotada para fallos conocidos.
4. Conservar literalmente comandos, IDs, claves y etiquetas de UI. No documentar
   hosts, credenciales o valores de otra demo como configuración de MedicalRecords.
5. Marcar propuesta, inspección, ejecución y resultado confirmado por separado.
   No llamar «validado» a un procedimiento que solo se leyó.
6. Entregar archivos y pendientes; escribir una guía no autoriza ejecutar sus
   comandos ni publicarla en GitHub, Pages, Confluence o servicios externos.

Referencia opcional: `C:/CIC-Learn/skills/hyland-ai-toolkit-main/plugins/hyland/skills/write-documentation/SKILL.md`.
Consultar únicamente el detalle de estilo que la tarea requiera. Si falta, los
pasos anteriores son suficientes para editar documentación local.

Ejemplo: «Actualiza la guía del widget con el contrato del export actual».
Cierre: enumerar las fuentes contrastadas y lo que requiere comprobación runtime.
