/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, ElementRef, EventEmitter, inject, Input, Output, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'hyland-idp-page-context-menu',
    templateUrl: './page-context-menu.component.html',
    styleUrls: ['./page-context-menu.component.scss'],
    imports: [MatButtonModule, MatMenuModule, TranslatePipe],
})
export class PageContextMenuComponent {
    @Input() canCut = false;
    @Input() canInsert = false;
    @Output() pagesCut = new EventEmitter();
    @Output() pagesInsertedAbove = new EventEmitter();
    @Output() pagesInsertedBelow = new EventEmitter();
    @Output() menuOpened = new EventEmitter();
    @Output() menuClosed = new EventEmitter();

    @ViewChild('ctxMenuTrigger')
    private readonly trigger!: MatMenuTrigger;

    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    position = { x: '0px', y: '0px' };

    onCutPages() {
        this.pagesCut.emit();
    }

    onInsertPagesAbove() {
        this.pagesInsertedAbove.emit();
    }

    onInsertPagesBelow() {
        this.pagesInsertedBelow.emit();
    }

    onMenuOpened() {
        this.menuOpened.emit();
    }

    onMenuClosed() {
        this.menuClosed.emit();
    }

    openContextMenu(): void {
        const el = this.host.nativeElement.parentElement ?? this.host.nativeElement;
        const rect = el.getBoundingClientRect();

        const clientX = rect.right - 10;
        const clientY = rect.top + rect.height / 2;

        this.openContextMenuAt(clientX, clientY);
    }

    openContextMenuAt(x: number, y: number): void {
        if (!this.canCut) {
            return;
        }

        this.position = { x: `${x}px`, y: `${y}px` };

        this.trigger.openMenu();
    }
}
