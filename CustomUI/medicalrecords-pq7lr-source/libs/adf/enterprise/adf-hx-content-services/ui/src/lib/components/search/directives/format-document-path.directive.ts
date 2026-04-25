/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Directive, ElementRef, AfterViewInit, Input, SimpleChanges, OnChanges, Renderer2, inject } from '@angular/core';

@Directive({
    selector: '[hxpFormatDocumentPath]',
})
export class FormatDocumentPathDirective implements OnChanges, AfterViewInit {
    @Input('hxpFormatDocumentPath')
    columnWidths!: { [key: string]: number };
    private originalText: string | null = null;

    private readonly el = inject(ElementRef);
    private readonly renderer = inject(Renderer2);

    ngOnChanges(changes: SimpleChanges) {
        if (changes['columnWidths']) {
            this.truncatePath();
        }
    }

    ngAfterViewInit() {
        this.originalText = this.el.nativeElement.textContent;
        this.truncatePath();
    }

    private truncatePath() {
        if (!this.originalText) {
            return;
        }

        const element = this.el.nativeElement;
        const parentElement = element.parentNode as HTMLElement;
        this.renderer.setProperty(element, 'innerText', this.originalText);

        const parentWidth = parentElement.offsetWidth;
        const textWidth = element.offsetWidth;
        const parts = this.originalText.split('/');

        if (textWidth > parentWidth && parts.length > 2) {
            this.renderer.setProperty(element, 'innerText', `${parts[0]}/.../${parts.at(-1)}`);
        } else {
            this.renderer.setProperty(element, 'innerText', this.originalText);
        }
    }
}
