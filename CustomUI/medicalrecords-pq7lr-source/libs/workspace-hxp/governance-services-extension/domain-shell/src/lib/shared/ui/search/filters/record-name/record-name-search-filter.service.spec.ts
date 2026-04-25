/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { RecordNameSearchFilterData } from './record-name-search-filter.data';
import { RecordNameSearchFilterService } from './record-name-search-filter.service';

describe('RecordNameSearchFilterService', () => {
    let service: RecordNameSearchFilterService;

    beforeEach(() => {
        service = new RecordNameSearchFilterService();
    });

    it('should return an empty object if data is undefined', () => {
        const result = service.toQueryParams(undefined as unknown as RecordNameSearchFilterData);
        expect(result).toEqual({});
    });

    it('should return an empty object if data.values is empty', () => {
        const data: RecordNameSearchFilterData = {
            values: [],
            isEquivalentTo: function (): boolean {
                throw new Error('Function not implemented.');
            },
        };
        const result = service.toQueryParams(data);
        expect(result).toEqual({});
    });

    it('should return query params with fileName when valid data is provided', () => {
        const data: RecordNameSearchFilterData = {
            values: [
                {
                    value: 'title-of-record',
                    label: '',
                },
            ],
            isEquivalentTo: function (): boolean {
                throw new Error('Function not implemented.');
            },
        };
        const result = service.toQueryParams(data);
        expect(result).toEqual({ fileName: 'title-of-record' });
    });

    describe('fromQueryParams', () => {
        it('should return undefined if fileName param is missing', () => {
            expect(service.fromQueryParams({})).toBeUndefined();
        });

        it('should return undefined if fileName param is empty', () => {
            expect(service.fromQueryParams({ fileName: '' })).toBeUndefined();
        });

        it('should return RecordNameSearchFilterData for valid fileName', () => {
            const result = service.fromQueryParams({ fileName: 'my-record' });
            expect(result).toBeInstanceOf(RecordNameSearchFilterData);
            expect(result?.values[0].value).toBe('my-record');
            expect(result?.values[0].label).toBe('my-record');
        });
    });
});
