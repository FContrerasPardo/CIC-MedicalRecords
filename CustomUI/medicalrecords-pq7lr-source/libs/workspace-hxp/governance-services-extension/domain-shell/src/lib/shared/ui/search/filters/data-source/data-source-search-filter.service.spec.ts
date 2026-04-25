/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { DataSourceSearchFilterService } from './data-source-search-filter.service';
import { GovernanceConfigurationService } from '../../../../config/governance-config.service';
import { MultiSelectListSearchFilterData } from '../base/multi-select-list-filter/multi-select-list-search-filter.data';
import { of } from 'rxjs';

describe('DataSourceSearchFilterService', () => {
    let service: DataSourceSearchFilterService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                DataSourceSearchFilterService,
                GovernanceConfigurationService,
                {
                    provide: GovernanceConfigurationService,
                    useValue: {
                        getConfig: () => {
                            return of({
                                dataSources: [
                                    {
                                        createdByUser: null,
                                        createdAt: null,
                                        modifiedByUser: null,
                                        modifiedAt: null,
                                        name: 'Production',
                                        description: null,
                                        type: 'Internal Repository',
                                        dataSourceId: 'internal-repo',
                                        repoUrl: 'http://internal-repo.example.com',
                                        id: 'EDS#ds1',
                                    },
                                ],
                            });
                        },
                    },
                },
            ],
        });
        service = TestBed.inject(DataSourceSearchFilterService);
    });

    it('should map config dataSources to filter options', (done) => {
        service.getDataSources().subscribe((dataSources) => {
            expect(dataSources).toEqual([{ label: 'Production', value: 'EDS#ds1', icon: 'cloud' }]);
            done();
        });
    });

    it('toQueryParams should map selected items to dataSource array', () => {
        const data: MultiSelectListSearchFilterData = new MultiSelectListSearchFilterData([{ label: 'Production', value: 'EDS#ds1' }]);

        expect(service.toQueryParams(data)).toEqual({ eds: ['EDS#ds1'] });
    });

    describe('fromQueryParams', () => {
        it('should return undefined if no eds param', () => {
            expect(service.fromQueryParams({})).toBeUndefined();
        });

        it('should return undefined for empty eds array', () => {
            expect(service.fromQueryParams({ eds: [] })).toBeUndefined();
        });

        it('should create placeholder values with empty labels for any eds value', () => {
            const result = service.fromQueryParams({ eds: ['EDS#ds1'] });
            expect(result).toBeInstanceOf(MultiSelectListSearchFilterData);
            expect(result?.values[0]).toEqual({
                label: '',
                value: 'EDS#ds1',
                icon: 'internal_repository',
            });
        });

        it('should handle comma-separated string', () => {
            const result = service.fromQueryParams({ eds: 'EDS#ds1' });
            expect(result).toBeInstanceOf(MultiSelectListSearchFilterData);
            expect(result?.values[0]).toEqual({
                label: '',
                value: 'EDS#ds1',
                icon: 'internal_repository',
            });
        });

        it('should create placeholder values even for non-matching IDs', () => {
            const result = service.fromQueryParams({ eds: ['EDS#unknown', 'EDS#notfound'] });
            expect(result).toBeInstanceOf(MultiSelectListSearchFilterData);
            expect(result?.values).toEqual([
                { label: '', value: 'EDS#unknown', icon: 'internal_repository' },
                { label: '', value: 'EDS#notfound', icon: 'internal_repository' },
            ]);
        });

        it('should create placeholders for multiple values', () => {
            const result = service.fromQueryParams({ eds: ['EDS#ds1', 'EDS#ds2', 'EDS#ds3'] });
            expect(result).toBeInstanceOf(MultiSelectListSearchFilterData);
            expect(result?.values.length).toBe(3);
            expect(result?.values[0].value).toBe('EDS#ds1');
            expect(result?.values[1].value).toBe('EDS#ds2');
            expect(result?.values[2].value).toBe('EDS#ds3');
            // All should have empty labels initially
            expect(result?.values.every((v) => v.label === '')).toBe(true);
        });
    });
});
