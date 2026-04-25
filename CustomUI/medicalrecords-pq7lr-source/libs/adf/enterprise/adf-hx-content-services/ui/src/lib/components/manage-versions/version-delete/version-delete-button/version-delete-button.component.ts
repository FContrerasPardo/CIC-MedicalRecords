/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ActionContext, HXP_DOCUMENT_VERSION_DELETE_ACTION_SERVICE } from '@alfresco/adf-hx-content-services/services';
import { Component, inject, Input, OnChanges } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'hxp-version-delete-button',
    imports: [MatButtonModule, MatTooltipModule, MatIconModule, TranslatePipe],
    templateUrl: './version-delete-button.component.html',
})
export class VersionDeleteButtonComponent implements OnChanges {
    @Input() actionContext!: ActionContext;
    protected isAvailable = false;

    private readonly versionDeleteActionService = inject(HXP_DOCUMENT_VERSION_DELETE_ACTION_SERVICE);

    ngOnChanges(): void {
        this.isAvailable = this.versionDeleteActionService.isAvailable(this.actionContext);
    }

    protected onDelete() {
        this.versionDeleteActionService.execute(this.actionContext);
    }
}
