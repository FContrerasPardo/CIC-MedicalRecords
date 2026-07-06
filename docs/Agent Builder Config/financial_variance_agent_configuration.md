# Financial Variance Agent — Configuration Canvas

## Purpose

This document centralizes the Agent Builder configuration for the **Financial Variance Agent** used in the Hyland Cuentas Médicas demo.

The agent analyzes medical account billing data against the payer-provider
**tariffAgreement** to detect financial variances, tariff deviations, total
mismatches, and review risks before approval. Pre-authorization validation is
**out of scope** for this pilot agent; use Compliance for authorization evidence.

### Automate deploy reference

| Field | Value |
|-------|-------|
| Studio key | `finantial-v3-znvmy` |
| Export JSON | `automate/.../agents/finantial-v3-znvmy.json` |
| batchState at runtime | **Slim** string from `BuildFinancialAgentBatchPayload` → `$financialBatchState` |
| BPMN mappings | `automate/.../processes/agentmesh-hk5kb-extensions.json` |

See `automate/README.md` for the full AgentMesh flow.

---

## 1. Agent Details

### Agent Name

```text
Financial Variance Agent
```

### Large Language Model

```text
anthropic.claude-opus-4-6-v1
```

Configured in the current Automate export as **Claude Opus 4.6**. Earlier pilot
tests used Haiku; the deployed agent now uses Opus per
`finantial-v3-znvmy.json`.

### Agent Description

Recommended version:

```text
Reviews medical account billing data against tariffAgreement to identify financial risks, tariff deviations, and items requiring manual review before approval.
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

Represents the payer-provider contract or agreement. It is the source used to
compare billed amounts against expected amounts, allowed ranges, max amounts,
variance thresholds, and required documents.

---

### BPMN preprocessing — slim batchState (required)

The agent input named `batchState` receives **`financialBatchState`**, not the raw
IDP `batchState`. A Script task runs **`BuildFinancialAgentBatchPayload`** before
the agent:

```text
batchState (json, full) -> BuildFinancialAgentBatchPayload -> financialBatchState (string, slim)
```

Script source: `docs/Agent Builder Config/BuildFinancialAgentBatchPayload.ts`  
Studio key: `buildfinancialagentb-j8nwx`

The slim payload keeps invoice totals, financial fields, and flattened billed
services from `"Tabla de Servicios facturados"`. It omits bounding boxes, OCR
geometry, and classification narrative blocks.

Debug size in event log: `financialBatchStateSummary.sourceApproxChars` vs
`slimApproxChars`.

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

You will receive this inputs as JSON-formatted strings:

batchState:
{{batchState}}

tariffAgreement:
{{tariffAgreement}}

Interpret these inputs as structured JSON content.

batchState represents what was processed by IDP (slim financial payload in pilot). It may include classified documents, extracted fields, tables, billed services, procedure codes, amounts, balances, and review statuses.

tariffAgreement: Payer-provider contract. It may include contractId, payer, provider, currency, effective dates, defaultAllowedVariancePercentage, and tariffRules[] with serviceCode, procedureCode, description, expectedAmount, minAmount, maxAmount, allowedVariancePercentage, requiresAuthorization, and requiredDocuments.

SCOPE (pilot — tariff only):
- Analyze ONLY financial, tariff, billing, amount, invoice, and contract variance.
- Do NOT validate pre-authorizations. Ignore requiresAuthorization for authorization checks.
- You may use requiredDocuments only to flag MISSING_SUPPORT_DOCUMENT if batchState clearly lacks that document type.
- Do not invent tariff values, contract values, or billed amounts.

WORKFLOW:
1. Parse batchState and tariffAgreement.
2. If batchState is large, prioritize documents/tables with billed services, invoice totals, balances, amounts, procedure/service codes; skip unrelated narrative text and duplicate raw OCR blocks.
3. Extract billed services: serviceCode, procedureCode, description, quantity, amount.
4. For each billed item, find a matching tariffRules entry by serviceCode or procedureCode (exact match first).
5. Compare billed amount vs expectedAmount, minAmount, maxAmount, and allowedVariancePercentage.
6. Flag TARIFF_DEVIATION when billed amount is outside allowed range or exceeds allowed variance.
7. Flag HIGH_VALUE_ITEM for unusually high amounts vs contract or invoice context.
8. Flag TOTAL_MISMATCH when invoice total vs itemized/patient/payer totals can be compared reliably.
9. Flag MISSING_FINANCIAL_DATA or LOW_CONFIDENCE_EXTRACTION when amounts/codes are missing or unreliable.
10. Flag DUPLICATED_CHARGE when the same service/code/amount appears duplicated without justification.
11. Flag MISSING_SUPPORT_DOCUMENT when tariffAgreement lists requiredDocuments and batchState shows no evidence of that document type.
12. If no tariff rule matches, add a finding type OTHER with reason "Tariff validation limited — no matching rule".
13. Assign risk level and recommendation to each finding.

IMPORTANT:
- Do not approve or reject the claim.
- Always return valid JSON only. No markdown. No text outside the JSON.
- Never return an empty response. If data is insufficient, return findings and missingData explaining the limitation.

Risk levels:
LOW: Informational.
MEDIUM: Review recommended.
HIGH: Significant deviation or missing financial evidence.
CRITICAL: Major discrepancy with glosa/rejection/material loss risk.

Return EXACTLY this JSON object as the value of outcome financialVarianceResult:

{
  "agentName": "Financial Variance Agent",
  "overallRiskLevel": "LOW | MEDIUM | HIGH | CRITICAL",
  "summary": "Short executive summary of tariff and billing analysis.",
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
  "tariffSummary": {
    "tariffValidationAvailable": true,
    "totalBilledServicesAnalyzed": 0,
    "servicesWithMatchingTariff": 0,
    "servicesWithoutMatchingTariff": 0,
    "tariffDeviations": 0,
    "missingSupportDocuments": 0
  },
  "findings": [
    {
      "findingId": "string",
      "type": "TARIFF_DEVIATION | HIGH_VALUE_ITEM | TOTAL_MISMATCH | MISSING_FINANCIAL_DATA | LOW_CONFIDENCE_EXTRACTION | DUPLICATED_CHARGE | MISSING_SUPPORT_DOCUMENT | OTHER",
      "riskLevel": "LOW | MEDIUM | HIGH | CRITICAL",
      "serviceCode": "string or null",
      "procedureCode": "string or null",
      "description": "string",
      "billedAmount": null,
      "expectedAmount": null,
      "minAmount": null,
      "maxAmount": null,
      "billedQuantity": null,
      "varianceAmount": null,
      "variancePercentage": null,
      "sourceDocument": "string or null",
      "sourceField": "string or null",
      "reason": "string",
      "recommendation": "string"
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
      "owner": "Billing Team | Auditor | Contract Analyst | System"
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

## 7. Slim batchState schema (script output)

The Financial agent does **not** read raw IDP `batchState` in the current BPMN.
`BuildFinancialAgentBatchPayload` produces a string JSON object with:

- `schemaVersion`: `financial-agent-batch/v1`
- `accountSummary`: record, patient, invoice totals, balances
- `documents[]`: `className`, financial fields, `billedServices[]` (flattened rows)

Full script: `docs/Agent Builder Config/BuildFinancialAgentBatchPayload.ts`  
Export binding: `agentmesh-hk5kb-extensions.json` → `Activity_1w4btuq`.

---

## 8. Expected Agent Output Example

```json
{
  "agentName": "Financial Variance Agent",
  "overallRiskLevel": "HIGH",
  "summary": "Financial analysis identified tariff deviations requiring manual review before approval.",
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
  "tariffSummary": {
    "tariffValidationAvailable": true,
    "totalBilledServicesAnalyzed": 42,
    "servicesWithMatchingTariff": 38,
    "servicesWithoutMatchingTariff": 4,
    "tariffDeviations": 2,
    "missingSupportDocuments": 0
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
      "billedQuantity": 1,
      "varianceAmount": 2500,
      "variancePercentage": 20.83,
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
Example
```json
{
    "agentName": "Financial Variance Agent",
    "overallRiskLevel": "HIGH",
    "summary": "Financial variance analysis for record 2406-2848 (ARIANNY PEÑA TERRERO, CM-UCE). Invoice total is $114,846 DOP. No billed services match the two tariff rules available in the contract (903895, 890201). Multiple financial inconsistencies detected: the sum of patient amount ($263) + payer amount ($88,531) = $88,794 does not equal the invoice total ($114,846), indicating a significant total mismatch. The itemized summary line totals from Document 1 sum to approximately $88,531, which aligns with the payer balance but not the invoice total. The glosa total is $4,260.47. Document 2 (detailed invoice) shows a different invoice number (00001439247) vs the account summary invoice (001376558). Several duplicated laboratory charges detected on the same date. The Formulario de Objeciones requires extraction review. The invoice is not signed by the ARS (payer).",
    "analyzedTotals": {
        "invoiceTotal": 114846,
        "itemizedTotal": 88531.26,
        "patientAmount": 263,
        "payerAmount": 88531,
        "detectedCurrency": "DOP",
        "totalsMatch": false,
        "varianceAmount": 26314.74,
        "variancePercentage": 22.91
    },
    "tariffSummary": {
        "tariffValidationAvailable": true,
        "totalBilledServicesAnalyzed": 136,
        "servicesWithMatchingTariff": 0,
        "servicesWithoutMatchingTariff": 136,
        "tariffDeviations": 0,
        "missingSupportDocuments": 0
    },
    "findings": [
        {
            "findingId": "FV-001",
            "type": "TOTAL_MISMATCH",
            "riskLevel": "HIGH",
            "serviceCode": null,
            "procedureCode": null,
            "description": "Invoice total does not match sum of patient amount + payer amount",
            "billedAmount": 114846,
            "expectedAmount": 88794,
            "minAmount": null,
            "maxAmount": null,
            "billedQuantity": null,
            "varianceAmount": 26052,
            "variancePercentage": 22.69,
            "sourceDocument": "fdf24247-6b44-4f5e-890a-fdb5b9e31dd6",
            "sourceField": "Monto total Facturado vs Monto Facturado al Paciente + Monto Facturado a ARS",
            "reason": "Patient amount (263) + Payer amount (88,531) = 88,794 which is significantly less than the invoice total of 114,846. The difference of 26,052 (22.69%) is unexplained and exceeds the 10% allowed variance.",
            "recommendation": "Verify the invoice total breakdown. Determine what accounts for the $26,052 difference — possibly glosas, non-covered services, or data extraction error."
        },
        {
            "findingId": "FV-002",
            "type": "TOTAL_MISMATCH",
            "riskLevel": "MEDIUM",
            "serviceCode": null,
            "procedureCode": null,
            "description": "Itemized line totals from summary document approximate payer balance but not invoice total",
            "billedAmount": 88531.26,
            "expectedAmount": 114846,
            "minAmount": null,
            "maxAmount": null,
            "billedQuantity": null,
            "varianceAmount": 26314.74,
            "variancePercentage": 22.91,
            "sourceDocument": "fdf24247-6b44-4f5e-890a-fdb5b9e31dd6",
            "sourceField": "billedServices lineTotal sum",
            "reason": "Sum of all lineTotal values in Document 1 (Factura y Desglose summary) is approximately $88,531.26, matching the payer balance but not the stated invoice total of $114,846.",
            "recommendation": "Confirm whether the invoice total includes non-covered services (BANCO DE SANGRE $9,668.74 and SERVICIOS NO CUBIERTO $689.44 which have lineTotal=0) and patient copays that are excluded from payer responsibility."
        },
        {
            "findingId": "FV-003",
            "type": "DUPLICATED_CHARGE",
            "riskLevel": "MEDIUM",
            "serviceCode": "30305",
            "procedureCode": "97",
            "description": "GLICEMIA billed 3 times on 14/06/2024",
            "billedAmount": 622.74,
            "expectedAmount": 207.58,
            "minAmount": null,
            "maxAmount": null,
            "billedQuantity": 3,
            "varianceAmount": 415.16,
            "variancePercentage": 200,
            "sourceDocument": "08a9e03b-7f72-4480-85ec-ec82cfe76b20",
            "sourceField": "billedServices",
            "reason": "GLICEMIA (serviceCode 30305, procedureCode 97) appears three times on 14/06/2024 at $207.58 each. While repeat glucose testing can be clinically justified in ICU, three identical charges on the same date warrant verification.",
            "recommendation": "Verify clinical justification for three glucose tests on the same day. If not justified, flag as potential duplicate billing."
        },
        {
            "findingId": "FV-004",
            "type": "HIGH_VALUE_ITEM",
            "riskLevel": "MEDIUM",
            "serviceCode": "8470009723445",
            "procedureCode": null,
            "description": "HONORARIOS DE ANESTESIA - $12,449.19",
            "billedAmount": 12449.19,
            "expectedAmount": null,
            "minAmount": null,
            "maxAmount": null,
            "billedQuantity": 1,
            "varianceAmount": null,
            "variancePercentage": null,
            "sourceDocument": "08a9e03b-7f72-4480-85ec-ec82cfe76b20",
            "sourceField": "billedServices",
            "reason": "Anesthesia honorarium of $12,449.19 is one of the highest single-line items. Combined with pre-anesthesia ($500), total anesthesia charges are $12,949.19 which matches the summary document line for HONORARIOS DE ANESTESIA.",
            "recommendation": "Verify anesthesia fees are consistent with contracted rates and procedure complexity."
        },
        {
            "findingId": "FV-005",
            "type": "HIGH_VALUE_ITEM",
            "riskLevel": "MEDIUM",
            "serviceCode": "4050013",
            "procedureCode": null,
            "description": "TRANSFUSION SIN DONANTE - $8,000",
            "billedAmount": 8000,
            "expectedAmount": null,
            "minAmount": null,
            "maxAmount": null,
            "billedQuantity": 1,
            "varianceAmount": null,
            "variancePercentage": null,
            "sourceDocument": "08a9e03b-7f72-4480-85ec-ec82cfe76b20",
            "sourceField": "billedServices",
            "reason": "Blood transfusion without donor charged at $8,000 is a high-value item. The summary document shows BANCO DE SANGRE with lineTotal=0, suggesting this may be a non-covered service.",
            "recommendation": "Confirm whether blood bank services are covered under the contract or if they are correctly excluded from payer responsibility."
        },
        {
            "findingId": "FV-006",
            "type": "HIGH_VALUE_ITEM",
            "riskLevel": "LOW",
            "serviceCode": "8470009723164",
            "procedureCode": "2968268",
            "description": "DREN DE BLAKE NO. 19FR - $3,775.20",
            "billedAmount": 3775.2,
            "expectedAmount": null,
            "minAmount": null,
            "maxAmount": null,
            "billedQuantity": 1,
            "varianceAmount": null,
            "variancePercentage": null,
            "sourceDocument": "08a9e03b-7f72-4480-85ec-ec82cfe76b20",
            "sourceField": "billedServices",
            "reason": "High-value surgical supply item (Blake drain) at $3,775.20.",
            "recommendation": "Verify pricing is consistent with market rates for this surgical supply."
        },
        {
            "findingId": "FV-007",
            "type": "HIGH_VALUE_ITEM",
            "riskLevel": "LOW",
            "serviceCode": "8470009723166",
            "procedureCode": "2968268",
            "description": "S.RESERVORIO 100CC REF. - $2,995.85",
            "billedAmount": 2995.85,
            "expectedAmount": null,
            "minAmount": null,
            "maxAmount": null,
            "billedQuantity": 1,
            "varianceAmount": null,
            "variancePercentage": null,
            "sourceDocument": "08a9e03b-7f72-4480-85ec-ec82cfe76b20",
            "sourceField": "billedServices",
            "reason": "High-value surgical supply (reservoir) at $2,995.85.",
            "recommendation": "Verify pricing against contracted supply rates."
        },
        {
            "findingId": "FV-008",
            "type": "MISSING_FINANCIAL_DATA",
            "riskLevel": "MEDIUM",
            "serviceCode": null,
            "procedureCode": null,
            "description": "Document 2 missing Monto Facturado a ARS",
            "billedAmount": null,
            "expectedAmount": null,
            "minAmount": null,
            "maxAmount": null,
            "billedQuantity": null,
            "varianceAmount": null,
            "variancePercentage": null,
            "sourceDocument": "08a9e03b-7f72-4480-85ec-ec82cfe76b20",
            "sourceField": "Monto Facturado a ARS",
            "reason": "The detailed invoice (00001439247) has an empty value for 'Monto Facturado a ARS', making it impossible to cross-validate payer billing from this document.",
            "recommendation": "Request clarification on the payer-billed amount for the detailed invoice document."
        },
        {
            "findingId": "FV-009",
            "type": "MISSING_FINANCIAL_DATA",
            "riskLevel": "MEDIUM",
            "serviceCode": null,
            "procedureCode": null,
            "description": "Document 2 missing signature fields",
            "billedAmount": null,
            "expectedAmount": null,
            "minAmount": null,
            "maxAmount": null,
            "billedQuantity": null,
            "varianceAmount": null,
            "variancePercentage": null,
            "sourceDocument": "08a9e03b-7f72-4480-85ec-ec82cfe76b20",
            "sourceField": "Esta Firmado por la ARS? / Esta Firmado por el Centro Médico?",
            "reason": "Both signature fields are empty in the detailed invoice document. The account summary confirms the invoice is NOT signed by the ARS.",
            "recommendation": "Ensure ARS signature is obtained before final processing, as unsigned invoices may be subject to rejection."
        },
        {
            "findingId": "FV-010",
            "type": "LOW_CONFIDENCE_EXTRACTION",
            "riskLevel": "MEDIUM",
            "serviceCode": null,
            "procedureCode": null,
            "description": "Formulario de Objeciones requires extraction review",
            "billedAmount": null,
            "expectedAmount": null,
            "minAmount": null,
            "maxAmount": null,
            "billedQuantity": null,
            "varianceAmount": null,
            "variancePercentage": null,
            "sourceDocument": "e7409cc9-ae95-4f54-8aab-5ad412dc5177",
            "sourceField": "Multiple fields (Nombre del Prestador, Valor Total Glosado, Esta Firmado por la ARS?)",
            "reason": "The Formulario de Objeciones Auditoría Médica document has extractionReviewStatus=ReviewRequired for all financial fields including the glosa total of $4,260.47. This value needs human verification.",
            "recommendation": "Manual review required to confirm the glosa total and other extracted values from the objections form."
        },
        {
            "findingId": "FV-011",
            "type": "MISSING_FINANCIAL_DATA",
            "riskLevel": "LOW",
            "serviceCode": null,
            "procedureCode": null,
            "description": "Many line items in detailed invoice have null lineTotal values",
            "billedAmount": null,
            "expectedAmount": null,
            "minAmount": null,
            "maxAmount": null,
            "billedQuantity": null,
            "varianceAmount": null,
            "variancePercentage": null,
            "sourceDocument": "08a9e03b-7f72-4480-85ec-ec82cfe76b20",
            "sourceField": "billedServices.lineTotal",
            "reason": "All 136 line items in the detailed invoice (Document 2) have null lineTotal values. Only unitPrice is available, preventing per-line verification of applied discounts or copay splits.",
            "recommendation": "Use unitPrice × quantity for gross billing verification. Note that the summary document provides category-level lineTotals that reflect applied discounts."
        },
        {
            "findingId": "FV-012",
            "type": "OTHER",
            "riskLevel": "MEDIUM",
            "serviceCode": null,
            "procedureCode": null,
            "description": "Discrepant patient balance between documents",
            "billedAmount": 89847,
            "expectedAmount": 1316,
            "minAmount": null,
            "maxAmount": null,
            "billedQuantity": null,
            "varianceAmount": 88531,
            "variancePercentage": 6727.36,
            "sourceDocument": "08a9e03b-7f72-4480-85ec-ec82cfe76b20",
            "sourceField": "Balance del Paciente",
            "reason": "Document 1 shows patient balance of $1,316 while Document 2 shows patient balance of $89,847. This massive discrepancy suggests the detailed invoice may reflect a pre-adjudication state before payer responsibility was applied.",
            "recommendation": "Clarify which patient balance is authoritative. The $89,847 figure likely represents the total balance before ARS coverage application."
        },
        {
            "findingId": "FV-013",
            "type": "OTHER",
            "riskLevel": "LOW",
            "serviceCode": null,
            "procedureCode": null,
            "description": "Negative line item (payment received) in detailed invoice",
            "billedAmount": -25000,
            "expectedAmount": null,
            "minAmount": null,
            "maxAmount": null,
            "billedQuantity": 1,
            "varianceAmount": null,
            "variancePercentage": null,
            "sourceDocument": "08a9e03b-7f72-4480-85ec-ec82cfe76b20",
            "sourceField": "billedServices",
            "reason": "A negative amount of -$25,000 labeled 'PAGO EN EFECTIVO' (cash payment) on 16/06/2024 is included in the detailed invoice. This represents a patient payment that reduces the outstanding balance.",
            "recommendation": "Confirm the cash payment was properly received and recorded. Verify it is correctly reflected in the patient balance calculation."
        },
        {
            "findingId": "FV-014",
            "type": "OTHER",
            "riskLevel": "LOW",
            "serviceCode": null,
            "procedureCode": null,
            "description": "No tariff rules match any billed services",
            "billedAmount": null,
            "expectedAmount": null,
            "minAmount": null,
            "maxAmount": null,
            "billedQuantity": null,
            "varianceAmount": null,
            "variancePercentage": null,
            "sourceDocument": null,
            "sourceField": null,
            "reason": "Tariff validation limited — no matching rule. The contract only contains 2 tariff rules (serviceCodes 903895 and 890201) which do not match any of the 136 billed service/procedure codes in this claim.",
            "recommendation": "Expand tariff agreement rules to cover the service codes billed by CM-UCE for comprehensive tariff validation."
        }
    ],
    "missingData": [
        {
            "field": "Comprehensive tariff rules",
            "reason": "Only 2 tariff rules provided in contract; none match the 136 billed services in this claim",
            "impact": "HIGH"
        },
        {
            "field": "lineTotal for detailed invoice items",
            "reason": "All 136 line items in Document 2 have null lineTotal values",
            "impact": "MEDIUM"
        },
        {
            "field": "Monto Facturado a ARS (Document 2)",
            "reason": "Empty value prevents cross-validation of payer amount from detailed invoice",
            "impact": "MEDIUM"
        },
        {
            "field": "Glosa total verification",
            "reason": "Formulario de Objeciones extraction requires review; glosa of $4,260.47 unverified",
            "impact": "MEDIUM"
        }
    ],
    "recommendedActions": [
        {
            "action": "Resolve total mismatch: Verify why invoice total ($114,846) exceeds patient+payer amounts ($88,794) by $26,052",
            "priority": "HIGH",
            "owner": "Auditor"
        },
        {
            "action": "Review and confirm glosa total of $4,260.47 from Formulario de Objeciones (extraction review required)",
            "priority": "HIGH",
            "owner": "Auditor"
        },
        {
            "action": "Verify clinical justification for 3x GLICEMIA charges on 14/06/2024",
            "priority": "MEDIUM",
            "owner": "Auditor"
        },
        {
            "action": "Obtain ARS signature on invoice before final processing",
            "priority": "MEDIUM",
            "owner": "Billing Team"
        },
        {
            "action": "Clarify patient balance discrepancy between documents ($1,316 vs $89,847)",
            "priority": "MEDIUM",
            "owner": "Billing Team"
        },
        {
            "action": "Expand tariff agreement to include service codes used by CM-UCE for future automated validation",
            "priority": "LOW",
            "owner": "Contract Analyst"
        }
    ],
    "readyForApproval": false,
    "requiresManualReview": true
}
```


---

## 9. UI Mapping Notes for Analysis Phase

Widget: `analysis-task-widget` — mapper: `analysis.mapper.ts`.

- **Financial Issues** metric: `findings.length` (includes `TOTAL_MISMATCH`, `DUPLICATED_CHARGE`, `HIGH_VALUE_ITEM`, `TARIFF_DEVIATION`, etc.)
- **All Findings** panel: every item in `findings[]` with expand for `reason`, `recommendation`, `sourceDocument` / `sourceField`
- **By service / Account-level** tables: findings with vs without `serviceCode` / `procedureCode`
- **Recommended Actions** panel: all `recommendedActions[]` (no cap)
- **Approval state** (text only): `readyForApproval` + `requiresManualReview` — task buttons live in Automate form footer, not in the widget

| UI Element | Output Field |
|---|---|
| Risk Score | Max severity across `overallRiskLevel` + all `findings[]` |
| Summary Message | `summary` |
| Financial Issues count | `findings.length` |
| Tariff coverage | `tariffSummary` |
| Financial Variance card | Primary finding + `findings.length` |
| Billed Items (service) | `findings[]` with service/procedure code |
| Account-level rows | `findings[]` without service code |

---

## 10. Current Open Questions

- Should the outcome remain a JSON string, or can Agent Builder return a JSON object directly?
- Should the financial agent produce only one outcome or separate outcomes by severity?
- Will tariffAgreement be manually mocked for the demo or loaded from a data model/API later?
- Should missing support documents be handled by this financial agent or by Compliance?

---

## 11. Configuration Checklist

- [ ] Agent name set to `Financial Variance Agent V4` (key `finantial-v3-znvmy`)
- [ ] Model: `anthropic.claude-opus-4-6-v1`
- [ ] Agent description added
- [ ] Input `batchState` created as string (receives slim `financialBatchState`)
- [ ] Input `tariffAgreement` created as string
- [ ] Script `BuildFinancialAgentBatchPayload` mapped before agent
- [ ] Prompt references `{{batchState}}` and `{{tariffAgreement}}` only
- [ ] Outcome `financialVarianceResult` created
- [ ] Outcome type set to string
- [ ] Outcome marked as Required/App required
- [ ] Manual agent test returns non-empty JSON with `tariffSummary`
- [ ] Event log contains `outBoundVariables.financialVarianceResult.value`
- [ ] BPMN agent activity maps `$financialBatchState` → agent `batchState`
- [ ] Outcome mapped to `BuildIncrementalUnifiedWidgetPayload.json3`
- [ ] Unified script output `unifiedWidgetPayloadText` mapped to `analysis-task-widget`
- [ ] No tools configured for first version
- [ ] Test run completed with sample JSON inputs
