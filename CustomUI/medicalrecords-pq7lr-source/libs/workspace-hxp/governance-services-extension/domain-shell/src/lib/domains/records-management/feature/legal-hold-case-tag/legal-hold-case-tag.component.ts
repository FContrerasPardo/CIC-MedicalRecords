/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, Input, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GovernanceRecord } from '../../../../shared/definitions/governance-shared.interface';
import { LegalHoldCase } from '../../../legal-hold-management/definitions/legal-hold.interface';
import { GovernanceRecordService } from '../../services/governance-record.service';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'hxp-legal-hold-case-tag',
    imports: [MatIconModule, MatTooltipModule, TranslatePipe],
    templateUrl: './legal-hold-case-tag.component.html',
    styleUrl: './legal-hold-case-tag.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalHoldCaseTagComponent implements OnInit {
    @Input({ required: true }) record!: GovernanceRecord;
    loading = true;
    tags: LegalHoldCase[] = [];
    deleting: string[] = [];

    private recordService = inject(GovernanceRecordService);
    private cdr = inject(ChangeDetectorRef);

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading = true;
        const contentId = this.record?.contentID ?? null;
        const edsId = this.record?.environmentDataSourceId ?? null;

        if (!contentId || !edsId) {
            this.loading = false;
            this.cdr.detectChanges();
            return;
        }

        this.recordService.getLinkedLegalHoldCases(contentId, edsId).subscribe({
            next: (list) => {
                this.tags = list;
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.loading = false;
                this.cdr.detectChanges();
            },
        });
    }
}
