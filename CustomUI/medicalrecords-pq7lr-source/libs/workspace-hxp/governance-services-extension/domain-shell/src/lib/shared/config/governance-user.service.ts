/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { catchError, Observable, shareReplay, switchMap, throwError } from 'rxjs';
import { GovernanceUser } from './governance-config.type';
import { JwtHelperService } from '@alfresco/adf-core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { GovernanceDiscoveryService } from './governance-discovery.service';

@Injectable({
    providedIn: 'root',
})
export class GovernanceUserService {
    private jwtHelperService: JwtHelperService = inject(JwtHelperService);
    private http: HttpClient = inject(HttpClient);
    private governanceDiscoveryService = inject(GovernanceDiscoveryService);
    private readonly governanceApiPath = '/api/users';
    private users$?: Observable<GovernanceUser[]>;

    getUsers(): Observable<GovernanceUser[]> {
        if (!this.users$) {
            this.users$ = this.governanceDiscoveryService.getGovernanceApiContext().pipe(
                switchMap(({ govUrl, environmentKey, environmentId }) => {
                    const accessToken = this.jwtHelperService.getAccessToken();
                    const headers = new HttpHeaders({
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                        'x-environment-key': environmentKey,
                    });
                    const params = { environmentId };
                    return this.http.get<any[]>(`${govUrl}${this.governanceApiPath}`, { headers, params });
                }),
                catchError((error) => {
                    console.error('Failed to fetch users:', error);
                    return throwError(() => error);
                }),
                shareReplay(1)
            );
        }
        return this.users$;
    }
}
