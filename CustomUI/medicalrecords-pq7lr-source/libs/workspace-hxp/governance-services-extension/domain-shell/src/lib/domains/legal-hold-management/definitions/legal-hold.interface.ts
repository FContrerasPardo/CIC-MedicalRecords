/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { GovernanceListResult, GovernanceRecord, GovernanceSortDirection, LegalCase } from '../../../shared/definitions/governance-shared.interface';
import { LegalHoldInitiator } from './legal-hold.constants';

export interface LegalHoldCaseDialogData {
    clickedFrom: LegalHoldInitiatorType;
    legalHoldCases?: LegalHoldCase[];
}

export interface LegalHoldCase {
    createdByUser?: string;
    createdAt?: string;
    modifiedByUser?: string;
    modifiedAt?: string;
    createdByUsername?: string;
    modifiedByUsername?: string;
    legalCaseId?: string;
    legalCaseName?: string;
    legalCaseDescription?: string | null;
    environmentId?: string;
    legalCaseReason?: string;
}

export interface AssignRecordPayload {
    records: GovernanceRecord[];
    legalCaseIds: (string | undefined)[];
}

export type LegalHoldCaseIdentity = Pick<
    LegalHoldCase,
    'legalCaseId' | 'legalCaseName' | 'legalCaseReason' | 'legalCaseDescription'
>;

export type LegalHoldSortDirection = GovernanceSortDirection;

export type LegalHoldInitiatorType = typeof LegalHoldInitiator[keyof typeof LegalHoldInitiator];

export interface LegalActionContext {
    legalHoldCases: LegalHoldCase[];
}

export type GovernanceLegalCaseResult = GovernanceListResult<LegalCase>;

export type GovernanceLegalRecordsResult = GovernanceListResult<GovernanceRecord>;
