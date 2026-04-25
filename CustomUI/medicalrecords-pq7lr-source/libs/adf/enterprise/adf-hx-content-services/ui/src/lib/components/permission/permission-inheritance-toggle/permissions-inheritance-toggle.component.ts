/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'hxp-permissions-inheritance-toggle',
    imports: [CommonModule, MatSlideToggleModule, TranslatePipe],
    templateUrl: './permissions-inheritance-toggle.component.html',
    styleUrls: ['./permissions-inheritance-toggle.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class PermissionInheritanceToggleComponent {
    @Input() isInheritanceEnabled: boolean | null = true;
    @Output() toggleChange = new EventEmitter<boolean>();

    onToggleChange(isEnabled: boolean): void {
        this.toggleChange.emit(isEnabled);
    }
}
