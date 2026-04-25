/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { ModifierSearchFilterService } from './modifier-search-filter.service';
import { GovernanceUserService } from '../../../../config/governance-user.service';
import { MultiSelectListSearchFilterData } from '../base/multi-select-list-filter/multi-select-list-search-filter.data';
import { mockUsers } from '../../../../mocks/mock-users.data';
import { of } from 'rxjs';

describe('ModifierSearchFilterService', () => {
    let service: ModifierSearchFilterService;
    let userServiceMock: Partial<GovernanceUserService>;

    beforeEach(() => {
        userServiceMock = { getUsers: jest.fn().mockReturnValue(of(mockUsers)) };
        TestBed.configureTestingModule({
            providers: [ModifierSearchFilterService, { provide: GovernanceUserService, useValue: userServiceMock }],
        });
        service = TestBed.inject(ModifierSearchFilterService);
    });

    it('should return user modifiers', (done) => {
        service.getModifiers().subscribe((mods) => {
            const users = mockUsers.map((user) => ({
                label: user.username,
                value: user.id,
                id: user.id,
            }));

            expect(mods).toEqual(users);
            done();
        });
    });

    it('toQueryParams should map selected items to modifierId array', () => {
        const data: MultiSelectListSearchFilterData = new MultiSelectListSearchFilterData([{ label: 'User 1', value: 'User 1 id' }]);

        expect(service.toQueryParams(data)).toEqual({ modifier: ['User 1 id'] });
    });

    describe('fromQueryParams', () => {
        it('should return undefined if no modifier param', () => {
            expect(service.fromQueryParams({})).toBeUndefined();
        });

        it('should return undefined for empty modifier array', () => {
            expect(service.fromQueryParams({ modifier: [] })).toBeUndefined();
        });

        it('should return undefined for non-matching modifier value', () => {
            expect(service.fromQueryParams({ modifier: ['not-a-match'] })).toBeUndefined();
        });

        it('should return MultiSelectListSearchFilterData for matching modifier value', () => {
            // Ensure loadedOptions is populated by calling getModifiers first
            service.getModifiers().subscribe(() => {
                const result = service.fromQueryParams({ modifier: [mockUsers[0].id] });
                expect(result).toBeInstanceOf(MultiSelectListSearchFilterData);
                expect(result?.values[0].value).toBe(mockUsers[0].id);
            });
        });

        it('should handle comma-separated string', () => {
            service.getModifiers().subscribe(() => {
                const result = service.fromQueryParams({ modifier: mockUsers[0].id });
                expect(result).toBeInstanceOf(MultiSelectListSearchFilterData);
                expect(result?.values[0].value).toBe(mockUsers[0].id);
            });
        });
    });
});
