/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, Input, OnChanges, inject } from '@angular/core';
import {
    DocumentCacheService,
    ActionContext,
    DocumentActionService,
    HXP_DOCUMENT_COPY_ACTION_SERVICE,
    isPermissionError,
} from '@alfresco/adf-hx-content-services/services';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

@Component({
    selector: 'hxp-document-copy-button',
    imports: [CommonModule, TranslatePipe, MatIconModule, MatMenuModule],
    templateUrl: './document-copy-button-component.html',
})
export class DocumentCopyButtonComponent implements OnChanges {
    @Input() data: ActionContext = { documents: [] };
    @Input() isAvailable = false;

    private readonly copyButtonActionService = inject<DocumentActionService>(HXP_DOCUMENT_COPY_ACTION_SERVICE);
    private readonly documentCache = inject(DocumentCacheService);

    ngOnChanges(): void {
        if (!this.data.parentDocument && this.data.documents.length > 0 && this.data.documents[0].sys_parentId) {
            this.documentCache.getDocument(this.data.documents[0].sys_parentId).subscribe({
                next: (doc) => {
                    this.data.parentDocument = doc;
                    this.isAvailable = this.copyButtonActionService.isAvailable(this.data);
                },
                error: (error) => {
                    this.data.parentDocument = undefined;
                    this.isAvailable = false;
                    if (!isPermissionError(error)) {
                        console.error(error);
                    }
                },
            });
        } else {
            this.isAvailable = this.copyButtonActionService.isAvailable(this.data);
        }
    }

    onCopy(): void {
        this.copyButtonActionService.execute(this.data);
    }
}
