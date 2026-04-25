/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, inject, Input, OnChanges } from '@angular/core';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { CommonModule } from '@angular/common';
import { DefaultIcon, MimeType, MimeTypeIconComponent } from '@alfresco/adf-hx-content-services/icons';
import { hasBlob, isFolder } from '@alfresco/adf-hx-content-services/services';
import { FeaturesServiceToken } from '@alfresco/adf-core/feature-flags';
import { toSignal } from '@angular/core/rxjs-interop';
import { ADF_HX_CONTENT_SERVICES_INTERNAL } from '@alfresco/adf-hx-content-services/features';

/**
 * Component that display the content type icon of a given `Document`.
 *
 * To use the `ContentTypeIconComponent`, you need first to import the component in your module
 *
 * ```ts
 * import { ContentTypeIconComponent } from '@alfresco/adf-hx-content-services/ui';
 *
 * @NgModule({
 *     imports: [
 *         ContentTypeIconComponent
 *         ...
 *     ],
 *    [...]
 * })
 *
 * export class AppModule {}
 *
 * ```
 *
 * Then use it in your Angular template as shown in the example below:
 *
 * @example
 *   <hxp-document-type-icon [document]="document" [isExpanded]="isExpanded"></hxp-document-type-icon>
 */

@Component({
    selector: 'hxp-document-type-icon',
    templateUrl: './document-type-icon.component.html',
    imports: [CommonModule, MimeTypeIconComponent],
})
export class ContentTypeIconComponent implements OnChanges {
    /**
     * The document for which the icon will be displayed.
     * @type {Document}
     */
    @Input()
    document?: Document;

    /**
     * Toggles between expanded and collapsed for folder type documents only.
     * If the document is not a folder, this property is ignored.
     * @type {boolean}
     * @default false
     */
    @Input()
    isExpanded = false;

    protected documentIconType: DefaultIcon | MimeType = DefaultIcon.UNKNOWN;

    protected readonly featuresService = inject(FeaturesServiceToken);
    protected readonly isDocumentLayoutFeatureFlagOn = toSignal(
        this.featuresService.isOn$(ADF_HX_CONTENT_SERVICES_INTERNAL.CIC_WORKSPACE_DOCUMENT_LAYOUT_TOGGLE)
    );

    /**
     * The mime type of the `Document`.
     * @type {string}
     * @readonly
     */
    get mimeType(): DefaultIcon | MimeType {
        return this.documentIconType;
    }

    ngOnChanges(): void {
        this.checkDocumentIconType();
    }

    private checkDocumentIconType(): void {
        this.documentIconType = DefaultIcon.UNKNOWN;
        if (!this.document) {
            return;
        }

        this.getDocumentIcon();
    }

    private getDocumentIcon() {
        if (!this.document) {
            return;
        }
        if (this.isDocumentLayoutFeatureFlagOn()) {
            if (hasBlob(this.document)) {
                this.documentIconType = this.document['sysfile_blob'].mimeType;
            } else if (isFolder(this.document)) {
                this.documentIconType = this.getFolderIcon(this.isExpanded);
            }
        } else {
            if (isFolder(this.document)) {
                this.documentIconType = this.getFolderIcon(this.isExpanded);
            } else if (hasBlob(this.document)) {
                this.documentIconType = this.document['sysfile_blob'].mimeType;
            }
        }
    }

    private getFolderIcon(isExpanded: boolean): DefaultIcon {
        return isExpanded ? DefaultIcon.OPEN_FOLDER : DefaultIcon.FOLDER;
    }
}
