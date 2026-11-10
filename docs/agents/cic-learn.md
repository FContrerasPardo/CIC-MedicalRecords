# Incorporación selectiva de CIC-Learn

Fuente local inspeccionada: `C:\CIC-Learn\00_START-HERE.md` y
`skills/hyland-ai-toolkit-main/plugins/`. Fecha: 2026-11-10.
El bundle contiene snapshots locales; extraerlo no instala ni activa plugins.

## Qué se incorporó

| Fuente del bundle | Adaptación en este proyecto |
| --- | --- |
| Hyland: ux-discovery | Estados, personas y criterios de aceptación en `hyland-ui-refactor` |
| Satori: satori-developer | Reutilización de componentes y comprobación de versión en `hyland-ui-refactor` |
| Hyland: write-documentation | `hyland-technical-docs`: procedimientos claros y fuentes verificables |
| Hyland: issue-triage | `hyland-issue-triage`: alcance acotado, reproducción y evidencia |
| Hyland: cin-cli | `hyland-cin-cli`: sintaxis y consulta progresiva del manual local |

Las adaptaciones son instrucciones breves propias en `.agents/skills/`.
Referencian los originales bajo demanda, sin copiar todo el toolkit ni sus
scripts. Sus pasos esenciales también funcionan si el bundle no está presente;
para sintaxis específica de cin, obtener su ayuda instalada con autorización.
La disponibilidad de CLI, autenticación, MCP o plugins no se infiere de los archivos.

## Compatibilidad y permisos

- Los plugins originales se presentan para Claude Code/Copilot. Aquí se
  incorporan skills de proyecto para Codex; no se afirma instalación del plugin.
- Mantener una sola auditoría i18n: la entrada de Codex referencia el script
  recuperado de `.claude/skills/i18n-key-audit/`.
- Las guías Satori proponen builds/lint al terminar. En este repo manda
  `AGENTS.md`: explicar comando y motivo y ejecutar solo cuando se autorice.
- No instalar Satori, migrar Platform Nav, actualizar paquetes, ejecutar scripts
  de setup, invocar agentes ni cambiar formularios por cargar una skill.
- La skill UX original restringe su herramienta Read a adjuntos de chat.
  La adaptación usa las fuentes del repo autorizadas para esta tarea y no
  presupone herramientas de otros clientes.
- No portar `finalize-commit-message` como paso automático: propone reescritura
  de historia. No portar auditorías de repositorio completo al flujo ordinario.
- Impeccable, Superpowers, DRI y los agentes del toolkit permanecen como
  referencias del bundle; no se activan hooks ni orquestadores adicionales.
- El bundle indica que sus repositorios internos no se redistribuyen fuera de
  Hyland sin autorización. Esta integración no incorpora sus manuales completos.

## Evidencia y pendientes

Se inspeccionaron fuentes y se integraron instrucciones locales.
No se ejecutaron scripts de skills, CIN CLI, builds, tests, lint ni migraciones.
No se verificaron descubrimiento del cliente, conexión a servicios ni runtime UI.
Para comprobar descubrimiento, abrir una sesión nueva desde este repo y revisar
las skills y perfiles disponibles. Esa comprobación no requiere compilar la app.
