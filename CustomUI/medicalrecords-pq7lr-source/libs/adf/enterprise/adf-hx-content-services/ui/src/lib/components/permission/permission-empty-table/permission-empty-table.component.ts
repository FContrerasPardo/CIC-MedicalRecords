/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'hxp-permissions-empty-table',
    imports: [CommonModule, TranslatePipe],
    templateUrl: './permission-empty-table.component.html',
    styleUrls: ['./permission-empty-table.component.scss'],
})
export class PermissionEmptyTableComponent {
    @Input()
    message = '';
}
