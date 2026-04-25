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
import { GovernanceRecord } from '../../../shared/definitions/governance-shared.interface';
import { DEFAULT_GOVERNANCE_SEARCH_LIMIT } from '../../../shared/definitions/governance-shared.constants';
import { LegalRecordsQueryOptions } from '../../../shared/ui/search/models/legal-records-query.interface';
import { AssignRecordPayload, GovernanceLegalRecordsResult } from '../definitions/legal-hold.interface';

@Injectable({
    providedIn: 'root',
})
export class GovernanceLegalRecordService {
    private readonly http = inject(HttpClient);
    private readonly jwtHelperService = inject(JwtHelperService);
    private readonly governanceDiscoveryService = inject(GovernanceDiscoveryService);
    private readonly recordAssigned = new Subject<GovernanceRecord[]>();
    private readonly legalRecordsApiPath = '/api/legal-records';

    readonly recordAssigned$ = this.recordAssigned.asObservable();

    queryLegalRecords(options?: LegalRecordsQueryOptions): Observable<GovernanceLegalRecordsResult> {
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

                if (options?.sortDirection) {
                    params = params.set('ascendingOrder', options.sortDirection === 'asc' ? 'true' : 'false');
                }

                const legalCaseId = options?.legalCaseId ?? '';
                return this.http.get<GovernanceLegalRecordsResult>(
                    `${govUrl}${this.legalRecordsApiPath}/${encodeURIComponent(legalCaseId)}`,
                    { headers, params }
                );
            })
        );
    }

    assignRecordToLegalCase(body: AssignRecordPayload): Observable<void> {
        const accessToken = this.jwtHelperService.getAccessToken();

        return this.governanceDiscoveryService.getGovernanceApiContext().pipe(
            switchMap(({ govUrl, environmentKey, environmentId }) => {
                const headers = new HttpHeaders({
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'x-environment-key': environmentKey,
                });
                const params = { environmentId };

                return this.http.post<void>(`${govUrl}${this.legalRecordsApiPath}`, body, { headers, params });
            })
        );
    }

    emitRecordAssignmentComplete(records: GovernanceRecord[]): void {
        this.recordAssigned.next(records);
    }
}
