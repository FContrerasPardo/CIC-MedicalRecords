/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, ElementRef, HostBinding, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';

@Component({
    selector: 'hyland-idp-thumbnail-viewer-list-item',
    imports: [CommonModule, MatListModule],
    template: '<mat-list-item><ng-content/></mat-list-item>',
})
export class IdpThumbnailViewerListItemComponent {
    @HostBinding('attr.role') role = 'list-item';
    @HostBinding('attr.tabindex') tabindex = 0;
    @Input() isSelected = false;

    private readonly element = inject(ElementRef);

    focus() {
        this.element.nativeElement.focus();
        this.scrollIntoView();
    }

    scrollIntoView() {
        this.element.nativeElement.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
    }
}
