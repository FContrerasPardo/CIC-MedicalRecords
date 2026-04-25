/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { FilterParamsModel, TaskFilterCloudModel, TaskFiltersCloudComponent } from '@alfresco/adf-process-services-cloud';
import { Component, inject, Input } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { TASKS_ROUTE } from '../../constants/extensions.const';
import { setDefaultProcessManagementFilter, taskOrProcessFilterUpdate } from '../../store/process-service-cloud.actions';
import { FilterType } from '../../store/process-service-cloud.state';

@Component({
    imports: [TaskFiltersCloudComponent],
    selector: 'hxp-sidenav-task-list',
    templateUrl: './sidenav-task-list.component.html',
})
export class SidenavTaskListComponent {
    private readonly router = inject(Router);
    private readonly store = inject(Store);

    @Input() appName = '';
    @Input() currentFilter: FilterParamsModel = {};

    defaultFilterAlreadySet = false;

    onTaskFilterClick(filter: TaskFilterCloudModel) {
        if (!filter.id) {
            return;
        }
        void this.router.navigate([TASKS_ROUTE], {
            queryParams: {
                filterId: filter.id,
            },
        });
    }

    onUpdatedFilter(updatedFilter: any): void {
        this.store.dispatch(taskOrProcessFilterUpdate({ filterKey: updatedFilter, canBeRefreshed: true }));
    }

    onFiltersLoadedSuccess(filters: TaskFilterCloudModel[]) {
        if (!this.defaultFilterAlreadySet) {
            const defaultFilter = filters.find((item) => item?.key === 'my-tasks');
            if (defaultFilter) {
                this.store.dispatch(
                    setDefaultProcessManagementFilter({
                        payload: {
                            type: FilterType.TASK,
                            filter: defaultFilter as FilterParamsModel,
                        },
                    })
                );
                this.defaultFilterAlreadySet = true;
            }
        }
    }
}
