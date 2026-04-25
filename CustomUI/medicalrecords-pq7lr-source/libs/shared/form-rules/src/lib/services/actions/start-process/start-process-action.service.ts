/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable, inject } from '@angular/core';
import {
    NotificationCloudService,
    ProcessInstanceCloud,
    ProcessInstanceVariable,
    ProcessPayloadCloud,
    StartProcessCloudService,
} from '@alfresco/adf-process-services-cloud';
import { catchError, debounce, filter, map, mergeMap, switchMap, take, tap } from 'rxjs/operators';
import { Subject, Observable, combineLatest, from, of, timer, EMPTY } from 'rxjs';
import { AppConfigService, FormRulesEvent, IdentityUserService, JwtHelperService } from '@alfresco/adf-core';
import { AdfHttpClient } from '@alfresco/adf-core/api';
import { ActionData, ProcessExecutionContext, FormProcessFinishEventData } from '../../interfaces';
import { VariableResolverService } from '../../variable-resolver/variable-resolver.service';
import { DEFAULT_FORM_RULES_CONFIGURATION, FORM_RULES_CONFIGURATION, FormRulesConfiguration } from '../../form-rules-configuration';
import { TASK_FORM_TYPE } from '../../../constants/constants';
import { SHARED_HXP } from '@features';
import { FeaturesServiceToken } from '@alfresco/adf-core/feature-flags';
import { OrphanedLinkedProcessesService } from '../orphaned-linked-processes/orphaned-linked-processes.service';

type CorrelationKey = string;
type ProcessInstanceId = string;
type SupportedVariables = 'USERNAME';

export interface StartProcessVariableInputs {
    [key: string]: string | boolean | number;
}

export interface ProcessVariableInputs {
    [key: string]: string;
}

export type ProcessInputs = (SupportedVariables | ProcessVariableInputs)[];

export interface StartProcessAction extends ActionData {
    target: typeof START_PROCESS_TARGET;
    payload: {
        correlationKey: string;
        processName: string;
        processDefinitionId?: string;
        inputs?: ProcessInputs;
    };
}

export const START_PROCESS_TARGET = 'startProcess';

export interface WsProcessInstanceCloud {
    entity: ProcessInstanceCloud;
}

export const START_PROCESS_DEBOUNCE_TIME = 500;
export const GET_VARIABLES_RETRY_DELAY = 50;
export const GET_VARIABLES_RETRY_MAX_ATTEMPTS = 10;

@Injectable({
    providedIn: 'root',
})
export class StartProcessActionService {
    private readonly variableResolver = inject(VariableResolverService);
    private readonly startProcessCloudService = inject(StartProcessCloudService);
    private readonly notificationCloudService = inject(NotificationCloudService);
    private readonly appConfigService = inject(AppConfigService);
    private readonly adfHttpClient = inject(AdfHttpClient);
    private readonly identityUserService = inject(IdentityUserService);
    private readonly jwtHelperService = inject(JwtHelperService);
    private readonly formRulesConfiguration = inject(FORM_RULES_CONFIGURATION, { optional: true });
    private readonly featuresService = inject(FeaturesServiceToken);
    private readonly orphanedLinkedProcessesService = inject(OrphanedLinkedProcessesService);

    private appName = this.appConfigService.get<{ name: 'string' }[]>('alfresco-deployed-apps')?.[0]?.name;
    private contextRoot = this.appConfigService.get('bpmHost', '');
    private notificationSubscription$: Observable<any>;

    private processExecutionContext: Map<CorrelationKey, ProcessExecutionContext> = new Map();
    // Map of started process instances, process instance may not be completed yet
    private createdProcessInstances: Map<CorrelationKey, ProcessInstanceCloud> = new Map();
    // Completed process instances details with variables
    private completedProcessInstanceDetails: Map<ProcessInstanceId, ProcessInstanceCloud> = new Map();
    // Every time when ws notify us that process is completed, its id is stored here
    private completedProcessInstanceIds: string[] = [];

    private get isSubscriptionAlreadyStarted(): boolean {
        return !!this.notificationSubscription$;
    }

    // Verify if we have all data needed to fetch process variables
    // e.g. sometimes we can receive ws notification before created process instance response
    private onProcessCompleteTriggerSubject$ = new Subject<void>();

    get configuration(): Observable<FormRulesConfiguration> {
        return this.formRulesConfiguration ?? of(DEFAULT_FORM_RULES_CONFIGURATION);
    }

    onProcessFinishTrigger$ = this.onProcessCompleteTriggerSubject$.asObservable().pipe(
        switchMap(() => {
            return this.fetchingVariablesFromProcessesUsedOnTheForm();
        }),
        map(() => {
            return this.buildResultEventData();
        }),
        filter((resolvedProcessVariables): resolvedProcessVariables is FormProcessFinishEventData[] => {
            return !!resolvedProcessVariables;
        }),
        switchMap((resolvedProcessVariables) => {
            this.cleanFiredEvents(resolvedProcessVariables);

            return from(resolvedProcessVariables);
        })
    );

    onProcessStartTrigger$ = new Subject<{ action: StartProcessAction; event: FormRulesEvent }>();

    constructor() {
        this.onProcessStartTrigger$
            .pipe(
                debounce(({ event }) => (event.type === 'fieldValueChanged' ? timer(START_PROCESS_DEBOUNCE_TIME) : timer(0))),
                mergeMap(({ action, event }) => {
                    return combineLatest([this.startProcess(action, event), of({ action })]);
                })
            )
            .subscribe(([processInstance, { action }]) => {
                this.createdProcessInstances.set(action.payload.correlationKey, processInstance);
                this.onProcessCompleteTriggerSubject$.next();
            });
    }

    startProcessAction(action: StartProcessAction, event: FormRulesEvent): void {
        if (!this.appName) {
            return;
        }

        // Triggering via subject to allow debouncing
        this.onProcessStartTrigger$.next({ action, event });
    }

    isStartProcessAction(action: ActionData): action is StartProcessAction {
        return action.target === 'startProcess';
    }

    startListenerForProcessChangeIfNeeded(): void {
        if (this.isSubscriptionAlreadyStarted || !this.appName) {
            return;
        }

        this.configuration
            .pipe(take(1))
            .pipe(
                switchMap((configuration) => {
                    if (configuration.disableListeningForProcessFinish) {
                        return EMPTY;
                    }

                    this.notificationSubscription$ = this.notificationCloudService.makeGQLQuery(
                        this.appName,
                        this.getSubscriptionQuery(!!configuration.listenForProcessCreatedByActor)
                    );

                    return this.notificationSubscription$;
                }),
                map((wsEvent) => {
                    return (wsEvent.data as any).engineEvents;
                })
            )
            .subscribe((eventEntities: WsProcessInstanceCloud[]) => {
                const eventsIds = eventEntities.map((event) => {
                    return event.entity.id;
                });

                this.completedProcessInstanceIds.push(...eventsIds);
                this.onProcessCompleteTriggerSubject$.next();
            });
    }

    private getSubscriptionQuery(useActor: boolean): string {
        let actorFilter = '';
        const eventType = 'eventType: [PROCESS_COMPLETED]';

        if (useActor) {
            const userId = this.jwtHelperService.getValueFromLocalIdToken<string>('sub');
            actorFilter = `actor: ["${userId}"]`;
        }

        // e.g. eventType: [PROCESS_COMPLETED], actor: ["abcd-qwerty-abcd"]
        const engineEvents = [eventType, actorFilter].join(', ').trim().replace(/,\s*$/, '');

        const subscriptionQuery = `
                subscription {
                    engineEvents(${engineEvents}) {
                        eventType
                        entity
                        processDefinitionKey
                    }
                }
                `;

        return subscriptionQuery;
    }

    private startProcess(action: StartProcessAction, event: FormRulesEvent): Observable<ProcessInstanceCloud> {
        return this.startProcessCloudService.getProcessDefinitions(this.appName).pipe(
            tap(() => {
                this.processExecutionContext.set(action.payload.correlationKey, {
                    action,
                    event,
                });
                this.startListenerForProcessChangeIfNeeded();
            }),
            map((processDefinitions) => {
                return processDefinitions.filter((processDefinition) => {
                    if (action.payload.processDefinitionId) {
                        return processDefinition.key === action.payload.processDefinitionId;
                    }
                    return processDefinition.name === action.payload.processName;
                });
            }),
            switchMap((processDefinitions) => {
                return combineLatest([of(processDefinitions), this.featuresService.isOn$(SHARED_HXP.STUDIO_LINKED_PROCESSES)]);
            }),
            switchMap(([processDefinitions, isStudioLinkedProcessesEnabled]) => {
                const processVariables = this.getStartProcessVariables(action, event);

                const formHasProcessInstanceAssigned = !!event.form.json.processInstanceId;

                const payload = new ProcessPayloadCloud({
                    name: action.payload.processName,
                    processDefinitionKey: processDefinitions[0]?.key,
                    variables: processVariables,
                    linkedProcessInstanceId: isStudioLinkedProcessesEnabled ? event.form.json.processInstanceId : undefined,
                    linkedProcessInstanceType: isStudioLinkedProcessesEnabled ? TASK_FORM_TYPE : undefined,
                });

                return this.startProcessCloudService.startProcess(this.appName, payload).pipe(
                    catchError(() => EMPTY),
                    tap((processInstance) => {
                        if (isStudioLinkedProcessesEnabled && !formHasProcessInstanceAssigned) {
                            this.orphanedLinkedProcessesService.addOrphanedProcessId(processInstance.id);
                        }
                    })
                );
            }),
            take(1)
        );
    }

    private getStartProcessVariables(action: ActionData, event: FormRulesEvent): StartProcessVariableInputs {
        const variables: StartProcessVariableInputs = {};
        const inputs = action.payload['inputs'] ?? ([] as ProcessInputs);

        const supportedStaticVariables = inputs.filter((input) => typeof input === 'string') as SupportedVariables[];
        const dynamicVariables = inputs.find((input) => typeof input === 'object') as ProcessVariableInputs | undefined;

        for (const input of supportedStaticVariables) {
            variables[input] = this.getVariableInput(input);
        }

        if (dynamicVariables) {
            const variableEntries = Object.entries(dynamicVariables);

            for (const [variableName, value] of variableEntries) {
                variables[variableName] = this.variableResolver.resolveExpressionString(value, event, true);
            }
        }

        return variables;
    }

    private getVariableInput(variable: SupportedVariables): string {
        if (variable === 'USERNAME') {
            return this.identityUserService.getCurrentUserInfo().username ?? '';
        }

        return '';
    }

    private fetchingVariablesFromProcessesUsedOnTheForm(): Observable<WsProcessInstanceCloud[]> {
        const variableRequests: Observable<WsProcessInstanceCloud>[] = [];

        if (this.createdProcessInstances.size === 0 || this.completedProcessInstanceIds.length === 0) {
            return combineLatest(variableRequests);
        }

        const createdProcessInstancesList = [...this.createdProcessInstances.values()];

        for (const processIdToResolve of this.completedProcessInstanceIds) {
            const processReadyToResolve = createdProcessInstancesList.find((process) => {
                return process.id === processIdToResolve;
            });

            if (processReadyToResolve) {
                variableRequests.push(this.resolveProcessVariables(processReadyToResolve));
            }
        }

        return combineLatest(variableRequests);
    }

    private buildResultEventData(): FormProcessFinishEventData[] | undefined {
        if (this.createdProcessInstances.size === 0 || this.completedProcessInstanceDetails.size === 0) {
            return undefined;
        }

        const eventData: FormProcessFinishEventData[] = [];

        for (const [, { action }] of this.processExecutionContext) {
            const createdProcessByToCorrelationKey = this.createdProcessInstances.get(action.payload?.['correlationKey']);
            const finishedProcessWithVariablesAssigned = this.completedProcessInstanceDetails.get(createdProcessByToCorrelationKey?.id ?? '');

            const processVariables = finishedProcessWithVariablesAssigned?.variables ?? [];
            const variablesMap = processVariables.reduce<{ [name: string]: ProcessInstanceVariable }>((acc, variable) => {
                return {
                    ...acc,
                    [variable.name]: variable,
                };
            }, {});

            if (createdProcessByToCorrelationKey?.id && finishedProcessWithVariablesAssigned) {
                this.createdProcessInstances.delete(action.payload?.['correlationKey']);
                this.completedProcessInstanceDetails.delete(createdProcessByToCorrelationKey.id);

                eventData.push({
                    process: {
                        processInstanceId: createdProcessByToCorrelationKey.id,
                        correlationKey: action.payload?.['correlationKey'],
                        variable: variablesMap,
                    },
                });
            }
        }

        return eventData.length > 0 ? eventData : undefined;
    }

    private cleanFiredEvents(eventData: FormProcessFinishEventData[]): void {
        for (const event of eventData) {
            const {
                process: { correlationKey, processInstanceId },
            } = event;

            this.processExecutionContext.delete(correlationKey);
            this.createdProcessInstances.delete(correlationKey);
            this.completedProcessInstanceDetails.delete(processInstanceId);
        }
    }

    private resolveProcessVariables(process: ProcessInstanceCloud): Observable<WsProcessInstanceCloud> {
        return this.fetchWithRetry(process.id).pipe(
            map<any, WsProcessInstanceCloud>((restVariables) => {
                return {
                    entity: {
                        ...process,
                        variables: restVariables?.list?.entries?.map((e) => e.entry) ?? [],
                    },
                };
            }),
            tap((resolvedProcess) => {
                this.completedProcessInstanceIds = this.completedProcessInstanceIds.filter((id) => id === resolvedProcess?.entity?.id);
                this.completedProcessInstanceDetails.set(resolvedProcess.entity.id, resolvedProcess.entity);
            })
        );
    }

    private fetchWithRetry(processId: string, attempt = 0): Observable<any> {
        const url = `${this.contextRoot}/${this.appName}/query/v1/process-instances/${processId}/variables`;

        return from(this.adfHttpClient.get(url)).pipe(
            switchMap((response: any) => {
                const entriesCount = response?.list?.entries?.length || 0;

                const hasData = entriesCount > 0;
                if (hasData || attempt >= GET_VARIABLES_RETRY_MAX_ATTEMPTS) {
                    return of(response);
                }

                return timer(GET_VARIABLES_RETRY_DELAY).pipe(switchMap(() => this.fetchWithRetry(processId, attempt + 1)));
            })
        );
    }
}
