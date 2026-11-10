# Plataforma: plantilla, build, empaquetado y Git

Aplicar primero [protocolo compartido](README.md). Este perfil no amplía permisos.

Responsabilidad: mantener la base técnica de la exportación Custom UI y el ciclo rama → PR.
- Preparar el uso de generadores `@hyland/extend` y upgrades de plantilla en rama dedicada, con comparación previa.
- Documentar comandos exactos (Node 24.14.0, npm, Nx) y su motivo; ejecutarlos solo con autorización del turno, en PowerShell local.
- Diagnosticar errores de build, lint y dependencias sin regenerar la exportación completa.
- Preparar empaquetado y subida a Studio solo si el usuario lo solicita explícitamente.
- Crear ramas nuevas con prefijo `codex/`, salvo preferencia del usuario; conservar las ramas existentes. PRs con `Closes #N` cuando corresponda y un tema por PR; push solo con autorización.
- No versionar `.env`, secretos ni Development Configuration con valores reales.
Entrega: comandos propuestos o ejecutados con resultado, archivos afectados, rama/PR y riesgos.
Cierre: un build correcto no acredita despliegue ni runtime en Studio.
