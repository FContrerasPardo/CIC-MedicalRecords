/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, inject, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ActionContext } from '../../../../shared/definitions/governance-shared.interface';
import { RecordDeleteButtonService } from './record-delete-button.service';
import { TranslatePipe } from '@ngx-translate/core';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
    selector: 'hxp-record-delete-button',
    templateUrl: './record-delete-button.component.html',
    styleUrl: './record-delete-button.component.scss',
    imports: [MatIconModule, MatButtonModule, TranslatePipe, MatTooltipModule],
})
export class RecordDeleteButtonComponent {
    @Input() actionContext!: ActionContext;

    private recordDeleteButtonService = inject(RecordDeleteButtonService);

    get isAvailable(): boolean {
        return this.recordDeleteButtonService.isAvailable(this.actionContext.records);
    }

    protected onDelete() {
        this.recordDeleteButtonService.execute(this.actionContext);
    }
}
