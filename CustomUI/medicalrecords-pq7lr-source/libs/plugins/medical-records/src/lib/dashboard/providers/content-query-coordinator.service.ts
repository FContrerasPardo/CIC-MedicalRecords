import { Injectable } from '@angular/core';
import { defer, finalize, from, Observable } from 'rxjs';
import { shareReplay, switchMap } from 'rxjs/operators';
import { DashboardContentQueryResult } from '../definitions/dashboard-widget.model';
import {
    contentQueryAllKey,
    ContentQueryPriority,
    normalizeContentQuery,
    parseContentQueryAllKey,
} from './content-query.types';

@Injectable({ providedIn: 'root' })
export class ContentQueryCoordinatorService {
    private readonly cache = new Map<string, Observable<DashboardContentQueryResult>>();
    private readonly waitQueue: Array<{ priority: ContentQueryPriority; resolve: () => void }> = [];
    private activeFetches = 0;
    private readonly maxConcurrent = 1;

    scheduleFetchAll<T extends DashboardContentQueryResult>(
        query: string,
        maxRows: number,
        priority: ContentQueryPriority,
        factory: () => Observable<T>
    ): Observable<T> {
        const key = contentQueryAllKey(query, maxRows);
        const cached = this.cache.get(key);
        if (cached) {
            return cached as Observable<T>;
        }

        const request$ = defer(() => from(this.acquireSlot(priority))).pipe(
            switchMap(() => factory()),
            finalize(() => this.releaseSlot()),
            shareReplay({ bufferSize: 1, refCount: false })
        );

        this.cache.set(key, request$);
        return request$;
    }

    findCachedFetchAll(query: string, minRows: number): Observable<DashboardContentQueryResult> | null {
        const normalized = normalizeContentQuery(query);
        let best: { maxRows: number; observable: Observable<DashboardContentQueryResult> } | null = null;

        for (const [key, observable] of this.cache.entries()) {
            const parsed = parseContentQueryAllKey(key);
            if (!parsed || parsed.query !== normalized || parsed.maxRows < minRows) {
                continue;
            }
            if (!best || parsed.maxRows < best.maxRows) {
                best = { maxRows: parsed.maxRows, observable };
            }
        }

        return best?.observable ?? null;
    }

    clearCache(): void {
        this.cache.clear();
    }

    private acquireSlot(priority: ContentQueryPriority): Promise<void> {
        return new Promise((resolve) => {
            this.waitQueue.push({ priority, resolve });
            this.sortWaitQueue();
            this.pumpWaitQueue();
        });
    }

    private releaseSlot(): void {
        this.activeFetches = Math.max(0, this.activeFetches - 1);
        this.pumpWaitQueue();
    }

    private sortWaitQueue(): void {
        this.waitQueue.sort((left, right) => {
            if (left.priority === right.priority) {
                return 0;
            }
            return left.priority === 'visible' ? -1 : 1;
        });
    }

    private pumpWaitQueue(): void {
        while (this.activeFetches < this.maxConcurrent && this.waitQueue.length) {
            const next = this.waitQueue.shift();
            if (!next) {
                return;
            }
            this.activeFetches += 1;
            next.resolve();
        }
    }
}
