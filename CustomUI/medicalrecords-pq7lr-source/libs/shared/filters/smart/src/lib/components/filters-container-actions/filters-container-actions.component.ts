/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { FilterService } from '@alfresco-dbp/shared-filters-services';
import { FilterSaveAsDialogComponent } from '../filter-save-as-dialog/filter-save-as-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { map } from 'rxjs/operators';
import { of } from 'rxjs';
import { FiltersContainerActions } from '../filters-container/filters-container.component';

@Component({
    selector: 'hxp-filters-container-actions',
    imports: [CommonModule, MatButtonModule, TranslatePipe],
    templateUrl: './filters-container-actions.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiltersContainerActionsComponent implements OnChanges {
    private readonly filterService = inject(FilterService);
    readonly dialog = inject(MatDialog);

    @Input() isDefaultFilter = true;
    @Input() visibleActions: FiltersContainerActions[] = [];
    @Input() filterNames: string[] = [];
    @Input() currentFilterName?: string;

    @Output() saveClick = new EventEmitter<void>();
    @Output() saveAsClick = new EventEmitter<string>();
    @Output() deleteClick = new EventEmitter<void>();
    @Output() renameClick = new EventEmitter<string>();

    filtersClean$ = this.filterService.filtersDirty$.pipe(map((filtersDirty) => !filtersDirty));

    private readonly resetAction = {
        label: 'FILTERS.RESET',
        click: () => this.onReset(),
        disabled$: this.filtersClean$,
        visible: true,
    };

    private readonly saveAction = {
        label: 'FILTERS.SAVE',
        click: () => this.onSave(),
        disabled$: this.filtersClean$,
        visible: false,
    };

    private readonly saveAsAction = {
        label: 'FILTERS.SAVE_AS',
        click: () => this.onSaveAs(),
        disabled$: this.filtersClean$,
        visible: true,
    };

    private readonly deleteAction = {
        label: 'FILTERS.DELETE',
        click: () => this.onDelete(),
        disabled$: of(false),
        visible: false,
    };

    private readonly renameAction = {
        label: 'FILTERS.RENAME',
        click: () => this.onRename(),
        disabled$: of(false),
        visible: false,
    };

    readonly actions = [this.saveAsAction, this.saveAction, this.resetAction, this.renameAction, this.deleteAction];

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['isDefaultFilter'] || changes['visibleActions']) {
            this.saveAction.visible = !this.isDefaultFilter && this.visibleActions.includes('save');
            this.deleteAction.visible = !this.isDefaultFilter && this.visibleActions.includes('delete');
            this.renameAction.visible = !this.isDefaultFilter && this.visibleActions.includes('rename');
            this.saveAsAction.visible = this.visibleActions.includes('saveAs');
            this.resetAction.visible = this.visibleActions.includes('reset');
        }
    }

    onReset(): void {
        this.filterService.resetFilters();
    }

    onSave(): void {
        this.saveClick.emit();
    }

    onSaveAs(): void {
        this.dialog
            .open(FilterSaveAsDialogComponent, {
                height: 'auto',
                minWidth: '500px',
                data: {
                    title: 'FILTERS.DIALOG.TITLE_SAVE_AS',
                    existingFilterNames: this.filterNames,
                    currentFilterName: this.currentFilterName,
                },
            })
            .afterClosed()
            .subscribe((result) => {
                if (result?.name) {
                    this.saveAsClick.emit(result.name);
                }
            });
    }

    onDelete(): void {
        this.deleteClick.emit();
    }

    onRename(): void {
        this.dialog
            .open(FilterSaveAsDialogComponent, {
                height: 'auto',
                minWidth: '500px',
                data: {
                    title: 'FILTERS.DIALOG.TITLE_RENAME',
                    existingFilterNames: this.filterNames,
                    currentFilterName: this.currentFilterName,
                },
            })
            .afterClosed()
            .subscribe((result) => {
                if (result?.name) {
                    this.renameClick.emit(result.name);
                }
            });
    }

    trackByActionLabel(index: number, action: any): string {
        return action.label;
    }
}
