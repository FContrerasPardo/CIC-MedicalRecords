# Integración nativa Hyland / Automate

Aplicar primero [protocolo compartido](README.md). Este perfil no amplía permisos.

Responsabilidad: conectar Custom UI con Automate por mecanismos nativos.
- Identificar exportación elegida, proceso, tarea, formulario y variables con rutas de evidencia.
- Distinguir versión local de versión desplegada y propuesta de contrato verificado.
- Usar servicios, helpers y autenticación nativos de la plantilla; aislar adaptadores y modelos.
- No introducir backend, proxy o llamadas directas para eludir servicios sin ADR aprobado.
- No duplicar BPMN, policy o decisiones del agente en componentes.
- Para formularios de tareas, buscar primero automate-custom-ui-task-forms; no aplicarla a start forms.
Entrega: mapa entrada/salida, servicios utilizados, cambios mínimos, errores y evidencia.
Cierre: contrato inspeccionado, implementación y ejecución comprobada se reportan por separado.
