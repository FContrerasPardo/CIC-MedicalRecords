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
- Widget real de analisis:
  `CustomUI/medicalrecords-pq7lr-source/libs/plugins/medical-records/src/lib/form-widgets/analysis-task-widget/`.
- Configuracion Agent Builder:
  `docs/Agent Builder Config/`.
- Especificacion general de la demo end-to-end:
  `docs/medical-records-demo-process-specification.md`.
- Mockups: `UI design/armado-de-cuentas/` y `UI design/gestion-de-convenios/`.
- Especificacion UI:
  `docs/superpowers/specs/2026-04-25-custom-ui-medical-records-design.md`.

## Estado tecnico validado

- Branch de trabajo recomendado: `codex/integration`.
- `main` queda como base estable.
- La plantilla exige Node `>=24.14.0 <25.0.0` y npm `>=11.9.0 <12.0.0`.
- Regla obligatoria para IA: no ejecutar `npm ci`, `setenv`, `nx`, `serve`,
  `build`, `pack-build` ni generadores Hyland dentro del sandbox. En esta
  plantilla el sandbox bloquea `child_process.spawn` y `fs.rename`, generando
  falsos `EPERM`. Estos comandos deben correr en el entorno local de Windows,
  sobre `http://localhost:4200/`, con permisos fuera de sandbox.
- Metodo recomendado para `workspace-hxp`: usar el `node.exe` del runtime
  `C:\Users\ferch\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin`,
  anteponer ese directorio al `PATH`, desactivar `NX_DAEMON` y
  `NX_ISOLATE_PLUGINS`, y ejecutar `.\node_modules\nx\bin\nx.js serve` sin
  depender del Node global de Windows.
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
- El scaffold actual de `medical-records` fue creado manualmente siguiendo el
  patron del generador Hyland, no ejecutando directamente
  `@hyland/extend:plugin`.
- Las pantallas de fases en `medical-records-shell` fueron una direccion visual
  inicial para igualar Stitch, no generadas con `@hyland/extend:page`.
- Decision vigente: las etapas reales del workflow viven en formularios/widgets
  de Automate, no en paginas internas del plugin.
- El plugin `medical-records` debe evolucionar a un overview sin navegacion por
  etapas y redirigir/abrir tareas activas para continuar el flujo puntual.
- La equivalencia de `--addTranslations true` se mantiene mediante
  `provideTranslations('medical-records', 'assets/medical-records')` y archivos
  `libs/plugins/medical-records/assets/i18n/*.json`.
- El 2026-04-27 se validaron los generadores oficiales con `--dry-run`.
  Resultado: `@hyland/extend:page` crea una pagina minima, menu item,
  page module y config de extension; no agrega funcionalidad avanzada de
  procesos/repositorio/auth. Para este proyecto conviene mantener el plugin
  actual y absorber solo patrones utiles del generador. Detalle:
  `docs/custom-ui/hyland-generator-reference.md`.
- No reemplazar rutas nativas de Automate salvo decision explicita.
- No copiar HTML crudo de Stitch; reinterpretar las pantallas en Angular/SCSS.
- La guia de app en blanco queda como referencia futura, no como camino actual.
- El widget `analysis-task-widget` ya no usa `case_payload` como contrato
  principal. La entrada recomendada es el string JSON
  `unifiedWidgetPayloadText`, generado por
  `docs/Agent Builder Config/BuildIncrementalUnifiedWidgetPayload.ts`.
- `BuildIncrementalUnifiedWidgetPayload.ts` debe permanecer generico. Produce
  un envelope con `agents`, `agentOrder`, `warnings`, `summary` y no una salida
  especifica como `analysisWidgetPayload`.
- El widget se adapta al envelope generico y resuelve Coding Integrity,
  Compliance Alert y Financial Variance por key, `agentKey`, `slotName`,
  `agentName` o nombre dentro de `result`. El fallback actual es
  `json1`, `json2`, `json3`.
- La narrativa general de la demo y el paso a paso por etapas deben mantenerse
  en `docs/medical-records-demo-process-specification.md`. Los documentos de
  widgets y agentes son anexos tecnicos para cambios internos.
- No asumir que `/medical-records/:phase` es la fuente de verdad del workflow.
  Esa navegacion puede existir como legado visual, pero no debe guiar nuevas
  implementaciones funcionales.

## Documentacion revisada

- `UI Change Instructions/reference-docs/hyland/GLS-Creating an Hyland Experience Application (Custom UI)-250426-013037.pdf`:
  flujo base, contexts y `.env`.
- `UI Change Instructions/reference-docs/hyland/GLS-Creating a Plugin Page-250426-135339.pdf`: paginas de plugin.
- `UI Change Instructions/reference-docs/hyland/GLS-Creating Custom Forms Widget-250426-135447.pdf`: widgets de formulario
  si Studio Modeler lo requiere.
- `UI Change Instructions/reference-docs/hyland/GLS-Packaging a Custom UI-250426-135225.pdf`: empaquetado/subida.
- `UI Change Instructions/reference-docs/hyland/GLS-Update a Custom UI-250426-135603.pdf`: actualizacion con branch/backup.
- `UI Change Instructions/reference-docs/hyland/GLS-Create a Blank UI for Automate from Scratch-250426-135843.pdf`: opcion
  desde cero para evaluar mas adelante.

## Como debe actuar una IA en este repo

- Trabajar siempre en `C:\CIC-MedicalRecords`, no en la copia vieja de OneDrive.
- Priorizar modo ahorro de tokens: respuestas breves, no repetir contexto ya
  documentado, leer solo los archivos necesarios y evitar busquedas amplias si
  el alcance ya esta claro.
- No ejecutar builds, tests, servidores ni validaciones visuales salvo que el
  usuario lo pida o exista riesgo tecnico alto. Si se ejecutan, resumir solo el
  resultado importante.
- Antes de cambios de UI, revisar `UI Change Instructions/` y la especificacion
  en `docs/superpowers/specs/`.
- Antes de cambios de negocio, revisar `CONTEXT.md`.
- Mantener cambios incrementales y trazables: documentacion, configuracion,
  despues codigo UI.
- Proteger la integracion de Automate: `contexts.json5`, `.env` generado,
  rutas nativas, auth y packaging.
- Si se agregan dependencias o assets, validar impacto en build y zip final.
- Si aparece `spawn EPERM`, rename `EPERM` bajo `.nx/workspace-data`, o falla
  Nx worker en sandbox, no diagnosticarlo como falla del plugin: revisar
  `docs/custom-ui/local-development-findings.md` y repetir local/no sandbox.

## Checklist rapido

1. El cambio respeta el alcance funcional de `CONTEXT.md`.
2. El comando se ejecuto local/no sandbox en `CustomUI/medicalrecords-pq7lr-source/`.
3. Se uso Node 24/npm 11.9 para build o generadores.
4. Se preservo `config/contexts.json5`.
5. Se valido `workspace-hxp:preserve`.
6. Se valido `workspace-hxp:build:development`.
7. Si se prueba login, se usa `http://localhost:4200/`.
8. Si el cambio afecta despliegue, se valida `workspace-hxp:pack-build`.

## Hallazgos de desarrollo local

El detalle de errores y conclusiones esta documentado en:

```text
docs/custom-ui/local-development-findings.md
```

Resumen para futuras IAs:

- Global Node/npm puede no servir; esta plantilla requiere Node 24/npm 11.9.
- `node_modules` incompleto provoca fallas de `nx` faltante.
- Procesos antiguos `nx`, `run-executor` o `esbuild` pueden bloquear
  dependencias nativas durante `npm ci`.
- El `.env` incorrecto puede romper autenticacion; regenerarlo desde
  `config/contexts.json5`.
- `workspace-hxp:preserve` viene de la plantilla original y genera
  `apps/workspace-hxp/.tmp/app.config.json`.
- La copia limpia `medicalrecords-pq7lr-clean-test` es solo diagnostica; el zip
  original venia con `contexts.json5` vacio. Luego de restaurar `_customApp`,
  regenerar `.env` y levantar en `localhost:4200`, el usuario valido que la
  copia limpia funciona en el explorador.
- Luego se bajo la copia limpia y se levanto la ruta principal
  `medicalrecords-pq7lr-source` con el plugin `medical-records` activo. El build
  compilo, `/`, `/medical-records` y `/app.config.json` respondieron HTTP 200.
- Procesos Node esperados con el proyecto principal levantado: un `nx.js serve`
  y un `nx\bin\run-executor.js` bajo `medicalrecords-pq7lr-source`. Procesos
  `stitch-mcp-auto` son separados y pertenecen al flujo de Stitch MCP.
- El problema de scroll confirmado el 2026-04-27 era vertical dentro del panel
  principal de `medical-records`, no horizontal. La solucion validada por el
  usuario fue mantener el scroll en el plugin: `:host` con alto calculado contra
  el chrome de Workspace y `.medical-records-experience` con `height: 100%` y
  `overflow-y: auto`. No restaurar `min-height: 100vh` en ese route host.
- El cambio de idioma del shell Hyland no actualiza texto hardcodeado dentro del
  plugin. Para que el plugin reaccione al selector de idioma, los textos deben
  estar en `assets/i18n/*.json` y el HTML debe usar `| translate`. Ya quedaron
  traducibles el item de menu, top links, acciones principales, fases, titulos
  de paginas, descripciones superiores, secciones/cards/metrica principales del
  overview.
- Artefactos generados o diagnosticos no deben quedar en la raiz. Usar
  `artifacts/logs/custom-ui/` para logs locales de `workspace-hxp` y
  `artifacts/screenshots/custom-ui/` para capturas temporales de validacion.
