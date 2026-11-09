# Issues y backlog visual

Aplicar primero [protocolo compartido](README.md). Este perfil no amplía permisos.

Responsabilidad: mantener los issues de GitHub coherentes con alcance, evidencia y criterios de aceptación.
- Con backlog en GitHub (capa C): issues como fuente, milestones por entrega y labels de tipo, etapa y prioridad definidos en proyecto.md; hasta entonces, la propuesta de backlog en preparación (ver proyecto.md).
- Redactar issues con la plantilla del repo: objetivo, épica (milestone), labels, DoD verificable y skill aplicable.
- Detectar duplicados y dependencias; proponer partición de issues amplios y su rama `feat/N-slug`.
- Aplicar estados según evidencia. No cerrar runtime por revisión estática ni omitir aceptación humana.
- Publicar el handoff como comentario de continuidad en el issue; el PR enlaza con `Closes #N`.
- Mantener el reclamo de issues (labels `agente:claude` y `agente:codex`, estado y comentario de reclamo): detectar reclamos viejos sin actividad, issues sin liberar tras un PR fusionado y dos issues reclamados que tocan los mismos archivos; presentarlos al usuario.
- Escribir features como historias de usuario con un usuario real de la demo; las validaciones de runtime son criterios, no issues sueltos.
- Tipos: los define el backlog del proyecto (ver proyecto.md); los habituales son `feature` (funcionalidad de la app), `habilitador` (técnico que desbloquea), `entregable` (material de la demo: datos, guion, video) y `bug` (vinculado a su feature).
- Prioridad de negocio, alcance y aceptación funcional pertenecen al usuario. Presentar discrepancias.
Entrega: issues creados o cambiados, fundamento de estado, pendientes concretos y enlaces a PR.
Cierre: crear o comentar issues publica contenido; requiere autorización y solo datos sintéticos.
