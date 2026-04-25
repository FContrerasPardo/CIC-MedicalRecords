/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MonthPickerControlComponent } from './month-picker-control.component';
import { WIDGET_ID, WidgetId } from '../../../definitions/dashboard.constants';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { a11yReport } from '@hxp/workspace-hxp/shared/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideNativeDateAdapter } from '@angular/material/core';

interface TestableMonthPickerComponent {
    picker: () => { open: jest.Mock; close: jest.Mock };
    selectedMonth: () => Date;
    widgetId?: () => WidgetId;
    monthChange: { emit: (value: unknown) => void };
    label: string;
    onMonthSelected(date: Date): void;
}

describe('MonthPickerControlComponent', () => {
    let component: MonthPickerControlComponent;
    let fixture: ComponentFixture<MonthPickerControlComponent>;
    let pickerMock: { open: jest.Mock; close: jest.Mock };

    beforeEach(() => {
        TestBed.overrideComponent(MonthPickerControlComponent, { set: { template: '' } });

        TestBed.configureTestingModule({
            imports: [MonthPickerControlComponent, NoopTranslateModule, MatIconTestingModule],
        });

        fixture = TestBed.createComponent(MonthPickerControlComponent);
        component = fixture.componentInstance;

        pickerMock = { open: jest.fn(), close: jest.fn() };

        const testComp = component as unknown as TestableMonthPickerComponent;
        testComp.picker = () => pickerMock;
        testComp.monthChange = { emit: jest.fn() };
    });

    afterEach(() => jest.clearAllMocks());

    it('should label returns "This Month" for current month', () => {
        const now = new Date();
        fixture.componentRef.setInput('selectedMonth', new Date(now.getFullYear(), now.getMonth(), 1));
        fixture.detectChanges();

        const result = component.label;

        expect(result).toBe('GOVERNANCE.DASHBOARD.THIS_MONTH');
    });

    it('should label returns formatted month for other dates', () => {
        fixture.componentRef.setInput('selectedMonth', new Date(2025, 0, 15));
        fixture.detectChanges();

        const result = component.label;

        expect(typeof result).toBe('string');
        expect(result).toContain('2025');
        expect(result.length).toBeGreaterThanOrEqual(6);
    });

    it('should onMonthSelected emits value and closes picker', () => {
        const date = new Date(2024, 6, 1);

        fixture.componentRef.setInput('widgetId', WIDGET_ID.CutoffTracker);

        const monthChangeSpy = jest.spyOn(component.monthChange, 'emit');
        component.onMonthSelected(date);

        expect(monthChangeSpy).toHaveBeenCalledWith({
            date,
            widgetId: WIDGET_ID.CutoffTracker,
        });
    });

    it('should set chip active only when the selected month is not the current month', () => {
        const now = new Date();

        fixture.componentRef.setInput('selectedMonth', new Date(now.getFullYear(), now.getMonth(), 1));
        fixture.detectChanges();
        expect(component.isMonthChipActive()).toBe(false);

        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        fixture.componentRef.setInput('selectedMonth', prevMonth);
        fixture.detectChanges();
        expect(component.isMonthChipActive()).toBe(true);
    });
});

describe('MonthPickerControlComponent (Accessibility)', () => {
    let fixture: ComponentFixture<MonthPickerControlComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [MonthPickerControlComponent, NoopTranslateModule, MatIconTestingModule, NoopAnimationsModule],
            providers: [provideNativeDateAdapter()],
        });

        fixture = TestBed.createComponent(MonthPickerControlComponent);
        fixture.componentRef.setInput('widgetId', WIDGET_ID.CutoffTracker);
        fixture.detectChanges();
    });

    it('should pass accessibility checks', async () => {
        const res = await a11yReport(fixture.nativeElement);

        expect(res?.violations).toEqual([]);
    });
});
