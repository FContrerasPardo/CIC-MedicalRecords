/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import {
    AfterContentInit,
    Component,
    ContentChildren,
    DestroyRef,
    EventEmitter,
    inject,
    Input,
    OnChanges,
    Output,
    QueryList,
    ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { SelectionModel } from '@angular/cdk/collections';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DataColumnComponent } from './data-column.component';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'hxp-entity-list',
    templateUrl: './entity-list.component.html',
    styleUrl: './entity-list.component.scss',
    imports: [CommonModule, MatTableModule, MatSortModule, MatCheckboxModule, MatButtonModule, MatIconModule, TranslatePipe],
})
export class EntityListComponent<T extends object = object> implements OnChanges, AfterContentInit {
    @Input() records: T[] = [];
    @Input() selectAllEnabled = true;
    @Input() showSelection = true;
    @Input() sorting: Sort = { active: '', direction: '' };
    @Input() rowIdKey = 'id';

    @Output() selectionChanged = new EventEmitter<T[]>();
    @Output() sortingChanged = new EventEmitter<Sort>();

    protected dataSource = new MatTableDataSource<T>();
    protected selection = new SelectionModel<T>(true, []);
    protected displayedColumns: string[] = [];

    @ViewChild(MatSort, { static: true }) protected sort!: MatSort;
    @ContentChildren(DataColumnComponent) protected projectedColumns!: QueryList<DataColumnComponent>;

    private readonly destroyRef = inject(DestroyRef);
    private readonly translate = inject(TranslateService);

    ngOnChanges() {
        this.updateDataSource();
        this.resetSelection();
    }

    ngAfterContentInit() {
        this.displayedColumns = ['select', ...this.projectedColumns.map((col) => col.key)];

        this.sort.sortChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((sortEvent: Sort) => {
            this.sorting = sortEvent;
            this.handleSortingChanged(sortEvent);
        });
    }

    isAllSelected() {
        const numSelected = this.selection.selected.length;
        const numRows = this.dataSource.data.length;
        return numSelected > 0 && numSelected === numRows;
    }

    selectAll() {
        this.selection.select(...this.dataSource.data);
        this.selectionChanged.emit(this.selection.selected);
    }

    clearSelection() {
        this.selection.clear();
        this.selectionChanged.emit(this.selection.selected);
    }

    toggleAllRowsSelection() {
        if (this.isAllSelected()) {
            this.selection.clear();
        } else {
            this.selection.select(...this.dataSource.data);
        }
        this.selectionChanged.emit(this.selection.selected);
    }

    private updateDataSource() {
        this.dataSource.data = this.records;

        if (this.sort) {
            this.dataSource.sort = this.sort;
            this.sort.active = this.sorting.active;
            this.sort.direction = this.sorting.direction;
            this.dataSource.sortData = (data) => data;
        }
    }

    protected toggleRowSelection(row: T) {
        this.selection.toggle(row);
        this.selectionChanged.emit(this.selection.selected);
    }

    protected onRowCheckboxKeydown(event: KeyboardEvent): void {
        if (this.isActivationKey(event)) {
            event.stopPropagation();
        }
    }

    protected onRowKeydown(event: KeyboardEvent, row: T): void {
        if (!this.isActivationKey(event)) {
            return;
        }
        if (this.isNestedInteractiveEvent(event)) {
            return;
        }

        event.preventDefault();
        this.toggleRowSelection(row);
    }

    protected handleSortingChanged(sortingEvent: Sort): void {
        const { active, direction } = sortingEvent;
        if (active && direction) {
            this.sortingChanged.emit(sortingEvent);
        }
    }

    protected resetSorting() {
        this.sort.active = '';
        this.sort.direction = '';
        this.sort.sortChange.emit({ active: '', direction: '' });
    }

    protected resetSelection() {
        this.selection.clear();
        this.selectionChanged.emit([]);
    }

    protected getRowAriaLabel(row?: T): string {
        if (!row) {
            return this.translate.instant('GOVERNANCE.SEARCH_RESULTS.BUTTONS.SELECT_ROW.LABEL');
        }

        const idValue = (row as Record<string, unknown>)[this.rowIdKey];
        if (typeof idValue === 'string' || typeof idValue === 'number') {
            return this.translate.instant('GOVERNANCE.SEARCH_RESULTS.BUTTONS.SELECT_ROW_WITH_ID.LABEL', { id: idValue });
        }

        return this.translate.instant('GOVERNANCE.SEARCH_RESULTS.BUTTONS.SELECT_ROW.LABEL');
    }

    private isActivationKey(event: KeyboardEvent): boolean {
        return event.key === 'Enter' || event.key === ' ' || event.code === 'Space';
    }

    private isNestedInteractiveEvent(event: KeyboardEvent): boolean {
        const target = event.target as HTMLElement | null;
        const currentTarget = event.currentTarget as HTMLElement | null;

        if (!target || !currentTarget || target === currentTarget) {
            return false;
        }

        const interactiveElement = target.closest(
            'button, a, input, select, textarea, [role="button"], [role="link"], [role="menuitem"], [role="checkbox"], [contenteditable="true"]'
        );

        return !!interactiveElement && currentTarget.contains(interactiveElement);
    }
}
