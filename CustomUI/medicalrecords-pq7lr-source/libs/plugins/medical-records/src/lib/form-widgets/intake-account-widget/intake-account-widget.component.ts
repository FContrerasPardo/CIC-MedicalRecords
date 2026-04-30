import { CommonModule } from '@angular/common';
import { WidgetComponent } from '@alfresco/adf-core';
import { Component } from '@angular/core';
import { BatchStateSource, IdpBatchStageStatus } from './batch-state.model';
import {
    createEmptyIntakeAccountViewModel,
    getBatchStateStatusLabel,
    getBatchStateStatusTone,
    mapBatchStateToIntakeAccountViewModel
} from './batch-state.mapper';
import { IntakeAccountServiceItemViewModel, IntakeAccountViewModel } from './intake-account-view.model';

@Component({
    templateUrl: './intake-account-widget.component.html',
    styleUrls: ['./intake-account-widget.component.scss'],
    selector: 'medical-records-intake-account-widget',
    standalone: true,
    imports: [CommonModule],
})
export class IntakeAccountWidgetComponent extends WidgetComponent {
    private cachedPrimaryValue: unknown;
    private cachedFallbackValue: unknown;
    private cachedSelectedPatientKey: string | null = null;
    private selectedPatientKey: string | null = null;
    private cachedViewModel: IntakeAccountViewModel = createEmptyIntakeAccountViewModel('No fue posible leer batchState. Verifica que el formulario reciba un JSON valido.');
    searchTerm = '';
    statusFilter = '';
    serviceFilter = '';
    invoiceFilter = '';
    coverageFilter = '';
    dateFrom = '';
    dateTo = '';
    pageSize = 25;
    currentPage = 1;

    get viewModel(): IntakeAccountViewModel {
        const primaryValue = this.field?.value;
        const fallbackValue = this.field?.form?.getFieldById('batchState')?.value;

        if (
            primaryValue === this.cachedPrimaryValue &&
            fallbackValue === this.cachedFallbackValue &&
            this.selectedPatientKey === this.cachedSelectedPatientKey
        ) {
            return this.cachedViewModel;
        }

        this.cachedPrimaryValue = primaryValue;
        this.cachedFallbackValue = fallbackValue;
        this.cachedSelectedPatientKey = this.selectedPatientKey;

        const batchState = this.resolveBatchState(primaryValue, fallbackValue);

        if (!batchState) {
            this.cachedViewModel = createEmptyIntakeAccountViewModel('No fue posible leer batchState. Verifica que el formulario reciba un JSON valido.');
            return this.cachedViewModel;
        }

        this.cachedViewModel = mapBatchStateToIntakeAccountViewModel(batchState, this.selectedPatientKey);
        this.selectedPatientKey = this.cachedViewModel.patientSelector.selectedKey;
        this.cachedSelectedPatientKey = this.selectedPatientKey;
        return this.cachedViewModel;
    }

    get formFieldId(): string {
        return this.field?.id ?? 'intake-account-widget';
    }

    get isReadOnly(): boolean {
        return Boolean(this.field?.readOnly);
    }

    get filteredServiceItems(): IntakeAccountServiceItemViewModel[] {
        const normalizedSearch = this.searchTerm.trim().toLowerCase();
        const fromDate = this.parseDateFilter(this.dateFrom);
        const toDate = this.parseDateFilter(this.dateTo);

        return this.viewModel.serviceExplorer.items.filter((item) => {
            const matchesSearch = !normalizedSearch || [
                item.serviceName,
                item.cup,
                item.description,
            ].some((value) => value?.toLowerCase().includes(normalizedSearch));
            const matchesStatus = !this.statusFilter || item.derivedStatus === this.statusFilter;
            const matchesService = !this.serviceFilter || (item.serviceName ?? item.description) === this.serviceFilter;
            const matchesInvoice = !this.invoiceFilter || item.invoiceNumber === this.invoiceFilter;
            const matchesCoverage = !this.coverageFilter || item.coverage === this.coverageFilter;
            const matchesDate = this.matchesDateRange(item.serviceDate, fromDate, toDate);

            return matchesSearch && matchesStatus && matchesService && matchesInvoice && matchesCoverage && matchesDate;
        });
    }

    get pagedServiceItems(): IntakeAccountServiceItemViewModel[] {
        const start = (this.safeCurrentPage - 1) * this.pageSize;
        return this.filteredServiceItems.slice(start, start + this.pageSize);
    }

    get totalFilteredItems(): number {
        return this.filteredServiceItems.length;
    }

    get totalPages(): number {
        return Math.max(1, Math.ceil(this.totalFilteredItems / this.pageSize));
    }

    get safeCurrentPage(): number {
        return Math.min(this.currentPage, this.totalPages);
    }

    get visibleRangeStart(): number {
        if (!this.totalFilteredItems) {
            return 0;
        }

        return ((this.safeCurrentPage - 1) * this.pageSize) + 1;
    }

    get visibleRangeEnd(): number {
        return Math.min(this.safeCurrentPage * this.pageSize, this.totalFilteredItems);
    }

    getStatusLabel(status: IdpBatchStageStatus | null | undefined): string {
        return getBatchStateStatusLabel(status);
    }

    getStatusTone(status: IdpBatchStageStatus | null | undefined): string {
        return getBatchStateStatusTone(status);
    }

    selectPatient(patientKey: string): void {
        if (!patientKey || patientKey === this.selectedPatientKey) {
            return;
        }

        this.selectedPatientKey = patientKey;
        this.resetExplorerState();
    }

    updateSearchTerm(event: Event): void {
        this.searchTerm = this.readControlValue(event);
        this.currentPage = 1;
    }

    updateStatusFilter(event: Event): void {
        this.statusFilter = this.readControlValue(event);
        this.currentPage = 1;
    }

    updateServiceFilter(event: Event): void {
        this.serviceFilter = this.readControlValue(event);
        this.currentPage = 1;
    }

    updateInvoiceFilter(event: Event): void {
        this.invoiceFilter = this.readControlValue(event);
        this.currentPage = 1;
    }

    updateCoverageFilter(event: Event): void {
        this.coverageFilter = this.readControlValue(event);
        this.currentPage = 1;
    }

    updateDateFrom(event: Event): void {
        this.dateFrom = this.readControlValue(event);
        this.currentPage = 1;
    }

    updateDateTo(event: Event): void {
        this.dateTo = this.readControlValue(event);
        this.currentPage = 1;
    }

    updatePageSize(event: Event): void {
        const value = Number(this.readControlValue(event));
        this.pageSize = Number.isFinite(value) && value > 0 ? value : 25;
        this.currentPage = 1;
    }

    goToPreviousPage(): void {
        this.currentPage = Math.max(1, this.safeCurrentPage - 1);
    }

    goToNextPage(): void {
        this.currentPage = Math.min(this.totalPages, this.safeCurrentPage + 1);
    }

    private resolveBatchState(primaryValue: unknown, fallbackValue: unknown): BatchStateSource | null {
        const candidates = [
            primaryValue,
            fallbackValue,
        ];

        for (const candidate of candidates) {
            const parsed = this.parseBatchState(candidate);
            if (parsed) {
                return parsed;
            }
        }

        return null;
    }

    private parseBatchState(value: unknown): BatchStateSource | null {
        if (!value) {
            return null;
        }

        if (typeof value === 'string') {
            try {
                return JSON.parse(value) as BatchStateSource;
            } catch {
                return null;
            }
        }

        if (typeof value === 'object' && !Array.isArray(value)) {
            return value as BatchStateSource;
        }

        return null;
    }

    private resetExplorerState(): void {
        this.searchTerm = '';
        this.statusFilter = '';
        this.serviceFilter = '';
        this.invoiceFilter = '';
        this.coverageFilter = '';
        this.dateFrom = '';
        this.dateTo = '';
        this.pageSize = 25;
        this.currentPage = 1;
    }

    private readControlValue(event: Event): string {
        return (event.target as HTMLInputElement | HTMLSelectElement | null)?.value ?? '';
    }

    private parseDateFilter(value: string): Date | null {
        if (!value) {
            return null;
        }

        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    private matchesDateRange(serviceDate: string | null, fromDate: Date | null, toDate: Date | null): boolean {
        if (!fromDate && !toDate) {
            return true;
        }

        if (!serviceDate) {
            return false;
        }

        const parsed = new Date(serviceDate);
        if (Number.isNaN(parsed.getTime())) {
            return false;
        }

        const serviceTime = parsed.getTime();
        const fromTime = fromDate ? fromDate.getTime() : Number.NEGATIVE_INFINITY;
        const toTime = toDate ? toDate.getTime() : Number.POSITIVE_INFINITY;

        return serviceTime >= fromTime && serviceTime <= toTime;
    }
}
