/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, computed, inject, input, output } from '@angular/core';
import { ActionContext, DocumentModelService } from '@alfresco/adf-hx-content-services/services';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { FeaturesServiceToken } from '@alfresco/adf-core/feature-flags';
import { toSignal } from '@angular/core/rxjs-interop';
import { ADF_HX_CONTENT_SERVICES_INTERNAL } from '@alfresco/adf-hx-content-services/features';
import { SYS_FILISH, SYS_FOLDERISH } from '@hxp/workspace-hxp/content-services-extension/shared/util';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'hxp-document-layout-toggle',
    imports: [MatIconModule, MatTooltipModule, TranslatePipe, MatButtonModule],
    templateUrl: './document-layout-toggle.component.html',
    styleUrl: './document-layout-toggle.component.scss',
})
export class DocumentLayoutToggleComponent {
    actionContext = input<ActionContext>({ documents: [] });
    isDocumentView = input<boolean>(false);
    toggleDocumentView = output<boolean>();

    protected readonly featuresService = inject(FeaturesServiceToken);
    protected readonly isDocumentLayoutFeatureFlagOn = toSignal(
        this.featuresService.isOn$(ADF_HX_CONTENT_SERVICES_INTERNAL.CIC_WORKSPACE_DOCUMENT_LAYOUT_TOGGLE)
    );

    private readonly documentModelService = inject(DocumentModelService);
    private readonly model = toSignal(this.documentModelService.getModel());

    protected tooltipText = computed(() =>
        this.isDocumentView()
            ? 'CONTENT_BROWSER.DOCUMENT.TOGGLE.FOLDER'
            : 'CONTENT_BROWSER.DOCUMENT.TOGGLE.FILE'
    );

    protected icon = computed(() => (this.isDocumentView() ? 'file_to_folder_toggle' : 'folder_to_file_toggle'));

    protected isToggleButtonVisible = computed(() => {
        const model = this.model();
        const actionContext = this.actionContext();
        if (!model || !actionContext) {
            return false;
        }

        const doc = this.isDocumentView() ? actionContext.documents?.[0] : actionContext.parentDocument;

        const primaryType = doc?.sys_primaryType;
        if (!doc || !primaryType) {
            return false;
        }
        const hasSysFilish = model.hasMixin(primaryType, SYS_FILISH);
        const hasSysFolderish = model.hasMixin(primaryType, SYS_FOLDERISH);

        return hasSysFilish && hasSysFolderish;
    });

    protected onToggleDocumentView() {
        this.toggleDocumentView.emit(this.isDocumentView());
    }
}
