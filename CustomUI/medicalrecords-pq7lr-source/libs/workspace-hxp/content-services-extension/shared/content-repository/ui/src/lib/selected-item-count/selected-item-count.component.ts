/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, inject, Input } from '@angular/core';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { DocumentService } from '@alfresco/adf-hx-content-services/services';
import { TranslatePipe } from '@ngx-translate/core';
import { NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'hxp-selected-item-count',
    templateUrl: './selected-item-count.component.html',
    styleUrls: ['./selected-item-count.component.scss'],
    imports: [NgIf, MatButtonModule, MatIconModule, TranslatePipe],
})
export class SelectedItemCountComponent {
    @Input() selectedItems: Document[] = [];

    private readonly documentService = inject(DocumentService);

    clearSelection() {
        this.documentService.clearSelectionDocumentList();
    }
}
