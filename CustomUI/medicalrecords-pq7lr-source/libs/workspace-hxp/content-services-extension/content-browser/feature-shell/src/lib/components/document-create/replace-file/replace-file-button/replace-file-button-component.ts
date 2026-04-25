/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, Input, OnChanges, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ActionContext } from '@alfresco/adf-hx-content-services/services';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { ReplaceFileButtonComponentActionService } from './replace-file-button-component-action.service';
import { BetaChipTagComponent } from '@hxp/workspace-hxp/content-services-extension/shared/content-repository/ui';
import { MatButtonModule } from '@angular/material/button';
import { NgIf } from '@angular/common';

@Component({
    selector: 'hxp-replace-file-button',
    imports: [NgIf, MatButtonModule, MatIconModule, MatMenuModule, TranslatePipe, BetaChipTagComponent],
    templateUrl: './replace-file-button-component.html',
    styleUrls: ['./replace-file-button-component.scss'],
})
export class ReplaceFileButtonComponent implements OnChanges {
    private readonly replaceFileButtonActionService = inject(ReplaceFileButtonComponentActionService);

    @Input() isAvailable = false;
    @Input() data: ActionContext = { documents: [] };

    ngOnChanges(): void {
        this.isAvailable = this.replaceFileButtonActionService.isAvailable(this.data);
    }

    protected triggerFileSelection(): void {
        this.replaceFileButtonActionService.execute(this.data);
    }
}
