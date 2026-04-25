/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { DestroyRef } from '@angular/core';
import { MockProvider } from 'ng-mocks';
import { Observable, of, Subject } from 'rxjs';
import { ValidationProcessService } from './validation-process.service';
import {
    NotificationCloudService,
    ProcessInstanceCloud,
    ProcessInstanceVariable,
    StartProcessCloudService,
} from '@alfresco/adf-process-services-cloud';
import { IdpFieldDataType, IdpVerificationStatus } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { IdpField, IdpTable, IdpValidationStatus } from '../../models/screen-models';
import { AdfHttpClient } from '@alfresco/adf-core/api';
import { AppConfigService } from '@alfresco/adf-core';
import { ValidationProcessResults } from '../../models/validation-models';

describe('ValidationProcessService', () => {
    const appName = 'app-name';
    const processInstanceId = 'process-instance-id';
    const processName = 'process-name';
    const processId = 'process-id';
    const validatorName = 'validator-name';
    let validationProcessService: ValidationProcessService;
    let startProcessCloudService: StartProcessCloudService;
    let adfHttpClient: AdfHttpClient;
    let processInstance: ProcessInstanceCloud;
    let processInstanceVariable: ProcessInstanceVariable;
    let wsNotificationSubject$: Subject<{
        data: {
            engineEvents: { eventType: string; entity: { id: string } }[];
        };
    }>;

    const mockFields: IdpField[] = [
        {
            id: 'field1',
            name: 'Invoice Number',
            value: 'INV-001',
            dataType: IdpFieldDataType.Text,
            format: 'string',
            confidence: 0.95,
            verificationStatus: IdpVerificationStatus.AutoValid,
            validationStatus: IdpValidationStatus.Valid,
            isSelected: false,
            hasIssue: false,
        },
        {
            id: 'field2',
            name: 'Total Amount',
            value: '1000.00',
            dataType: IdpFieldDataType.Text,
            format: 'string',
            confidence: 0.85,
            verificationStatus: IdpVerificationStatus.AutoInvalid,
            validationStatus: IdpValidationStatus.Valid,
            isSelected: false,
            hasIssue: true,
        },
    ];

    const mockTables: IdpTable[] = [
        {
            id: 'table1',
            name: 'Line Items',
            columnHeaderNames: ['Item', 'Quantity', 'Price'],
            rows: [
                {
                    rowCells: [
                        {
                            id: 'cell1',
                            name: 'Item',
                            value: 'Product A',
                            dataType: IdpFieldDataType.Text,
                            format: '',
                            confidence: 0.9,
                            verificationStatus: IdpVerificationStatus.AutoValid,
                            validationStatus: IdpValidationStatus.Valid,
                            tableId: 'table1',
                        },
                        {
                            id: 'cell2',
                            name: 'Quantity',
                            value: '5',
                            dataType: IdpFieldDataType.Text,
                            format: '',
                            confidence: 0.9,
                            verificationStatus: IdpVerificationStatus.AutoValid,
                            validationStatus: IdpValidationStatus.Valid,
                            tableId: 'table1',
                        },
                        {
                            id: 'cell3',
                            name: 'Price',
                            value: '100.00',
                            dataType: IdpFieldDataType.Text,
                            format: '',
                            confidence: 0.9,
                            verificationStatus: IdpVerificationStatus.AutoValid,
                            validationStatus: IdpValidationStatus.Valid,
                            tableId: 'table1',
                        },
                    ],
                },
            ],
            validationStatus: IdpValidationStatus.Valid,
            isDirty: false,
        },
    ];

    beforeEach(() => {
        processInstance = {
            id: processInstanceId,
            appName: appName,
            name: processName,
        };

        processInstanceVariable = {
            name: 'document',
            type: 'Json',
            value: {
                fields: [
                    {
                        name: mockFields[0].name,
                        value: mockFields[0].value,
                        type: mockFields[0].dataType,
                        status: IdpValidationStatus.Valid,
                    },
                    {
                        name: mockFields[1].name,
                        value: mockFields[1].value,
                        type: mockFields[1].dataType,
                        status: IdpValidationStatus.Invalid,
                    },
                ],
                tables: [
                    {
                        name: mockTables[0].name,
                        columnNames: mockTables[0].columnHeaderNames,
                        records: mockTables[0].rows.map((row) => ({
                            cells: row.rowCells.map((cell) => ({
                                value: cell.value,
                                pageIndex: 0,
                                type: cell.dataType,
                            })),
                        })),
                        status: IdpValidationStatus.Valid,
                    },
                ],
            },
        };

        wsNotificationSubject$ = new Subject<any>();

        TestBed.configureTestingModule({
            providers: [
                ValidationProcessService,
                provideMockStore({}),
                MockProvider(AppConfigService, {
                    get() {
                        return [{ name: appName }] as any;
                    },
                }),
                MockProvider(NotificationCloudService, {
                    makeGQLQuery() {
                        return wsNotificationSubject$;
                    },
                }),
                MockProvider(StartProcessCloudService, {
                    startProcess() {
                        return of(processInstance);
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
                { provide: DestroyRef, useValue: { onDestroy: () => of() } },
            ],
        });

        validationProcessService = TestBed.inject(ValidationProcessService);
        startProcessCloudService = TestBed.inject(StartProcessCloudService);
        adfHttpClient = TestBed.inject(AdfHttpClient);
    });

    it('should start a new validation process with field and table data and return validation results', (done) => {
        jest.spyOn(startProcessCloudService, 'startProcess');
        const validationProcessInfo = {
            appName: appName,
            processName: processName,
            processId: processId,
            validatorName: validatorName,
        };

        validationProcessService.runValidationProcess$(validationProcessInfo, 'Invoice Number', mockFields, mockTables).subscribe({
            next: (results: ValidationProcessResults) => {
                expect(startProcessCloudService.startProcess).toHaveBeenCalledWith(appName, {
                    businessKey: undefined,
                    linkedProcessInstanceId: undefined,
                    linkedProcessInstanceType: undefined,
                    payloadType: 'StartProcessPayload',
                    name: processName,
                    processDefinitionKey: processId,
                    variables: {
                        validator_name: validatorName,
                        triggering_field_name: 'Invoice Number',
                        document: {
                            fields: [
                                {
                                    name: mockFields[0].name,
                                    value: mockFields[0].value,
                                    type: mockFields[0].dataType,
                                    status: undefined,
                                },
                                {
                                    name: mockFields[1].name,
                                    value: mockFields[1].value,
                                    type: mockFields[1].dataType,
                                    status: undefined,
                                },
                            ],
                            tables: [
                                {
                                    name: 'Line Items',
                                    columnNames: ['Item', 'Quantity', 'Price'],
                                    status: undefined,
                                    records: [
                                        [
                                            { value: 'Product A', pageIndex: 0, type: IdpFieldDataType.Text },
                                            { value: '5', pageIndex: 0, type: IdpFieldDataType.Text },
                                            { value: '100.00', pageIndex: 0, type: IdpFieldDataType.Text },
                                        ],
                                    ],
                                },
                            ],
                        },
                    },
                });

                expect(results).toBeDefined();
                expect(results.fields).toBeDefined();
                expect(results.tables).toBeDefined();
                expect(results.fields?.length).toBe(2);
                expect(results.tables?.length).toBe(1);

                expect(results.fields?.[0].name).toBe('Invoice Number');
                expect(results.fields?.[0].status).toBe(IdpValidationStatus.Valid);
                expect(results.fields?.[1].name).toBe('Total Amount');
                expect(results.fields?.[1].status).toBe(IdpValidationStatus.Invalid);

                expect(results.tables?.[0].name).toBe('Line Items');
                expect(results.tables?.[0].status).toBe(IdpValidationStatus.Valid);
                done();
            },
            error: done.fail,
        });

        setTimeout(() => {
            wsNotificationSubject$.next({
                data: {
                    engineEvents: [
                        {
                            eventType: 'PROCESS_COMPLETED',
                            entity: { id: processInstanceId },
                        },
                    ],
                },
            });
        }, 10);
    });

    it('should use polling fallback when WebSocket notification is delayed', (done) => {
        jest.spyOn(adfHttpClient, 'get').mockImplementation((url: string) => {
            if (url.includes('/process-instances/')) {
                return url.includes('/variables')
                    ? (Promise.resolve({
                          list: {
                              entries: [{ entry: processInstanceVariable }],
                          },
                      }) as any)
                    : (Promise.resolve({
                          entry: {
                              id: processInstanceId,
                              status: 'COMPLETED',
                          },
                      }) as any);
            }
            return Promise.reject(new Error('Unexpected URL'));
        });

        const validationProcessInfo = {
            appName: appName,
            processName: processName,
            processId: processId,
            validatorName: validatorName,
        };

        validationProcessService.runValidationProcess$(validationProcessInfo, 'Invoice Number', mockFields, []).subscribe({
            next: () => {
                expect(adfHttpClient.get).toHaveBeenCalledWith(expect.stringContaining(`/process-instances/${processInstanceId}`));
                done();
            },
            error: done.fail,
        });

        // Don't send websocket notification - let polling take over
    }, 5000);

    it('should throw error when process instance ID is undefined', (done) => {
        jest.spyOn(startProcessCloudService, 'startProcess').mockReturnValue(of({ appName: appName, name: processName } as ProcessInstanceCloud));

        const validationProcessInfo = {
            appName: appName,
            processName: processName,
            processId: processId,
            validatorName: validatorName,
        };

        validationProcessService.runValidationProcess$(validationProcessInfo, 'Invoice Number', mockFields, []).subscribe({
            next: () => done.fail('Should have thrown an error'),
            error: (error) => {
                expect(error.message).toBe('Process instance ID is undefined');
                done();
            },
        });
    });

    it('should propagate errors without dispatching actions', (done) => {
        const errorMessage = 'Process execution failed';
        jest.spyOn(startProcessCloudService, 'startProcess').mockReturnValue(
            new Observable((observer) => {
                observer.error(new Error(errorMessage));
            })
        );

        const validationProcessInfo = {
            appName: appName,
            processName: processName,
            processId: processId,
            validatorName: validatorName,
        };

        validationProcessService.runValidationProcess$(validationProcessInfo, 'Invoice Number', mockFields, []).subscribe({
            next: () => done.fail('Should have thrown an error'),
            error: (error) => {
                expect(error.message).toBe(errorMessage);
                done();
            },
        });
    });

    it('should handle empty validation results', (done) => {
        jest.spyOn(adfHttpClient, 'get').mockResolvedValue({
            list: {
                entries: [
                    {
                        entry: {
                            name: 'document',
                            type: 'Json',
                            value: {
                                fields: [],
                                tables: [],
                            },
                        },
                    },
                ],
            },
        } as any);

        const validationProcessInfo = {
            appName: appName,
            processName: processName,
            processId: processId,
            validatorName: validatorName,
        };

        validationProcessService.runValidationProcess$(validationProcessInfo, 'Invoice Number', mockFields, []).subscribe({
            next: (results: ValidationProcessResults) => {
                expect(results.fields).toBeDefined();
                expect(results.fields?.length).toBe(0);
                expect(results.tables).toBeDefined();
                expect(results.tables?.length).toBe(0);
                done();
            },
            error: done.fail,
        });

        setTimeout(() => {
            wsNotificationSubject$.next({
                data: {
                    engineEvents: [
                        {
                            eventType: 'PROCESS_COMPLETED',
                            entity: { id: processInstanceId },
                        },
                    ],
                },
            });
        }, 10);
    });

    it('should return validation results with only fields', (done) => {
        const mockProcessVariable = {
            name: 'document',
            type: 'Json',
            value: {
                fields: [
                    {
                        name: 'Invoice Number',
                        value: 'INV-001',
                        type: 'Text',
                        status: IdpValidationStatus.Valid,
                    },
                    {
                        name: 'Total Amount',
                        value: '1000.00',
                        type: 'Text',
                        status: IdpValidationStatus.Invalid,
                    },
                ],
                tables: [],
            },
        };

        jest.spyOn(adfHttpClient, 'get').mockResolvedValue({
            list: {
                entries: [{ entry: mockProcessVariable }],
            },
        } as any);

        const validationProcessInfo = {
            appName: appName,
            processName: processName,
            processId: processId,
            validatorName: validatorName,
        };

        validationProcessService.runValidationProcess$(validationProcessInfo, 'Invoice Number', mockFields, []).subscribe({
            next: (results: ValidationProcessResults) => {
                expect(results.fields).toBeDefined();
                expect(results.fields?.length).toBe(2);
                expect(results.fields?.[0].status).toBe(IdpValidationStatus.Valid);
                expect(results.fields?.[1].status).toBe(IdpValidationStatus.Invalid);
                expect(results.tables).toBeDefined();
                expect(results.tables?.length).toBe(0);
                done();
            },
            error: done.fail,
        });

        setTimeout(() => {
            wsNotificationSubject$.next({
                data: {
                    engineEvents: [
                        {
                            eventType: 'PROCESS_COMPLETED',
                            entity: { id: processInstanceId },
                        },
                    ],
                },
            });
        }, 10);
    });

    it('should return validation results with only tables', (done) => {
        const mockProcessVariable = {
            name: 'document',
            type: 'Json',
            value: {
                fields: [],
                tables: [
                    {
                        name: 'Line Items',
                        columnNames: ['Item', 'Quantity', 'Price'],
                        records: [],
                        status: IdpValidationStatus.Valid,
                    },
                ],
            },
        };

        jest.spyOn(adfHttpClient, 'get').mockResolvedValue({
            list: {
                entries: [{ entry: mockProcessVariable }],
            },
        } as any);

        const validationProcessInfo = {
            appName: appName,
            processName: processName,
            processId: processId,
            validatorName: validatorName,
        };

        validationProcessService.runValidationProcess$(validationProcessInfo, 'Line Items', [], mockTables).subscribe({
            next: (results: ValidationProcessResults) => {
                expect(results.fields).toBeDefined();
                expect(results.fields?.length).toBe(0);
                expect(results.tables).toBeDefined();
                expect(results.tables?.length).toBe(1);
                expect(results.tables?.[0].status).toBe(IdpValidationStatus.Valid);
                done();
            },
            error: done.fail,
        });

        setTimeout(() => {
            wsNotificationSubject$.next({
                data: {
                    engineEvents: [
                        {
                            eventType: 'PROCESS_COMPLETED',
                            entity: { id: processInstanceId },
                        },
                    ],
                },
            });
        }, 10);
    });

    it('should return empty results when document variable is undefined', (done) => {
        const mockProcessVariable = {
            name: 'document',
            type: 'Json',
            value: undefined,
        };

        jest.spyOn(adfHttpClient, 'get').mockResolvedValue({
            list: {
                entries: [{ entry: mockProcessVariable }],
            },
        } as any);

        const validationProcessInfo = {
            appName: appName,
            processName: processName,
            processId: processId,
            validatorName: validatorName,
        };

        validationProcessService.runValidationProcess$(validationProcessInfo, 'Invoice Number', mockFields, []).subscribe({
            next: (results: ValidationProcessResults) => {
                expect(results).toBeDefined();
                expect(results.fields).toBeUndefined();
                expect(results.tables).toBeUndefined();
                done();
            },
            error: done.fail,
        });

        setTimeout(() => {
            wsNotificationSubject$.next({
                data: {
                    engineEvents: [
                        {
                            eventType: 'PROCESS_COMPLETED',
                            entity: { id: processInstanceId },
                        },
                    ],
                },
            });
        }, 10);
    });

    it('should return empty results when process variables are empty', (done) => {
        jest.spyOn(adfHttpClient, 'get').mockResolvedValue({
            list: {
                entries: [],
            },
        } as any);

        const validationProcessInfo = {
            appName: appName,
            processName: processName,
            processId: processId,
            validatorName: validatorName,
        };

        validationProcessService.runValidationProcess$(validationProcessInfo, 'Invoice Number', mockFields, []).subscribe({
            next: (results: ValidationProcessResults) => {
                expect(results).toBeDefined();
                expect(results.fields).toBeUndefined();
                expect(results.tables).toBeUndefined();
                done();
            },
            error: done.fail,
        });

        setTimeout(() => {
            wsNotificationSubject$.next({
                data: {
                    engineEvents: [
                        {
                            eventType: 'PROCESS_COMPLETED',
                            entity: { id: processInstanceId },
                        },
                    ],
                },
            });
        }, 10);
    });
});
