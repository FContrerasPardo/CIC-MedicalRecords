/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { TranslatePipe } from '@ngx-translate/core';
import { SearchFilterContainerComponent } from '../base/search-filter-container/search-filter-container.component';
import { CutoffSearchFilterService } from './cutoff-search-filter.service';
import { DateSearchGenericFilterBase } from '../base/date-filter/date-search-generic-filter-base';

@Component({
    selector: 'hxp-governance-cutoff-search-filter',
    templateUrl: '../base/date-filter/date-search-filter.directive.html',
    styleUrl: '../base/date-filter/date-search-filter.directive.scss',
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatDividerModule,
        MatDatepickerModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatListModule,
        MatMenuModule,
        ReactiveFormsModule,
        TranslatePipe,
        SearchFilterContainerComponent,
    ],
    providers: [CutoffSearchFilterService],
})
export class CutoffSearchFilterComponent extends DateSearchGenericFilterBase<CutoffSearchFilterService> {
    private readonly cutoffSearchFilterService = inject(CutoffSearchFilterService);

    protected override getService(): CutoffSearchFilterService {
        return this.cutoffSearchFilterService;
    }

    constructor() {
        super('GOVERNANCE.SEARCH.FILTERS.CUTOFF.LABEL');
    }
}
