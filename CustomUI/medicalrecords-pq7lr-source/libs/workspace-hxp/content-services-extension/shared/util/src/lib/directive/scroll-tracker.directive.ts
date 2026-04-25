/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Directive, HostListener, Output, EventEmitter, Input } from '@angular/core';

@Directive({
    selector: '[hxpAppScrollTracker]',
})
export class ScrollTrackerDirective {
    @Input() scrollOffset = 50;
    @Output() scrolledToBottom = new EventEmitter<void>();

    @HostListener('scroll', ['$event'])
    onScroll(event: Event): void {
        const element = event.target as HTMLElement;
        const isScrolledToBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - this.scrollOffset;

        if (isScrolledToBottom) {
            this.scrolledToBottom.emit();
        }
    }
}
