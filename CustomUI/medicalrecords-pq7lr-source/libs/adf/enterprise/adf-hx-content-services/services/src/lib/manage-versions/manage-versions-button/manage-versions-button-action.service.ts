/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { ActionContext } from '../../context-menu-actions/actions/action-context.interface';
import { hasPermission, isVersionable } from '../../document/configs/document.utils';
import { DocumentActionService } from '../../context-menu-actions/actions/document-action.service';
import { DocumentPermissions } from '../../document/configs/document-permissions.enum';
import { SidebarService } from '../../sidebar/sidebar-service';

@Injectable({
    providedIn: 'root',
})
export class ManageVersionsButtonActionService extends DocumentActionService {
    private sidebarService = inject(SidebarService);

    public isAvailable(context: ActionContext): boolean {
        return (
            context.documents?.length === 1 &&
            isVersionable(context.documents[0]) &&
            hasPermission(context.documents[0], DocumentPermissions.READ_VERSION)
        );
    }

    public execute(): void {
        this.sidebarService.togglePanel('version');
    }
}
