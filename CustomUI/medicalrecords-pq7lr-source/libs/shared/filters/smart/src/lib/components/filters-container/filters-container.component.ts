/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Filter, FilterService } from '@alfresco-dbp/shared-filters-services';
import { CommonModule } from '@angular/common';
import {
    Component,
    EventEmitter,
    Input,
    Output,
    inject,
    ChangeDetectionStrategy,
    OnInit,
    OnChanges,
    DestroyRef,
    SimpleChanges,
    ChangeDetectorRef,
    signal,
    ViewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { FilterFactoryDirective } from '../filters/filter-factory.directive';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { OverlayModule } from '@angular/cdk/overlay';
import { withLatestFrom } from 'rxjs/operators';
import { MatChipsModule } from '@angular/material/chips';
import { MoreFiltersMenuComponent } from '../more-filters-menu/more-filters-menu.component';
import { FiltersContainerActionsComponent } from '../filters-container-actions/filters-container-actions.component';
import { cloneDeep } from 'es-toolkit/compat';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS, MatFormFieldModule } from '@angular/material/form-field';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatOption, MatAutocomplete, MatAutocompleteTrigger, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

export type FiltersContainerActions = 'save' | 'saveAs' | 'delete' | 'reset' | 'rename';
export interface FilterSet {
    name: string | null;
}

@Component({
    selector: 'hxp-filters-container',
    templateUrl: './filters-container.component.html',
    styleUrls: ['./filters-container.component.scss'],
    imports: [
        CommonModule,
        MatExpansionModule,
        OverlayModule,
        MatIconModule,
        MatButtonModule,
        MatTooltipModule,
        TranslatePipe,
        MatChipsModule,
        FilterFactoryDirective,
        MoreFiltersMenuComponent,
        FiltersContainerActionsComponent,
        MatAutocomplete,
        MatOption,
        MatFormFieldModule,
        MatInputModule,
        MatAutocompleteTrigger,
        ReactiveFormsModule,
    ],
    providers: [
        {
            provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
            useValue: {
                appearance: 'outline',
                subscriptSizing: 'dynamic',
            },
        },
        FilterService,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiltersContainerComponent implements OnInit, OnChanges {
    private readonly filterService = inject(FilterService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly translateService = inject(TranslateService);

    @Input() filters: Filter[] = [];
    @Input() isDefaultFilter = false;
    @Input() loading = true;
    @Input() visibleActions: FiltersContainerActions[] = ['saveAs', 'save', 'delete', 'reset', 'rename'];

    @Input() savedFilters: FilterSet[] = [];
    @Input() currentSavedFilter?: FilterSet;
    @Input() isUserFilterFeatureOn = false;

    @Output() filtersChange = new EventEmitter<Filter[]>();

    @Output() saveFilterAs = new EventEmitter<string>();
    @Output() saveFilter = new EventEmitter<void>();
    @Output() deleteFilter = new EventEmitter<void>();
    @Output() savedFilterSelected = new EventEmitter<Filter>();
    @Output() renameFilters = new EventEmitter<string>();

    allFilters: Filter[] = [];
    visibleFilters = signal<Filter[]>([]);

    isMenuOpen = false;
    isPanelExpanded = false;

    protected savedFilterControl = new FormControl<string | FilterSet | null>(null);
    filteredSavedFilters: FilterSet[] = [];

    @ViewChild(MatAutocompleteTrigger) private readonly autocompleteTrigger?: MatAutocompleteTrigger;

    ngOnInit(): void {
        this.filterService
            .getAllFilters()
            .pipe(withLatestFrom(this.filterService.filterValuesChanged$), takeUntilDestroyed(this.destroyRef))
            .subscribe(([allFilters, filterValuesChanged]) => {
                this.allFilters = cloneDeep(allFilters);
                const visibleFilters = allFilters.filter((filter) => filter.visible);
                this.visibleFilters.update(() => visibleFilters);
                if (filterValuesChanged) {
                    this.filtersChange.emit(allFilters);
                }
            });

        if (this.savedFilters) {
            this.setupSavedFiltersAutocomplete();
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['filters'] && this.filters.length > 0) {
            this.filterService.setFilters(this.filters);
        }

        if (changes['savedFilters']) {
            this.filteredSavedFilters = [...this.savedFilters];
            this.cdr.detectChanges();
        }

        if (changes['currentSavedFilter']) {
            this.updateSavedFilterControl();
        }
    }

    private setupSavedFiltersAutocomplete(): void {
        this.filteredSavedFilters = [...this.savedFilters];

        this.savedFilterControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
            if (!value || typeof value !== 'string') {
                this.filteredSavedFilters = [...this.savedFilters];
                return;
            }

            const filterValue = value.toLowerCase();
            this.filteredSavedFilters = this.savedFilters.filter((filter) => this.getFilterName(filter).toLowerCase().includes(filterValue));
        });

        this.updateSavedFilterControl();
    }

    private updateSavedFilterControl(): void {
        if (this.currentSavedFilter) {
            this.savedFilterControl.setValue(this.currentSavedFilter);
        } else {
            this.savedFilterControl.setValue(null, { emitEvent: false });
        }
        this.cdr.markForCheck();
    }

    onFilterValueChange(filter: Filter): void {
        this.filterService.updateFilter(filter);
    }

    onFilterRemove(filter: Filter): void {
        filter.visible = false;

        this.filterService.updateFilter(filter);
    }

    onFiltersSave(): void {
        this.filterService.setFilters(this.allFilters);
        this.saveFilter.emit();
    }

    onSavedFilterSelect(event: MatAutocompleteSelectedEvent): void {
        const selectedFilter = event.option.value;
        if (this.currentSavedFilter?.name !== selectedFilter.name) {
            this.currentSavedFilter = selectedFilter;
            this.savedFilterSelected.emit(selectedFilter);
        }
    }

    onEscape(): void {
        this.autocompleteTrigger?.closePanel();
    }

    protected onClearSavedFilter(event: Event): void {
        event.stopPropagation();
        this.savedFilterControl.setValue(null);

        if (this.currentSavedFilter) {
            this.savedFilterSelected.emit(undefined);
        }
    }

    protected getFilterNames(filters: FilterSet[]): string[] {
        return filters?.map((filter) => this.translateService.instant(filter.name)) ?? [];
    }

    protected displaySavedFilterName = (filter: Filter): string => this.getFilterName(filter);

    protected getFilterName(filter: FilterSet): string {
        return filter?.name ? this.translateService.instant(filter.name) : '';
    }
}
