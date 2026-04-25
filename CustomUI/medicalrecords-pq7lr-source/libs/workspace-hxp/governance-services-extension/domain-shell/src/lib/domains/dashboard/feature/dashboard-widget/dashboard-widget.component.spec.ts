/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardWidgetComponent } from './dashboard-widget.component';
import { WIDGET_CONTROL_KEY, WidgetId } from '../../definitions/dashboard.constants';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { ProgressSpinnerHarnessUtils } from '@alfresco-dbp/shared-testing/util/component-harnesses';
import { SearchFilterValueService } from '../../../../shared/ui/search/filters/base/search-filter-value.service';
import { CategorySearchFilterService } from '../../../../shared/ui/search/filters/category/category-search-filter.service';
import { of, Subject } from 'rxjs';
import { By } from '@angular/platform-browser';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { a11yReport } from '@hxp/workspace-hxp/shared/testing';

describe('DashboardWidgetComponent', () => {
    let component: DashboardWidgetComponent;
    let fixture: ComponentFixture<DashboardWidgetComponent>;
    let filterApplied$: Subject<any>;
    let filterReset$: Subject<any>;

    const filterValueServiceMock = {
        filterApplied$: undefined as unknown as Subject<any>,
        filterReset$: undefined as unknown as Subject<any>,
        clearFilter: jest.fn(),
    };

    beforeEach(() => {
        filterApplied$ = new Subject();
        filterReset$ = new Subject();

        filterValueServiceMock.filterApplied$ = filterApplied$;
        filterValueServiceMock.filterReset$ = filterReset$;
        filterValueServiceMock.clearFilter = jest.fn();

        const mockCategorySearchFilterService = {
            getCategories: jest.fn().mockReturnValue(of([])),
        };

        TestBed.configureTestingModule({
            imports: [DashboardWidgetComponent, NoopTranslateModule, MatIconTestingModule],
            providers: [
                {
                    provide: SearchFilterValueService,
                    useValue: filterValueServiceMock,
                },
                {
                    provide: CategorySearchFilterService,
                    useValue: mockCategorySearchFilterService,
                },
                provideNativeDateAdapter(),
            ],
        });

        fixture = TestBed.createComponent(DashboardWidgetComponent);
        component = fixture.componentInstance;
    });

    afterEach(() => {
        filterApplied$.complete();
        filterReset$.complete();
        jest.clearAllMocks();
    });

    it('should pass accessibility checks', async () => {
        fixture.componentRef.setInput('heading', 'Test Heading');
        fixture.componentRef.setInput('subtitle', 'Test Subtitle');
        fixture.componentRef.setInput('loading', false);
        fixture.detectChanges();

        const res = await a11yReport(fixture.nativeElement);

        expect(res?.violations).toEqual([]);
    });

    it('should render heading and subtitle', () => {
        fixture.componentRef.setInput('heading', 'Test Heading');
        fixture.componentRef.setInput('subtitle', 'Test Subtitle');

        fixture.detectChanges();

        const titleEl = fixture.debugElement.query(By.css('.hxp-title')).nativeElement;
        const subtitleEl = fixture.debugElement.query(By.css('.hxp-subtitle')).nativeElement;

        expect(titleEl.textContent).toContain('Test Heading');
        expect(subtitleEl.textContent).toContain('Test Subtitle');
    });

    it('should not render subtitle block when subtitle is empty', () => {
        fixture.componentRef.setInput('heading', 'Test Heading');
        fixture.componentRef.setInput('subtitle', '');

        fixture.detectChanges();

        const subtitleEl = fixture.debugElement.query(By.css('.hxp-subtitle'));
        expect(subtitleEl).toBeNull();
    });

    it('should show progress spinner when loading = true', async () => {
        fixture.componentRef.setInput('loading', true);
        fixture.detectChanges();

        const spinner = await ProgressSpinnerHarnessUtils.getProgressSpinner({ fixture });
        expect(spinner).not.toBeNull();
    });

    it('should not show progress spinner when loading = false', async () => {
        fixture.componentRef.setInput('loading', false);
        fixture.detectChanges();

        const spinner = await ProgressSpinnerHarnessUtils.getProgressSpinner({ fixture });
        expect(spinner).toBeNull();
    });

    it('should render category filter when Category key is provided', () => {
        fixture.componentRef.setInput('controlKeys', [WIDGET_CONTROL_KEY.Category]);
        fixture.componentRef.setInput('widgetId', 'W1' as WidgetId);

        fixture.detectChanges();

        const cmp = fixture.debugElement.query(By.css('hxp-governance-search-category-filter'));
        expect(cmp).not.toBeNull();
    });

    it('should render month picker when Month key is provided', () => {
        fixture.componentRef.setInput('controlKeys', [WIDGET_CONTROL_KEY.Month]);
        fixture.componentRef.setInput('widgetId', 'W1' as WidgetId);
        fixture.componentRef.setInput('selectedMonth', new Date());

        fixture.detectChanges();

        const cmp = fixture.debugElement.query(By.css('hxp-month-picker-control'));
        expect(cmp).not.toBeNull();
    });

    it('should show the legal case filter when the LegalCase control is enabled and items are available', () => {
        fixture.componentRef.setInput('controlKeys', [WIDGET_CONTROL_KEY.LegalCase]);
        fixture.componentRef.setInput('widgetId', 'W1' as WidgetId);
        fixture.componentRef.setInput('legalCaseItems', [{ id: 'LC-1', category: 'Case A' }]);

        fixture.detectChanges();

        const cmp = fixture.debugElement.query(By.css('hxp-governance-legal-case-name-filter'));
        expect(cmp).not.toBeNull();
    });

    it('should hide the legal case filter when the LegalCase control is enabled but items are empty', () => {
        fixture.componentRef.setInput('controlKeys', [WIDGET_CONTROL_KEY.LegalCase]);
        fixture.componentRef.setInput('widgetId', 'W1' as WidgetId);
        fixture.componentRef.setInput('legalCaseItems', []);

        fixture.detectChanges();

        const cmp = fixture.debugElement.query(By.css('hxp-governance-legal-case-name-filter'));
        expect(cmp).toBeNull();
    });

    it('should emit monthChange when triggered', () => {
        const spy = jest.spyOn(component.monthChange, 'emit');
        const payload = { date: new Date(), widgetId: 'W2' as WidgetId };

        component.monthChange.emit(payload);

        expect(spy).toHaveBeenCalledWith(payload);
    });

    it('should emit selected category ids when the category filter is applied', () => {
        const emitSpy = jest.spyOn(component.categoryChange, 'emit');

        const widgetId = 'W3' as WidgetId;
        fixture.componentRef.setInput('controlKeys', [WIDGET_CONTROL_KEY.Category]);
        fixture.componentRef.setInput('widgetId', widgetId);
        fixture.detectChanges();

        const fakeInstance = {};
        (component as any).categoryFilter = () => fakeInstance;

        filterApplied$.next({
            filter: fakeInstance,
            value: { values: [{ id: 'cat-1' }, { value: 'cat-2' }] },
        });

        expect(emitSpy).toHaveBeenCalledWith({ widgetId, value: ['cat-1', 'cat-2'] });
    });

    it('should emit a null category selection when the category filter is reset', () => {
        const emitSpy = jest.spyOn(component.categoryChange, 'emit');

        const widgetId = 'W4' as WidgetId;
        fixture.componentRef.setInput('controlKeys', [WIDGET_CONTROL_KEY.Category]);
        fixture.componentRef.setInput('widgetId', widgetId);
        fixture.detectChanges();

        const fakeInstance = {};
        (component as any).categoryFilter = () => fakeInstance;

        filterReset$.next(fakeInstance);

        expect(emitSpy).toHaveBeenCalledWith({ widgetId, value: null });
    });

    it('should emit selected legal case ids when the legal case filter is applied', () => {
        const emitSpy = jest.spyOn(component.legalCaseChange, 'emit');

        const widgetId = 'W6' as WidgetId;
        fixture.componentRef.setInput('controlKeys', [WIDGET_CONTROL_KEY.LegalCase]);
        fixture.componentRef.setInput('widgetId', widgetId);
        fixture.componentRef.setInput('legalCaseItems', [{ id: 'LC-1', category: 'Case A' }]);
        fixture.detectChanges();

        const fakeLegalInstance = {};
        (component as any).legalCaseNameFilter = () => fakeLegalInstance;

        filterApplied$.next({
            filter: fakeLegalInstance,
            value: { values: [{ id: 'LC-1' }] },
        });

        expect(emitSpy).toHaveBeenCalledWith({ widgetId, value: ['LC-1'] });
    });

    it('should emit an empty legal case selection when the legal case filter is reset', () => {
        const emitSpy = jest.spyOn(component.legalCaseChange, 'emit');

        const widgetId = 'W7' as WidgetId;
        fixture.componentRef.setInput('controlKeys', [WIDGET_CONTROL_KEY.LegalCase]);
        fixture.componentRef.setInput('widgetId', widgetId);
        fixture.componentRef.setInput('legalCaseItems', [{ id: 'LC-1', category: 'Case A' }]);
        fixture.detectChanges();

        const fakeLegalInstance = {};
        (component as any).legalCaseNameFilter = () => fakeLegalInstance;

        filterReset$.next(fakeLegalInstance);

        expect(emitSpy).toHaveBeenCalledWith({ widgetId, value: [] });
    });

    it('should ignore filterApplied$ from other filter instance', () => {
        const emitSpy = jest.spyOn(component.categoryChange, 'emit');

        const widgetId = 'W5' as WidgetId;
        fixture.componentRef.setInput('controlKeys', [WIDGET_CONTROL_KEY.Category]);
        fixture.componentRef.setInput('widgetId', widgetId);
        fixture.detectChanges();

        (component as any).categoryFilter = () => ({ id: 'real' });

        filterApplied$.next({
            filter: { id: 'other' },
            value: { values: [{ id: 'cat-x' }] },
        });

        expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should clear enabled filters when the refresh token changes', () => {
        const widgetId = 'W8' as WidgetId;

        const fakeCat = {};
        const fakeLegal = {};

        (component as any).categoryFilter = () => fakeCat;
        (component as any).legalCaseNameFilter = () => fakeLegal;

        fixture.componentRef.setInput('widgetId', widgetId);
        fixture.componentRef.setInput('controlKeys', [WIDGET_CONTROL_KEY.Category, WIDGET_CONTROL_KEY.LegalCase]);
        fixture.componentRef.setInput('legalCaseItems', [{ id: 'LC-1', category: 'Case A' }]);
        fixture.detectChanges();

        fixture.componentRef.setInput('refreshToken', new Date('2026-02-01T00:00:00.000Z'));
        fixture.detectChanges();

        expect(filterValueServiceMock.clearFilter).toHaveBeenCalledWith(fakeCat);
        expect(filterValueServiceMock.clearFilter).toHaveBeenCalledWith(fakeLegal);
    });

    it('should not clear filters on refresh when corresponding controls are disabled', () => {
        const widgetId = 'W9' as WidgetId;

        const fakeCat = {};
        const fakeLegal = {};
        (component as any).categoryFilter = () => fakeCat;
        (component as any).legalCaseNameFilter = () => fakeLegal;

        fixture.componentRef.setInput('widgetId', widgetId);
        fixture.componentRef.setInput('controlKeys', [WIDGET_CONTROL_KEY.Month]); // no Category / LegalCase
        fixture.detectChanges();

        fixture.componentRef.setInput('refreshToken', new Date('2026-02-01T00:00:00.000Z'));
        fixture.detectChanges();

        expect(filterValueServiceMock.clearFilter).not.toHaveBeenCalled();
    });

    it('should not emit categoryChange or legalCaseChange when refresh clears filters', () => {
        const widgetId = 'W10' as WidgetId;
        const categoryFilterInstance = {};
        const legalCaseFilterInstance = {};

        (component as any).categoryFilter = () => categoryFilterInstance;
        (component as any).legalCaseNameFilter = () => legalCaseFilterInstance;

        fixture.componentRef.setInput('widgetId', widgetId);
        fixture.componentRef.setInput('controlKeys', [WIDGET_CONTROL_KEY.Category, WIDGET_CONTROL_KEY.LegalCase]);
        fixture.componentRef.setInput('legalCaseItems', [{ id: 'LC-1', category: 'Case A' }]);
        fixture.detectChanges();

        filterValueServiceMock.clearFilter.mockClear();

        const categoryChangeSpy = jest.spyOn(component.categoryChange, 'emit');
        const legalCaseChangeSpy = jest.spyOn(component.legalCaseChange, 'emit');

        filterValueServiceMock.clearFilter.mockImplementation((filterInstance: unknown) => {
            filterReset$.next(filterInstance);
        });

        fixture.componentRef.setInput('refreshToken', new Date('2026-02-01T00:01:00.000Z'));
        fixture.detectChanges();

        expect(filterValueServiceMock.clearFilter).toHaveBeenCalledWith(categoryFilterInstance);
        expect(filterValueServiceMock.clearFilter).toHaveBeenCalledWith(legalCaseFilterInstance);
        expect(categoryChangeSpy).not.toHaveBeenCalled();
        expect(legalCaseChangeSpy).not.toHaveBeenCalled();
    });

    it('should not emit filter events when widgetId is missing', () => {
        const catEmitSpy = jest.spyOn(component.categoryChange, 'emit');
        const legalEmitSpy = jest.spyOn(component.legalCaseChange, 'emit');

        fixture.componentRef.setInput('controlKeys', [WIDGET_CONTROL_KEY.Category, WIDGET_CONTROL_KEY.LegalCase]);
        fixture.detectChanges();

        const fakeCat = {};
        const fakeLegal = {};
        (component as any).categoryFilter = () => fakeCat;
        (component as any).legalCaseNameFilter = () => fakeLegal;

        filterApplied$.next({ filter: fakeCat, value: { values: [{ id: 'cat-1' }] } });
        filterApplied$.next({ filter: fakeLegal, value: { values: [{ id: 'LC-1' }] } });

        expect(catEmitSpy).not.toHaveBeenCalled();
        expect(legalEmitSpy).not.toHaveBeenCalled();
    });
});
