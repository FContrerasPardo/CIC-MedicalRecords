/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { CutoffSearchFilterService } from './cutoff-search-filter.service';
import { DateSearchFilterService } from '../base/date-filter/date-search-filter.service';
import { SearchFilterData } from '../../models/search-filter.data';

describe('CutoffSearchFilterService', () => {
    let service: CutoffSearchFilterService;
    let dateService: { toQueryParams: jest.Mock };

    beforeEach(() => {
        const dateSpy = { toQueryParams: jest.fn() };

        TestBed.configureTestingModule({
            providers: [CutoffSearchFilterService, { provide: DateSearchFilterService, useValue: dateSpy }],
        });

        service = TestBed.inject(CutoffSearchFilterService);
        dateService = TestBed.inject(DateSearchFilterService) as any;
    });

    it('should call DateSearchFilterService with cutoffDate params', () => {
        const data = { from: '2021-06-01', to: '2021-06-30' } as unknown as SearchFilterData;
        const expected = { cutoffDate: '2021-06-30' };
        dateService.toQueryParams.mockReturnValue(expected);

        const result = service.toQueryParams(data);

        expect(dateService.toQueryParams).toHaveBeenCalledWith(data, 'cutoffDate');
        expect(result).toBe(expected);
    });
});
