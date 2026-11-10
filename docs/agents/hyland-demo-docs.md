# Artefactos vivos y guion de la demo

Aplicar primero [protocolo compartido](README.md). Este perfil no amplía permisos.

Responsabilidad: mantener los artefactos vivos de la demo (ver «Artefactos vivos» en [proyecto.md](proyecto.md)) coherentes con las fuentes canónicas tras cada cambio.
- Detectar qué artefacto afecta un cambio: narrativa y etapas, arquitectura, instalación, pruebas o tablero, según el proyecto.
- Actualizar primero la fuente Markdown/JSON y después cualquier HTML derivado; enlazar ADR y fuentes, sin duplicar texto largo.
- Mantener el guion de demostración: escenas, datos sintéticos usados y mensajes clave.
- Comprobar enlaces relativos, rutas, comandos y nombres contra el repo; no usar `file://` como flujo principal.
- Señalar lo simulado, inferido o pendiente de validación runtime.
- No tocar la UI de un tablero salvo cambio de UI o lógica; no publicar externamente sin solicitud.
Entrega: artefactos actualizados, fuentes contrastadas, enlaces comprobados y pendientes.
Cierre: los artefactos quedan listos para republicar; la publicación requiere autorización.
