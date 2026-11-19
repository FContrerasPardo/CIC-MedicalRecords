# MedicalRecords: trabajo con contexto mínimo

## Reglas permanentes
- Leer solo lo necesario; no escanear el repo completo salvo petición.
- Cambios mínimos, sin formato ajeno al objetivo; preguntar antes de refactors amplios.
- No ejecutar build, tests, lint, instalaciones ni migraciones sin petición explícita.
  Antes de validar, explicar el comando exacto y su propósito. Para UI/texto, sugerir revisión manual.
- Commit solo cuando se pida; push, PR, merge, publicación, escrituras externas,
  visibilidad e historial requieren autorización explícita en el turno. No heredar permisos de CIC-Fin.
- Conservar trabajo ajeno: rutas explícitas al stage; nunca add -A, commit -a,
  reset, stash ni checkout -- sobre cambios ajenos. No cambiar rama con servidor/build activo.
- Ramas nuevas: codex/; conservar las existentes. Un objetivo por sesión.
- Sin PII/PHI, secretos ni datos reales en documentos, issues o servicios externos.
- Distinguir inspección, integración, comandos ejecutados y resultado en runtime.

## Contexto según la petición
- Estas reglas ya inyectadas no se releen. Consultar estado local solo si hace falta continuidad:
  .claude/session-state.md, luego git status resumido y la issue activa.
- Consulta pequeña: resolver con lo disponible. No recorrer toda la cadena documental.
- Feature o bug con varios pasos: usar la issue como especificación breve;
  formato y límites en docs/agents/sdd.md. No duplicarla en otro documento.
- Alcance: CONTEXT.md; rutas/detalles técnicos: secciones pertinentes de IA_CONTEXT.md.
  Son referencias, no una lectura obligatoria por turno.
- Angular: CLAUDE.md. BPMN, formularios, agentes y mappings: export de Automate;
  el markdown es derivado. Leer la issue vigente antes de snapshots de backlog.
- Procedimiento repetible: consultar solo la entrada relevante de docs/agents/skills.md.
- Roles/delegación: docs/agents/README.md y proyecto.md solo cuando sean necesarios.
  El principal orquesta y es el único interlocutor; tareas pequeñas se resuelven aquí.
  Se permite delegación acotada, sin recursión ni escrituras solapadas; verificar el resultado.
- Continuidad: docs/agents/contexto.md; checkpoint al cerrar tramo o antes de delegar.
  Issues = contexto duradero; estado local = trabajo vigente.

## Consultas y cierre
- Buscar con rg por ruta/patrón; pedir rangos. Listar títulos/estado antes de abrir issues.
- Filtrar respuestas: solo campos necesarios, sin HTML duplicado, base64 ni logs completos.
  Si una salida se trunca, reducir la consulta; no repetirla completa.
- No releer fuentes sin cambios ni cargar todos los perfiles o historiales.
- Cerrar breve: archivos cambiados, evidencia, pendientes y siguiente acción.
