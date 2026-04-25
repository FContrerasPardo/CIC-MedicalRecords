/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { DestroyRef, Directive, inject, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { from, ObservableInput } from 'rxjs';

interface WaitForContext<T> {
    $implicit: T;
    hylandIdpWaitFor: T;
}

/**
 * The hylandIdpWaitFor directive makes waits for the first emission from a source Observable before instantiating its view.
 * This can be useful as an alternative to an async pipe, which resolves to undefined before its first emission.
 * @example
 * ```html
 * <!-- this shows the fallback content too early, before receiving the first emission -->
 * <ng-container *ngIf="formContext$ | async as formContext; else fallback">
 *   <!-- main content -->
 * </ng-container>
 *
 * <!-- better solution with the hylandIdpWaitFor directive -->
 * <ng-container *hylandIdpWaitFor="formContext$ as formContext">
 *   <ng-container *ngIf="formContext; else fallback">
 *     <!-- main content -->
 *   </ng-container>
 * </ng-container>
 *
 * <ng-template #fallback>
 *   <!-- fallback content -->
 * </ng-template>
 * ```
 */
@Directive({ selector: '[hylandIdpWaitFor]' })
export class WaitForDirective<T> {
    private readonly viewContainer = inject(ViewContainerRef);
    private readonly templateRef = inject<TemplateRef<WaitForContext<T>>>(TemplateRef);
    private readonly destroyRef = inject(DestroyRef);

    @Input('hylandIdpWaitFor')
    set waitForObservable(obs$: ObservableInput<T>) {
        from(obs$)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((value) => {
                const context = { $implicit: value, hylandIdpWaitFor: value };
                this.viewContainer.clear();
                this.viewContainer.createEmbeddedView(this.templateRef, context);
            });
    }

    // this enables type inference in templates
    static ngTemplateContextGuard<T>(dir: WaitForDirective<T>, ctx: any): ctx is WaitForContext<T> {
        return 'implicit$' in ctx && 'waitFor' in ctx;
    }
}
