/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, Input, TemplateRef, ContentChild } from '@angular/core';

@Component({
    selector: 'hxp-data-column',
    template: '',
    imports: [],
})
export class DataColumnComponent {
    @Input() key!: string;
    @Input() title!: string;
    @Input() headerAriaLabel?: string;
    @Input() sortable = false;
    @Input() width?: string;
    @Input() disableClear = false;

    @ContentChild(TemplateRef) template!: TemplateRef<any>;
}
