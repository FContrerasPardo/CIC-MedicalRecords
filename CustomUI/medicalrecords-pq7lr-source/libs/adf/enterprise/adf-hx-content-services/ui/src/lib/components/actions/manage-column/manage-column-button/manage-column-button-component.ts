/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ActionContext, HXP_MANAGE_COLUMN_ACTION_SERVICE } from '@alfresco/adf-hx-content-services/services';
import { NgIf } from '@angular/common';
import { Component, inject, Input, OnChanges } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'hxp-manage-column-button',
    templateUrl: './manage-column-button-component.html',
    imports: [NgIf, MatIconModule, MatButtonModule, MatTooltipModule, TranslatePipe],
})
export class ManageColumnButtonComponent implements OnChanges {
    @Input() actionContext: ActionContext = { documents: [] };
    @Input() isAvailable = false;

    private readonly manageColumnActionService = inject(HXP_MANAGE_COLUMN_ACTION_SERVICE);

    ngOnChanges(): void {
        this.isAvailable = this.manageColumnActionService.isAvailable(this.actionContext);
    }

    onCopy(): void {
        this.manageColumnActionService.execute(this.actionContext);
    }
}
