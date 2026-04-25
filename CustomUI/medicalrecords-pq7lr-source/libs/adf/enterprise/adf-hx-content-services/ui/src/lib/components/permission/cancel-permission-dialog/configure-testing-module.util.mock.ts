/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PermissionsPanelRequestService } from '@alfresco/adf-hx-content-services/services';
import { DismissPermissionDialogData } from './cancel-permission-dialog.component';
import { NoopTranslateModule } from '@alfresco/adf-core';

const dialogMock = {
    close: () => {},
};

const permissionDialogMock = {
    close: jest.fn(),
};

export const mockDismissPermissionDialogDataWithoutRef: DismissPermissionDialogData = {
    dialogTitle: 'title',
    dialogDescription: 'description',
    dialogRejectButton: 'reject',
    dialogConfirmButton: 'confirm',
};

export const mockDismissPermissionDialogDataWithRef: DismissPermissionDialogData = {
    ...mockDismissPermissionDialogDataWithoutRef,
    permissionDialogRef: permissionDialogMock as unknown as MatDialogRef<any>,
};

export const configureTestingModule = (data: DismissPermissionDialogData) => {
    TestBed.configureTestingModule({
        imports: [NoopTranslateModule, NoopAnimationsModule, MatDialogModule],
        providers: [{ provide: MatDialogRef, useValue: dialogMock }, { provide: MAT_DIALOG_DATA, useValue: data }, PermissionsPanelRequestService],
    });
};
