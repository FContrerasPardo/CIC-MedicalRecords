/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { ToolbarMenuItemComponent } from '../menu-item/toolbar-menu-item.component';
import { ToolbarMenuItemsFactoryService } from '../services/menu-items-factory.service';

@Component({
    selector: 'hxp-more-menu',
    templateUrl: './toolbar-more-menu.component.html',
    encapsulation: ViewEncapsulation.None,
    imports: [CommonModule, MatButtonModule, MatIconModule, MatMenuModule, ToolbarMenuItemComponent],
})
export class ToolbarMoreMenuComponent {
    private readonly menuItemsFactoryService = inject(ToolbarMenuItemsFactoryService);

    moreMenu$ = this.menuItemsFactoryService.getMoreMenuItems();
}
