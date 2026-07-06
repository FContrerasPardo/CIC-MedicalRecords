import { Injectable } from '@angular/core';

import { SearchService } from '@alfresco/adf-hx-content-services/services';

import { catchError, map, Observable, of, switchMap } from 'rxjs';

import { DashboardDataProvider } from '../definitions/dashboard-data-provider.interface';

import { DashboardContentQueryResult, DashboardWidgetConfig } from '../definitions/dashboard-widget.model';

import { TABLE_EXPORT_MAX_ROWS } from '../utils/dashboard-table-export.util';
import { normalizeContentRow } from '../utils/dashboard-content-fields.util';
import { ContentQueryCoordinatorService } from './content-query-coordinator.service';
import {
    ContentQueryPriority,
    ContentQueryRequestOptions,
    normalizeContentQuery,
} from './content-query.types';

const CONTENT_FETCH_PAGE_SIZE = 500;

@Injectable({ providedIn: 'root' })
export class ContentQueryDataProvider implements DashboardDataProvider {
    constructor(
        private readonly searchService: SearchService,
        private readonly coordinator: ContentQueryCoordinatorService
    ) {}

    fetch(
        config: DashboardWidgetConfig,
        pageSize?: number,
        skipCount = 0,
        options?: ContentQueryRequestOptions
    ): Observable<DashboardContentQueryResult> {
        const query = config.contentQuery?.trim();
        if (!query) {
            return of({ totalCount: 0, documents: [] });
        }

        const resolvedPageSize = pageSize ?? config.tablePageSize ?? 25;
        const cachedAll = this.coordinator.findCachedFetchAll(query, skipCount + resolvedPageSize);
        if (cachedAll) {
            return cachedAll.pipe(
                map((result) => ({
                    totalCount: result.totalCount,
                    documents: result.documents.slice(skipCount, skipCount + resolvedPageSize),
                }))
            );
        }

        return this.fetchPageDirect(config, resolvedPageSize, skipCount);
    }

    fetchAll(
        config: DashboardWidgetConfig,
        maxRows = TABLE_EXPORT_MAX_ROWS,
        options?: ContentQueryRequestOptions
    ): Observable<DashboardContentQueryResult> {
        const query = config.contentQuery?.trim();
        if (!query) {
            return of({ totalCount: 0, documents: [] });
        }

        const priority = options?.priority ?? 'background';
        return this.coordinator.scheduleFetchAll(query, maxRows, priority, () =>
            this.executeFetchAll(config, maxRows)
        );
    }

    prefetchFetchAll(query: string, maxRows: number, priority: ContentQueryPriority): void {
        const normalized = normalizeContentQuery(query);
        if (!normalized) {
            return;
        }

        this.fetchAll({ contentQuery: normalized } as DashboardWidgetConfig, maxRows, { priority }).subscribe();
    }

    clearFetchAllCache(): void {
        this.coordinator.clearCache();
    }

    private executeFetchAll(config: DashboardWidgetConfig, maxRows: number): Observable<DashboardContentQueryResult> {
        const pageSize = Math.min(Math.max(config.tablePageSize ?? CONTENT_FETCH_PAGE_SIZE, 1), CONTENT_FETCH_PAGE_SIZE);
        return this.fetchPageRecursive(config, 0, pageSize, maxRows, []);
    }

    private fetchPageDirect(
        config: DashboardWidgetConfig,
        maxItems: number,
        skipCount: number
    ): Observable<DashboardContentQueryResult> {
        const query = config.contentQuery?.trim();

        if (!query) {
            return of({ totalCount: 0, documents: [] });
        }

        return this.searchService.getDocumentsByQuery(query, { pagination: { maxItems, skipCount } }).pipe(
            map((result) => this.mapDocumentsResult(result)),
            catchError(() => of({ totalCount: 0, documents: [] }))
        );
    }

    private fetchPageRecursive(
        config: DashboardWidgetConfig,
        skipCount: number,
        pageSize: number,
        maxRows: number,
        accumulated: Array<{ id?: string; name?: string; [key: string]: unknown }>
    ): Observable<DashboardContentQueryResult> {
        const query = config.contentQuery?.trim() ?? '';

        return this.searchService.getDocumentsByQuery(query, { pagination: { maxItems: pageSize, skipCount } }).pipe(
            switchMap((result) => {
                const page = this.mapDocumentsResult(result);
                const merged = [...accumulated, ...page.documents];
                const totalCount = page.totalCount || merged.length;
                const nextSkip = skipCount + page.documents.length;
                const reachedEnd =
                    page.documents.length === 0 || nextSkip >= totalCount || merged.length >= maxRows;

                if (reachedEnd) {
                    return of({
                        totalCount,
                        documents: merged.slice(0, maxRows),
                    });
                }

                return this.fetchPageRecursive(config, nextSkip, pageSize, maxRows, merged);
            }),
            catchError(() => of({ totalCount: accumulated.length, documents: accumulated.slice(0, maxRows) }))
        );
    }

    private mapDocumentsResult(result: {
        totalCount?: number;
        documents?: Array<Record<string, unknown> & { sys_id?: string; sys_title?: string; name?: string }>;
    }): DashboardContentQueryResult {
        return {
            totalCount: result.totalCount ?? result.documents?.length ?? 0,
            documents: (result.documents ?? []).map((document) =>
                normalizeContentRow({
                    id: document.sys_id,
                    name: document.sys_title ?? document.name,
                    ...document,
                } as Record<string, unknown>)
            ),
        };
    }
}
