/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Directive, ElementRef, EventEmitter, Input, NgZone, OnInit, Output, OnChanges, SimpleChanges, DestroyRef, inject } from '@angular/core';

export function isIntersectionObserverSupported(): boolean {
    return typeof window !== 'undefined' && typeof IntersectionObserver !== 'undefined';
}

@Directive({
    selector: '[hylandIdpInViewport]',
})
export class InViewportDirective implements OnInit, OnChanges {
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly zone = inject(NgZone);

    @Input() options?: IntersectionObserverInit;
    @Output() idpInViewport = new EventEmitter<boolean>();

    private observer?: IntersectionObserver;
    private hasIntersected = false;
    private readonly destroyRef = inject(DestroyRef);

    constructor() {
        this.destroyRef.onDestroy(() => {
            this.observer?.disconnect();
            this.idpInViewport.complete();
        });
    }

    ngOnInit(): void {
        // Try to set up immediately; if options are undefined (e.g., ViewChild not ready), we'll set up again in ngOnChanges
        this.setupObserver();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('options' in changes) {
            // Recreate observer with latest options (notably the 'root') when provided later
            this.setupObserver(true);
        }
    }

    private setupObserver(forceRecreate = false): void {
        if (this.hasIntersected) {
            // Already intersected once; no need to observe again
            return;
        }
        if (!isIntersectionObserverSupported()) {
            // Fallback: consider always visible (no SSR here but safe default)
            this.idpInViewport.emit(true);
            this.hasIntersected = true;
            return;
        }

        // If we don't have options yet (e.g., root not ready), don't create with wrong defaults
        if (!this.options) {
            return;
        }

        if (forceRecreate) {
            this.observer?.disconnect();
            this.observer = undefined;
        }

        if (this.observer) {
            // Already observing with the correct options
            return;
        }

        const target = this.host.nativeElement;
        this.zone.runOutsideAngular(() => {
            this.observer = new IntersectionObserver((entries) => {
                const entry = entries[0];
                if (!entry) {
                    return;
                }
                // Honor configured threshold (number or array). Default to 0 when unspecified.
                const configured = this.options?.threshold;
                const requiredRatio = Array.isArray(configured)
                    ? (configured.length > 0
                        ? Math.max(...configured)
                        : 0)
                    : (typeof configured === 'number'
                    ? configured
                    : 0);

                if (entry.intersectionRatio >= requiredRatio) {
                    this.hasIntersected = true;
                    this.zone.run(() => this.idpInViewport.emit(true));
                    this.observer?.disconnect();
                }
            }, this.options);
            this.observer.observe(target);
        });
    }
}
