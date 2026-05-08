# Financial Variance Agent — Configuration Canvas

## Purpose

This document centralizes the Agent Builder configuration for the **Financial Variance Agent** used in the Hyland Cuentas Médicas demo.

The agent analyzes medical account billing data against payer-provider agreements and patient pre-authorizations to detect financial variances, tariff deviations, missing authorizations, total mismatches, and review risks before approval.

---

## 1. Agent Details

### Agent Name

```text
Financial Variance Agent
```

### Large Language Model

```text
Claude Haiku
```

Use this as the current validation baseline for the demo. Manual validation
showed that this agent started returning a usable response after changing the
engine and requiring the outcome. If another model is selected, keep it only
after a manual agent test and event-log validation confirm a non-empty required
outcome.

### Agent Description

Recommended version:

```text
Reviews medical account billing data against contracts and authorizations to identify financial risks, tariff deviations, and items requiring manual review before approval.
```

Shorter option:

```text
Detects financial variances, tariff deviations, missing authorizations, and billing risks before medical account approval.
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
IDP-generated JSON with documents, extracted fields, tables, billed services, amounts, and review statuses for the medical account.
```

**Purpose**

Represents what was extracted from IDP. It may include documents, extracted fields, service tables, invoice totals, patient balances, payer amounts, document statuses, and review-required flags.

---

### Input 2 — tariffAgreement

**Input Name**

```text
tariffAgreement
```

**Input Type**

```text
string
```

**Input Description**

```text
Payer-provider agreement JSON with service codes, expected tariffs, allowed ranges, variance limits, and required support documents.
```

**Purpose**

Represents the payer-provider contract or agreement. It is the source used to compare billed amounts against expected amounts, allowed ranges, max amounts, variance thresholds, and required documents.

---

### Input 3 — preAuthorization

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
JSON with approved services for the patient/account, including codes, quantities, approved amounts, validity dates, and authorization status.
```

**Purpose**

Represents the services authorized for this specific patient/account. It helps validate whether a billed service was approved, whether the authorization is active, and whether the billed quantity or amount exceeds what was authorized.

---

## 3. Tools

### Current Configuration

```text
No tools currently configured.
```

### Recommendation

For the first version, keep the agent without tools and validate the quality of the analysis using only the three configured inputs.

Future possible tools:

- Tariff lookup service
- Contract rules lookup
- Authorization lookup
- Repository document lookup
- Historical glosa pattern lookup

---

## 4. Outcomes

The current outcome named `test` should be replaced with a meaningful output name.

### Recommended Outcome

**Outcome Name**

```text
financialVarianceResult
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
Automate can complete the agent activity with an empty
`financialVarianceResult` value, which makes the unifier produce an incomplete
payload for the Analysis widget.

### BPMN mapping impact

Any change to Agent Builder variables affects the BPMN activity mapping. This
includes changing input names, outcome names, outcome type, required status, or
adding/removing parameters.

After saving this agent in Agent Builder, reopen the BPMN process model and
validate the agent activity input/output mapping. Do not assume the BPMN updates
automatically. If the BPMN keeps an old detached mapping, Automate can execute
the activity without sending `financialVarianceResult` to the next step.

For this agent, confirm:

- Agent activity output maps `financialVarianceResult` to the process variable.
- `BuildIncrementalUnifiedWidgetPayload.json3` maps to the current
  `financialVarianceResult` variable.
- The updated BPMN model is saved/validated after the remap.

**Outcome Instructions**

```text
Return the final financial analysis as a valid JSON string following the exact response schema defined in the agent instructions. Include summary, totals, authorization summary, findings, missing data, recommended actions, and approval flags.
```

### Why string?

The Agent Builder outcome configuration currently uses simple output types. Since the expected result is a structured JSON response, returning it as a valid JSON string is the safest initial configuration.

The downstream process stores this result in a process variable and passes it to
the generic consolidation script before the Analysis form is opened.

### Downstream widget integration

Keep this outcome as an independent string variable. Do not map it directly to
`analysis-task-widget` in the final flow.

The recommended Automate flow is:

```text
financialVarianceResult -> BuildIncrementalUnifiedWidgetPayload.json3
BuildIncrementalUnifiedWidgetPayload.unifiedWidgetPayloadText -> analysis-task-widget
```

The widget resolves the Financial Variance card from the generic envelope by
`agentKey`, map key, `agentName`, or fallback slot `json3`.

Before executing `BuildIncrementalUnifiedWidgetPayload`, validate the Agent
Builder event log. A healthy event must include:

```text
outBoundVariables.financialVarianceResult.value
```

The value must be a non-empty JSON string. If the value exists but is empty, or
if the event only contains `tools`, fix the agent outcome/model configuration
before debugging `UnifyJson` or the widget.

---

## 5. Agent Instructions

Paste the following instructions into the **Instructions** field of Agent Builder.

```text
You are the Financial Variance Agent for a Hyland Medical Accounts workflow.

Your role is to analyze financial consistency before the medical account proceeds to approval.

You will receive three inputs as JSON-formatted strings:

batchState:
{{batchState}}

tariffAgreement:
{{tariffAgreement}}

preAuthorization:
{{preAuthorization}}

Interpret these inputs as structured JSON content.

batchState represents what was billed and extracted by IDP. It may include documents, extracted fields, tables, invoice data, billed services, procedure codes, amounts, balances, payer information, and review statuses.

tariffAgreement represents the payer-provider agreement. It may include service codes, procedure codes, expected tariffs, allowed ranges, maximum values, allowed variance percentages, authorization requirements, and required support documents.

preAuthorization represents services approved for this specific patient/account. It may include approved service codes, procedure codes, quantities, approved amounts, validity dates, authorization status, and authorization identifiers.

Your tasks:
1. Extract billed services, procedures, quantities, and amounts from batchState.
2. Compare billed amounts against tariffAgreement when a matching service code or procedure code exists.
3. Detect tariff deviations.
4. Detect high-value billed items.
5. Detect missing or incomplete financial data.
6. Detect invoice total mismatches if enough data is available.
7. Validate whether services that require authorization have a matching preAuthorization record.
8. Validate whether the billed quantity exceeds the approved quantity.
9. Validate whether the billed amount exceeds the approved amount.
10. Validate whether the authorization is active and within the valid date range.
11. Detect missing, expired, rejected, or insufficient authorizations.
12. Detect services that require supporting documents according to tariffAgreement.
13. Assign a risk level to each finding.
14. Recommend a concrete action for each finding.

Important rules:
- Do not invent tariff values.
- Do not invent contract values.
- Do not invent authorization records.
- If tariffAgreement does not include a matching rule, state that tariff validation is limited for that item.
- If preAuthorization does not include a matching approved service for a service that requires authorization, flag it as MISSING_AUTHORIZATION.
- If preAuthorization is empty or unavailable, state that authorization validation is limited.
- If a service does not require authorization according to tariffAgreement, do not flag missing authorization.
- If authorization is required but authorizationStatus is not APPROVED, flag it.
- If the authorization validity dates do not cover the service date, flag it as EXPIRED_OR_INVALID_AUTHORIZATION.
- If billed quantity exceeds approved quantity, flag it as AUTHORIZED_QUANTITY_EXCEEDED.
- If billed amount exceeds approved amount, flag it as AUTHORIZED_AMOUNT_EXCEEDED.
- If batchState has low-confidence or review-required financial fields, flag them.
- Focus only on financial, tariff, billing, amount, invoice, contract variance, and authorization-related analysis.
- Do not approve or reject the claim directly.
- Always produce one final output as a valid JSON string.
- Do not include markdown.
- Do not include explanatory text outside the final JSON string.

Risk levels:
LOW: Minor informational finding.
MEDIUM: Potential mismatch that should be reviewed.
HIGH: Significant deviation, high-value item, missing authorization, expired authorization, or missing financial evidence.
CRITICAL: Major discrepancy that could cause glosa, rejection, or material financial loss.

Return the result as a valid JSON object with this structure:

{
  "agentName": "Financial Variance Agent",
  "overallRiskLevel": "LOW | MEDIUM | HIGH | CRITICAL",
  "summary": "Short executive summary of the financial and authorization analysis.",
  "analyzedTotals": {
    "invoiceTotal": null,
    "itemizedTotal": null,
    "patientAmount": null,
    "payerAmount": null,
    "detectedCurrency": null,
    "totalsMatch": null,
    "varianceAmount": null,
    "variancePercentage": null
  },
  "authorizationSummary": {
    "authorizationValidationAvailable": true,
    "totalServicesRequiringAuthorization": 0,
    "authorizedServices": 0,
    "missingAuthorizations": 0,
    "expiredOrInvalidAuthorizations": 0,
    "quantityExceeded": 0,
    "amountExceeded": 0
  },
  "findings": [
    {
      "findingId": "string",
      "type": "TARIFF_DEVIATION | HIGH_VALUE_ITEM | TOTAL_MISMATCH | MISSING_FINANCIAL_DATA | LOW_CONFIDENCE_EXTRACTION | DUPLICATED_CHARGE | MISSING_AUTHORIZATION | EXPIRED_OR_INVALID_AUTHORIZATION | AUTHORIZED_QUANTITY_EXCEEDED | AUTHORIZED_AMOUNT_EXCEEDED | MISSING_SUPPORT_DOCUMENT | OTHER",
      "riskLevel": "LOW | MEDIUM | HIGH | CRITICAL",
      "serviceCode": "string or null",
      "procedureCode": "string or null",
      "description": "string",
      "billedAmount": null,
      "expectedAmount": null,
      "minAmount": null,
      "maxAmount": null,
      "approvedAmount": null,
      "billedQuantity": null,
      "approvedQuantity": null,
      "varianceAmount": null,
      "variancePercentage": null,
      "authorizationId": "string or null",
      "authorizationStatus": "string or null",
      "sourceDocument": "string or null",
      "sourceField": "string or null",
      "reason": "Explain why this item was flagged.",
      "recommendation": "Specific action recommended for the billing, audit, or contract team."
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
      "owner": "Billing Team | Auditor | Contract Analyst | Authorization Team | System"
    }
  ],
  "readyForApproval": true,
  "requiresManualReview": false
}
```

---

## 6. Example tariffAgreement Input

```json
{
  "contractId": "CONV-ARS-PRIMERA-2024",
  "payer": "ARS Primera",
  "provider": "CM-UCE",
  "currency": "DOP",
  "effectiveFrom": "2024-01-01",
  "effectiveTo": "2024-12-31",
  "defaultAllowedVariancePercentage": 10,
  "tariffRules": [
    {
      "serviceCode": "903895",
      "procedureCode": "903895",
      "description": "Radiologic examination",
      "expectedAmount": 10800,
      "minAmount": 10000,
      "maxAmount": 12000,
      "allowedVariancePercentage": 10,
      "requiresAuthorization": true,
      "requiredDocuments": [
        "Radiology Report",
        "Prior Authorization",
        "Medical Order"
      ]
    },
    {
      "serviceCode": "890201",
      "procedureCode": "890201",
      "description": "Comprehensive metabolic panel",
      "expectedAmount": 10500,
      "minAmount": 9500,
      "maxAmount": 11500,
      "allowedVariancePercentage": 10,
      "requiresAuthorization": false,
      "requiredDocuments": [
        "Laboratory Result",
        "Medical Order"
      ]
    }
  ]
}
```

---

## 7. Example preAuthorization Input

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
    },
    {
      "serviceCode": "890201",
      "procedureCode": "890201",
      "description": "Comprehensive metabolic panel",
      "approvedQuantity": 2,
      "approvedAmount": 21000,
      "authorizationRequired": false,
      "authorizationStatus": "NOT_REQUIRED"
    }
  ]
}
```

---

## 8. Expected Agent Output Example

```json
{
  "agentName": "Financial Variance Agent",
  "overallRiskLevel": "HIGH",
  "summary": "Financial analysis identified tariff deviations and authorization-related risks requiring manual review before approval.",
  "analyzedTotals": {
    "invoiceTotal": 114846.96,
    "itemizedTotal": 113920.5,
    "patientAmount": 26315.7,
    "payerAmount": 88531.26,
    "detectedCurrency": "DOP",
    "totalsMatch": false,
    "varianceAmount": 926.46,
    "variancePercentage": 0.81
  },
  "authorizationSummary": {
    "authorizationValidationAvailable": true,
    "totalServicesRequiringAuthorization": 1,
    "authorizedServices": 1,
    "missingAuthorizations": 0,
    "expiredOrInvalidAuthorizations": 0,
    "quantityExceeded": 0,
    "amountExceeded": 1
  },
  "findings": [
    {
      "findingId": "FIN-001",
      "type": "TARIFF_DEVIATION",
      "riskLevel": "HIGH",
      "serviceCode": "903895",
      "procedureCode": "903895",
      "description": "Radiologic examination amount exceeds the allowed contract range.",
      "billedAmount": 14500,
      "expectedAmount": 10800,
      "minAmount": 10000,
      "maxAmount": 12000,
      "approvedAmount": 12000,
      "billedQuantity": 1,
      "approvedQuantity": 1,
      "varianceAmount": 2500,
      "variancePercentage": 20.83,
      "authorizationId": "AUTH-2024-88921",
      "authorizationStatus": "APPROVED",
      "sourceDocument": "Factura y Desglose",
      "sourceField": "Tabla de Servicios facturados",
      "reason": "The billed amount exceeds both the contract maximum and the authorized amount.",
      "recommendation": "Review the billed amount against the contract tariff and adjust before approval."
    }
  ],
  "missingData": [],
  "recommendedActions": [
    {
      "action": "Review tariff deviation for service 903895 before approval.",
      "priority": "HIGH",
      "owner": "Contract Analyst"
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
- Missing Docs count
- Tariff Deviations count
- Glosa risk score
- Financial Variance card
- Billed Items Analysis table
- Recommended actions
- Approval readiness

Suggested mapping:

| UI Element | Output Field |
|---|---|
| Risk Score | `overallRiskLevel` + findings severity |
| Summary Message | `summary` |
| Tariff Deviations | Count findings where `type = TARIFF_DEVIATION` |
| Missing Docs | Count findings where `type = MISSING_SUPPORT_DOCUMENT` |
| Authorization Issues | `authorizationSummary` |
| Billed Items Analysis | `findings[]` |
| Approve Proceed Enabled | `readyForApproval` |
| Manual Review Needed | `requiresManualReview` |

---

## 10. Current Open Questions

- Should the outcome remain a JSON string, or can Agent Builder return a JSON object directly?
- Should the financial agent produce only one outcome or separate outcomes by severity?
- Will tariffAgreement be manually mocked for the demo or loaded from a data model/API later?
- Will preAuthorization be mocked or extracted from repository/IDP documents?
- Should missing support documents be handled by this financial agent or by a separate documentation/compliance agent?

---

## 11. Configuration Checklist

- [ ] Agent name set to `Financial Variance Agent`
- [ ] Model selected and validated: `Claude Haiku`
- [ ] Agent description added
- [ ] Input `batchState` created as string
- [ ] Input `tariffAgreement` created as string
- [ ] Input `preAuthorization` created as string
- [ ] Prompt references `{{batchState}}`
- [ ] Prompt references `{{tariffAgreement}}`
- [ ] Prompt references `{{preAuthorization}}`
- [ ] Outcome `financialVarianceResult` created
- [ ] Outcome type set to string
- [ ] Outcome marked as Required/App required
- [ ] Outcome instructions added
- [ ] Manual agent test returns non-empty JSON
- [ ] Event log contains `outBoundVariables.financialVarianceResult.value`
- [ ] BPMN agent activity remapped after Agent Builder variable changes
- [ ] Outcome mapped to `BuildIncrementalUnifiedWidgetPayload.json3`
- [ ] Unified script output `unifiedWidgetPayloadText` mapped to `analysis-task-widget`
- [ ] No tools configured for first version
- [ ] Test run completed with sample JSON inputs
