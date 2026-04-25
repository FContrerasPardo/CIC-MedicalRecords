/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { JwtHelperService } from '@alfresco/adf-core';
import { Observable, catchError, map, of, shareReplay, switchMap, throwError } from 'rxjs';
import {
    GovernanceStatistic,
    GovernanceStatisticKey,
    GovernanceTrackerStatistic,
    GovernanceTrackerType,
    RecordHealthData,
    WidgetCategoryData,
} from '../definitions/dashboard.interface';
import { DASHBOARD_MONTH_NAMES, RECORD_HEALTH_STATUS_DEFINITIONS } from '../definitions/dashboard.constants';
import { GovernanceLegalCaseService } from '../../legal-hold-management/services/governance-legal-case.service';
import { DEFAULT_GOVERNANCE_SEARCH_LIMIT } from '../../../shared/definitions/governance-shared.constants';
import { GovernanceDiscoveryService } from '../../../shared/config/governance-discovery.service';
import { GovernanceLegalCaseResult } from '../../legal-hold-management/definitions/legal-hold.interface';

@Injectable({ providedIn: 'root' })
export class DashboardDataService {
    private readonly http = inject(HttpClient);
    private readonly jwtHelperService = inject(JwtHelperService);
    private readonly governanceDiscoveryService = inject(GovernanceDiscoveryService);
    private readonly governanceLegalCaseService = inject(GovernanceLegalCaseService);
    private readonly totalStatisticsApiPath = '/api/statistics/total';
    private readonly monthlyStatisticsApiPath = '/api/statistics/monthly';
    private readonly trackerStatisticsApiPath = '/api/statistics';
    private readonly monthlyStatisticsCache = new Map<string, Observable<GovernanceStatistic[]>>();
    private readonly trackerStatisticsCache = new Map<string, Observable<GovernanceTrackerStatistic[]>>();
    private totalStatisticsCache?: Observable<GovernanceStatistic[]>;

    fetchRecordHealth(categoryId?: string | null): Observable<RecordHealthData> {
        return this.fetchTotalStatistics().pipe(
            map((response) => this.mapTotalStatisticsToRecordHealthData(response, categoryId))
        );
    }

    fetchActiveRetention(date = new Date()): Observable<WidgetCategoryData> {
        return this.fetchMonthlyStatistics(date).pipe(
            map((response) => this.mapMonthlyStatisticsToWidgetData(response, 'underRetention'))
        );
    }

    fetchMissingProperties(date = new Date()): Observable<WidgetCategoryData> {
        return this.fetchMonthlyStatistics(date).pipe(
            map((response) => this.mapMonthlyStatisticsToWidgetData(response, 'incomplete'))
        );
    }

    fetchCutoffTracker(date = new Date()): Observable<WidgetCategoryData> {
        return this.fetchTrackerStatistics('cutoff', date).pipe(map((response) => this.mapTrackerStatisticsToWidgetData(response)));
    }

    fetchDispositionTracker(date = new Date()): Observable<WidgetCategoryData> {
        return this.fetchTrackerStatistics('disposition', date).pipe(map((response) => this.mapTrackerStatisticsToWidgetData(response)));
    }

    fetchCategories(): Observable<Array<{ id: string; value: string; label: string }>> {
        const mock = [
            { id: 'C#0199c481-c3df-7cb8-affc-bf4de59a6786', value: 'employee-contracts', label: 'Employee Contracts' },
            { id: 'C#0199c80b-4a3c-7dec-bc64-35baf8de35c6', value: 'case-files', label: 'Case Files' },
            { id: 'C#0199c80b-4a4b-72db-8199-d03a12c56017', value: 'certifications', label: 'Certifications' },
            { id: 'C#0199c80b-4a58-7373-9c0c-91816a6e63f5', value: 'training-records', label: 'Training Records' },
            { id: 'C#0199c80b-4a51-7436-af99-ac6c29ce74d7', value: 'new-hire-forms', label: 'New Hire Forms' },
            { id: 'C#0199c80b-4a5f-7df9-9afb-5a08a938bdce', value: 'employee-records', label: 'Employee Records' },
            { id: 'C#0199c80b-4a66-773f-9772-6b4df2e46bc5', value: 'payroll-documents', label: 'Payroll Documents' },
            { id: 'C#01997f9d-1c9c-7c2a-810f-75baee817c60', value: 'vendor-agreements', label: 'Vendor Agreements' },
            { id: 'C#01981dd5-485b-7798-b3ad-993c7c24d3bc', value: 'audit-logs', label: 'Audit Logs' },
            { id: 'C#0198324c-69fe-7963-919e-5e0b7701512b', value: 'legal-notices', label: 'Legal Notices' },
        ];

        return of(mock);
    }

    fetchLegalHoldSummary(): Observable<WidgetCategoryData> {
        return this.governanceLegalCaseService.queryLegalCases({ limit: DEFAULT_GOVERNANCE_SEARCH_LIMIT }).pipe(
            map((response: GovernanceLegalCaseResult) => {
                const cases = response.contents ?? [];

                const series = cases
                    .map((legalCase) => {
                        const legalCaseId = String(legalCase.legalCaseId ?? '').trim();
                        const legalCaseName = String(legalCase.legalCaseName ?? '').trim();
                        const recordCount = Number(legalCase.recordsCount ?? 0);

                        return { legalCaseId, legalCaseName, recordCount };
                    })
                    .filter(
                        ({ legalCaseId, legalCaseName, recordCount }) =>
                            Boolean(legalCaseId) && Boolean(legalCaseName) && recordCount > 0
                    )
                    .map(({ legalCaseId, legalCaseName, recordCount }) => ({
                        id: legalCaseId,
                        category: legalCaseName,
                        value: recordCount,
                        total: recordCount,
                    }));

                return { series };
            })
        );
    }

    clearMonthlyStatisticsCache(): void {
        this.monthlyStatisticsCache.clear();
    }

    clearTrackerStatisticsCache(): void {
        this.trackerStatisticsCache.clear();
    }

    clearTotalStatisticsCache(): void {
        this.totalStatisticsCache = undefined;
    }

    private fetchTotalStatistics(): Observable<GovernanceStatistic[]> {
        if (this.totalStatisticsCache) {
            return this.totalStatisticsCache;
        }

        const request$ = this.governanceDiscoveryService.getGovernanceApiContext().pipe(
            switchMap(({ govUrl, environmentKey }) =>
                this.http.get<GovernanceStatistic[]>(`${govUrl}${this.totalStatisticsApiPath}`, {
                    headers: this.createGovernanceHeaders(environmentKey),
                })
            ),
            catchError((error) => {
                this.totalStatisticsCache = undefined;
                return throwError(() => error);
            }),
            shareReplay({ bufferSize: 1, refCount: false })
        );

        this.totalStatisticsCache = request$;

        return request$;
    }

    private fetchMonthlyStatistics(date: Date): Observable<GovernanceStatistic[]> {
        const { month, year } = this.getMonthYearParams(date);
        const cacheKey = `${year}-${month}`;
        const cachedRequest = this.monthlyStatisticsCache.get(cacheKey);

        if (cachedRequest) {
            return cachedRequest;
        }

        const request$ = this.governanceDiscoveryService.getGovernanceApiContext().pipe(
            switchMap(({ govUrl, environmentKey }) => {
                const params = new HttpParams().set('month', month).set('year', year);

                return this.http.get<GovernanceStatistic[]>(`${govUrl}${this.monthlyStatisticsApiPath}`, {
                    headers: this.createGovernanceHeaders(environmentKey),
                    params,
                });
            }),
            catchError((error) => {
                this.monthlyStatisticsCache.delete(cacheKey);
                return throwError(() => error);
            }),
            shareReplay({ bufferSize: 1, refCount: false })
        );

        this.monthlyStatisticsCache.set(cacheKey, request$);

        return request$;
    }

    private fetchTrackerStatistics(tracker: GovernanceTrackerType, date: Date): Observable<GovernanceTrackerStatistic[]> {
        const { month, year } = this.getMonthYearParams(date);
        const cacheKey = `${tracker}-${year}-${month}`;
        const cachedRequest = this.trackerStatisticsCache.get(cacheKey);

        if (cachedRequest) {
            return cachedRequest;
        }

        const request$ = this.governanceDiscoveryService.getGovernanceApiContext().pipe(
            switchMap(({ govUrl, environmentKey }) => {
                const params = new HttpParams().set('month', month).set('year', year);

                return this.http.get<GovernanceTrackerStatistic[]>(`${govUrl}${this.trackerStatisticsApiPath}/${tracker}`, {
                    headers: this.createGovernanceHeaders(environmentKey),
                    params,
                });
            }),
            catchError((error) => {
                this.trackerStatisticsCache.delete(cacheKey);
                return throwError(() => error);
            }),
            shareReplay({ bufferSize: 1, refCount: false })
        );

        this.trackerStatisticsCache.set(cacheKey, request$);

        return request$;
    }

    private mapMonthlyStatisticsToWidgetData(
        response: GovernanceStatistic[],
        key: GovernanceStatisticKey
    ): WidgetCategoryData {
        const series = (response ?? [])
            .map((item) => {
                const id = String(item.categoryId ?? '').trim();
                const category = String(item.categoryName ?? '').trim();
                const value = Number(item[key] ?? 0);
                const total = Math.max(Number(item.total ?? 0), value);

                return { id, category, value, total };
            })
            .filter(({ id, category, value, total }) => Boolean(id) && Boolean(category) && value > 0 && total > 0)
            .sort((left, right) => right.value - left.value || right.total - left.total || left.category.localeCompare(right.category));

        return { series };
    }

    private mapTrackerStatisticsToWidgetData(response: GovernanceTrackerStatistic[]): WidgetCategoryData {
        const series = (response ?? [])
            .map((item) => {
                const id = String(item.categoryId ?? '').trim();
                const category = String(item.categoryName ?? '').trim();
                const value = Number(item.count ?? 0);
                const total = Math.max(Number(item.totalRecordCount ?? 0), value);

                return { id, category, value, total };
            })
            .filter(({ id, category, value, total }) => Boolean(id) && Boolean(category) && value > 0 && total > 0)
            .sort((left, right) => right.value - left.value || right.total - left.total || left.category.localeCompare(right.category));

        return { series };
    }

    private mapTotalStatisticsToRecordHealthData(response: GovernanceStatistic[], categoryId?: string | null): RecordHealthData {
        const statistics = categoryId ? this.findStatisticsByCategoryId(response, categoryId) : this.aggregateStatistics(response);
        const breakdown = RECORD_HEALTH_STATUS_DEFINITIONS.map(({ status, key }) => ({
            status,
            value: Number(statistics[key] ?? 0),
        }));
        const total = breakdown.reduce((sum, item) => sum + item.value, 0);

        return { total, breakdown };
    }

    private aggregateStatistics(response: GovernanceStatistic[]): Partial<GovernanceStatistic> {
        return (response ?? []).reduce<Partial<GovernanceStatistic>>(
            (summary, item) => {
                for (const { key } of RECORD_HEALTH_STATUS_DEFINITIONS) {
                    summary[key] = Number(summary[key] ?? 0) + Number(item[key] ?? 0);
                }

                return summary;
            },
            {}
        );
    }

    private findStatisticsByCategoryId(response: GovernanceStatistic[], categoryId: string): Partial<GovernanceStatistic> {
        const normalizedCategoryId = String(categoryId ?? '').trim();

        return (
            (response ?? []).find((item) => String(item.categoryId ?? '').trim() === normalizedCategoryId) ?? {}
        );
    }

    private createGovernanceHeaders(environmentKey: string): HttpHeaders {
        return new HttpHeaders({
            Authorization: `Bearer ${this.jwtHelperService.getAccessToken()}`,
            'Content-Type': 'application/json',
            'x-environment-key': environmentKey,
        });
    }

    private getMonthYearParams(date: Date): { month: string; year: string } {
        return {
            month: DASHBOARD_MONTH_NAMES[date.getMonth()] ?? DASHBOARD_MONTH_NAMES[0],
            year: String(date.getFullYear()),
        };
    }
}
