/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { applicationConfig, Meta, moduleMetadata } from '@storybook/angular';
import { documentWithAcl, getApplicationConfigProviders, moduleMetadataProviders } from '../../../configs/storybook/permissions-management.mock';
import { PermissionsManagementDialogComponent } from './permissions-management-dialog.component';

export default {
    title: 'Ui/Permissions Management/Dialog',
    component: PermissionsManagementDialogComponent,
    decorators: [
        applicationConfig({
            providers: getApplicationConfigProviders(documentWithAcl),
        }),
        moduleMetadata({
            providers: [
                {
                    provide: MAT_DIALOG_DATA,
                    useValue: {
                        document: documentWithAcl,
                    },
                },
                {
                    provide: MatDialogRef,
                    useValue: {
                        close: () => {},
                        updateSize: () => {},
                    },
                },
                ...moduleMetadataProviders,
            ],
        }),
    ],
} as Meta<PermissionsManagementDialogComponent>;

export const Dialog = {};
