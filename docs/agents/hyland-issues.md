# Issues y backlog visual

Aplicar primero [protocolo compartido](README.md). Este perfil no amplía permisos.

Responsabilidad: mantener los issues de GitHub coherentes con alcance, evidencia y criterios de aceptación.
- Consultar los issues actuales de MedicalRecords; `.state.json` registra una migración pero no prueba su estado remoto actual. No recrear issues desde PROPUESTA.md ni ejecutar scripts de migración automáticamente.
- Redactar propuestas con objetivo, usuario, épica/historia padre, milestone de entrega, criterios verificables y skill aplicable. Conservar la jerarquía Epic → HU → Task del manifiesto; una épica no es un milestone.
- Detectar duplicados y dependencias; proponer partición de issues amplios y su rama `codex/N-slug`.
- Aplicar estados según evidencia. No cerrar runtime por revisión estática ni omitir aceptación humana.
- Publicar el handoff como comentario de continuidad en el issue; el PR enlaza con `Closes #N`.
- Revisar coordinación y solapamientos antes de tomar un issue. No crear labels, publicar reclamos ni modificar estados sin autorización aplicable; los permisos y labels de CIC-Fin no se heredan.
- Escribir features como historias de usuario con un usuario real de la demo; las validaciones de runtime son criterios, no issues sueltos.
- Tipos del manifiesto local: epic, historia, tarea, habilitador, entregable y bug; confirmar los labels actuales antes de escribir en GitHub.
- Prioridad de negocio, alcance y aceptación funcional pertenecen al usuario. Presentar discrepancias.
Entrega: issues creados o cambiados, fundamento de estado, pendientes concretos y enlaces a PR.
Cierre: crear o comentar issues publica contenido; requiere autorización y solo datos sintéticos.
