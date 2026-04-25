/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, inject, Injector, input } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { map, Observable } from 'rxjs';
import { MultiSelectListSearchFilterBase } from '../base/multi-select-list-filter/multi-select-list-search-filter.directive';
import { LegalCaseNameSearchFilterService } from './legal-case-name-search-filter.service';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SearchFilterContainerComponent } from '../base/search-filter-container/search-filter-container.component';
import { TranslatePipe } from '@ngx-translate/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
    MultiSelectListSearchFilterData,
    MultiSelectListSearchFilterValue,
} from '../base/multi-select-list-filter/multi-select-list-search-filter.data';
import { SearchFilterInputComponent } from '../base/search-filter-input/search-filter-input.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SearchFilterData } from '../../models/search-filter.data';

@Component({
    selector: 'hxp-governance-legal-case-name-filter',
    templateUrl: '../base/multi-select-list-filter/multi-select-list-search-filter.directive.html',
    styleUrl: '../base/multi-select-list-filter/multi-select-list-search-filter.directive.scss',
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatChipsModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatListModule,
        MatTooltipModule,
        MatProgressSpinnerModule,
        ReactiveFormsModule,
        SearchFilterContainerComponent,
        TranslatePipe,
        SearchFilterInputComponent,
    ],
})
export class LegalCaseNameSearchFilterComponent extends MultiSelectListSearchFilterBase {
    private readonly legalCaseNameSearchFilterService = inject(LegalCaseNameSearchFilterService);
    private readonly injector = inject(Injector);

    legalCaseItems = input<Array<{ id: string; category: string }>>([]);

    constructor() {
        super();
        this.filterLabelKey = 'GOVERNANCE.SEARCH.FILTERS.LEGAL_CASE.LABEL';
    }

    toQueryParams(data: SearchFilterData): Record<string, string[]> | Record<string, never> {
        return this.legalCaseNameSearchFilterService.toQueryParams(data as MultiSelectListSearchFilterData);
    }

    fromQueryParams(params: Record<string, unknown>): MultiSelectListSearchFilterData | undefined {
        return this.legalCaseNameSearchFilterService.fromQueryParams(params, this.legalCaseItems());
    }

    protected override getQueryParamKeys(): string[] {
        // This widget-level filter is intentionally not persisted in URL query params.
        return [];
    }

    protected loadOptions(): Observable<MultiSelectListSearchFilterValue[]> {
        return toObservable(this.legalCaseItems, { injector: this.injector }).pipe(
            map((legalCaseItems) =>
                legalCaseItems.map((legalCaseItem) => ({
                    label: legalCaseItem.category,
                    value: legalCaseItem.id,
                }))
            )
        );
    }
}
