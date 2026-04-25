/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { DOCUMENT } from '@angular/common';
import { DestroyRef, Directive, ElementRef, inject, NgZone, OnInit, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OverlayContainer } from '@angular/cdk/overlay';
import { filter, fromEvent, Subject } from 'rxjs';

/**
 * This directive is used to detect clicks outside the element.
 *
 * Example:
 * <div (hxpOutsideClick)="close()"></div>
 *
 */
@Directive({
    selector: '[hxpOutsideClick]',
})
export class HxpOutsideClickDirective implements OnInit {
    private readonly ngZone = inject(NgZone);
    private readonly elementRef = inject(ElementRef);
    private readonly overlayContainer = inject(OverlayContainer);
    private readonly documentClick$ = this.getClickOutsideSubject();
    private readonly destroyRef$ = inject(DestroyRef);

    readonly hxpOutsideClick = output<Event>();

    ngOnInit() {
        this.documentClick$
            .pipe(
                takeUntilDestroyed(this.destroyRef$),
                filter((event: Event) => !this.elementRef.nativeElement.contains(event.target) && !this.isInsideOverlay(event.target as HTMLElement))
            )
            .subscribe((event: Event) => {
                this.ngZone.run(() => this.hxpOutsideClick.emit(event));
            });
    }

    private getClickOutsideSubject() {
        const click$ = new Subject<Event>();
        const document = inject(DOCUMENT);

        this.ngZone.runOutsideAngular(() => {
            fromEvent(document, 'mousedown').pipe(takeUntilDestroyed(this.destroyRef$)).subscribe(click$);
        });

        return click$;
    }

    private isInsideOverlay(target: HTMLElement): boolean {
        return this.overlayContainer.getContainerElement().contains(target);
    }
}
