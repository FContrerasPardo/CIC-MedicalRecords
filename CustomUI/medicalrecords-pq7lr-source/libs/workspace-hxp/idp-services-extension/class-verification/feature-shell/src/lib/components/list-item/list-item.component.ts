/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { FocusableOption } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, ElementRef, HostBinding, inject, Input } from '@angular/core';
import { MatListModule } from '@angular/material/list';

@Component({
    selector: 'hyland-idp-list-item',
    styleUrls: ['./list-item.component.scss'],
    templateUrl: './list-item.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatListModule],
})
export class ListItemComponent implements FocusableOption {
    private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
    @HostBinding('attr.tabindex') tabindex = '-1';

    @Input() isSelected = false;
    @Input() id!: string;
    @Input() index!: number;
    @Input() disabled = false;

    focus() {
        this.elementRef.nativeElement.focus();
    }
}
