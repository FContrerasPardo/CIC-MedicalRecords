import { Injectable } from '@angular/core';
import { RuleAssistantEngine, RuleAssistantRequest, RuleAssistantResult } from './rule-assistant.model';
import { interpretRuleRequest } from './rule-assistant.util';

const THINKING_MS = 700;

/**
 * Simulated rules assistant: keyword rules, deterministic, no AI and no network. It is the default
 * `RULE_ASSISTANT_ENGINE`; an Agent Builder agent returning the same structure replaces it later
 * (`docs/automate/agents/reglas-convenio.agent.json`) without touching the panel.
 */
@Injectable({ providedIn: 'root' })
export class SimulatedRuleAssistantService implements RuleAssistantEngine {
    readonly simulated = true;

    async interpret(request: RuleAssistantRequest): Promise<RuleAssistantResult> {
        // A short processing time, like an agent call, so the conversation reads naturally.
        await new Promise((resolve) => setTimeout(resolve, THINKING_MS));
        return interpretRuleRequest(request);
    }
}
