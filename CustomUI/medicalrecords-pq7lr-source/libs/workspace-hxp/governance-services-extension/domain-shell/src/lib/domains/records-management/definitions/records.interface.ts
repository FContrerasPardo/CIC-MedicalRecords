/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { GovernanceRecord } from '../../../shared/definitions/governance-shared.interface';

export interface GovernanceSearchResult {
    lastEvaluatedKey?: string;
    content: GovernanceRecord[];
}

export interface PageBoundary {
    forwardKey?: string;
    backwardKey?: string;
}

export type GovernanceRecordWithId = GovernanceRecord & { id: string };
