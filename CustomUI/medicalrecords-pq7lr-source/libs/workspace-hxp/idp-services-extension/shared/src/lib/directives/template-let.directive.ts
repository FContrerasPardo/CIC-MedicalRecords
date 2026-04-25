/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Directive, inject, Input, TemplateRef, ViewContainerRef } from '@angular/core';

interface LetContext<T> {
    hylandIdpLet: T;
    $implicit: T;
}

@Directive({
    selector: '[hylandIdpLet]',
})
export class TemplateLetDirective<T> {
    private context: LetContext<T | undefined> = { hylandIdpLet: undefined, $implicit: undefined };
    private readonly viewContainer = inject(ViewContainerRef);
    private readonly templateRef = inject<TemplateRef<LetContext<T>>>(TemplateRef);

    constructor() {
        this.viewContainer.createEmbeddedView(this.templateRef, this.context);
    }

    @Input()
    set hylandIdpLet(value: T) {
        this.context.$implicit = this.context.hylandIdpLet = value;
    }

    static ngTemplateContextGuard<T>(_dir: TemplateLetDirective<T>, _ctx: unknown): _ctx is LetContext<T> {
        return true;
    }
}
