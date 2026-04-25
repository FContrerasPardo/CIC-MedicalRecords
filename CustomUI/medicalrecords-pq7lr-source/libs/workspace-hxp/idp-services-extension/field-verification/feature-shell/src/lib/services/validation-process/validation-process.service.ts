/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NotificationCloudService, ProcessPayloadCloud, StartProcessCloudService } from '@alfresco/adf-process-services-cloud';
import { inject, Injectable } from '@angular/core';
import { IdpField, IdpTable } from '../../models/screen-models';
import { AdfHttpClient } from '@alfresco/adf-core/api';
import { AppConfigService } from '@alfresco/adf-core';
import { Observable, switchMap, map, filter, take, from, timeout, timer, race, interval } from 'rxjs';
import { ValidationField, ValidationProcessInfo, ValidationProcessResults, ValidationTable } from '../../models/validation-models';
import { IdpFieldDataType } from '@hxp/workspace-hxp/idp-services-extension/shared';

@Injectable()
export class ValidationProcessService {
    private readonly startProcessCloudService = inject(StartProcessCloudService);
    private readonly notificationCloudService = inject(NotificationCloudService);
    private readonly adfHttpClient = inject(AdfHttpClient);
    private readonly appConfigService = inject(AppConfigService);

    private readonly PROCESS_COMPLETION_TIMEOUT = 30000;
    private readonly POLLING_INTERVAL = 1000;
    private readonly INITIAL_POLLING_DELAY = 3000;

    runValidationProcess$(
        validationProcessInfo: ValidationProcessInfo,
        triggeringFieldName: string,
        fields: IdpField[],
        tables: IdpTable[]
    ): Observable<ValidationProcessResults> {
        const processVariables = {
            validator_name: validationProcessInfo.validatorName,
            triggering_field_name: triggeringFieldName,
            document: this.getValidationProcessDocumentParameter(fields, tables),
        };

        const payload = new ProcessPayloadCloud({
            name: validationProcessInfo.processName,
            processDefinitionKey: validationProcessInfo.processId,
            variables: processVariables,
        });

        return this.startProcessCloudService.startProcess(validationProcessInfo.appName, payload).pipe(
            switchMap((processInstance) => {
                if (!processInstance.id) {
                    throw new Error('Process instance ID is undefined');
                }
                const processInstanceId = processInstance.id;

                const notification$ = this.subscribeToProcessCompletionEvents$(validationProcessInfo.appName, processInstanceId);
                // Fallback polling in case websocket notification is not received
                const delayedPollingFallback$ = timer(this.INITIAL_POLLING_DELAY).pipe(
                    switchMap(() => this.pollProcessCompletion$(validationProcessInfo.appName, processInstanceId))
                );

                return race(notification$, delayedPollingFallback$).pipe(
                    take(1),
                    switchMap(() => this.getProcessVariables(validationProcessInfo.appName, processInstanceId)),
                    map((variables) => {
                        const document = variables['document'];
                        return {
                            fields: document?.fields,
                            tables: document?.tables,
                        };
                    }),
                    timeout(this.PROCESS_COMPLETION_TIMEOUT)
                );
            })
        );
    }

    private getValidationProcessDocumentParameter(fields: IdpField[], tables: IdpTable[]) {
        const validationFields: ValidationField[] = fields
            .filter((field) => field.dataType !== IdpFieldDataType.Table)
            .map((field) => ({
                name: field.name,
                value: field.value,
                type: field.dataType,
                status: undefined,
            }));

        const validationTables: ValidationTable[] = tables.map((table) => ({
            name: table.name,
            columnNames: table.columnHeaderNames,
            records: table.rows.map((row) =>
                row.rowCells.map((cell) => ({
                    value: cell.value ?? '',
                    pageIndex: cell.boundingBox?.pageIndex ?? 0,
                    type: cell.dataType,
                }))
            ),
            status: undefined,
        }));

        return { fields: validationFields, tables: validationTables };
    }

    private subscribeToProcessCompletionEvents$(appName: string, processInstanceId: string): Observable<string> {
        const eventType = 'eventType: [PROCESS_COMPLETED]';
        const engineEvents = [eventType];

        const subscriptionQuery = `
            subscription {
                engineEvents(${engineEvents}) {
                eventType
                entity
                processDefinitionKey
                }
            }
        `;

        return this.notificationCloudService.makeGQLQuery(appName, subscriptionQuery).pipe(
            map((wsEvent: any) => wsEvent.data.engineEvents),
            filter((events: any[]) => {
                return events.some((event) => event.entity.id === processInstanceId);
            }),
            map(() => processInstanceId),
            take(1)
        );
    }

    private pollProcessCompletion$(appName: string, processInstanceId: string): Observable<void> {
        return interval(this.POLLING_INTERVAL).pipe(
            switchMap(() => this.getProcessInstance$(appName, processInstanceId)),
            filter((instance) => instance?.entry?.status === 'COMPLETED'),
            take(1)
        );
    }

    private getProcessInstance$(appName: string, processInstanceId: string): Observable<any> {
        return from(this.adfHttpClient.get(`${this.getProcessTaskBackendServiceUrl(appName)}/process-instances/${processInstanceId}`));
    }

    private getProcessVariables(appName: string, processInstanceId: string): Observable<{ [name: string]: any }> {
        return from(this.adfHttpClient.get(`${this.getProcessTaskBackendServiceUrl(appName)}/process-instances/${processInstanceId}/variables`)).pipe(
            map((restVariables: any) => {
                const variables = restVariables?.list?.entries?.map((e: any) => e.entry) ?? [];

                const variableMap: { [name: string]: any } = {};
                for (const variable of variables) {
                    variableMap[variable.name] = variable.value;
                }

                return variableMap;
            })
        );
    }

    private getProcessTaskBackendServiceUrl(appName: string): string {
        const host = this.appConfigService.get<string>('bpmHost');
        return `${host}/${appName}/query/v1`;
    }
}
