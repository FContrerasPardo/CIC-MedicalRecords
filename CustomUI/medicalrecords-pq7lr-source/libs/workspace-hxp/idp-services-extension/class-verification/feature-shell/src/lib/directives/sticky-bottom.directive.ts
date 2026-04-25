/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Directive, ElementRef, AfterViewInit, Input, inject } from '@angular/core';

/**
 * @deprecated This directive is unused and will be removed in the future.
 */
@Directive({
    selector: '[hylandIdpStickyBottom]',
})
export class StickyBottomDirective implements AfterViewInit {
    @Input() stickToElement?: HTMLElement;

    private readonly elementRef = inject(ElementRef<HTMLElement>);
    private readonly stickyElement = this.elementRef.nativeElement;

    ngAfterViewInit() {
        const content = this.stickyElement.parentElement?.parentElement?.parentElement;
        content?.addEventListener('scroll', this.checkToolbarPosition.bind(this));
        document.addEventListener('DOMContentLoaded', this.checkToolbarPosition.bind(this));
    }

    private checkToolbarPosition() {
        const viewportHeight = window.innerHeight;
        if (!this.stickyElement || !this.stickToElement) {
            return;
        }

        if (this.stickToElement.getBoundingClientRect().bottom >= viewportHeight - this.stickyElement.offsetHeight - 20) {
            this.stickyElement.classList.remove('relative');
            this.stickyElement.classList.add('fixed');
            this.stickyElement.style.width = `${this.stickyElement.parentElement?.offsetWidth}px`;
        } else {
            this.stickyElement.classList.remove('fixed');
            this.stickyElement.classList.add('relative');
            this.stickyElement.style.width = `${this.stickyElement.parentElement?.offsetWidth}px`;
        }
    }
}
