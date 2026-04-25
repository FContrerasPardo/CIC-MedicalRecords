/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export interface GovernanceRecord {
    createdByUser?: string;
    createdByUsername?: string;
    createdAt?: string;
    modifiedByUser?: string;
    modifiedAt?: string;
    contentID?: string;
    cutOffDate?: string;
    contentMetadata?: any;
    categoryId?: string;
    environmentDataSourceId?: string;
    environmentID?: string;
    id?: string | null;
    fileName?: string | null;
    status?: string;
    entityType?: string;
    retainUntil?: string;
    isProcessing?: boolean;
    hasCredential?: boolean;
    statusUpdateFailed?: boolean;
    retainUntilUpdateFailed?: boolean;
}

export interface ActionContext {
    records: GovernanceRecord[];
    showPanel?: boolean;
}

export type GovernanceSortDirection = 'asc' | 'desc' | '';

export interface GovernanceListResult<T> {
    lastEvaluatedKey?: string;
    contents: T[];
}

export type RecordIdentity = Pick<GovernanceRecord, 'environmentDataSourceId' | 'categoryId' | 'cutOffDate'>;

export interface LegalCase {
    legalCaseId?: string;
    legalCaseName?: string;
    legalCaseReason?: string;
    recordsCount?: number;
    createdAt?: string;
    createdByUsername?: string;
}
