/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { CommonModule } from '@angular/common';
import { AfterContentInit, ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
    imports: [CommonModule],
    selector: 'hyland-idp-viewer-sticky-action',
    templateUrl: './sticky-action.component.html',
    styleUrls: ['./sticky-action.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterStickyActionComponent implements AfterContentInit {
    @Input() align: 'left' | 'center' | 'right' = 'right';

    ngAfterContentInit(): void {
        this.align = this.align || 'right';
    }
}
