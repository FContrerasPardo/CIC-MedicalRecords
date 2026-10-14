# Local Development Findings

Fecha de validacion: 2026-04-25.

Este documento registra los errores, causas y reglas operativas detectadas al
levantar la Custom UI de Hyland Automate para Cuentas Medicas.

## Regla critica

No ejecutar comandos Hyland/Nx/npm de esta plantilla dentro del sandbox de una
IA. Deben ejecutarse en el entorno local de Windows, apuntando a localhost.

Comandos afectados:

- `npm ci`
- `npm run setenv -- -c workspace-hxp:_customApp`
- `npm run nx:run-target -- workspace-hxp:preserve`
- `npm run nx:run-target -- workspace-hxp:build:development`
- `npm run nx:run-target -- workspace-hxp:pack-build`
- `npm start workspace-hxp`
- `nx serve workspace-hxp`
- Generadores `@hyland/extend:*`

La razon validada es que el sandbox bloquea operaciones necesarias para Nx y
Node, especialmente `child_process.spawn` y renombres atomicos con
`fs.rename`. Esto produce errores `EPERM` falsos: parecen fallas de codigo,
plugin o autenticacion, pero son restricciones del sandbox.

## Referencia de comandos Hyland/Nx

Estos comandos se documentan para que su proposito quede claro antes de
ejecutarlos. Deben correr localmente en Windows, desde:

```text
C:\CIC-MedicalRecords\CustomUI\medicalrecords-pq7lr-source
```

No deben ejecutarse dentro del sandbox de IA porque pueden producir falsos
errores `EPERM`, workers de Nx bloqueados o fallas de renombre en `.nx`.

- `npm ci`: reinstala `node_modules` desde `package-lock.json`. Usarlo solo si
  las dependencias estan incompletas o inconsistentes.
- `npm run setenv -- -c workspace-hxp:_customApp`: lee `_customApp` desde
  `config/contexts.json5` y regenera los `.env` locales de `workspace-hxp`.
- `npm run nx:run-target -- workspace-hxp:preserve`: genera
  `apps/workspace-hxp/.tmp/app.config.json` desde el entorno local actual.
- `npm run nx:run-target -- workspace-hxp:build:development`: compila
  `workspace-hxp` en modo desarrollo. Es una comprobacion local opcional antes
  de empaquetar.
- `npm run nx:run-target -- workspace-hxp:pack-build`: ejecuta build de
  produccion y genera `dist/workspace-hxp.zip`.
- `npm start workspace-hxp` o `nx serve workspace-hxp`: levanta la aplicacion
  localmente. Usar `http://localhost:4200/`, no `127.0.0.1`.
- `NX_DAEMON=false`: desactiva el daemon persistente de Nx para evitar reutilizar
  estado o procesos antiguos.
- `NX_ISOLATE_PLUGINS=false`: desactiva el aislamiento de plugins de Nx para
  evitar fallas operativas en esta plantilla.

Antes de empaquetar, Hyland recomienda crear un commit de checkpoint para tener
una version limpia y restaurable. El procedimiento detallado esta en
`docs/custom-ui/repackage-and-upload-runbook.md`.

El target `build` de `workspace-hxp` ejecuta una fase `prebuild` que llama a
`apps/workspace-hxp/remove-me-setup.mjs`. Ese script elimina y recrea
`apps/workspace-hxp/.tmp`, genera `app.config.json.tpl` temporal y lo copia como
`app.config.json` antes de que `preserve` aplique variables de entorno y valide
la configuracion. Si se necesita reproducir ese paso manualmente en Windows, no
usar la sintaxis `cmd.exe` de Hyland dentro de PowerShell; usar la version
PowerShell documentada en el runbook.

## Entorno correcto

Ruta principal:

```text
C:\CIC-MedicalRecords\CustomUI\medicalrecords-pq7lr-source
```

Versiones requeridas por esta plantilla:

```text
Node >=24.14.0 <25.0.0
npm >=11.9.0 <12.0.0
```

En esta maquina se encontro que la instalacion global era Node `20.9.0` y npm
`10.1.0`, insuficientes para la plantilla. La ejecucion validada puede usar
Node `24.14.0` desde el runtime empaquetado de Codex/Cursor:

```powershell
$nodeBin = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin'
```

Equivalente tipico:

```text
C:\Users\<tu-usuario>\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe
```

No hardcodear un usuario distinto (`ferch`, etc.); usar siempre
`$env:USERPROFILE`.

El sitio debe abrirse en:

```text
http://localhost:4200/
```

No usar `127.0.0.1` para login local, porque puede activar problemas CORS con
el IDP de Hyland.

## Windows: bloqueo `EACCES` en Node y solucion con nvm-noinstall

Fecha de validacion: 2026-07-14.

### Sintoma

- `npm start workspace-hxp` arranca en `http://localhost:4200/`, pero Vite muestra
  `[vite] http proxy error` con `AggregateError` / `connect EACCES :443`.
- `node fetch()` o `npm ci` fallan con `EACCES`, mientras PowerShell
  (`Invoke-WebRequest`) y el navegador llegan a los mismos hosts con HTTP 200.

Esto no es un fallo de `contexts.json5`, `.env` ni del plugin `medical-records`.
Indica que **solo `node.exe` esta bloqueado** para conexiones TCP salientes,
tipicamente por una politica reciente de endpoint (Microsoft Purview Endpoint DLP)
cuando Node esta instalado en `C:\Program Files\nodejs\`.

### Diagnostico rapido

```powershell
node -e "require('node:https').get('https://www.google.com', r => console.log(r.statusCode)).on('error', e => console.error(e.code))"
```

- **`200`**: Node puede salir a internet; el problema es otro.
- **`EACCES`**: aplicar una de las soluciones de esta seccion.

### Alternativa A: Node empaquetado de Codex/Cursor (recomendada si ya tienes Codex)

Si Codex o Cursor ya descargaron su runtime, Node 24 suele estar en:

```powershell
$nodeBin = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin'
$env:Path = "$nodeBin;$env:Path"
node -v
npm -v
```

Verificar conectividad:

```powershell
node -e "require('node:https').get('https://www.google.com', r => console.log(r.statusCode)).on('error', e => console.error(e.code))"
```

Si imprime `200`, usar ese Node para todo el proyecto sin depender de
`C:\Program Files\nodejs\` ni del symlink de nvm:

```powershell
cd C:\CIC-MedicalRecords\CustomUI\medicalrecords-pq7lr-source
$env:NX_DAEMON = "false"
$env:NX_ISOLATE_PLUGINS = "false"
npm ci
npm run setenv -- -c workspace-hxp:_customApp
npm run nx:run-target -- workspace-hxp:preserve
& "$nodeBin\node.exe" ".\node_modules\nx\bin\nx.js" serve workspace-hxp --host localhost --port 4200 --open=false
```

Ventaja: evita problemas de symlink/`nvm use` cuando PowerShell no resuelve
`node` en el `PATH` aunque `C:\tempnodejs\node.exe` exista.

### Alternativa B: nvm-noinstall (sin permisos de administrador)

Usar **nvm-windows portable** (`nvm-noinstall.zip`) y mantener el symlink de
Node fuera de `Program Files`.

#### 1. Desinstalar Node de `C:\Program Files\nodejs\`

Cerrar terminales con `npm start` y detener procesos:

```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
```

Desinstalar "Node.js" desde Configuracion → Aplicaciones.

#### 2. Extraer nvm-noinstall

Descargar `nvm-noinstall.zip` desde
[coreybutler/nvm-windows releases](https://github.com/coreybutler/nvm-windows/releases)
y extraer en:

```text
C:\nvm\
```

Debe existir `C:\nvm\nvm.exe`.

#### 3. Crear `C:\nvm\settings.txt`

```text
root: C:\nvm
path: C:\tempnodejs
arch: 64
proxy: none
```

Sin este archivo, `nvm install` falla con `ERROR open \settings.txt`.

#### 4. Variables de entorno de usuario (permanentes)

En Variables de entorno → **Variables de usuario**:

| Variable | Valor |
|----------|-------|
| `NVM_HOME` | `C:\nvm` |
| `NVM_SYMLINK` | `C:\tempnodejs` |

Editar la variable **`Path`** existente (no crear otra) y agregar al inicio:

```text
C:\nvm
C:\tempnodejs
```

`C:\tempnodejs` no debe existir como carpeta fisica antes del primer `nvm use`;
nvm la crea como symlink.

#### 5. Refrescar la sesion y activar Node 24.14.0

Cerrar **Cursor por completo** (no solo la terminal) o ejecutar este bloque al
inicio de cada sesion nueva:

```powershell
$env:NVM_HOME = "C:\nvm"
$env:NVM_SYMLINK = "C:\tempnodejs"
$env:Path = "C:\tempnodejs;C:\nvm;" + $env:Path

nvm version
nvm install 24.14.0
nvm use 24.14.0
$env:Path = "C:\tempnodejs;C:\nvm;" + $env:Path
node -v
npm -v
```

Si `nvm use` dice *Now using node v24.14.0* pero `node -v` sigue sin
reconocerse, el symlink puede estar bien y el `PATH` de la sesion no:

```powershell
C:\tempnodejs\node.exe -v
```

- Si eso imprime `v24.14.0`, repetir solo
  `$env:Path = "C:\tempnodejs;C:\nvm;" + $env:Path` **despues** de `nvm use`, o
  reiniciar Cursor por completo.
- Si sigue fallando, usar la **Alternativa A** (Node de Codex con
  `$env:USERPROFILE`).

Verificar conectividad:

```powershell
node -e "require('node:https').get('https://www.google.com', r => console.log(r.statusCode)).on('error', e => console.error(e.code))"
```

Debe imprimir `200`.

#### 6. Retomar el proyecto

```powershell
cd C:\CIC-MedicalRecords\CustomUI\medicalrecords-pq7lr-source
$env:NX_DAEMON = "false"
$env:NX_ISOLATE_PLUGINS = "false"
npm ci
npm run setenv -- -c workspace-hxp:_customApp
npm run nx:run-target -- workspace-hxp:preserve
npm start workspace-hxp
```

### Errores frecuentes de nvm-noinstall

| Error | Causa | Accion |
|-------|-------|--------|
| `nvm` no se reconoce | Path de usuario no recargado en Cursor | Reiniciar Cursor o ejecutar el bloque `$env:Path = ...` |
| `ERROR open \settings.txt` | Falta `settings.txt` o `NVM_HOME` vacio en la sesion | Crear `C:\nvm\settings.txt` y exportar `$env:NVM_HOME` |
| `nvm use` OK pero `node` no se reconoce | Symlink activo pero `PATH` de sesion desactualizado | `C:\tempnodejs\node.exe -v`; luego `$env:Path = "C:\tempnodejs;C:\nvm;" + $env:Path`; o usar Node de Codex |
| `nvm use` falla por carpeta fisica | `C:\tempnodejs` existe como directorio real | `Remove-Item C:\tempnodejs -Recurse -Force` y repetir `nvm use` |

### Escalamiento IT (si la solucion anterior no aplica)

Solicitar exclusion de DLP/firewall para `node.exe` hacia `*.app.hyland.com`,
`registry.npmjs.org` y `npm.pkg.github.com`. Ver plantilla de ticket en el chat
interno del equipo Automate Front End (Windows + Purview Endpoint DLP).

## Configuracion de Automate

La fuente de verdad es:

```text
CustomUI/medicalrecords-pq7lr-source/config/contexts.json5
```

Debe contener el bloque `_customApp` copiado desde Automate Development
Configuration. El `.env` no se edita como fuente principal; se regenera con:

```powershell
npm run setenv -- -c workspace-hxp:_customApp
```

Valores correctos validados en `.env` y `apps/workspace-hxp/.tmp/app.config.json`:

- `APP_CONFIG_OAUTH2_IMPLICIT_FLOW=false`
- `APP_CONFIG_OAUTH2_CODE_FLOW=true`
- `APP_CONFIG_PLUGIN_CONTENT_SERVICE=true`
- `APP_CONFIG_LANDING_PAGE=""`
- `UI_TYPE="DEFAULT_UI"`
- `APP_CONFIG_APPS_DEPLOYED` contiene `fc-gb-customui-class-xm8b4-58e71b1e`

Valores incorrectos detectados despues de una edicion externa:

- `APP_CONFIG_LANDING_PAGE="/medical-records"`
- `APP_CONFIG_OAUTH2_IMPLICIT_FLOW=true`
- `APP_CONFIG_OAUTH2_CODE_FLOW=false`
- `APP_CONFIG_PLUGIN_CONTENT_SERVICE=false`
- `UI_TYPE="WORKSPACE"`
- `APP_CONFIG_APPS_DEPLOYED=[]`

Estos valores rompen o desalinean el flujo de autenticacion local. La correccion
es restaurar `contexts.json5` desde Automate y regenerar `.env`.

## Hallazgos de errores

### `nx` no disponible

Se encontro un `node_modules` incompleto, con muy pocas carpetas instaladas. Por
eso los comandos Nx fallaban con errores equivalentes a `nx` no reconocido o no
encontrado. La solucion fue reinstalar con `npm ci` usando Node 24/npm 11.9.

### `npm ci` con `EPERM`

`npm ci` fallo inicialmente al reemplazar dependencias nativas como `@esbuild` y
`@lmdb`. La causa probable fueron procesos antiguos de `nx`, `run-executor` y
`esbuild` manteniendo archivos bloqueados en `node_modules`.

Accion correctiva validada:

- Detener procesos Node/Nx/esbuild antiguos.
- Repetir `npm ci` con Node 24/npm 11.9 fuera del sandbox.

### `spawn EPERM`

Nx fallo dentro del sandbox al iniciar workers o procesos hijos. Se valido con
pruebas aisladas que `child_process.spawn` falla en sandbox y funciona fuera de
sandbox.

Conclusion: no diagnosticar este error como falla del plugin `medical-records`.

### `project-graph.json` rename `EPERM`

Nx fallo dentro del sandbox al renombrar archivos temporales de
`.nx/workspace-data`. Se valido con pruebas aisladas que `fs.rename` falla en
sandbox y funciona fuera de sandbox.

Conclusion: no diagnosticar este error como corrupcion del workspace.

### `workspace-hxp:preserve`

El target `preserve` no fue creado por otra IA. Ya existia en la plantilla
original exportada por Automate. Su funcion es generar la configuracion temporal
que consume el servidor local, incluyendo:

```text
apps/workspace-hxp/.tmp/app.config.json
```

El target `serve` depende de `workspace-hxp:preserve`, por eso se ejecuta antes
de levantar `workspace-hxp`.

### Copia limpia desde zip

Se extrajo una copia diagnostica desde:

```text
CustomUI/medicalrecords-pq7lr.zip
```

en:

```text
CustomUI/medicalrecords-pq7lr-clean-test
```

Hallazgo: el zip original traia `config/contexts.json5` como `{}`. Para probar
esa copia hay que restaurar primero el bloque `_customApp` correcto. La copia
limpia es solo diagnostica; la ruta principal sigue siendo
`CustomUI/medicalrecords-pq7lr-source`.

Resultado de prueba limpia:

- Se restauro `_customApp` en `config/contexts.json5`.
- Se ejecuto `npm ci` con Node 24/npm 11.9 fuera del sandbox.
- Se ejecuto `npm run setenv -- -c workspace-hxp:_customApp`.
- Se ejecuto `workspace-hxp:preserve` con `App config validation succeeded.`
- Se levanto `workspace-hxp` en `http://localhost:4200/`.
- El usuario valido en el explorador que la aplicacion funciono.

## Ejecucion local validada

Se logro levantar `workspace-hxp` fuera del sandbox con Node 24, tanto en la
ruta principal como en la copia limpia diagnostica, en `http://localhost:4200/`.

Validaciones realizadas:

- Build Angular completo.
- `App config validation succeeded.`
- `Watch mode enabled.`
- `Invoke-WebRequest http://localhost:4200/` respondio HTTP 200.
- `Invoke-WebRequest http://localhost:4200/app.config.json` respondio HTTP 200
  con `codeFlow=true`, `implicitFlow=false`, `contentService=true` y el
  `clientId` correcto.
- Validacion manual en explorador realizada por el usuario sobre la copia limpia.

## Prueba del proyecto principal con plugin

Fecha de validacion: 2026-04-25.

Despues de bajar la copia limpia, se levanto nuevamente la plantilla principal:

```text
CustomUI/medicalrecords-pq7lr-source
```

con el plugin `medical-records` activo.

Validaciones:

- `PluginsModule` importa `MedicalRecordsModule`.
- `apps/workspace-hxp/project.json` incluye assets de
  `libs/plugins/medical-records/assets`.
- `workspace-hxp` declara `medical-records` en `implicitDependencies`.
- `tsconfig.base.json` y `tsconfig.adf.json` incluyen
  `@plugins/medical-records`.
- `experience-workspace-app-shell.routes.ts` registra la ruta
  `/medical-records`.
- `npm run setenv -- -c workspace-hxp:_customApp` paso correctamente.
- `workspace-hxp:preserve` paso con `App config validation succeeded.`
- `nx serve workspace-hxp --host localhost --port 4200 --open=false` compilo.
- `http://localhost:4200/` respondio HTTP 200.
- `http://localhost:4200/medical-records` respondio HTTP 200.
- `http://localhost:4200/app.config.json` respondio HTTP 200 con
  `codeFlow=true`, `implicitFlow=false` y `contentService=true`.

Warnings observados:

- Warnings de deprecacion Sass en archivos base de la plantilla.
- Warning `invalid "base" option: "."`.

Estos warnings tambien aparecen en la copia limpia o no bloquean el serve, por
lo que no se consideran causa de fallo del plugin en esta etapa.

Procesos Node observados con el proyecto principal levantado:

- `node.exe ... nx.js serve workspace-hxp --host localhost --port 4200 --open=false`
- `node.exe ... node_modules\nx\bin\run-executor.js`
- Dos procesos `stitch-mcp-auto` separados, usados por Stitch MCP; no pertenecen
  al serve de Hyland y no ocupan `localhost:4200`.

Para logs de procesos locales lanzados por IA, usar `artifacts/logs/custom-ui/`
para no ensuciar la raiz del repo, por ejemplo:

```text
C:\CIC-MedicalRecords\artifacts\logs\custom-ui\workspace-hxp.serve.log
C:\CIC-MedicalRecords\artifacts\logs\custom-ui\workspace-hxp.serve.err.log
C:\CIC-MedicalRecords\artifacts\logs\custom-ui\workspace-hxp.plugin.serve.log
C:\CIC-MedicalRecords\artifacts\logs\custom-ui\workspace-hxp.plugin.serve.err.log
```

No usar `.codex/logs` para redireccionar procesos de Windows, porque puede
tener permisos insuficientes.

## Levantar la aplicacion local con Node explicito

Cuando se quiera asegurar Node 24 sin depender del Node global de Windows, el
metodo recomendado para la aplicacion principal `workspace-hxp` es:

```powershell
$work = "C:\CIC-MedicalRecords\CustomUI\medicalrecords-pq7lr-source"
$nodeBin = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin'

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

Este flujo usa el runtime Node 24 validado para la plantilla, ajusta el `PATH`
solo en la sesion actual, evita depender del Node global de Windows y libera el
puerto `4200` antes de levantar `workspace-hxp`.

## Validacion de UI del plugin

Fecha de validacion: 2026-04-25.

Despues de migrar la primera estructura visual del plugin `medical-records`, se
validaron localmente:

- `medical-records:test`.
- `workspace-hxp:build:development`.
- Recompilacion del servidor en watch mode con `Application bundle generation complete`.

La captura inicial mostraba el dashboard muy alejado de Stitch: titulo gigante,
hero innecesario y navegacion con scroll visible porque competia con el menu
lateral de Automate. La correccion aplicada fue:

- Reestructurar `Overview` hacia el dashboard compacto de Stitch.
- Crear vistas especificas para `Intake` y `Analysis` en vez de usar una pagina
  generica para todas las fases.
- Configurar `/medical-records` para iniciar con el sidenav de Automate
  minimizado mediante `HxpAppShellService.minimizeSidenavConditions`.
- Agregar `medical-records-focus-mode` para ocultar completamente el sidenav y
  header del shell cuando se quiera revisar la interfaz a pantalla completa.

Si el navegador sigue mostrando la version anterior, hacer hard refresh en:

```text
http://localhost:4200/#/medical-records
```

El log esperado debe incluir:

```text
Application bundle generation complete.
Stylesheet update sent to client(s).
```

## Pantalla en blanco al abrir localhost

Fecha de validacion: 2026-04-27.

Se reporto que la pagina quedaba en blanco al ejecutar. La primera causa
detectada fue que no habia ningun proceso escuchando en `localhost:4200`,
aunque existian logs antiguos con compilaciones exitosas. Los procesos Node
activos pertenecian a `stitch-mcp-auto`, no a `workspace-hxp`.

Validacion:

- `Invoke-WebRequest http://localhost:4200/` fallaba con "No es posible
  conectar con el servidor remoto".
- `Get-NetTCPConnection -LocalPort 4200 -State Listen` no encontro listeners.
- Los procesos Node activos usaban `C:\Program Files\nodejs\node.exe` para
  `stitch-mcp-auto`.

Accion correctiva:

- Levantar `workspace-hxp` nuevamente con Node 24 desde
  `Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'`.
- Esperar hasta ver `Application bundle generation complete` y
  `Local: http://localhost:4200/`.

Resultado:

- `http://localhost:4200/` respondio HTTP 200.
- `http://localhost:4200/app.config.json` respondio HTTP 200 con `codeFlow` y
  el `clientId` correcto.
- Playwright local valido `http://localhost:4200/#/medical-records`: el DOM
  contiene `medical-records-shell`, `.medical-records-experience` y texto
  visible del dashboard.

Errores observados en consola que no impiden renderizar la UI:

- `401 Unauthorized` y `403 Forbidden` contra servicios de tareas/procesos.
- `Socket closed with event 4401 Unauthorized`.

Estos errores corresponden a permisos/auth de servicios backend del shell de
Automate. No fueron la causa de la pantalla en blanco del plugin.
