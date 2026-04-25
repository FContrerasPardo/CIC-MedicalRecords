/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Directive, HostListener } from '@angular/core';

@Directive({
    selector: '[hxpToggleIcon]',
    exportAs: 'toggleIcon',
})
export class ToggleIconDirective {
    private isFocus = false;
    private toggle = false;

    get isToggled(): boolean {
        return this.toggle;
    }

    get isFocused(): boolean {
        return this.isFocus;
    }

    @HostListener('mouseenter') onMouseEnter() {
        if (!this.isFocus) {
            this.toggle = true;
        }
    }

    @HostListener('mouseleave') onMouseLeave() {
        if (!this.isFocus) {
            this.toggle = false;
        }

        if (this.isFocus && this.toggle) {
            this.isFocus = false;
            this.toggle = false;
        }
    }

    @HostListener('focus') onFocus() {
        this.isFocus = true;
        this.toggle = true;
    }

    @HostListener('blur') onBlur() {
        this.isFocus = false;
        this.toggle = false;
    }
}
