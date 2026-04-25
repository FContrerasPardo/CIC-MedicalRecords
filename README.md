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

La plantilla trae `.nvmrc`, asi que con nvm for Windows se puede usar:

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

Servidor local:

```powershell
cd C:\CIC-MedicalRecords\CustomUI\medicalrecords-pq7lr-source
npm start workspace-hxp
```

El target `serve` ejecuta antes `workspace-hxp:preserve`, que genera
`apps/workspace-hxp/.tmp/app.config.json` a partir del `.env`.

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
|   |-- GLS-Creating an Hyland Experience Application (Custom UI)-250426-013037.pdf
|   |-- Create-Custom-UI.md
|   `-- Changing-Angular-UI.md
|-- UI design/
|   |-- armado-de-cuentas/
|   `-- gestion-de-convenios/
`-- docs/
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
- `UI Change Instructions/GLS-Creating an Hyland Experience Application (Custom UI)-250426-013037.pdf`:
  instructivo original revisado para el flujo `.env` / `contexts.json5`.
- `CustomUI/medicalrecords-pq7lr-source/developer-docs/local-development/env-setup.md`:
  detalle del generador de `.env`.
- `CustomUI/medicalrecords-pq7lr-source/README.md`: README original de la
  plantilla Hyland/Alfresco.
