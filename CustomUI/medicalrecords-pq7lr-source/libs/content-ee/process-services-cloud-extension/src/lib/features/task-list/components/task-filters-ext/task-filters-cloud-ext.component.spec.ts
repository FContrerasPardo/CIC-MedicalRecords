/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { TaskFiltersCloudExtComponent } from './task-filters-cloud-ext.component';
import { selectApplicationName, selectProcessManagementFilter } from '../../../../store/selectors/extension.selectors';
import { fakeTaskFilter } from '../../mock/task-filter.mock';
import { FilterType } from '../../../../store/states/extension.state';
import { NoopAuthModule, NoopTranslateModule } from '@alfresco/adf-core';
import { ProcessServicesCloudModule, TaskFilterCloudModel } from '@alfresco/adf-process-services-cloud';
import { Apollo } from 'apollo-angular';
import { MatIconTestingModule } from '@angular/material/icon/testing';

describe('TaskFiltersCloudExtComponent', () => {
    let component: TaskFiltersCloudExtComponent;
    let fixture: ComponentFixture<TaskFiltersCloudExtComponent>;
    let store: Store<any>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [ProcessServicesCloudModule.forRoot(), NoopAuthModule, NoopTranslateModule, TaskFiltersCloudExtComponent, MatIconTestingModule],
            providers: [
                Apollo,
                {
                    provide: Store,
                    useValue: {
                        select: (selector) => {
                            if (selector === selectApplicationName) {
                                return of('mock-appName');
                            } else if (selector === selectProcessManagementFilter) {
                                return of([]);
                            }
                            return of({});
                        },
                        dispatch: () => {},
                    },
                },
            ],
        });

        fixture = TestBed.createComponent(TaskFiltersCloudExtComponent);
        component = fixture.componentInstance;
        store = TestBed.inject(Store);
        component.appName$ = of('mock-appName');
        fixture.detectChanges();
    });

    it('Should dispatch a navigateToFilterAction on click of task filter', () => {
        const navigateToFilterActionSpy = spyOn(store, 'dispatch');
        const expectedPayload = {
            filterId: fakeTaskFilter.id,
            type: '[ProcessCloud] navigateToTasks',
        };
        component.onTaskFilterClick(fakeTaskFilter);

        expect(navigateToFilterActionSpy).toHaveBeenCalledWith(expectedPayload);
    });

    it('Should dispatch a setProcessManagementFilter action on click of task filter', () => {
        const setProcessManagementFilterSpy = spyOn(store, 'dispatch');
        const expectedPayload = {
            payload: { filter: fakeTaskFilter, type: FilterType.TASK },
            type: '[ProcessCloud] setProcessManagementFilter',
        };
        component.onTaskFilterClick(fakeTaskFilter);

        expect(setProcessManagementFilterSpy).toHaveBeenCalledWith(expectedPayload);
    });

    it('Should dispatch a taskOrProcessFilterUpdate when filter has been updated', () => {
        const taskOrProcessFilterUpdateSpy = spyOn(store, 'dispatch');
        const filter = 'testFilter';
        const expectedPayload = {
            filterKey: filter,
            canBeRefreshed: true,
            type: '[Process Service Cloud Extension] task or process filter updated',
        };
        component.onUpdatedFilter(filter);

        expect(taskOrProcessFilterUpdateSpy).toHaveBeenCalledWith(expectedPayload);
    });

    it('should dispatch action if success emitted', () => {
        const setDefaultProcessManagementFilterSpy = spyOn(store, 'dispatch');
        component.defaultFilterAlreadySet = false;
        const filtersMock: TaskFilterCloudModel[] = [{ id: '1', key: 'my-tasks' } as TaskFilterCloudModel];
        const expectedPayload = {
            payload: { type: 'TASK', filter: { ...filtersMock[0] } },
            type: '[ProcessCloud] set default process management filter',
        };
        component.onFiltersLoadedSuccess(filtersMock);

        expect(component.defaultFilterAlreadySet).toBe(true);
        expect(setDefaultProcessManagementFilterSpy).toHaveBeenCalledTimes(1);
        expect(setDefaultProcessManagementFilterSpy).toHaveBeenCalledWith(expectedPayload);
    });

    it('should not dispatch action if there are no my-tasks', () => {
        const setDefaultProcessManagementFilterSpy = spyOn(store, 'dispatch');
        component.defaultFilterAlreadySet = false;
        const filtersMock: TaskFilterCloudModel[] = [{ id: '1', key: 'not-my-tasks' } as TaskFilterCloudModel];
        component.onFiltersLoadedSuccess(filtersMock);

        expect(component.defaultFilterAlreadySet).toBe(false);
        expect(setDefaultProcessManagementFilterSpy).not.toHaveBeenCalled();
    });

    it('should dispatch action only once', () => {
        const setDefaultProcessManagementFilterSpy = spyOn(store, 'dispatch');
        component.defaultFilterAlreadySet = false;
        const filtersMock1: TaskFilterCloudModel[] = [{ id: '1', key: 'my-tasks' } as TaskFilterCloudModel];
        const filtersMock2: TaskFilterCloudModel[] = [{ id: '1', key: 'my-tasks' } as TaskFilterCloudModel];
        const expectedPayload = {
            payload: { type: 'TASK', filter: { ...filtersMock1[0] } },
            type: '[ProcessCloud] set default process management filter',
        };
        component.onFiltersLoadedSuccess(filtersMock1);
        component.onFiltersLoadedSuccess(filtersMock2);

        expect(component.defaultFilterAlreadySet).toBe(true);
        expect(setDefaultProcessManagementFilterSpy).toHaveBeenCalledWith(expectedPayload);
        expect(setDefaultProcessManagementFilterSpy).toHaveBeenCalledTimes(1);
    });
});
