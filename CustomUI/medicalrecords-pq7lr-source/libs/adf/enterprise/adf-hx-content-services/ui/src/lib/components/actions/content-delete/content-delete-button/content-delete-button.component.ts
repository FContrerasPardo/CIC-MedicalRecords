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
    HXP_DOCUMENT_DELETE_ACTION_SERVICE,
    isPermissionError,
} from '@alfresco/adf-hx-content-services/services';
import { NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Component icon button that delete a `Document` file. Success or error action result status is notified to the user.
 *
 * To display the component:
 * - the `actionContext` input property must provide a list of `Document` to delete in the `documents` array;
 * - current logged in user must have `DELETE` permission on every `Document` in the list;
 * - current logged in user must have `DELETE_CHILD` permission on the parent `Document`.
 *
 * To use the `ContentDeleteButtonComponent`, import the component in your module
 *
 * ```ts
 * import { ContentDeleteButtonComponent } from '@alfresco/adf-hx-content-services/ui';
 *
 * @NgModule({
 *     imports: [
 *         ContentDeleteButtonComponent,
 *         ...
 *     ],
 * })
 * export class AppModule {}
 * ```
 *
 * Use it in your Angular template as shown in the example below:
 *
 * @example
 * <hxp-content-delete [actionContext]="actionContext"></hxp-content-delete>
 *
 */
@Component({
    selector: 'hxp-content-delete',
    templateUrl: './content-delete-button.component.html',
    imports: [NgIf, MatButtonModule, MatTooltipModule, MatIconModule, TranslatePipe],
})
export class ContentDeleteButtonComponent implements OnChanges {
    /**
     * Input property which specifies an `ActionContext` object
     * An `ActionContext` object that provides
     * - a list of documents to delete.
     * - the parent document.
     * - a flag to indicate if it should redirect to the parent document after deletion.
     * @type {ActionContext}
     *
     * @example
     * interface ActionContext {
     *     documents: Document[];
     *     parentDocument: Document;
     *     shouldRedirect: boolean (default: false);
     * }
     *
     */
    @Input() actionContext!: ActionContext;

    protected isAvailable = false;

    private readonly deleteButtonActionService = inject<DocumentActionService>(HXP_DOCUMENT_DELETE_ACTION_SERVICE);
    private readonly documentCache = inject(DocumentCacheService);

    ngOnChanges(): void {
        if (!this.actionContext.parentDocument && this.actionContext.documents.length > 0 && this.actionContext.documents[0].sys_parentId) {
            this.documentCache.getDocument(this.actionContext.documents[0].sys_parentId).subscribe({
                next: (doc) => {
                    this.actionContext.parentDocument = doc;
                    this.isAvailable = this.deleteButtonActionService.isAvailable(this.actionContext);
                },
                error: (error) => {
                    this.actionContext.parentDocument = undefined;
                    this.isAvailable = false;
                    if (!isPermissionError(error)) {
                        console.error(error);
                    }
                },
            });
        } else {
            this.isAvailable = this.deleteButtonActionService.isAvailable(this.actionContext);
        }
    }

    protected onDelete() {
        this.deleteButtonActionService.execute(this.actionContext);
    }
}
