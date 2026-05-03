# Custom UI Medical Records Design

Nota de estado 2026-05-03:

Este documento queda como referencia visual historica de la migracion Stitch.
La especificacion general vigente de la demo vive en
`docs/medical-records-demo-process-specification.md`.

Decision actual: el plugin `medical-records` no debe ejecutar las etapas del
workflow como paginas internas. El plugin debe funcionar como overview y entrada
a tareas activas. Las etapas operativas viven en formularios de Automate con
custom widgets, por ejemplo `intake-account-widget` y `analysis-task-widget`.

## Objetivo

Construir la primera version editable de la Custom UI de Cuentas Medicas dentro de la plantilla fuente exportada desde Hyland Automate, usando las pantallas de referencia de `UI design/` como guia visual y conservando la integracion nativa con Automate.

## Contexto Validado

La carpeta principal de trabajo es `C:\CIC-MedicalRecords`.

La rama de trabajo para esta iteracion es `codex/integration`; `main` se
mantiene como base estable.

La nueva plantilla fuente esta en:

`CustomUI/medicalrecords-pq7lr-source/`

La plantilla contiene los archivos fuente completos que faltaban en el `starting-point` anterior:

- `package.json`
- `package-lock.json`
- `nx.json`
- `tsconfig.base.json`
- `apps/workspace-hxp/project.json`
- `libs/plugins/index.ts`

El mapping de Automate se aplico en:

`CustomUI/medicalrecords-pq7lr-source/config/contexts.json5`

El archivo `.env` local se genero para `workspace-hxp:_customApp` en:

`CustomUI/medicalrecords-pq7lr-source/apps/workspace-hxp/.env`

La validacion base paso:

- `workspace-hxp:preserve` genero y valido `apps/workspace-hxp/.tmp/app.config.json`.
- `workspace-hxp:build:development` compilo correctamente.

## Decision Principal

Se usara la plantilla exportada desde Automate como base principal.

La alternativa de crear una app desde cero queda registrada como opcion futura. No se toma para esta iteracion porque todavia no esta suficientemente validada y podria romper o duplicar responsabilidades que la plantilla ya resuelve: autenticacion, extension shell, rutas de proceso, assets, build y empaquetado para Automate.

## Enfoque Elegido

Crear un plugin Angular limpio dentro de la plantilla:

`libs/plugins/medical-records`

El autor para el generador sera `Fernando Contreras`.

Comando previsto:

`npm run nx:generate -- @hyland/extend:plugin medical-records --author "Fernando Contreras" --addTranslations true`

El plugin se registrara en `libs/plugins/index.ts` y se integrara al shell mediante los generadores de `@hyland/extend` o mediante una estructura equivalente compatible con ellos.

No se reemplazaran ni eliminaran las rutas nativas de Automate. Las nuevas pantallas funcionaran como una experiencia personalizada encima del shell existente.

## Pantallas a Migrar

### Armado de Cuentas

Origen visual: `UI design/armado-de-cuentas/`

Pantallas de referencia visual, no necesariamente paginas funcionales del
plugin:

- Dashboard de proceso
- Expediente unificado / intake
- Analisis y prevalidacion IA
- Armado y aprobacion de cuenta
- Gestion de apelaciones
- Conciliacion y cierre de pagos

### Gestion de Convenios

Origen visual: `UI design/gestion-de-convenios/`

Pantallas:

- Configuracion general
- Reglas IA
- Documentos requeridos
- Reglas de armado
- Tarifas

La pagina duplicada `UI design/dashboard-premium-unificado-v6-refinado.html` se tratara como referencia equivalente al dashboard `01` de armado de cuentas, no como una pantalla adicional.

## Arquitectura Propuesta

El plugin `medical-records` tendra una ruta principal:

`/medical-records`

Decision actualizada: dentro de esa experiencia no se debe usar navegacion
interna por etapas como superficie principal del workflow. La ruta principal
debe registrarse en el sistema de extensiones para aparecer en la navegacion
lateral de Hyland Workspace y mostrar un overview con acceso a tareas activas.

Las secciones funcionales de Intake, Analysis y futuras etapas deben vivir en
formularios/widgets de Automate para mantener el control del workflow dentro de
Studio Modeler.

Componentes originalmente previstos como referencia visual:

- `medical-records-shell`: layout/overview interno de la experiencia personalizada.
- `dashboard-page`: vista general del ciclo de cuentas medicas.
- `intake-expediente-page`: referencia visual migrada al widget de intake.
- `analysis-prevalidation-page`: referencia visual migrada al widget de analisis.
- `account-assembly-page`: referencia futura para un widget/tarea de aprobacion.
- `appeals-management-page`: referencia futura para widgets/tareas de ejecucion.
- `payment-closing-page`: referencia futura para widgets/tareas de cierre.
- `agreement-config-page`: referencia futura para gestion de convenios.

Componentes compartidos:

- `workflow-stepper`: legado visual; no debe ser la navegacion principal del plugin.
- `metric-card`: indicadores financieros, riesgo, completitud y recupero.
- `status-badge`: estados operativos.
- `action-toolbar`: acciones principales por pantalla.
- `data-panel`: paneles densos para listas, documentos y reglas.

## Integracion con Automate

Se conservaran las rutas y acciones existentes del plugin `process-services-cloud`:

- `/start-process-cloud`
- `/task-list-cloud`
- `/process-list-cloud`
- `/process-details-cloud`
- `/tasks`
- `/processes`

Las acciones de la UI personalizada deben navegar hacia esas rutas cuando el flujo necesite ejecutar capacidades reales de Automate. Para esta demo, la accion principal del plugin debe ser abrir tareas activas o iniciar el proceso, no simular etapas dentro del plugin.

Ejemplos:

- `New Intake` puede navegar a `/start-process-cloud`.
- `Open Tasks` puede navegar a `/task-list-cloud`.
- `Process Tracking` puede navegar a `/process-list-cloud`.
- Las etapas reales como `Nueva Cuenta` y `Analysis` se abren desde tareas de
  Automate y se renderizan mediante widgets de formulario.

La configuracion `_customApp` en `contexts.json5` sigue siendo la fuente de verdad para:

- `deployedApps`
- `studioClientId`
- `contentHost`
- `processHost`
- `idpURL`
- OAuth scopes

## Datos y Estado

La primera iteracion usara datos mock locales y estructurados dentro del plugin para representar cuentas, pacientes, glosas, convenios, documentos, hallazgos IA y pagos.

Los datos mock deben vivir en archivos TypeScript separados para evitar mezclar contenido de demo con templates HTML.

Cuando haya endpoints o payloads definitivos de Automate, esos mocks podran sustituirse por servicios Angular sin redisenar los componentes visuales.

## Estilo Visual

Las pantallas de Stitch no se copiaran como HTML crudo con CDN de Tailwind o Google Fonts.

Se reinterpretaran en Angular con:

- SCSS local del plugin.
- Fuentes y estilos compatibles con la app Hyland existente.
- Iconografia basada en Material Icons ya disponible en la plantilla.
- Layout responsivo dentro del shell de Workspace.

El objetivo es conservar la intencion visual de Stitch sin introducir dependencias externas que compliquen el build, el zip final o la ejecucion en Automate.

## Errores y Estados Vacios

Cada pantalla debe contemplar:

- Estado cargado con datos de demo.
- Estado vacio para listas principales.
- Acciones deshabilitadas cuando no aplique avanzar de etapa.
- Enlaces a Automate con fallback visual si la ruta no esta disponible por falta de sesion o ambiente.

## Pruebas y Validacion

Validaciones minimas:

- Compilar `workspace-hxp:build:development`.
- Ejecutar `workspace-hxp:preserve` para confirmar `app.config.json`.
- Levantar `workspace-hxp` localmente cuando sea necesario.
- Revisar visualmente las rutas principales.
- Confirmar que las rutas nativas de Automate siguen registradas.

Antes de empaquetar para Automate:

- Ejecutar una instalacion limpia con `npm ci` si se requiere reproducibilidad total.
- Ejecutar `npm run nx:run-target -- workspace-hxp:pack-build`.
- Validar que `dist/workspace-hxp.zip` se genere y no exceda el limite operativo de subida.
- Subir el zip siguiendo `UI Change Instructions/GLS-Packaging a Custom UI-250426-135225.pdf`.

## Riesgos

- La plantilla exige Node `24.14.0` y npm `11.9.x`; la maquina tiene Node global `20.9.0`. Para comandos de build se debe usar Node 24 disponible en el runtime de Codex o instalar la version localmente.
- El HTML de Stitch contiene dependencias CDN; copiarlas directamente podria fallar en Automate o aumentar fragilidad.
- El zip final puede crecer si se agregan assets innecesarios.
- La navegacion real hacia procesos depende de que la configuracion de Automate siga vigente y que la sesion local pueda autenticarse.
- La documentacion de app en blanco existe y puede dar mas control, pero todavia
  no es el camino principal porque la plantilla ya preserva shell, auth,
  configuracion y packaging.

## Fuera de Alcance

- Crear una app desde cero sin plantilla.
- Integrar endpoints reales no documentados.
- Reemplazar los modulos nativos de tareas, procesos, contenido o IDP.
- Redisenar el modelo de Automate.
- Subir automaticamente el zip a Automate.

## Criterios de Exito

- La nueva experiencia `medical-records` existe dentro de la plantilla exportada.
- Las pantallas principales de `UI design/` estan representadas como componentes Angular mantenibles.
- La app compila.
- El mapping de Automate se conserva.
- Las rutas nativas de Automate siguen disponibles.
- La base queda lista para empaquetar y subir como Custom UI.
