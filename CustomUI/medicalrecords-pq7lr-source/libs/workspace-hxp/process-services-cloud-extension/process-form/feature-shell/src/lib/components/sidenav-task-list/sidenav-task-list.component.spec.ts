/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NoopTranslateModule } from '@alfresco/adf-core';
import { TaskFilterCloudModel, TaskFilterCloudService } from '@alfresco/adf-process-services-cloud';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { TASKS_ROUTE } from '../../constants/extensions.const';
import { SidenavTaskListComponent } from './sidenav-task-list.component';

const initialState = {};

export const mockProcessFilters: any[] = [
    {
        name: 'FakeAllProcesses',
        key: 'FakeAllProcesses',
        icon: 'adjust',
        id: '10',
        status: '',
    },
    {
        name: 'FakeRunningProcesses',
        key: 'FakeRunningProcesses',
        icon: 'inbox',
        id: '11',
        status: 'RUNNING',
    },
    {
        name: 'FakeCompletedProcesses',
        key: 'completed-processes',
        icon: 'done',
        id: '12',
        status: 'COMPLETED',
    },
];

describe('SidenavTaskListComponent', () => {
    let component: SidenavTaskListComponent;
    let fixture: ComponentFixture<SidenavTaskListComponent>;
    let store: MockStore;
    let router: Router;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NoopTranslateModule, RouterTestingModule.withRoutes([]), SidenavTaskListComponent],
            providers: [
                provideMockStore(initialState),
                {
                    provide: TaskFilterCloudService,
                    useValue: {
                        getTaskNotificationSubscription: () => of({}),
                        getTaskListFilters: () => of([mockProcessFilters]),
                        filterKeyToBeRefreshed$: of(''),
                    },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(SidenavTaskListComponent);
        component = fixture.componentInstance;
        store = TestBed.inject(MockStore);
        router = TestBed.inject(Router);
        fixture.detectChanges();
    });

    it('should dispatch action when filter updates', () => {
        const taskOrProcessFilterUpdateSpy = jest.spyOn(store, 'dispatch');
        const filter = 'testProcessFilter';
        const expectedPayload = {
            filterKey: filter,
            canBeRefreshed: true,
            type: '[Process Service Cloud Extension] task or process filter updated',
        };
        component.onUpdatedFilter(filter);
        expect(taskOrProcessFilterUpdateSpy).toHaveBeenCalledWith(expectedPayload);
    });

    it('should navigate when clicked on filter', () => {
        jest.spyOn(store, 'dispatch').mockImplementation();
        const navigateSpy = jest.spyOn(router, 'navigate');
        const fakeFilter = { ...mockProcessFilters[0] };
        const expectedQueryParams = { queryParams: { filterId: fakeFilter.id } };

        component.onTaskFilterClick(fakeFilter);
        expect(navigateSpy).toHaveBeenCalledWith([TASKS_ROUTE], expectedQueryParams);
    });

    it('should not navigate when clicked on filter that does not have id', () => {
        const navigateSpy = jest.spyOn(router, 'navigate');
        const fakeFilter = { ...mockProcessFilters[0] };
        fakeFilter.id = null;
        component.onTaskFilterClick(fakeFilter);
        expect(navigateSpy).not.toHaveBeenCalled();
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
