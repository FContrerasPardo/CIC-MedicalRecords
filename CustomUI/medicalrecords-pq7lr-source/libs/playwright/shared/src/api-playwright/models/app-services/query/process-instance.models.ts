/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

type ProcessInstanceStatuses = 'RUNNING' | 'COMPLETED' | 'SUSPENDED' | 'CANCELLED';

export interface QueryProcessInstanceFilters {
    id?: string;
    name?: string;
    processDefinitionKey?: string;
    status?: ProcessInstanceStatuses;
    sort?: string;
    appVersion?: string;
    initiator?: string;
    processDefinitionName?: string;
    startDate?: string;
    startFrom?: string;
    completedDate?: string;
    completedFrom?: string;
    suspendedDate?: string;
    suspendedFrom?: string;
    suspendedTo?: string;
}
