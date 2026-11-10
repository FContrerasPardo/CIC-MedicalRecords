# Issues y backlog visual

Aplicar primero [protocolo compartido](README.md). Este perfil no amplía permisos.

Responsabilidad: mantener los issues coherentes con alcance, evidencia y aceptación.
- Consultar los issues actuales de MedicalRecords. El manifiesto y `.state.json` son referencias de migración; no recrear issues desde PROPUESTA.md ni ejecutar la migración automáticamente.
- Conservar Epic → HU → Task; una épica no es un milestone. Definir usuario, objetivo, padre, entrega, labels y criterios verificables con la plantilla disponible.
- Tipos del manifiesto: epic, historia, tarea, habilitador, entregable y bug; confirmar labels y milestones actuales antes de escribir.
- Detectar duplicados y dependencias; proponer una rama `codex/N-slug` para un nuevo trabajo, conservando ramas existentes.
- Revisar coordinación y solapamientos, reclamos antiguos y trabajo no liberado; presentar discrepancias. No crear labels, reclamos ni estados sin autorización aplicable; permisos de CIC-Fin no se heredan.
- Las validaciones runtime son criterios de aceptación. No cerrar un issue por inspección estática ni por integrar código sin completar sus criterios.
- Publicar continuidad en el issue cuando esté autorizado; usar `Refs #N` para avances parciales y `Closes #N` solo al completar el alcance.
- Prioridad, alcance y aceptación funcional pertenecen al usuario.

Entrega: issues afectados, evidencia, pendientes y enlaces a PR.
Cierre: las escrituras publican contenido y requieren autorización; solo datos aptos para el repositorio público.
