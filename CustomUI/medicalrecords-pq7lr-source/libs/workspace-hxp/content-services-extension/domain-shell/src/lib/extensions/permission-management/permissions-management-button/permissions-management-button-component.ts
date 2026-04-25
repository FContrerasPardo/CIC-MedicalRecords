/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ActionContext, DocumentActionService, HXP_DOCUMENT_PERMISSIONS_ACTION_SERVICE } from '@alfresco/adf-hx-content-services/services';
import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnChanges } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'hxp-permissions-management-button',
    templateUrl: './permissions-management-button-component.html',
    imports: [MatIconModule, MatMenuModule, TranslatePipe, CommonModule],
})
export class PermissionsManagementButtonComponent implements OnChanges {
    @Input() data: ActionContext = { documents: [] };
    @Input() isAvailable = false;

    private readonly permissionsButtonActionService = inject<DocumentActionService>(HXP_DOCUMENT_PERMISSIONS_ACTION_SERVICE);

    ngOnChanges(): void {
        this.isAvailable = this.permissionsButtonActionService.isAvailable(this.data);
    }

    openPermissionsManagement() {
        this.permissionsButtonActionService.execute(this.data);
    }
}
