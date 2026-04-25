/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecordNameSearchFilterComponent } from './record-name-search-filter.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { EventEmitter } from '@angular/core';
import { RecordNameSearchFilterData } from './record-name-search-filter.data';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { a11yReport } from '@hxp/workspace-hxp/shared/testing';

describe('RecordNameSearchFilterComponent', () => {
    let component: RecordNameSearchFilterComponent;
    let fixture: ComponentFixture<RecordNameSearchFilterComponent>;
    let mockService: { QUERY_PARAM: string; toQueryParams: jest.Mock; fromQueryParams: jest.Mock };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [RecordNameSearchFilterComponent, NoopAnimationsModule, NoopTranslateModule, MatIconTestingModule],
        }).compileComponents();

        fixture = TestBed.createComponent(RecordNameSearchFilterComponent);
        component = fixture.componentInstance;
        (component as any).clearForm = jest.fn();
        component.clearChanges = jest.fn();
        jest.spyOn(component, 'clearForm');
        component['oldFormValue'] = { ['selectedRecordName']: [] };
        component['searchFilterContainer'] = { clearChanges: jest.fn() } as any;
        fixture.detectChanges();

        // Always assign a full mock object for the service
        mockService = {
            QUERY_PARAM: 'fileName',
            toQueryParams: jest.fn(),
            fromQueryParams: jest.fn(),
        };
        component['recordNameSearchFilterService'] = mockService as any;
    });

    it('should clear filter when clearFilter is called', () => {
        component.inputValue = 'test';
        component.selectedValue = { values: [{ label: 'test', value: 'test' }] } as any;
        const filterClearedSpy = jest.fn();
        component.filterCleared = new EventEmitter<void>();
        component.filterCleared.subscribe(filterClearedSpy);

        component.clearFilter();

        expect(component.inputValue).toBe('');
        expect(component.clearChanges).toHaveBeenCalled();
        expect(filterClearedSpy).toHaveBeenCalled();
    });

    it('should update input and set selectedValue when valid input is provided', () => {
        const validInput = 'test-record-name';
        const fakeEvent = { target: { value: validInput } } as unknown as Event;
        (component as any).onInputChange(fakeEvent);

        expect(component.inputValue).toBe(validInput);
        if (component.selectedValue) {
            expect(component.selectedValue.values[0]).toEqual({
                label: validInput,
                value: validInput,
            });
        }
    });

    it('should reset state and discard pending changes when overlay is closed', () => {
        component['discardPendingChanges'] = jest.fn();
        (component as any).overlayClosed();
        expect(component.selectedValue).toBeUndefined();
        expect(component.inputValue).toBe('');
        expect(component['oldFormValue']).toEqual({ selectedRecordName: [] });
        expect(component['discardPendingChanges']).toHaveBeenCalled();
    });

    it('should return correct query param when data values exist', () => {
        const testData = new RecordNameSearchFilterData([{ label: 'test', value: 'test' }]);
        mockService.toQueryParams.mockReturnValue({ fileName: 'test' });
        const queryParam = component.toQueryParams(testData);
        expect(queryParam).toStrictEqual({ fileName: 'test' });
    });

    it('should return empty string when no values exist', () => {
        const testData = new RecordNameSearchFilterData([]);
        mockService.toQueryParams.mockReturnValue({});
        const queryParam = component.toQueryParams(testData);
        expect(queryParam).toStrictEqual({});
    });

    describe('fromQueryParams', () => {
        it('should delegate to the service and return its result', () => {
            const params = { fileName: 'abc' };
            mockService.fromQueryParams.mockReturnValue({ test: true });
            const result = component.fromQueryParams(params);
            expect(mockService.fromQueryParams).toHaveBeenCalledWith(params);
            expect(result).toEqual({ test: true });
        });

        it('should handle undefined from service', () => {
            mockService.fromQueryParams.mockReturnValue(undefined);
            const result = component.fromQueryParams({});
            expect(result).toBeUndefined();
        });

        it('should handle undefined from service when empty params provided', () => {
            mockService.fromQueryParams.mockReturnValue(undefined);
            const result = component.fromQueryParams({ fileName: '' });
            expect(result).toBeUndefined();
        });

        it('should handle valid value from service', () => {
            mockService.fromQueryParams.mockReturnValue({ test: 'valid' });
            const result = component.fromQueryParams({ fileName: 'valid' });
            expect(result).toEqual({ test: 'valid' });
        });
    });

    it('should pass accessibility audit', async () => {
        const report = await a11yReport(fixture.nativeElement);
        expect(report?.violations).toEqual([]);
    });
});
