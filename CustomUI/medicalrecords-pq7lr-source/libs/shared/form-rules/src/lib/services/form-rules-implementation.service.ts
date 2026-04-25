/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { FormService, FormRulesEvent, FormRulesManager, FormEvent, FormModel } from '@alfresco/adf-core';
import { inject, Injectable } from '@angular/core';
import { takeUntil } from 'rxjs';
import { FIELD_PREFIX, FormRuleEventPayload, FormRules, FORM_PREFIX, VARIABLE_PREFIX } from '../model/form-rules.model';
import { ActionData, FormProcessFinishEventData } from './interfaces';
import { VariableResolverService } from './variable-resolver/variable-resolver.service';
import { FieldActionsService } from './actions/field-actions.service';
import { FormActionsService } from './actions/form-action.service';
import { VariableActionsService } from './actions/variable.action.service';
import { StartProcessActionService } from './actions/start-process/start-process-action.service';
import { EventFiltersService } from './event-filters/event-filters.service';
import { OrphanedLinkedProcessesService } from './actions/orphaned-linked-processes/orphaned-linked-processes.service';

@Injectable({
    providedIn: 'root',
})
export class FormRulesImplementationService extends FormRulesManager<FormRules> {
    private readonly fieldActionsService = inject(FieldActionsService);
    private readonly formActionService = inject(FormActionsService);
    private readonly variableActionService = inject(VariableActionsService);
    private readonly startProcessActionService = inject(StartProcessActionService);
    private readonly orphanedLinkedProcessesService = inject(OrphanedLinkedProcessesService);

    private readonly eventFiltersService = inject(EventFiltersService);
    private readonly variableResolver = inject(VariableResolverService);

    constructor() {
        const formService = inject(FormService);

        super(formService);
    }

    override initialize(formModel: FormModel): void {
        super.initialize(formModel);

        this.orphanedLinkedProcessesService.clearOrphanedProcessesIds();
        this.startProcessActionService.startListenerForProcessChangeIfNeeded();

        this.startProcessActionService.onProcessFinishTrigger$.pipe(takeUntil(this.onDestroy$)).subscribe((processData) => {
            const onFormLoadedEvent = new FormEvent(this.formModel);
            const formRules = new FormRulesEvent('onProcessFinish', onFormLoadedEvent);
            const onProcessFinishRule = new FormRulesEvent('onProcessFinish', formRules);

            this.handleRuleEvent(onProcessFinishRule, this.getRules(), processData);
        });
    }

    protected getEventKeys(rules: any): string[] {
        return Object.keys(rules.form);
    }

    protected getRules(): FormRules {
        return this.formModel?.json?.rules;
    }

    protected handleRuleEvent(event: FormRulesEvent, rules: FormRules, data?: FormProcessFinishEventData): void {
        this.formModel = event.form;
        this.variableResolver.clearContext();

        const eventType = event.type;
        let rulesPayload: FormRuleEventPayload[];

        if (eventType) {
            rulesPayload = event.field ? rules?.fields?.[event.field?.id]?.[eventType] || [] : rules?.form?.[eventType] || [];

            for (const rulePayload of rulesPayload) {
                const filterResult = this.eventFiltersService.eventMatchesRule(event, rulePayload.filter, data);

                this.executeActions(event, rulePayload.actions, filterResult, data);
            }
        }
    }

    private executeActions(event: FormRulesEvent, actions: ActionData[], filterMatched: boolean, data?: FormProcessFinishEventData): void {
        if (!actions?.length) {
            return;
        }

        for (const action of actions) {
            this.executeAction(action, event, filterMatched, data);
        }
    }

    private executeAction(action: ActionData, event: FormRulesEvent, filterMatched: boolean, data?: FormProcessFinishEventData): void {
        switch (true) {
            case this.isFormAction(action) && filterMatched: {
                this.formActionService.execute(action, event.form);
                break;
            }
            case this.isVariableAction(action) && filterMatched: {
                this.variableActionService.execute(action, event, data);
                break;
            }
            case this.isFieldAction(action): {
                this.fieldActionsService.execute(action, event, filterMatched, data);
                break;
            }
            case this.isToggleSpinnerAction(action): {
                this.formActionService.toggleSpinnerEvent(action);
                break;
            }
            case this.startProcessActionService.isStartProcessAction(action) && filterMatched: {
                const isStartProcessEventOnFieldChange = !!event.field;
                const isFieldValid = !!event.field?.isValid;

                if (isStartProcessEventOnFieldChange && !isFieldValid) {
                    return;
                }

                this.startProcessActionService.startProcessAction(action, event);
                break;
            }
        }
    }

    private isFormAction(action: ActionData): boolean {
        return action.target.startsWith(FORM_PREFIX);
    }

    private isVariableAction(action: ActionData): boolean {
        return action.target.startsWith(VARIABLE_PREFIX);
    }

    private isFieldAction(action: ActionData): boolean {
        return action.target.startsWith(FIELD_PREFIX);
    }

    private isToggleSpinnerAction(action: ActionData): boolean {
        return action.target === 'toggleSpinner';
    }
}
