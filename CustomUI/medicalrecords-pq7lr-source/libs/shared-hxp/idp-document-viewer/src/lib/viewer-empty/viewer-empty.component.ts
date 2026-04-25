/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
@Component({
    imports: [NgIf, TranslatePipe],
    selector: 'hyland-idp-viewer-empty',
    templateUrl: 'viewer-empty.component.html',
    styleUrls: ['./viewer-empty.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyComponent {}
