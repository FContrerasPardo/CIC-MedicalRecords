/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CreatorSearchFilterService } from './creator-search-filter.service';
import { GovernanceUserService } from '../../../../config/governance-user.service';
import { MultiSelectListSearchFilterData } from '../base/multi-select-list-filter/multi-select-list-search-filter.data';

describe('CreatorSearchFilterService', () => {
    let service: CreatorSearchFilterService;
    let userServiceMock: Partial<GovernanceUserService>;

    beforeEach(() => {
        userServiceMock = { getUsers: jest.fn() };
        TestBed.configureTestingModule({
            providers: [CreatorSearchFilterService, { provide: GovernanceUserService, useValue: userServiceMock }],
        });
        service = TestBed.inject(CreatorSearchFilterService);
    });

    it('should map users to creators', (done) => {
        const users = [
            { id: '1', username: 'User One' },
            { id: '2', username: 'User Two' },
        ];
        (userServiceMock.getUsers as jest.Mock).mockReturnValue(of(users));

        service.getCreators().subscribe((creators) => {
            expect(creators).toEqual([
                { label: 'User One', value: '1', id: '1' },
                { label: 'User Two', value: '2', id: '2' },
            ]);
            done();
        });
    });

    it('toQueryParams should map selected items to creatorId array', () => {
        const data = new MultiSelectListSearchFilterData([{ label: 'User One', value: '1', id: '1' }]);

        expect(service.toQueryParams(data)).toEqual({ creator: ['1'] });
    });

    describe('fromQueryParams', () => {
        it('should return an empty object for any input', () => {
            expect(service.fromQueryParams({})).toEqual(undefined);
            expect(service.fromQueryParams({ creator: [] })).toEqual(undefined);
            expect(service.fromQueryParams({ creator: 'user1' })).toEqual(undefined);
            expect(service.fromQueryParams({ creator: ['user1', 'user2'] })).toEqual(undefined);
        });
    });
});
