import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { DashboardProviderSelection, DashboardWidgetConfig } from '../../../definitions/dashboard-widget.model';
import { flattenTableRow } from '../../../mappers/dashboard-table.mapper';
import { ProcessQueryDataProvider } from '../../../providers/process-query-data.provider';
import { DashboardPeriodService } from '../../../services/dashboard-period.service';
import { PROCESS_VARIABLE_ENRICH_LIMIT } from '../../../services/process-variables.service';
import { DEFAULT_PROCESS_STATUSES } from '../../../utils/dashboard-data-source.util';
import { filterRowsToDateRange } from '../../../utils/dashboard-date-range.util';
import {
    groupInstancesByProvider,
    isProviderDataPartial,
    ProviderGroup,
    ProviderKpiKey,
    resolveProviderKpiKeys,
    UNIDENTIFIED_PROVIDER_KEY,
} from '../../../utils/dashboard-provider-group.util';
import { DashboardWidgetTextPipe } from '../../../pipes/dashboard-widget-text.pipe';

type ProviderCardsState = 'loading' | 'ready' | 'error';

@Component({
    selector: 'medical-records-dashboard-provider-cards-widget',
    standalone: true,
    imports: [CommonModule, TranslateModule, DashboardWidgetTextPipe],
    templateUrl: './dashboard-provider-cards-widget.component.html',
    styleUrls: ['./dashboard-provider-cards-widget.component.scss'],
})
export class DashboardProviderCardsWidgetComponent implements OnInit, OnChanges, OnDestroy {
    @Input({ required: true }) config!: DashboardWidgetConfig;
    @Input() pageActive = true;
    @Output() providerSelected = new EventEmitter<DashboardProviderSelection>();

    state: ProviderCardsState = 'loading';
    groups: ProviderGroup[] = [];
    partial = false;
    readonly enrichLimit = PROCESS_VARIABLE_ENRICH_LIMIT;

    private readonly destroy$ = new Subject<void>();
    private loadSubscription?: Subscription;

    constructor(
        private readonly processQueryDataProvider: ProcessQueryDataProvider,
        private readonly periodService: DashboardPeriodService
    ) {}

    get kpiKeys(): ProviderKpiKey[] {
        return resolveProviderKpiKeys(this.config.providerCardsOptions?.kpis);
    }

    /** Provider cards only ever show real process data: live when loaded, error when the query failed. */
    get originKey(): string | null {
        if (this.state === 'ready') {
            return 'MEDICAL_RECORDS.DASHBOARD.KPI_ORIGIN_LIVE';
        }
        return this.state === 'error' ? 'MEDICAL_RECORDS.DASHBOARD.KPI_ORIGIN_ERROR' : null;
    }

    ngOnInit(): void {
        this.periodService.dateRange$.pipe(takeUntil(this.destroy$)).subscribe(() => {
            if (this.pageActive) {
                this.load();
            }
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['pageActive']?.currentValue === true && !changes['pageActive'].firstChange) {
            this.load();
        }
    }

    ngOnDestroy(): void {
        this.loadSubscription?.unsubscribe();
        this.destroy$.next();
        this.destroy$.complete();
    }

    isUnidentified(group: ProviderGroup): boolean {
        return group.key === UNIDENTIFIED_PROVIDER_KEY;
    }

    kpiLabelKey(key: ProviderKpiKey): string {
        return `MEDICAL_RECORDS.DASHBOARD.PROVIDER_CARDS.KPI_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
    }

    kpiValue(group: ProviderGroup, key: ProviderKpiKey): number {
        return group[key];
    }

    trackByGroup(_index: number, group: ProviderGroup): string {
        return group.key;
    }

    select(group: ProviderGroup): void {
        this.providerSelected.emit({ key: group.key, name: group.name });
    }

    private load(): void {
        if (!this.config) {
            return;
        }
        const range = this.periodService.dateRange;
        this.state = 'loading';
        this.loadSubscription?.unsubscribe();

        const queryConfig: DashboardWidgetConfig = {
            ...this.config,
            processQuery: {
                processDefinitionKey: 'medical-records',
                includeSubprocesses: false,
                metricScope: 'root',
                status: [...DEFAULT_PROCESS_STATUSES],
                ...this.config.processQuery,
                includeProcessVariables: true,
            },
        };

        this.loadSubscription = this.processQueryDataProvider.fetchRowsCoveringDateRange(queryConfig, range).subscribe({
            next: (result) => {
                if (result.error) {
                    this.groups = [];
                    this.partial = false;
                    this.state = 'error';
                    return;
                }
                const rows = filterRowsToDateRange(
                    result.rows.map((row) => flattenTableRow(row)),
                    'startDate',
                    range
                );
                this.partial = isProviderDataPartial(rows.length, this.enrichLimit);
                this.groups = groupInstancesByProvider(
                    rows.map((row) => ({ status: row['status'], batchState: row['var_batchState'] }))
                );
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
