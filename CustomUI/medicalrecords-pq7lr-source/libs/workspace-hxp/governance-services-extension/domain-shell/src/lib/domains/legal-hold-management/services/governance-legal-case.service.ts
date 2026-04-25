/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { JwtHelperService } from '@alfresco/adf-core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, Subject, switchMap } from 'rxjs';
import { GovernanceDiscoveryService } from '../../../shared/config/governance-discovery.service';
import { DEFAULT_GOVERNANCE_SEARCH_LIMIT } from '../../../shared/definitions/governance-shared.constants';
import { LegalHoldQueryOptions } from '../../../shared/ui/search/models/legal-hold-query-options.interface';
import { GovernanceLegalCaseResult, LegalHoldCase, LegalHoldCaseIdentity } from '../definitions/legal-hold.interface';

@Injectable({
    providedIn: 'root',
})
export class GovernanceLegalCaseService {
    private readonly http = inject(HttpClient);
    private readonly jwtHelperService = inject(JwtHelperService);
    private readonly governanceDiscoveryService = inject(GovernanceDiscoveryService);
    private readonly shouldRefreshList = new Subject<boolean>();
    private readonly legalCasesApiPath = '/api/legal-cases';

    readonly shouldRefreshList$ = this.shouldRefreshList.asObservable();

    queryLegalCases(options?: LegalHoldQueryOptions): Observable<GovernanceLegalCaseResult> {
        const accessToken = this.jwtHelperService.getAccessToken();

        return this.governanceDiscoveryService.getGovernanceApiContext().pipe(
            switchMap(({ govUrl, environmentKey }) => {
                const headers = new HttpHeaders({
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'x-environment-key': environmentKey,
                });

                let params = new HttpParams();
                params = options?.limit
                    ? params.set('limit', options.limit.toString())
                    : params.set('limit', DEFAULT_GOVERNANCE_SEARCH_LIMIT.toString());

                if (options?.exclusiveStartKey) {
                    params = params.set('exclusiveStartKey', options.exclusiveStartKey);
                }

                return this.http.get<GovernanceLegalCaseResult>(`${govUrl}${this.legalCasesApiPath}`, { headers, params });
            })
        );
    }

    createLegalHoldCase(body: LegalHoldCaseIdentity): Observable<LegalHoldCase> {
        return this.governanceDiscoveryService.getGovernanceApiContext().pipe(
            switchMap(({ govUrl, environmentKey, environmentId }) => {
                const accessToken = this.jwtHelperService.getAccessToken();
                const headers = new HttpHeaders({
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'x-environment-key': environmentKey,
                });
                const params = { environmentId };

                return this.http.post<LegalHoldCase>(`${govUrl}${this.legalCasesApiPath}`, body, { headers, params });
            })
        );
    }

    editLegalHoldCase(body: LegalHoldCaseIdentity): Observable<LegalHoldCase> {
        return this.governanceDiscoveryService.getGovernanceApiContext().pipe(
            switchMap(({ govUrl, environmentKey, environmentId }) => {
                const accessToken = this.jwtHelperService.getAccessToken();
                const headers = new HttpHeaders({
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'x-environment-key': environmentKey,
                });
                const params = { environmentId };
                const encodedLegalCaseId = encodeURIComponent(body.legalCaseId ?? '');

                return this.http.put<LegalHoldCase>(`${govUrl}${this.legalCasesApiPath}/${encodedLegalCaseId}`, body, { headers, params });
            })
        );
    }

    emitRefreshList(): void {
        this.shouldRefreshList.next(true);
    }
}
