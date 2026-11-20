# Protocolo de contexto persistente

Regla del harness (decisión del usuario, 2026-11-13): el contexto no vive en la
conversación. Las conversaciones largas se degradan y se compactan; lo que deba
sobrevivir se baja a **issues** (duradero) o al **estado de sesión** (volátil).

Origen: patrón `SessionStart` de CIC-Learn (`skills/superpowers-main/hooks/`),
adaptado. Ver [cic-learn.md](cic-learn.md).

## Capas

| Capa | Dónde | Vida | Contenido |
| --- | --- | --- | --- |
| Issues | GitHub (repo público) | Duradera, compartida | Decisiones, criterios, avance verificado, evidencia, bloqueos |
| Estado de sesión | `.claude/session-state.md` (ignorado por git) | Volátil, por checkout | Objetivo actual, trabajo a medias, siguiente paso, punteros |
| Repo | Código y `docs/` | Versionada | Lo implementado y el modelo de la demo; se referencia, no se resume |

## Mecanismo (`.claude/settings.json` → `.claude/hooks/session-context.cjs`)

- **SessionStart** (`startup|resume|clear|compact`): reinyecta rama, nº de
  archivos cambiados, este protocolo y el estado de sesión (recortado a 8 000
  caracteres).
- **PreCompact**: antes de compactar escribe un snapshot automático (rama y
  archivos sin commit) en el bloque `auto-snapshot` del estado.
- **UserPromptSubmit**: si la transcripción supera ~1,5 MB
  (`MR_CONTEXT_WARN_BYTES`) y el estado lleva más de 20 min sin tocar, pide un
  checkpoint. No bloquea.

El script no hace red ni escribe fuera de `.claude/session-state.md`; ante
cualquier error sale con 0.

## Cuándo hacer checkpoint (skill `context-checkpoint`)

- Al cerrar un tramo (algo validado, una decisión del usuario, un commit).
- Antes de delegar: el encargo cita issue + estado, no la conversación.
- Cuando el hook lo pida o antes de abrir una sesión nueva.

## Reglas

- Una decisión duradera apunta a su issue. Sin autorización para publicar, dejar un pendiente local; no bloquear el trabajo autorizado.
- Comentar o crear issues es escritura externa en un repo público: requiere
  la petición o autorización del usuario en el turno.
- Sin PII/PHI ni valores de entorno en issues ni en el estado.
- Tras compactar o reanudar: contrastar estado con `git status` y las issues
  antes de actuar; no re-decidir lo registrado.
- Las sub-sesiones en worktree no ven el estado local: su fuente es la issue.

## Estado breve y carga selectiva (2026-11-19)
- Reemplazar el estado vigente; no añadir una cronología por cada petición.
- Objetivo: hasta 60 líneas y 5.000 caracteres de contenido manual; reservar espacio
  al bloque auto-snapshot y mantener el total por debajo de 8.000 caracteres.
- Poner objetivo, siguiente acción y bloqueos al principio. Las novedades no van al final.
- Conservar el bloque auto-snapshot del hook; marcar su fecha como histórica.
- Si hace falta preservar historial antes de resumir, guardarlo bajo
  .claude/session-state-history/ (local e ignorado). No cargarlo al arrancar.
- No releer el estado si ya está disponible y no cambió.
- Para consultar avance: estado, git status resumido y solo las issues vinculadas
  necesarias. No listar todo el backlog ni reconstruir la conversación.
- Codex lee el estado cuando necesita continuidad; los hooks citados arriba son de Claude.
- Especificación por tarea: [SDD mínimo](sdd.md).

## Plantilla del contenido manual
Objetivo: ...
Siguiente acción: ...
Issue / especificación local: ...
Rama observada y fecha: ...
Hecho y evidencia: ... (inspeccionado / reportado / ejecutado / runtime)
Bloqueos y autorizaciones pendientes: ...
Rutas y referencias: ...
Trabajo ajeno o concurrente que conservar: ...
