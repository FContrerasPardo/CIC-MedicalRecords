/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { LogoutDirective } from '@alfresco/adf-core';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'hxp-logout',
    imports: [MatIconModule, MatMenuModule, TranslatePipe, LogoutDirective],
    template: `
        <button mat-menu-item adf-logout>
            <mat-icon svgIcon="exit_to_app" />
            <span>{{ 'APP.HEADER.SIGN_OUT' | translate }}</span>
        </button>
    `,
})
export class LogoutComponent {}
