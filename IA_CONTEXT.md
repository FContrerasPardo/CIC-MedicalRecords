# IA Context — CIC-MedicalRecords

## Propósito
Este archivo concentra el contexto operativo para asistentes de IA que colaboren en este repositorio.

## Resumen del proyecto
- Proyecto de demo para **Cuentas Médicas** sobre **Hyland Content Innovation Cloud (CIC)**.
- El contexto funcional principal está documentado en `CONTEXT.md`.
- Existe un ejemplo de **Custom UI** ya inicializado y conectado a Automate para desarrollo local.
- La guía de implementación y cambio de UI está en `UI Change Instructions/` (Markdown + PDF).

## Artefactos clave
1. `CONTEXT.md`
   - Define alcance funcional por etapas del ciclo de cuentas médicas.
2. `CustomUI/workspace-hxp-edited/`
   - Contiene artefactos del front-end compilado/exportado.
3. `UI Change Instructions/README.md`
   - Prerrequisitos de entorno (Node/NVM, instalación).
4. `UI Change Instructions/Create-Custom-UI.md`
   - Flujo completo para crear/descargar/configurar/editar una Custom UI.
5. `UI Change Instructions/Changing-Angular-UI.md`
   - Ajuste puntual de rutas para reemplazar Home por página personalizada.
6. `UI Change Instructions/GLS-Creating an Hyland Experience Application (Custom UI)-250426-013037.pdf`
   - Referencia visual y secuencial del proceso.

## Estado técnico actual (importante)
- El proyecto base de UI ya está inicializado (se reutiliza como punto de partida).
- Pueden aparecer errores de entorno local asociados a `localhost` en etapas tempranas.
- Dichos errores no invalidan la estructura documental ni el enfoque de la demo; deben resolverse por iteraciones de configuración.

## Cómo debe actuar una IA en este repo
- **Antes de proponer cambios de UI**, revisar primero `UI Change Instructions/`.
- **Antes de proponer cambios de negocio**, revisar primero `CONTEXT.md`.
- Priorizar cambios incrementales y trazables:
  1. Documentación.
  2. Configuración.
  3. Ajustes de código UI.
- Mantener consistencia entre instrucciones Markdown y artefactos de ejemplo.

## Checklist de validación rápida para cambios futuros
1. ¿El cambio respeta el alcance funcional descrito en `CONTEXT.md`?
2. ¿Se actualizó documentación relevante (`README` o guías) si cambió el flujo?
3. ¿Se verificó que el comando de desarrollo local aplica al workspace correcto?
4. ¿Se registraron supuestos técnicos (por ejemplo, host/puerto, variables de entorno)?

## Objetivo de corto plazo
Consolidar una base estable para iterar la interfaz personalizada de Automate y alinear progresivamente la UI con el caso de uso de cuentas médicas.
## Primer cambio registrado
- Se validó la integración con Stitch MCP para este repositorio.
- Se asoció el proyecto de Stitch `6370733408280832092`, con referencia local en `.stitch-project.json`.
- Se exportó un primer lote de pantallas de referencia y se organizó en `UI design/`.
- Estructura actual de diseño:
  1. `UI design/armado-de-cuentas/`
  2. `UI design/gestion-de-convenios/`
  3. `UI design/_residuales-stitch/`
- Cada referencia visual se conservó en HTML y PNG para facilitar futuras iteraciones de UI.
- Estos artefactos deben tratarse como base de diseño y alineación funcional, no como implementación final del producto.
