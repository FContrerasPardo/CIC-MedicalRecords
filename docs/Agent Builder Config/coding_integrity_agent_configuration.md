# Coding Integrity Agent — Configuration Canvas

## Purpose

This document centralizes the Agent Builder configuration for the **Coding Integrity Agent** used in the Hyland Cuentas Médicas demo.

The agent validates clinical and billing code consistency before approval. It
analyzes diagnosis codes, procedure/service codes, extracted billing details, and
payer coding policies to detect incompatible procedure combinations, missing
diagnosis support, invalid or outdated codes, duplicated charges, and coding items
requiring manual review.

### Automate deploy reference

| Field | Value |
|-------|-------|
| Studio key | `coding-integrity-age-tkfvy` |
| Export JSON | `automate/.../agents/coding-integrity-age-tkfvy.json` |
| batchState at runtime | **Full** string via `$SbatchState` (`jsontostring`) |
| BPMN mappings | `automate/.../processes/agentmesh-hk5kb-extensions.json` |

## 1. Agent Details

### Agent Name

```text
Coding Integrity Agent
```

### Large Language Model

```text
anthropic.claude-opus-4-6-v1
```

Configured in the current Automate export as **Claude Opus 4.6**.

### Agent Description

Recommended version:

```text
Validates diagnoses and billed procedure codes against coding rules and payer policies to detect incompatible, invalid, duplicated, or review-required codes before approval.
```

Shorter option:

```text
Detects coding inconsistencies, invalid procedure combinations, missing diagnosis support, and duplicated billed codes before approval.
```

---

## 2. Inputs

In the current Agent Builder UI, these inputs are configured as **string**. Conceptually, each value contains JSON-formatted content.

### Input 1 — batchState

**Input Name**

```text
batchState
```

**Input Type**

```text
string
```

**Input Description**

```text
IDP-generated JSON with documents, extracted fields, diagnosis codes, procedure codes, billed services, tables, and review statuses.
```

**Purpose**

Represents what was extracted by IDP from the medical account. It may include documents, extracted fields, billed services, diagnosis codes, procedure codes, service descriptions, quantities, dates, and review statuses.

---

### Input 2 — codingRules

**Input Name**

```text
codingRules
```

**Input Type**

```text
string
```

**Input Description**

```text
JSON with coding validation rules, allowed diagnosis-procedure links, incompatible code pairs, duplicate rules, and obsolete codes.
```

**Purpose**

Represents the medical coding validation rules used to determine whether diagnosis codes and procedure/service codes are consistent, valid, duplicated, incompatible, or require manual review.

---

### Input 3 — payerCodingPolicy

**Input Name**

```text
payerCodingPolicy
```

**Input Type**

```text
string
```

**Input Description**

```text
JSON with payer-specific coding policies, required diagnosis support, billing restrictions, bundling rules, and review thresholds.
```

**Purpose**

Represents payer-specific coding requirements. It helps identify payer rules that may differ from generic coding rules, such as required diagnosis support, restricted combinations, bundling policies, and documentation requirements.

---

## 3. Tools

### Current Configuration

```text
No tools currently configured.
```

### Recommendation

For the first version, keep the agent without tools and validate the quality of the analysis using only the configured inputs.

Future possible tools:

- Medical coding catalog lookup
- Payer policy lookup
- Historical denial/glosa lookup
- Repository document lookup
- Clinical guideline lookup

---

## 4. Outcomes

The outcome should store the structured coding analysis result.

### Recommended Outcome

**Outcome Name**

```text
codingIntegrityResult
```

**Type**

```text
string
```

**Required**

```text
true
```

The outcome must be marked as Required/App required. If the outcome is optional,
Automate can complete the agent activity without writing `codingIntegrityResult`
or can return only `tools`, which leaves the unified widget payload without a
usable Coding Integrity result.

### BPMN mapping impact

Any change to Agent Builder variables affects the BPMN activity mapping. This
includes changing input names, outcome names, outcome type, required status, or
adding/removing parameters.

After saving this agent in Agent Builder, reopen the BPMN process model and
validate the agent activity input/output mapping. Do not assume the BPMN updates
automatically. If the BPMN keeps an old detached mapping, Automate can execute
the activity without sending `codingIntegrityResult` to the next step.

For this agent, confirm:

- Agent activity output maps `codingIntegrityResult` to the process variable.
- `BuildIncrementalUnifiedWidgetPayload.json1` maps to the current
  `codingIntegrityResult` variable.
- The updated BPMN model is saved/validated after the remap.

**Outcome Instructions**

```text
Return the final coding integrity analysis as a valid JSON string following the exact response schema defined in the agent instructions. Include summary, coding findings, missing data, recommended actions, and approval flags.
```

### Why string?

The Agent Builder outcome configuration currently uses simple output types. Since the expected result is structured JSON, returning it as a valid JSON string is the safest initial configuration.

### Downstream widget integration

Keep this outcome as an independent string variable. Do not map it directly to
`analysis-task-widget` in the final flow.

The recommended Automate flow is:

```text
codingIntegrityResult -> BuildIncrementalUnifiedWidgetPayload.json1
BuildIncrementalUnifiedWidgetPayload.unifiedWidgetPayloadText -> analysis-task-widget
```

The widget resolves the Coding Integrity card from the generic envelope by
`agentKey`, map key, `agentName`, or fallback slot `json1`.

Before executing `BuildIncrementalUnifiedWidgetPayload`, validate the Agent
Builder event log. A healthy event must include:

```text
outBoundVariables.codingIntegrityResult.value
```

The value must be a non-empty JSON string. If the event only contains `tools` or
does not contain `codingIntegrityResult`, fix the agent outcome/model
configuration before debugging the widget.

---

## 5. Agent Instructions

Paste the following instructions into the **Instructions** field of Agent Builder.

```text
You are the Coding Integrity Agent for a Hyland Medical Accounts workflow.

Your role is to analyze clinical and billing code consistency before the medical account proceeds to approval.

You will receive three inputs as JSON-formatted strings:

batchState:
{{batchState}}

codingRules:
{{codingRules}}

payerCodingPolicy:
{{payerCodingPolicy}}

Interpret these inputs as structured JSON content.

batchState represents what was extracted by IDP. It may include documents, extracted fields, diagnosis codes, procedure codes, service codes, billed services, dates, quantities, descriptions, amounts, and review statuses.

codingRules represents general coding validation logic. It may include allowed diagnosis-procedure links, incompatible code pairs, duplicate code rules, obsolete codes, required supporting diagnosis codes, and documentation requirements.

payerCodingPolicy represents payer-specific coding requirements. It may include payer-specific accepted codes, diagnosis support rules, restricted code combinations, bundling rules, documentation requirements, and review thresholds.

Your tasks:
1. Extract diagnosis codes, procedure codes, service codes, descriptions, dates, and quantities from batchState.
2. Compare extracted codes against codingRules when matching rules are available.
3. Compare extracted codes against payerCodingPolicy when payer-specific rules are available.
4. Detect incompatible diagnosis-procedure combinations.
5. Detect incompatible procedure-procedure combinations.
6. Detect duplicated charges or duplicated code/date combinations.
7. Detect missing diagnosis support for billed procedures.
8. Detect invalid, obsolete, or unsupported codes if codingRules provides that information.
9. Detect bundled or mutually exclusive codes if payerCodingPolicy provides that information.
10. Detect low-confidence or review-required extracted code fields.
11. Assign a risk level to each finding.
12. Recommend a concrete action for each finding.

Important rules:
- Do not invent coding rules.
- Do not invent payer policies.
- Do not invent clinical facts.
- If codingRules does not include a matching rule, state that general coding validation is limited for that item.
- If payerCodingPolicy does not include a matching rule, state that payer-specific validation is limited for that item.
- If batchState lacks diagnosis codes, flag missing diagnosis data when procedure validation depends on diagnosis support.
- If batchState contains low-confidence or review-required code extraction fields, flag them.
- Focus only on coding integrity, diagnosis-procedure consistency, duplicate coding, invalid codes, unsupported codes, and payer coding rules.
- Do not approve or reject the claim directly.
- Always produce one final output as a valid JSON string.
- Do not include markdown.
- Do not include explanatory text outside the final JSON string.

Risk levels:
LOW: Minor informational finding.
MEDIUM: Potential coding mismatch that should be reviewed.
HIGH: Significant coding inconsistency, unsupported code, missing diagnosis support, duplicate charge, or payer rule conflict.
CRITICAL: Major coding issue likely to cause glosa, denial, rejection, or material billing correction.

Return the result as a valid JSON object with this structure:

{
  "agentName": "Coding Integrity Agent",
  "overallRiskLevel": "LOW | MEDIUM | HIGH | CRITICAL",
  "summary": "Short executive summary of the coding integrity analysis.",
  "codingSummary": {
    "codingValidationAvailable": true,
    "payerPolicyValidationAvailable": true,
    "diagnosisCodesDetected": 0,
    "procedureCodesDetected": 0,
    "serviceItemsAnalyzed": 0,
    "incompatibilitiesDetected": 0,
    "duplicatesDetected": 0,
    "missingDiagnosisSupport": 0,
    "obsoleteOrInvalidCodes": 0
  },
  "findings": [
    {
      "findingId": "string",
      "type": "INCOMPATIBLE_DIAGNOSIS_PROCEDURE | INCOMPATIBLE_PROCEDURE_COMBINATION | DUPLICATED_CHARGE | MISSING_DIAGNOSIS_SUPPORT | INVALID_CODE | OBSOLETE_CODE | PAYER_POLICY_CONFLICT | LOW_CONFIDENCE_EXTRACTION | MISSING_CODING_DATA | OTHER",
      "riskLevel": "LOW | MEDIUM | HIGH | CRITICAL",
      "diagnosisCode": "string or null",
      "procedureCode": "string or null",
      "serviceCode": "string or null",
      "description": "string",
      "serviceDate": "string or null",
      "quantity": null,
      "sourceDocument": "string or null",
      "sourceField": "string or null",
      "matchedRuleId": "string or null",
      "payerPolicyId": "string or null",
      "reason": "Explain why this item was flagged.",
      "recommendation": "Specific action recommended for the billing, coding, or audit team."
    }
  ],
  "missingData": [
    {
      "field": "string",
      "reason": "string",
      "impact": "LOW | MEDIUM | HIGH"
    }
  ],
  "recommendedActions": [
    {
      "action": "string",
      "priority": "LOW | MEDIUM | HIGH | CRITICAL",
      "owner": "Billing Team | Coding Specialist | Auditor | Medical Reviewer | System"
    }
  ],
  "readyForApproval": true,
  "requiresManualReview": false
}
```

---

## 6. Example codingRules Input

```json
{
  "rulesetId": "CODING-RULES-DEMO-2024",
  "codingSystem": "ICD10-CPT-CUPS",
  "rules": [
    {
      "ruleId": "CR-001",
      "type": "DIAGNOSIS_PROCEDURE_REQUIRED_LINK",
      "procedureCode": "903895",
      "description": "Radiologic examination requires diagnosis support related to imaging indication.",
      "allowedDiagnosisCodes": ["J18.9", "R91.8", "R07.9"],
      "riskLevelIfViolated": "HIGH"
    },
    {
      "ruleId": "CR-002",
      "type": "INCOMPATIBLE_PROCEDURE_COMBINATION",
      "procedureCode": "99214",
      "incompatibleWith": ["99215"],
      "description": "Evaluation and management codes 99214 and 99215 should not be billed together for the same patient/date.",
      "riskLevelIfViolated": "HIGH"
    },
    {
      "ruleId": "CR-003",
      "type": "DUPLICATE_SAME_DAY_REVIEW",
      "procedureCode": "890201",
      "description": "Same laboratory panel repeated on the same day requires justification.",
      "riskLevelIfViolated": "MEDIUM"
    }
  ],
  "obsoleteCodes": [
    {
      "code": "OLD-001",
      "replacementCode": "NEW-001",
      "effectiveEndDate": "2023-12-31"
    }
  ]
}
```

---

## 7. Example payerCodingPolicy Input

```json
{
  "policyId": "ARS-PRIMERA-CODING-POLICY-2024",
  "payer": "ARS Primera",
  "effectiveFrom": "2024-01-01",
  "effectiveTo": "2024-12-31",
  "rules": [
    {
      "policyRuleId": "PCP-001",
      "type": "REQUIRES_PRIOR_AUTH_FOR_CODE",
      "procedureCode": "903895",
      "description": "Radiology-related procedures require prior authorization when billed above standard outpatient thresholds.",
      "requiredDocuments": ["Prior Authorization", "Radiology Report", "Medical Order"],
      "riskLevelIfViolated": "HIGH"
    },
    {
      "policyRuleId": "PCP-002",
      "type": "BUNDLED_SERVICE",
      "primaryProcedureCode": "SRG-4921",
      "bundledCodes": ["AN-883", "RM-102"],
      "description": "Anesthesia and recovery room charges may be bundled depending on the surgical package agreement.",
      "riskLevelIfViolated": "MEDIUM"
    }
  ]
}
```

---

## 8. Expected Agent Output Example

```json
{
  "agentName": "Coding Integrity Agent",
  "overallRiskLevel": "HIGH",
  "summary": "Coding integrity analysis detected incompatible procedure codes and missing diagnosis support that require review before approval.",
  "codingSummary": {
    "codingValidationAvailable": true,
    "payerPolicyValidationAvailable": true,
    "diagnosisCodesDetected": 2,
    "procedureCodesDetected": 8,
    "serviceItemsAnalyzed": 14,
    "incompatibilitiesDetected": 1,
    "duplicatesDetected": 1,
    "missingDiagnosisSupport": 1,
    "obsoleteOrInvalidCodes": 0
  },
  "findings": [
    {
      "findingId": "CODE-001",
      "type": "INCOMPATIBLE_PROCEDURE_COMBINATION",
      "riskLevel": "HIGH",
      "diagnosisCode": null,
      "procedureCode": "99214",
      "serviceCode": "99215",
      "description": "Procedure codes 99214 and 99215 were billed for the same date and may be mutually exclusive.",
      "serviceDate": "2024-06-13",
      "quantity": 1,
      "sourceDocument": "Factura y Desglose",
      "sourceField": "Tabla de Servicios facturados",
      "matchedRuleId": "CR-002",
      "payerPolicyId": null,
      "reason": "The configured coding rules indicate these codes should not be billed together for the same patient/date.",
      "recommendation": "Review and correct the billed procedure code before approval."
    }
  ],
  "missingData": [],
  "recommendedActions": [
    {
      "action": "Review incompatible procedure codes before approval.",
      "priority": "HIGH",
      "owner": "Coding Specialist"
    }
  ],
  "readyForApproval": false,
  "requiresManualReview": true
}
```
Example
```json
{
    "agentName": "Coding Integrity Agent",
    "overallRiskLevel": "HIGH",
    "summary": "Analysis of medical account 2406-2848 for patient ARIANNY PEÑA TERRERO reveals several coding integrity concerns: (1) No formal ICD-10 diagnosis codes are present in the extracted data—only free-text diagnostic descriptions; (2) Multiple laboratory tests (GLICEMIA/CUP 97) are repeated on the same date (14/06/2024) without clear justification, triggering duplicate-charge review; (3) Radiology procedures billed lack explicit prior authorization documentation per payer policy; (4) Anesthesia and recovery charges may be subject to bundling per payer surgical package rules; (5) Several extraction fields have low confidence or review-required status. General coding rule validation is limited because extracted service codes do not directly match the coded rule identifiers, but structural duplicate and payer policy issues are identifiable.",
    "codingSummary": {
        "codingValidationAvailable": true,
        "payerPolicyValidationAvailable": true,
        "diagnosisCodesDetected": 0,
        "procedureCodesDetected": 66,
        "serviceItemsAnalyzed": 120,
        "incompatibilitiesDetected": 0,
        "duplicatesDetected": 3,
        "missingDiagnosisSupport": 1,
        "obsoleteOrInvalidCodes": 0
    },
    "findings": [
        {
            "findingId": "F-001",
            "type": "MISSING_CODING_DATA",
            "riskLevel": "HIGH",
            "diagnosisCode": null,
            "procedureCode": null,
            "serviceCode": null,
            "description": "No formal ICD-10 diagnosis codes are present in the batch. Only free-text descriptions exist: 'ABDOMEN AGUDO P/B ECTOPICO ROTO' and 'LAPAROTOMIA EXPLORATORIA +LIBERACION DE'.",
            "serviceDate": null,
            "quantity": null,
            "sourceDocument": "Factura y Desglose (Doc ID: fdf24247)",
            "sourceField": "Diagnostico / Motivo de la Visita",
            "matchedRuleId": "CR-001",
            "payerPolicyId": null,
            "reason": "Coding rules require diagnosis-procedure linkage validation (CR-001), but no structured ICD-10 codes are available to validate against allowed diagnosis lists. This prevents proper coding integrity verification.",
            "recommendation": "Assign proper ICD-10 codes (e.g., O00.1 for ectopic pregnancy, K65.0 for acute abdomen) before submission. Ensure diagnosis codes support all billed procedures."
        },
        {
            "findingId": "F-002",
            "type": "DUPLICATED_CHARGE",
            "riskLevel": "MEDIUM",
            "diagnosisCode": null,
            "procedureCode": null,
            "serviceCode": "30305",
            "description": "GLICEMIA (CUP 97, Service 30305) billed 3 times on 14/06/2024 for the same patient.",
            "serviceDate": "14/06/2024",
            "quantity": 3,
            "sourceDocument": "Factura y Desglose (Doc ID: 08a9e03b)",
            "sourceField": "Tabla de Servicios facturados",
            "matchedRuleId": "CR-003",
            "payerPolicyId": null,
            "reason": "Coding rule CR-003 flags same laboratory panel repeated on the same day as requiring justification. Three GLICEMIA tests on 14/06/2024 may indicate duplicate billing unless clinically justified (e.g., insulin protocol monitoring in ICU).",
            "recommendation": "Verify clinical justification for 3 glucose tests on same day. If ICU insulin protocol, attach supporting medical order. Otherwise, remove duplicate charges."
        },
        {
            "findingId": "F-003",
            "type": "PAYER_POLICY_CONFLICT",
            "riskLevel": "HIGH",
            "diagnosisCode": null,
            "procedureCode": "71010",
            "serviceCode": "71010",
            "description": "RX TORAX 1V (FRONTAL O LATER) billed on 14/06/2024 and 15/06/2024. Payer policy PCP-001 requires prior authorization and supporting documentation for radiology procedures.",
            "serviceDate": "14/06/2024, 15/06/2024",
            "quantity": 2,
            "sourceDocument": "Factura y Desglose (Doc ID: 08a9e03b)",
            "sourceField": "Tabla de Servicios facturados",
            "matchedRuleId": null,
            "payerPolicyId": "PCP-001",
            "reason": "Payer policy PCP-001 requires Prior Authorization, Radiology Report, and Medical Order for radiology-related procedures. While radiology reports are present in the batch, no explicit prior authorization document was identified for these chest X-rays.",
            "recommendation": "Confirm prior authorization exists for radiology services. Ensure authorization number covers both dates. Attach medical order to support repeat imaging on consecutive days."
        },
        {
            "findingId": "F-004",
            "type": "PAYER_POLICY_CONFLICT",
            "riskLevel": "MEDIUM",
            "diagnosisCode": null,
            "procedureCode": null,
            "serviceCode": "3600002",
            "description": "RECUPERACION POR HORA (CUP 1085) and HONORARIOS DE ANESTESIA are billed separately. Payer policy PCP-002 indicates anesthesia and recovery room charges may be bundled under surgical package agreement.",
            "serviceDate": "13/06/2024",
            "quantity": null,
            "sourceDocument": "Factura y Desglose (Doc ID: 08a9e03b)",
            "sourceField": "Tabla de Servicios facturados",
            "matchedRuleId": null,
            "payerPolicyId": "PCP-002",
            "reason": "Payer policy PCP-002 states anesthesia and recovery room charges may be bundled depending on surgical package agreement. Recovery (570.00) and Anesthesia (12,449.19 + 500.00 pre-anesthesia) are billed separately alongside surgery charges.",
            "recommendation": "Review contractual surgical package agreement with ARS Primera to determine if recovery and anesthesia are included in the surgical package rate or may be billed separately."
        },
        {
            "findingId": "F-005",
            "type": "DUPLICATED_CHARGE",
            "riskLevel": "MEDIUM",
            "diagnosisCode": null,
            "procedureCode": null,
            "serviceCode": "30010",
            "description": "HEMOGRAMA COMPLETO (CUP 111, Service 30010) billed on 13/06/2024, 14/06/2024, and 15/06/2024 - three consecutive days.",
            "serviceDate": "13/06/2024, 14/06/2024, 15/06/2024",
            "quantity": 3,
            "sourceDocument": "Factura y Desglose (Doc ID: 08a9e03b)",
            "sourceField": "Tabla de Servicios facturados",
            "matchedRuleId": "CR-003",
            "payerPolicyId": null,
            "reason": "While daily CBC in ICU may be clinically appropriate for post-surgical monitoring, the frequency should be supported by medical orders. This is flagged for documentation completeness.",
            "recommendation": "Ensure medical orders support daily hemograms during ICU stay. Low risk if ICU protocol documentation is available."
        },
        {
            "findingId": "F-006",
            "type": "LOW_CONFIDENCE_EXTRACTION",
            "riskLevel": "MEDIUM",
            "diagnosisCode": null,
            "procedureCode": null,
            "serviceCode": null,
            "description": "Multiple fields in the Formulario de Objeciones have ReviewRequired status: 'Nombre del Prestador', 'No. Autorización' (confidence 0.47), 'Valor Total Glosado' (confidence 0.53), 'Esta Firmado por la ARS?' (confidence 0).",
            "serviceDate": null,
            "quantity": null,
            "sourceDocument": "Formulario de Objeciones Auditoría Médica (Doc ID: e7409cc9)",
            "sourceField": "Multiple fields",
            "matchedRuleId": null,
            "payerPolicyId": null,
            "reason": "Low OCR confidence on critical audit objection form fields means the glosa amount ($4,260.47) and authorization numbers (9089941/4677889) may be inaccurate, affecting reconciliation.",
            "recommendation": "Manually verify the objection form values: authorization number, total glosado amount, and ARS signature status before proceeding with reconciliation."
        },
        {
            "findingId": "F-007",
            "type": "LOW_CONFIDENCE_EXTRACTION",
            "riskLevel": "LOW",
            "diagnosisCode": null,
            "procedureCode": null,
            "serviceCode": null,
            "description": "Patient name field extracted with low OCR confidence (0.471) as 'ARIANNY PEVA TERRERO' on primary invoice, corrected to 'ARIANNY PEÑA TERRERO'.",
            "serviceDate": null,
            "quantity": null,
            "sourceDocument": "Factura y Desglose (Doc ID: fdf24247)",
            "sourceField": "Nombre del Paciente",
            "matchedRuleId": null,
            "payerPolicyId": null,
            "reason": "Low confidence extraction on patient name. The correction appears reasonable (Ñ character recognition issue), but should be verified.",
            "recommendation": "Confirm patient name matches cedula records (223-0176730-1). Low risk as correction is consistent across documents."
        },
        {
            "findingId": "F-008",
            "type": "MISSING_DIAGNOSIS_SUPPORT",
            "riskLevel": "HIGH",
            "diagnosisCode": null,
            "procedureCode": null,
            "serviceCode": "76856",
            "description": "US PELVICA COMPLETA billed on 14/06/2024. Sonography report shows normal findings with no pathology detected, yet the primary diagnosis is 'ABDOMEN AGUDO P/B ECTOPICO ROTO'. The pathology report confirms 'QUISTE LÚTEO HEMORRÁGICO. SALPINGITIS CRÓNICA' but the ultrasound found no abnormalities.",
            "serviceDate": "14/06/2024",
            "quantity": 1,
            "sourceDocument": "Factura y Desglose (Doc ID: 08a9e03b) / Laboratorios (Doc ID: 3f883e0c)",
            "sourceField": "Estudio / Conclusión",
            "matchedRuleId": null,
            "payerPolicyId": null,
            "reason": "The pelvic ultrasound was performed post-operatively (surgery was 13/06/2024) and showed normal findings. While post-surgical follow-up imaging can be justified, the normal result combined with the surgical pathology findings may raise questions about medical necessity for this specific study.",
            "recommendation": "Ensure medical order documents the clinical indication for post-operative pelvic ultrasound. The study may be justified as post-surgical follow-up but should have supporting documentation."
        },
        {
            "findingId": "F-009",
            "type": "OTHER",
            "riskLevel": "MEDIUM",
            "diagnosisCode": null,
            "procedureCode": null,
            "serviceCode": null,
            "description": "Objection form documents a glosa of $4,260.47 for medications (Ceftriaxona, Esomeprazol, Nitrofurantoina, Xigaxano, Ondansetron) and laboratory tests. The prestador response indicates conciliation at $4,476.60.",
            "serviceDate": "2024-07-23",
            "quantity": null,
            "sourceDocument": "Formulario de Objeciones Auditoría Médica (Doc ID: e7409cc9)",
            "sourceField": "Procedimientos Objetados / Respuesta del prestador",
            "matchedRuleId": null,
            "payerPolicyId": null,
            "reason": "Prior audit objections exist for this account. Some objected medications (Nitrofurantoina, Xigaxano, Ondansetron) do not appear in the detailed invoice breakdown, suggesting they may have already been removed or the objection references different billing items.",
            "recommendation": "Reconcile the objection form findings with the current invoice to ensure all previously objected items have been properly adjusted before resubmission."
        },
        {
            "findingId": "F-010",
            "type": "OTHER",
            "riskLevel": "LOW",
            "diagnosisCode": null,
            "procedureCode": null,
            "serviceCode": null,
            "description": "Invoice 001376558 indicates 'Esta Firmado por la ARS? = No'. The ARS has not signed the primary invoice.",
            "serviceDate": null,
            "quantity": null,
            "sourceDocument": "Factura y Desglose (Doc ID: fdf24247)",
            "sourceField": "Esta Firmado por la ARS?",
            "matchedRuleId": null,
            "payerPolicyId": null,
            "reason": "Missing ARS signature on the invoice may indicate the claim has not been formally accepted by the payer, which could affect payment processing.",
            "recommendation": "Verify if ARS signature is required at this stage of the workflow or if it is obtained post-approval."
        },
        {
            "findingId": "F-011",
            "type": "DUPLICATED_CHARGE",
            "riskLevel": "LOW",
            "diagnosisCode": null,
            "procedureCode": null,
            "serviceCode": "30460",
            "description": "SGPT ALT (CUP 156) and SGOT AST (CUP 155) each billed on 13/06, 14/06, and 15/06 - three consecutive days of liver function monitoring.",
            "serviceDate": "13/06/2024, 14/06/2024, 15/06/2024",
            "quantity": 3,
            "sourceDocument": "Factura y Desglose (Doc ID: 08a9e03b)",
            "sourceField": "Tabla de Servicios facturados",
            "matchedRuleId": "CR-003",
            "payerPolicyId": null,
            "reason": "Daily liver function tests over 3 days in ICU post-laparotomy may be clinically justified but should be supported by medical orders demonstrating clinical need.",
            "recommendation": "Low risk if ICU monitoring protocol is documented. Ensure medical orders support daily hepatic panel."
        }
    ],
    "missingData": [
        {
            "field": "ICD-10 Diagnosis Codes",
            "reason": "No structured ICD-10 diagnosis codes are present in the extracted data. Only free-text descriptions ('ABDOMEN AGUDO P/B ECTOPICO ROTO', 'LAPAROTOMIA EXPLORATORIA +LIBERACION DE') are available.",
            "impact": "HIGH"
        },
        {
            "field": "Prior Authorization Document",
            "reason": "No prior authorization document was identified in the batch for radiology services, which is required per payer policy PCP-001.",
            "impact": "HIGH"
        },
        {
            "field": "Medical Orders",
            "reason": "No medical order documents were identified in the batch to support repeated laboratory tests and imaging studies.",
            "impact": "MEDIUM"
        },
        {
            "field": "NCF on Second Invoice",
            "reason": "The detailed invoice (Doc ID: 08a9e03b) does not have an NCF (Numero de Comprobante Fiscal) extracted.",
            "impact": "LOW"
        }
    ],
    "recommendedActions": [
        {
            "action": "Assign structured ICD-10 diagnosis codes to the account before submission to enable proper coding validation.",
            "priority": "HIGH",
            "owner": "Coding Specialist"
        },
        {
            "action": "Verify and attach prior authorization documentation for radiology services (RX Torax x2) per payer policy PCP-001.",
            "priority": "HIGH",
            "owner": "Billing Team"
        },
        {
            "action": "Manually verify low-confidence fields on the Objection Form (authorization number, glosa amount, ARS signature).",
            "priority": "MEDIUM",
            "owner": "Auditor"
        },
        {
            "action": "Obtain or attach medical orders supporting repeated laboratory tests (3x GLICEMIA on 14/06, daily CBC, daily hepatic panel).",
            "priority": "MEDIUM",
            "owner": "Medical Reviewer"
        },
        {
            "action": "Review surgical package agreement with ARS Primera to confirm whether anesthesia and recovery charges are separately billable.",
            "priority": "MEDIUM",
            "owner": "Billing Team"
        },
        {
            "action": "Reconcile objection form findings with current invoice to ensure previously objected items are properly adjusted.",
            "priority": "MEDIUM",
            "owner": "Auditor"
        },
        {
            "action": "Confirm patient identity across all documents matches cedula 223-0176730-1.",
            "priority": "LOW",
            "owner": "System"
        }
    ],
    "readyForApproval": false,
    "requiresManualReview": true
}
```
---

## 9. UI Mapping Notes for Analysis Phase

Widget: `analysis-task-widget` — mapper: `analysis.mapper.ts`.

- **Inconsistencies** metric: `findings.length`
- **All Findings** panel + **By service** table: coding `findings[]`
- **Account-level** table: findings without service code (e.g. `MISSING_CODING_DATA`)
- Agent card **Update CUPS** opens informational modal (demo disclaimer)

| UI Element | Output Field |
|---|---|
| Inconsistencies count | `findings.length` |
| Coding Integrity card | Highest-risk finding + `findings.length` |
| All Findings list | `findings[]` |
| Recommended Actions | `recommendedActions[]` |
| Approval state (text) | `readyForApproval`, `requiresManualReview` |

---

## 10. Current Open Questions

- Should `codingRules` include CUPS, CPT, ICD-10, or all coding systems for the demo?
- Should payer-specific restrictions live in `payerCodingPolicy` or be merged into `codingRules`?
- Should missing support documents be detected here or handled by the Compliance Agent?
- Should this agent only produce coding findings, while Financial Agent handles amount/tariff findings?
- Will coding rules be mocked for the demo or stored later in a data model/API?

---

## 11. Configuration Checklist

- [ ] Agent name set to `Coding Integrity Agent 5` (key `coding-integrity-age-tkfvy`)
- [ ] Model: `anthropic.claude-opus-4-6-v1`
- [ ] Agent description added
- [ ] Input `batchState` created as string (full `$SbatchState`)
- [ ] Input `codingRules` created as string
- [ ] Input `payerCodingPolicy` created as string
- [ ] Prompt references `{{batchState}}`
- [ ] Prompt references `{{codingRules}}`
- [ ] Prompt references `{{payerCodingPolicy}}`
- [ ] Outcome `codingIntegrityResult` created
- [ ] Outcome type set to string
- [ ] Outcome marked as Required/App required
- [ ] Outcome instructions added
- [ ] Manual agent test returns non-empty JSON
- [ ] Event log contains `outBoundVariables.codingIntegrityResult.value`
- [ ] BPMN maps `$SbatchState` → agent `batchState`
- [ ] Outcome mapped to `BuildIncrementalUnifiedWidgetPayload.json1`
- [ ] Unified script output `unifiedWidgetPayloadText` mapped to `analysis-task-widget`
- [ ] No tools configured for first version
- [ ] Test run completed with sample JSON inputs
