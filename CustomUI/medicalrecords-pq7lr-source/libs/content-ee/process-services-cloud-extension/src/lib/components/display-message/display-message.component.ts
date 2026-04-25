/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, inject, SecurityContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, Title } from '@angular/platform-browser';
import edjsHTML from 'editorjs-html';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'apa-display-message',
    imports: [CommonModule],
    templateUrl: './display-message.component.html',
    styleUrls: ['./display-message.component.scss'],
})
export class DisplayMessageComponent {
    private static readonly CUSTOM_PARSER = {
        header: (block: any): string => {
            const paragraphAlign = block.data.alignment || block.data.align || block.tunes?.anyTuneName?.alignment;
            return paragraphAlign !== undefined && ['left', 'right', 'center'].includes(paragraphAlign)
                ? `<h${block.data.level} class="ce-tune-alignment--${paragraphAlign}">${block.data.text}</h${block.data.level}>`
                : `<h${block.data.level}>${block.data.text}</h${block.data.level}>`;
        },
        paragraph: (block: any): string => {
            const paragraphAlign = block.data.alignment || block.data.align || block.tunes?.anyTuneName?.alignment;

            return paragraphAlign !== undefined && ['left', 'right', 'center', 'justify'].includes(paragraphAlign)
                ? `<p class="ce-tune-alignment--${paragraphAlign}">${block.data.text}</p>`
                : `<p>${block.data.text}</p>`;
        },
    };

    parsedHTML$: Observable<string> = null;

    private readonly route = inject(ActivatedRoute);
    private readonly sanitizer = inject(DomSanitizer);
    private readonly titleService = inject(Title);

    constructor() {
        this.parsedHTML$ = this.route.paramMap.pipe(
            map(() => window.history.state),
            map(({ message }) => {
                let parsedHTML: string;
                if (message) {
                    try {
                        const receivedMessage = JSON.parse(message);
                        const richText = receivedMessage?.message ?? receivedMessage;

                        let parsedText: string;
                        try {
                            parsedText = edjsHTML(DisplayMessageComponent.CUSTOM_PARSER, { strict: true }).parse(richText);
                        } catch (error) {
                            console.error('Error parsing rich text', error);
                        }
                        parsedHTML = this.sanitizeHtmlContent(parsedText);

                        if (receivedMessage?.title) {
                            this.titleService.setTitle(receivedMessage.title);
                        }
                    } catch (error) {
                        console.error('Error parsing message to display', error);
                    }
                }
                return parsedHTML;
            }),
            takeUntilDestroyed()
        );
    }

    private sanitizeHtmlContent(content: string): string {
        return this.sanitizer.sanitize(SecurityContext.HTML, content);
    }
}
