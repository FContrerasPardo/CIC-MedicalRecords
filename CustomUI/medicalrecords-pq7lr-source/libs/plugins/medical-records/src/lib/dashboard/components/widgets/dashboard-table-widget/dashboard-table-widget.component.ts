import { CommonModule } from '@angular/common';
import { Component, HostBinding, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { DashboardTableWidgetData, DashboardWidgetConfig } from '../../../definitions/dashboard-widget.model';
import { discoverTableColumns } from '../../../mappers/dashboard-table.mapper';
import { resolveTableColumnKeys } from '../../../mappers/dashboard-widget-bindings.mapper';
import { DashboardWidgetTextPipe } from '../../../pipes/dashboard-widget-text.pipe';
import { DashboardWidgetRegistryService } from '../../../services/dashboard-widget-registry.service';
import { stripProcessVariablePrefix } from '../../../services/process-variables.service';
import { buildTableColumnFingerprint, buildTableDataFingerprint } from '../../../utils/dashboard-data-source.util';
import { buildTableDisplayEntries, TableDisplayEntry } from '../../../utils/dashboard-table-group.util';
import { copyTextToClipboard } from '../../../utils/dashboard-clipboard.util';
import { downloadCsvFile } from '../../../utils/dashboard-table-export.util';

@Component({
    selector: 'medical-records-dashboard-table-widget',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule, DashboardWidgetTextPipe],
    templateUrl: './dashboard-table-widget.component.html',
    styleUrls: ['./dashboard-table-widget.component.scss'],
})
export class DashboardTableWidgetComponent implements OnChanges, OnDestroy {
    @Input({ required: true }) config!: DashboardWidgetConfig;
    @Input() pageActive = true;
    @Input() fillCanvasSlot = false;

    @HostBinding('class.dashboard-widget--canvas-slot')
    get canvasSlotClass(): boolean {
        return this.fillCanvasSlot;
    }

    data: DashboardTableWidgetData = {
        rows: [],
        columns: [],
        totalCount: 0,
        loading: true,
        source: 'demo',
    };

    exporting = false;
    exportError?: string;
    currentPage = 0;
    rowFilterQuery = '';
    collapsedGroupIds = new Set<string>();
    copiedCellKey = '';
    copyFeedbackKey = '';

    private loadSubscription?: Subscription;
    private lastDataFingerprint = '';
    private lastColumnFingerprint = '';
    private copyFeedbackTimer?: ReturnType<typeof setTimeout>;

    constructor(
        private readonly widgetRegistry: DashboardWidgetRegistryService,
        private readonly translate: TranslateService
    ) {}

    get pageSize(): number {
        return Math.max(1, this.config?.tablePageSize ?? 25);
    }

    get totalPages(): number {
        return Math.max(1, Math.ceil(this.data.totalCount / this.pageSize));
    }

    get pageStart(): number {
        if (!this.data.totalCount) {
            return 0;
        }
        return this.currentPage * this.pageSize + 1;
    }

    get pageEnd(): number {
        return Math.min(this.data.totalCount, (this.currentPage + 1) * this.pageSize);
    }

    get canGoPrev(): boolean {
        return this.currentPage > 0 && !this.data.loading;
    }

    get canGoNext(): boolean {
        return !this.data.loading && (this.currentPage + 1) * this.pageSize < this.data.totalCount;
    }

    get showPagination(): boolean {
        return !this.data.loading && !this.data.error && this.data.totalCount > this.pageSize;
    }

    get showRowFilter(): boolean {
        return this.config?.tableOptions?.showRowFilter !== false;
    }

    get hasPartialRows(): boolean {
        return !this.data.loading && this.data.totalCount > this.data.rows.length;
    }

    get hasConfiguredColumns(): boolean {
        return resolveTableColumnKeys(this.config) !== undefined;
    }

    get groupByFields(): string[] {
        return this.config?.tableOptions?.groupByFields ?? [];
    }

    get hasGrouping(): boolean {
        return this.groupByFields.length > 0;
    }

    get visibleRows(): Array<Record<string, string>> {
        const query = this.rowFilterQuery.trim().toLowerCase();
        if (!query || !this.showRowFilter) {
            return this.data.rows;
        }

        const columns = this.data.columns;
        return this.data.rows.filter((row) =>
            columns.some((column) => String(row[column] ?? '').toLowerCase().includes(query))
        );
    }

    get displayEntries(): TableDisplayEntry[] {
        return buildTableDisplayEntries(this.visibleRows, this.groupByFields, this.collapsedGroupIds);
    }

    get hasVisibleTableContent(): boolean {
        return this.displayEntries.some((entry) => entry.type === 'row');
    }

    get sourceLabelKey(): string {
        switch (this.data.source) {
            case 'content':
                return 'MEDICAL_RECORDS.DASHBOARD.SOURCE_CONTENT';
            case 'process':
                return 'MEDICAL_RECORDS.DASHBOARD.SOURCE_PROCESS';
            default:
                return 'MEDICAL_RECORDS.DASHBOARD.SOURCE_DEMO';
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (!this.config) {
            return;
        }

        if (changes['pageActive']?.currentValue === false) {
            return;
        }

        if (changes['pageActive']?.currentValue === true && !changes['config']) {
            this.loadTable();
            return;
        }

        if (!changes['config']) {
            return;
        }

        const dataFingerprint = buildTableDataFingerprint(this.config);
        const columnFingerprint = buildTableColumnFingerprint(this.config);

        if (dataFingerprint !== this.lastDataFingerprint) {
            this.lastDataFingerprint = dataFingerprint;
            this.lastColumnFingerprint = columnFingerprint;
            this.currentPage = 0;
            this.loadTable();
            return;
        }

        if (columnFingerprint !== this.lastColumnFingerprint) {
            this.lastColumnFingerprint = columnFingerprint;
            this.collapsedGroupIds.clear();
            this.applyColumnProjection();
            return;
        }

        this.applyColumnProjectionIfStale();
    }

    ngOnDestroy(): void {
        this.loadSubscription?.unsubscribe();
        if (this.copyFeedbackTimer) {
            clearTimeout(this.copyFeedbackTimer);
        }
    }

    trackByColumn(_: number, column: string): string {
        return column;
    }

    trackByRowIndex(index: number): number {
        return index;
    }

    trackDisplayEntry(_: number, entry: TableDisplayEntry): string {
        return entry.id;
    }

    toggleGroup(groupId: string): void {
        const next = new Set(this.collapsedGroupIds);
        if (next.has(groupId)) {
            next.delete(groupId);
        } else {
            next.add(groupId);
        }
        this.collapsedGroupIds = next;
    }

    rowIndent(depth: number): string {
        return `${Math.max(depth, 0) * 16}px`;
    }

    columnLabel(column: string): string {
        const i18nKey = this.tableColumnLabelKey(column);
        if (i18nKey) {
            return this.translate.instant(i18nKey);
        }
        return stripProcessVariablePrefix(column);
    }

    private tableColumnLabelKey(column: string): string | null {
        const normalized = column.trim();
        const map: Record<string, string> = {
            sys_created: 'MEDICAL_RECORDS.TABLE_WIDGET.TABLE_COL_SYS_CREATED',
            sys_primaryType: 'MEDICAL_RECORDS.TABLE_WIDGET.TABLE_COL_SYS_PRIMARY_TYPE',
            sys_title: 'MEDICAL_RECORDS.TABLE_WIDGET.TABLE_COL_SYS_TITLE',
            sys_id: 'MEDICAL_RECORDS.TABLE_WIDGET.TABLE_COL_SYS_ID',
        };
        return map[normalized] ?? null;
    }

    cellCopyKey(entryId: string, column: string): string {
        return `${entryId}:${column}`;
    }

    isCopiedCell(entryId: string, column: string): boolean {
        return this.copiedCellKey === this.cellCopyKey(entryId, column);
    }

    async copyCellValue(value: string | undefined, entryId: string, column: string, event?: Event): Promise<void> {
        event?.stopPropagation();

        const text = value ?? '';
        if (!text.trim()) {
            return;
        }

        const copied = await copyTextToClipboard(text);
        if (!copied) {
            return;
        }

        const key = this.cellCopyKey(entryId, column);
        this.copiedCellKey = key;
        this.copyFeedbackKey = key;

        if (this.copyFeedbackTimer) {
            clearTimeout(this.copyFeedbackTimer);
        }

        this.copyFeedbackTimer = setTimeout(() => {
            if (this.copiedCellKey === key) {
                this.copiedCellKey = '';
            }
            if (this.copyFeedbackKey === key) {
                this.copyFeedbackKey = '';
            }
        }, 1500);
    }

    goToPreviousPage(): void {
        if (!this.canGoPrev) {
            return;
        }
        this.currentPage -= 1;
        this.loadTable();
    }

    goToNextPage(): void {
        if (!this.canGoNext) {
            return;
        }
        this.currentPage += 1;
        this.loadTable();
    }

    exportReport(): void {
        if (this.exporting || this.data.loading || !this.config) {
            return;
        }

        this.exporting = true;
        this.exportError = undefined;
        this.widgetRegistry.exportTable(this.config).subscribe({
            next: ({ csv, filename }) => {
                downloadCsvFile(csv, filename);
            },
            error: () => {
                this.exportError = 'export-failed';
            },
            complete: () => {
                this.exporting = false;
            },
        });
    }

    private applyColumnProjection(): void {
        if (this.data.loading) {
            return;
        }

        const preferredColumns = resolveTableColumnKeys(this.config);
        this.data = {
            ...this.data,
            columns: discoverTableColumns(this.data.rows, preferredColumns),
        };
    }

    private applyColumnProjectionIfStale(): void {
        if (this.data.loading) {
            return;
        }

        const preferredColumns = resolveTableColumnKeys(this.config);
        const nextColumns = discoverTableColumns(this.data.rows, preferredColumns);
        if (nextColumns.join('|') !== this.data.columns.join('|')) {
            this.data = {
                ...this.data,
                columns: nextColumns,
            };
        }
    }

    private loadTable(): void {
        if (!this.pageActive) {
            return;
        }

        this.loadSubscription?.unsubscribe();
        this.data = { ...this.data, loading: true, error: undefined };

        const skipCount = this.currentPage * this.pageSize;
        this.loadSubscription = this.widgetRegistry.resolveTable(this.config, skipCount).subscribe((data) => {
            this.data = data;
            this.lastColumnFingerprint = buildTableColumnFingerprint(this.config);
        });
    }
}
