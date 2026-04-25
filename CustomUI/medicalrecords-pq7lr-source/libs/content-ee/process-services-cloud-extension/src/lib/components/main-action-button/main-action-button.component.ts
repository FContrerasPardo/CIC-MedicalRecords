/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ContentActionRef, ExtensionService } from '@alfresco/adf-extensions';
import { Component, inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { TranslatePipe } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { ExtensionActionsHandler } from '../../services/extensions-actions-handler.service';

@Component({
    imports: [CommonModule, TranslatePipe, MatButtonModule],
    selector: 'app-main-action-button',
    templateUrl: './main-action-button.component.html',
    styleUrls: ['./main-action-button.component.scss'],
})
export class MainActionButtonComponent {
    private readonly extensionService = inject(ExtensionService);
    private readonly extensionActionsHandler = inject(ExtensionActionsHandler);
    mainAction$ = this.extensionService.setup$.pipe(map(() => this.extensionService.getFeature<ContentActionRef>('mainAction')));

    runAction(actionId: string): void {
        this.extensionActionsHandler.runActionById(actionId);
    }
}
