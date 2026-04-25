/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FolderIconComponent } from '@alfresco/adf-hx-content-services/icons';
import { GetFolderLabelPipe } from './get-folder-label/get-folder-label.pipe';
import { TranslatePipe } from '@ngx-translate/core';
import { BreadcrumbData, BreadcrumbEntry, BreadcrumbEntryTypes } from '../../services/breadcrumb-data.service';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'hxp-folder-breadcrumb',
    imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, FolderIconComponent, GetFolderLabelPipe, TranslatePipe],
    templateUrl: './folder-breadcrumb.component.html',
    styleUrls: ['./folder-breadcrumb.component.scss'],
})
export class FolderBreadcrumbComponent {
    @Input()
    breadcrumbData: BreadcrumbData | null = null;

    @Output()
    selectedFolder: EventEmitter<BreadcrumbEntry> = new EventEmitter<BreadcrumbEntry>();

    selectedTargetFolder?: Document;

    selectFolderBack(document?: Document) {
        this.navigateFolder(document, BreadcrumbEntryTypes.PARENT);
    }

    selectFolder(document?: Document) {
        this.navigateFolder(document, BreadcrumbEntryTypes.SELF);
    }

    // if there is no sys_id, we assume there are no folders with the same name under the same parent folder
    getFolderId(_: number, folder: Document) {
        return folder.sys_id || folder.sys_parentId + '_subfolder_' + folder.sys_name;
    }

    private navigateFolder(document?: Document, type?: BreadcrumbEntryTypes) {
        if (document && type) {
            this.selectedTargetFolder = document;
            this.breadcrumbData = null;
            const eventData: BreadcrumbEntry = { document, type };
            this.selectedFolder.emit(eventData);
        }
    }
}
