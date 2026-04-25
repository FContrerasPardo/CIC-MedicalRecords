/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import {
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    DestroyRef,
    effect,
    ElementRef,
    EventEmitter,
    HostListener,
    inject,
    Input,
    NgZone,
    Output,
    Pipe,
    PipeTransform,
    QueryList,
    signal,
    ViewChild,
    ViewChildren,
    ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatTable, MatTableModule } from '@angular/material/table';
import { IdpFieldDataType, IdpFieldValidationRules, IdpVerificationStatus } from '@hxp/workspace-hxp/idp-services-extension/shared';
import {
    FillDirection,
    GroupSelectionType,
    IdpField,
    IdpTable,
    IdpTableRowRecord,
    IdpTableSummary,
    IdpValidationStatus,
} from '../../models/screen-models';
import { BehaviorSubject, distinctUntilChanged, filter, fromEvent, map, Observable, startWith, switchMap, take, throttleTime } from 'rxjs';
import { BasicOcrWord, findSingleTypeaheadMatch, IdpVerificationService } from '../../services/verification/verification.service';
import { DataSource } from '@angular/cdk/collections';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ActionHistoryService } from '../../services/action-history.service';
import { FormsModule } from '@angular/forms';
import { IdpTableCellValidationService } from '../../services/table-cell-validation/table-cell-validation.service';
import { MatDivider } from '@angular/material/divider';
import { IconModule } from '@alfresco/adf-core';

const EXTRACTION_TABLE_ROW_HEIGHT_PX = 42;
const RENDER_BUFFER_ROWS = 10;
const TIMEOUT_DELAY = 50;
const DEFAULT_VIEWPORT_HEIGHT_PX = 400;

interface VirtualScrollSpacer {
    isSpacer: true;
    height: number;
}

type RowOrSpacer = IdpTableRowRecord | VirtualScrollSpacer;

class ExtractionTableScrollDataSource extends DataSource<RowOrSpacer> {
    private readonly slice$ = new BehaviorSubject<RowOrSpacer[]>([]);

    updateSlice(allRows: IdpTableRowRecord[], start: number, end: number): void {
        const topHeight = start * EXTRACTION_TABLE_ROW_HEIGHT_PX;
        const bottomHeight = Math.max(0, (allRows.length - end) * EXTRACTION_TABLE_ROW_HEIGHT_PX);
        const slice: RowOrSpacer[] = [
            { isSpacer: true, height: topHeight },
            ...allRows.slice(start, end),
            ...(bottomHeight > 0 ? [{ isSpacer: true, height: bottomHeight } as VirtualScrollSpacer] : []),
        ];
        this.slice$.next(slice);
    }

    setPassthroughRows(rows: IdpTableRowRecord[]): void {
        this.slice$.next(rows);
    }

    connect(): Observable<RowOrSpacer[]> {
        return this.slice$;
    }

    disconnect(): void {
        this.slice$.complete();
    }
}

@Pipe({ name: 'withRowNumberColumn', pure: true })
export class WithRowNumberColumnPipe implements PipeTransform {
    transform(columns: string[]) {
        return ['rowNumber', ...columns];
    }
}

@Component({
    selector: 'hyland-idp-extraction-table',
    imports: [
        CommonModule,
        FormsModule,
        MatFormFieldModule,
        MatTableModule,
        IconModule,
        MatInputModule,
        MatMenuModule,
        MatTooltipModule,
        TranslatePipe,
        WithRowNumberColumnPipe,
        MatDivider,
    ],
    templateUrl: './extraction-table.component.html',
    styleUrl: './extraction-table.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
})
export class ExtractionTableComponent implements AfterViewInit {
    @ViewChild('tableContainer', { read: ElementRef }) tableContainer?: ElementRef<HTMLElement>;
    @ViewChildren('extractionTableInput') metadataTableInputs!: QueryList<ElementRef<HTMLInputElement>>;
    @ViewChildren('rowMenuAnchor', { read: ElementRef }) rowMenuAnchors!: QueryList<ElementRef<HTMLElement>>;
    @ViewChildren('columnMenuAnchor', { read: ElementRef }) columnMenuAnchors!: QueryList<ElementRef<HTMLElement>>;
    @ViewChild('tableMenuTrigger') tableMenuTrigger!: MatMenuTrigger;
    @ViewChild('rowMenuTrigger') rowMenuTrigger?: MatMenuTrigger;
    @ViewChild('rowMenuTriggerElement') rowMenuTriggerElement?: ElementRef<HTMLElement>;
    @ViewChild('columnMenuTrigger') columnMenuTrigger?: MatMenuTrigger;
    @ViewChild('columnMenuTriggerElement') columnMenuTriggerElement?: ElementRef<HTMLElement>;
    @ViewChild('cellMenuTrigger') cellMenuTrigger?: MatMenuTrigger;
    @ViewChild('cellMenuTriggerElement') cellMenuTriggerElement?: ElementRef<HTMLElement>;
    @ViewChild('extractedTable') extractedTable?: MatTable<RowOrSpacer>;
    @ViewChild('scrollContainer') private readonly scrollContainer?: ElementRef<HTMLDivElement>;

    @Input() ocrWords = new Array<BasicOcrWord>();
    @Output() readonly fieldValuePending = new EventEmitter<{ field: IdpField; pendingValue: string }>();

    @Output() readonly groupSelectionChanged = new EventEmitter<{
        type: GroupSelectionType;
        index?: number;
        tableId?: string;
    }>();

    readonly table$: Observable<IdpTable | undefined>;
    readonly tableSummary$: Observable<IdpTableSummary | undefined>;
    readonly isValidationProcessRunning$: Observable<boolean>;

    readonly scrollDataSource = new ExtractionTableScrollDataSource();
    readonly isSpacerRow = (_: number, row: RowOrSpacer): boolean => (row as VirtualScrollSpacer).isSpacer === true;
    readonly isDataRow = (_: number, row: RowOrSpacer): boolean => !(row as VirtualScrollSpacer).isSpacer;

    readonly fieldValidationRules: Map<string, IdpFieldValidationRules> = new Map();
    private columnNames: string[] = [];

    blankTable = Array.from({ length: 5 }, () => ({ rowCells: [] }));
    loadingShellRows = Array.from({ length: 5 }, (_, index) => index);
    loadingShellColumns = Array.from({ length: 7 }, (_, index) => index);
    renderedRowOffset = 0;
    selectedRowIndices = signal(new Set<number>());
    selectedColumnIndices = signal(new Set<number>());
    tableSelected = false;
    singleCellFocus = false;

    get selectedRowIndex(): number {
        return this._selectedRowIndex;
    }

    set selectedRowIndex(value: number) {
        this._selectedRowIndex = value;
        this.selectedRowIndices.set(value >= 0 ? new Set([value]) : new Set());
    }

    get selectedColumnIndex(): number {
        return this._selectedColumnIndex;
    }

    set selectedColumnIndex(value: number) {
        this._selectedColumnIndex = value;
        this.selectedColumnIndices.set(value >= 0 ? new Set([value]) : new Set());
    }
    activeCellRowIndex = -1;
    activeCellColumnIndex = -1;
    activeCellRows: IdpTableRowRecord[] = [];

    private _selectedRowIndex = -1;
    private _selectedColumnIndex = -1;

    // Resize functionality properties
    private isResizing = false;
    private justFinishedResizing = false;
    private resizeStartX = 0;
    private resizeColumnName = '';
    private resizeStartWidth = 0;
    private columnWidthOverrides: { [columnName: string]: number } = {};

    // Column width configuration
    private readonly minColumnWidth = 60;
    private readonly maxColumnWidth = 600;
    private readonly fieldCharacterWidth = 11; // Width for field data text
    private readonly headerCharacterWidth = 10; // Width for header text
    private readonly RESIZE_CLICK_SUPPRESSION_DELAY_MS = 10;
    private readonly COLUMN_PADDING_PX = 20;
    private readonly MAX_FIELD_LENGTH_FOR_WIDTH_CALC = Math.floor(this.maxColumnWidth / this.fieldCharacterWidth);

    private readonly viewInitialized$ = new BehaviorSubject<boolean>(false);
    private lastKeyDownEvent?: KeyboardEvent;

    private currentTableId = '';
    private pendingFocusRequest?: { field: IdpField; tableId: string };
    private resolvedFocusTimerId?: ReturnType<typeof setTimeout>;
    private deferredWidthCalculationTimerId?: ReturnType<typeof setTimeout>;
    private allTableRows: IdpTableRowRecord[] = [];
    private renderedStart = 0;
    private renderedEnd = 0;
    private renderedDataRef: IdpTableRowRecord[] = [];

    private readonly verificationService = inject(IdpVerificationService);
    private readonly tableCellValidationService = inject(IdpTableCellValidationService);
    private readonly history = inject(ActionHistoryService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly elementRef = inject(ElementRef);
    private readonly translateService = inject(TranslateService);

    private longestFieldsPerColumn: Array<{ columnName: string; maxLength: number; value: string }> = [];
    private cachedColumnWidths: { [columnName: string]: string } = {};
    private readonly currentTable = toSignal(this.verificationService.activeTable$);
    private readonly ngZone = inject(NgZone);
    private readonly cdr = inject(ChangeDetectorRef);

    constructor() {
        this.table$ = this.verificationService.activeTable$.pipe(takeUntilDestroyed(this.destroyRef));
        this.tableSummary$ = this.verificationService.activeTableSummary$.pipe(takeUntilDestroyed(this.destroyRef));

        this.table$
            .pipe(
                filter((table) => !!table),
                distinctUntilChanged((prev, curr) => prev?.id === curr?.id),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((table) => {
                // Clear cached widths and manual overrides immediately to prevent old values from being used
                this.cachedColumnWidths = {};
                this.columnWidthOverrides = {};
                this.applyHeaderBasedColumnWidths(table);
                this.scheduleDeferredColumnWidthCalculation(table);
                // Mark component for check in next change detection cycle
                this.cdr.markForCheck();
                this.scheduleResolvedFocus();
            });

        effect(() => {
            const table = this.currentTable();
            if (table?.rows?.length) {
                this.allTableRows = table.rows;
                if (this.scrollContainer?.nativeElement) {
                    this.updateVirtualScrollWindow();
                } else {
                    this.scrollDataSource.updateSlice(table.rows, 0, Math.min(table.rows.length, RENDER_BUFFER_ROWS * 2));
                }
            } else {
                this.allTableRows = [];
                this.scrollDataSource.setPassthroughRows(this.blankTable);
            }
        });

        this.verificationService.activeField$
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                switchMap((field) =>
                    this.viewInitialized$.pipe(
                        filter((v) => v),
                        map(() => field)
                    )
                )
            )
            .subscribe((field) => {
                if (!field) {
                    return;
                }

                const tableId = field.dataType === IdpFieldDataType.Table ? field.id : field.tableId;
                const switchedTable = tableId !== this.currentTableId;
                this.currentTableId = tableId ?? '';

                if (switchedTable && !tableId) {
                    return;
                }

                // Load field definitions when table changes
                if (switchedTable && tableId) {
                    // eslint-disable-next-line rxjs/no-nested-subscribe
                    this.loadFieldDefinitions(tableId);
                }

                if (tableId && (field.dataType === IdpFieldDataType.Table || field.needsKeyboardFocus)) {
                    this.requestResolvedFocus(field, tableId);
                }
            });

        this.isValidationProcessRunning$ = this.verificationService.isValidationProcessRunning$.pipe(takeUntilDestroyed(this.destroyRef));
        this.destroyRef.onDestroy(() => {
            this.viewInitialized$.next(false);
            if (this.resolvedFocusTimerId) {
                clearTimeout(this.resolvedFocusTimerId);
            }
            if (this.deferredWidthCalculationTimerId) {
                clearTimeout(this.deferredWidthCalculationTimerId);
            }
            // Clean up resize state if component is destroyed during resize
            this.cleanupResizeState();
        });
    }

    private loadFieldDefinitions(tableId: string): void {
        this.fieldValidationRules.clear();
        this.columnNames = [];
        this.verificationService
            .getTableFieldDefinitions$(tableId)
            .pipe(take(1), takeUntilDestroyed(this.destroyRef))
            .subscribe((fieldDefinitions) => {
                fieldDefinitions.forEach((fieldDef) => {
                    this.columnNames.push(fieldDef.name);
                    if (fieldDef.validation) {
                        this.fieldValidationRules.set(fieldDef.name, fieldDef.validation);
                    }
                });
            });
    }

    private applyHeaderBasedColumnWidths(table: IdpTable): void {
        this.longestFieldsPerColumn = table.columnHeaderNames.map((columnName) => ({
            columnName,
            maxLength: columnName.length,
            value: columnName,
        }));
        this.cachedColumnWidths = this.calculateColumnWidths();
    }

    private scheduleDeferredColumnWidthCalculation(table: IdpTable): void {
        if (this.deferredWidthCalculationTimerId) {
            clearTimeout(this.deferredWidthCalculationTimerId);
        }

        this.deferredWidthCalculationTimerId = setTimeout(() => {
            const currentTable = this.currentTable();
            if (!currentTable || currentTable.id !== table.id) {
                return;
            }

            this.calculateAndCacheColumnWidths(currentTable);
            this.cdr.markForCheck();
            this.deferredWidthCalculationTimerId = undefined;
        }, 0);
    }

    private calculateAndCacheColumnWidths(table: IdpTable): void {
        // Update the longest fields data structure
        this.longestFieldsPerColumn = table.columnHeaderNames.map((columnName, columnIndex) => {
            let longestField = { value: '', length: 0 };

            // Start with the column name itself as a candidate
            if (columnName && columnName.length > longestField.length) {
                longestField = { value: columnName, length: columnName.length };
            }

            // Early break if header already reaches maximum useful length
            if (longestField.length >= this.MAX_FIELD_LENGTH_FOR_WIDTH_CALC) {
                return {
                    columnName,
                    maxLength: longestField.length,
                    value: longestField.value,
                };
            }

            // Find the longest field value in this column with early break (only if table has rows)
            for (const row of table.rows ?? []) {
                const cell = row.rowCells[columnIndex];
                if (cell?.value) {
                    const valueLength = cell.value.length;
                    if (valueLength > longestField.length) {
                        longestField = { value: cell.value, length: valueLength };

                        // Early break if we've reached the maximum useful length
                        if (longestField.length >= this.MAX_FIELD_LENGTH_FOR_WIDTH_CALC) {
                            break;
                        }
                    }
                }
            }

            return {
                columnName,
                maxLength: longestField.length,
                value: longestField.value || '(empty)',
            };
        });

        // Calculate and cache widths immediately
        this.cachedColumnWidths = this.calculateColumnWidths();
    }

    private calculateColumnWidths(): { [columnName: string]: string } {
        const columnWidths: { [columnName: string]: string } = {};

        // Special case for row number column - use minColumnWidth for consistency
        const rowNumberWidth = `${this.minColumnWidth}px`;
        columnWidths['rowNumber'] = rowNumberWidth;

        for (const columnData of this.longestFieldsPerColumn) {
            // Check if user has manually resized this column
            if (this.columnWidthOverrides[columnData.columnName]) {
                columnWidths[columnData.columnName] = `${this.columnWidthOverrides[columnData.columnName]}px`;
                continue;
            }

            // Check if the longest value is the column name (header) or field data
            const isHeaderLongest = columnData.value === columnData.columnName;

            const calculatedWidth = isHeaderLongest
                ? columnData.maxLength * this.headerCharacterWidth + this.COLUMN_PADDING_PX
                : columnData.maxLength * this.fieldCharacterWidth + this.COLUMN_PADDING_PX;

            const finalWidth = Math.max(this.minColumnWidth, Math.min(calculatedWidth, this.maxColumnWidth));

            columnWidths[columnData.columnName] = `${finalWidth}px`;
        }

        return columnWidths;
    }

    // Resize event handlers
    onResizeStart(event: MouseEvent, columnName: string): void {
        event.preventDefault();
        event.stopPropagation();

        this.isResizing = true;
        this.resizeColumnName = columnName;
        this.resizeStartX = event.clientX;

        // Get current width from the computed styles
        const currentWidth = Number.parseInt(this.columnWidths[columnName], 10) || this.minColumnWidth;
        this.resizeStartWidth = currentWidth;

        // Add global event listeners
        this.ngZone.runOutsideAngular(() => {
            document.addEventListener('mousemove', this.onResizeMove);
            document.addEventListener('mouseup', this.onResizeEnd);
        });

        // Add visual feedback
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }

    private readonly onResizeMove = (event: MouseEvent): void => {
        if (this.isResizing) {
            const deltaX = event.clientX - this.resizeStartX;
            const newWidth = Math.max(this.minColumnWidth, Math.min(this.maxColumnWidth, this.resizeStartWidth + deltaX));

            // Update the override width
            this.columnWidthOverrides[this.resizeColumnName] = newWidth;
            this.invalidateColumnWidths();
        }
    };

    private readonly onResizeEnd = (): void => {
        if (this.isResizing) {
            this.cleanupResizeState();
            this.invalidateColumnWidths();

            // Clear the flag after a short delay to allow the click event to be suppressed
            setTimeout(() => {
                this.justFinishedResizing = false;
            }, this.RESIZE_CLICK_SUPPRESSION_DELAY_MS);
        }
    };

    // Add this new method to centralize cleanup logic
    private cleanupResizeState(): void {
        if (this.isResizing) {
            this.isResizing = false;
            this.resizeColumnName = '';
            this.resizeStartX = 0;
            this.resizeStartWidth = 0;

            // Set flag to prevent click event from firing
            this.justFinishedResizing = true;

            // Remove global event listeners
            this.ngZone.runOutsideAngular(() => {
                document.removeEventListener('mousemove', this.onResizeMove);
                document.removeEventListener('mouseup', this.onResizeEnd);
            });

            // Remove visual feedback
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    }

    get columnWidths(): { [columnName: string]: string } {
        return this.cachedColumnWidths;
    }

    getSelectedColumnName(): string | undefined {
        return this.longestFieldsPerColumn[this.selectedColumnIndex]?.columnName;
    }

    // Reset column width to auto-calculated value
    resetColumnWidth(columnName: string | undefined): void {
        if (!columnName) {
            return;
        }

        delete this.columnWidthOverrides[columnName];
        this.invalidateColumnWidths();

        // Restore focus to the component after 'Reset Column' menu action
        setTimeout(() => {
            this.setComponentFocus();
        }, 0);
    }

    // Reset all column widths
    resetAllColumnWidths(): void {
        this.columnWidthOverrides = {};
        this.invalidateColumnWidths();

        // Restore focus to the component after 'Reset All Columns' menu action
        setTimeout(() => {
            this.setComponentFocus();
        }, 0);
    }

    focusFirstCell() {
        const firstInput = this.metadataTableInputs.first?.nativeElement;
        if (firstInput) {
            firstInput.focus();
        }
    }

    ngAfterViewInit() {
        this.metadataTableInputs.changes.pipe(startWith(this.metadataTableInputs), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.scheduleResolvedFocus();
        });

        if (this.allTableRows.length > 0) {
            this.updateVirtualScrollWindow();
        } else {
            this.scrollDataSource.setPassthroughRows(this.blankTable);
        }

        if (this.scrollContainer) {
            const scrollEl = this.scrollContainer.nativeElement;
            this.ngZone.runOutsideAngular(() => {
                fromEvent<Event>(scrollEl, 'scroll')
                    .pipe(throttleTime(TIMEOUT_DELAY, undefined, { leading: true, trailing: true }), takeUntilDestroyed(this.destroyRef))
                    .subscribe(() => this.updateVirtualScrollWindow());
            });
        }

        this.viewInitialized$.next(true);
        this.focusShell();

        if (!this.pendingFocusRequest) {
            this.resolvedFocusTimerId = setTimeout(() => {
                this.resolvedFocusTimerId = undefined;
                this.focusFirstCell();
            }, 0);
        }
    }

    private updateVirtualScrollWindow(): void {
        const container = this.scrollContainer?.nativeElement;
        if (!container) {
            return;
        }
        const allRows = this.allTableRows;
        if (allRows.length === 0) {
            return;
        }

        const scrollTop = container.scrollTop;
        const viewportHeight = container.clientHeight || DEFAULT_VIEWPORT_HEIGHT_PX;
        const bufferPx = RENDER_BUFFER_ROWS * EXTRACTION_TABLE_ROW_HEIGHT_PX;

        const newStart = Math.max(0, Math.floor((scrollTop - bufferPx) / EXTRACTION_TABLE_ROW_HEIGHT_PX));
        const newEnd = Math.min(allRows.length, Math.ceil((scrollTop + viewportHeight + bufferPx) / EXTRACTION_TABLE_ROW_HEIGHT_PX));

        if (newStart !== this.renderedStart || newEnd !== this.renderedEnd || allRows !== this.renderedDataRef) {
            this.ngZone.run(() => {
                this.renderedStart = newStart;
                this.renderedEnd = newEnd;
                this.renderedDataRef = allRows;
                this.renderedRowOffset = newStart;
                this.scrollDataSource.updateSlice(allRows, newStart, newEnd);
                this.cdr.markForCheck();
            });
        }
    }

    private scrollToDataRow(dataRowIndex: number): void {
        const container = this.scrollContainer?.nativeElement;
        if (!container) {
            return;
        }
        const rowTop = dataRowIndex * EXTRACTION_TABLE_ROW_HEIGHT_PX;
        const rowBottom = rowTop + EXTRACTION_TABLE_ROW_HEIGHT_PX;
        const viewTop = container.scrollTop;
        const viewBottom = viewTop + container.clientHeight;

        if (rowTop < viewTop) {
            container.scrollTop = rowTop;
        } else if (rowBottom > viewBottom) {
            container.scrollTop = rowBottom - container.clientHeight;
        }
    }

    private findInputAtDataIndex(cellIndex: number, dataRowIndex: number): ElementRef<HTMLInputElement> | undefined {
        return this.metadataTableInputs.toArray().find((input) => {
            const td = input.nativeElement.closest('td');
            const tr = input.nativeElement.closest('tr');
            return td?.cellIndex === cellIndex && Number(tr?.dataset['rowIndex']) === dataRowIndex;
        });
    }

    @HostListener('keydown', ['$event'])
    onComponentKeydown(event: KeyboardEvent) {
        switch (event.key) {
            case 'ArrowLeft': {
                if (event.ctrlKey && this.selectedColumnIndex >= 0) {
                    // Resize column narrower
                    this.resizeSelectedColumn(-10); // Resize by 10px increments
                    event.preventDefault();
                    return;
                }
                break;
            }
            case 'ArrowRight': {
                if (event.ctrlKey && this.selectedColumnIndex >= 0) {
                    // Resize column wider
                    this.resizeSelectedColumn(10); // Resize by 10px increments
                    event.preventDefault();
                    return;
                }
                break;
            }
            case 'Enter': {
                // Handle Enter when table/row/column is selected but no cell is focused
                if (this.isGroupSelected() && this.currentTableId) {
                    event.preventDefault();

                    this.verificationService
                        .getFieldById$(this.currentTableId)
                        .pipe(take(1))
                        .subscribe((field) => {
                            const table = this.currentTable();
                            if (field && (!table?.rows || table.rows.length === 0)) {
                                // Empty table - explicitly mark as valid with both statuses
                                const updatedField = {
                                    ...field,
                                    verificationStatus: IdpVerificationStatus.ManualValid,
                                    validationStatus: IdpValidationStatus.Valid,
                                };
                                this.verificationService.updateField(updatedField);
                            } else {
                                // Table has rows - use normal verification flow
                                this.verificationService.verifyField(this.currentTableId);
                                this.verificationService.runValidationProcessIfTableIsDirty(this.currentTableId);
                            }
                            this.verificationService.selectNextField();
                        });
                }
                break;
            }
            case 'Home': {
                // Navigate to previous column when a column is selected
                if (this.selectedColumnIndex >= 0) {
                    const newColumnIndex = Math.max(0, this.selectedColumnIndex - 1);
                    if (newColumnIndex !== this.selectedColumnIndex) {
                        this.updateSelection(GroupSelectionType.Column, newColumnIndex);
                    }
                    event.preventDefault();
                } else if (this.selectedRowIndex >= 0) {
                    this.navigateFirstRowCell(this.getTableRowRecords(), this.selectedRowIndex);
                    event.preventDefault();
                }
                break;
            }
            case 'End': {
                if (this.selectedColumnIndex >= 0) {
                    const newColumnIndex = Math.min(this.getMaxColumnIndex(), this.selectedColumnIndex + 1);
                    if (newColumnIndex !== this.selectedColumnIndex) {
                        this.updateSelection(GroupSelectionType.Column, newColumnIndex);
                    }
                    event.preventDefault();
                } else if (this.selectedRowIndex >= 0) {
                    this.navigateFirstRowCell(this.getTableRowRecords(), this.selectedRowIndex);
                    event.preventDefault();
                }
                break;
            }
            case 'PageUp': {
                // Navigate to previous row when a row is selected
                if (this.selectedRowIndex >= 0) {
                    const newRowIndex = Math.max(0, this.selectedRowIndex - 1);
                    if (newRowIndex !== this.selectedRowIndex) {
                        this.updateSelection(GroupSelectionType.Row, newRowIndex);
                    }
                    event.preventDefault();
                } else if (this.selectedColumnIndex >= 0) {
                    this.navigateFirstColumnCell(this.getTableRowRecords(), this.selectedColumnIndex);
                    event.preventDefault();
                }
                break;
            }
            case 'PageDown': {
                if (this.selectedRowIndex >= 0) {
                    const newRowIndex = Math.min(this.getMaxRowIndex(), this.selectedRowIndex + 1);
                    if (newRowIndex !== this.selectedRowIndex) {
                        this.updateSelection(GroupSelectionType.Row, newRowIndex);
                    }
                    event.preventDefault();
                } else if (this.selectedColumnIndex >= 0) {
                    this.navigateFirstColumnCell(this.getTableRowRecords(), this.selectedColumnIndex);
                    event.preventDefault();
                }
                break;
            }
            case 'Tab': {
                // Navigate to the first cell in the row or column if a row or column is selected
                const tableRowRecords = this.getTableRowRecords();
                if (this.selectedRowIndex >= 0) {
                    this.navigateFirstRowCell(tableRowRecords, this.selectedRowIndex);
                    event.preventDefault();
                } else if (this.selectedColumnIndex >= 0) {
                    this.navigateFirstColumnCell(tableRowRecords, this.selectedColumnIndex);
                    event.preventDefault();
                }
                break;
            }
            case '~': {
                if (event.ctrlKey && event.shiftKey) {
                    this.openContextMenu();
                    event.preventDefault();
                }
                break;
            }
            case ' ': {
                // Deselect the current field before selecting table
                if (event.shiftKey && event.ctrlKey) {
                    this.resetGroupSelections();
                    this.tableSelected = true;
                    event.preventDefault();
                } else if (event.shiftKey) {
                    if (this.selectedColumnIndex >= 0) {
                        this.updateSelection(GroupSelectionType.Table);
                    }
                    event.preventDefault();
                } else if (event.ctrlKey) {
                    if (this.selectedRowIndex >= 0) {
                        this.updateSelection(GroupSelectionType.Table);
                    }
                    event.preventDefault();
                }
                break;
            }
            case 'Escape': {
                if (this.tableSelected) {
                    // Reset all column widths when table is selected
                    this.resetAllColumnWidths();
                    event.preventDefault();
                } else if (this.selectedColumnIndex >= 0) {
                    // Reset selected column width to auto-calculated
                    const columnName = this.longestFieldsPerColumn[this.selectedColumnIndex]?.columnName;
                    if (columnName) {
                        this.resetColumnWidth(columnName);
                    }
                    event.preventDefault();
                }
                break;
            }
            case 't': {
                if (event.altKey) {
                    event.preventDefault();
                    this.addTableRow();
                }
                break;
            }
        }
    }

    // Add this new method for keyboard-based column resizing
    private resizeSelectedColumn(deltaWidth: number): void {
        if (this.selectedColumnIndex < 0 || this.selectedColumnIndex >= this.columnNames.length) {
            return;
        }

        // Get the column name from cached column names
        const columnName = this.columnNames[this.selectedColumnIndex];
        if (!columnName) {
            return;
        }

        // Get current width
        const currentWidthStr = this.columnWidths[columnName];
        const currentWidth = Number.parseInt(currentWidthStr, 10) || this.minColumnWidth;

        // Calculate new width within bounds
        const newWidth = Math.max(this.minColumnWidth, Math.min(this.maxColumnWidth, currentWidth + deltaWidth));

        // Only update if width actually changes
        if (newWidth !== currentWidth) {
            this.columnWidthOverrides[columnName] = newWidth;
            this.invalidateColumnWidths();
        }
    }

    onKeydown(field: IdpField, event: KeyboardEvent) {
        this.lastKeyDownEvent = event;
        event.stopPropagation(); // Prevent keyboard shortcuts from propagating to parent components

        // Handle Alt+T to add table row functionality
        if (event.key === 't' && event.altKey) {
            event.preventDefault();
            this.addTableRow();
            return;
        }

        // Handle Alt+Arrow and Ctrl+Alt+Arrow fill operations
        if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
            event.preventDefault();
            const inputElement = event.target as HTMLInputElement;
            if (event.shiftKey) {
                this.fillCells(inputElement, event.key === 'ArrowUp' ? FillDirection.AllAbove : FillDirection.AllBelow);
            } else {
                this.fillCells(inputElement, event.key === 'ArrowUp' ? FillDirection.ToAbove : FillDirection.ToBelow);
            }
            return;
        }

        const currentInput = event.target as HTMLInputElement;
        const currentCell = currentInput.closest('td');

        if (currentCell) {
            const currentRow = currentCell?.parentElement as HTMLTableRowElement;
            const currentRowIndex = [...(currentRow?.parentElement?.children || [])].indexOf(currentRow);
            const currentCellIndex = [...(currentRow?.children || [])].indexOf(currentCell);
            const currentDataRowIndex = Number(currentRow.dataset['rowIndex'] ?? currentRow.rowIndex - 1);

            let targetInput: HTMLInputElement | null = null;

            switch (event.key) {
                case 'PageDown': {
                    const nextRow = currentRow?.parentElement?.children[currentRowIndex + 1] as HTMLTableRowElement;
                    const isNextRowSpacer = nextRow?.classList.contains('idp-virtual-spacer-row');
                    if (!nextRow || isNextRowSpacer) {
                        if (currentDataRowIndex + 1 < this.allTableRows.length) {
                            this.scrollToDataRow(currentDataRowIndex + 1);
                            event.preventDefault();
                            setTimeout(() => {
                                this.findInputAtDataIndex(currentCellIndex, currentDataRowIndex + 1)?.nativeElement.focus();
                            }, TIMEOUT_DELAY);
                        }
                    } else {
                        targetInput = nextRow?.children[currentCellIndex]?.querySelector('input');
                    }
                    break;
                }
                case 'PageUp': {
                    if (currentDataRowIndex === 0) {
                        this.updateSelection(GroupSelectionType.Column, currentCell.cellIndex - 1);
                        event.preventDefault();
                    } else {
                        const previousRow = currentRow?.parentElement?.children[currentRowIndex - 1] as HTMLTableRowElement;
                        const isPreviousRowSpacer = previousRow?.classList.contains('idp-virtual-spacer-row');
                        if (currentRowIndex === 0 || isPreviousRowSpacer) {
                            this.scrollToDataRow(currentDataRowIndex - 1);
                            event.preventDefault();
                            setTimeout(() => {
                                this.findInputAtDataIndex(currentCellIndex, currentDataRowIndex - 1)?.nativeElement.focus();
                            }, TIMEOUT_DELAY);
                        } else {
                            targetInput = previousRow?.children[currentCellIndex]?.querySelector('input');
                        }
                    }
                    break;
                }
                case 'Home': {
                    if (currentCellIndex === 1) {
                        // First data column (index 1, since 0 is row number column)
                        // Select the current row when at the first column
                        this.updateSelection(GroupSelectionType.Row, currentDataRowIndex);
                        event.preventDefault();
                    } else {
                        targetInput = currentRow?.children[currentCellIndex - 1]?.querySelector('input');
                    }
                    break;
                }
                case 'End': {
                    targetInput = currentRow?.children[currentCellIndex + 1]?.querySelector('input');
                    break;
                }
                case 'Enter': {
                    // First update the current field value to ensure table is marked as dirty
                    this.onFieldFocusOut(field, currentInput);

                    // Then update table status to Verified
                    if (this.currentTableId) {
                        this.verificationService.verifyField(this.currentTableId);
                    }

                    event.preventDefault();
                    this.verificationService.runValidationProcessIfTableIsDirty(this.currentTableId);
                    this.verificationService.selectNextField();
                    break;
                }
                case '~': {
                    if (event.ctrlKey && event.shiftKey) {
                        this.openContextMenu();
                        event.preventDefault();
                    }
                    break;
                }
                case ' ': {
                    if (event.shiftKey && event.ctrlKey) {
                        this.updateSelection(GroupSelectionType.Table);
                        event.preventDefault();
                    } else if (event.shiftKey) {
                        if (this.selectedColumnIndex >= 0) {
                            this.updateSelection(GroupSelectionType.Table);
                        } else {
                            this.updateSelection(GroupSelectionType.Row, currentDataRowIndex);
                        }
                        event.preventDefault();
                    } else if (event.ctrlKey) {
                        if (this.selectedRowIndex >= 0) {
                            this.updateSelection(GroupSelectionType.Table);
                        } else {
                            this.updateSelection(GroupSelectionType.Column, currentCell.cellIndex - 1);
                        }
                        event.preventDefault();
                    }
                    break;
                }
            }

            if (targetInput) {
                targetInput.focus();
                event.preventDefault();
            }
        } else {
            // Fallback for when no cell is found but onKeydown was called from an input
            if (event.key === 'Enter' && this.currentTableId) {
                this.verificationService.runValidationProcessIfTableIsDirty(this.currentTableId);
                this.verificationService.activeField$.pipe(take(1)).subscribe((tableField) => {
                    if (tableField) {
                        this.verificationService.verifyField(this.currentTableId);
                    }
                    this.verificationService.selectNextField();
                });
            }
        }
    }

    onFieldFocus(field: IdpField) {
        if (field) {
            if (this.isGroupSelected()) {
                // if the user clicked on a field, we clear the focus from the table
                this.resetGroupSelections();
                this.groupSelectionChanged.emit({ type: GroupSelectionType.None });
            }
            // if the user clicked on a field, we want to select it
            this.singleCellFocus = true;
            this.verificationService.selectField(field);
            this.fieldValuePending.emit({ field, pendingValue: field.value ?? '' });
        }
    }

    onFieldInput(field: IdpField, input: HTMLInputElement) {
        // if the user is deleting text, we don't want to auto-complete
        const isDismissal = this.lastKeyDownEvent?.key === 'Backspace' || this.lastKeyDownEvent?.key === 'Delete';
        if (!isDismissal) {
            const userValue = input.value;
            const suggestion = findSingleTypeaheadMatch(this.ocrWords, userValue);
            if (suggestion) {
                input.value = suggestion.map((word) => word.text).join(' ');
                input.setSelectionRange(userValue.length, input.value.length);
            }
        }

        // Update validation status immediately as user types
        this.updateFieldValidationStatus(field, input.value);

        this.fieldValuePending.emit({ field, pendingValue: input.value });
    }

    onFieldFocusOut(field: IdpField, element: HTMLInputElement): void {
        if ((field.value ?? '') === element.value) {
            this.updateFieldValidationStatus(field, element.value);
            // same value is an update (field is ManuallyReviewed), but not an undoable action
            this.verificationService.updateField(field);
        } else {
            // Capture values and field metadata for undo/redo
            const fieldId = field.id;
            const fieldName = field.name;
            const newValue = element.value;
            const originalValue = field.value;
            // Capture the full field object structure for spreading
            const baseField = { ...field };

            this.history.do({
                do: () => {
                    // Recalculate validation for the new value at execution time
                    const validation = this.fieldValidationRules.get(fieldName);
                    const isValid = this.tableCellValidationService.validateField({ value: newValue, name: fieldName }, validation);
                    const validationStatus = isValid ? IdpValidationStatus.Valid : IdpValidationStatus.Invalid;

                    this.verificationService.updateField({
                        ...baseField,
                        id: fieldId,
                        value: newValue,
                        validationStatus,
                    });
                },
                undo: () => {
                    // Recalculate validation for the original value at execution time
                    const validation = this.fieldValidationRules.get(fieldName);
                    const isValid = this.tableCellValidationService.validateField({ value: originalValue ?? '', name: fieldName }, validation);
                    const validationStatus = isValid ? IdpValidationStatus.Valid : IdpValidationStatus.Invalid;

                    this.verificationService.updateField({
                        ...baseField,
                        id: fieldId,
                        value: originalValue,
                        validationStatus,
                    });
                },
            });
        }
    }

    getFieldStatus(field: IdpField) {
        // until the hasIssue vs. VerificationStatus is clear, return a single indicator of which icon to show
        if (field.verificationStatus === 'ManualValid') {
            return 'issueResolved';
        } else if (field.hasIssue) {
            return 'hasIssue';
        }
        return '';
    }

    trackRow(index: number, row: RowOrSpacer) {
        if ((row as VirtualScrollSpacer).isSpacer) {
            return `spacer-${index}`;
        }
        const dataRow = row as IdpTableRowRecord;
        if (dataRow.rowCells.length === 0) {
            return index;
        }
        return dataRow.rowCells.map((cell) => cell?.id ?? '').join(',');
    }

    trackColumn(index: number) {
        return index;
    }

    onTableMenuLeftClick(event: MouseEvent) {
        this.selectTable(event);
    }

    onTableMenuRightClick(event: MouseEvent, menuTrigger: MatMenuTrigger, triggerElement: HTMLElement) {
        this.selectTable(event);
        this.openMenuAtCursor(triggerElement, menuTrigger, event.clientX, event.clientY);
    }

    onRowMenuLeftClick(event: MouseEvent, rowIndex: number) {
        if (event.ctrlKey) {
            this.toggleSingleRowSelection(rowIndex);
            event.preventDefault();
        } else if (event.shiftKey && this._selectedRowIndex >= 0) {
            this.extendRowSelectionTo(rowIndex);
            event.preventDefault();
        } else {
            this.selectRow(rowIndex, event);
        }
    }

    onRowMenuRightClick(event: MouseEvent, rowIndex: number) {
        if (this.selectedRowIndices().has(rowIndex)) {
            event.preventDefault();
            this.setComponentFocus();
        } else {
            this.selectRow(rowIndex, event);
        }
        this.openSharedRowMenuAtCursor(event.clientX, event.clientY);
    }

    onColumnMenuLeftClick(event: MouseEvent, columnIndex: number) {
        // Prevent column selection if we just finished resizing
        if (this.justFinishedResizing) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        if (event.ctrlKey) {
            this.toggleSingleColumnSelection(columnIndex);
            event.preventDefault();
        } else if (event.shiftKey && this._selectedColumnIndex >= 0) {
            this.extendColumnSelectionTo(columnIndex);
            event.preventDefault();
        } else {
            this.selectColumn(columnIndex, event);
        }
    }

    onColumnMenuRightClick(event: MouseEvent, columnIndex: number) {
        // Prevent column selection if we just finished resizing
        if (this.justFinishedResizing) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        if (this.selectedColumnIndices().has(columnIndex)) {
            event.preventDefault();
            this.setComponentFocus();
        } else {
            this.selectColumn(columnIndex, event);
        }

        // Prevent the native context menu and stop further propagation
        event.stopPropagation();

        this.openSharedColumnMenuAtCursor(event.clientX, event.clientY);
    }

    onInputRightClick(event: MouseEvent) {
        // Store reference to the input element that was right-clicked
        this.activeInputElement = event.target as HTMLInputElement;
        this.updateActiveCellMenuContext(this.activeInputElement);

        // Prevent the default browser context menu
        event.preventDefault();
        event.stopPropagation();

        this.openSharedCellMenuAtCursor(event.clientX, event.clientY);
    }

    /**
     * Moves the hidden trigger element to the cursor position before opening the menu, so CDK calculates
     * the overlay position relative to the cursor, no post-open repositioning and no flash.
     */
    private _menuOpening = false;
    private _mousedownInsideComponent = false;

    onContainerMouseDown() {
        this._mousedownInsideComponent = true;
    }

    private openMenuAtCursor(triggerElement: HTMLElement, menuTrigger: MatMenuTrigger, x: number, y: number): void {
        triggerElement.style.left = `${x}px`;
        triggerElement.style.top = `${y}px`;
        this._menuOpening = true;
        menuTrigger.openMenu();
        this._menuOpening = false;
    }

    private activeInputElement?: HTMLInputElement;

    private openSharedRowMenuAtCursor(x: number, y: number): void {
        if (this.rowMenuTrigger && this.rowMenuTriggerElement) {
            this.openMenuAtCursor(this.rowMenuTriggerElement.nativeElement, this.rowMenuTrigger, x, y);
        }
    }

    private openSharedColumnMenuAtCursor(x: number, y: number): void {
        if (this.columnMenuTrigger && this.columnMenuTriggerElement) {
            this.openMenuAtCursor(this.columnMenuTriggerElement.nativeElement, this.columnMenuTrigger, x, y);
        }
    }

    private openSharedCellMenuAtCursor(x: number, y: number): void {
        if (this.cellMenuTrigger && this.cellMenuTriggerElement) {
            this.openMenuAtCursor(this.cellMenuTriggerElement.nativeElement, this.cellMenuTrigger, x, y);
        }
    }

    private openSharedMenuNearElement(
        menuTrigger: MatMenuTrigger | undefined,
        triggerElement: ElementRef<HTMLElement> | undefined,
        targetElement: HTMLElement | null
    ): void {
        if (!menuTrigger || !triggerElement || !targetElement) {
            return;
        }
        const rect = targetElement.getBoundingClientRect();
        this.openMenuAtCursor(triggerElement.nativeElement, menuTrigger, rect.left, rect.bottom);
    }

    async cutText() {
        if (this.activeInputElement) {
            const selectedText = this.getSelectedText(this.activeInputElement);
            if (selectedText) {
                await navigator.clipboard.writeText(selectedText);
                this.deleteSelectedText(this.activeInputElement);
                this.activeInputElement.dispatchEvent(new Event('input', { bubbles: true }));
            }
            this.restoreFocusAfterMenuAction();
        }
    }

    async copyText() {
        if (this.activeInputElement) {
            const selectedText = this.getSelectedText(this.activeInputElement);
            if (selectedText) {
                await navigator.clipboard.writeText(selectedText);
            }
            this.restoreFocusAfterMenuAction();
        }
    }

    async pasteText() {
        if (this.activeInputElement) {
            const text = await navigator.clipboard.readText();
            if (text) {
                this.insertTextAtCursor(this.activeInputElement, text);
                this.activeInputElement.dispatchEvent(new Event('input', { bubbles: true }));
            }
            this.restoreFocusAfterMenuAction();
        }
    }

    private getSelectedText(input: HTMLInputElement): string {
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        return input.value.slice(start, end);
    }

    private deleteSelectedText(input: HTMLInputElement): void {
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const before = input.value.slice(0, start);
        const after = input.value.slice(end);
        input.value = before + after;
        input.setSelectionRange(start, start);
    }

    private insertTextAtCursor(input: HTMLInputElement, text: string): void {
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const before = input.value.slice(0, start);
        const after = input.value.slice(end);
        input.value = before + text + after;
        const newCursorPos = start + text.length;
        input.setSelectionRange(newCursorPos, newCursorPos);
    }

    private restoreFocusAfterMenuAction(): void {
        setTimeout(() => {
            if (this.activeInputElement) {
                this.activeInputElement.focus();
            } else {
                this.setComponentFocus();
            }
        }, 0);
    }

    private getFillPositionInfo(inputElement: HTMLInputElement): { columnIndex: number; rowIndex: number; fillValue: string } | undefined {
        const cell = inputElement.closest('td');
        const row = inputElement.closest('tr');
        if (!cell || !row) {
            return undefined;
        }

        const dataRowIndex = row.dataset['rowIndex'] === undefined ? row.rowIndex - 1 : Number(row.dataset['rowIndex']);

        return {
            columnIndex: cell.cellIndex - 1, // Subtract 1 for row number column
            rowIndex: dataRowIndex,
            fillValue: inputElement.value,
        };
    }

    private getCellsToFill(table: IdpTable, direction: FillDirection, columnIndex: number, currentRowIndex: number): IdpField[] {
        const fieldsToFill: IdpField[] = [];

        switch (direction) {
            case FillDirection.AllAbove: {
                for (let rowIdx = 0; rowIdx < currentRowIndex; rowIdx++) {
                    const targetCell = table.rows[rowIdx]?.rowCells[columnIndex];
                    if (targetCell) {
                        fieldsToFill.push(targetCell);
                    }
                }
                break;
            }

            case FillDirection.AllBelow: {
                for (let rowIdx = currentRowIndex + 1; rowIdx < table.rows.length; rowIdx++) {
                    const targetCell = table.rows[rowIdx]?.rowCells[columnIndex];
                    if (targetCell) {
                        fieldsToFill.push(targetCell);
                    }
                }
                break;
            }

            case FillDirection.ToAbove: {
                for (let rowIdx = currentRowIndex - 1; rowIdx >= 0; rowIdx--) {
                    const targetCell = table.rows[rowIdx]?.rowCells[columnIndex];
                    if (targetCell) {
                        if (targetCell.value && targetCell.value.trim() !== '') {
                            break;
                        }
                        fieldsToFill.push(targetCell);
                    }
                }
                break;
            }

            case FillDirection.ToBelow: {
                for (let rowIdx = currentRowIndex + 1; rowIdx < table.rows.length; rowIdx++) {
                    const targetCell = table.rows[rowIdx]?.rowCells[columnIndex];
                    if (targetCell) {
                        if (targetCell.value && targetCell.value.trim() !== '') {
                            break;
                        }
                        fieldsToFill.push(targetCell);
                    }
                }
                break;
            }
        }

        return fieldsToFill;
    }

    private executeFillOperation(
        table: IdpTable,
        columnIndex: number,
        fieldsToFill: IdpField[],
        fillValue: string,
        inputElement?: HTMLInputElement
    ): void {
        const tableId = table.id;
        const filledFieldIds = new Set(fieldsToFill.map((field) => field.id));
        const originalColumnCells = table.rows
            .map((row) => row.rowCells[columnIndex])
            .filter((cell): cell is IdpField => !!cell)
            .map((cell) => ({ ...cell }));
        const updatedColumnCells = originalColumnCells.map((cell) =>
            filledFieldIds.has(cell.id)
                ? {
                      ...cell,
                      value: fillValue,
                      verificationStatus: IdpVerificationStatus.ManualValid,
                  }
                : cell
        );

        this.history.do({
            do: () => {
                this.verificationService.updateTableColumn(tableId, columnIndex, updatedColumnCells);
            },
            undo: () => {
                this.verificationService.updateTableColumn(tableId, columnIndex, originalColumnCells);
            },
        });

        // Only use menu focus restoration if no specific input element is provided
        if (inputElement) {
            setTimeout(() => inputElement.focus(), 0);
        } else {
            this.restoreFocusAfterMenuAction();
        }
    }

    private performFillOperation(inputElement: HTMLInputElement, direction: FillDirection): void {
        const positionInfo = this.getFillPositionInfo(inputElement);
        if (!positionInfo) {
            return;
        }

        const { columnIndex, rowIndex, fillValue } = positionInfo;
        const table = this.currentTable();

        if (!table?.rows || rowIndex < 0) {
            return;
        }

        const fieldsToFill = this.getCellsToFill(table, direction, columnIndex, rowIndex);
        if (fieldsToFill.length === 0) {
            return;
        }

        this.executeFillOperation(table, columnIndex, fieldsToFill, fillValue, inputElement);
    }

    readonly FillDirection = FillDirection;

    fillCells(inputElement: HTMLInputElement, direction: FillDirection) {
        this.performFillOperation(inputElement, direction);
    }

    fillActiveCell(direction: FillDirection) {
        if (this.activeInputElement) {
            this.performFillOperation(this.activeInputElement, direction);
        }
    }

    /**
     * Returns true when the cell immediately above is empty AND there is a non-empty
     * cell somewhere further above — i.e. there are empty cells to fill up to.
     */
    showFillToAbove(recordIndex: number, columnIndex: number, rows: IdpTableRowRecord[]): boolean {
        const immediatelyAbove = rows[recordIndex - 1]?.rowCells[columnIndex];
        if (!immediatelyAbove || immediatelyAbove.value?.trim()) {
            return false;
        }
        for (let i = recordIndex - 2; i >= 0; i--) {
            if (rows[i]?.rowCells[columnIndex]?.value?.trim()) {
                return true;
            }
        }
        return false;
    }

    /**
     * Returns true when the cell immediately below is empty AND there is a non-empty
     * cell somewhere further below — i.e. there are empty cells to fill down to.
     */
    showFillToBelow(recordIndex: number, columnIndex: number, rows: IdpTableRowRecord[]): boolean {
        const immediatelyBelow = rows[recordIndex + 1]?.rowCells[columnIndex];
        if (!immediatelyBelow || immediatelyBelow.value?.trim()) {
            return false;
        }
        for (let i = recordIndex + 2; i < rows.length; i++) {
            if (rows[i]?.rowCells[columnIndex]?.value?.trim()) {
                return true;
            }
        }
        return false;
    }

    onClearSelectedColumns(): void {
        const table = this.currentTable();
        const tableId = table?.id ?? this.currentTableId;
        const columnIndices = [...this.selectedColumnIndices()].sort((a, b) => a - b);
        if (columnIndices.length === 0) {
            return;
        }
        const previousColumns = columnIndices.map((columnIndex) => ({
            columnIndex,
            cells: (table?.rows ?? [])
                .map((row) => {
                    const cell = row.rowCells[columnIndex];
                    return cell ? { ...cell } : null;
                })
                .filter((cell): cell is IdpField => cell !== null),
        }));

        this.history.do({
            do: () => {
                for (const columnIndex of columnIndices) {
                    this.verificationService.clearTableColumn(tableId, columnIndex);
                }
            },
            undo: () => {
                for (const { columnIndex, cells } of previousColumns) {
                    this.verificationService.updateTableColumn(tableId, columnIndex, cells);
                }
            },
        });

        setTimeout(() => {
            this.setComponentFocus();
        }, 0);
    }

    onDeleteTable() {
        const table = this.currentTable();
        if (!table) {
            return;
        }
        // Store the entire table structure and all its field data for undo
        const deletedTable = { ...table };
        const deletedFields = table.rows.flatMap((row) => row.rowCells.map((cell) => ({ ...cell })));

        this.history.do({
            do: () => {
                this.verificationService.deleteTable(this.currentTableId);
                setTimeout(() => {
                    this.verificationService.selectNextField();
                }, 0);
            },
            undo: () => {
                this.verificationService.restoreTable(this.currentTableId, deletedTable, deletedFields);
                setTimeout(() => {
                    this.verificationService.selectField(this.currentTableId, true);
                }, 0);
            },
        });
    }

    onTableFocusOut(event: FocusEvent) {
        if (this._menuOpening) {
            return;
        }

        const isContextMenuOpen = () =>
            [this.tableMenuTrigger, this.rowMenuTrigger, this.columnMenuTrigger, this.cellMenuTrigger].some((trigger) => trigger?.menuOpen);

        const newFocusTarget = event.relatedTarget as Node;

        if (newFocusTarget) {
            this._mousedownInsideComponent = false;
            if (!this.elementRef.nativeElement.contains(newFocusTarget) && !isContextMenuOpen()) {
                this.verificationService.runValidationProcessIfTableIsDirty(this.currentTableId);
            }
        } else {
            const wasMousedownInsideComponent = this._mousedownInsideComponent;
            this._mousedownInsideComponent = false;
            if (!wasMousedownInsideComponent) {
                this.verificationService.runValidationProcessIfTableIsDirty(this.currentTableId);
            }
        }
    }

    private handleInsertRow(insertIndex: number) {
        let insertedRowCells: IdpField[] = [];
        this.history.do({
            do: () => {
                if (insertedRowCells.length > 0) {
                    this.verificationService.insertTableRow(this.currentTableId, insertIndex, insertedRowCells);
                } else {
                    this.verificationService.addTableRow(this.currentTableId, insertIndex);
                }
                this.scrollToDataRow(insertIndex);
                setTimeout(() => {
                    this.findInputAtDataIndex(1, insertIndex)?.nativeElement.focus();
                }, TIMEOUT_DELAY);
            },
            undo: () => {
                // Capture the row data BEFORE deletion for potential redo
                const table = this.currentTable();
                const row = table?.rows[insertIndex];
                if (!row) {
                    return;
                }
                insertedRowCells = row.rowCells.map((cell) => ({ ...cell }));
                this.verificationService.deleteTableRow(this.currentTableId, insertIndex);

                setTimeout(() => {
                    const afterTable = this.currentTable();
                    const totalRows = afterTable?.rows.length ?? 0;
                    const targetIdx = Math.min(insertIndex, totalRows - 1);
                    if (targetIdx >= 0) {
                        this.scrollToDataRow(targetIdx);
                        setTimeout(() => {
                            const input = this.findInputAtDataIndex(1, targetIdx) ?? this.metadataTableInputs.first;
                            if (input) {
                                input.nativeElement.focus();
                            } else {
                                this.verificationService.selectNextField();
                            }
                        }, TIMEOUT_DELAY);
                    } else {
                        this.verificationService.selectNextField();
                    }
                }, TIMEOUT_DELAY);
            },
        });
    }

    onRowAction(rowAction: 'insertRowAbove' | 'insertRowBelow' | 'clearRow' | 'deleteRow') {
        switch (rowAction) {
            case 'insertRowAbove': {
                const insertIndex = this.selectedRowIndex;
                this.handleInsertRow(insertIndex);
                break;
            }
            case 'insertRowBelow': {
                const insertIndex = this.selectedRowIndex + 1;
                this.handleInsertRow(insertIndex);
                break;
            }
            case 'clearRow': {
                const table = this.currentTable();
                const tableId = table?.id ?? this.currentTableId;
                const rowIndices = [...this.selectedRowIndices()].sort((a, b) => a - b);
                if (rowIndices.length === 0) {
                    break;
                }
                const previousRows = rowIndices.map((rowIndex) => ({
                    rowIndex,
                    cells: table?.rows[rowIndex]?.rowCells.map((cell) => ({ ...cell })) ?? [],
                }));

                this.history.do({
                    do: () => {
                        for (const rowIndex of rowIndices) {
                            this.verificationService.clearTableRow(tableId, rowIndex);
                        }
                    },
                    undo: () => {
                        for (const { rowIndex, cells } of previousRows) {
                            this.verificationService.updateTableRow(tableId, rowIndex, cells);
                        }
                    },
                });
                setTimeout(() => {
                    this.setComponentFocus();
                }, 0);
                break;
            }
            case 'deleteRow': {
                const table = this.currentTable();
                if (!table) {
                    break;
                }
                const rowIndices = [...this.selectedRowIndices()].sort((a, b) => a - b);
                if (rowIndices.length === 0) {
                    break;
                }
                const deletedRows = rowIndices.map((rowIndex) => ({
                    rowIndex,
                    cells: table.rows[rowIndex]?.rowCells.map((cell: IdpField) => ({ ...cell })) ?? [],
                }));

                this.history.do({
                    do: () => {
                        for (const rowIndex of [...rowIndices].reverse()) {
                            this.verificationService.deleteTableRow(this.currentTableId, rowIndex);
                        }
                        const afterTable = this.currentTable();
                        const remainingRows = afterTable?.rows.length ?? 0;
                        if (remainingRows > 0) {
                            const focusIdx = Math.min(rowIndices[0], remainingRows - 1);
                            this.scrollToDataRow(focusIdx);
                            setTimeout(() => {
                                const targetCellId = this.currentTable()?.rows[focusIdx]?.rowCells[0]?.id;
                                const input = targetCellId ? this.metadataTableInputs.find((i) => i.nativeElement.id === targetCellId) : undefined;
                                if (input) {
                                    input.nativeElement.focus();
                                } else {
                                    this.setComponentFocus();
                                }
                            }, TIMEOUT_DELAY);
                        } else {
                            setTimeout(() => this.setComponentFocus(), 0);
                        }
                    },
                    undo: () => {
                        for (const { rowIndex, cells } of deletedRows) {
                            this.verificationService.insertTableRow(this.currentTableId, rowIndex, cells);
                        }
                        const firstRowIndex = rowIndices[0];
                        this.scrollToDataRow(firstRowIndex);
                        setTimeout(() => {
                            this.findInputAtDataIndex(1, firstRowIndex)?.nativeElement.focus();
                        }, TIMEOUT_DELAY);
                    },
                });
                setTimeout(() => {
                    this.setComponentFocus();
                }, 0);
                break;
            }
        }
    }

    private selectTable(event: MouseEvent) {
        this.updateSelection(GroupSelectionType.Table);
        event.preventDefault();
        this.setComponentFocus();
    }

    private selectRow(rowIndex: number, event: MouseEvent) {
        this.updateSelection(GroupSelectionType.Row, rowIndex);
        event.preventDefault();
        this.setComponentFocus();
    }

    private selectColumn(columnIndex: number, event: MouseEvent) {
        this.updateSelection(GroupSelectionType.Column, columnIndex);
        event.preventDefault();
        this.setComponentFocus();
    }

    setComponentFocus() {
        this.focusShell();
    }

    isGroupSelected() {
        return this.selectedRowIndices().size > 0 || this.selectedColumnIndices().size > 0 || this.tableSelected || !this.singleCellFocus;
    }

    resetGroupSelections() {
        this.selectedRowIndex = -1;
        this.selectedColumnIndex = -1;
        this.tableSelected = false;
        this.singleCellFocus = false;
        this.groupSelectionChanged.emit({ type: GroupSelectionType.None });
    }

    private toggleSingleRowSelection(rowIndex: number): void {
        this.deselectCurrentField();
        this.selectedColumnIndices.set(new Set());
        this._selectedColumnIndex = -1;
        this.tableSelected = false;
        this.singleCellFocus = false;
        const current = this.selectedRowIndices();
        if (current.has(rowIndex)) {
            const next = new Set(current);
            next.delete(rowIndex);
            this.selectedRowIndices.set(next);
            if (this._selectedRowIndex === rowIndex) {
                this._selectedRowIndex = next.size > 0 ? Math.max(...next) : -1;
            }
        } else {
            this.selectedRowIndices.set(new Set([...current, rowIndex]));
            this._selectedRowIndex = rowIndex;
        }
        if (this.selectedRowIndices().size === 0) {
            this.groupSelectionChanged.emit({ type: GroupSelectionType.None });
            return;
        }
        this.groupSelectionChanged.emit({ type: GroupSelectionType.Row, index: this._selectedRowIndex, tableId: this.currentTableId });
    }

    private extendRowSelectionTo(rowIndex: number): void {
        this.deselectCurrentField();
        this.selectedColumnIndices.set(new Set());
        this._selectedColumnIndex = -1;
        this.tableSelected = false;
        this.singleCellFocus = false;
        const anchor = this._selectedRowIndex >= 0 ? this._selectedRowIndex : rowIndex;
        const from = Math.min(anchor, rowIndex);
        const to = Math.max(anchor, rowIndex);
        const next = new Set<number>();
        for (let i = from; i <= to; i++) {
            next.add(i);
        }
        this.selectedRowIndices.set(next);
        this.groupSelectionChanged.emit({ type: GroupSelectionType.Row, index: this._selectedRowIndex, tableId: this.currentTableId });
    }

    private toggleSingleColumnSelection(columnIndex: number): void {
        this.deselectCurrentField();
        this.selectedRowIndices.set(new Set());
        this._selectedRowIndex = -1;
        this.tableSelected = false;
        this.singleCellFocus = false;
        const current = this.selectedColumnIndices();
        if (current.has(columnIndex)) {
            const next = new Set(current);
            next.delete(columnIndex);
            this.selectedColumnIndices.set(next);
            if (this._selectedColumnIndex === columnIndex) {
                this._selectedColumnIndex = next.size > 0 ? Math.max(...next) : -1;
            }
        } else {
            this.selectedColumnIndices.set(new Set([...current, columnIndex]));
            this._selectedColumnIndex = columnIndex;
        }
        this.groupSelectionChanged.emit({
            type: this.selectedColumnIndices().size > 0 ? GroupSelectionType.Column : GroupSelectionType.None,
            index: this._selectedColumnIndex,
            tableId: this.currentTableId,
        });
    }

    private extendColumnSelectionTo(columnIndex: number): void {
        this.deselectCurrentField();
        this.selectedRowIndices.set(new Set());
        this._selectedRowIndex = -1;
        this.tableSelected = false;
        this.singleCellFocus = false;
        const anchor = this._selectedColumnIndex >= 0 ? this._selectedColumnIndex : columnIndex;
        const from = Math.min(anchor, columnIndex);
        const to = Math.max(anchor, columnIndex);
        const next = new Set<number>();
        for (let i = from; i <= to; i++) {
            next.add(i);
        }
        this.selectedColumnIndices.set(next);
        this.groupSelectionChanged.emit({ type: GroupSelectionType.Column, index: this._selectedColumnIndex, tableId: this.currentTableId });
    }

    private deselectCurrentField() {
        const table = this.currentTable();
        if (table) {
            const selectedField = table.rows.flatMap((row) => row.rowCells).find((field) => field.isSelected);
            if (selectedField) {
                // Deselect the currently selected field
                const deselectedField = { ...selectedField, isSelected: false };
                this.verificationService.updateField(deselectedField);
            }
        }

        // Ensure component gets focus after deselecting field
        this.setComponentFocus();
    }

    private openContextMenu() {
        if (this.selectedRowIndex >= 0) {
            this.openSharedMenuNearElement(this.rowMenuTrigger, this.rowMenuTriggerElement, this.getRowMenuAnchor(this.selectedRowIndex));
        } else if (this.selectedColumnIndex >= 0) {
            this.openSharedMenuNearElement(this.columnMenuTrigger, this.columnMenuTriggerElement, this.getColumnMenuAnchor(this.selectedColumnIndex));
        } else if (this.tableSelected && this.tableMenuTrigger) {
            this.tableMenuTrigger.openMenu();
        }
    }

    private getRowMenuAnchor(rowIndex: number): HTMLElement | null {
        const domIndex = rowIndex - this.renderedRowOffset;
        return this.rowMenuAnchors?.get(domIndex)?.nativeElement ?? null;
    }

    private getColumnMenuAnchor(columnIndex: number): HTMLElement | null {
        return this.columnMenuAnchors?.get(columnIndex)?.nativeElement ?? null;
    }

    navigateFirstRowCell(tableRowRecords: IdpTableRowRecord[], selectedRowIndex: number) {
        this.scrollToDataRow(selectedRowIndex);
        setTimeout(() => {
            const rowCellInput = this.findInputAtDataIndex(1, selectedRowIndex);
            const field = tableRowRecords[selectedRowIndex]?.rowCells[0];
            this.focusAndSelectField(field, rowCellInput);
        }, TIMEOUT_DELAY);
    }

    navigateFirstColumnCell(tableRowRecords: IdpTableRowRecord[], selectedColumnIndex: number) {
        this.scrollToDataRow(0);
        setTimeout(() => {
            const columnCellInput = this.findInputAtDataIndex(selectedColumnIndex + 1, 0);
            const field = tableRowRecords[0]?.rowCells[selectedColumnIndex];
            this.focusAndSelectField(field, columnCellInput);
        }, TIMEOUT_DELAY);
    }

    private focusAndSelectField(field: IdpField | undefined, inputElement: ElementRef<HTMLInputElement> | undefined) {
        if (field && inputElement) {
            this.singleCellFocus = true;
            this.verificationService.selectField(field);
            inputElement.nativeElement.focus();
        }
    }

    private updateSelection(group: GroupSelectionType, index: number = 0) {
        this.deselectCurrentField();
        this.resetGroupSelections();

        if (group === GroupSelectionType.Row) {
            this.selectedRowIndex = index;
        } else if (group === GroupSelectionType.Column) {
            this.selectedColumnIndex = index;
        } else {
            this.tableSelected = true;
        }
        this.groupSelectionChanged.emit({
            type: group,
            index: group === GroupSelectionType.Table ? undefined : index,
            tableId: this.currentTableId,
        });
    }

    private getMaxRowIndex(): number {
        const tableRowRecords = this.getTableRowRecords();
        return tableRowRecords ? tableRowRecords.length - 1 : 0;
    }

    private getMaxColumnIndex(): number {
        const tableRowRecords = this.getTableRowRecords();
        return tableRowRecords?.[0]?.rowCells?.length ? tableRowRecords[0].rowCells.length - 1 : 0;
    }

    private getTableRowRecords(): IdpTableRowRecord[] {
        return this.allTableRows;
    }

    private addTableRow() {
        if (this.currentTableId) {
            this.history.do({
                do: () => {
                    this.verificationService.addTableRow(this.currentTableId, 0);
                },
                undo: () => {
                    this.verificationService.deleteTableRow(this.currentTableId, 0);
                    setTimeout(() => {
                        this.verificationService.selectNextField();
                    }, 0);
                },
            });
        }
    }

    private invalidateColumnWidths(): void {
        const table = this.currentTable();
        if (table) {
            this.calculateAndCacheColumnWidths(table);
            this.cdr.markForCheck();
        }
    }

    private requestResolvedFocus(field: IdpField, tableId: string): void {
        this.pendingFocusRequest = { field, tableId };
        this.focusShell();
        this.scheduleResolvedFocus();
    }

    private focusShell(): void {
        const container = this.tableContainer?.nativeElement;
        if (container && document.activeElement !== container) {
            container.focus();
        }
    }

    private scheduleResolvedFocus(): void {
        if (!this.pendingFocusRequest) {
            return;
        }

        if (this.resolvedFocusTimerId) {
            clearTimeout(this.resolvedFocusTimerId);
        }

        this.resolvedFocusTimerId = setTimeout(() => {
            this.resolvedFocusTimerId = undefined;
            this.focusResolvedTarget();
        }, 0);
    }

    private focusResolvedTarget(): void {
        const pendingFocusRequest = this.pendingFocusRequest;
        if (!pendingFocusRequest || pendingFocusRequest.tableId !== this.currentTableId) {
            return;
        }

        const table = this.currentTable();
        if (!table) {
            return;
        }

        if (pendingFocusRequest.field.dataType !== IdpFieldDataType.Table && pendingFocusRequest.field.needsKeyboardFocus) {
            const requestedInput = this.metadataTableInputs.find((input) => input.nativeElement.id === pendingFocusRequest.field.id)?.nativeElement;
            if (requestedInput) {
                requestedInput.focus();
                this.pendingFocusRequest = undefined;
            } else {
                const rowIndex = table.rows.findIndex((row) => row.rowCells.some((cell) => cell.id === pendingFocusRequest.field.id));
                if (rowIndex >= 0) {
                    this.scrollToDataRow(rowIndex);
                    setTimeout(() => {
                        const input = this.metadataTableInputs.find((i) => i.nativeElement.id === pendingFocusRequest.field.id)?.nativeElement;
                        if (input) {
                            input.focus();
                            this.pendingFocusRequest = undefined;
                        }
                    }, TIMEOUT_DELAY);
                }
            }
            return;
        }

        const firstInput = this.metadataTableInputs.first?.nativeElement;
        if (firstInput) {
            firstInput.focus();
            this.pendingFocusRequest = undefined;
        }
    }

    private updateActiveCellMenuContext(inputElement: HTMLInputElement): void {
        const positionInfo = this.getFillPositionInfo(inputElement);
        this.activeCellRows = this.currentTable()?.rows ?? [];
        if (positionInfo) {
            this.activeCellColumnIndex = positionInfo.columnIndex;
            this.activeCellRowIndex = positionInfo.rowIndex;
        } else {
            this.activeCellColumnIndex = -1;
            this.activeCellRowIndex = -1;
        }
    }

    getCustomValidationErrorMessage(value: string, fieldName: string): string {
        const validation = this.fieldValidationRules.get(fieldName);
        const error = this.tableCellValidationService.getValidationError({ value: value, name: fieldName }, validation);

        if (!error) {
            return '';
        }

        switch (error.type) {
            case 'required': {
                return this.translateService.instant('EXTRACTION.VERIFICATION.EXTRACTION_TABLE.REQUIRED_FIELD_ERROR_MESSAGE');
            }
            case 'minLength': {
                return this.translateService.instant('EXTRACTION.VERIFICATION.EXTRACTION_TABLE.MINIMUM_LENGTH_ERROR_MESSAGE', {
                    minFieldLength: error.value,
                });
            }
            case 'maxLength': {
                return this.translateService.instant('EXTRACTION.VERIFICATION.EXTRACTION_TABLE.MAXIMUM_LENGTH_ERROR_MESSAGE', {
                    maxFieldLength: error.value,
                });
            }
            case 'pattern': {
                return this.translateService.instant('EXTRACTION.VERIFICATION.EXTRACTION_TABLE.INVALID_FORMAT_ERROR_MESSAGE');
            }
            default: {
                return '';
            }
        }
    }

    private updateFieldValidationStatus(field: IdpField, value: string): void {
        const validation = this.fieldValidationRules.get(field.name);

        const isValid = this.tableCellValidationService.validateField({ value, name: field.name }, validation);

        // Update the field's validation status
        field.validationStatus = isValid ? IdpValidationStatus.Valid : IdpValidationStatus.Invalid;

        // Trigger change detection to update the UI immediately
        this.cdr.markForCheck();
    }
}
