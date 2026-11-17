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
```

- **Índice:** `{ kind, schemaVersion, updatedAt, agreements: [{ agreementId, providerName, payer, status, updatedAt }] }`. También se acepta una lista sin envoltorio.
- **`agreementId`:** nombre de la carpeta, en minúsculas, con dígitos y guiones.
- **Plantillas:** las dos semillas están en `docs/automate/agreements/<agreementId>/` y en el plugin, en `pages/agreements/store/templates/`, con el mismo contenido.
  - `centro-medico-latam`: Centro Medico LATAM.
  - `hospital-general-hyland-latam`: Hospital General HYLAND LATAM.

  Las dos tienen como pagador a ARS Primera.
- **Diferencias entre las semillas:**

  | Regla | Centro Medico LATAM | Hospital General HYLAND LATAM |
  |---|---|---|
  | Tarifas | Base, ±10 % | Un 18 % más altas, ±5 %, con UCI |
  | Umbral de autorización | RD$ 100,000 | RD$ 50,000; cirugía y hospitalización siempre la exigen |
  | Riesgo de `SIF-003` | MEDIUM | HIGH |
  | `SIF-015` | — | Nota de Enfermería si la hospitalización dura 2 noches o más |
  | `COMP-004` y `CR-004` | — | Solo en este convenio |
- **Archivos globales anteriores:** `/MedRec/Appdata/Checklists/documentation-checklist.json` y `/MedRec/Appdata/Policies/preanalysis-policy.json`. Quedan solo como respaldo de lectura en la radicación, cuando el convenio aún no tiene su archivo. La página ya no los escribe.

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

`preAuthorization` depende del paciente o de la cuenta, no del convenio. Por eso queda fuera de esta carpeta y sigue como variable de proceso.

## Catálogo único de RuleIds

El checklist del convenio es el catálogo canónico.
- Sus reglas usan las clases de IDP en español y los mismos ids que la política: `SIF-001` a `SIF-014`, `SIF-015` en el hospital y `MIO-001`.
- Cada regla lleva `profiles`, el perfil de la política donde aplica, y `condition` cuando es condicional.
- Cada `ruleId` de `documentRequirements` de la política debe existir en el checklist del mismo convenio. El editor de la política lo valida: un id que no está en el checklist es un error y no deja guardar. En modo lectura se muestra un aviso.
- En la radicación, el respaldo determinista solo aplica las reglas del perfil elegido por el número de facturas. Las condicionales sin códigos las decide el agente.

## Versiones

Cada archivo se guarda por separado y sube la versión a `YYYY-MM-DD-rN`: en la raíz (`version`), o en `policyMetadata.version` para la política. Además se actualiza `updatedAt`. Al guardar `agreement.json` también se actualiza la entrada del índice.

## Resolución del convenio en la radicación

La página de radicación toma el prestador de la cuenta:
1. el `provider` de la factura de IDP (`batchState`);
2. si no hay, el nombre escrito al subir.

Luego lo compara con `providerName` del índice y con los alias de `agreement.json`. La comparación ignora mayúsculas, tildes, puntuación y sufijos legales. Primero busca coincidencia exacta y después contención, desde 6 caracteres.
- Sin coincidencia: usa el convenio por defecto (`centro-medico-latam`) o, si no existe, el primero activo.
- Para cada archivo, el orden es:
  1. el archivo del convenio;
  2. el archivo global anterior;
  3. la plantilla incluida.

## Pasos en Automate (manuales; los exports no se tocan)

1. **Subir los archivos.** En la página Convenios, elige cada convenio y pulsa «Crear en Appdata desde plantilla». Así se crean la carpeta, los siete archivos y el índice. También puedes subir a mano el contenido de `docs/automate/agreements/`.
2. **Resolver el convenio**, en «Preanalysis» y en Agent Mesh (`agentmesh-hk5kb`), después de `accountSummary`:
   1. Añade una tarea `hxp-content-service.READ_FILE` sobre `/MedRec/Appdata/Agreements/agreements-index.json`, con salida `agreementsIndex` (json).
   2. Añade un script task con el contenido de `docs/automate/resolve-agreement.script.js`. Entradas: `agreementsIndex` y `accountSummary`. Salidas: `agreementId`, `agreementFolder` y `agreementMatched`.
   3. El script no conoce los alias de `agreement.json`. Si un prestador factura con otro nombre, agrégalo como entrada del índice o ajusta `providerName`.
3. **Preanálisis («Get Rules»).** Cambia la ruta fija por la del convenio: `${agreementFolder}/preanalysis-policy.json`. La entrada del agente sigue llamándose `documentationChecklist`.
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

## Pendiente

- El dashboard (campos `calc_*`) todavía lee el checklist global (`DocumentationChecklistRepositoryService`), no el del convenio de cada cuenta.
- La pestaña Documentos es de solo lectura. Lista el contrato y los anexos declarados en `agreement.json`, sin enlazar nodos del repositorio.
