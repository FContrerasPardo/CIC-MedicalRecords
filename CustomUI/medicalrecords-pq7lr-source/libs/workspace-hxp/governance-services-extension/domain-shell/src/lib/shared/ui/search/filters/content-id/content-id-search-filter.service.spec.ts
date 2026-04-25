/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ContentIdSearchFilterService } from './content-id-search-filter.service';
import { ContentIdSearchFilterData } from './content-id-search-filter.data';

describe('ContentIdSearchFilterService', () => {
    let service: ContentIdSearchFilterService;

    beforeEach(() => {
        service = new ContentIdSearchFilterService();
    });

    it('should return an empty object if data is undefined', () => {
        const result = service.toQueryParams(undefined as unknown as ContentIdSearchFilterData);
        expect(result).toEqual({});
    });

    it('should return an empty object if data.values is empty', () => {
        const data: ContentIdSearchFilterData = {
            values: [],
            isEquivalentTo: function (): boolean {
                throw new Error('Function not implemented.');
            },
        };
        const result = service.toQueryParams(data);
        expect(result).toEqual({});
    });

    it('should return query params with contentId when valid data is provided', () => {
        const data: ContentIdSearchFilterData = {
            values: [
                {
                    value: '245ecdf6-ead4-446b-8f9e-cf131ce3d951',
                    label: '',
                },
            ],
            isEquivalentTo: function (): boolean {
                throw new Error('Function not implemented.');
            },
        };
        const result = service.toQueryParams(data);
        expect(result).toEqual({ contentId: '245ecdf6-ead4-446b-8f9e-cf131ce3d951' });
    });

    it('should return content-id filter data from query params', () => {
        expect(service.fromQueryParams({ contentId: '245ecdf6-ead4-446b-8f9e-cf131ce3d951' })).toEqual(
            new ContentIdSearchFilterData([{ label: '245ecdf6-ead4-446b-8f9e-cf131ce3d951', value: '245ecdf6-ead4-446b-8f9e-cf131ce3d951' }])
        );
    });

    it('should return undefined when contentId query param is missing', () => {
        expect(service.fromQueryParams({})).toBeUndefined();
    });
});
