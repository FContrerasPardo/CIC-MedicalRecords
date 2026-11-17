---
name: context-checkpoint
description: Baja el contexto de la conversación a las issues de GitHub y al estado de sesión local (.claude/session-state.md) para no degradar por contexto. Úsala al cerrar un tramo de trabajo, antes de delegar a una sub-sesión o subagente, antes de compactar o abrir sesión nueva, cuando el harness avise de contexto grande, o ante frases como «guarda el contexto», «checkpoint», «baja esto a la issue», «deja el estado», «handoff» o «para no perder contexto». No hace commits, push ni builds.
---

# Checkpoint de contexto

Protocolo completo: `docs/agents/contexto.md`. Objetivo: que una sesión nueva
pueda continuar leyendo **solo** el estado local y las issues citadas.

## 1. Clasificar lo que hay en la conversación

| Va a… | Qué |
| --- | --- |
| **Issue** (duradero, compartido) | Decisiones del usuario, criterios de aceptación, avance verificado, pendientes de Automate, evidencia (comando + resultado), bloqueos |
| **`.claude/session-state.md`** (volátil, local) | Objetivo actual, qué está a medio hacer, siguiente paso, autorizaciones pendientes, punteros a issues/archivos |
| **Código / docs del repo** | Lo que ya está implementado: no se resume, se referencia por ruta |
| **Nada** | Exploración descartada, salidas de herramientas, logs, valores de entorno |

## 2. Actualizar el estado local

Reescribe (no acumules) `.claude/session-state.md` siguiendo sus secciones;
máx. ~80 líneas. Cada decisión vigente lleva su issue (`#144`). Conserva el
bloque `auto-snapshot` que escribe el hook. Si el archivo no existe, el hook
`pre-compact` crea la plantilla; también puedes crearla con esas secciones.

## 3. Bajar lo duradero a las issues

1. `gh issue list --state open` y elegir la issue existente que cubre el tema;
   crear una nueva solo si ninguna lo cubre (labels y épica del proyecto,
   ver `docs/agents/hyland-issues.md`).
2. Comentario con este formato, breve y en el idioma del proyecto:

   ```
   ### Checkpoint YYYY-MM-DD
   **Estado:** construido / en validación / pendiente (qué, con rutas)
   **Decidido:** decisiones del usuario vigentes
   **Pendiente:** siguiente paso, autorizaciones (build AOT, commit, push)
   **Evidencia:** comandos ejecutados y resultado; qué NO se verificó en runtime
   ```
3. Escribir en issues es una escritura externa en un **repo público**: hazlo
   cuando el usuario pidió el checkpoint o lo autorizó en el turno; si no,
   deja el borrador en el estado local y pregunta.

## 4. Límites

- Sin PII/PHI: nunca nombres, IDs, MRN ni fechas de nacimiento reales, ni
  valores de `.env`, tokens o URLs con credenciales. Datos sintéticos o rutas.
- No commits, push, PR ni build por el checkpoint.
- Al delegar, el encargo cita issue + estado, no la conversación.
- Si el siguiente tramo es independiente y la conversación es larga, proponer
  sesión nueva que arranque del estado y las issues.

## 5. Cierre

Informar en 2–3 líneas: issues comentadas/creadas (enlaces), estado actualizado,
y qué quedó solo en local.
