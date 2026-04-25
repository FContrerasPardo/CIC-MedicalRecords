/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { RecordStatusType } from '@alfresco/adf-hx-content-services/services';
import { WIDGET_ID, WidgetId } from './dashboard.constants';
import { BaseSearchFilter } from '../../../shared/ui/search/models/search-filter.interface';

export interface RecordHealthStatusItem {
    status: RecordStatusType;
    value: number;
    label?: string;
    color?: string;
}

export interface RecordHealthData {
    total: number;
    breakdown: RecordHealthStatusItem[];
}

export interface WidgetCategoryMetric {
    id: string;
    category: string;
    total: number;
    value: number;
}

export interface WidgetCategoryData {
    series: WidgetCategoryMetric[];
}

export interface DashboardWidgetRequestOptions {
    categoryId?: string | null;
    date?: Date;
}

export interface DropdownOption {
    value: string;
    label: string;
}

export interface WidgetDataMap {
    [WIDGET_ID.RecordHealth]: RecordHealthData;
    [WIDGET_ID.ActiveRetention]: WidgetCategoryData;
    [WIDGET_ID.MissingProperties]: WidgetCategoryData;
    [WIDGET_ID.CutoffTracker]: WidgetCategoryData;
    [WIDGET_ID.DispositionTracker]: WidgetCategoryData;
    [WIDGET_ID.LegalHoldSummary]: WidgetCategoryData;
}

export interface GovernanceDashboardPptExportInput {
    snapshot: Partial<WidgetDataMap>;
    widgetOrder: WidgetId[];
    fileName?: string;
}

export type PptStrings = Record<string, string>;

export interface GovernanceStatistic {
    ready?: number;
    underRetention?: number;
    incomplete?: number;
    reachedDisposition?: number;
    deleted?: number;
    unprocessed?: number;
    onHold?: number;
    archived?: number;
    total?: number;
    categoryId?: string;
    environmentDataSourceId?: string;
    categoryName?: string;
}

export interface GovernanceTrackerStatistic {
    environmentDataSourceId?: string;
    categoryId?: string;
    categoryName?: string;
    trackerMonth?: string;
    count?: number;
    totalRecordCount?: number;
}

export type GovernanceStatisticKey = keyof Pick<GovernanceStatistic, 'underRetention' | 'incomplete'>;

export type RecordHealthStatisticKey = keyof Pick<
    GovernanceStatistic,
    'underRetention' | 'ready' | 'onHold' | 'reachedDisposition' | 'incomplete'
>;

export type GovernanceTrackerType = 'cutoff' | 'disposition';

export interface DashboardFilterValue {
    values?: Array<{ id?: string; value?: string }>;
}

export interface DashboardFilterEvent {
    filter: BaseSearchFilter;
    value: DashboardFilterValue | null;
    isReset: boolean;
}

export type TranslateFn = (key: string) => string;
