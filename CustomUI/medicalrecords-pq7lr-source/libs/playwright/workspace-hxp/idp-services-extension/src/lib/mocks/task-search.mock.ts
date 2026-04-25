/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from 'playwright';
import { BaseMock } from '@alfresco-dbp/playwright/shared';

export class TaskSearchMock extends BaseMock {
    private taskSearchPattern = /query\/v1\/tasks\/search/;

    constructor(page: Page) {
        super(page);
    }

    async mockTaskSearchWithResult(task): Promise<void> {
        await this.page.route(this.taskSearchPattern, async (route) => {
            const body = this.createTaskSearchResponse(task);
            await route.fulfill({ json: body });
        });
    }

    private createTaskSearchResponse(task) {
        if (!task) {
            return {
                list: {
                    entries: [],
                    pagination: {
                        skipCount: 0,
                        maxItems: 1,
                        count: 0,
                        hasMoreItems: false,
                        totalItems: 0,
                    },
                },
            };
        }

        return {
            list: {
                entries: [
                    {
                        entry: {
                            serviceName: 'rb',
                            serviceFullName: 'rb',
                            serviceVersion: '',
                            appName: task.appName,
                            appVersion: '1',
                            id: task.id,
                            assignee: task.assignee,
                            name: task.name,
                            rootProcessInstanceId: task.rootProcessInstanceId,
                            createdDate: task.createdDate,
                            priority: task.priority,
                            processDefinitionId: task.processDefinitionId,
                            processInstanceId: task.processInstanceId,
                            processDefinitionVersion: task.processDefinitionVersion,
                            processDefinitionName: task.processDefinitionName,
                            taskDefinitionKey: task.taskDefinitionKey,
                            status: task.status,
                            formKey: task.formKey,
                            lastModified: task.lastModified,
                            processVariables: [],
                            candidateUsers: [],
                            candidateGroups: [],
                            inFinalState: false,
                            standalone: false,
                        },
                    },
                ],
                pagination: {
                    skipCount: 0,
                    maxItems: 1,
                    count: 1,
                    hasMoreItems: false,
                    totalItems: 1,
                },
            },
        };
    }
}
