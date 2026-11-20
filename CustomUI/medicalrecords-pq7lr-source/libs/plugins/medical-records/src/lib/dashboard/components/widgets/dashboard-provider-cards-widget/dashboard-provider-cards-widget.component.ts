import { rootProcessKey } from '../../../definitions/process-mapping';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { DashboardProviderSelection, DashboardWidgetConfig } from '../../../definitions/dashboard-widget.model';
import { flattenTableRow } from '../../../mappers/dashboard-table.mapper';
import { ProcessQueryDataProvider } from '../../../providers/process-query-data.provider';
import { DashboardCrossFilterService } from '../../../services/dashboard-cross-filter.service';
import { DashboardPeriodService } from '../../../services/dashboard-period.service';
import { PROCESS_VARIABLE_ENRICH_LIMIT } from '../../../services/process-variables.service';
import { filterRowsToDateRange } from '../../../utils/dashboard-date-range.util';
import {
    ACTIVE_PROCESS_STATUSES,
    buildProviderCards,
    isProviderDataPartial,
    ProviderCard,
    ProviderCardMetric,
    ProviderKpiKey,
    resolveProviderContext,
    resolveProviderMetrics,
    UNIDENTIFIED_PROVIDER_KEY,
} from '../../../utils/dashboard-provider-group.util';
import { DashboardWidgetTextPipe } from '../../../pipes/dashboard-widget-text.pipe';

type ProviderCardsState = 'loading' | 'ready' | 'error';

/**
 * Filter cards: one card per value of the mapped field (default: provider in the IDP batchState),
 * each with configurable sub-KPIs. Picking a card sets the dashboard cross-filter.
 */
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
    cards: ProviderCard[] = [];
    metrics: ProviderCardMetric[] = [];
    partial = false;
    selectedKey: string | null = null;
    selectedLabel: string | null = null;
    readonly enrichLimit = PROCESS_VARIABLE_ENRICH_LIMIT;

    private rows: Array<Record<string, unknown>> = [];
    private readonly destroy$ = new Subject<void>();
    private loadSubscription?: Subscription;

    constructor(
        private readonly processQueryDataProvider: ProcessQueryDataProvider,
        private readonly periodService: DashboardPeriodService,
        private readonly crossFilter: DashboardCrossFilterService
    ) {}

    /** Filter cards only ever show real process data: live when loaded, error when the query failed. */
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
        this.crossFilter.selection$.pipe(takeUntil(this.destroy$)).subscribe((selection) => {
            const mine = selection && selection.sourceWidgetId === this.config?.id ? selection : null;
            this.selectedKey = mine?.key ?? null;
            this.selectedLabel = mine?.label ?? null;
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['config'] && !changes['config'].firstChange) {
            this.rebuildCards();
        }
        if (changes['pageActive']?.currentValue === true && !changes['pageActive'].firstChange) {
            this.load();
        }
    }

    ngOnDestroy(): void {
        this.loadSubscription?.unsubscribe();
        this.destroy$.next();
        this.destroy$.complete();
    }

    /** Statuses loaded: configured ones, or only active instances (default). */
    get statuses(): string[] {
        const configured = this.config?.providerCardsOptions?.statuses?.filter((status) => !!status);
        return configured?.length ? [...configured] : [...ACTIVE_PROCESS_STATUSES];
    }

    /** Search box in the cards header; widgets following the filter apply the same text. */
    get showSearch(): boolean {
        return this.config?.providerCardsOptions?.showSearch !== false;
    }

    get search(): string {
        return this.crossFilter.searchTerm;
    }

    onSearch(value: string): void {
        this.crossFilter.setSearchTerm(value);
    }

    isUnidentified(card: ProviderCard): boolean {
        return card.key === UNIDENTIFIED_PROVIDER_KEY;
    }

    isSelected(card: ProviderCard): boolean {
        return this.selectedKey === card.key;
    }

    metricValue(card: ProviderCard, metric: ProviderCardMetric): string {
        const value = card.values[metric.id] ?? 0;
        return Number.isInteger(value) ? String(value) : value.toFixed(1);
    }

    trackByCard(_index: number, card: ProviderCard): string {
        return card.key;
    }

    trackByMetric(_index: number, metric: ProviderCardMetric): string {
        return metric.id;
    }

    select(card: ProviderCard): void {
        this.crossFilter.toggle({
            sourceWidgetId: this.config.id,
            key: card.key,
            label: card.name,
            groupBy: this.config.providerCardsOptions?.groupBy ?? null,
            context: resolveProviderContext(this.config.providerCardsOptions),
        });
        this.providerSelected.emit({ key: card.key, name: card.name });
    }

    clearSelection(): void {
        this.crossFilter.clear();
    }

    private rebuildCards(): void {
        const options = this.config?.providerCardsOptions;
        this.metrics = resolveProviderMetrics(options, (key: ProviderKpiKey) => this.legacyLabelKey(key));
        this.cards = buildProviderCards(this.rows, options?.groupBy, this.metrics, resolveProviderContext(options));
    }

    private legacyLabelKey(key: ProviderKpiKey): string {
        return `MEDICAL_RECORDS.DASHBOARD.PROVIDER_CARDS.KPI_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
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
                processDefinitionKey: rootProcessKey(),
                includeSubprocesses: false,
                metricScope: 'root',
                ...this.config.processQuery,
                status: this.statuses,
                includeProcessVariables: true,
            },
        };

        this.loadSubscription = this.processQueryDataProvider.fetchRowsCoveringDateRange(queryConfig, range).subscribe({
            next: (result) => {
                if (result.error) {
                    this.rows = [];
                    this.cards = [];
                    this.partial = false;
                    this.state = 'error';
                    return;
                }
                this.rows = filterRowsToDateRange(
                    result.rows.map((row) => flattenTableRow(row)),
                    'startDate',
                    range
                );
                this.partial = isProviderDataPartial(this.rows.length, this.enrichLimit);
                this.rebuildCards();
                this.state = 'ready';
            },
            error: () => {
                this.rows = [];
                this.cards = [];
                this.partial = false;
                this.state = 'error';
            },
        });
    }
}
