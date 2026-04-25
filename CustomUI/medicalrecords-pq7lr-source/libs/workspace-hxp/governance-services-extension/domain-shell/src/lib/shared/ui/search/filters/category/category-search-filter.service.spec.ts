/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { CategorySearchFilterService } from './category-search-filter.service';
import { GovernanceConfigurationService } from '../../../../config/governance-config.service';
import { MultiSelectListSearchFilterData } from '../base/multi-select-list-filter/multi-select-list-search-filter.data';
import { mockConfigEndpointData } from '../../../../mocks/mock-configuration.data';
import { of } from 'rxjs';
import { Category } from '../../../../config/governance-config.type';

describe('CategorySearchFilterService', () => {
    let service: CategorySearchFilterService;
    let configServiceMock: Partial<GovernanceConfigurationService>;

    function flattenCategories(filePlans: any[]): any[] {
        const result: any[] = [];
        function recurse(categories: any[], parentId: string | null, filePlanId: string) {
            if (!categories) {return;}
            for (const cat of categories) {
                result.push({
                    ...cat,
                    parentId: parentId ?? null,
                    filePlanId,
                    categories: undefined,
                });
                if (cat.categories) {
                    recurse(cat.categories, cat.id, filePlanId);
                }
            }
        }
        for (const fp of filePlans) {
            recurse(fp.categories, null, fp.id);
        }
        return result;
    }

    const mockConfigModel = {
        dataSources: mockConfigEndpointData.map((item) => item.environmentDataSourceDTO),
        filePlans: mockConfigEndpointData[0].filePlans,
        categories: flattenCategories(mockConfigEndpointData[0].filePlans),
    } as any;

    beforeEach(() => {
        configServiceMock = { getConfig: () => of(mockConfigModel) };
        TestBed.configureTestingModule({
            providers: [CategorySearchFilterService, { provide: GovernanceConfigurationService, useValue: configServiceMock }],
        });
        service = TestBed.inject(CategorySearchFilterService);
    });

    it('should return categories from mock configuration data', (done) => {
        service.getCategories().subscribe((cats) => {
            expect(cats).toEqual([
                // eslint-disable-next-line @cspell/spellchecker
                { label: 'File P…/Retent…', value: '4567', tooltip: 'File Plan HR/Retention Category HR APAC' },
                // eslint-disable-next-line @cspell/spellchecker
                { label: 'File P…/.../Retent…', value: '7654', tooltip: 'File Plan HR/Retention Category HR APAC/Retention Category HR EU' },

                { label: 'File P…/Sub Re…', value: '7655', tooltip: 'File Plan HR/Sub Retention Category HR EU' },
            ]);
            done();
        });
    });

    it('toQueryParams should map selected items to categoryId array', () => {
        const data = new MultiSelectListSearchFilterData([{ label: 'FP/Cat', value: 'cat1', tooltip: 'FP/Cat' }]);

        expect(service.toQueryParams(data)).toEqual({ categoryId: ['cat1'] });
    });

    it('should exclude container categories but present in child category tooltip', (done) => {
        const baseCategory = mockConfigModel.categories[0];

        const containerCategory: Category = {
            ...baseCategory,
            id: 'container-1',
            name: 'Container Category',
            parentId: null,
            retentionPolicy: null,
        };

        const childCategory: Category = {
            ...baseCategory,
            id: 'child-1',
            name: 'Child Category',
            parentId: containerCategory.id,
        };

        const modifiedConfig = {
            ...mockConfigModel,
            categories: [...mockConfigModel.categories, containerCategory, childCategory],
        };

        configServiceMock.getConfig = () => of(modifiedConfig);

        service.getCategories().subscribe((cats) => {
            const values = cats.map((c) => c.value);
            expect(values).not.toContain(containerCategory.id);

            const childOption = cats.find((c) => c.value === childCategory.id);
            expect(childOption).toBeDefined();
            expect(childOption?.tooltip).toContain(containerCategory.name);

            done();
        });
    });

    describe('fromQueryParams', () => {
        it('should return undefined if no categoryId param is present', () => {
            expect(service.fromQueryParams({})).toBeUndefined();
        });

        it('should return undefined if categoryId param is an empty array', () => {
            expect(service.fromQueryParams({ categoryId: [] })).toBeUndefined();
        });

        it('should handle a single categoryId value (string)', () => {
            const result = service.fromQueryParams({ categoryId: 'cat1' });
            expect(result).toBeInstanceOf(MultiSelectListSearchFilterData);
            expect(result?.values).toEqual([{ label: '', value: 'cat1' }]);
        });

        it('should handle multiple categoryId values (array)', () => {
            const result = service.fromQueryParams({ categoryId: ['cat1', 'cat2'] });
            expect(result).toBeInstanceOf(MultiSelectListSearchFilterData);
            expect(result?.values).toEqual([
                { label: '', value: 'cat1' },
                { label: '', value: 'cat2' },
            ]);
        });
    });
});
