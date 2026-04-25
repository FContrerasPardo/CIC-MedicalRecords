/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import { AppConfigService } from '@alfresco/adf-core';
import { AdfHttpClient } from '@alfresco/adf-core/api';
import { TASK_FORM_TYPE } from '../../../constants/constants';
import { OrphanedLinkedProcessesService } from './orphaned-linked-processes.service';
import { firstValueFrom, lastValueFrom } from 'rxjs';

describe('OrphanedLinkedProcessesService', () => {
    let service: OrphanedLinkedProcessesService;
    let adfHttpClient: AdfHttpClient;

    const bpmHost = 'http://localhost:8080/activiti-app';
    const appName = 'test-app';
    const rootProcessId = 'root-process-id';

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                OrphanedLinkedProcessesService,
                MockProvider(AdfHttpClient, {
                    post() {
                        return Promise.resolve<any>({});
                    },
                }),
                MockProvider(AppConfigService, {
                    get: jest.fn().mockImplementation((key) => {
                        if (key === 'bpmHost') {
                            return bpmHost;
                        }
                        if (key === 'alfresco-deployed-apps') {
                            return [{ name: appName }];
                        }
                        return null;
                    }),
                }),
            ],
        });

        service = TestBed.inject(OrphanedLinkedProcessesService);
        adfHttpClient = TestBed.inject(AdfHttpClient);
    });

    it('should link orphaned processes', async () => {
        const postRequestSpy = spyOn(adfHttpClient, 'post').and.callThrough();
        const processId1 = 'process-123';
        const processId2 = 'process-456';

        service.addOrphanedProcessId(processId1);
        service.addOrphanedProcessId(processId2);

        await lastValueFrom(service.linkOrphanedProcessesToParent(rootProcessId));

        const expectedUrl = `${bpmHost}/${appName}/query/v1/process-instances/${rootProcessId}/link`;
        const expectedPayload = {
            bodyParam: {
                processInstanceIds: [processId1, processId2],
                linkProcessInstanceType: TASK_FORM_TYPE,
            },
        };

        expect(postRequestSpy).toHaveBeenCalledWith(expectedUrl, expectedPayload);
    });

    it('should not allow adding duplicate process ids', async () => {
        const postRequestSpy = spyOn(adfHttpClient, 'post').and.callThrough();
        const processId = 'process-123';

        service.addOrphanedProcessId(processId);
        service.addOrphanedProcessId(processId);

        await lastValueFrom(service.linkOrphanedProcessesToParent(rootProcessId));

        const expectedUrl = `${bpmHost}/${appName}/query/v1/process-instances/${rootProcessId}/link`;
        const expectedPayload = {
            bodyParam: {
                processInstanceIds: [processId],
                linkProcessInstanceType: TASK_FORM_TYPE,
            },
        };

        expect(postRequestSpy).toHaveBeenCalledWith(expectedUrl, expectedPayload);
    });

    it('should clear all orphaned process ids so POST is not called', async () => {
        const postRequestSpy = spyOn(adfHttpClient, 'post').and.callThrough();
        service.addOrphanedProcessId('process-123');
        service.addOrphanedProcessId('process-456');

        service.clearOrphanedProcessesIds();

        await firstValueFrom(service.linkOrphanedProcessesToParent(rootProcessId));

        expect(postRequestSpy).not.toHaveBeenCalled();
    });
});
