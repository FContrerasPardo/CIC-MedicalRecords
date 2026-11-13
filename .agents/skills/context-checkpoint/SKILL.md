---
name: context-checkpoint
description: Bajar el contexto de la conversación a las issues de GitHub y al estado local .claude/session-state.md para no degradar por contexto. Usar al cerrar un tramo, antes de delegar o abrir sesión nueva, o ante «checkpoint», «guarda el contexto», «baja esto a la issue». No hace commits, push ni builds.
---

# Checkpoint de contexto (adaptador Codex)

Seguir `.claude/skills/context-checkpoint/SKILL.md` y el protocolo
`docs/agents/contexto.md`. Los hooks de `.claude/settings.json` son de Claude
Code; en Codex leer `.claude/session-state.md` al empezar si existe y
actualizarlo a mano en cada checkpoint.
