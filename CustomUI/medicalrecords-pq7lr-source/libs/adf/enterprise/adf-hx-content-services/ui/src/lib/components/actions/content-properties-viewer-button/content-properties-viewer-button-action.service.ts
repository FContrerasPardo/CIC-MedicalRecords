/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ActionContext, DocumentActionService, DocumentPermissions, hasPermission, SidebarService } from '@alfresco/adf-hx-content-services/services';
import { inject, Injectable } from '@angular/core';

@Injectable()
export class ContentPropertyViewerActionService extends DocumentActionService {
    private readonly sidebarService = inject(SidebarService);

    isAvailable(context: ActionContext): boolean {
        return context.documents?.length === 1 && hasPermission(context.documents[0], DocumentPermissions.READ);
    }

    execute(): void {
        this.sidebarService.togglePanel('property');
    }
}
