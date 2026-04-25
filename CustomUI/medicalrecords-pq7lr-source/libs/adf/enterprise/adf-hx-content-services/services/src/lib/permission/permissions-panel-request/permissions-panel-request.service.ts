/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { SidebarService } from '../../sidebar/sidebar-service';

@Injectable({
    providedIn: 'root',
})
export class PermissionsPanelRequestService {
    private readonly sidebarService = inject(SidebarService);

    requestOpenPanel() {
        this.sidebarService.togglePanel('permission');
    }

    requestClosePanel() {
        this.sidebarService.closePanel();
    }
}
