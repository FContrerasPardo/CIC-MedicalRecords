/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, HostListener, inject, ViewEncapsulation } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { DocumentModel, DocumentService, HxpNotificationService } from '@alfresco/adf-hx-content-services/services';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { Observable } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import { CancelFolderDialogComponent } from '../cancel-dialog/cancel-folder-dialog.component';
import { TranslatePipe } from '@ngx-translate/core';
import { AsyncPipe } from '@angular/common';
import { DocumentLocationPickerComponent } from '../../../document-location-picker/document-location-picker.component';
import { MatInputModule } from '@angular/material/input';
import { DocumentCategoryPickerComponent } from '../../../document-category-picker/document-category-picker.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FeaturesServiceToken } from '@alfresco/adf-core/feature-flags';
import { toSignal } from '@angular/core/rxjs-interop';
import { ADF_HX_CONTENT_SERVICES_INTERNAL } from '@alfresco/adf-hx-content-services/features';

@Component({
    selector: 'hxp-folder-create-dialog',
    templateUrl: './folder-create-dialog.component.html',
    styleUrls: ['./folder-create-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
    imports: [
        AsyncPipe,
        MatIconModule,
        MatInputModule,
        MatButtonModule,
        TranslatePipe,
        MatDialogModule,
        ReactiveFormsModule,
        DocumentLocationPickerComponent,
        DocumentCategoryPickerComponent,
    ],
})
export class HxPCreateFolderDialogComponent {
    public readonly dialogRef = inject(MatDialogRef<HxPCreateFolderDialogComponent>);
    private readonly fb = inject(FormBuilder);
    private readonly documentService = inject(DocumentService);
    private readonly hxpNotificationService = inject(HxpNotificationService);
    private readonly dialog = inject(MatDialog);

    selectedLocation: Document;
    selectedDocumentCategory: string;
    isCategorySelected = false;
    readonly createDocumentForm = this.fb.group({
        sys_title: ['', Validators.required],
    });

    protected parentDocument$: Observable<Document>;

    protected readonly featuresService = inject(FeaturesServiceToken);
    protected readonly isDocumentLayoutFeatureFlagOn = toSignal(
        this.featuresService.isOn$(ADF_HX_CONTENT_SERVICES_INTERNAL.CIC_WORKSPACE_DOCUMENT_LAYOUT_TOGGLE)
    );

    private readonly EXCLUDED_DOCUMENT_CATEGORIES = ['SysOrderedFolder', 'SysRenditionsContainer', 'SysVocabulary'];

    constructor() {
        this.parentDocument$ = this.documentService.documentLoaded$;
        this.parentDocument$.subscribe({
            next: (document) => {
                this.selectedLocation = document;
                this.selectedDocumentCategory = document.sys_primaryType;
                this.isCategorySelected = true;
            },
        });
    }

    @HostListener('document:keydown', ['$event'])
    onKeyDown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            this.onCancel();
        }
    }

    filterFolderDocumentCategories = (documentCategory: string, documentModel: DocumentModel) =>
        !this.EXCLUDED_DOCUMENT_CATEGORIES.includes(documentCategory) &&
        documentModel.hasMixin(documentCategory, 'SysFolderish') &&
        (!this.isDocumentLayoutFeatureFlagOn() || !documentModel.hasMixin(documentCategory, 'SysFilish'));

    onCreateDocument() {
        this.parentDocument$
            .pipe(
                take(1),
                switchMap(() =>
                    this.documentService.createDocument({
                        ...this.createDocumentForm.value,
                        sys_primaryType: this.selectedDocumentCategory,
                        sys_parentId: this.selectedLocation.sys_id,
                    })
                )
            )
            .subscribe({
                next: () => {
                    this.hxpNotificationService.showSuccess('CREATE.DIALOG.SUCCESS');
                },
                error: () => this.hxpNotificationService.showError('CREATE.DIALOG.ERROR'),
            });
    }

    onCancel() {
        this.dialog.open(CancelFolderDialogComponent, {
            width: '500px',
            data: this.dialogRef,
        });
    }

    onDocumentLocationSelected(document: Document) {
        this.selectedLocation = document;
        this.resetEditorValidation();
        this.markEditorAsDirty();
    }

    protected onDocumentCategorySelected(documentCategory: string) {
        if (documentCategory) {
            this.selectedDocumentCategory = documentCategory;
            this.resetEditorValidation();
            this.isCategorySelected = true;
        } else {
            this.isCategorySelected = false;
            this.selectedDocumentCategory = undefined;
            this.markEditorAsInvalid();
        }

        this.markEditorAsDirty();
    }

    private resetEditorValidation(): void {
        this.createDocumentForm.setErrors(null);
    }

    private markEditorAsDirty(): void {
        this.createDocumentForm.markAsDirty();
    }

    private markEditorAsInvalid(): void {
        this.createDocumentForm.setErrors({ invalid: true });
    }
}
