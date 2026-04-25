/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DashboardWidgetComponent } from './feature/dashboard-widget/dashboard-widget.component';
import { DatePipe } from '@angular/common';
import { HxpCicGovColumnChartComponent } from './feature/charts/column-chart/column-chart.component';
import { HxpCicGovDonutChartComponent } from './feature/charts/donut-chart/donut-chart.component';
import {
    ALL_WIDGET_IDS,
    WIDGET_ID,
    SORT_OPTION,
    WIDGET_CONTROL_KEY,
    STATUS_COLOR_MAP,
    WIDGET_STATUS_MAP,
    WidgetId,
    SortOption,
} from './definitions/dashboard.constants';
import { finalize, take } from 'rxjs/operators';
import { DashboardWidgetRequestOptions, WidgetDataMap } from './definitions/dashboard.interface';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { DashboardStateService } from './services/dashboard-state.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HxpEmptyWidgetStateComponent } from './feature/empty-widget-state/hxp-empty-widget-state.component';
import { GovernanceConfigurationService } from '../../shared/config/governance-config.service';
import { RouterModule } from '@angular/router';
import { RecordStatus, RecordStatusType } from '@alfresco/adf-hx-content-services/services';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { GovernanceDashboardPptService } from './services/governance-dashboard-ppt.service';
import { ErrorComponent } from '../../shared/ui/search/error/error.component';

@Component({
    selector: 'hxp-governance-dashboard-management',
    imports: [
        MatIconModule,
        DashboardWidgetComponent,
        HxpCicGovColumnChartComponent,
        HxpCicGovDonutChartComponent,
        DatePipe,
        TranslatePipe,
        MatButtonModule,
        MatTooltipModule,
        HxpEmptyWidgetStateComponent,
        ErrorComponent,
        RouterModule,
        DragDropModule,
    ],
    templateUrl: './dashboard-management.component.html',
    styleUrl: './dashboard-management.component.scss',
    providers: [DashboardStateService],
})
export class DashboardManagementComponent implements OnInit {
    readonly legalHoldSummaryNavigationQueryParamOverrides = { source: 'dashboard' };

    rawData = signal<Partial<WidgetDataMap>>({});
    data = signal<Partial<WidgetDataMap>>({});

    currentSortOptions = this.defaultSortOptions();
    selectedMonths = this.defaultSelectedMonths();
    edsId: string | undefined;
    filtersByWidget: Partial<Record<WidgetId, string[]>> = {};

    readonly WIDGET_ID = WIDGET_ID;
    readonly SORT_OPTION = SORT_OPTION;
    readonly WIDGET_CONTROL_KEY = WIDGET_CONTROL_KEY;
    readonly STATUS_COLOR_MAP = STATUS_COLOR_MAP;
    readonly WIDGET_STATUS_MAP = WIDGET_STATUS_MAP;
    readonly RECORD_STATUS = RecordStatus;

    readonly lastRefresh = signal<Date>(new Date());
    readonly loading = signal<Record<string, boolean>>(this.createInitialLoading());
    readonly error = signal<Record<string, boolean>>(this.createInitialWidgetState(false));

    readonly hasRecordHealthData = computed(() => (this.data()[WIDGET_ID.RecordHealth]?.total ?? 0) > 0);
    readonly recordHealthBreakdown = computed(() => this.data()[WIDGET_ID.RecordHealth]?.breakdown ?? []);
    readonly hasActiveRetentionData = computed(() => (this.data()[WIDGET_ID.ActiveRetention]?.series?.length ?? 0) > 0);
    readonly hasMissingPropertiesData = computed(() => (this.data()[WIDGET_ID.MissingProperties]?.series?.length ?? 0) > 0);
    readonly hasCutoffTrackerData = computed(() => (this.data()[WIDGET_ID.CutoffTracker]?.series?.length ?? 0) > 0);
    readonly hasDispositionTrackerData = computed(() => (this.data()[WIDGET_ID.DispositionTracker]?.series?.length ?? 0) > 0);
    readonly hasLegalHoldSummaryData = computed(() => (this.data()[WIDGET_ID.LegalHoldSummary]?.series?.length ?? 0) > 0);

    private readonly dashboardStateService = inject(DashboardStateService);
    private readonly governanceConfigurationService = inject(GovernanceConfigurationService);
    private readonly pptExportService = inject(GovernanceDashboardPptService);

    widgetOrder: WidgetId[] = [
        this.WIDGET_ID.RecordHealth,
        this.WIDGET_ID.ActiveRetention,
        this.WIDGET_ID.LegalHoldSummary,
        this.WIDGET_ID.CutoffTracker,
        this.WIDGET_ID.DispositionTracker,
        this.WIDGET_ID.MissingProperties,
    ];

    ngOnInit(): void {
        this.governanceConfigurationService
            .getConfig()
            .pipe(take(1))
            .subscribe((config) => {
                this.edsId = config.dataSources?.[0]?.id ?? null;
                // eslint-disable-next-line rxjs/no-nested-subscribe
                this.refreshAll();
            });
        this.widgetOrder = this.dashboardStateService.loadWidgetOrder(this.widgetOrder);
    }

    onSortOptionChange(event: { value: string | null; widgetId: WidgetId }): void {
        const value = event.value as SortOption;
        this.currentSortOptions[event.widgetId] = value;
    }

    onMonthChange(event: { date: Date; widgetId: WidgetId }): void {
        this.selectedMonths[event.widgetId] = event.date;
        this.loadWidgetData(event.widgetId, this.getWidgetRequestOptions(event.widgetId));
    }

    onCategoryChange(widgetId: WidgetId, value: string[] | null): void {
        this.filtersByWidget[widgetId] = value ?? [];
        if (widgetId === WIDGET_ID.RecordHealth) {
            this.onRecordHealthFilter(value ? value[0] : null);
        } else {
            this.onWidgetFilter(widgetId, value);
        }
    }

    onLegalCaseChange(widgetId: WidgetId, value: string[] | null): void {
        const normalizedValue = value ?? [];
        this.filtersByWidget[widgetId] = normalizedValue;
        this.onWidgetFilter(widgetId, normalizedValue);
    }

    onRecordHealthFilter(value: string | null): void {
        this.loadWidgetData(WIDGET_ID.RecordHealth, { categoryId: value });
    }

    onWidgetFilter(widgetId: WidgetId, value: string[] | null): void {
        this.filtersByWidget[widgetId] = value ?? [];
        this.applyFilters();
    }

    refreshAll(): void {
        this.filtersByWidget = {};
        this.dashboardStateService.clearWidgetCaches();
        for (const id of ALL_WIDGET_IDS) {
            this.loadWidgetData(id as WidgetId, this.getWidgetRequestOptions(id as WidgetId));
        }

        this.lastRefresh.set(new Date());
    }

    retryWidget(widgetId: WidgetId): void {
        this.loadWidgetData(widgetId, this.getWidgetRequestOptions(widgetId));
    }

    getStatusColor(status: string | undefined): string {
        return this.dashboardStateService.getStatusColor(status);
    }

    drop(event: CdkDragDrop<string[]>): void {
        moveItemInArray(this.widgetOrder, event.previousIndex, event.currentIndex);
        this.dashboardStateService.saveWidgetOrder(this.widgetOrder);
    }

    exportToPPT(): void {
        void this.pptExportService.generateDashboardPpt({ snapshot: this.data(), widgetOrder: this.widgetOrder });
    }

    getRecordHealthQueryParams(status?: RecordStatusType): Record<string, string> {
        const categoryId = this.filtersByWidget[WIDGET_ID.RecordHealth]?.[0] ?? null;

        return {
            ...(this.edsId ? { eds: this.edsId } : {}),
            ...(status ? { status } : {}),
            ...(categoryId ? { categoryId } : {}),
        };
    }

    private createInitialLoading(): Record<string, boolean> {
        return this.createInitialWidgetState(false);
    }

    private createInitialWidgetState(defaultValue: boolean): Record<string, boolean> {
        const widgetState: Record<string, boolean> = {};
        for (const id of ALL_WIDGET_IDS) {
            widgetState[id] = defaultValue;
        }
        return widgetState;
    }

    private setLoading(widgetId: string, value: boolean): void {
        this.loading.set({ ...this.loading(), [widgetId]: value });
    }

    private setError(widgetId: string, value: boolean): void {
        this.error.set({ ...this.error(), [widgetId]: value });
    }

    private setData(widgetId: WidgetId, payload: WidgetDataMap[WidgetId]): void {
        this.rawData.update((current) => ({ ...current, [widgetId]: payload }));
    }

    private loadWidgetData(widgetId: WidgetId, options?: DashboardWidgetRequestOptions): void {
        this.setLoading(widgetId, true);
        this.setError(widgetId, false);

        this.dashboardStateService
            .getWidgetData(widgetId, options)
            .pipe(
                take(1),
                finalize(() => this.setLoading(widgetId, false))
            )
            .subscribe({
                next: (response) => {
                    if (!response) {
                        this.setError(widgetId, true);
                        return;
                    }

                    this.setData(widgetId, response);
                    this.applyFilters();
                },
                error: () => this.setError(widgetId, true),
            });
    }

    private getWidgetRequestOptions(widgetId: WidgetId): DashboardWidgetRequestOptions | undefined {
        if (
            widgetId !== WIDGET_ID.RecordHealth
            && widgetId !== WIDGET_ID.CutoffTracker
            && widgetId !== WIDGET_ID.DispositionTracker
        ) {
            return undefined;
        }

        return {
            ...(widgetId === WIDGET_ID.RecordHealth
                ? { categoryId: this.filtersByWidget[WIDGET_ID.RecordHealth]?.[0] ?? null }
                : {}),
            ...(widgetId === WIDGET_ID.CutoffTracker || widgetId === WIDGET_ID.DispositionTracker
                ? { date: this.selectedMonths[widgetId] ?? new Date() }
                : {}),
        };
    }

    private defaultSortOptions(): Partial<Record<WidgetId, SortOption>> {
        return {
            [WIDGET_ID.ActiveRetention]: SORT_OPTION.ValueDesc,
            [WIDGET_ID.MissingProperties]: SORT_OPTION.ValueDesc,
            [WIDGET_ID.CutoffTracker]: SORT_OPTION.ValueDesc,
            [WIDGET_ID.DispositionTracker]: SORT_OPTION.ValueDesc,
            [WIDGET_ID.LegalHoldSummary]: SORT_OPTION.ValueDesc,
        };
    }

    private defaultSelectedMonths(): Partial<Record<WidgetId, Date>> {
        return {
            [WIDGET_ID.CutoffTracker]: new Date(),
            [WIDGET_ID.DispositionTracker]: new Date(),
        };
    }

    private applyFilters(): void {
        const raw = this.rawData();
        const next: Partial<WidgetDataMap> = { ...raw };

        for (const [widgetIdStr, selected] of Object.entries(this.filtersByWidget)) {
            const widgetId = widgetIdStr as WidgetId;
            if (!selected?.length) {
                continue;
            }

            const widget = raw[widgetId];
            if (!widget || !('series' in widget)) {
                continue;
            }

            const selectedFilterIdSet = new Set(selected);
            const fullSeries = (widget as any).series ?? [];

            next[widgetId] = {
                ...(widget as any),
                series: fullSeries.filter((seriesItem: any) => selectedFilterIdSet.has(String(seriesItem.id))),
            };
        }

        this.data.set(next);
    }
}
