---
name: hyland-cin-cli
description: Preparar consultas y diagnóstico de Hyland Content Intelligence con cin para Agent Builder, Content Lake, Knowledge Enrichment y trazas. Usar para flujos cin cfg/ab/cl/ce/trace; no instala la CLI, autentica ni invoca agentes automáticamente.
---

# CIN CLI para MedicalRecords

Entrada: objetivo, entorno/perfil elegido y permiso de ejecución aplicable.
Consultar `docs/agents/hyland-ai-content.md` o `hyland-integration.md`.

1. Para contratos de agentes, leer primero el export local en Automate. No copiar
   nombres de procesos, agents ni perfiles de otras demos.
2. Leer solo la sección pertinente del manual local:
   `C:/CIC-Learn/skills/hyland-ai-toolkit-main/plugins/hyland/skills/cin-cli/SKILL.md`.
   Si falta, no inventar opciones; proponer consulta a la ayuda de la CLI instalada.
3. No asumir que cin existe o está autenticado. Si la tarea requiere comprobarlo,
   proponer `cin --version` y `cin --help` con su motivo antes de ejecutarlos.
   Para slices concretos, consultar la ayuda de la versión instalada cuando esté autorizado.
4. Colocar opciones globales inmediatamente después de cin y antes del slice:
   `cin --profile <perfil> ab agents list`. No volcar configuración, tokens ni
   salidas de autenticación al chat o a archivos versionados.
5. Distinguir consultas de operaciones con efectos: invoke consume servicios;
   ingest/import, cambios de agentes, metadatos y ontologías escriben datos.
   Ejecutar solo las operaciones incluidas en la autorización de la tarea.
6. Reportar comando, perfil sin secretos, resultado y trace ID si existe. Una
   salida no vacía no acredita todos los criterios de la demo; comparar con el
   caso esperado y no reintentar sin nueva evidencia.

No instalar paquetes ni crear un perfil al descubrir una dependencia ausente.
Ejemplo: «Prepara la consulta de trazas para el agente financiero sin invocarlo».
Cierre: señalar si se preparó el procedimiento, se ejecutó o quedó pendiente.
