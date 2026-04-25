/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { CustomEmptyContentTemplateDirective, EmptyContentComponent } from '@alfresco/adf-core';
import { Component } from '@angular/core';

@Component({
    selector: 'hxp-search-no-results',
    templateUrl: './search-no-results.component.html',
    styleUrls: ['./search-no-results.component.scss'],
    imports: [EmptyContentComponent, CustomEmptyContentTemplateDirective],
})
export class SearchNoResultsComponent {}
