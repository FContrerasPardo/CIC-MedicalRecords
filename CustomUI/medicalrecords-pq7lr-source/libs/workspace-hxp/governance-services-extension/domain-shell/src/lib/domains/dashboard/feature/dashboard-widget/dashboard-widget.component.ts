/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, output, input, inject, viewChild, effect } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map, merge } from 'rxjs';
import { WIDGET_CONTROL_KEY, WidgetControlKey, WIDGET_ID, WidgetId, SORT_OPTION } from '../../definitions/dashboard.constants';
import { DashboardFilterEvent, DashboardFilterValue } from '../../definitions/dashboard.interface';
import { MonthPickerControlComponent } from '../widget-control/month-picker/month-picker-control.component';
import { CategorySearchFilterComponent } from '../../../../shared/ui/search/filters/category/category-search-filter.component';
import { SearchFilterValueService } from '../../../../shared/ui/search/filters/base/search-filter-value.service';
import { LegalCaseNameSearchFilterComponent } from '../../../../shared/ui/search/filters/legal-case-name/legal-case-name-search-filter.component';
import { TranslatePipe } from '@ngx-translate/core';
import { BaseSearchFilter } from '../../../../shared/ui/search/models/search-filter.interface';

@Component({
    selector: 'hxp-dashboard-widget',
    imports: [
        MatCardModule,
        MatProgressSpinnerModule,
        MatChipsModule,
        MonthPickerControlComponent,
        CategorySearchFilterComponent,
        LegalCaseNameSearchFilterComponent,
        TranslatePipe,
    ],
    templateUrl: './dashboard-widget.component.html',
    styleUrl: './dashboard-widget.component.scss',
})
export class DashboardWidgetComponent {
    heading = input<string>('');
    subtitle = input<string>('');
    loading = input<boolean>(false);
    controlKeys = input<WidgetControlKey[]>([]);
    selectedMonth = input<Date | undefined>();
    widgetId = input<WidgetId>();
    disabled = input<boolean>(false);
    legalCaseItems = input<Array<{ id: string; category: string }>>([]);
    refreshToken = input<Date>(new Date());

    categoryChange = output<{ widgetId: WidgetId; value: string[] | null }>();
    monthChange = output<{ date: Date; widgetId: WidgetId }>();
    legalCaseChange = output<{ widgetId: WidgetId; value: string[] | null }>();

    categoryFilter = viewChild(CategorySearchFilterComponent);
    legalCaseNameFilter = viewChild(LegalCaseNameSearchFilterComponent);

    readonly WIDGET_CONTROL_KEY = WIDGET_CONTROL_KEY;
    readonly WIDGET_ID = WIDGET_ID;
    readonly SORT_OPTION = SORT_OPTION;

    private readonly filterValueService = inject(SearchFilterValueService);
    private readonly refreshTriggeredResetFilters = new WeakSet<BaseSearchFilter>();

    constructor() {
        this.setupFilterListeners();
        effect(() => {
            this.refreshToken();

            const categoryFilterComponent = this.categoryFilter();
            if (categoryFilterComponent && this.controlKeys().includes(WIDGET_CONTROL_KEY.Category)) {
                this.clearFilterFromRefresh(categoryFilterComponent);
            }

            const legalCaseFilterComponent = this.legalCaseNameFilter();
            if (legalCaseFilterComponent && this.controlKeys().includes(WIDGET_CONTROL_KEY.LegalCase)) {
                this.clearFilterFromRefresh(legalCaseFilterComponent);
            }
        });
    }

    private setupFilterListeners(): void {
        const apply$ = this.filterValueService.filterApplied$.pipe(
            map(
                ({ filter: appliedFilter, value }): DashboardFilterEvent =>
                    ({ filter: appliedFilter, value: value as DashboardFilterValue, isReset: false })
            )
        );

        const reset$ = this.filterValueService.filterReset$.pipe(
            map((resetFilter): DashboardFilterEvent => ({ filter: resetFilter, value: null, isReset: true }))
        );

        merge(apply$, reset$)
            .pipe(takeUntilDestroyed())
            .subscribe(({ filter: appliedFilter, value, isReset }) => {
                if (isReset && this.refreshTriggeredResetFilters.has(appliedFilter)) {
                    this.refreshTriggeredResetFilters.delete(appliedFilter);
                    return;
                }

                if (this.isControlEnabled(WIDGET_CONTROL_KEY.Category) && appliedFilter === this.categoryFilter()) {
                    this.handleCategoryUpdate(value, isReset);
                    return;
                }

                if (this.isControlEnabled(WIDGET_CONTROL_KEY.LegalCase) && appliedFilter === this.legalCaseNameFilter()) {
                    this.handleLegalCaseUpdate(value, isReset);
                    return;
                }
            });
    }

    private clearFilterFromRefresh(filterComponent: BaseSearchFilter): void {
        this.refreshTriggeredResetFilters.add(filterComponent);
        this.filterValueService.clearFilter(filterComponent);
    }

    private isControlEnabled(key: WidgetControlKey): boolean {
        return !!this.widgetId() && this.controlKeys().includes(key);
    }

    private extractIds(value: DashboardFilterValue | null): string[] {
        return value?.values?.map((selectedValue) => selectedValue.id ?? selectedValue.value ?? '').filter(Boolean) ?? [];
    }

    private handleCategoryUpdate(value: DashboardFilterValue | null, isReset: boolean): void {
        this.emitFilterValue(this.categoryChange, value, isReset, null);
    }

    private handleLegalCaseUpdate(value: DashboardFilterValue | null, isReset: boolean): void {
        this.emitFilterValue(this.legalCaseChange, value, isReset, []);
    }

    private emitFilterValue(
        emitter: { emit: (payload: { widgetId: WidgetId; value: string[] | null }) => void },
        value: DashboardFilterValue | null,
        isReset: boolean,
        resetValue: string[] | null
    ): void {
        const widgetId = this.widgetId();
        if (!widgetId) {
            return;
        }

        if (isReset || !value) {
            emitter.emit({ widgetId, value: resetValue });
            return;
        }

        emitter.emit({ widgetId, value: this.extractIds(value) });
    }
}
