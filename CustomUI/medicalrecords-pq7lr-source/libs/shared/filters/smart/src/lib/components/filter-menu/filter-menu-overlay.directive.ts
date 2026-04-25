/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Directive, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CdkConnectedOverlay } from '@angular/cdk/overlay';

@Directive({
    selector: '[hxpFilterMenuOverlay]',
    hostDirectives: [
        {
            directive: CdkConnectedOverlay,
            inputs: ['cdkConnectedOverlayOrigin: overlayOrigin', 'cdkConnectedOverlayOpen: overlayOpen'],
        },
    ],
})
export class FilterMenuOverlayDirective implements OnInit {
    private cdkConnectedOverlay = inject(CdkConnectedOverlay);

    @Input() overlayOpen = false;
    @Input() overlayOrigin: any;
    @Input() overlayHasBackdrop = true;
    @Input() overlayBackdropClass = 'cdk-overlay-transparent-backdrop';

    @Output() detach = new EventEmitter<void>();

    ngOnInit() {
        this.cdkConnectedOverlay.hasBackdrop = this.overlayHasBackdrop;
        this.cdkConnectedOverlay.backdropClass = this.overlayBackdropClass;

        this.cdkConnectedOverlay.backdropClick.subscribe(() => {
            this.detach.emit();
        });
        this.cdkConnectedOverlay.detach.subscribe(() => {
            this.detach.emit();
        });
    }
}
