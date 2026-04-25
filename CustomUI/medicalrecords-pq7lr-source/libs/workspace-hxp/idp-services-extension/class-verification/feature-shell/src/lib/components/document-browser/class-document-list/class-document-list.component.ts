/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { map } from 'rxjs/operators';
import { IdpKeyboardNavContextIdentifier } from '../../../services/document/idp-keyboard-navigation.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DocumentListDirective } from '../../../directives/document-list.directive';
import { DocumentListComponent } from '../document-list/document-list.component';
import { AsyncPipe } from '@angular/common';

@Component({
    selector: 'hyland-idp-class-document-list',
    templateUrl: './class-document-list.component.html',
    styleUrls: ['./class-document-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [AsyncPipe, DocumentListComponent],
})
export class ClassDocumentListComponent extends DocumentListDirective implements OnInit {
    @Input() classId!: string;
    @Input() previewMode = false;

    override ngOnInit(): void {
        this.classDropListId = `class-${this.classId}-drop-list`;
        this.dragDropService.addDropList(this.classDropListId);
        this.initDocuments();
        this.initSelectedDocumentsCount();
    }

    protected override afterViewInitProtected() {
        if (!this.previewMode) {
            this.keyboardNavigationService.registerContext({
                ...this.keyboardNavContext,
                items: this.items,
                itemType: 'document',
                keydownEvent$: this.keydownEvent$,
                clickEvent$: this.clickEvent$,
                canExpand: true,
                activateItemOnRegister: true,
                multiSelectAllowed: true,
            });
        }
    }

    protected override onDestroyProtected() {
        this.dragDropService.removeDropList(this.classDropListId);
        if (!this.previewMode) {
            this.keyboardNavigationService.unregisterContext(this.keyboardNavContext);
        }
    }

    protected override initDocuments(): void {
        this.documents$ = this.documentService.getDocumentsForClass(this.classId).pipe(
            takeUntilDestroyed(this.destroyRef),
            map((documents) => {
                return documents.map((document) => ({
                    ...document,
                    allPagesSelected: document.pages.every((page) => page.isSelected),
                }));
            })
        );
    }

    protected override initSelectedDocumentsCount(): void {
        this.selectedDocumentsCount$ = this.documentService.selectedDocuments$.pipe(
            takeUntilDestroyed(this.destroyRef),
            map((documents) => documents.length)
        );
    }

    override get keyboardNavContext(): IdpKeyboardNavContextIdentifier {
        return {
            contextId: this.classId,
            contextType: 'class',
        };
    }
}
