/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ContentActionRef, DynamicExtensionComponent } from '@alfresco/adf-extensions';
import { Component, Input, OnInit, viewChild } from '@angular/core';
import { ActionContext } from '@alfresco/adf-hx-content-services/services';
import { NgSwitch, NgSwitchCase } from '@angular/common';

@Component({
    selector: 'hxp-document-more-menu-item',
    templateUrl: './document-more-menu-item.component.html',
    imports: [NgSwitch, NgSwitchCase, DynamicExtensionComponent],
})
export class DocumentMoreMenuItemComponent implements OnInit {
    @Input() item?: ContentActionRef;
    @Input() actionContext: ActionContext = { documents: [] };

    private dynamicComponent = viewChild<DynamicExtensionComponent>(DynamicExtensionComponent);

    protected appComponent!: string;

    get isAvailable(): boolean {
        return (this.dynamicComponent() as any)?.componentRef?.instance?.isAvailable === true;
    }

    ngOnInit() {
        this.appComponent = this.item?.component ?? '';
    }
}
