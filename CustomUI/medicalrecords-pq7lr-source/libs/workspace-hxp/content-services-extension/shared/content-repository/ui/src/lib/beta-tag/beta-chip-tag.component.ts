/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';

@Component({
    selector: 'hxp-beta-chip-tag',
    templateUrl: './beta-chip-tag.component.html',
    styleUrls: ['./beta-chip-tag.component.scss'],
    imports: [MatChipsModule, CommonModule],
})
export class BetaChipTagComponent {}
