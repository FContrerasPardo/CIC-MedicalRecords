# Compliance Alert Agent — Configuration Canvas

## Purpose

This document centralizes the Agent Builder configuration for the **Compliance Alert Agent** used in the Hyland Cuentas Médicas demo.

The agent validates whether the medical account has the required supporting
documentation and payer compliance evidence before approval. It analyzes the
IDP-extracted **`batchState`** (full payload) and **`payerCompliancePolicy`** to
detect missing documents, incomplete support evidence, review-required documents,
and compliance risks.

**Not passed to this agent:** `documentationRules`, `preAuthorization` (widget /
Intake only). Mapping extra inputs to the agent caused empty or failed responses
in pilot testing.

### Automate deploy reference

| Field | Value |
|-------|-------|
| Studio key | `compliance-alert-age-4x5t2` |
| Export JSON | `automate/.../agents/compliance-alert-age-4x5t2.json` |
| batchState at runtime | **Full** string via `$SbatchState` (`jsontostring`) |
| BPMN mappings | `automate/.../processes/agentmesh-hk5kb-extensions.json` |

---

## 1. Agent Details

### Agent Name

```text
Compliance Alert Agent
```

### Large Language Model

```text
anthropic.claude-opus-4-6-v1
```

Configured in the current Automate export as **Claude Opus 4.6**.

### Agent Description

Recommended version:

```text
Validates required support documents, authorization evidence, and payer documentation rules to detect missing, incomplete, or review-required compliance items before approval.
```

Shorter option:

```text
Detects missing documents, incomplete support evidence, authorization gaps, and compliance risks before medical account approval.
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
IDP-generated JSON with classified documents, extracted fields, tables, document statuses, services, and review-required flags.
```

**Purpose**

Represents what IDP extracted and classified from the account. Passed as the
**full** IDP payload (`SbatchState`). Used to identify which documents are
present, their classification status, extraction status, confidence, extracted
fields, tables, and review requirements.

---

### Input 2 — payerCompliancePolicy

**Input Name**

```text
payerCompliancePolicy
```

**Input Type**

```text
string
```

**Input Description**

```text
JSON with payer-specific documentation, authorization, filing, and compliance rules required before submitting or approving the account.
```

**Purpose**

Represents payer-specific compliance requirements, such as prior authorization
rules, mandatory forms, required evidence, filing rules, accepted document types,
validity windows, and document acceptance rules.

**Operational note:** Do not map `documentationRules` or `preAuthorization` to
this agent in BPMN. Those variables remain available on the **agent-rules widget**
for Intake review only.

---

## 3. Tools

### Current Configuration

```text
No tools currently configured.
```

### Recommendation

For the first version, keep the agent without tools and validate the analysis using only configured inputs.

Future possible tools:

- Repository document lookup
- Authorization lookup
- Payer policy lookup
- Required document checklist lookup
- Historical glosa/denial pattern lookup

---

## 4. Outcomes

The outcome should store the structured compliance analysis result.

### Recommended Outcome

**Outcome Name**

```text
complianceAlertResult
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
Automate can complete the agent activity without writing
`complianceAlertResult`, which leaves the unified widget payload without a
usable Compliance Alert result.

### BPMN mapping impact

Any change to Agent Builder variables affects the BPMN activity mapping. This
includes changing input names, outcome names, outcome type, required status, or
adding/removing parameters.

After saving this agent in Agent Builder, reopen the BPMN process model and
validate the agent activity input/output mapping. Do not assume the BPMN updates
automatically. If the BPMN keeps an old detached mapping, Automate can execute
the activity without sending `complianceAlertResult` to the next step.

For this agent, confirm:

- Agent activity output maps `complianceAlertResult` to the process variable.
- `BuildIncrementalUnifiedWidgetPayload.json2` maps to the current
  `complianceAlertResult` variable.
- The updated BPMN model is saved/validated after the remap.

**Outcome Instructions**

```text
Return the final compliance analysis as a valid JSON string following the exact response schema defined in the agent instructions. Include summary, compliance findings, missing documents, authorization issues, recommended actions, and approval flags.
```

### Why string?

The Agent Builder outcome configuration currently uses simple output types. Since the expected result is structured JSON, returning it as a valid JSON string is the safest initial configuration.

### Downstream widget integration

Keep this outcome as an independent string variable. Do not map it directly to
`analysis-task-widget` in the final flow.

The recommended Automate flow is:

```text
complianceAlertResult -> BuildIncrementalUnifiedWidgetPayload.json2
BuildIncrementalUnifiedWidgetPayload.unifiedWidgetPayloadText -> analysis-task-widget
```

The widget resolves the Compliance Alert card from the generic envelope by
`agentKey`, map key, `agentName`, or fallback slot `json2`.

Before executing `BuildIncrementalUnifiedWidgetPayload`, validate the Agent
Builder event log. A healthy event must include:

```text
outBoundVariables.complianceAlertResult.value
```

The value must be a non-empty JSON string. This is the reference pattern for the
other agents: if an event contains only `tools` or an empty result, the issue is
in the agent outcome/model configuration, not in the widget.

---

## 5. Agent Instructions

Paste the following instructions into the **Instructions** field of Agent Builder.

```text
You are the Compliance Alert Agent for a Hyland Medical Accounts workflow.

Your role is to validate whether the medical account has the required supporting documentation and authorization evidence before it proceeds to approval.

You will receive this inputs as JSON-formatted strings:

batchState:
{{batchState}}

payerCompliancePolicy:
{{payerCompliancePolicy}}

Interpret these inputs as structured JSON content.

batchState represents what was processed by IDP. It may include classified documents, extracted fields, tables, document types, document statuses, extraction review statuses, confidence values, billed services, procedure codes, diagnosis codes, dates, amounts, and review-required flags.

payerCompliancePolicy represents payer-specific documentation and compliance requirements. It may include prior authorization rules, mandatory forms, required evidence, filing rules, accepted document types, validity windows, and required metadata.

Your tasks:
- Identify documents present in batchState and their classification/extraction status.
- Identify services, procedures, diagnoses, and account context from batchState.
- Apply payer-specific documentation requirements using payerCompliancePolicy.
- Validate whether prior authorization evidence appears in batchState documents when required by policy.
- Detect missing, expired, rejected, or mismatched authorization evidence inferred from documents.
- Assign a risk level to each compliance finding.
- Recommend a concrete action for each finding.

Important rules:
- Do not invent documents.
- Do not invent authorization records.
- Do not invent payer requirements.
- If documentationRules are needed, they are **not** an agent input in this pilot; infer requirements from payerCompliancePolicy and document types in batchState.
- If an authorization is required but no evidence exists in batchState documents, flag as MISSING_AUTHORIZATION_DOCUMENT.
- If authorization status is not APPROVED, flag it as INVALID_AUTHORIZATION_STATUS.
- If authorization validity dates do not cover the service date, flag it as EXPIRED_OR_INVALID_AUTHORIZATION.
- If extracted document confidence is low or unclear, flag it as LOW_CONFIDENCE_DOCUMENT.
- Focus only on documentation completeness, authorization evidence, payer compliance, support documents, and review-required evidence.
- Do not approve or reject the claim directly.
- Always produce one final output as a valid JSON string.
- Do not include markdown.
- Do not include explanatory text outside the final JSON string.

Risk levels:
LOW: Informational finding or minor documentation warning.
MEDIUM: Missing or unclear documentation that should be reviewed.
HIGH: Missing required support, missing authorization, review-required document, or payer compliance conflict likely to cause glosa or rejection.
CRITICAL: Major missing evidence or invalid authorization that blocks approval or creates material compliance risk.

Return the result as a valid JSON object with this structure:

{
  "agentName": "Compliance Alert Agent",
  "overallRiskLevel": "LOW | MEDIUM | HIGH | CRITICAL",
  "summary": "Short executive summary of the documentation and compliance analysis.",
  "complianceSummary": {
    "documentationValidationAvailable": true,
    "payerPolicyValidationAvailable": true,
    "authorizationValidationAvailable": true,
    "documentsDetected": 0,
    "requiredDocuments": 0,
    "presentRequiredDocuments": 0,
    "missingRequiredDocuments": 0,
    "reviewRequiredDocuments": 0,
    "lowConfidenceDocuments": 0,
    "servicesBlockedByMissingSupport": 0
  },
  "findings": [
    {
      "findingId": "string",
      "type": "MISSING_SUPPORT_DOCUMENT | DOCUMENT_REVIEW_REQUIRED | LOW_CONFIDENCE_DOCUMENT | MISSING_AUTHORIZATION_DOCUMENT | INVALID_AUTHORIZATION_STATUS | EXPIRED_OR_INVALID_AUTHORIZATION | MISSING_REQUIRED_FIELD | PAYER_COMPLIANCE_CONFLICT | SERVICE_BLOCKED_BY_MISSING_SUPPORT | OTHER",
      "riskLevel": "LOW | MEDIUM | HIGH | CRITICAL",
      "serviceCode": "string or null",
      "procedureCode": "string or null",
      "diagnosisCode": "string or null",
      "requiredDocumentType": "string or null",
      "matchedDocumentName": "string or null",
      "matchedDocumentId": "string or null",
      "authorizationId": "string or null",
      "authorizationStatus": "string or null",
      "sourceDocument": "string or null",
      "sourceField": "string or null",
      "matchedRuleId": "string or null",
      "payerPolicyId": "string or null",
      "reason": "Explain why this compliance item was flagged.",
      "recommendation": "Specific action recommended for the billing, authorization, or documentation team."
    }
  ],
  "missingDocuments": [
    {
      "documentType": "string",
      "requiredFor": "string",
      "serviceCode": "string or null",
      "procedureCode": "string or null",
      "priority": "LOW | MEDIUM | HIGH | CRITICAL",
      "reason": "string"
    }
  ],
  "documentsRequiringReview": [
    {
      "documentId": "string or null",
      "documentName": "string",
      "documentType": "string or null",
      "reason": "string",
      "confidence": null,
      "priority": "LOW | MEDIUM | HIGH | CRITICAL"
    }
  ],
  "recommendedActions": [
    {
      "action": "string",
      "priority": "LOW | MEDIUM | HIGH | CRITICAL",
      "owner": "Billing Team | Documentation Team | Authorization Team | Auditor | System"
    }
  ],
  "readyForApproval": true,
  "requiresManualReview": false
}
```

---

## 6. Example documentationRules Input

```json
{
  "rulesetId": "DOC-RULES-DEMO-2024",
  "rules": [
    {
      "ruleId": "DOC-001",
      "appliesToProcedureCode": "903895",
      "description": "Radiology procedure requires imaging report, medical order, and prior authorization when required by payer.",
      "requiredDocuments": [
        "Radiology Report",
        "Medical Order",
        "Prior Authorization"
      ],
      "riskLevelIfMissing": "HIGH"
    },
    {
      "ruleId": "DOC-002",
      "appliesToProcedureCode": "890201",
      "description": "Laboratory panel requires laboratory result and medical order.",
      "requiredDocuments": [
        "Laboratory Result",
        "Medical Order"
      ],
      "riskLevelIfMissing": "MEDIUM"
    },
    {
      "ruleId": "DOC-003",
      "appliesToServiceCategory": "surgery",
      "description": "Surgical services require surgical report, anesthesia record, authorization, and clinical notes.",
      "requiredDocuments": [
        "Surgical Report",
        "Anesthesia Record",
        "Prior Authorization",
        "Clinical Notes"
      ],
      "riskLevelIfMissing": "HIGH"
    }
  ]
}
```

---

## 7. Example payerCompliancePolicy Input

```json
{
  "policyId": "ARS-PRIMERA-COMPLIANCE-2024",
  "payer": "ARS Primera",
  "effectiveFrom": "2024-01-01",
  "effectiveTo": "2024-12-31",
  "rules": [
    {
      "policyRuleId": "COMP-001",
      "type": "PRIOR_AUTH_REQUIRED",
      "procedureCode": "903895",
      "description": "Radiology procedures require prior authorization and radiology report.",
      "requiredDocuments": ["Prior Authorization", "Radiology Report"],
      "riskLevelIfViolated": "HIGH"
    },
    {
      "policyRuleId": "COMP-002",
      "type": "ADMISSION_SUPPORT_REQUIRED",
      "serviceCategory": "hospitalization",
      "description": "Hospitalization services require admission notes and clinical support documentation.",
      "requiredDocuments": ["Admission Notes", "Clinical Notes"],
      "riskLevelIfViolated": "MEDIUM"
    }
  ]
}
```

---

## 8. Variables not mapped to this agent

These process variables exist for the **agent-rules widget** and Intake but are
**not** Agent Builder inputs for Compliance in the current pilot:

| Variable | Where used |
|----------|------------|
| `documentationRules` | agent-rules widget (Intake tab) |
| `preAuthorization` | agent-rules widget (hidden when empty) |

Mapping them to the Compliance agent caused empty or failed responses. Keep
BPMN mappings to **two inputs only** (`batchState`, `payerCompliancePolicy`).

Example `preAuthorization` shape (reference only — not an agent input):

```json
{
  "authorizationId": "AUTH-2024-88921",
  "payer": "ARS Primera",
  "patientId": "223-0176730-1",
  "accountId": "ACT-8921-A",
  "validFrom": "2024-06-01",
  "validTo": "2024-06-30",
  "approvedServices": [
    {
      "serviceCode": "903895",
      "procedureCode": "903895",
      "description": "Radiologic examination",
      "approvedQuantity": 1,
      "approvedAmount": 12000,
      "authorizationRequired": true,
      "authorizationStatus": "APPROVED"
    }
  ]
}
```

---

## 9. Expected Agent Output Example

```json
{
  "agentName": "Compliance Alert Agent",
  "overallRiskLevel": "HIGH",
  "summary": "Compliance analysis detected one missing prior authorization document and two review-required support documents before approval.",
  "complianceSummary": {
    "documentationValidationAvailable": true,
    "payerPolicyValidationAvailable": true,
    "authorizationValidationAvailable": true,
    "documentsDetected": 14,
    "requiredDocuments": 8,
    "presentRequiredDocuments": 6,
    "missingRequiredDocuments": 2,
    "reviewRequiredDocuments": 2,
    "lowConfidenceDocuments": 1,
    "servicesBlockedByMissingSupport": 1
  },
  "findings": [
    {
      "findingId": "COMP-001",
      "type": "MISSING_AUTHORIZATION_DOCUMENT",
      "riskLevel": "HIGH",
      "serviceCode": "903895",
      "procedureCode": "903895",
      "diagnosisCode": null,
      "requiredDocumentType": "Prior Authorization",
      "matchedDocumentName": null,
      "matchedDocumentId": null,
      "authorizationId": "AUTH-2024-88921",
      "authorizationStatus": "APPROVED",
      "sourceDocument": "Factura y Desglose",
      "sourceField": "Tabla de Servicios facturados",
      "matchedRuleId": "DOC-001",
      "payerPolicyId": "COMP-001",
      "reason": "The payer policy requires a prior authorization document for this procedure, but no matching document was detected in the account documents.",
      "recommendation": "Request or upload the prior authorization document before approval."
    }
  ],
  "missingDocuments": [
    {
      "documentType": "Prior Authorization",
      "requiredFor": "Radiology procedure 903895",
      "serviceCode": "903895",
      "procedureCode": "903895",
      "priority": "HIGH",
      "reason": "Required by payer policy for this procedure."
    }
  ],
  "documentsRequiringReview": [],
  "recommendedActions": [
    {
      "action": "Request or upload missing prior authorization document for procedure 903895.",
      "priority": "HIGH",
      "owner": "Authorization Team"
    }
  ],
  "readyForApproval": false,
  "requiresManualReview": true
}
```
Example
```json
{
    "agentName": "Compliance Alert Agent",
    "overallRiskLevel": "HIGH",
    "summary": "Medical account for patient ARIANNY PEÑA TERRERO (Record 2406-2848) at CM-UCE contains 8 documents including 2 invoices, 1 medical audit objection form, 1 pathology report, 3 radiology/imaging reports, and 1 admission form. Key compliance issues identified: (1) The Formulario de Objeciones has extraction review required with low-confidence fields and missing ARS signature; (2) Radiology services billed lack explicit prior authorization documentation per payer policy COMP-001; (3) Hospitalization services lack formal clinical notes per payer policy COMP-002; (4) The invoice indicates the ARS has NOT signed the document. Authorization numbers found in the objection form (9089941/4677889) but no standalone prior authorization document exists in the batch.",
    "complianceSummary": {
        "payerPolicyValidationAvailable": true
    },
    "findings": [
        {
            "findingId": "F-001",
            "type": "DOCUMENT_REVIEW_REQUIRED",
            "riskLevel": "HIGH",
            "serviceCode": null,
            "procedureCode": null,
            "diagnosisCode": null,
            "requiredDocumentType": "Formulario de Objeciones Auditoría Médica",
            "matchedDocumentName": "Formulario de Objeciones Auditoría Médica",
            "matchedDocumentId": "e7409cc9-ae95-4f54-8aab-5ad412dc5177",
            "authorizationId": null,
            "authorizationStatus": null,
            "sourceDocument": "Formulario de Objeciones Auditoría Médica",
            "sourceField": "Multiple fields (No. Autorización, Valor Total Glosado, Esta Firmado por la ARS?)",
            "matchedRuleId": null,
            "payerPolicyId": "ARS-PRIMERA-COMPLIANCE-2024",
            "reason": "The medical audit objection form has extractionReviewStatus 'ReviewRequired' with multiple fields flagged for low OCR confidence including authorization number, total glossed value, and ARS signature status. The ARS signature field indicates 'No' - the document is not signed by ARS Primera.",
            "recommendation": "Manual review required to verify authorization numbers (9089941/4677889), total glossed value ($4260.47), and confirm whether ARS signature is truly absent. If ARS has not signed, escalate to obtain ARS endorsement before proceeding."
        },
        {
            "findingId": "F-002",
            "type": "MISSING_AUTHORIZATION_DOCUMENT",
            "riskLevel": "HIGH",
            "serviceCode": "71010",
            "procedureCode": "903895",
            "diagnosisCode": null,
            "requiredDocumentType": "Prior Authorization",
            "matchedDocumentName": null,
            "matchedDocumentId": null,
            "authorizationId": "9089941/4677889",
            "authorizationStatus": "Referenced in objection form but no standalone document",
            "sourceDocument": null,
            "sourceField": null,
            "matchedRuleId": "COMP-001",
            "payerPolicyId": "ARS-PRIMERA-COMPLIANCE-2024",
            "reason": "Payer policy COMP-001 requires prior authorization documentation for radiology procedures. Radiology services (RX TORAX 1V) are billed in the account. Authorization numbers 9089941/4677889 are referenced in the objection form but no standalone prior authorization document is present in the batch.",
            "recommendation": "Obtain and attach the original prior authorization document from ARS Primera confirming authorization numbers 9089941/4677889 cover the radiology services billed."
        },
        {
            "findingId": "F-003",
            "type": "MISSING_SUPPORT_DOCUMENT",
            "riskLevel": "HIGH",
            "serviceCode": "71010",
            "procedureCode": "903895",
            "diagnosisCode": null,
            "requiredDocumentType": "Radiology Report",
            "matchedDocumentName": "Laboratorios (RX TORAX 1V)",
            "matchedDocumentId": "b1a180f9-584d-4e61-9458-10b775be9f28",
            "authorizationId": null,
            "authorizationStatus": null,
            "sourceDocument": null,
            "sourceField": null,
            "matchedRuleId": "COMP-001",
            "payerPolicyId": "ARS-PRIMERA-COMPLIANCE-2024",
            "reason": "Payer policy COMP-001 requires a radiology report for radiology procedures. Two RX Torax reports are present in the batch (documents b1a180f9 and 31763756), which satisfies this requirement. However, these are classified as 'Laboratorios' rather than explicitly as 'Radiology Report'. The content confirms they are radiology reports.",
            "recommendation": "Verify that the two chest X-ray reports (documents b1a180f9 and 31763756) are accepted by ARS Primera as fulfilling the radiology report requirement. No additional action needed if payer accepts the current classification."
        },
        {
            "findingId": "F-004",
            "type": "MISSING_SUPPORT_DOCUMENT",
            "riskLevel": "MEDIUM",
            "serviceCode": null,
            "procedureCode": null,
            "diagnosisCode": null,
            "requiredDocumentType": "Clinical Notes",
            "matchedDocumentName": null,
            "matchedDocumentId": null,
            "authorizationId": null,
            "authorizationStatus": null,
            "sourceDocument": null,
            "sourceField": null,
            "matchedRuleId": "COMP-002",
            "payerPolicyId": "ARS-PRIMERA-COMPLIANCE-2024",
            "reason": "Payer policy COMP-002 requires clinical notes for hospitalization services. The patient was admitted 2024-06-13 to 2024-06-16 with ICU stay and surgery (LAPAROTOMIA EXPLORATORIA). No document classified as 'Clinical Notes' or 'Notas Clínicas' is present in the batch.",
            "recommendation": "Obtain and attach clinical notes (progress notes, physician orders, nursing notes) covering the hospitalization period 2024-06-13 to 2024-06-16 to satisfy payer requirement COMP-002."
        },
        {
            "findingId": "F-005",
            "type": "PAYER_COMPLIANCE_CONFLICT",
            "riskLevel": "MEDIUM",
            "serviceCode": null,
            "procedureCode": null,
            "diagnosisCode": null,
            "requiredDocumentType": "Admission Notes",
            "matchedDocumentName": "Planilla de Admisión",
            "matchedDocumentId": "ace979a5-2ab7-41fe-b536-84f7b70900ee",
            "authorizationId": null,
            "authorizationStatus": null,
            "sourceDocument": "Planilla de Admisión",
            "sourceField": null,
            "matchedRuleId": "COMP-002",
            "payerPolicyId": "ARS-PRIMERA-COMPLIANCE-2024",
            "reason": "Payer policy COMP-002 requires admission notes for hospitalization. A 'Planilla de Admisión' (admission form) is present but it is a consent/authorization form rather than clinical admission notes documenting the patient's condition at admission. This may not fully satisfy the payer's requirement for 'Admission Notes'.",
            "recommendation": "Verify with ARS Primera whether the Planilla de Admisión satisfies their 'Admission Notes' requirement, or obtain formal medical admission notes documenting the patient's clinical status at time of admission."
        },
        {
            "findingId": "F-006",
            "type": "PAYER_COMPLIANCE_CONFLICT",
            "riskLevel": "HIGH",
            "serviceCode": null,
            "procedureCode": null,
            "diagnosisCode": null,
            "requiredDocumentType": null,
            "matchedDocumentName": "Factura y Desglose (001376558)",
            "matchedDocumentId": "fdf24247-6b44-4f5e-890a-fdb5b9e31dd6",
            "authorizationId": null,
            "authorizationStatus": null,
            "sourceDocument": "Factura y Desglose",
            "sourceField": "Esta Firmado por la ARS?",
            "matchedRuleId": null,
            "payerPolicyId": "ARS-PRIMERA-COMPLIANCE-2024",
            "reason": "The primary invoice (001376558) indicates 'Esta Firmado por la ARS?' = 'No'. The invoice has not been signed/endorsed by ARS Primera, which may indicate the payer has not reviewed or accepted the charges.",
            "recommendation": "Obtain ARS Primera's signature/endorsement on the invoice before submitting for final approval. This is typically required for claim acceptance."
        },
        {
            "findingId": "F-007",
            "type": "LOW_CONFIDENCE_DOCUMENT",
            "riskLevel": "MEDIUM",
            "serviceCode": null,
            "procedureCode": null,
            "diagnosisCode": null,
            "requiredDocumentType": null,
            "matchedDocumentName": "Factura y Desglose (001376558)",
            "matchedDocumentId": "fdf24247-6b44-4f5e-890a-fdb5b9e31dd6",
            "authorizationId": null,
            "authorizationStatus": null,
            "sourceDocument": "Factura y Desglose",
            "sourceField": "Nombre del Paciente, Monto Facturado al Paciente, Monto Facturado a ARS, Monto total Facturado, Balance ARS",
            "matchedRuleId": null,
            "payerPolicyId": null,
            "reason": "Multiple critical financial fields on the primary invoice have zero extraction confidence with 'ThresholdNotMet.OcrConfidence' flags, including amounts billed to patient (263), amounts billed to ARS (88,531), total billed (114,846), and ARS balance (88,531). Patient name OCR confidence is only 0.471.",
            "recommendation": "Manually verify all financial amounts on invoice 001376558 against source documents. Confirm patient name spelling and all monetary values before submission."
        },
        {
            "findingId": "F-008",
            "type": "OTHER",
            "riskLevel": "MEDIUM",
            "serviceCode": null,
            "procedureCode": null,
            "diagnosisCode": null,
            "requiredDocumentType": null,
            "matchedDocumentName": "Formulario de Objeciones Auditoría Médica",
            "matchedDocumentId": "e7409cc9-ae95-4f54-8aab-5ad412dc5177",
            "authorizationId": null,
            "authorizationStatus": null,
            "sourceDocument": "Formulario de Objeciones Auditoría Médica",
            "sourceField": "Monto de Objeción",
            "matchedRuleId": null,
            "payerPolicyId": "ARS-PRIMERA-COMPLIANCE-2024",
            "reason": "The medical audit objection form documents objections totaling $4,200.42-$4,476.60 for medications (Ceftriaxona, Esomeprazol, Nitrofurantoina, Xigaxano, Ondansetron) and laboratory tests. These objections represent potential glosas that will reduce the reimbursable amount.",
            "recommendation": "Ensure the conciliation amount ($4,260.42/$4,476.60) is properly reflected in the final claim amount. Verify whether the provider accepted or contested these objections and adjust billing accordingly."
        }
    ],
    "missingDocuments": [
        {
            "documentType": "Prior Authorization Document",
            "requiredFor": "Radiology procedures (RX TORAX) and surgical procedures",
            "serviceCode": "71010",
            "procedureCode": "903895",
            "priority": "HIGH",
            "reason": "Payer policy COMP-001 requires prior authorization documentation. Authorization numbers referenced (9089941/4677889) but no standalone authorization document in batch."
        },
        {
            "documentType": "Clinical Notes",
            "requiredFor": "Hospitalization services (ICU stay, surgery)",
            "serviceCode": null,
            "procedureCode": null,
            "priority": "MEDIUM",
            "reason": "Payer policy COMP-002 requires clinical notes for hospitalization. No clinical notes document found in the batch covering the 3-day admission."
        },
        {
            "documentType": "Surgical Report / Operative Notes",
            "requiredFor": "Surgical procedures (LAPAROTOMIA EXPLORATORIA + LIBERACION DE)",
            "serviceCode": null,
            "procedureCode": null,
            "priority": "MEDIUM",
            "reason": "Major surgical procedure performed but no operative/surgical report is present in the batch to document the procedure performed."
        }
    ],
    "documentsRequiringReview": [
        {
            "documentId": "e7409cc9-ae95-4f54-8aab-5ad412dc5177",
            "documentName": "Formulario de Objeciones Auditoría Médica",
            "documentType": "Formulario de Objeciones Auditoría Médica",
            "reason": "Extraction review required. Multiple fields have low OCR confidence: authorization number, total glossed value, ARS signature status. ARS signature indicated as 'No'.",
            "confidence": 0.94,
            "priority": "HIGH"
        },
        {
            "documentId": "fdf24247-6b44-4f5e-890a-fdb5b9e31dd6",
            "documentName": "Factura y Desglose (001376558)",
            "documentType": "Factura y Desglose",
            "reason": "Multiple critical financial fields have zero extraction confidence. Patient name OCR confidence is 0.471. ARS has not signed the invoice.",
            "confidence": 0.9195,
            "priority": "MEDIUM"
        },
        {
            "documentId": "08a9e03b-7f72-4480-85ec-ec82cfe76b20",
            "documentName": "Factura y Desglose (00001439247)",
            "documentType": "Factura y Desglose",
            "reason": "Several fields have zero extraction confidence including patient name, financial amounts, and balance. Record field shows '.NULL.' as original value.",
            "confidence": 0.9195,
            "priority": "MEDIUM"
        }
    ],
    "recommendedActions": [
        {
            "action": "Obtain and attach the original prior authorization document from ARS Primera (authorization numbers 9089941/4677889) to satisfy payer compliance rule COMP-001.",
            "priority": "HIGH",
            "owner": "Authorization Team"
        },
        {
            "action": "Manually review and validate the Formulario de Objeciones Auditoría Médica - confirm authorization numbers, glossed amounts, and ARS signature status.",
            "priority": "HIGH",
            "owner": "Auditor"
        },
        {
            "action": "Obtain ARS Primera signature/endorsement on the primary invoice (001376558) before final submission.",
            "priority": "HIGH",
            "owner": "Billing Team"
        },
        {
            "action": "Obtain and attach clinical notes and operative report covering the hospitalization period 2024-06-13 to 2024-06-16 to satisfy payer requirement COMP-002.",
            "priority": "MEDIUM",
            "owner": "Documentation Team"
        },
        {
            "action": "Manually verify all financial amounts on both invoices against source documents, particularly amounts with zero extraction confidence.",
            "priority": "MEDIUM",
            "owner": "Billing Team"
        },
        {
            "action": "Confirm conciliation of medical audit objections ($4,260.42) and adjust final claim amount accordingly.",
            "priority": "MEDIUM",
            "owner": "Billing Team"
        }
    ],
    "readyForApproval": false,
    "requiresManualReview": true
}
```
---

## 10. UI Mapping Notes for Analysis Phase

Widget: `analysis-task-widget` — mapper: `analysis.mapper.ts`.

- **Compliance Gaps** metric: `findings.length` (payer readiness, not only missing documents)
- **All Findings** panel: all compliance `findings[]` including `DOCUMENT_REVIEW_REQUIRED`, `PAYER_COMPLIANCE_CONFLICT`, etc.
- Agent card **Request Authorization** opens informational modal with findings + `recommendedActions[]`
- Task completion buttons are **not** in the widget (Automate form footer)

| UI Element | Output Field |
|---|---|
| Compliance Gaps count | `findings.length` |
| Compliance Alert card | Highest-risk finding + `findings.length` |
| All Findings list | `findings[]` with `type`, `reason`, `recommendation` |
| Recommended Actions | `recommendedActions[]` |
| Approval state (text) | `readyForApproval`, `requiresManualReview` |

---

## 11. Current Open Questions

- Should missing support documents be detected only by this agent, or also by the Coding Integrity Agent?
- Should documentationRules be mocked for the demo or maintained later in a data model/API?
- Should the agent validate document confidence thresholds, or should that remain in the Intake widget?
- Should the agent produce one compliance result or separate outcomes for missing documents and authorization issues?

---

## 12. Configuration Checklist

- [ ] Agent name set to `Compliance Alert Agent v3` (key `compliance-alert-age-4x5t2`)
- [ ] Model: `anthropic.claude-opus-4-6-v1`
- [ ] Agent description added
- [ ] Input `batchState` created as string (full `$SbatchState`)
- [ ] Input `payerCompliancePolicy` created as string
- [ ] **Do not** map `documentationRules` or `preAuthorization` to this agent
- [ ] Prompt references `{{batchState}}` and `{{payerCompliancePolicy}}` only
- [ ] Outcome `complianceAlertResult` created
- [ ] Outcome type set to string
- [ ] Outcome marked as Required/App required
- [ ] Manual agent test returns non-empty JSON
- [ ] Event log contains `outBoundVariables.complianceAlertResult.value`
- [ ] BPMN maps `$SbatchState` → agent `batchState`
- [ ] Outcome mapped to `BuildIncrementalUnifiedWidgetPayload.json2`
- [ ] Unified script output `unifiedWidgetPayloadText` mapped to `analysis-task-widget`
- [ ] No tools configured for first version
- [ ] Test run completed with sample JSON inputs
