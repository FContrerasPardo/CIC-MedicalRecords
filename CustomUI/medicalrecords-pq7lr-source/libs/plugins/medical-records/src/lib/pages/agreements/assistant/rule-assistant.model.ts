import { InjectionToken } from '@angular/core';
import { AgreementFileKind, JsonObject } from '../store/agreement-store.util';

/** Agreement files the rules assistant can add rows to. */
export type AssistantTargetKind = Extract<AgreementFileKind, 'documentationChecklist' | 'tariffAgreement' | 'payerCompliancePolicy' | 'payerCodingPolicy' | 'codingRules'>;

export const ASSISTANT_TARGET_KINDS: readonly AssistantTargetKind[] = ['documentationChecklist', 'tariffAgreement', 'payerCompliancePolicy', 'payerCodingPolicy', 'codingRules'];

/** Where each file is edited on the Agreements page (tab, agent sub-tab and the list of rows). */
export const ASSISTANT_TARGETS: Record<AssistantTargetKind, { tab: 'checklist' | 'agentRules'; agentTab: 'financial' | 'compliance' | 'coding' | null; listKey: string }> = {
    documentationChecklist: { tab: 'checklist', agentTab: null, listKey: 'rules' },
    tariffAgreement: { tab: 'agentRules', agentTab: 'financial', listKey: 'tariffRules' },
    payerCompliancePolicy: { tab: 'agentRules', agentTab: 'compliance', listKey: 'rules' },
    payerCodingPolicy: { tab: 'agentRules', agentTab: 'coding', listKey: 'rules' },
    codingRules: { tab: 'agentRules', agentTab: 'coding', listKey: 'rules' },
};

/**
 * One rule proposed by the assistant: the file and the row, in the exact shape of the agreement
 * file (the same contract the Agent Builder agent `reglas-convenio` returns).
 */
export interface RuleProposal {
    /** Unique per result, to track it on screen. */
    id: string;
    kind: AssistantTargetKind;
    row: JsonObject;
    /** Why this file and type (i18n key under `MEDICAL_RECORDS.AGREEMENTS.ASSISTANT.REASON_*`). */
    reason: string;
    /** Text the proposal came from (a sentence, a CSV line or a JSON row label). */
    source: string;
}

export interface RuleAssistantRequest {
    /** A rule in natural language. */
    text?: string;
    /** A rules file to convert (JSON, CSV or TXT). */
    file?: { name: string; content: string };
    agreementId: string;
    /** Ids already used per file, so new rows get the next free id. */
    existingIds: Partial<Record<AssistantTargetKind, readonly string[]>>;
    /** IDP document classes of the agreement's checklist. */
    documentClasses: readonly string[];
}

export interface RuleAssistantResult {
    /** True while the engine is the deterministic keyword parser (no AI). */
    simulated: boolean;
    proposals: RuleProposal[];
    /** Inputs that matched no rule pattern. */
    unrecognized: string[];
}

/**
 * Extension point: today `SimulatedRuleAssistantService` (keywords, deterministic); later an
 * Agent Builder agent that returns the same structure (`docs/automate/agents/reglas-convenio.agent.json`).
 */
export interface RuleAssistantEngine {
    readonly simulated: boolean;
    interpret(request: RuleAssistantRequest): Promise<RuleAssistantResult>;
}

export const RULE_ASSISTANT_ENGINE = new InjectionToken<RuleAssistantEngine>('medical-records.rule-assistant-engine');

/** A proposal the user turned into a draft row: the page hands it to the editor of its file. */
export interface AssistantDraftRequest {
    proposal: RuleProposal;
    /** Changes on every request, so the same proposal can be applied again. */
    nonce: number;
}
