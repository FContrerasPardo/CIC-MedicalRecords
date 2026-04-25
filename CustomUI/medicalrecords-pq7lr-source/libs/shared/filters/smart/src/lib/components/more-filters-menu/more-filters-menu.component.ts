/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Filter, FilterService } from '@alfresco-dbp/shared-filters-services';
import { ChangeDetectionStrategy, Component, computed, EventEmitter, inject, OnInit, Output, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { take } from 'rxjs/operators';
import { A11yModule } from '@angular/cdk/a11y';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'hxp-more-filters-menu',
    templateUrl: './more-filters-menu.component.html',
    styleUrls: ['./more-filters-menu.component.scss'],
    imports: [
        MatButtonModule,
        MatIconModule,
        MatCheckboxModule,
        MatFormFieldModule,
        FormsModule,
        MatInputModule,
        ReactiveFormsModule,
        TranslatePipe,
        MatDividerModule,
        A11yModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoreFiltersMenuComponent implements OnInit {
    private readonly filterService = inject(FilterService);
    private readonly translateService = inject(TranslateService);

    @Output() filtersVisibilityUpdate = new EventEmitter<Filter[]>();

    readonly filters = signal<Filter[]>([]);
    readonly searchInput = new FormControl('');

    private readonly searchValue = toSignal(this.searchInput.valueChanges, { initialValue: '' });

    readonly filteredFilters = computed(() => {
        const phrase = this.searchValue()?.toLowerCase() ?? '';
        const filters = this.filters();
        return phrase
            ? filters.filter((filter) => {
                  const translatedLabel = this.translateService.instant(filter.translationKey);
                  return translatedLabel.toLowerCase().includes(phrase);
              })
            : filters;
    });

    filterVisibilitiesForm = new FormGroup({});
    initialFormState: { [key: string]: boolean } = {};

    ngOnInit(): void {
        this.filterService
            .getAllFilters()
            .pipe(take(1))
            .subscribe((filters) => {
                for (const filter of filters) {
                    // Disable checkbox only if filter is visible AND allowEmpty is false
                    // This allows re-enabling filters that were removed from chips
                    this.filterVisibilitiesForm.addControl(
                        filter.name,
                        new FormControl({ value: filter.visible, disabled: !filter.allowEmpty && filter.visible })
                    );
                }
                this.filters.set(filters);
                this.initialFormState = this.filterVisibilitiesForm.getRawValue();
            });
    }

    onUpdate(): void {
        const filters = this.filters();
        for (const filter of filters) {
            const newVisibility = this.filterVisibilitiesForm.get(filter.name)?.value;
            if (newVisibility !== filter.visible) {
                filter.visible = newVisibility;
                this.filterService.updateFilter(filter);
            }
        }
        this.filtersVisibilityUpdate.emit(filters);
    }
}
