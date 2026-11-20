# Convenios en Appdata

Cada convenio guarda sus reglas en su propia carpeta de Appdata, con un archivo por documento de reglas. Así cada agente o pantalla lee solo el archivo que necesita. La página **Convenios** del plugin los muestra y los edita.

Todos los datos son sintéticos. Los convenios de ejemplo, prestadores, contratos y montos son inventados. No copies a estos archivos cédulas, números de afiliado ni datos de pacientes.

## Rutas

```
/MedRec/Appdata/Agreements/agreements-index.json
/MedRec/Appdata/Agreements/<agreementId>/agreement.json
/MedRec/Appdata/Agreements/<agreementId>/documentation-checklist.json
/MedRec/Appdata/Agreements/<agreementId>/preanalysis-policy.json
/MedRec/Appdata/Agreements/<agreementId>/tariff-agreement.json
/MedRec/Appdata/Agreements/<agreementId>/payer-compliance-policy.json
/MedRec/Appdata/Agreements/<agreementId>/payer-coding-policy.json
/MedRec/Appdata/Agreements/<agreementId>/coding-rules.json
/MedRec/Appdata/Agreements/<agreementId>/ai-settings.json
```

- **Índice:** `{ kind, schemaVersion, updatedAt, agreements: [{ agreementId, providerName, payer, status, updatedAt }] }`. También se acepta una lista sin envoltorio.
- **`agreementId`:** nombre de la carpeta, en minúsculas, con dígitos y guiones.
- **Plantillas:** las dos semillas están en `docs/automate/agreements/<agreementId>/` y en el plugin, en `pages/agreements/store/templates/`, con el mismo contenido.
  - `centro-medico-latam`: Centro Medico LATAM.
  - `hospital-general-hyland-latam`: Hospital General HYLAND LATAM.

  Las dos tienen como pagador a **Hyland ARS** (constante `DEMO_PAYER_NAME` en `pages/agreements/store/demo-payer.ts`; una prueba comprueba que todas las plantillas, en todos los idiomas, la usan). La clase de IDP del formulario del pagador es «Formulario de Reclamación». Los ids de contrato, reglas y políticas usan el prefijo `HARS` (`CONV-DEMO-HARS-CML-2026`, `HARS-CML-PREANALYSIS-POLICY`…).
- **Contactos clave:** `agreement.json` → `contacts: [{ id, name, role, email, phone }]`. Las plantillas traen los contactos de demo pedidos por el usuario (Fernando Contreras, Mauricio Valdez y Larissa Trentin, con correo `@hyland.com`; roles: coordinación del convenio, auditoría médica y facturación). Los roles se traducen; nombres y correos no. Al guardar `agreement.json` en un idioma, los contactos, los archivos del contrato y el enlace de KD se copian también a las otras versiones por idioma que existan (`syncAgreementLanguageVersion`).
- **Knowledge Discovery:** el enlace de la pestaña Documentos se guarda por lugar en `/MedRec/Appdata/KnowledgeDiscovery/agreements.<agreementId>.documents.json` (ver [Knowledge Discovery por lugar](#knowledge-discovery-por-lugar)). El campo anterior `agreement.json` → `knowledgeDiscovery: { url, label }` solo se lee como respaldo mientras ese lugar no tenga archivo; la página ya no lo escribe. En las plantillas queda vacío.
- **Contrato y anexos:** `agreement.json` → `documents.contractFiles: [{ documentId, name, type, validFrom, validTo, mimeType, addedAt }]`. Los archivos se suben a `/MedRec/Appdata/Agreements/<agreementId>/Contract/` desde la pestaña Documentos.
- **Regenerar los espejos:** `node docs/automate/agreements/generate.cjs` copia las bases del plugin y escribe las versiones `es`, `en` y `pt`.
- **Diferencias entre las semillas:**

  | Regla | Centro Medico LATAM | Hospital General HYLAND LATAM |
  |---|---|---|
  | Tarifas | Base, ±10 % | Un 18 % más altas, ±5 %, con UCI |
  | Umbral de autorización | RD$ 100,000 | RD$ 50,000; cirugía y hospitalización siempre la exigen |
  | Riesgo de `SIF-003` | MEDIUM | HIGH |
  | `SIF-015` | — | Nota de Enfermería si la hospitalización dura 2 noches o más |
  | `COMP-004` y `CR-004` | — | Solo en este convenio |
- **Archivos globales anteriores:** `/MedRec/Appdata/Checklists/documentation-checklist.json` y `/MedRec/Appdata/Policies/preanalysis-policy.json`. Quedan solo como respaldo de lectura en la radicación, cuando el convenio aún no tiene su archivo. La página ya no los escribe.

## Migración de valores de la demo anterior

Los archivos creados con la plantilla anterior guardan el pagador «ARS Primera», la clase «Formulario de Reclamación (ARS Primera)» y los ids con `ARSP`. Al leerlos (índice, archivo base y versiones por idioma), `migrateDemoValues` (`pages/agreements/store/agreement-demo-migration.util.ts`) los sustituye en memoria con el mismo mapeo de las plantillas:

| Valor anterior | Valor actual |
|---|---|
| «ARS Primera» (cualquier mayúscula, también dentro de nombres y títulos) | `DEMO_PAYER_NAME` («Hyland ARS») |
| «Formulario de Reclamación (ARS Primera)» | «Formulario de Reclamación» |
| Token `ARSP` de ids (`CONV-DEMO-ARSP-CML-2026`, `DOC-ARSP-HGHL-2026`, `ARSP-CML-PREANALYSIS-POLICY`…) | `HARS` (`CONV-DEMO-HARS-CML-2026`…) |

- Solo cambian valores de texto; claves, números y estructura se conservan. `ARSP` se sustituye solo como token completo (entre guiones o en los extremos).
- La página muestra los valores actualizados y un aviso con la acción «Actualizar archivos del convenio». Nada se guarda sin esa acción.
- La acción reescribe los archivos del convenio que aún tienen valores anteriores (base y `es`/`en`/`pt`) y el índice: la entrada del convenio se rehace desde su `agreement.json` y las demás entradas quedan migradas.
- Los consumidores (radicación) reciben los valores migrados en memoria; los agentes de Automate leen la base, así que siguen viendo los valores anteriores hasta ejecutar la acción.
- La barra lateral muestra el pagador del `agreement.json` de cada convenio (versión del idioma o base); el índice solo es respaldo. Al guardar `agreement.json`, la entrada del índice se actualiza con `providerName`, `payer`, `status` y `updatedAt`.

## Knowledge Discovery por lugar

Cada lugar de la app puede abrir un agente de Knowledge Discovery distinto. El componente `KnowledgeDiscoveryLauncherComponent` (`components/knowledge-discovery/`, selector `medical-records-knowledge-discovery-launcher`) recibe `placeId`; ejemplos: `agreements.<agreementId>.documents`, `case.audit`, `radication.review`.

```
/MedRec/Appdata/KnowledgeDiscovery/<placeId>.json   { kind, placeId, url, label, description?, updatedAt }
```

- **Primera vez:** sin archivo (ni respaldo) el botón dice «Configurar Knowledge Discovery» y abre el diálogo de configuración (patrón del diálogo de CIC-Fin: URL del agente, texto del botón y descripción opcional).
- **Después:** el botón «Abrir» (con el texto guardado) lleva a la URL en una pestaña nueva; un engranaje discreto abre de nuevo el diálogo.
- **Validación:** solo `https` con host y sin credenciales (misma regla que `knowledgeDiscoveryUrl` del asistente de auditoría). Guardar con la URL vacía borra el enlace: el archivo queda con `url: ""` para que el respaldo no reaparezca.
- **Respaldo:** el llamador puede pasar `fallback`; en Convenios es `agreement.json` → `knowledgeDiscovery`. Al guardar desde el diálogo se escribe en el archivo del lugar.
- **Carpeta:** `KnowledgeDiscovery` se crea bajo `/MedRec/Appdata` al primer guardado (`KnowledgeDiscoveryPlaceService`, DocumentService y UploadApi).
- **Asistente de auditoría:** `KnowledgeDiscoveryConfigService` sigue leyendo `/MedRec/Appdata/config.json` (contrato de CIC-Fin, solo lectura) y no cambia. Cuando el lanzador se use en la auditoría, ese archivo puede pasarse como respaldo del lugar `case.audit`.
- **Usos actuales:** pestaña Documentos de Convenios (botón «Pregunta al contrato» / «Configurar Knowledge Discovery» de la cabecera). En esa pestaña no hay botón flotante: tapaba el botón «Ver» de la última fila y repetía el lanzador de la cabecera. La interfaz no nombra Appdata.

## Versiones por idioma

Convención para todo archivo de Appdata con textos (convenios hoy; cualquier archivo nuevo debe seguirla):

```
/MedRec/Appdata/Agreements/<agreementId>/documentation-checklist.json      base: la leen los agentes de Automate
/MedRec/Appdata/Agreements/<agreementId>/documentation-checklist.es.json   versión en español (UI)
/MedRec/Appdata/Agreements/<agreementId>/documentation-checklist.en.json   versión en inglés (UI)
/MedRec/Appdata/Agreements/<agreementId>/documentation-checklist.pt.json   versión en portugués (UI)
```

- **Mismo contenido, otro texto.** Ids, códigos, clases de IDP, importes, umbrales, perfiles y estructura son idénticos en todas las versiones. Solo cambian las claves de texto libre (`description`, `condition`, `title`, `label`, `name`, `role`, `planName`, `contractType`, `jurisdiction`, instrucciones de la política…; lista en `LOCALIZABLE_TEXT_KEYS`, `agreement-locale.util.ts`). Los nombres de los contactos no se traducen.
- **Idioma de la UI → idioma del contenido.** `TranslateService.currentLang`: `es`, `en` y `pt` (también `es-DO`, `pt-BR`…); cualquier otro idioma usa `en`.
- **Al cargar** (página Convenios): la versión del idioma; si no existe o no se puede leer, la base con el aviso «Aún no hay versión en ES» y el botón «Crear la versión en ES» (traduce los textos de la base con el diccionario de plantillas; lo que no esté en el diccionario queda como en la base); si tampoco hay base, la plantilla en ese idioma.
- **Al guardar:** se escriben la versión del idioma actual y la base. Así los agentes siempre leen las últimas reglas guardadas, en el idioma en que se guardaron. Si la base se guardó después desde otro idioma (versión distinta), la versión del idioma muestra el aviso «El archivo base se guardó después en otro idioma» para revisarla antes de guardar.
- **Consumidores** (radicación, scripts de Automate, agentes): leen solo la base. No cambia nada para ellos.
- **«Crear desde plantilla · ES»** crea la base que falte y la versión del idioma actual; **«Crear es · en · pt»** crea las tres versiones de cada archivo del convenio.
- **Plantillas:** las bases están en `pages/agreements/store/templates/<agreementId>/` y los textos por idioma en `templates/template-translations.json` (clave: texto de la base; valor: `es`, `pt` y `en` cuando la base no está en inglés). Una prueba exige que cada texto de cada plantilla tenga versión `es` y `pt` y que las tres versiones tengan la misma estructura.

## Asistente de reglas

El panel flotante «Asistente IA» de la página Convenios convierte una regla escrita en lenguaje natural, o un archivo de reglas (JSON, CSV o TXT), en filas de estos archivos. Propone el archivo, la pestaña y la sección; «Crear borrador» abre la pestaña, añade la fila al editor y la resalta. Nada se guarda hasta que el usuario guarda el archivo.

- Motor por defecto: reglas por palabras clave, deterministas (`assistant/rule-assistant.util.ts`), con un breve tiempo de proceso. En la demo se presenta como funcionalidad completa: el agente aún no se conectó por tiempo, no por limitación. En la pestaña Documentos el panel se oculta (sigue montado y conserva la conversación): la cabecera ya tiene el lanzador de Knowledge Discovery. En las demás pestañas el contenido reserva 88 px abajo para que su botón flotante no tape las acciones de la última fila.
- Punto de extensión: `RULE_ASSISTANT_ENGINE` (`assistant/rule-assistant.model.ts`). Para usar un agente real, se provee otra implementación de `RuleAssistantEngine` que llame al agente y devuelva la misma estructura.
- Definición propuesta del agente: [`agents/reglas-convenio.agent.json`](agents/reglas-convenio.agent.json). Entradas `ruleText`, `ruleFile`, `ruleFileName`, `agreementContext` y `language`; salida `{ proposals: [{ kind, row, explanation }], unrecognized: [] }` con el esquema de cada archivo de convenio. No está desplegado.

## Qué archivo lee cada consumidor

| Archivo | Consumidor | Variable que reemplaza |
|---|---|---|
| `agreement.json` | UI: datos generales, alias del prestador, índice | — |
| `documentation-checklist.json` | Validación de la radicación y respaldo determinista del preanálisis | `documentationRules` |
| `preanalysis-policy.json` | Agente de preanálisis documental («Get Rules») | entrada `documentationChecklist` del agente |
| `tariff-agreement.json` | Financial Variance | `tariffAgreement` |
| `payer-compliance-policy.json` | Compliance Alert | `payerCompliancePolicy` |
| `payer-coding-policy.json` | Coding Integrity | `payerCodingPolicy` |
| `coding-rules.json` | Coding Integrity | `codingRules` |
| `ai-settings.json` | UI: pestaña «Reglas de agentes» → «Reglas IA». **Ningún agente lo lee todavía** (ver [Reglas IA](#reglas-ia-ai-settingsjson)) | — |

`preAuthorization` depende del paciente o de la cuenta, no del convenio. Por eso queda fuera de esta carpeta y sigue como variable de proceso.

## Reglas IA (`ai-settings.json`)

Sub-pestaña «Reglas IA» de «Reglas de agentes». Va ahí, y no en una pestaña propia, porque configura cómo deciden los mismos agentes de las otras sub-pestañas. Además, así la barra de pestañas sigue teniendo cinco.

```json
{
  "kind": "medical-records.agreement-ai-settings",
  "schemaVersion": 1,
  "agreementId": "centro-medico-latam",
  "version": "2026-11-18-r1",
  "updatedAt": "2026-11-18T00:00:00.000Z",
  "validations": [
    { "id": "coding-icd10-procedure", "enabled": true, "agent": "Coding Integrity", "title": "…", "description": "…" },
    { "id": "authorization-check", "enabled": true, "agent": "Compliance Alert", "title": "…", "description": "…" },
    { "id": "documentary-support", "enabled": true, "agent": "Pre-analysis", "title": "…", "description": "…" },
    { "id": "tariff-variance", "enabled": true, "agent": "Financial Variance", "title": "…", "description": "…" }
  ],
  "thresholds": { "autoApprovalMinConfidencePct": 90, "anomalySensitivity": "MEDIUM", "tariffVariancePct": 10 },
  "history": [
    { "at": "2026-11-18T00:00:00.000Z", "event": "TEMPLATE_CREATED", "user": null, "file": "ai-settings.json", "field": null, "from": null, "to": null }
  ]
}
```

- **Validaciones:** `id`, `enabled` y `agent` son iguales en todos los idiomas. Solo `title` y `description` cambian en `ai-settings.<lang>.json` (diccionario `template-translations.json`).
- **Umbrales:**

  | Campo | Rango | Significado |
  |---|---|---|
  | `autoApprovalMinConfidencePct` | 50–100 | Confianza mínima para aprobación automática. Las cuentas por encima pasan sin revisión manual si ninguna regla dura falla |
  | `anomalySensitivity` | `LOW`, `MEDIUM` o `HIGH` | Sensibilidad de detección de anomalías |
  | `tariffVariancePct` | 0–30, pasos de 0,5 | Tolerancia de variación tarifaria |

  Fuera de rango no se guarda (`validateAiSettings`). Los controles deslizantes ya limitan el valor.
- **Plantillas:**

  | Convenio | Confianza | Sensibilidad | Tolerancia |
  |---|---|---|---|
  | Centro Medico LATAM | 90 | `MEDIUM` | 10 |
  | Hospital General HYLAND LATAM | 92 | `HIGH` | 5 |
- **Tolerancia y acuerdo tarifario:** `tariffVariancePct` refleja `tariff-agreement.json` → `defaultAllowedVariancePercentage`. En las plantillas valen lo mismo, y una prueba lo comprueba.
  - La UI muestra si coinciden. Si no, ofrece «Usar N %».
  - Guardar las reglas IA no cambia el acuerdo tarifario. Cada fila de tarifa conserva su `allowedVariancePercentage`, que es lo que hoy usa Financial Variance.
- **Historial** (`history`, como máximo 100 eventos; los más antiguos se recortan primero):

  | Evento | Cuándo |
  |---|---|
  | `TEMPLATE_CREATED` | «Perfil de IA creado desde plantilla». Primer evento: el archivo se crea con «Crear desde plantilla», o al guardar por primera vez las reglas IA, con fecha y usuario de ese momento |
  | `VALIDATION` | Al guardar las reglas IA: uno por interruptor cambiado (`from`/`to` en booleano) |
  | `THRESHOLD` | Al guardar las reglas IA: uno por umbral cambiado (`from`/`to`) |
  | `FILE_SAVED` | Al guardar otro archivo de reglas del convenio (checklist, política, tarifas, compliance, codificación) desde la página. Registra el cambio de versión, `from` → `to` |

  - `FILE_SAVED` solo se registra si `ai-settings.json` ya existe: registrar no crea el archivo. Crear una versión de idioma no cuenta, porque no cambia la versión.
  - `agreement.json` no se registra: son datos generales, no reglas.
  - `user` es el nombre del usuario conectado (`IdentityUserService`). Si no se conoce, queda `null` y la UI muestra «Usuario actual».
- **Versiones por idioma:** al guardar, las otras versiones existentes reciben los interruptores, los umbrales, el historial y la versión, y conservan sus textos (`syncAiSettingsLanguageVersion`). Funciona igual que los contactos de `agreement.json`.
- **Diagnóstico técnico y migración:** es un tipo más de archivo del convenio (`aiSettings` en `AGREEMENT_FILE_KINDS`). Aparece en el panel de diagnóstico y pasa por `migrateDemoValues`; no tiene valores antiguos que migrar.

### Los agentes de Automate todavía NO leen estos valores

Hoy los umbrales e interruptores son configuración documentada del convenio. Ningún proceso, script ni agente de Automate lee `ai-settings.json`, así que cambiarlos no altera los resultados de la demo. Para cablearlos:

1. **Leer el archivo** como los demás. En «Preanalysis» y en Agent Mesh, después de resolver el convenio, añade una tarea `hxp-content-service.READ_FILE` sobre `${agreementFolder}/ai-settings.json`, con salida `aiSettings` (json). Usa un evento de error que continúe con valores por defecto si el archivo no existe.
2. **Pasarlo al agente como entrada.** Convierte `aiSettings` con un `jsontostring` (misma guarda de vacío que el resto) y añádelo como entrada `aiSettings` de Coding Integrity, Compliance Alert, Financial Variance y del agente de preanálisis. Cada prompt debe:
   - omitir su validación si `validations[id=…].enabled` es `false`;
   - usar `tariffVariancePct` como tolerancia por defecto cuando una fila de tarifa no tenga la suya;
   - ajustar el umbral de anomalías según `anomalySensitivity`.
3. **O usarlo como regla de decisión en el flujo.** Después de los agentes, un gateway o script compara la confianza consolidada con `thresholds.autoApprovalMinConfidencePct`. Si es mayor o igual y ninguna regla dura falló, la cuenta sigue sin revisión manual; si no, va a la tarea de revisión. Las validaciones desactivadas se pueden saltar con condiciones en las ramas de cada agente.
4. **Publicar y probar** con una cuenta sintética de cada convenio. Por ejemplo, desactiva `tariff-variance` en uno y comprueba que `financialVarianceResult` no marca variaciones.

## Catálogo único de RuleIds

El checklist del convenio es el catálogo canónico.
- Sus reglas usan las clases de IDP en español y los mismos ids que la política: `SIF-001` a `SIF-014`, `SIF-015` en el hospital y `MIO-001`.
- Cada regla lleva `profiles`, el perfil de la política donde aplica, y `condition` cuando es condicional.
- Cada `ruleId` de `documentRequirements` de la política debe existir en el checklist del mismo convenio. El editor de la política lo valida: un id que no está en el checklist es un error y no deja guardar. En modo lectura se muestra un aviso.
- En la radicación, el respaldo determinista solo aplica las reglas del perfil elegido por el número de facturas. Las condicionales sin códigos las decide el agente.

## Versiones

Cada archivo se guarda por separado y sube la versión a `YYYY-MM-DD-rN`: en la raíz (`version`), o en `policyMetadata.version` para la política. Además se actualiza `updatedAt`. Al guardar `agreement.json` también se actualiza la entrada del índice.

## Resolución del convenio en la radicación

**Paso 1 (carga).** El campo «Prestador» es un selector con los prestadores del índice (`providerName`; los alias de `agreement.json` se muestran debajo del prestador elegido). Se omiten los convenios `INACTIVE`. Con un solo convenio, viene preseleccionado. Si el índice no se puede leer, el campo vuelve a texto libre con un aviso, y el nombre se compara con el índice de las plantillas. En el modo «más documentos» queda de solo lectura.

Al elegir prestador, la tarjeta «Soportes que exige el convenio» carga el checklist y la política del convenio en el idioma de la UI, con el mismo orden que la revisión: versión del idioma, base traducida y plantilla. Muestra:
- el nombre del convenio (prestador, pagador y contrato);
- los documentos siempre obligatorios, los obligatorios bajo condición (con la condición abreviada) y los opcionales;
- que con una factura se exige el soporte clínico completo y con varias, solo la factura (perfiles `SINGLE_INVOICE_FULL` y `MULTI_INVOICE_INVOICE_ONLY`).

Es solo una ayuda para el prestador. **El start form no envía el convenio ni el prestador**: Automate resuelve el convenio con el prestador que extrae IDP de la factura (`docSummary.provider`); ver [Get Rules por convenio e idioma](#get-rules-por-convenio-e-idioma). La tarjeta lo dice con un texto corto. Lógica pura: `pages/radication/utils/radication-provider.util.ts`.

**Revisión.** La página de radicación toma el prestador de la cuenta:
1. el `provider` de la factura de IDP (`batchState`);
2. si no hay, el nombre escrito al subir.

Luego lo compara con `providerName` del índice y con los alias de `agreement.json`. La comparación ignora mayúsculas, tildes, puntuación y sufijos legales. Primero busca coincidencia exacta y después contención, desde 6 caracteres.
- Sin coincidencia: usa el convenio por defecto (`centro-medico-latam`) o, si no existe, el primero activo.
- Para cada archivo, el orden es:
  1. el archivo del convenio;
  2. el archivo global anterior;
  3. la plantilla incluida.

## Pasos en Automate (manuales; los exports no se tocan)

1. **Subir los archivos.** En la página Convenios, elige cada convenio y pulsa «Crear es · en · pt» (o «Crear desde plantilla · ES» para solo el idioma actual). Así se crean la carpeta, los ocho archivos base, sus versiones por idioma y el índice. También puedes subir a mano el contenido de `docs/automate/agreements/`. Las versiones `.es/.en/.pt.json` son solo para la UI: Automate sigue leyendo las bases, sin cambios en los pasos siguientes.
2. **Resolver el convenio** una sola vez, con el prestador extraído (`docSummary.provider`). Pasos y ubicación en [Get Rules por convenio e idioma](#get-rules-por-convenio-e-idioma).
   - El script no conoce los alias de `agreement.json`. Si un prestador factura con otro nombre, agrégalo como entrada del índice o ajusta `providerName`.
3. **Preanálisis («Get Rules»).** Cambia la ruta fija por la del convenio y el idioma, con sus respaldos (misma sección). La entrada del agente sigue llamándose `documentationChecklist`.
4. **Agent Mesh.** Hoy los scripts `jsontostring` convierten las variables de proceso, que traen valores por defecto, en `StariffAgreement`, `SpayerCompliancePolicy`, `SpayerCodingPolicy`, `ScodingRules` y `SdocumentationRules`.
   1. Antes de cada `jsontostring`, añade una tarea `READ_FILE` que cargue el archivo del convenio en la misma variable de proceso:

      | Ruta | Variable |
      |---|---|
      | `${agreementFolder}/tariff-agreement.json` | `tariffAgreement` |
      | `${agreementFolder}/payer-compliance-policy.json` | `payerCompliancePolicy` |
      | `${agreementFolder}/payer-coding-policy.json` | `payerCodingPolicy` |
      | `${agreementFolder}/coding-rules.json` | `codingRules` |
      | `${agreementFolder}/documentation-checklist.json` | `documentationRules` |

      Los agentes ignoran los campos extra (`agreementId`, `version`, `updatedAt`, `profiles`, `condition`).
   2. Conserva los valores por defecto de las variables como respaldo. Si el archivo no existe, añade un evento de error en la tarea `READ_FILE` que continúe sin sobrescribir la variable.
   3. Aplica las guardas para valores vacíos que ya usa el preanálisis: `${empty x ? '[]' : x.toString()}`, sin `"{}"` dentro de la expresión.
   4. El script del widget de reglas (`Activity_054ss9j`) recibe las mismas variables. Tras el cambio mostrará las reglas del convenio sin más ajustes.
5. **Publicar.** Haz *release* y despliega. Radica una cuenta sintética de cada prestador. En el diagnóstico flotante comprueba `agreementId` y que las tarifas de `financialVarianceResult` sean las del convenio.

## Get Rules por convenio e idioma

Hoy «Get Rules» lee siempre `/MedRec/Appdata/Policies/preanalysis-policy.json`, sin importar el prestador. El convenio se resuelve en Automate con el prestador que **extrae IDP** de la factura, no con el formulario de inicio: el start form sigue con `MedRecNum`, `Email`, documentos y `language`.

> El export versionado (`Automate/`) no contiene todavía `docSummary` ni el subproceso de preanálisis; los nombres de abajo vienen del modelo desplegado. Compruébalos en el Modeler antes de cambiar nada.

### 1. Resolver el convenio (una sola vez, en el proceso raíz)

En el proceso raíz `medical-records`, después de la tarea que calcula `docSummary` (o, si se calcula dentro del preanálisis, como salida de ese subproceso hacia el raíz):

1. Tarea `hxp-content-service.READ_FILE` sobre `/MedRec/Appdata/Agreements/agreements-index.json`, salida `agreementsIndex` (json). Evento de error que continúe con la variable vacía.
2. Script task con el contenido de [`resolve-agreement.script.js`](resolve-agreement.script.js).
   - Entradas: `agreementsIndex` y `docSummary` (json o texto JSON). `accountSummary` es opcional.
   - Orden del prestador: `docSummary.provider` (si falta, el `provider` de la primera factura de `docSummary.invoices`) → `accountSummary.provider` → convenio por defecto (`centro-medico-latam`).
   - Salidas: `agreementId` (string), `agreementFolder` (string, `/MedRec/Appdata/Agreements/<agreementId>`) y `agreementMatched` (boolean).
3. Variables de proceso nuevas en el raíz: `agreementsIndex` (json), `agreementId`, `agreementFolder` (string) y `agreementMatched` (boolean).

### 2. «Get Rules» con el archivo del convenio en el idioma de la cuenta

Entrada `file` de READ_FILE:

```
{"uri":"hxpr:/path${agreementFolder}/preanalysis-policy.${language}.json"}
```

- **Idioma:** `language` llega del start form (campo oculto `Text0aiukv`). Por defecto, `${empty language ? 'es' : language}`. Si puede traer otro valor que `es`, `en` o `pt`, usa `${language == 'en' || language == 'pt' ? language : 'es'}`, que también cubre el vacío.
- **Sin llaves dentro de JUEL.** Dentro de `${…}` no puede haber llaves literales; las del JSON quedan fuera de la expresión, como arriba.
- **Si el editor no interpola expresiones dentro del JSON:** añade antes un script task que construya la referencia en una variable `policyFile` (json) y úsala como entrada `file`:

  ```js
  const lang = ['es', 'en', 'pt'].indexOf(variables.language) !== -1 ? variables.language : 'es';
  const folder = variables.agreementFolder || '/MedRec/Appdata/Agreements/centro-medico-latam';
  variables.policyFile = { uri: 'hxpr:/path' + folder + '/preanalysis-policy.' + lang + '.json' };
  ```
- **Respaldos con evento de error** en la READ_FILE (cada uno, otra READ_FILE con la misma salida):
  1. `{"uri":"hxpr:/path${agreementFolder}/preanalysis-policy.json"}`: la base del mismo convenio.
  2. `{"uri":"hxpr:/path/MedRec/Appdata/Policies/preanalysis-policy.json"}`: la ruta global antigua.
- Si `agreementFolder` pudiera llegar vacío (script no ejecutado), usa `${empty agreementFolder ? '/MedRec/Appdata/Agreements/centro-medico-latam' : agreementFolder}` en lugar de `${agreementFolder}`.

### 3. Agent Mesh

Hoy la call activity de Agent Mesh (`agentmesh-hk5kb`) solo recibe `batchState`; las demás reglas (`tariffAgreement`, `payerCompliancePolicy`, `payerCodingPolicy`, `codingRules`, `documentationRules`, `preAuthorization`) son variables de entrada con valores por defecto. `docSummary` no llega.

- **Recomendado:** resolver el convenio una vez en el raíz (paso 1) y pasar `agreementFolder` (y, si se quiere, `agreementId`) como entrada de la call activity. En Agent Mesh, declara `agreementFolder` como variable de entrada (string) y úsala en las READ_FILE de los archivos de los agentes: tabla del [paso 4 de «Pasos en Automate»](#pasos-en-automate-manuales-los-exports-no-se-tocan) (`${agreementFolder}/tariff-agreement.json`, etc.). Los agentes leen la base, sin sufijo de idioma.
- **Alternativa (no recomendada):** pasar `docSummary` como entrada de la call activity y repetir dentro de Agent Mesh el READ_FILE del índice y el script. Duplica la resolución y puede divergir del preanálisis.
- Respaldo: evento de error en cada READ_FILE que continúe sin sobrescribir la variable (conserva el valor por defecto).

### 4. Probar

Publica y radica dos cuentas sintéticas, una por prestador. En el diagnóstico técnico comprueba `agreementId`, `agreementMatched` y que el preanálisis cite los `ruleId` del convenio (por ejemplo, `SIF-015` solo en el hospital).

## Diagnóstico técnico

La ruta, quién lo lee, el origen, la versión y el idioma de cada archivo del convenio no se muestran en la página: la barra de estado de cada archivo solo indica estado, versión, fecha e idioma, y la interfaz no nombra Appdata. Con la vista técnica activada (Apariencia), la página registra una entrada por archivo (`kind: agreements`) en el panel de diagnóstico flotante (`DashboardDiagnosticsService`).

## Pendiente

- El dashboard (campos `calc_*`) todavía lee el checklist global (`DocumentationChecklistRepositoryService`), no el del convenio de cada cuenta.
- KD solo conoce el contrato si los archivos de `Contract/` están indexados en la fuente del agente configurado para el lugar `agreements.<agreementId>.documents`.
- Los archivos con los ids o la clase anteriores se muestran migrados, pero solo se reescriben con «Actualizar archivos del convenio» (ver la migración).
- El agente `reglas-convenio` está solo propuesto; el asistente usa el motor por palabras clave.
- Los agentes de Automate no leen `ai-settings.json` (umbrales e interruptores de «Reglas IA»); ver [cómo cablearlo](#los-agentes-de-automate-todavía-no-leen-estos-valores).
- «Get Rules» y Agent Mesh siguen leyendo las rutas fijas hasta aplicar a mano [Get Rules por convenio e idioma](#get-rules-por-convenio-e-idioma). El export versionado no incluye aún `docSummary` ni el subproceso de preanálisis.
