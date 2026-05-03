# Coding Integrity Agent — Configuration Canvas

## Purpose

This document centralizes the Agent Builder configuration for the **Coding Integrity Agent** used in the Hyland Cuentas Médicas demo.

The agent validates clinical and billing code consistency before approval. It analyzes diagnosis codes, procedure/service codes, extracted billing details, and payer coding policies to detect incompatible procedure combinations, missing diagnosis support, invalid or outdated codes, duplicated charges, and coding items requiring manual review.

---

## 1. Agent Details

### Agent Name

```text
Coding Integrity Agent
```

### Large Language Model

```text
Amazon Nova Pro
```

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

---

## 9. UI Mapping Notes for Analysis Phase

The Analysis screen can consume this output to populate:

- Inconsistencies count
- Coding Integrity card
- Billed Items Analysis table
- Recommended actions
- Manual review status
- Approval readiness

Suggested mapping:

| UI Element | Output Field |
|---|---|
| Coding Integrity Card Title | First high-risk finding summary |
| Inconsistencies Count | Count `findings[]` where type is coding-related |
| AI Status | `overallRiskLevel` |
| Billed Items Analysis | `findings[]` |
| Update CUPS Button | Findings with `INVALID_CODE`, `OBSOLETE_CODE`, or `INCOMPATIBLE_*` |
| Approve Proceed Enabled | `readyForApproval` |
| Manual Review Needed | `requiresManualReview` |

---

## 10. Current Open Questions

- Should `codingRules` include CUPS, CPT, ICD-10, or all coding systems for the demo?
- Should payer-specific restrictions live in `payerCodingPolicy` or be merged into `codingRules`?
- Should missing support documents be detected here or handled by the Compliance Agent?
- Should this agent only produce coding findings, while Financial Agent handles amount/tariff findings?
- Will coding rules be mocked for the demo or stored later in a data model/API?

---

## 11. Configuration Checklist

- [ ] Agent name set to `Coding Integrity Agent`
- [ ] Model selected: `Amazon Nova Pro`
- [ ] Agent description added
- [ ] Input `batchState` created as string
- [ ] Input `codingRules` created as string
- [ ] Input `payerCodingPolicy` created as string
- [ ] Prompt references `{{batchState}}`
- [ ] Prompt references `{{codingRules}}`
- [ ] Prompt references `{{payerCodingPolicy}}`
- [ ] Outcome `codingIntegrityResult` created
- [ ] Outcome type set to string
- [ ] Outcome instructions added
- [ ] Outcome mapped to `BuildIncrementalUnifiedWidgetPayload.json1`
- [ ] Unified script output `unifiedWidgetPayloadText` mapped to `analysis-task-widget`
- [ ] No tools configured for first version
- [ ] Test run completed with sample JSON inputs
