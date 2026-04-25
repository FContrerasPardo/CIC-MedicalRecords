/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, inject, Input, OnChanges, ViewEncapsulation } from '@angular/core';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';
import { hasPermission, DocumentPermissions } from '@alfresco/adf-hx-content-services/services';
import { HxPCreateFolderDialogComponent } from '../create-folder/folder-create-dialog/folder-create-dialog.component';
import { Observable } from 'rxjs';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { UploadFileButtonComponent } from '../upload/upload-button/upload-button.component';
import { ContentUploadDialogComponent } from '../upload/upload-dialog/upload-dialog.component';
import { AsyncPipe, NgIf } from '@angular/common';

@Component({
    selector: 'hxp-create-document-button',
    templateUrl: './create-document-button.component.html',
    encapsulation: ViewEncapsulation.None,
    styleUrls: [],
    host: { class: 'create-document-menu' },
    imports: [NgIf, AsyncPipe, MatIconModule, MatMenuModule, MatButtonModule, TranslatePipe, UploadFileButtonComponent, ContentUploadDialogComponent],
})
export class HxPCreateDocumentButtonComponent implements OnChanges {
    @Input()
    document: Document;

    protected selectedFolderId$: Observable<string>;
    protected isAvailable = false;

    private readonly dialog = inject(MatDialog);
    private readonly route = inject(ActivatedRoute);

    constructor() {
        this.selectedFolderId$ = this.route.url.pipe(map((urlSegments = []) => (urlSegments.length > 0 ? urlSegments[0].path : '')));
    }

    ngOnChanges(): void {
        if (this.document) {
            this.isAvailable = hasPermission(this.document, DocumentPermissions.CREATE_CHILD);
        }
    }

    onCreate(): void {
        this.dialog.open(HxPCreateFolderDialogComponent, { width: '550px', disableClose: true });
    }
}
