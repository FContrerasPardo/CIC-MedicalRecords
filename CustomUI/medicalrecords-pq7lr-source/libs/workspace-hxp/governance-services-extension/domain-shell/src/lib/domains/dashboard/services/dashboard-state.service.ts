/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable, inject } from '@angular/core';
import { of, forkJoin, Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { RecordStatusType, IDENTITY_USER_SERVICE_TOKEN, IdentityUserModel } from '@alfresco/adf-hx-content-services/services';
import { DashboardDataService } from './dashboard.data.service';
import { ALL_WIDGET_IDS, DEFAULT_STATUS_COLOR, STATUS_COLOR_MAP, WIDGET_ID, WidgetId } from '../definitions/dashboard.constants';
import { STATUS_LABEL_MAP } from '../../../shared/ui/search/filters/status/status-options.data';
import { DashboardWidgetRequestOptions, RecordHealthData, WidgetCategoryData } from '../definitions/dashboard.interface';
import { StorageService } from '@alfresco/adf-core';

@Injectable()
export class DashboardStateService {
    private readonly dashboardDataService = inject(DashboardDataService);
    private readonly storageService = inject(StorageService);
    private readonly identityUserService = inject(IDENTITY_USER_SERVICE_TOKEN);
    private readonly STORAGE_KEY_SUFFIX = '_widgetOrder';

    loadWidgetOrder(defaultOrder: WidgetId[]): WidgetId[] {
        const userInfo: IdentityUserModel = this.identityUserService.getCurrentUserInfo();

        if (!userInfo?.username) {
            return defaultOrder;
        }

        const storageKey = `${userInfo.username}${this.STORAGE_KEY_SUFFIX}`;
        const storedOrder = this.storageService.getItem(storageKey);

        if (storedOrder) {
            try {
                const parsedOrder = JSON.parse(storedOrder);
                if (Array.isArray(parsedOrder)) {
                    return parsedOrder as WidgetId[];
                }
            } catch {
                return defaultOrder;
            }
        }
        return defaultOrder;
    }

    saveWidgetOrder(widgetOrder: WidgetId[]): void {
        const userInfo: IdentityUserModel = this.identityUserService.getCurrentUserInfo();

        if (!userInfo?.username || widgetOrder.length === 0) {
            return;
        }

        const storageKey = `${userInfo.username}${this.STORAGE_KEY_SUFFIX}`;
        this.storageService.setItem(storageKey, JSON.stringify(widgetOrder));
    }

    getStatusColor(status: string | undefined): string {
        if (!status) {
            return DEFAULT_STATUS_COLOR;
        }
        return (STATUS_COLOR_MAP as Record<string, string>)[status] ?? DEFAULT_STATUS_COLOR;
    }

    getWidgetData(widgetId: WidgetId, options?: DashboardWidgetRequestOptions): Observable<RecordHealthData | WidgetCategoryData | null> {
        const source$ = this.getRawWidgetObservable(widgetId, options);
        return source$.pipe(
            map((response) => {
                if (!response) {
                    return null;
                }

                switch (widgetId) {
                    case WIDGET_ID.RecordHealth: {
                        if (!this.isRecordHealthData(response)) {
                            return null;
                        }
                        return {
                            ...response,
                            breakdown: this.mapBreakdownWithLabelsAndColors(response.breakdown),
                        };
                    }

                    case WIDGET_ID.ActiveRetention:
                    case WIDGET_ID.MissingProperties:
                    case WIDGET_ID.CutoffTracker:
                    case WIDGET_ID.DispositionTracker:
                    case WIDGET_ID.LegalHoldSummary: {
                        return this.isWidgetCategoryData(response) ? response : null;
                    }

                    default: {
                        return null;
                    }
                }
            }),
            catchError(() => of(null))
        );
    }

    fetchAllWidgets(): Observable<Record<WidgetId, unknown>> {
        const observables: Record<string, Observable<unknown>> = {};
        for (const id of ALL_WIDGET_IDS) {
            observables[id] = this.getWidgetData(id as WidgetId);
        }
        return forkJoin(observables) as Observable<Record<WidgetId, unknown>>;
    }

    clearWidgetCaches(): void {
        this.dashboardDataService.clearMonthlyStatisticsCache();
        this.dashboardDataService.clearTrackerStatisticsCache();
        this.dashboardDataService.clearTotalStatisticsCache();
    }

    private getRawWidgetObservable(
        widgetId: WidgetId,
        options?: DashboardWidgetRequestOptions
    ): Observable<RecordHealthData | WidgetCategoryData | null> {
        switch (widgetId) {
            case WIDGET_ID.RecordHealth: {
                return this.dashboardDataService.fetchRecordHealth(options?.categoryId) as Observable<RecordHealthData>;
            }
            case WIDGET_ID.ActiveRetention: {
                return this.dashboardDataService.fetchActiveRetention() as Observable<WidgetCategoryData>;
            }
            case WIDGET_ID.MissingProperties: {
                return this.dashboardDataService.fetchMissingProperties() as Observable<WidgetCategoryData>;
            }
            case WIDGET_ID.CutoffTracker: {
                return this.dashboardDataService.fetchCutoffTracker(options?.date) as Observable<WidgetCategoryData>;
            }
            case WIDGET_ID.DispositionTracker: {
                return this.dashboardDataService.fetchDispositionTracker(options?.date) as Observable<WidgetCategoryData>;
            }
            case WIDGET_ID.LegalHoldSummary: {
                return this.dashboardDataService.fetchLegalHoldSummary() as Observable<WidgetCategoryData>;
            }
            default: {
                return of(null);
            }
        }
    }

    private mapBreakdownWithLabelsAndColors(breakdown: Array<{ status: RecordStatusType; value: number }>) {
        return (breakdown ?? []).map((breakdownItem) => ({
            ...breakdownItem,
            label: STATUS_LABEL_MAP[breakdownItem.status],
            color: STATUS_COLOR_MAP[breakdownItem.status] ?? DEFAULT_STATUS_COLOR,
        }));
    }

    private isRecordHealthData(response: RecordHealthData | WidgetCategoryData | null): response is RecordHealthData {
        return !!response && Array.isArray((response as RecordHealthData).breakdown);
    }

    private isWidgetCategoryData(response: RecordHealthData | WidgetCategoryData | null): response is WidgetCategoryData {
        return !!response && Array.isArray((response as WidgetCategoryData).series);
    }
}
