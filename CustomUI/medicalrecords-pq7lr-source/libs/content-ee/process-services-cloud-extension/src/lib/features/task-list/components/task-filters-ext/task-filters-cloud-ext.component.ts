/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { FilterParamsModel, TaskFilterCloudModel, TaskFiltersCloudComponent } from '@alfresco/adf-process-services-cloud';
import { Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { taskOrProcessFilterUpdate } from '../../../../store/actions/extension.actions';
import {
    navigateToTasks,
    setDefaultProcessManagementFilter,
    setProcessManagementFilter,
} from '../../../../store/actions/process-management-filter.actions';
import { selectApplicationName, selectProcessManagementFilter } from '../../../../store/selectors/extension.selectors';
import { FilterType } from '../../../../store/states/extension.state';
import { AsyncPipe } from '@angular/common';

@Component({
    imports: [TaskFiltersCloudComponent, AsyncPipe],
    selector: 'apa-task-filters-cloud-ext',
    templateUrl: './task-filters-cloud-ext.component.html',
})
export class TaskFiltersCloudExtComponent {
    private readonly store = inject(Store);

    appName$ = this.store.select(selectApplicationName);
    currentTaskFilter$ = this.store.select(selectProcessManagementFilter);
    defaultFilterAlreadySet = false;

    onTaskFilterClick(filter: TaskFilterCloudModel) {
        if (filter) {
            this.setProcessManagementFilter(filter);
            this.navigateToTasks(filter.id);
        }
    }

    onUpdatedFilter(updatedFilter: any): void {
        this.store.dispatch(taskOrProcessFilterUpdate({ filterKey: updatedFilter, canBeRefreshed: true }));
    }

    private setProcessManagementFilter(filter: TaskFilterCloudModel) {
        this.store.dispatch(
            setProcessManagementFilter({
                payload: {
                    type: FilterType.TASK,
                    filter,
                },
            })
        );
    }

    private navigateToTasks(filterId: string) {
        this.store.dispatch(
            navigateToTasks({
                filterId,
            })
        );
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
