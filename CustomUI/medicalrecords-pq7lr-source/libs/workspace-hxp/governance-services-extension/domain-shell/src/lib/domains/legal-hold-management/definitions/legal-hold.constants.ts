/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export const LegalHoldInitiator = {
    Record: 'Record',
    Legal: 'Legal',
} as const;

export const LEGAL_HOLD_DEFAULT_SORT_DIRECTION = 'desc' as const;
export const LEGAL_HOLD_CASES_DEFAULT_SORT_COLUMN = 'dateOfCreation';
export const LEGAL_HOLD_RECORDS_DEFAULT_SORT_COLUMN = 'createdAt';
