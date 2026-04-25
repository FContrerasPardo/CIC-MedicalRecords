/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ChangeClassListDialogComponent } from './change-class.dialog';

export interface ChangeClassListDialogData {
    currentClassId: string | undefined;
}

export function openChangeClassListDialog<R>(
    materialDialog: MatDialog,
    dialogData: ChangeClassListDialogData,
    onDialogClose: (selectedItem: R) => void,
    config?: MatDialogConfig
) {
    const dialogCfg = { ...(config || new MatDialogConfig()) };
    dialogCfg.restoreFocus = config?.restoreFocus ?? true;
    dialogCfg.data = dialogData;
    dialogCfg.width = config?.width ?? '30%';
    dialogCfg.height = config?.height ?? '65%';

    materialDialog
        .open(ChangeClassListDialogComponent, dialogCfg)
        .afterClosed()
        .subscribe((result) => {
            if (result) {
                onDialogClose(result);
            }
        });
}
