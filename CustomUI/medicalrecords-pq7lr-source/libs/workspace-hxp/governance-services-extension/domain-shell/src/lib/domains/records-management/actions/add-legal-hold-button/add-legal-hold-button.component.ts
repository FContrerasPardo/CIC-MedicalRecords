/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, DestroyRef, inject, Input, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ActionContext } from '../../../../shared/definitions/governance-shared.interface';
import { AddLegalHoldButtonService } from './add-legal-hold-button.service';
import { TranslatePipe } from '@ngx-translate/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { GovernanceLegalCaseService } from '../../../legal-hold-management/services/governance-legal-case.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'hxp-add-legal-hold-button',
    templateUrl: './add-legal-hold-button.component.html',
    styleUrl: './add-legal-hold-button.component.scss',
    imports: [MatIconModule, MatButtonModule, TranslatePipe, MatTooltipModule, AsyncPipe],
})
export class AddLegalHoldButtonComponent implements OnInit {
    @Input() actionContext!: ActionContext;

    private governanceLegalCaseService = inject(GovernanceLegalCaseService);
    private addLegalHoldButtonService = inject(AddLegalHoldButtonService);
    private readonly destroyRef = inject(DestroyRef);

    get isAvailable$(): Observable<boolean> {
        return this.addLegalHoldButtonService.isAvailable(this.actionContext.records);
    }

    ngOnInit(): void {
        this.governanceLegalCaseService.shouldRefreshList$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((shouldRefresh: boolean) => {
            if (shouldRefresh) {
                this.addLegalHoldButtonService.execute(this.actionContext, { highlightFirstRow: true });
            }
        });
    }

    openLegalHoldDialog(): void {
        this.addLegalHoldButtonService.execute(this.actionContext);
    }
}
