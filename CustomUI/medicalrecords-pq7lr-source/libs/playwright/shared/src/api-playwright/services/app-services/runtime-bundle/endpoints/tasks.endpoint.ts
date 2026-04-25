/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { BaseService, RequestResponse } from '../../../base.service';
import { CustomAPIRequest, StandaloneTaskData, StandaloneListData, StandaloneTaskOptions, Options } from '../../../../';
interface TaskVariablesResponse {
    list?: {
        entries: Array<{
            entry: {
                name: string;
                value: any;
                type: string;
                taskVariable: boolean;
                [key: string]: any;
            };
        }>;
    };
    [key: string]: any;
}
export class TasksEndpoint extends BaseService {
    private readonly endpoint: string;

    constructor(context: CustomAPIRequest, serviceUrl: string) {
        super(context);
        this.endpoint = `/${serviceUrl}/v1/tasks`;
    }

    async createStandaloneTask(taskName: string, options?: Partial<StandaloneTaskOptions>): Promise<StandaloneTaskData | RequestResponse> {
        const postBody = {
            name: taskName,
            payloadType: 'CreateTaskPayload',
            ...options,
        };
        return this.post(`${this.endpoint}`, { data: postBody });
    }

    async createStandaloneTasks(tasksNames: string[], options?: Partial<StandaloneTaskOptions>): Promise<StandaloneListData | RequestResponse> {
        const childTasks = {
            list: {
                entries: [],
            },
        };

        for (const name of tasksNames) {
            childTasks.list.entries.push(await this.createStandaloneTask(name, options));
        }
        return childTasks;
    }

    async completeTask(taskId: string): Promise<RequestResponse> {
        const requestOptions: Options = {
            data: {
                payloadType: 'CompleteTaskPayload',
            },
        };

        return this.post(`${this.endpoint}/${taskId}/complete`, requestOptions);
    }

    async assignTaskToUser(processInstanceId: string, taskId: string, username: string): Promise<RequestResponse> {
        const postBody = {
            id: processInstanceId,
            taskId,
            assignee: username,
            payloadType: 'AssignTaskPayload',
        };

        return this.post(`${this.endpoint}/${taskId}/assign`, { data: postBody });
    }

    async claimTask(taskId: string, username: string): Promise<void> {
        await this.post(`${this.endpoint}/${taskId}/claim?assignee=${username}`);
    }

    async updateTaskPriority(taskId: string, priority: number): Promise<RequestResponse> {
        const data = { payloadType: 'UpdateTaskPayload', priority };

        return this.put(`${this.endpoint}/${taskId}`, { data });
    }

    async deleteTask(taskId: string): Promise<void> {
        await this.delete(`${this.endpoint}/${taskId}`);
    }

    async deleteTasks(taskEntires: RequestResponse[]): Promise<void> {
        const projectIds = [];
        projectIds.push(...taskEntires.map((i) => i.entry.id));

        await Promise.all(projectIds.map((id) => this.deleteTask(id)));
    }

    getTaskVariables(taskId: string): Promise<TaskVariablesResponse | RequestResponse> {
        return this.get(`${this.endpoint}/${taskId}/variables`, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    async getTaskVariable<T = any>(taskId: string, variableName: string): Promise<T | null> {
        const response = await this.getTaskVariables(taskId);

        // Check for error response
        if (!response || (response as RequestResponse).error) {
            return null;
        }

        const variables = response as TaskVariablesResponse;

        if (variables[variableName] !== undefined) {
            return variables[variableName] as T;
        }

        return null;
    }
}
