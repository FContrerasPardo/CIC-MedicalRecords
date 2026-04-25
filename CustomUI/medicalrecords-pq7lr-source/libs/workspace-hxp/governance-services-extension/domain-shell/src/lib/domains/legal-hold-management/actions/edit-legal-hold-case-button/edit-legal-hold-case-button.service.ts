/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { LegalActionContext, LegalHoldCaseDialogData } from '../../definitions/legal-hold.interface';
import { LegalHoldInitiator } from '../../definitions/legal-hold.constants';
import { MatDialog } from '@angular/material/dialog';
import { DialogConfig } from '@alfresco/adf-hx-content-services/ui';
import { CreateLegalHoldCaseComponent } from '../../dialogs/create-legal-hold-case/create-legal-hold-case.component';

@Injectable({
    providedIn: 'root',
})
export class EditLegalHoldCaseButtonService {
    private dialog = inject(MatDialog);

    isAvailable(context: LegalActionContext): boolean {
        return context?.legalHoldCases.length === 1;
    }

    execute(context: LegalActionContext): void {
        this.dialog.open<CreateLegalHoldCaseComponent, LegalHoldCaseDialogData>(CreateLegalHoldCaseComponent, {
            width: DialogConfig.small.width,
            data: {
                clickedFrom: LegalHoldInitiator.Legal,
                legalHoldCases: context.legalHoldCases,
            },
        });
    }
}
