/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { RecordStatus, RecordStatusType } from '@alfresco/adf-hx-content-services/services';
import type { RecordHealthStatisticKey } from './dashboard.interface';

export const WIDGET_ID = {
    RecordHealth: 'record-health',
    ActiveRetention: 'active-retention',
    MissingProperties: 'missing-properties',
    CutoffTracker: 'cutoff-tracker',
    DispositionTracker: 'disposition-tracker',
    LegalHoldSummary: 'legal-hold-summary',
} as const;

export type WidgetId = typeof WIDGET_ID[keyof typeof WIDGET_ID];

export const WIDGET_STATUS_MAP: Record<WidgetId, RecordStatusType> = {
    [WIDGET_ID.RecordHealth]: RecordStatus.UnderRetention,
    [WIDGET_ID.ActiveRetention]: RecordStatus.UnderRetention,
    [WIDGET_ID.MissingProperties]: RecordStatus.Incomplete,
    [WIDGET_ID.CutoffTracker]: RecordStatus.Ready,
    [WIDGET_ID.DispositionTracker]: RecordStatus.ReachedDisposition,
    [WIDGET_ID.LegalHoldSummary]: RecordStatus.OnHold,
} as const;

export const STATUS_COLOR_MAP: Record<RecordStatusType, string> = {
    [RecordStatus.UnderRetention]: '#6230F6',
    [RecordStatus.Ready]: '#4BC6A9',
    [RecordStatus.OnHold]: '#3D4282',
    [RecordStatus.ReachedDisposition]: '#CBBFFF',
    [RecordStatus.Incomplete]: '#E7C76B',
} as const;

export const ALL_WIDGET_IDS = Object.values(WIDGET_ID);

export const SORT_OPTION = {
    ValueDesc: 'value_desc',
    ValueAsc: 'value_asc',
} as const;

export type SortOption = typeof SORT_OPTION[keyof typeof SORT_OPTION];

export const WIDGET_CONTROL_KEY = {
    Category: 'category',
    Sorting: 'sorting',
    Month: 'month',
    LegalCase: 'legal-case',
} as const;

export type WidgetControlKey = typeof WIDGET_CONTROL_KEY[keyof typeof WIDGET_CONTROL_KEY];

export const DEFAULT_STATUS_COLOR = '#CCCCCC';

export const DASHBOARD_MONTH_NAMES = [
    'JANUARY',
    'FEBRUARY',
    'MARCH',
    'APRIL',
    'MAY',
    'JUNE',
    'JULY',
    'AUGUST',
    'SEPTEMBER',
    'OCTOBER',
    'NOVEMBER',
    'DECEMBER',
] as const;

export const RECORD_HEALTH_STATUS_DEFINITIONS: Array<{
    status: RecordStatusType;
    key: RecordHealthStatisticKey;
}> = [
    { status: RecordStatus.UnderRetention, key: 'underRetention' },
    { status: RecordStatus.Ready, key: 'ready' },
    { status: RecordStatus.OnHold, key: 'onHold' },
    { status: RecordStatus.ReachedDisposition, key: 'reachedDisposition' },
    { status: RecordStatus.Incomplete, key: 'incomplete' },
];
