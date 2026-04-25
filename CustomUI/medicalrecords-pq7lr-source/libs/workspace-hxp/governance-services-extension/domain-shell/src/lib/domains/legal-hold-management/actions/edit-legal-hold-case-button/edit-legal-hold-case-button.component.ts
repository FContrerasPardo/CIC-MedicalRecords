/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, inject, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { LegalActionContext } from '../../definitions/legal-hold.interface';
import { EditLegalHoldCaseButtonService } from './edit-legal-hold-case-button.service';

@Component({
    selector: 'hxp-edit-legal-hold-case-button',
    imports: [MatButtonModule, MatIconModule, TranslatePipe, MatTooltipModule],
    templateUrl: './edit-legal-hold-case-button.component.html',
})
export class EditLegalHoldCaseButtonComponent {
    @Input() legalActionContext: LegalActionContext = { legalHoldCases: [] };

    private editLegalHoldCaseButtonService = inject(EditLegalHoldCaseButtonService);

    get isAvailable(): boolean {
        return this.editLegalHoldCaseButtonService.isAvailable(this.legalActionContext);
    }

    editLegalHoldCase() {
        this.editLegalHoldCaseButtonService.execute(this.legalActionContext);
    }
}
