# Repackage and Upload Runbook

Este runbook documenta el procedimiento operativo para regenerar la
configuracion local, re-empaquetar la Custom UI de Cuentas Medicas y preparar
el archivo que se sube manualmente en Hyland Automate.

La validacion del zip y la subida a Automate quedan a cargo del usuario. Este
documento no incluye comandos ni pasos para revisar el paquete generado.

## Alcance

- Trabajar sobre la plantilla fuente exportada desde Automate.
- Crear un checkpoint Git antes de empaquetar para poder volver a una version
  limpia si el deploy falla.
- Regenerar `.env` y `app.config.json` desde `config/contexts.json5`.
- Entender la fase `prebuild` de la plantilla, donde se limpia y reconstruye
  temporalmente `.tmp/app.config.json`.
- Ejecutar el empaquetado oficial de `workspace-hxp`.
- Dejar listo `dist/workspace-hxp.zip` para subida manual en Studio Modeling.

No modifica el modelo de Automate, no instala dependencias salvo que sea
necesario recuperar `node_modules`, y no reemplaza las guias oficiales de
Hyland. La referencia fuente para build, zip y subida es:

```text
UI Change Instructions/reference-docs/hyland/GLS-Packaging a Custom UI-250426-135225.pdf
```

## Prerrequisitos

- Ejecutar los comandos en PowerShell local de Windows, fuera del sandbox de IA.
- Usar Node `>=24.14.0 <25.0.0` y npm `>=11.9.0 <12.0.0`.
- Confirmar que `config/contexts.json5` contiene el bloque `_customApp`
  vigente copiado desde Automate Development Configuration.
- No editar `apps/workspace-hxp/.env` como fuente de verdad; se regenera desde
  `contexts.json5`.

## Relacion entre `contexts.json5`, `.env`, `preserve`, `serve` y `pack-build`

Esta seccion aclara la relacion entre la configuracion de Automate, los archivos
generados por la plantilla Hyland y los comandos usados antes de probar o
empaquetar la Custom UI.

```text
config/contexts.json5
        ↓
npm run setenv -- -c workspace-hxp:_customApp
        ↓
apps/workspace-hxp/.env
        ↓
workspace-hxp:preserve
        ↓
apps/workspace-hxp/.tmp/app.config.json
        ↓
serve, build o pack-build
```

La regla practica es:

- `config/contexts.json5` es la fuente de verdad de la conexion con Automate.
- `apps/workspace-hxp/.env` es un archivo generado localmente y no debe
  versionarse.
- `apps/workspace-hxp/.tmp/app.config.json` es un archivo temporal generado para
  runtime y build.
- `serve` levanta la aplicacion local y, segun la configuracion Nx, normalmente
  ejecuta `preserve` antes de iniciar.
- `preserve` no levanta la aplicacion; solo prepara la configuracion runtime.
- `pack-build` construye el bundle productivo y genera el zip que se sube
  manualmente en Automate.

### Que significa regenerar el `.env` desde `_customApp`

Cuando el procedimiento dice regenerar el `.env` desde `_customApp`, no
significa crear otra Custom UI ni borrar los cambios de codigo. Significa
ejecutar el generador de ambiente de la plantilla para que lea el contexto
`_customApp` dentro de:

```text
config/contexts.json5
```

y vuelva a generar el archivo local:

```text
apps/workspace-hxp/.env
```

El archivo `.env` contiene variables derivadas de la Development Configuration
de Automate, por ejemplo hosts, client id, deployed app, scopes, endpoints y
flags de autenticacion. Si se cambia `config/contexts.json5`, el `.env` debe
regenerarse para que el workspace local use esos valores actualizados.

### Esto borra mis variables?

No debe borrar `config/contexts.json5`.

Lo que si puede sobrescribir es:

```text
apps/workspace-hxp/.env
```

Por eso, no se debe editar `.env` como fuente definitiva. Cualquier valor
importante de conexion debe estar en `config/contexts.json5`. Despues se ejecuta
`setenv` para producir de nuevo el `.env` local.

### Que hace `preserve`

`workspace-hxp:preserve` usa el `.env` actual para generar o refrescar la
configuracion runtime en:

```text
apps/workspace-hxp/.tmp/app.config.json
```

Ese archivo es el que la aplicacion necesita para arrancar correctamente con los
endpoints, autenticacion y configuracion de extension esperados.

Comando manual, si se necesita ejecutarlo directamente:

```powershell
npm run nx:run-target -- workspace-hxp:preserve
```

### `preserve` ejecuta `serve`?

No. `preserve` no ejecuta `serve`.

La relacion correcta es al reves: cuando se ejecuta `serve`, la configuracion Nx
del proyecto puede declarar que antes debe correr `preserve`. En terminos
practicos:

```text
Cuando corres serve:
1. primero se prepara la configuracion runtime con preserve
2. despues se levanta el servidor local
```

Por eso normalmente no hace falta ejecutar `preserve` manualmente si se va a
correr el servidor local con el target configurado.

### Que hace `serve`

`serve` levanta la aplicacion local para probarla en navegador. Para esta demo,
debe usarse:

```text
http://localhost:4200/
```

No usar `127.0.0.1` para login local por posibles problemas de CORS con el
proveedor de identidad.

Comando recomendado:

```powershell
npm start workspace-hxp -- --host localhost --port 4200 --open=false
```

### Que hace `pack-build`

`pack-build` es el comando principal para empaquetar la Custom UI. Ejecuta el
build productivo y genera el zip final:

```text
dist/workspace-hxp.zip
```

Comando recomendado:

```powershell
npm run nx:run-target -- workspace-hxp:pack-build
```

Ese zip es el archivo que se sube manualmente en Studio Modeling para reemplazar
el paquete de la Custom UI.

### Decision practica

Si `config/contexts.json5` esta correcto, regenerar `.env` es seguro y
recomendable. Lo importante es no tratar `.env` como fuente de verdad, porque es
un artefacto generado localmente.

El orden mental correcto es:

```text
contexts.json5 manda.
setenv genera .env.
preserve genera app.config.json.
serve prueba localmente.
pack-build genera el zip.
```

## Procedimiento

### 1. Crear un checkpoint Git previo

```powershell
cd C:\CIC-MedicalRecords
git status --short
```

Estos comandos ubican la terminal en la raiz del repositorio y muestran los
archivos pendientes. Antes de empaquetar, revisar que el estado pendiente
corresponda solamente a cambios que se quieran conservar.

Si el estado esta listo para guardarse, preparar solo los archivos revisados:

```powershell
git add <archivos-revisados>
```

`git add` registra los archivos que quedaran dentro del checkpoint. No usar
`git add --all` sin revisar el resultado de `git status`, porque podria incluir
archivos temporales o cambios no relacionados.

Crear el commit:

```powershell
git commit -m "chore: checkpoint before Custom UI repackage"
```

Este commit deja una version limpia y restaurable antes de ejecutar los pasos de
build y packaging recomendados por Hyland. Si el deploy de Automate falla, este
checkpoint facilita comparar, volver atras o crear un paquete nuevo desde el
mismo punto de partida.

Resultado esperado: existe un commit local con el estado que se quiere
empaquetar.

### 2. Entrar a la plantilla fuente

```powershell
cd C:\CIC-MedicalRecords\CustomUI\medicalrecords-pq7lr-source
```

Este comando ubica la terminal en la raiz real de la Custom UI. Todos los
scripts `npm` y targets `nx` de este runbook deben ejecutarse desde esta ruta.

Resultado esperado: la sesion queda en
`C:\CIC-MedicalRecords\CustomUI\medicalrecords-pq7lr-source`.

### 3. Priorizar el runtime Node validado

```powershell
$nodeBin = "C:\Users\ferch\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
$env:Path = "$nodeBin;$env:Path"
$env:NX_DAEMON = "false"
$env:NX_ISOLATE_PLUGINS = "false"
```

`$nodeBin` apunta al Node 24 validado para esta plantilla. Anteponerlo al
`PATH` hace que `node`, `npm` y los scripts de la sesion usen ese runtime antes
que el Node global de Windows.

`NX_DAEMON=false` evita reutilizar procesos Nx persistentes entre ejecuciones.
`NX_ISOLATE_PLUGINS=false` evita aislamientos de plugins que en esta plantilla
han generado falsos errores bajo entornos restringidos.

Resultado esperado: solo la sesion actual queda configurada para usar Node 24 y
Nx sin daemon.

### 4. Confirmar versiones activas

```powershell
node -v
npm -v
```

Estos comandos muestran las versiones que realmente usara la terminal actual.
Sirven para detectar si el `PATH` sigue apuntando al Node global incorrecto.

Resultado esperado: Node 24.x y npm 11.9.x.

### 5. Reinstalar dependencias solo si hace falta

```powershell
npm ci
```

Ejecutar este comando solo cuando `node_modules` este incompleto, corrupto o no
corresponda al `package-lock.json`. `npm ci` elimina la instalacion actual de
dependencias y reconstruye `node_modules` de forma reproducible desde el lock.

Resultado esperado: dependencias instaladas para poder ejecutar los targets Nx.
Si `node_modules` ya esta sano, omitir este paso para ahorrar tiempo y evitar
ruido operativo.

### 6. Regenerar `.env` desde `_customApp`

```powershell
npm run setenv -- -c workspace-hxp:_customApp
```

Este comando ejecuta el generador de entorno de la plantilla. Lee el bloque
`_customApp` de `config/contexts.json5` y genera los `.env` locales necesarios
para `workspace-hxp`.

Resultado esperado: `apps/workspace-hxp/.env` queda actualizado con los hosts,
client id, deployed app y flags de autenticacion correspondientes al ambiente
de Automate.

### 7. Regenerar `app.config.json`

```powershell
npm run nx:run-target -- workspace-hxp:preserve
```

`workspace-hxp:preserve` ejecuta el script de la plantilla que transforma la
configuracion local en:

```text
apps/workspace-hxp/.tmp/app.config.json
```

Ese archivo se incluye como asset del build y es necesario para que la Custom UI
arranque con la configuracion correcta.

Resultado esperado: `app.config.json` queda regenerado desde el `.env` actual.

### 8. Entender la fase `prebuild` de la plantilla

El target `build` de `workspace-hxp` depende de `prebuild`. No ejecutar
manualmente estos comandos: la plantilla los ejecuta a traves de
`apps/workspace-hxp/remove-me-setup.mjs` cuando corre el build.

La fase equivale al paso recomendado por Hyland. Este bloque es referencia de
la guia de Hyland en sintaxis `cmd.exe`/batch, no es un bloque para copiar en
PowerShell:

```text
# 1. Clean temporary directories
if exist .tmp rd /s /q .tmp

# 2. Create temporary directory
mkdir .tmp

# 3. Copy template configuration
copy .tmp\app.config.json.tpl .tmp\app.config.json
```

Si se pega ese bloque en PowerShell, fallara con un error de parser como
`Falta '(' despues de 'if'`, porque PowerShell requiere otra sintaxis para
`if`. Para este proyecto, el paso normal es dejar que `prebuild` lo ejecute
automaticamente durante `workspace-hxp:build:*` o `workspace-hxp:pack-build`.

Si se necesita reproducir ese paso manualmente en PowerShell desde la raiz de
`CustomUI/medicalrecords-pq7lr-source`, usar la version Windows/PowerShell:

```powershell
Remove-Item -LiteralPath .\apps\workspace-hxp\.tmp -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path .\apps\workspace-hxp\.tmp -Force | Out-Null
Copy-Item -LiteralPath .\apps\workspace-hxp\.tmp\app.config.json.tpl -Destination .\apps\workspace-hxp\.tmp\app.config.json -Force
```

Ese bloque solo replica la limpieza/copia temporal. No reemplaza
`workspace-hxp:preserve`, porque `preserve` tambien aplica variables de entorno
y valida la configuracion final.

En esta plantilla, el script real hace lo siguiente:

- elimina `apps/workspace-hxp/.tmp` si ya existe;
- crea nuevamente `apps/workspace-hxp/.tmp`;
- fusiona `apps/workspace-hxp/src/app.config.json.tpl` con la configuracion de
  extension de Process Services;
- genera `apps/workspace-hxp/.tmp/app.config.json.tpl`;
- copia ese template temporal a `apps/workspace-hxp/.tmp/app.config.json`.

Despues, `workspace-hxp:preserve` aplica `envsub` sobre el template y valida el
`app.config.json` contra el schema de ADF.

Resultado esperado: el build siempre parte de una configuracion temporal
reconstruida y no de residuos viejos en `.tmp`.

### 9. Compilar en modo desarrollo si se necesita una comprobacion local

```powershell
npm run nx:run-target -- workspace-hxp:build:development
```

Este paso es opcional. Sirve como comprobacion local previa cuando se quiere
detectar errores de TypeScript, Angular o assets antes del empaquetado de
produccion.

Resultado esperado: build de desarrollo terminado. Si el objetivo es solo
re-empaquetar rapido para diagnosticar Automate, este paso puede omitirse.

### 10. Re-empaquetar la Custom UI

```powershell
npm run nx:run-target -- workspace-hxp:pack-build
```

Este es el comando principal de re-empaquetado. En el `project.json` actual,
`workspace-hxp:pack-build` ejecuta el build de produccion y luego llama al
script de zip de la plantilla:

```text
nx run workspace-hxp:build:production
node tools/scripts/zip.mjs --source dist/workspace-hxp --target dist/workspace-hxp.zip
```

Resultado esperado: se genera el paquete:

```text
dist/workspace-hxp.zip
```

La decision de subir el paquete queda como paso manual del usuario.

## Subida Manual en Automate

1. Abrir Studio Modeling.
2. Abrir el proceso que contiene la Custom UI.
3. En el panel izquierdo, abrir la seccion `UI`.
4. Seleccionar la Custom UI correspondiente.
5. Usar `Upload` y seleccionar `dist/workspace-hxp.zip`.
6. Confirmar el reemplazo cuando Automate lo solicite.
7. Guardar, liberar y desplegar o actualizar la aplicacion desde Studio Admin.

Si Automate reporta error durante la subida o el deploy, capturar el mensaje
exacto, la etapa donde ocurre y la hora aproximada para poder diagnosticarlo
sin mezclarlo con errores locales de build.
