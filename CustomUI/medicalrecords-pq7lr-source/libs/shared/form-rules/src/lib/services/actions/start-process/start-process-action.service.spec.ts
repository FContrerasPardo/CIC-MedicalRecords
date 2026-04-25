/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import {
    START_PROCESS_DEBOUNCE_TIME,
    START_PROCESS_TARGET,
    StartProcessAction,
    StartProcessActionService,
    WsProcessInstanceCloud,
} from './start-process-action.service';
import { MockProvider } from 'ng-mocks';
import { AppConfigService, FormEvent, FormModel, FormRulesEvent, IdentityUserService, JwtHelperService } from '@alfresco/adf-core';
import { AdfHttpClient } from '@alfresco/adf-core/api';
import {
    StartProcessCloudService,
    NotificationCloudService,
    ProcessDefinitionCloud,
    ProcessPayloadCloud,
    ProcessInstanceCloud,
    ProcessInstanceVariable,
} from '@alfresco/adf-process-services-cloud';
import { Subject, of, firstValueFrom, BehaviorSubject } from 'rxjs';
import { DEFAULT_FORM_RULES_CONFIGURATION, FORM_RULES_CONFIGURATION, FormRulesConfiguration } from '../../form-rules-configuration';
import { TASK_FORM_TYPE } from '../../../constants/constants';
import { FeaturesServiceToken, IFeaturesService, provideMockFeatureFlags } from '@alfresco/adf-core/feature-flags';
import { SHARED_HXP } from '@features';
import { FormProcessFinishEventData } from '../../interfaces';
import { OrphanedLinkedProcessesService } from '../orphaned-linked-processes/orphaned-linked-processes.service';

type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends Array<any> ? T[K] : DeepPartial<T[K]>;
};

const getStartProcessAction = (action: DeepPartial<StartProcessAction> = {}): StartProcessAction => {
    return {
        target: action.target ?? START_PROCESS_TARGET,
        payload: {
            correlationKey: 'corelation-key',
            processName: 'fetch-data-0',
            ...action.payload,
        },
    };
};

const MOCK_LINKED_PROCESS_INSTANCE_ID = 'linked-process-instance-id';

const getFormRulesEvent = (): FormRulesEvent => {
    const formModel = new FormModel({
        processInstanceId: MOCK_LINKED_PROCESS_INSTANCE_ID,
    });
    const onFormLoadedEvent = new FormEvent(formModel);
    const formRulesEvent = new FormRulesEvent('formLoaded', onFormLoadedEvent);

    return formRulesEvent;
};

const getProcessDefinitions = (): ProcessDefinitionCloud[] => {
    const definitions = Array.from({ length: 10 })
        .fill('', 0, 10)
        .map(
            (_val, i) =>
                new ProcessDefinitionCloud({
                    key: `fetch-data-${i}`,
                    name: `fetch-data-${i}`,
                })
        );

    return definitions;
};

describe('StartProcessEventService', () => {
    const appName = 'app-name';
    const userName = 'user-name';
    const MOCK_USER_ID = 'user-id';

    let startProcessActionService: StartProcessActionService;
    let startProcessCloudService: StartProcessCloudService;
    let orphanedLinkedProcessesService: OrphanedLinkedProcessesService;
    let featuresService: IFeaturesService;

    let formRulesConfiguration$: BehaviorSubject<FormRulesConfiguration>;
    let notificationCloudService: NotificationCloudService;
    let adfHttpClient: AdfHttpClient;
    let processInstanceId: string;
    let processDefinitions: ProcessDefinitionCloud[] = [];
    let processInstance: ProcessInstanceCloud;
    let processInstanceVariable: ProcessInstanceVariable;
    let wsNotificationSubject$: Subject<{
        data: {
            engineEvents: WsProcessInstanceCloud[];
        };
    }>;

    function triggerWsProcessFinishedEvents(events: WsProcessInstanceCloud[]): void {
        wsNotificationSubject$.next({
            data: {
                engineEvents: [...events],
            },
        });
    }

    beforeEach(() => {
        formRulesConfiguration$ = new BehaviorSubject<FormRulesConfiguration>(DEFAULT_FORM_RULES_CONFIGURATION);
        processInstanceId = 'process-instance-id';
        processDefinitions = getProcessDefinitions();

        processInstance = {
            id: processInstanceId,
            appName: appName,
            name: processDefinitions[0].name,
        };

        processInstanceVariable = {
            id: 1,
            processInstanceId,
            appName,
            name: 'processVariable',
            processDefinitionKey: 'processDefinitionKey',
            value: 'user name',
            createTime: '2024-05-17T13:01:33.876+0000',
            lastUpdatedTime: '2024-05-17T13:01:33.876+0000',
            variableDefinitionId: 'variableDefinitionId',
            markedAsDeleted: false,
            serviceFullName: 'serviceFullName',
            serviceName: 'serviceName',
            serviceVersion: 'serviceVersion',
            taskVariable: false,
            type: 'type',
        };

        wsNotificationSubject$ = new Subject<any>();

        TestBed.configureTestingModule({
            providers: [
                StartProcessActionService,
                provideMockFeatureFlags({
                    [SHARED_HXP.STUDIO_LINKED_PROCESSES]: true,
                }),
                MockProvider(AppConfigService, {
                    get() {
                        return [{ name: appName }] as any;
                    },
                }),
                MockProvider(OrphanedLinkedProcessesService),
                MockProvider(NotificationCloudService, {
                    makeGQLQuery() {
                        return wsNotificationSubject$;
                    },
                }),
                MockProvider(StartProcessCloudService, {
                    getProcessDefinitions: jest.fn().mockReturnValue(of(processDefinitions)),
                    startProcess() {
                        return of(processInstance);
                    },
                }),
                MockProvider(IdentityUserService, {
                    getCurrentUserInfo() {
                        return {
                            username: userName,
                        };
                    },
                }),
                MockProvider(JwtHelperService, {
                    getValueFromLocalIdToken<T>(key: string): T {
                        return (key === 'sub' ? MOCK_USER_ID : '') as T;
                    },
                }),
                MockProvider(AdfHttpClient, {
                    get() {
                        return Promise.resolve({
                            list: {
                                entries: [
                                    {
                                        entry: processInstanceVariable,
                                    },
                                ],
                            },
                        }) as any;
                    },
                }),
                MockProvider(FORM_RULES_CONFIGURATION, formRulesConfiguration$, 'useValue'),
            ],
        });

        startProcessActionService = TestBed.inject(StartProcessActionService);
        startProcessCloudService = TestBed.inject(StartProcessCloudService);
        notificationCloudService = TestBed.inject(NotificationCloudService);
        orphanedLinkedProcessesService = TestBed.inject(OrphanedLinkedProcessesService);
        featuresService = TestBed.inject(FeaturesServiceToken);
        adfHttpClient = TestBed.inject(AdfHttpClient);

        jest.useFakeTimers();
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    it('should start subscription on start process', () => {
        const makeGQLQuerySpy = jest.spyOn(notificationCloudService, 'makeGQLQuery');

        startProcessActionService.startProcessAction(getStartProcessAction(), getFormRulesEvent());

        jest.advanceTimersByTime(START_PROCESS_DEBOUNCE_TIME);

        expect(makeGQLQuerySpy).toHaveBeenCalledWith(
            appName,
            `
                subscription {
                    engineEvents(eventType: [PROCESS_COMPLETED]) {
                        eventType
                        entity
                        processDefinitionKey
                    }
                }
                `
        );
    });

    it('should start subscription on start process with actor filter', () => {
        formRulesConfiguration$.next({
            listenForProcessCreatedByActor: true,
        });

        const makeGQLQuerySpy = jest.spyOn(notificationCloudService, 'makeGQLQuery');

        startProcessActionService.startProcessAction(getStartProcessAction(), getFormRulesEvent());

        jest.advanceTimersByTime(START_PROCESS_DEBOUNCE_TIME);

        expect(makeGQLQuerySpy).toHaveBeenCalledWith(
            appName,
            `
                subscription {
                    engineEvents(eventType: [PROCESS_COMPLETED], actor: ["${MOCK_USER_ID}"]) {
                        eventType
                        entity
                        processDefinitionKey
                    }
                }
                `
        );
    });

    it('should NOT create WS subscription when we disabled it in configuration', () => {
        formRulesConfiguration$.next({
            disableListeningForProcessFinish: true,
        });

        const makeGQLQuerySpy = jest.spyOn(notificationCloudService, 'makeGQLQuery');

        startProcessActionService.startProcessAction(getStartProcessAction(), getFormRulesEvent());

        jest.advanceTimersByTime(START_PROCESS_DEBOUNCE_TIME);

        expect(makeGQLQuerySpy).not.toHaveBeenCalled();
    });

    it('should NOT create new WS subscription when we already subscribed', () => {
        const makeGQLQuerySpy = jest.spyOn(notificationCloudService, 'makeGQLQuery');

        const startProcessAction = getStartProcessAction();
        const formsRulesEvent = getFormRulesEvent();

        const nextStartProcessAction = getStartProcessAction({ payload: { correlationKey: 'new-corelation-key' } });
        const nextFormsRulesEvent = getFormRulesEvent();

        startProcessActionService.startProcessAction(startProcessAction, formsRulesEvent);
        startProcessActionService.startProcessAction(nextStartProcessAction, nextFormsRulesEvent);
        jest.advanceTimersByTime(START_PROCESS_DEBOUNCE_TIME);

        expect(makeGQLQuerySpy).toHaveBeenCalledTimes(1);
    });

    it('should NOT start listening for the process completion when a subscription is already active', () => {
        const startProcessAction = getStartProcessAction();
        const formsRulesEvent = getFormRulesEvent();

        startProcessActionService.startProcessAction(startProcessAction, formsRulesEvent);
        jest.advanceTimersByTime(START_PROCESS_DEBOUNCE_TIME);

        const makeGQLQuerySpy = jest.spyOn(notificationCloudService, 'makeGQLQuery');

        startProcessActionService.startListenerForProcessChangeIfNeeded();

        expect(makeGQLQuerySpy).toHaveBeenCalledTimes(0);
    });

    it('should NOT start listening for the process completion when the application name is NOT defined', () => {
        jest.replaceProperty(startProcessActionService, 'appName', undefined);
        const makeGQLQuerySpy = jest.spyOn(notificationCloudService, 'makeGQLQuery');

        startProcessActionService.startListenerForProcessChangeIfNeeded();

        expect(makeGQLQuerySpy).toHaveBeenCalledTimes(0);
    });

    it('should start process', () => {
        const startProcessServiceSpy = jest.spyOn(startProcessCloudService, 'startProcess');

        const startProcessAction = getStartProcessAction();
        const formsRulesEvent = getFormRulesEvent();

        const expectedPayload = new ProcessPayloadCloud({
            name: startProcessAction.payload.processName,
            processDefinitionKey: processDefinitions[0].key,
            variables: {},
            linkedProcessInstanceId: MOCK_LINKED_PROCESS_INSTANCE_ID,
            linkedProcessInstanceType: TASK_FORM_TYPE,
        });
        expect(startProcessCloudService.getProcessDefinitions).toHaveBeenCalledTimes(0);

        startProcessActionService.startProcessAction(startProcessAction, formsRulesEvent);
        jest.advanceTimersByTime(START_PROCESS_DEBOUNCE_TIME);

        expect(startProcessServiceSpy).toHaveBeenCalledWith(appName, expectedPayload);
        expect(startProcessCloudService.getProcessDefinitions).toHaveBeenCalledTimes(1);
    });

    it('should create process with no linked process data when FF is off', () => {
        jest.spyOn(featuresService, 'isOn$').mockReturnValue(of(false));

        const startProcessCloudRequestSpy = jest.spyOn(startProcessCloudService, 'startProcess');
        const addOrphanedProcessIdSpy = jest.spyOn(orphanedLinkedProcessesService, 'addOrphanedProcessId');

        const startProcessAction = getStartProcessAction();
        const formsRulesEvent = getFormRulesEvent();

        const expectedPayload = new ProcessPayloadCloud({
            name: startProcessAction.payload.processName,
            processDefinitionKey: processDefinitions[0].key,
            variables: {},
            linkedProcessInstanceId: undefined,
            linkedProcessInstanceType: undefined,
        });
        expect(startProcessCloudService.getProcessDefinitions).toHaveBeenCalledTimes(0);

        startProcessActionService.startProcessAction(startProcessAction, formsRulesEvent);
        jest.advanceTimersByTime(START_PROCESS_DEBOUNCE_TIME);

        expect(startProcessCloudRequestSpy).toHaveBeenCalledWith(appName, expectedPayload);
        expect(startProcessCloudService.getProcessDefinitions).toHaveBeenCalledTimes(1);
        expect(addOrphanedProcessIdSpy).not.toHaveBeenCalled();
    });

    it('should start process using processDefinitionId to match by key when provided', () => {
        const poolProcessDefinitions = [
            new ProcessDefinitionCloud({
                key: 'Process_Pool1_ABC123',
                name: 'shared-pool-name',
            }),
            new ProcessDefinitionCloud({
                key: 'Process_Pool2_XYZ789',
                name: 'shared-pool-name',
            }),
        ];

        jest.spyOn(startProcessCloudService, 'getProcessDefinitions').mockReturnValue(of(poolProcessDefinitions));
        const startProcessCloudServiceSpy = jest.spyOn(startProcessCloudService, 'startProcess');

        const startProcessAction = getStartProcessAction({
            payload: {
                processName: 'shared-pool-name',
                processDefinitionId: 'Process_Pool2_XYZ789',
            },
        });
        const formsRulesEvent = getFormRulesEvent();

        const expectedPayload = new ProcessPayloadCloud({
            name: startProcessAction.payload.processName,
            processDefinitionKey: 'Process_Pool2_XYZ789',
            variables: {},
            linkedProcessInstanceId: MOCK_LINKED_PROCESS_INSTANCE_ID,
            linkedProcessInstanceType: TASK_FORM_TYPE,
        });

        startProcessActionService.startProcessAction(startProcessAction, formsRulesEvent);
        jest.advanceTimersByTime(START_PROCESS_DEBOUNCE_TIME);

        expect(startProcessCloudServiceSpy).toHaveBeenCalledWith(appName, expectedPayload);
    });

    it('should fall back to processName matching when processDefinitionId is not provided', () => {
        const mixedProcessDefinitions = [
            new ProcessDefinitionCloud({
                key: 'unique-process-key',
                name: 'unique-process-name',
            }),
            new ProcessDefinitionCloud({
                key: 'another-key',
                name: 'another-name',
            }),
        ];

        jest.spyOn(startProcessCloudService, 'getProcessDefinitions').mockReturnValue(of(mixedProcessDefinitions));
        const startProcessServiceSpy = jest.spyOn(startProcessCloudService, 'startProcess');

        const startProcessAction = getStartProcessAction({
            payload: {
                processName: 'unique-process-name',
            },
        });
        const formsRulesEvent = getFormRulesEvent();

        const expectedPayload = new ProcessPayloadCloud({
            name: 'unique-process-name',
            processDefinitionKey: 'unique-process-key',
            variables: {},
            linkedProcessInstanceId: MOCK_LINKED_PROCESS_INSTANCE_ID,
            linkedProcessInstanceType: TASK_FORM_TYPE,
        });

        startProcessActionService.startProcessAction(startProcessAction, formsRulesEvent);
        jest.advanceTimersByTime(START_PROCESS_DEBOUNCE_TIME);

        expect(startProcessServiceSpy).toHaveBeenCalledWith(appName, expectedPayload);
    });

    it('should start process with variables', () => {
        const startProcessCloudRequestSpy = jest.spyOn(startProcessCloudService, 'startProcess');

        const startProcessAction = getStartProcessAction({
            payload: {
                inputs: ['USERNAME'],
            },
        });

        const formsRulesEvent = getFormRulesEvent();

        const expectedPayload = new ProcessPayloadCloud({
            name: startProcessAction.payload.processName,
            processDefinitionKey: processDefinitions[0].key,
            variables: {
                USERNAME: 'user-name',
            },
            linkedProcessInstanceId: MOCK_LINKED_PROCESS_INSTANCE_ID,
            linkedProcessInstanceType: TASK_FORM_TYPE,
        });

        startProcessActionService.startProcessAction(startProcessAction, formsRulesEvent);
        jest.advanceTimersByTime(START_PROCESS_DEBOUNCE_TIME);

        expect(startProcessCloudRequestSpy).toHaveBeenCalledWith(appName, expectedPayload);
    });

    it('should add orphaned process id if form does not have assigned any process', () => {
        const createdProcessInstanceId: ProcessInstanceCloud = {
            id: 'created-process-instance-id',
        };
        jest.spyOn(startProcessCloudService, 'startProcess').mockReturnValue(of(createdProcessInstanceId));

        const addOrphanedProcessIdSpy = jest.spyOn(orphanedLinkedProcessesService, 'addOrphanedProcessId');

        const formRulesEvent = getFormRulesEvent();
        formRulesEvent.form.json.processInstanceId = undefined;
        startProcessActionService.startProcessAction(getStartProcessAction(), formRulesEvent);
        jest.advanceTimersByTime(START_PROCESS_DEBOUNCE_TIME);

        expect(addOrphanedProcessIdSpy).toHaveBeenCalledWith('created-process-instance-id');
    });

    it('should not add orphaned process id if form has assigned process', () => {
        const createdProcessInstanceId: ProcessInstanceCloud = {
            id: 'created-process-instance-id',
        };
        jest.spyOn(startProcessCloudService, 'startProcess').mockReturnValue(of(createdProcessInstanceId));

        const addOrphanedProcessIdSpy = jest.spyOn(orphanedLinkedProcessesService, 'addOrphanedProcessId');

        startProcessActionService.startProcessAction(getStartProcessAction(), getFormRulesEvent());
        jest.advanceTimersByTime(START_PROCESS_DEBOUNCE_TIME);

        expect(addOrphanedProcessIdSpy).not.toHaveBeenCalledWith('created-process-instance-id');
    });

    it('should start process when application name is defined', () => {
        jest.replaceProperty(startProcessActionService, 'appName', 'mockAppName');
        const onProcessStartTrigger = jest.spyOn(startProcessActionService.onProcessStartTrigger$, 'next');

        startProcessActionService.startProcessAction(getStartProcessAction(), getFormRulesEvent());

        expect(onProcessStartTrigger).toHaveBeenCalledTimes(1);
    });

    it('should NOT start process when application name is NOT defined', () => {
        jest.replaceProperty(startProcessActionService, 'appName', undefined);
        const onProcessStartTrigger = jest.spyOn(startProcessActionService.onProcessStartTrigger$, 'next');

        startProcessActionService.startProcessAction(getStartProcessAction(), getFormRulesEvent());

        expect(onProcessStartTrigger).toHaveBeenCalledTimes(0);
    });

    it('should emit value on process finish', async () => {
        const startProcessAction = getStartProcessAction();
        const formsRulesEvent = getFormRulesEvent();

        const expectedData: FormProcessFinishEventData = {
            process: {
                processInstanceId,
                correlationKey: 'corelation-key',
                variable: {
                    [processInstanceVariable.name]: processInstanceVariable,
                },
            },
        };

        startProcessActionService.startProcessAction(startProcessAction, formsRulesEvent);
        jest.advanceTimersByTime(START_PROCESS_DEBOUNCE_TIME);

        const processFinishPromise = firstValueFrom(startProcessActionService.onProcessFinishTrigger$);

        const wsEngineEvent: WsProcessInstanceCloud = {
            entity: processInstance,
        };

        triggerWsProcessFinishedEvents([wsEngineEvent]);

        const data = await processFinishPromise;

        expect(data).toEqual(expectedData);
    });

    it('should fetch process variable only for process started from current form', async () => {
        const startProcessAction = getStartProcessAction();
        const formsRulesEvent = getFormRulesEvent();
        const adfGetSpy = jest.spyOn(adfHttpClient, 'get');

        const expectedData: FormProcessFinishEventData = {
            process: {
                processInstanceId,
                correlationKey: 'corelation-key',
                variable: {
                    [processInstanceVariable.name]: processInstanceVariable,
                },
            },
        };

        const processFinishPromise = firstValueFrom(startProcessActionService.onProcessFinishTrigger$);

        startProcessActionService.startProcessAction(startProcessAction, formsRulesEvent);
        jest.advanceTimersByTime(START_PROCESS_DEBOUNCE_TIME);

        const wsEngineEventWithExternalProcess: WsProcessInstanceCloud = {
            entity: {
                ...processInstance,
                id: `${processInstance.id}-other-external-process`,
            },
        };

        const wsEngineEvent: WsProcessInstanceCloud = {
            entity: processInstance,
        };

        triggerWsProcessFinishedEvents([wsEngineEvent, wsEngineEventWithExternalProcess]);

        const data = await processFinishPromise;

        expect(data).toEqual(expectedData);
        expect(adfGetSpy).toHaveBeenCalledTimes(1);
    });
});
