# Automate Custom UI - CIC Medical Records

Esta carpeta conserva las instrucciones usadas para crear, adaptar, empaquetar y
actualizar una Custom UI de Hyland Automate. Para este repo, la ruta principal
no es crear una app desde cero: es trabajar sobre la plantilla fuente exportada
desde Automate en:

```text
C:\CIC-MedicalRecords\CustomUI\medicalrecords-pq7lr-source
```

## Entorno recomendado

- Windows con ruta corta: `C:\CIC-MedicalRecords`.
- Visual Studio Code o editor equivalente.
- Node.js `24.14.0`.
- npm `11.9.x`.

Nota: algunas guias generales de Hyland mencionan Node 22. La plantilla
`medicalrecords-pq7lr-source` tiene `engines` en `package.json` y exige Node 24.

## Flujo local validado

Los comandos de este flujo deben correr localmente en Windows, no dentro del
sandbox de una IA. El sandbox produjo falsos `EPERM` al ejecutar Node/Nx porque
bloquea `child_process.spawn` y `fs.rename`.

```powershell
cd C:\CIC-MedicalRecords\CustomUI\medicalrecords-pq7lr-source
npm ci
npm run setenv -- -c workspace-hxp:_customApp
npm run nx:run-target -- workspace-hxp:preserve
npm run nx:run-target -- workspace-hxp:build:development
npm start workspace-hxp -- --host localhost --port 4200 --open=false
```

Abrir:

```text
http://localhost:4200/
```

No usar `127.0.0.1` para login local por posibles errores CORS con el IDP.

## Re-empaquetado y subida

El procedimiento operativo para regenerar configuracion, ejecutar
`workspace-hxp:pack-build` y preparar el paquete para subida manual en Automate
esta documentado en:

```text
docs/custom-ui/repackage-and-upload-runbook.md
```

Ese runbook explica cada comando antes de ejecutarlo. La validacion del zip y
la subida en Studio Modeling quedan como pasos manuales del usuario.

## Fuente de verdad de Automate

La configuracion de desarrollo local esta en:

```text
CustomUI/medicalrecords-pq7lr-source/config/contexts.json5
```

El archivo generado:

```text
CustomUI/medicalrecords-pq7lr-source/apps/workspace-hxp/.env
```

no se versiona. Se regenera desde `contexts.json5`.

## Rama de trabajo

Usar `codex/integration` como branch de integracion para cambios de UI. Mantener
`main` como base estable para poder volver rapido si una prueba de plugin,
widget o packaging rompe el workspace.

## Autor para generadores

Cuando se use `@hyland/extend`, el autor del proyecto debe ser:

```text
Fernando Contreras
```

Ejemplo:

```powershell
npm run nx:generate -- @hyland/extend:plugin medical-records --author "Fernando Contreras" --addTranslations true
```

## Documentos incluidos

Los PDFs GLS y `Vibecoding.md` viven en la ubicacion canonica:

```text
docs/custom-ui/reference-docs/hyland/
```

Ver indice: `docs/custom-ui/reference-docs/hyland/README.md`.

Procesos/tareas/subprocesos en medical-records: `docs/custom-ui/processes-tasks-subprocesses.md`.

Referencias historicas (misma carpeta relativa bajo `UI Change Instructions/`):

- `../docs/custom-ui/reference-docs/hyland/GLS-Creating an Hyland Experience Application (Custom UI)-250426-013037.pdf`:
  flujo base para crear/descargar la Custom UI y generar `.env`.
- `../docs/custom-ui/reference-docs/hyland/GLS-Creating a Plugin Page-250426-135339.pdf`: creacion de paginas de plugin.
- `../docs/custom-ui/reference-docs/hyland/GLS-Creating Custom Forms Widget-250426-135447.pdf`: widgets para formularios
  cuando el diseno de Studio Modeler lo requiera.
- `../docs/custom-ui/reference-docs/hyland/GLS-Packaging a Custom UI-250426-135225.pdf`: build, zip y subida a Automate.
- `../docs/custom-ui/reference-docs/hyland/GLS-Update a Custom UI-250426-135603.pdf`: actualizar una Custom UI existente;
  aplicar siempre con branch/backup previo.
- `../docs/custom-ui/reference-docs/hyland/GLS-Create a Blank UI for Automate from Scratch-250426-135843.pdf`: ruta
  alternativa desde cero; queda como referencia futura.
- `../docs/custom-ui/repackage-and-upload-runbook.md`: runbook operativo de
  re-empaquetado de este proyecto.
- `Create-Custom-UI.md`: guia historica del flujo inicial.
- `Changing-Angular-UI.md`: guia historica para reemplazar Home. En esta demo se
  prefiere plugin/extension antes de reemplazar el shell base.

## Criterio de implementacion para esta demo

- Crear un plugin `medical-records`.
- Registrar una ruta `/medical-records`.
- Conservar rutas nativas de Automate como tareas, procesos, start process y
  process details.
- Migrar las pantallas de `UI design/` a Angular/SCSS mantenible.
- Evitar pegar HTML exportado de Stitch con CDN externos.
- Empaquetar con `workspace-hxp:pack-build` antes de subir a Automate.

La decision tecnica y el estado del scaffold del plugin quedan documentados en:

```text
docs/custom-ui/medical-records-plugin.md
```

Los errores y hallazgos de entorno local quedan documentados en:

```text
docs/custom-ui/local-development-findings.md
```
