/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { TaskFilterService } from './task-filter.service';
import {
    DateCloudFilterType,
    IdentityUserService,
    ProcessDefinitionCloud,
    TaskCloudService,
    TaskFilterCloudModel,
    TaskFilterCloudService,
} from '@alfresco/adf-process-services-cloud';
import { MockProvider } from 'ng-mocks';
import { firstValueFrom, of } from 'rxjs';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { selectProcessDefinitionEntities, selectVariablesByProcess } from '../../../../store/selectors/process-definitions.selector';
import { DateFilter, FilterType } from '@alfresco-dbp/shared-filters-services';
import { endOfDay, startOfDay } from 'date-fns';
import { NoopTranslateModule } from '@alfresco/adf-core';

const mockProcessDefinitions: ProcessDefinitionCloud[] = [
    {
        id: 'mockId',
        appName: 'mockAppName',
        key: 'mockKey',
        appVersion: 1,
        version: 1,
        name: 'mockProcessDefinitionName',
        category: '',
        description: '',
    },
];

const mockTaskFilterCloudModel = new TaskFilterCloudModel({
    id: 'mockId',
    name: 'mockName',
    appName: 'mockAppName',
    taskNames: ['mockTaskName'],
    statuses: ['mockStatus'],
    processDefinitionNames: ['mockProcessDefinitionName'],
    assignees: ['mockAssignee'],
    priorities: [1],
    dueDateType: DateCloudFilterType.TODAY,
    completedDateType: null,
    createdDateType: DateCloudFilterType.TODAY,
    completedByUsers: ['mockCompletedBy'],
});

describe('TaskFilterService', () => {
    let service: TaskFilterService;
    let taskFilterCloudService: TaskFilterCloudService;
    let taskCloudService: TaskCloudService;
    let identityUserService: IdentityUserService;
    let store: MockStore<any>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NoopTranslateModule],
            providers: [
                MockProvider(TaskCloudService, {
                    priorities: [{ label: '1', key: '1', value: 'mockPriority' }],
                    getPriorityLabel: () => 'mockPriority',
                }),
                MockProvider(TaskFilterCloudService, {
                    isDefaultFilter: () => true,
                    updateFilter: () => of([mockTaskFilterCloudModel]),
                    addFilter: () => of([mockTaskFilterCloudModel]),
                    deleteFilter: () => of([mockTaskFilterCloudModel]),
                }),
                MockProvider(IdentityUserService, {
                    search: (username) => of([{ id: username, username: username }]),
                }),
                provideMockStore(),
            ],
        });

        service = TestBed.inject(TaskFilterService);
        taskFilterCloudService = TestBed.inject(TaskFilterCloudService);
        taskCloudService = TestBed.inject(TaskCloudService);
        identityUserService = TestBed.inject(IdentityUserService);
        store = TestBed.inject(MockStore);
        store.overrideSelector(selectVariablesByProcess, []);
        store.overrideSelector(selectProcessDefinitionEntities, mockProcessDefinitions);
    });

    it('should get filters correctly', async () => {
        const getPriorityLabelSpy = spyOn(taskCloudService, 'getPriorityLabel').and.callThrough();
        const searchSpy = spyOn(identityUserService, 'search').and.callThrough();

        const filters = await firstValueFrom(service.getFilters(mockTaskFilterCloudModel));
        const isLoading = await firstValueFrom(service.filtersLoading$);

        expect(filters.map((f) => f.name)).toEqual([
            'taskNames',
            'statuses',
            'processDefinitionNames',
            'assignees',
            'priorities',
            'dueDateType',
            'completedDateType',
            'createdDateType',
            'completedByUsers',
        ]);

        expect(getPriorityLabelSpy).toHaveBeenCalledWith(Number.parseInt(mockTaskFilterCloudModel.priorities[0] || '', 10));
        expect(searchSpy).toHaveBeenCalledWith(mockTaskFilterCloudModel.assignees[0]);
        expect(searchSpy).toHaveBeenCalledWith(mockTaskFilterCloudModel.completedByUsers[0]);
        expect(isLoading).toBe(false);
    });

    it('should date filters have correct options', async () => {
        const filters = await firstValueFrom(service.getFilters(mockTaskFilterCloudModel));

        const dateFilters = filters.filter((f) => f.type === FilterType.DATE) as DateFilter[];

        expect(dateFilters.length).toBe(3);
        for (const dateFilter of dateFilters) {
            expect(dateFilter.options).toEqual([
                { value: DateCloudFilterType.TODAY, label: 'FILTERS.DATE_FILTER.TODAY' },
                { value: DateCloudFilterType.WEEK, label: 'FILTERS.DATE_FILTER.WEEK' },
                { value: DateCloudFilterType.MONTH, label: 'FILTERS.DATE_FILTER.MONTH' },
                { value: DateCloudFilterType.QUARTER, label: 'FILTERS.DATE_FILTER.QUARTER' },
                { value: DateCloudFilterType.YEAR, label: 'FILTERS.DATE_FILTER.YEAR' },
                { value: DateCloudFilterType.RANGE, label: 'FILTERS.DATE_FILTER.RANGE' },
            ]);
        }
    });

    it('should check if filter is default', () => {
        const isDefaultFilterSpy = spyOn(taskFilterCloudService, 'isDefaultFilter').and.returnValue(true);

        service.isDefaultFilter(mockTaskFilterCloudModel);

        expect(isDefaultFilterSpy).toHaveBeenCalledWith(mockTaskFilterCloudModel.name);
    });

    it('should save filter', async () => {
        const updateFilterSpy = spyOn(taskFilterCloudService, 'updateFilter').and.returnValue(of([mockTaskFilterCloudModel]));

        await firstValueFrom(service.saveFilter(mockTaskFilterCloudModel));

        expect(updateFilterSpy).toHaveBeenCalledWith(mockTaskFilterCloudModel);
    });

    it('should save filter as', async () => {
        const addFilterSpy = spyOn(taskFilterCloudService, 'addFilter').and.returnValue(of([mockTaskFilterCloudModel]));

        await firstValueFrom(service.saveFilterAs(mockTaskFilterCloudModel, 'mockNewFilterName'));

        expect(addFilterSpy).toHaveBeenCalledWith(mockTaskFilterCloudModel);
    });

    it('should delete filter', async () => {
        const deleteFilterSpy = spyOn(taskFilterCloudService, 'deleteFilter').and.returnValue(of([mockTaskFilterCloudModel]));

        await firstValueFrom(service.deleteFilter(mockTaskFilterCloudModel));

        expect(deleteFilterSpy).toHaveBeenCalledWith(mockTaskFilterCloudModel);
    });

    it('should convert filter array to task filter cloud', async () => {
        const sourceTaskFilterCloud = mockTaskFilterCloudModel;
        const filters = await firstValueFrom(service.getFilters(sourceTaskFilterCloud));

        const newTaskFilterCloud = service.filterArrayToTaskFilterCloud(sourceTaskFilterCloud, filters);

        expect(newTaskFilterCloud.assignees).toEqual(sourceTaskFilterCloud.assignees);
        expect(newTaskFilterCloud.completedByUsers).toEqual(sourceTaskFilterCloud.completedByUsers);
        expect(newTaskFilterCloud.createdDateType).toEqual(sourceTaskFilterCloud.createdDateType);
        expect(newTaskFilterCloud.dueDateType).toEqual(sourceTaskFilterCloud.dueDateType);
        expect(newTaskFilterCloud.dueDateFrom).toEqual(startOfDay(new Date()).toISOString());
        expect(newTaskFilterCloud.dueDateTo).toEqual(endOfDay(new Date()).toISOString());
        expect(newTaskFilterCloud.priorities).toEqual(sourceTaskFilterCloud.priorities);
        expect(newTaskFilterCloud.processDefinitionNames).toEqual(sourceTaskFilterCloud.processDefinitionNames);
        expect(newTaskFilterCloud.statuses).toEqual(sourceTaskFilterCloud.statuses);
        expect(newTaskFilterCloud.taskNames).toEqual(sourceTaskFilterCloud.taskNames);
        expect(newTaskFilterCloud.completedDateType).toEqual(sourceTaskFilterCloud.completedDateType);
    });
});
