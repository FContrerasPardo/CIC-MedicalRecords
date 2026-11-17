import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { DashboardProviderGroupBy } from '../definitions/dashboard-widget.model';
import { ProviderVariableContext } from '../utils/dashboard-provider-group.util';

/** The filter card currently selected on the dashboard (e.g. one provider). */
export interface DashboardCrossFilterSelection {
    /** Widget that owns the selection (the filter-cards widget id). */
    sourceWidgetId: string;
    /** Normalized group key (see `providerGroupKey`). */
    key: string;
    /** Display name; null for the unidentified group. */
    label: string | null;
    /** Mapping used to compute the key, so other widgets can match their own rows. */
    groupBy?: DashboardProviderGroupBy | null;
    /** Variables (IDP / summary) the selecting widget reads, so followers resolve rows the same way. */
    context?: ProviderVariableContext;
}

/** Dashboard-wide selection shared by the filter cards and the widgets that follow it. */
@Injectable({ providedIn: 'root' })
export class DashboardCrossFilterService {
    private readonly selectionSubject = new BehaviorSubject<DashboardCrossFilterSelection | null>(null);

    readonly selection$: Observable<DashboardCrossFilterSelection | null> = this.selectionSubject.asObservable();

    get selection(): DashboardCrossFilterSelection | null {
        return this.selectionSubject.value;
    }

    /** Selects a card, or clears the filter when the same card is picked again. */
    toggle(selection: DashboardCrossFilterSelection): void {
        const current = this.selection;
        const same = !!current && current.sourceWidgetId === selection.sourceWidgetId && current.key === selection.key;
        this.selectionSubject.next(same ? null : selection);
    }

    clear(): void {
        if (this.selection) {
            this.selectionSubject.next(null);
        }
    }

    private readonly searchSubject = new BehaviorSubject<string>('');

    /** Free-text search typed in the filter cards; followers apply it to their rows. */
    readonly searchTerm$: Observable<string> = this.searchSubject.asObservable();

    get searchTerm(): string {
        return this.searchSubject.value;
    }

    setSearchTerm(term: string): void {
        const value = term ?? '';
        if (value !== this.searchSubject.value) {
            this.searchSubject.next(value);
        }
    }
}
