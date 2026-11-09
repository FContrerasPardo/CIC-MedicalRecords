# Roles de desarrollo Hyland

Acuerdo de trabajo: 2026-10-30 (AgenticBank). Perfiles compartidos por Codex y Claude Code.
Son agentes del ciclo de desarrollo; no son agentes de Agent Builder ni recursos de Automate.

## Estado en Medical Records

Adoptado el 2026-11-09 desde `docs/agents/` de AgenticBank. Mientras no exista un
repositorio o plugin compartido, los cambios genéricos se llevan a mano entre repos;
lo propio de este repo vive solo en [proyecto.md](proyecto.md) y [skills.md](skills.md).

- **Activo:** malla de roles, sub-sesiones y subagentes, skill first, ahorro de tokens
  y selección de modelo por el principal.
- **Pendiente (capa C):** flujo con issues de GitHub (reclamo por labels `agente:*`,
  ramas `feat/N-slug`, PR con `Closes #N`), ADR 0004/0005 y plantillas de issue y PR.
- **Pendiente (capa D):** controlador de build y serve.

## Selección y uso

Malla de roles. Los perfiles son genéricos para demos CIC con Custom
UI; lo específico de cada repositorio está en [proyecto.md](proyecto.md).

| Capa | Nombre | Perfil | Activar cuando |
| --- | --- | --- | --- |
| Coordinación | hyland-issues | [Issues y backlog visual](hyland-issues.md) | Se creen, prioricen o cierren issues o historias del backlog |
| Experiencia | hyland-ux | [UX y narrativa](hyland-ux.md) | Haya que definir flujo, estados o textos antes de implementar |
| Experiencia | hyland-frontend | [Frontend](hyland-frontend.md) | Cambie la experiencia Custom UI |
| Experiencia | hyland-i18n | [Traducciones](hyland-i18n.md) | Cambien textos visibles, recursos de idioma o formatos regionales |
| Plataforma Hyland | hyland-integration | [Integración](hyland-integration.md) | Cambien comunicaciones o contratos con Automate |
| Plataforma Hyland | hyland-ai-content | [IDP, Agent Builder y KE](hyland-ai-content.md) | Cambien clases documentales, policy de agentes u ontologías |
| Plataforma Hyland | hyland-platform | [Plataforma y Git](hyland-platform.md) | Haya generadores, upgrades, build, empaquetado o ramas/PRs |
| Contenido demo | hyland-demo-data | [Sets sintéticos](hyland-demo-data.md) | Se necesiten escenarios, documentos o variantes |
| Contenido demo | hyland-demo-docs | [Artefactos vivos](hyland-demo-docs.md) | Un cambio afecte los artefactos vivos de la demo (ver proyecto.md) o el guion |
| Control | hyland-quality | [Calidad](hyland-quality.md) | Se requiera contrastar cambios con evidencia |
| Control | hyland-guardrails | [Guardrails](hyland-guardrails.md) | Haya datos, issues públicos, IA en decisiones o riesgos de seguridad |
| Control | hyland-skills | [Skills](hyland-skills.md) | Haya un procedimiento reutilizable verificado |

## Sub-sesión por feature y subagentes

Flujo: tarea → sub-sesión con rama (y worktree si no hay UI) → subagentes por rol
dentro de la sesión → PR → merge autorizado. La tarea es un issue `#N` (rama
`feat/N-slug`, PR con `Closes #N`) cuando el backlog esté en GitHub (capa C); mientras
tanto, una historia del backlog en preparación o un encargo del usuario, con rama
`<tipo>/<slug>` (p. ej. `docs/agents-canon`).

- **Sub-sesión:** una feature o tarea completa, con rama, PR y contexto propios.
  La abre el coordinador; dos sesiones no escriben los mismos archivos. Con UI,
  una a la vez en el checkout principal sobre su rama (así se ve en el servidor
  local); sin UI, puede ir en un worktree sin levantar entorno (ver «Worktrees»
  en [proyecto.md](proyecto.md)).
- **Reclamo:** toda sub-sesión reclama su tarea antes de empezar, para que
  Claude y Codex no se pisen. Con issues (capa C; la regla completa irá en
  AGENTS.md): label `agente:claude` o `agente:codex`, estado `In progress` y un
  comentario con este formato, que se actualiza si cambia la rama o el alcance:
  `**Reclamado por <Claude|Codex>** (AAAA-MM-DD). Sesión «<título>», <checkout
  principal | worktree sin entorno>. Rama: `<rama>`. Áreas: `<rutas>`. Sin PR
  todavía.`
  Un issue con label de otro agente no se toma. No hay assignee porque ambos
  agentes actúan con la cuenta del usuario. Mientras no haya issues, declarar
  rama y áreas al abrir la sub-sesión y en la descripción del PR.
- **Subagente:** una pieza acotada dentro de una sesión; devuelve resultado
  breve y no crea ramas ni otras sesiones.
- Secuencia típica para una pantalla: ux → frontend → i18n → quality/guardrails.
  Para un contrato: integration o ai-content → frontend → quality.
- Push, PR, merge y escrituras en GitHub conservan la autorización del turno.

El chat principal coordina y puede asumir un perfil sin crear subagentes.
Un rol por defecto; activar otros solo cuando aporten una entrega concreta.
No hay monitoreo permanente ni ejecución automática de los roles.
El usuario autoriza al principal a gestionar la delegación y seleccionar el
modelo por tarea. Delegar solo si el resultado justifica el contexto adicional;
preferir ejecución secuencial. Los procesos/comandos paralelos siguen sujetos
a autorización explícita. Cada agente recibe alcance y autorizaciones del turno,
sin propagarlas a acciones distintas ni delegar recursivamente por su cuenta.

Definiciones para clientes compatibles: `.codex/agents/*.toml` y
`.claude/agents/*.md`. Referencian estos perfiles para evitar duplicar su contenido.
No fijan modelos ni razonamiento por rol: los elige el principal por encargo.
No cambian permisos, hooks, servidores o configuración global.
La carga efectiva depende de la versión del cliente y queda pendiente de comprobar.
Si el cliente no los descubre, se puede usar el mismo perfil directamente en el chat.

Ejemplos de uso:

- «Asume hyland-demo-data y diseña variantes del set de cuentas sintéticas usando los datos maestros existentes. Solo documentación.»
- «Usa el subagente hyland-integration para inspeccionar el contrato de esta tarea; sin comandos de proyecto.»
- «Asume hyland-issues y consolida la evidencia de estas historias sin cerrar los pendientes runtime.»
- «Usa hyland-ux para proponer estados y textos del overview antes de implementar; sin código.»
- «Usa hyland-guardrails para revisar este PR por PII/PHI, secretos y decisiones de IA.»
- «Usa hyland-i18n para revisar las traducciones ES/EN de esta tarea y conservar placeholders y contratos.»

Cuando una tarea afecte textos o idiomas, el principal contempla hyland-i18n
para una revisión acotada; puede asumir el perfil directamente si el cambio es
pequeño. Frontend conserva la experiencia y Calidad la comprobación independiente.

## Encargo y continuidad

Entregar a cada rol: objetivo, ID de tarea, alcance de archivos, fuentes y
versión de referencia, criterio de aceptación, autorizaciones de ejecución y
modelo/razonamiento solicitados con una justificación breve.
Evitar copiar la conversación completa. Si falta una decisión, avanzar con
las partes independientes y señalar exactamente qué queda por decidir.

La entrega incluye resultado, archivos, evidencia y límites, siguiente paso y
posible procedimiento reutilizable, en pocas líneas. El coordinador (o
hyland-issues) publica el handoff como comentario de continuidad en el issue
(o, sin issue, en la descripción del PR) con lo que entregan los especialistas.

Prioridades, alcance y aceptación funcional pertenecen al usuario. El árbitro
fundamenta estados; Calidad contrasta evidencia; Datos sintéticos construye
los sets. La aceptación del diseño de estos roles no valida su funcionamiento.

## Skill first

1. Antes de resolver una tarea repetible, buscar una skill aplicable.
2. Reutilizarla o mejorarla antes de crear otra; consultar referencias solo al necesitarlas.
3. Evaluar toda solución repetible para su incorporación. Crear una skill si
   tiene disparador claro, procedimiento útil y evidencia; integrar pasos pequeños
   en una existente o usar plantilla/script cuando sea más adecuado.
4. Al crear o actualizar, aplicar skill-creator y las reglas del repositorio.
   Incluir entradas, resultado, verificación, fuentes, compatibilidad y límites.
5. Parametrizar lo que varía entre proyectos y conservar reglas específicas en
   el repositorio. No introducir secretos, hosts o contratos de otras demos.
6. Separar procedimiento verificado de propuesta. Una inspección estática no
   acredita runtime ni convierte un caso particular en solución universal.

7. **Regla de dos veces:** si un procedimiento se repite dos veces, o aparece en
   dos repositorios de demo, abrir un issue con label `skill-candidate` (sin
   backlog en GitHub, registrarla en [skills.md](skills.md));
   hyland-skills lo convierte o lo integra en una skill existente.
8. Las plantillas de issue y PR (capa C) preguntan si existe una skill y si el trabajo
   generó o mejoró una. Responder siempre; «no aplica» es una respuesta válida.
9. Consultar el [catálogo de skills](skills.md) antes de explorar el repo.
   Mantenerlo breve: disparador, entradas, límites y estado.
10. Ubicación: skills del proyecto en `.claude/skills/`; skills genéricas para
    demos CIC en un repositorio o plugin compartido (decisión pendiente del
    usuario). La ruta de skills de repositorio en Codex está por verificar.

Candidatas y estado: ver [skills.md](skills.md). Una candidata no es una skill
instalada: construirla al verificar un procedimiento real, evitando duplicados.

## Ahorro de tokens

- Buscar rutas y fragmentos con `rg`; cargar solo fuentes necesarias respetando
  la jerarquía de AGENTS.md. No releer archivos sin cambios ya conocidos.
- Mantener instrucciones permanentes breves, perfiles separados y referencias
  bajo demanda. No cargar todos los perfiles ni todo el catálogo de documentos.
- Una tarea pequeña se resuelve en el chat principal. Al delegar, aplicar la
  selección dinámica siguiente y respetar cualquier modelo fijado por el usuario.
- Evitar exploraciones duplicadas, polling, reintentos sin evidencia nueva y
  validaciones repetidas. Ninguna economía elimina comprobaciones necesarias.
- Reutilizar datos maestros, plantillas y scripts deterministas. Su ejecución
  sigue sujeta a las autorizaciones del turno y a las skills aplicables.
- Handoff breve en el comentario de continuidad del issue: hecho, evidencia,
  incertidumbre y siguiente acción.
  No crear diarios o backlog paralelos.
- Con issues (capa C): leer una tarea con `gh issue view N`; no cargar el backlog histórico completo. Consultar `gh` en lectura no requiere autorización; crear,
  editar o comentar sí.
- Subagentes de lectura, inventario o búsqueda: modelo económico. Sus entregas
  no repiten el contenido de los archivos, solo rutas y hallazgos.
- Si el cliente expone consumo, comparar tokens totales de tareas equivalentes,
  incluidos subagentes. Si no, registrar «no medido». No inventar porcentajes de ahorro.

## Selección de modelo por el principal

Autorización del usuario (AgenticBank, 2026-10-30; en Medical Records rige cuando
el usuario apruebe este cambio): el principal gestiona los subagentes y
elige su modelo según la tarea para optimizar consumo y coste. No necesita
pedir confirmación para cada selección dentro de este alcance. El usuario
puede fijar modelo o presupuesto y esa indicación prevalece.

| Tipo de encargo | Selección inicial |
| --- | --- |
| Búsqueda focalizada, inventario, aplicar plantilla verificada, consolidar evidencia | Modelo económico disponible y razonamiento bajo compatible |
| Implementación acotada, adaptación documental, generación de variantes con reglas claras | Modelo equilibrado y razonamiento suficiente para verificar consistencia |
| Contratos ambiguos, diagnóstico entre capas, arquitectura, revisión compleja | Modelo de mayor capacidad y razonamiento acorde con incertidumbre y riesgo |

La selección depende del encargo, no del nombre del rol. No fijar IDs o precios
en perfiles; elegir entre modelos realmente disponibles en el cliente/proveedor.
No cambiar el modelo del chat principal. Un modelo económico reduce precio por
token, pero puede consumir más tokens o requerir correcciones: optimizar coste
total y calidad, reducir contexto y medir tokens por separado cuando sea posible.

Antes de crear: elegir rol, modelo y esfuerzo, redactar un encargo compacto y
pasar la selección en los parámetros reales de la herramienta; escribirla en
el prompt no cambia el modelo. Para Codex, usar `model` y `reasoning_effort`
si están disponibles en la herramienta; los perfiles TOML no fijan `model` ni
`model_reasoning_effort`, pues esos campos podrían imponerse a la selección.
Si una herramienta exige contexto nuevo para cambiar modelo, usar ese modo
(p. ej., `fork_turns: "none"` en Codex) y pasar el handoff necesario.

En Claude Code, usar el parámetro `model` por invocación cuando esté disponible;
los perfiles omiten modelo y esfuerzo fijos. Seleccionar únicamente aliases
admitidos por la herramienta y ajustar esfuerzo solo si la versión lo soporta.

Si no se especifica selección, puede heredarse el modelo del principal o
aplicarse un default del cliente; no asumir que eso es económico. Si el cliente
no permite seleccionar el modelo, declarar el límite y continuar en el principal
cuando delegar no aporte valor. No afirmar selección efectiva sin evidencia;
registrar «solicitado» y «efectivo no verificado» cuando corresponda.

El subagente conserva el modelo recibido y solicita al principal una escalada
si encuentra ambigüedad relevante; no se cambia a sí mismo ni crea otros agentes.
Ante evidencia de insuficiencia, el principal puede escalar con el handoff del
avance realizado, evitando repetir toda la exploración. No escalar por un error
de permisos, un comando no autorizado o un artefacto ausente.

Registrar en continuidad/bitácora de la tarea: tarea delegada, modelo y esfuerzo
solicitados, modelo efectivo si es observable, motivo y resultado. No inventar
consumo ni crear otro diario. Carga, selección y herencia runtime aún requieren
comprobación en cada cliente instalado; este ajuste es de instrucciones.

## Fuentes de configuración

- [Codex: subagentes](https://learn.chatgpt.com/docs/agent-configuration/subagents).
- [Claude Code: subagentes](https://code.claude.com/docs/en/sub-agents).
- [Codex: skills](https://learn.chatgpt.com/docs/build-skills).
- [Claude Code: skills](https://code.claude.com/docs/en/skills).

Estas fuentes describen formatos de cliente; las reglas del proyecto están en
AGENTS.md, y los estados/evidencias de trabajo en el backlog canónico.
