/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { FormProcessFinishEventData } from '../services/interfaces';

export const handleRuleEventOnProcessFinishDataMock: FormProcessFinishEventData = {
    process: {
        correlationKey: 'correlation-key',
        processInstanceId: 'process-instance-id',
        variable: {
            processVariable: {
                id: 1,
                name: 'processVariable',
                appName: 'app-name',
                processDefinitionKey: 'fetch-data',
                createTime: 'create-time',
                lastUpdatedTime: '',
                markedAsDeleted: false,
                processInstanceId: 'process-instance-id',
                serviceFullName: '',
                serviceName: '',
                serviceVersion: '',
                taskVariable: false,
                type: '',
                value: 'process-value',
                variableDefinitionId: '',
            },
        },
    },
} as const;
