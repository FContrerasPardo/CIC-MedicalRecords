# Automate Project Export — Reference

This folder contains a **Studio export** of the Omega Builder demo project for
Latam Medical Billing. Use it as the **source of truth** for deployed BPMN
mappings, agent prompts, script bindings, and widget form variables.

**Export path:**

```text
automate/OMEGA BUILDER - Latam Medical Billing CUI/
```

**Reference date:** June 2026 (pilot validated — all three agents responding).

---

## Precedence rule

| Source | Use for |
|--------|---------|
| `automate/.../agents/*.json` | Agent prompts, input/output schema, model |
| `automate/.../processes/*-extensions.json` | Variable mappings, script/agent task wiring |
| `docs/Agent Builder Config/*.ts` | Edit scripts **before** pasting into Studio |
| `docs/Agent Builder Config/*_agent_configuration.md` | Human-readable guides derived from export |

If markdown docs conflict with this export, **trust the export** and update the
markdown to match.

---

## AgentMesh process (`agentmesh-hk5kb`)

Process key: `agentmesh-hk5kb`

### Agent keys (deployed)

| Agent | Studio key | Inputs at runtime |
|-------|------------|-------------------|
| Compliance Alert v3 | `compliance-alert-age-4x5t2` | `batchState` (full), `payerCompliancePolicy` |
| Coding Integrity 5 | `coding-integrity-age-tkfvy` | `batchState` (full), `codingRules`, `payerCodingPolicy` |
| Financial Variance V4 | `finantial-v3-znvmy` | `batchState` ← **slim** via script, `tariffAgreement` |

All three agents use model **`anthropic.claude-opus-4-6-v1`** in the current export.

### batchState handling

| Agent | batchState source | Notes |
|-------|-------------------|-------|
| Compliance | `$SbatchState` | Full IDP payload after `jsontostring` |
| Coding | `$SbatchState` | Full IDP payload after `jsontostring` |
| Financial | `$financialBatchState` | Slim string from `BuildFinancialAgentBatchPayload` |

Compliance previously failed when extra inputs (`documentationRules`,
`preAuthorization`) were mapped to the agent. With **only** `payerCompliancePolicy`
+ full `batchState`, it responds reliably.

### Scripts in AgentMesh

| Script key | TS source in repo | Role |
|------------|-------------------|------|
| `buildagentruleswidge-mjs4e` | `BuildAgentRulesWidgetPayload.ts` | Feeds `agent-rules-widget` on New Form |
| `buildfinancialagentb-j8nwx` | `BuildFinancialAgentBatchPayload.ts` | Produces slim `financialBatchState` |
| `unifyjsons-bhjkw` | `BuildIncrementalUnifiedWidgetPayload.ts` | Merges agent outcomes for Analysis widget |
| `jsontostring-uyetl` | — | Converts json process vars to string for agents |
| `stringtojson-9zrjb` | — | Parses agent string outcomes back to json |

### UnifyJsons slot mapping

```text
json1 = codingIntegrityResult
json2 = complianceAlertResult
json3 = financialVarianceResult
json4 = batchState   (context only)
```

Output: `unifiedWidgetPayload` / `unifiedWidgetPayloadText` → `analysis-task-widget`.

---

## Widgets (form bindings)

| Widget | Process variable | User task |
|--------|------------------|-----------|
| `agent-rules-widget` | `agentRulesWidget` (array) | New Form |
| `analysis-task-widget` | `unifiedWidgetPayload` | Analysis |
| `intake-account-widget` | (upstream IDP) | Intake |

---

## Rule variables vs agent inputs

These process variables exist for the **agent-rules widget** and intake UI. Not
all are passed to every agent:

| Variable | Widget tab | Compliance | Coding | Financial |
|----------|------------|------------|--------|-----------|
| `batchState` | Context | Input (full) | Input (full) | Slim only |
| `documentationRules` | Intake | — | — | — |
| `payerCompliancePolicy` | Compliance | Input | — | — |
| `preAuthorization` | Hidden if empty | — | — | — |
| `tariffAgreement` | Financial | — | — | Input |
| `codingRules` | Coding | — | Input | — |
| `payerCodingPolicy` | Coding | — | Input | — |

---

## Update workflow

1. Export project from Studio Modeler (full project or AgentMesh subprocess).
2. Replace or diff files under `automate/OMEGA BUILDER - Latam Medical Billing CUI/`.
3. Check `agents/*.json` for prompt/input changes.
4. Check `processes/agentmesh-hk5kb-extensions.json` for mapping changes.
5. Update corresponding `docs/Agent Builder Config/*_agent_configuration.md`.
6. If scripts changed, sync `.ts` sources in `docs/Agent Builder Config/`.

---

## Related documentation

- [Financial Variance Agent](../docs/Agent%20Builder%20Config/financial_variance_agent_configuration.md)
- [Compliance Alert Agent](../docs/Agent%20Builder%20Config/compliance_alert_agent_configuration.md)
- [Coding Integrity Agent](../docs/Agent%20Builder%20Config/coding_integrity_agent_configuration.md)
- [Agent Rules Widget integration](../docs/Agent%20Builder%20Config/agent_rules_widget_integration.md)
- [Analysis Widget payload integration](../docs/Agent%20Builder%20Config/analysis_widget_payload_integration.md)
