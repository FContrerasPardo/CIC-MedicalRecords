/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { JwtHelperService } from '@alfresco/adf-core';
import { catchError, map, Observable, of, Subject, switchMap } from 'rxjs';
import { GovernanceDiscoveryService } from '../../../shared/config/governance-discovery.service';
import { GovernanceRecord, RecordIdentity } from '../../../shared/definitions/governance-shared.interface';
import { LegalHoldCase } from '../../legal-hold-management/definitions/legal-hold.interface';

@Injectable({ providedIn: 'root' })
export class GovernanceRecordService {
    private http = inject(HttpClient);
    private jwtHelperService = inject(JwtHelperService);
    private governanceDiscoveryService = inject(GovernanceDiscoveryService);
    private updateConfirmedSubject = new Subject<GovernanceRecord>();
    private patchConfirmedSubject = new Subject<GovernanceRecord>();
    private deleteConfirmedSubject = new Subject<void>();
    deleteConfirmed$ = this.deleteConfirmedSubject.asObservable();
    updateConfirmed$ = this.updateConfirmedSubject.asObservable();
    patchConfirmed$ = this.patchConfirmedSubject.asObservable();

    private readonly recordsApiPath = '/api/records';
    private readonly legalHoldApiPath = '/api/legal-records/legal-cases';
    private readonly eventsApiPath = '/api/events';

    getRecordById(recordId: string, edsId: string, categoryId: string): Observable<GovernanceRecord> {
        return this.governanceDiscoveryService.getGovernanceApiContext().pipe(
            switchMap(({ govUrl, environmentKey }) => {
                const headers = new HttpHeaders({
                    Authorization: `Bearer ${this.jwtHelperService.getAccessToken()}`,
                    'Content-Type': 'application/json',
                    'x-environment-key': environmentKey,
                });

                const url = `${govUrl}${this.recordsApiPath}/${encodeURIComponent(recordId)}`;
                const params = new HttpParams().set('eds', edsId).set('categoryId', categoryId);

                return this.http.get<GovernanceRecord>(url, { headers, params });
            })
        );
    }

    editRecord(recordId: string, body: RecordIdentity): Observable<GovernanceRecord> {
        return this.performRecordUpdate('put', recordId, body);
    }

    patchRecord(recordId: string, body: RecordIdentity): Observable<GovernanceRecord> {
        return this.performRecordUpdate('patch', recordId, body);
    }

    deleteRecord(recordId: string, edsId: string, categoryId: string): Observable<boolean> {
        return this.governanceDiscoveryService.getGovernanceApiContext().pipe(
            switchMap(({ govUrl, environmentKey }) => {
                const accessToken = this.jwtHelperService.getAccessToken();
                const headers = new HttpHeaders({
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'x-environment-key': environmentKey,
                });

                const encodedRecordId = encodeURIComponent(recordId);
                const encodedEdsId = encodeURIComponent(edsId);
                const encodedCategoryId = encodeURIComponent(categoryId);

                const url = `${govUrl}${this.recordsApiPath}/${encodedRecordId}?eds=${encodedEdsId}&categoryId=${encodedCategoryId}`;

                return this.http.delete(url, { headers }).pipe(
                    map(() => true),
                    catchError(() => of(false))
                );
            })
        );
    }

    getLinkedLegalHoldCases(contentId: string, environmentDataSourceId: string): Observable<LegalHoldCase[]> {
        return this.governanceDiscoveryService.getGovernanceApiContext().pipe(
            switchMap(({ govUrl, environmentKey }) => {
                const accessToken = this.jwtHelperService.getAccessToken();
                const headers = new HttpHeaders({
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'x-environment-key': environmentKey,
                });

                return this.http.get<LegalHoldCase[]>(
                    `${govUrl}${this.legalHoldApiPath}?contentId=${encodeURIComponent(contentId)}&eds=${encodeURIComponent(environmentDataSourceId)}`,
                    { headers }
                );
            })
        );
    }

    getViewRecordProperty(recordId: string, edsId: string, categoryId: string): Observable<boolean> {
        return this.governanceDiscoveryService.getGovernanceApiContext().pipe(
            switchMap(({ govUrl, environmentKey }) => {
                const accessToken = this.jwtHelperService.getAccessToken();
                const headers = new HttpHeaders({
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'x-environment-key': environmentKey,
                });

                const encodedRecordId = encodeURIComponent(recordId);
                const encodedEdsId = encodeURIComponent(edsId);
                const encodedCategoryId = encodeURIComponent(categoryId);

                const url = `${govUrl}${this.eventsApiPath}/${encodedRecordId}?eds=${encodedEdsId}&categoryId=${encodedCategoryId}`;

                return this.http.get(url, { headers }).pipe(
                    map(() => true),
                    catchError(() => of(false))
                );
            })
        );
    }

    emitUpdateConfirmed(updatedRecord: GovernanceRecord): void {
        this.updateConfirmedSubject.next(updatedRecord);
    }

    emitPatchConfirmed(patchedRecord: GovernanceRecord): void {
        this.patchConfirmedSubject.next(patchedRecord);
    }

    emitDeleteConfirmed(): void {
        this.deleteConfirmedSubject.next();
    }

    /**
     * Executes a record mutation (PUT or PATCH) against the governance records endpoint.
     * - httpMethod must be 'put' or 'patch'
     * - recordId and body are forwarded to the HttpClient call
     */
    private performRecordUpdate(httpMethod: 'put' | 'patch', recordId: string, body: RecordIdentity): Observable<GovernanceRecord> {
        return this.governanceDiscoveryService.getGovernanceApiContext().pipe(
            switchMap(({ govUrl, environmentKey, environmentId }) => {
                const accessToken = this.jwtHelperService.getAccessToken();

                const headers = new HttpHeaders({
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'x-environment-key': environmentKey,
                });

                // preserve current behaviour (plain object) for params
                const params = { environmentId };

                const url = `${govUrl}${this.recordsApiPath}/${recordId}`;

                return httpMethod === 'put' ? this.http.put<GovernanceRecord>(url, body, { headers, params }) : this.http.patch<GovernanceRecord>(url, body, { headers, params });
            })
        );
    }
}
