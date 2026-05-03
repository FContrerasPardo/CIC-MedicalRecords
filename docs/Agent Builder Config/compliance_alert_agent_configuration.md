# Compliance Alert Agent — Configuration Canvas

## Purpose

This document centralizes the Agent Builder configuration for the **Compliance Alert Agent** used in the Hyland Cuentas Médicas demo.

The agent validates whether the medical account has the required supporting documentation and authorization evidence before approval. It analyzes the IDP-extracted `batchState`, documentation requirements, payer rules, and pre-authorization data to detect missing documents, incomplete support evidence, review-required documents, and compliance risks.

---

## 1. Agent Details

### Agent Name

```text
Compliance Alert Agent
```

### Large Language Model

```text
Amazon Nova Pro
```

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

Represents what IDP extracted and classified from the account. It is used to identify which documents are present, their classification status, extraction status, confidence, extracted fields, and review requirements.

---

### Input 2 — documentationRules

**Input Name**

```text
documentationRules
```

**Input Type**

```text
string
```

**Input Description**

```text
JSON with required support documents by service, procedure, payer, diagnosis, authorization type, and account context.
```

**Purpose**

Represents the rules that define which support documents are required for each service, procedure, diagnosis, payer, or account type.

---

### Input 3 — payerCompliancePolicy

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

Represents payer-specific compliance requirements, such as prior authorization requirements, required evidence, mandatory forms, validity windows, and document acceptance rules.

---

### Input 4 — preAuthorization

**Input Name**

```text
preAuthorization
```

**Input Type**

```text
string
```

**Input Description**

```text
JSON with approved services for the patient/account, including authorization identifiers, dates, status, approved quantities, and amounts.
```

**Purpose**

Represents the authorization record for the specific patient/account. The agent uses it to confirm whether the required authorization exists, is approved, is active, and matches the billed services.

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

---

## 5. Agent Instructions

Paste the following instructions into the **Instructions** field of Agent Builder.

```text
You are the Compliance Alert Agent for a Hyland Medical Accounts workflow.

Your role is to validate whether the medical account has the required supporting documentation and authorization evidence before it proceeds to approval.

You will receive four inputs as JSON-formatted strings:

batchState:
{{batchState}}

documentationRules:
{{documentationRules}}

payerCompliancePolicy:
{{payerCompliancePolicy}}

preAuthorization:
{{preAuthorization}}

Interpret these inputs as structured JSON content.

batchState represents what was processed by IDP. It may include classified documents, extracted fields, tables, document types, document statuses, extraction review statuses, confidence values, billed services, procedure codes, diagnosis codes, dates, amounts, and review-required flags.

documentationRules represents required support documentation rules. It may include required documents by service, procedure, diagnosis, payer, account type, authorization type, and billing scenario.

payerCompliancePolicy represents payer-specific documentation and compliance requirements. It may include prior authorization rules, mandatory forms, required evidence, filing rules, accepted document types, validity windows, and required metadata.

preAuthorization represents authorization records for this specific patient/account. It may include authorization identifiers, approved services, procedure codes, quantities, approved amounts, authorization status, and validity dates.

Your tasks:
1. Identify documents present in batchState and their classification/extraction status.
2. Identify services, procedures, diagnoses, and account context from batchState.
3. Determine required support documents using documentationRules.
4. Apply payer-specific documentation requirements using payerCompliancePolicy.
5. Validate whether required documents are present.
6. Validate whether present documents are classified and extracted with sufficient confidence.
7. Detect documents with ReviewRequired, low confidence, missing extracted fields, or rejected status.
8. Validate whether prior authorization is required for billed services.
9. Validate whether required authorization evidence exists in the documents or preAuthorization input.
10. Detect missing, expired, rejected, or mismatched authorization evidence.
11. Identify which services/procedures are blocked by missing support documentation.
12. Assign a risk level to each compliance finding.
13. Recommend a concrete action for each finding.

Important rules:
- Do not invent documents.
- Do not invent authorization records.
- Do not invent payer requirements.
- If documentationRules do not define requirements for an item, state that documentation validation is limited for that item.
- If payerCompliancePolicy does not define payer-specific requirements, state that payer-specific compliance validation is limited.
- If a required document is not present in batchState, flag it as MISSING_SUPPORT_DOCUMENT.
- If a document is present but extractionReviewStatus or classification status indicates ReviewRequired, flag it as DOCUMENT_REVIEW_REQUIRED.
- If an authorization is required but missing from both documents and preAuthorization, flag it as MISSING_AUTHORIZATION_DOCUMENT.
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

## 8. Example preAuthorization Input

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

---

## 10. UI Mapping Notes for Analysis Phase

The Analysis screen can consume this output to populate:

- Missing Docs count
- Compliance Alert card
- Request Authorization action
- Review-required documentation alerts
- Manual review status
- Approval readiness

Suggested mapping:

| UI Element | Output Field |
|---|---|
| Missing Docs Count | `complianceSummary.missingRequiredDocuments` |
| Compliance Alert Card | First HIGH/CRITICAL finding |
| Request Authorization Button | Findings with `MISSING_AUTHORIZATION_DOCUMENT` |
| Missing Documents List | `missingDocuments[]` |
| Review Required Docs | `documentsRequiringReview[]` |
| Approve Proceed Enabled | `readyForApproval` |
| Manual Review Needed | `requiresManualReview` |

---

## 11. Current Open Questions

- Should missing support documents be detected only by this agent, or also by the Coding Integrity Agent?
- Should preAuthorization be reused from the Financial Agent input, or should this agent receive a compliance-specific authorization input?
- Should documentationRules be mocked for the demo or maintained later in a data model/API?
- Should the agent validate document confidence thresholds, or should that remain in the Intake widget?
- Should the agent produce one compliance result or separate outcomes for missing documents and authorization issues?

---

## 12. Configuration Checklist

- [ ] Agent name set to `Compliance Alert Agent`
- [ ] Model selected: `Amazon Nova Pro`
- [ ] Agent description added
- [ ] Input `batchState` created as string
- [ ] Input `documentationRules` created as string
- [ ] Input `payerCompliancePolicy` created as string
- [ ] Input `preAuthorization` created as string
- [ ] Prompt references `{{batchState}}`
- [ ] Prompt references `{{documentationRules}}`
- [ ] Prompt references `{{payerCompliancePolicy}}`
- [ ] Prompt references `{{preAuthorization}}`
- [ ] Outcome `complianceAlertResult` created
- [ ] Outcome type set to string
- [ ] Outcome instructions added
- [ ] Outcome mapped to `BuildIncrementalUnifiedWidgetPayload.json2`
- [ ] Unified script output `unifiedWidgetPayloadText` mapped to `analysis-task-widget`
- [ ] No tools configured for first version
- [ ] Test run completed with sample JSON inputs
