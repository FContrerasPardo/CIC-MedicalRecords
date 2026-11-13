import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { ProviderGroup } from '../../../dashboard/utils/dashboard-provider-group.util';
import { MedicalAccountsProcessService, ProviderSelection } from '../../../services/medical-accounts-process.service';

type ProviderCardsState = 'loading' | 'ready' | 'error';

interface ProviderKpi {
    key: 'running' | 'completed' | 'cancelled' | 'total' | 'reviewRequired';
    labelKey: string;
}

@Component({
    selector: 'medical-records-operations-provider-cards',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    templateUrl: './operations-provider-cards.component.html',
    styleUrls: ['./operations-provider-cards.component.scss'],
})
export class OperationsProviderCardsComponent implements OnInit, OnDestroy {
    @Output() providerSelected = new EventEmitter<ProviderSelection>();

    readonly kpis: ProviderKpi[] = [
        { key: 'running', labelKey: 'MEDICAL_RECORDS.OPERATIONS_HOME.PROVIDERS.KPI_RUNNING' },
        { key: 'completed', labelKey: 'MEDICAL_RECORDS.OPERATIONS_HOME.PROVIDERS.KPI_COMPLETED' },
        { key: 'cancelled', labelKey: 'MEDICAL_RECORDS.OPERATIONS_HOME.PROVIDERS.KPI_CANCELLED' },
        { key: 'total', labelKey: 'MEDICAL_RECORDS.OPERATIONS_HOME.PROVIDERS.KPI_TOTAL' },
        { key: 'reviewRequired', labelKey: 'MEDICAL_RECORDS.OPERATIONS_HOME.PROVIDERS.KPI_REVIEW_REQUIRED' },
    ];

    state: ProviderCardsState = 'loading';
    groups: ProviderGroup[] = [];
    partial = false;
    enrichLimit = 0;

    private rangeSubscription?: Subscription;
    private loadSubscription?: Subscription;

    constructor(private readonly accountsService: MedicalAccountsProcessService) {}

    /** Real process data only: live once loaded, error when the query failed. */
    get originKey(): string | null {
        if (this.state === 'ready') {
            return 'MEDICAL_RECORDS.DASHBOARD.KPI_ORIGIN_LIVE';
        }
        return this.state === 'error' ? 'MEDICAL_RECORDS.DASHBOARD.KPI_ORIGIN_ERROR' : null;
    }

    ngOnInit(): void {
        this.rangeSubscription = this.accountsService.dateRange$.subscribe(() => this.load());
    }

    ngOnDestroy(): void {
        this.rangeSubscription?.unsubscribe();
        this.loadSubscription?.unsubscribe();
    }

    isUnidentified(group: ProviderGroup): boolean {
        return group.name === null;
    }

    trackByGroup(_index: number, group: ProviderGroup): string {
        return group.key;
    }

    select(group: ProviderGroup): void {
        this.providerSelected.emit({ key: group.key, name: group.name });
    }

    private load(): void {
        this.state = 'loading';
        this.loadSubscription?.unsubscribe();
        this.loadSubscription = this.accountsService.loadProviders().subscribe({
            next: (snapshot) => {
                this.groups = snapshot.groups;
                this.partial = snapshot.partial;
                this.enrichLimit = snapshot.enrichLimit;
                this.state = 'ready';
            },
            error: () => {
                this.groups = [];
                this.partial = false;
                this.state = 'error';
            },
        });
    }
}
