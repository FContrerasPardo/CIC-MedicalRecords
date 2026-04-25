/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ChangeDetectionStrategy, Component, Input, TemplateRef } from '@angular/core';
import { LayoutInfo } from '../../models/layout';
import { CommonModule, NgFor } from '@angular/common';
import { Observable } from 'rxjs';
import { ViewerImageData } from '../../models/viewer-image-data';

@Component({
    imports: [NgFor, CommonModule],
    selector: 'hyland-idp-viewer-grid-view',
    templateUrl: './grid-view.component.html',
    styleUrls: ['./grid-view.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GridViewComponent {
    @Input() layoutInfo?: LayoutInfo;
    @Input() imageTemplate!: TemplateRef<unknown>;
    @Input() displayImages$?: Observable<ViewerImageData[]>;

    readonly pageUniquenessFn = (i: number, image: ViewerImageData) => image?.pageId;
}
