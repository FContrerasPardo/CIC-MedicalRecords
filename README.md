# CIC-MedicalRecords

Repositorio base para la demo de Cuentas Medicas sobre Hyland Content
Innovation Cloud (CIC) y Automate Custom UI.

El objetivo de este repo es conservar tres cosas juntas:

- El contexto funcional de la solucion de cuentas medicas.
- La plantilla Custom UI exportada desde Automate, lista para editar.
- Los mockups descargados desde Stitch para convertirlos en interfaces Angular.

## Estado actual

La base principal de trabajo esta en:

```text
CustomUI/medicalrecords-pq7lr-source/
```

Ese directorio contiene el source completo de la plantilla Custom UI exportada
desde Automate. El zip original tambien se conserva en:

```text
CustomUI/medicalrecords-pq7lr.zip
```

La configuracion de Automate para desarrollo local esta en:

```text
CustomUI/medicalrecords-pq7lr-source/config/contexts.json5
```

Los mockups visuales que se van a migrar a componentes Angular estan en:

```text
UI design/
```

La rama recomendada para cambios de UI es:

```text
codex/integration
```

`main` se mantiene como punto estable. Antes de cambios grandes en la plantilla
o en generadores de Hyland, trabajar en `codex/integration` permite volver
rapido a una base conocida si una iteracion rompe el build.

## Importante para usar el repo desde git

Git no debe incluir dependencias instaladas ni artefactos locales generados.
Cuando alguien clone el repo, es normal que falten estas carpetas o archivos:

```text
CustomUI/medicalrecords-pq7lr-source/node_modules/
CustomUI/medicalrecords-pq7lr-source/dist/
CustomUI/medicalrecords-pq7lr-source/.angular/
CustomUI/medicalrecords-pq7lr-source/.nx/
CustomUI/medicalrecords-pq7lr-source/tmp/
CustomUI/medicalrecords-pq7lr-source/apps/workspace-hxp/.env
```

Esos artefactos se regeneran localmente con los pasos de setup de abajo.

Los paquetes privados exportados junto con la plantilla si estan versionados en:

```text
CustomUI/medicalrecords-pq7lr-source/.private-packages/
```

Esto es necesario porque el `package.json` referencia varios paquetes con
`file:.private-packages/...`.

## Requisitos

- Windows con una ruta corta para evitar problemas de path length. Recomendado:
  `C:\CIC-MedicalRecords`.
- Node.js `24.14.0`.
- npm `11.9.x`.
- Acceso a los registries npm requeridos por el `package-lock.json`.

La plantilla trae `.nvmrc` y el `package.json` exige Node `>=24.14.0 <25.0.0`
y npm `>=11.9.0 <12.0.0`. Algunas guias Hyland mencionan Node 22, pero esta
plantilla concreta debe ejecutarse con Node 24.

Con nvm for Windows se puede usar:

```powershell
cd C:\CIC-MedicalRecords\CustomUI\medicalrecords-pq7lr-source
nvm install 24.14.0
nvm use 24.14.0
node -v
npm -v
```

## Setup despues de clonar

Desde una clonacion limpia:

```powershell
git clone <repo-url> C:\CIC-MedicalRecords
cd C:\CIC-MedicalRecords\CustomUI\medicalrecords-pq7lr-source
```

Instalar dependencias:

```powershell
npm ci
```

Generar el `.env` local de `workspace-hxp` usando el contexto `_customApp`:

```powershell
npm run setenv -- -c workspace-hxp:_customApp
```

Ese comando crea:

```text
CustomUI/medicalrecords-pq7lr-source/apps/workspace-hxp/.env
```

El `.env` contiene valores locales derivados de `config/contexts.json5` y no se
commitea.

## Cambiar la configuracion de Automate

Si se descarga una nueva plantilla desde Automate o se cambia de ambiente:

1. En Automate Studio, usar la opcion de desarrollo local y copiar el JSON de
   Development Configuration.
2. Reemplazar el bloque correspondiente en:

   ```text
   CustomUI/medicalrecords-pq7lr-source/config/contexts.json5
   ```

3. Regenerar el `.env`:

   ```powershell
   cd C:\CIC-MedicalRecords\CustomUI\medicalrecords-pq7lr-source
   npm run setenv -- -c workspace-hxp:_customApp
   ```

No edites a mano `apps/workspace-hxp/.env` como fuente principal. La fuente de
verdad para el mapeo de Automate debe ser `config/contexts.json5`.

## Ejecutar localmente

Nota para asistentes IA: no ejecutar los comandos de esta seccion dentro del
sandbox. En esta plantilla se valido que el sandbox bloquea operaciones de Node
y Nx (`child_process.spawn` y `fs.rename`), generando falsos errores `EPERM`.
Ejecutar siempre en el entorno local de Windows, usando Node 24/npm 11.9.

### Levantar la aplicacion local con Node explicito

Cuando se quiera asegurar Node 24 sin depender del Node global de Windows, este
es el metodo recomendado para levantar la app principal `workspace-hxp`:

```powershell
$work = "C:\CIC-MedicalRecords\CustomUI\medicalrecords-pq7lr-source"
$nodeBin = "C:\Users\ferch\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"

Set-Location $work

$env:PATH = "$nodeBin;$env:PATH"
$env:NX_DAEMON = "false"
$env:NX_ISOLATE_PLUGINS = "false"

$portProcess = Get-NetTCPConnection -LocalPort 4200 -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique

if ($portProcess) {
  Stop-Process -Id $portProcess -Force
}

& "$nodeBin\node.exe" ".\node_modules\nx\bin\nx.js" serve workspace-hxp --host localhost --port 4200 --open=false
```

Este flujo fija el runtime Node en la sesion actual, evita depender de la
instalacion global de Windows y levanta `workspace-hxp` de forma controlada
sobre `http://localhost:4200/`.

Servidor local equivalente si la shell ya esta usando Node 24/npm 11.9:

```powershell
cd C:\CIC-MedicalRecords\CustomUI\medicalrecords-pq7lr-source
npm start workspace-hxp
```

El target `serve` ejecuta antes `workspace-hxp:preserve`, que genera
`apps/workspace-hxp/.tmp/app.config.json` a partir del `.env`.

Para validar autenticacion local, usar siempre:

```text
http://localhost:4200/
```

No usar `127.0.0.1` para este proyecto; puede provocar errores CORS con el IDP
de Hyland. Con el modulo de local development activo y desplegado en Automate,
la app debe redirigir a la pantalla de login de Content Innovation Cloud.

Los hallazgos de errores de desarrollo local estan documentados en:

```text
docs/custom-ui/local-development-findings.md
```

## Validar y compilar

Validar la generacion de configuracion:

```powershell
npm run nx:run-target -- workspace-hxp:preserve
```

Build de desarrollo:

```powershell
npm run nx:run-target -- workspace-hxp:build:development
```

Build empaquetado para despliegue:

```powershell
npm run nx:run-target -- workspace-hxp:pack-build
```

Los outputs quedan bajo `dist/` y no se versionan en git.

## Crear el plugin de Medical Records

La ruta recomendada es crear una extension/plugin dentro de la plantilla en vez
de reemplazar el shell base de Automate. El autor para los generadores debe ser:

```text
Fernando Contreras
```

Comando base previsto:

```powershell
cd C:\CIC-MedicalRecords\CustomUI\medicalrecords-pq7lr-source
npm run nx:generate -- @hyland/extend:plugin medical-records --author "Fernando Contreras" --addTranslations true
```

El proyecto generado se espera como `medical-records` y la carpeta como:

```text
libs/plugins/medical-records/
```

Para paginas o widgets posteriores, usar el nombre real del proyecto generado
por Nx. En esta plantilla, las pruebas de generador indican que el nombre del
plugin no agrega automaticamente el prefijo `plugins-`.

El criterio tecnico y el estado actual del scaffold estan documentados en:

```text
docs/custom-ui/medical-records-plugin.md
```

## Estructura del repo

```text
.
|-- README.md
|-- CONTEXT.md
|-- IA_CONTEXT.md
|-- CustomUI/
|   |-- medicalrecords-pq7lr.zip
|   `-- medicalrecords-pq7lr-source/
|-- UI Change Instructions/
|   |-- reference-docs/
|   |   `-- hyland/
|   |       |-- GLS-Creating an Hyland Experience Application (Custom UI)-250426-013037.pdf
|   |       |-- GLS-Creating a Plugin Page-250426-135339.pdf
|   |       |-- GLS-Creating Custom Forms Widget-250426-135447.pdf
|   |       |-- GLS-Packaging a Custom UI-250426-135225.pdf
|   |       |-- GLS-Update a Custom UI-250426-135603.pdf
|   |       `-- GLS-Create a Blank UI for Automate from Scratch-250426-135843.pdf
|   |-- Create-Custom-UI.md
|   `-- Changing-Angular-UI.md
|-- UI design/
|   |-- armado-de-cuentas/
|   `-- gestion-de-convenios/
|-- artifacts/
|   |-- logs/custom-ui/
|   `-- screenshots/custom-ui/
`-- docs/
    |-- custom-ui/
    `-- superpowers/specs/
```

## Flujo recomendado de trabajo

1. Revisar `CONTEXT.md` para entender el caso funcional.
2. Revisar `docs/superpowers/specs/2026-04-25-custom-ui-medical-records-design.md`
   para el diseno aprobado de migracion UI.
3. Trabajar dentro de `CustomUI/medicalrecords-pq7lr-source/`.
4. Mantener intacta la integracion base de Automate: rutas, auth, hosts y
   generacion de `.env`.
5. Convertir los mockups de `UI design/` en componentes Angular/SCSS, no pegar
   HTML exportado de Stitch directamente.
6. Antes de subir cambios, correr al menos:

   ```powershell
   npm run nx:run-target -- workspace-hxp:preserve
   npm run nx:run-target -- workspace-hxp:build:development
   ```

## Documentacion de referencia

- `UI Change Instructions/`: guias operativas para Custom UI.
- `UI Change Instructions/reference-docs/hyland/GLS-Creating an Hyland Experience Application (Custom UI)-250426-013037.pdf`:
  instructivo original revisado para el flujo `.env` / `contexts.json5`.
- `UI Change Instructions/reference-docs/hyland/GLS-Creating a Plugin Page-250426-135339.pdf`:
  guia de paginas dentro de plugins.
- `UI Change Instructions/reference-docs/hyland/GLS-Creating Custom Forms Widget-250426-135447.pdf`:
  referencia para widgets de formularios cuando Studio Modeler lo requiera.
- `UI Change Instructions/reference-docs/hyland/GLS-Packaging a Custom UI-250426-135225.pdf`:
  referencia de empaquetado y subida a Automate.
- `UI Change Instructions/reference-docs/hyland/GLS-Update a Custom UI-250426-135603.pdf`:
  referencia para actualizar una Custom UI existente con respaldo/branch previo.
- `UI Change Instructions/reference-docs/hyland/GLS-Create a Blank UI for Automate from Scratch-250426-135843.pdf`:
  opcion futura para crear desde cero, no usada como ruta principal actual.
- `CustomUI/medicalrecords-pq7lr-source/developer-docs/local-development/env-setup.md`:
  detalle del generador de `.env`.
- `CustomUI/medicalrecords-pq7lr-source/README.md`: README original de la
  plantilla Hyland/Alfresco.
- `docs/custom-ui/medical-records-plugin.md`: decision tecnica y estado del
  plugin oficial `medical-records`.
