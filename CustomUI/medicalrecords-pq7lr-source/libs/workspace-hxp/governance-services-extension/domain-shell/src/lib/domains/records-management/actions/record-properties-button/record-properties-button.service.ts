/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';
import { ActionContext, GovernanceRecord } from '../../../../shared/definitions/governance-shared.interface';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class RecordPropertiesButtonService {
    private showSidebarSubject = new BehaviorSubject<boolean>(false);
    showSidebar$: Observable<boolean> = this.showSidebarSubject.asObservable();

    isAvailable(records: GovernanceRecord[]): boolean {
        return records.length === 1;
    }

    execute(actionContext: ActionContext): void {
        this.showSidebarSubject.next(actionContext?.showPanel ?? false);
    }
}
