/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ChangeDetectionStrategy, Component, ElementRef, Input, TemplateRef, ViewChild } from '@angular/core';
import { asapScheduler, Observable } from 'rxjs';
import { CommonModule, NgFor } from '@angular/common';
import { LayoutDirection, LayoutInfo } from '../../models/layout';
import { ViewerImageData } from '../../models/viewer-image-data';

@Component({
    imports: [NgFor, CommonModule],
    selector: 'hyland-idp-viewer-scrollable-view',
    templateUrl: './single-scrollable-view.component.html',
    styleUrls: ['./single-scrollable-view.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SingleScrollableViewComponent {
    @Input() imageTemplate!: TemplateRef<unknown>;
    @Input() displayImages$?: Observable<ViewerImageData[]>;
    @ViewChild('singleScrollableView', { static: true }) singleScrollableView?: ElementRef;

    @Input() set layoutInfo(value: LayoutInfo | undefined) {
        const container = this.singleScrollableView?.nativeElement as HTMLElement;
        if (container) {
            this.currentScaleFactor = value?.currentScaleFactor || 1;
            this.scrollDirection = value?.scrollDirection || LayoutDirection.Vertical;
            asapScheduler.schedule(() => {
                if (value?.scrollDirection === LayoutDirection.Vertical) {
                    container.scrollIntoView({ inline: 'center', block: 'nearest' });
                } else {
                    container.scrollIntoView({ inline: 'nearest', block: 'nearest' });
                }
            });
        }
    }

    currentScaleFactor = 1;
    scrollDirection: LayoutDirection = LayoutDirection.Vertical;
    readonly pageUniquenessFn = (i: number, image: ViewerImageData) => image?.pageId;
}
