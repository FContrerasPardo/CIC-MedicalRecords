/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { WidgetComponent } from '@alfresco/adf-core';
import { NgTemplateOutlet } from '@angular/common';
import { Component, TemplateRef } from '@angular/core';
import { SatTagModule } from '@hylandsoftware/satori-ui/tag';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { StatusResult } from './models/status-result';

@Component({
    selector: 'hxp-table-reference-widget',
    templateUrl: './table-reference.widget.html',
    styleUrls: ['./table-reference.widget.scss'],
    imports: [MatIconModule, SatTagModule, TranslatePipe, NgTemplateOutlet],
})
export class TableReferenceWidgetComponent extends WidgetComponent {
    readonly StatusResult = StatusResult;

    get customTemplate(): TemplateRef<any> {
        return this.field?.json?.customTemplate;
    }
}
