/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { ActionContext, GovernanceRecord } from '../../../../shared/definitions/governance-shared.interface';
import { MatDialog } from '@angular/material/dialog';
import { LegalHoldListComponent } from '../../../legal-hold-management/dialogs/legal-hold-list/legal-hold-list.component';
import { Observable, of } from 'rxjs';
@Injectable({
    providedIn: 'root',
})
export class AddLegalHoldButtonService {
    private readonly dialog = inject(MatDialog);

    isAvailable(records: GovernanceRecord[]): Observable<boolean> {
        return of(records.length > 0);
    }

    execute(context?: ActionContext, opts?: { highlightFirstRow?: boolean }): void {
        this.dialog.open(LegalHoldListComponent, {
            width: '1200px',
            maxWidth: '90vw',
            data: {
                ...context,
                ...(opts?.highlightFirstRow ? { highlightFirstRow: true } : {}),
            },
        });
    }
}
