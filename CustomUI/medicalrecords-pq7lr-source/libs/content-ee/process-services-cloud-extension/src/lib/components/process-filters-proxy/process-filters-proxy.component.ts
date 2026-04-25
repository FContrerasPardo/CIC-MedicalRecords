/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, inject, OnInit } from '@angular/core';
import { AppConfigService } from '@alfresco/adf-core';
import { navigateToProcesses } from '../../store/actions/process-management-filter.actions';
import { Store } from '@ngrx/store';
import { take } from 'rxjs/operators';
import { ProcessFilterCloudService } from '@alfresco/adf-process-services-cloud';

@Component({
    template: '',
})
export class ProcessFiltersProxyComponent implements OnInit {
    private readonly processFilterCloudService = inject(ProcessFilterCloudService);
    private readonly appConfigService = inject(AppConfigService);
    private readonly store = inject(Store);

    ngOnInit() {
        this.navigateToFirstAvailableFilter();
    }

    private navigateToFirstAvailableFilter() {
        const appName = this.fetchAppName();
        this.processFilterCloudService
            .getProcessFilters(appName)
            .pipe(take(1))
            .subscribe((filters) => {
                const firstFilter = filters[0];
                if (firstFilter?.id) {
                    this.navigateToProcessFilter(firstFilter.id);
                }
            });
    }

    private fetchAppName(): string {
        return this.appConfigService.get('alfresco-deployed-apps')[0]?.name;
    }

    private navigateToProcessFilter(filterId: string) {
        this.store.dispatch(
            navigateToProcesses({
                filterId,
            })
        );
    }
}
