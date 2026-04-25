/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CreateLegalHoldCaseComponent } from '../../dialogs/create-legal-hold-case/create-legal-hold-case.component';
import { DialogConfig } from '@alfresco/adf-hx-content-services/ui';
import { LegalHoldCaseDialogData, LegalHoldInitiatorType } from '../../definitions/legal-hold.interface';
@Injectable({
    providedIn: 'root',
})
export class CreateLegalHoldCaseButtonService {
    private dialog = inject(MatDialog);

    isAvailable(): boolean {
        return true;
    }

    execute(clickedFrom: LegalHoldInitiatorType): void {
        this.dialog.open<CreateLegalHoldCaseComponent, LegalHoldCaseDialogData>(CreateLegalHoldCaseComponent, {
            width: DialogConfig.small.width,
            data: {
                clickedFrom: clickedFrom,
            },
        });
    }
}
