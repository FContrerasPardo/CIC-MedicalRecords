import { Injectable } from '@angular/core';
import { SearchService } from '@alfresco/adf-hx-content-services/services';
import { catchError, map, Observable, of } from 'rxjs';
import { DashboardDataProvider } from '../definitions/dashboard-data-provider.interface';
import { DashboardContentQueryResult, DashboardWidgetConfig } from '../definitions/dashboard-widget.model';

@Injectable({ providedIn: 'root' })
export class ContentQueryDataProvider implements DashboardDataProvider {
    constructor(private readonly searchService: SearchService) {}

    fetch(config: DashboardWidgetConfig): Observable<DashboardContentQueryResult> {
        const query = config.contentQuery?.trim();
        if (!query) {
            return of({ totalCount: 0, documents: [] });
        }

        return this.searchService.getDocumentsByQuery(query, { pagination: { maxItems: 25, skipCount: 0 } }).pipe(
            map((result) => ({
                totalCount: result.totalCount ?? result.documents?.length ?? 0,
                documents: (result.documents ?? []).map((document) => ({
                    id: document.sys_id,
                    name: document.sys_title ?? document.name,
                    ...document,
                })),
            })),
            catchError(() => of({ totalCount: 0, documents: [] }))
        );
    }
}
