/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, inject, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { ActionContext, ManageVersionsButtonActionService } from '@alfresco/adf-hx-content-services/services';
import { BetaChipTagComponent } from '@hxp/workspace-hxp/content-services-extension/shared/content-repository/ui';

@Component({
    selector: 'hxp-manage-versions-button',
    imports: [CommonModule, TranslatePipe, MatIconModule, MatMenuModule, BetaChipTagComponent],
    templateUrl: './manage-versions-button.component.html',
    styleUrls: ['./manage-versions-button.component.scss'],
})
export class ManageVersionsButtonComponent implements OnChanges {
    @Input() data: ActionContext = { documents: [] };
    @Input() isAvailable = false;

    private readonly manageVersionsButtonActionService = inject(ManageVersionsButtonActionService);

    ngOnChanges(): void {
        this.isAvailable = this.manageVersionsButtonActionService.isAvailable(this.data);
    }

    openManageVersions() {
        this.manageVersionsButtonActionService.execute();
    }
}
