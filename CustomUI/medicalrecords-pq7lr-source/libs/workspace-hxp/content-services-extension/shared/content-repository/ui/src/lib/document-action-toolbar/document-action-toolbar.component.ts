/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, input, signal, computed, viewChildren, afterRenderEffect, inject } from '@angular/core';
import { ActionContext, DocumentMoreMenuItemsFactoryService } from '@alfresco/adf-hx-content-services/services';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { SelectedItemCountComponent } from '../selected-item-count/selected-item-count.component';
import {
    ContentDeleteButtonComponent,
    ContentPropertiesViewerButtonComponent,
    ContentShareButtonComponent,
    DocumentMoreActionComponent,
    ManageColumnButtonComponent,
    SingleItemDownloadButtonComponent,
} from '@alfresco/adf-hx-content-services/ui';
import { AsyncPipe } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
    selector: 'hxp-document-action-toolbar',
    templateUrl: './document-action-toolbar.component.html',
    styleUrls: ['./document-action-toolbar.component.scss'],
    imports: [
        AsyncPipe,
        SelectedItemCountComponent,
        ContentPropertiesViewerButtonComponent,
        ContentDeleteButtonComponent,
        SingleItemDownloadButtonComponent,
        ContentShareButtonComponent,
        ManageColumnButtonComponent,
        DocumentMoreActionComponent,
        MatToolbarModule,
    ],
})
export class DocumentActionToolbarComponent {
    private readonly menuItemsFactoryService = inject(DocumentMoreMenuItemsFactoryService);

    actionContext = input<ActionContext>();
    selection = input<Document[]>([]);

    actionButtons = viewChildren<{ isAvailable: boolean }>('actionButton');

    moreMenu$ = this.menuItemsFactoryService.getMoreMenuItems();
    hasVisibleActions = signal(false);

    actionContextWithSelection = computed(() => ({
        ...this.actionContext(),
        documents: this.selection(),
    }));

    constructor() {
        afterRenderEffect(() => {
            const buttons = this.actionButtons();
            this.actionContext();
            this.selection();

            const hasVisible = buttons.some((button) => button?.isAvailable);
            this.hasVisibleActions.set(hasVisible);
        });
    }
}
