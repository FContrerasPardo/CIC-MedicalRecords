# IA Context - CIC-MedicalRecords

## Proposito

Este archivo concentra el contexto operativo para asistentes de IA que colaboren
en este repositorio.

## Resumen del proyecto

- Demo de Cuentas Medicas sobre Hyland Content Innovation Cloud y Automate.
- El contexto funcional principal esta documentado en `CONTEXT.md`.
- La Custom UI principal se construye desde la plantilla fuente exportada por
  Automate, no desde el build compilado anterior.
- Los mockups de referencia vienen de Stitch y estan en `UI design/`.
- La documentacion operativa esta en `UI Change Instructions/`.

## Rutas clave

- Repo raiz: `C:\CIC-MedicalRecords`.
- Plantilla fuente principal: `CustomUI/medicalrecords-pq7lr-source/`.
- Build/export anterior solo como referencia: `CustomUI/workspace-hxp-edited/`.
- Mapping de Automate: `CustomUI/medicalrecords-pq7lr-source/config/contexts.json5`.
- `.env` local generado: `CustomUI/medicalrecords-pq7lr-source/apps/workspace-hxp/.env`.
- Mockups: `UI design/armado-de-cuentas/` y `UI design/gestion-de-convenios/`.
- Especificacion UI:
  `docs/superpowers/specs/2026-04-25-custom-ui-medical-records-design.md`.

## Estado tecnico validado

- Branch de trabajo recomendado: `codex/integration`.
- `main` queda como base estable.
- La plantilla exige Node `>=24.14.0 <25.0.0` y npm `>=11.9.0 <12.0.0`.
- `config/contexts.json5` es la fuente de verdad para `_customApp`.
- `apps/workspace-hxp/.env` se genera con `npm run setenv -- -c workspace-hxp:_customApp` y no se commitea.
- `workspace-hxp:preserve` fue validado correctamente.
- `workspace-hxp:build:development` fue validado correctamente.
- El local dev debe abrirse por `http://localhost:4200/`.
- No usar `127.0.0.1` para login porque puede generar CORS.
- Despues de activar y desplegar local development en Automate, la app redirige
  al login de Content Innovation Cloud.

## Mapping Automate actual

El bloque `_customApp` en `contexts.json5` contiene:

- deployed app: `fc-gb-customui-class-xm8b4-58e71b1e`
- studioClientId: `hxps:fc-gb-customui-class-xm8b4-58e71b1e:clients:158e0fdb-7f9d-4b4f-9c38-fa294f6d325b:env:58e71b1e`
- contentHost: `https://dev-75634925ac034690aeaf6236e36d0810.content.experience.hyland.com`
- processHost: `https://d41b2703-40b0-4b4b-9a2b-2f592759edb7.studio.experience.hyland.com`
- idpURL: `https://auth.iam.experience.hyland.com/idp`

## Decisiones de implementacion

- Usar la plantilla exportada desde Automate como base principal.
- Crear una extension/plugin Angular para la experiencia de Cuentas Medicas.
- Nombre previsto del plugin: `medical-records`.
- Autor para generadores: `Fernando Contreras`.
- Ruta prevista: `/medical-records`.
- No reemplazar rutas nativas de Automate salvo decision explicita.
- No copiar HTML crudo de Stitch; reinterpretar las pantallas en Angular/SCSS.
- La guia de app en blanco queda como referencia futura, no como camino actual.

## Documentacion revisada

- `GLS-Creating an Hyland Experience Application (Custom UI)-250426-013037.pdf`:
  flujo base, contexts y `.env`.
- `GLS-Creating a Plugin Page-250426-135339.pdf`: paginas de plugin.
- `GLS-Creating Custom Forms Widget-250426-135447.pdf`: widgets de formulario
  si Studio Modeler lo requiere.
- `GLS-Packaging a Custom UI-250426-135225.pdf`: empaquetado/subida.
- `GLS-Update a Custom UI-250426-135603.pdf`: actualizacion con branch/backup.
- `GLS-Create a Blank UI for Automate from Scratch-250426-135843.pdf`: opcion
  desde cero para evaluar mas adelante.

## Como debe actuar una IA en este repo

- Trabajar siempre en `C:\CIC-MedicalRecords`, no en la copia vieja de OneDrive.
- Antes de cambios de UI, revisar `UI Change Instructions/` y la especificacion
  en `docs/superpowers/specs/`.
- Antes de cambios de negocio, revisar `CONTEXT.md`.
- Mantener cambios incrementales y trazables: documentacion, configuracion,
  despues codigo UI.
- Proteger la integracion de Automate: `contexts.json5`, `.env` generado,
  rutas nativas, auth y packaging.
- Si se agregan dependencias o assets, validar impacto en build y zip final.

## Checklist rapido

1. El cambio respeta el alcance funcional de `CONTEXT.md`.
2. El comando se ejecuto en `CustomUI/medicalrecords-pq7lr-source/`.
3. Se uso Node 24/npm 11.9 para build o generadores.
4. Se preservo `config/contexts.json5`.
5. Se valido `workspace-hxp:preserve`.
6. Se valido `workspace-hxp:build:development`.
7. Si se prueba login, se usa `http://localhost:4200/`.
8. Si el cambio afecta despliegue, se valida `workspace-hxp:pack-build`.
