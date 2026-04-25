/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, inject, Input, OnChanges } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { TranslatePipe } from '@ngx-translate/core';
import { VersionRestoreActionService } from './version-restore-action.service';
import { type ActionContext } from '@alfresco/adf-hx-content-services/services';

@Component({
    selector: 'hxp-version-restore',
    imports: [MatButtonModule, MatMenuModule, MatIconModule, TranslatePipe],
    templateUrl: './version-restore.component.html',
})
export class VersionRestoreComponent implements OnChanges {
    @Input() isAvailable = false;
    @Input() data: ActionContext = { documents: [] };

    private versionRestoreService = inject(VersionRestoreActionService);

    ngOnChanges(): void {
        this.isAvailable = this.versionRestoreService.isAvailable(this.data);
    }

    protected restoreVersion(): void {
        this.versionRestoreService.execute(this.data);
    }
}
