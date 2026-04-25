/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, inject, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { CreateLegalHoldCaseButtonService } from './create-legal-hold-case-button.service';
import { MatDialogRef } from '@angular/material/dialog';
import { LegalHoldInitiatorType } from '../../definitions/legal-hold.interface';
import { LegalHoldInitiator } from '../../definitions/legal-hold.constants';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'hxp-create-legal-hold-case-button',
    templateUrl: './create-legal-hold-case-button.component.html',
    styleUrl: './create-legal-hold-case-button.component.scss',
    imports: [MatButtonModule, MatTooltipModule, TranslatePipe, MatIconModule],
})
export class CreateLegalHoldCaseButtonComponent {
    @Input() clickedFrom!: LegalHoldInitiatorType;

    private createLegalHoldCaseButtonService = inject(CreateLegalHoldCaseButtonService);
    private parentDialogRef = inject(MatDialogRef<unknown>, { optional: true });

    get isAvailable(): boolean {
        return this.createLegalHoldCaseButtonService.isAvailable();
    }

    createLegalHoldCase() {
        if (this.clickedFrom === LegalHoldInitiator.Record && this.parentDialogRef) {
            this.parentDialogRef.close();
        }

        this.createLegalHoldCaseButtonService.execute(this.clickedFrom);
    }
}
