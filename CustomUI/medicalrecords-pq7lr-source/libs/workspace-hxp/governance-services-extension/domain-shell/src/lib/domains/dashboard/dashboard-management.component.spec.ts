/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed, ComponentFixture } from '@angular/core/testing';
import { DashboardManagementComponent } from './dashboard-management.component';
import { of } from 'rxjs';
import { WIDGET_ID, WidgetId, SORT_OPTION } from './definitions/dashboard.constants';
import { DashboardStateService } from './services/dashboard-state.service';
import { GovernanceConfigurationService } from '../../shared/config/governance-config.service';
import { provideNativeDateAdapter } from '@angular/material/core';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { CategorySearchFilterService } from '../../shared/ui/search/filters/category/category-search-filter.service';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { GovernanceDashboardPptService } from './services/governance-dashboard-ppt.service';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { a11yReport } from '@hxp/workspace-hxp/shared/testing';

jest.mock('ng2-charts', () => {
    const angularCore = jest.requireActual('@angular/core');
    @angularCore.Directive({
        selector: 'canvas[baseChart]',
    })
    class MockBaseChartDirective {
        @angularCore.Input() data: unknown;
        @angularCore.Input() options: unknown;
        @angularCore.Input() type: unknown;
        @angularCore.Input() plugins: unknown;
        update = jest.fn();
    }

    return {
        BaseChartDirective: MockBaseChartDirective,
    };
});

describe('DashboardManagementComponent', () => {
    let fixture: ComponentFixture<DashboardManagementComponent>;
    let component: DashboardManagementComponent;

    let dashboardStateService: jest.Mocked<DashboardStateService>;
    let governanceConfigurationService: jest.Mocked<GovernanceConfigurationService>;
    let pptService: jest.Mocked<GovernanceDashboardPptService>;

    const recordHealthPayload = {
        total: 100,
        breakdown: [
            { status: 'ACTIVE', value: 50, label: 'Active' },
            { status: 'INACTIVE', value: 50, label: 'Inactive' },
        ],
    };

    const categoryWidgetPayload = {
        series: [
            { id: 'A', category: 'Cat A', total: 10, value: 10 },
            { id: 'B', category: 'Cat B', total: 20, value: 20 },
            { id: 'C', category: 'Cat C', total: 30, value: 30 },
        ],
    };

    beforeEach(() => {
        const mockDashboardStateService: Partial<Record<keyof DashboardStateService, unknown>> = {
            getWidgetData: jest.fn().mockReturnValue(of(null)),
            getStatusColor: jest.fn((status?: string) => (status ? '#123456' : '#CCCCCC')),
            loadWidgetOrder: jest.fn((order: WidgetId[]) => order),
            saveWidgetOrder: jest.fn(),
            clearWidgetCaches: jest.fn(),
        };

        const mockGovernanceConfigService: Partial<Record<keyof GovernanceConfigurationService, unknown>> = {
            getConfig: jest.fn().mockReturnValue(of({ dataSources: [{ id: 'EDS-MOCK' }] })),
        };

        const mockPptService: Partial<Record<keyof GovernanceDashboardPptService, unknown>> = {
            generateDashboardPpt: jest.fn().mockResolvedValue(undefined),
        };

        dashboardStateService = mockDashboardStateService as jest.Mocked<DashboardStateService>;
        governanceConfigurationService = mockGovernanceConfigService as jest.Mocked<GovernanceConfigurationService>;
        pptService = mockPptService as jest.Mocked<GovernanceDashboardPptService>;

        TestBed.configureTestingModule({
            imports: [DashboardManagementComponent, NoopTranslateModule, MatIconTestingModule],
            providers: [
                provideRouter([]),
                provideNativeDateAdapter(),
                {
                    provide: CategorySearchFilterService,
                    useValue: { getCategories: jest.fn().mockReturnValue(of([])) } as Partial<CategorySearchFilterService>,
                },
            ],
        });

        TestBed.overrideComponent(DashboardManagementComponent, {
            set: {
                providers: [
                    { provide: DashboardStateService, useValue: dashboardStateService },
                    { provide: GovernanceConfigurationService, useValue: governanceConfigurationService },
                    { provide: GovernanceDashboardPptService, useValue: pptService },
                ],
            },
        });

        fixture = TestBed.createComponent(DashboardManagementComponent);
        component = fixture.componentInstance;
    });

    it('should start with empty widget data and default dashboard settings', () => {
        expect(component.rawData()).toEqual({});
        expect(component.data()).toEqual({});
        expect(component.filtersByWidget).toEqual({});
        expect(component.lastRefresh()).toBeInstanceOf(Date);

        expect(component.loading()[WIDGET_ID.RecordHealth]).toBe(false);
        expect(component.currentSortOptions[WIDGET_ID.ActiveRetention]).toBe(SORT_OPTION.ValueDesc);
        expect(component.currentSortOptions[WIDGET_ID.LegalHoldSummary]).toBe(SORT_OPTION.ValueDesc);
        expect(component.selectedMonths[WIDGET_ID.CutoffTracker]).toBeInstanceOf(Date);
    });

    it('should load configuration on init and trigger a refresh of all widgets', () => {
        const refreshSpy = jest.spyOn(component, 'refreshAll');

        component.ngOnInit();

        expect(governanceConfigurationService.getConfig).toHaveBeenCalledTimes(1);
        expect(refreshSpy).toHaveBeenCalledTimes(1);
        expect(component.edsId).toBe('EDS-MOCK');
    });

    it('should update the selected month and reload cutoff tracker data when the user changes the month filter', () => {
        const date = new Date(2023, 3, 4);
        (dashboardStateService.getWidgetData as jest.Mock).mockReturnValue(of(categoryWidgetPayload as any));

        component.onMonthChange({ date, widgetId: WIDGET_ID.CutoffTracker as WidgetId });

        expect(component.selectedMonths[WIDGET_ID.CutoffTracker]).toEqual(date);
        expect(dashboardStateService.getWidgetData).toHaveBeenCalledWith(WIDGET_ID.CutoffTracker, { date });
    });

    it('should update sort option for the widget when the user changes sort', () => {
        component.onSortOptionChange({ widgetId: WIDGET_ID.ActiveRetention as WidgetId, value: SORT_OPTION.ValueAsc });

        expect(component.currentSortOptions[WIDGET_ID.ActiveRetention]).toBe(SORT_OPTION.ValueAsc);
    });

    it('should use the dashboard status color mapping when rendering status indicators', () => {
        (dashboardStateService.getStatusColor as jest.Mock).mockReturnValueOnce('#ABCDEF');

        expect(component.getStatusColor('ACTIVE')).toBe('#ABCDEF');
        expect(dashboardStateService.getStatusColor).toHaveBeenCalledWith('ACTIVE');

        expect(component.getStatusColor(undefined)).toBe('#CCCCCC');
    });

    it('should store raw widget results as they arrive so filtering can be applied later', () => {
        component['setData'](WIDGET_ID.RecordHealth as WidgetId, recordHealthPayload as any);

        expect(component.rawData()[WIDGET_ID.RecordHealth]).toEqual(recordHealthPayload);
    });

    it('should filter a widget series from the raw data when the user applies a filter', () => {
        component['setData'](WIDGET_ID.ActiveRetention as WidgetId, categoryWidgetPayload as any);

        component.onWidgetFilter(WIDGET_ID.ActiveRetention as WidgetId, ['B', 'C']);

        const filtered = component.data()[WIDGET_ID.ActiveRetention] as any;
        expect(filtered.series.map((s: any) => s.id)).toEqual(['B', 'C']);
    });

    it('should restore the full series when the user clears a widget filter', () => {
        component['setData'](WIDGET_ID.ActiveRetention as WidgetId, categoryWidgetPayload as any);

        component.onWidgetFilter(WIDGET_ID.ActiveRetention as WidgetId, ['B']);
        component.onWidgetFilter(WIDGET_ID.ActiveRetention as WidgetId, null);

        const restored = component.data()[WIDGET_ID.ActiveRetention] as any;
        expect(restored.series.map((s: any) => s.id)).toEqual(['A', 'B', 'C']);
    });

    it('should refresh record health data when the record health category filter changes', () => {
        const spy = jest.spyOn(component, 'onRecordHealthFilter');

        component.onCategoryChange(WIDGET_ID.RecordHealth as WidgetId, ['ACTIVE']);

        expect(component.filtersByWidget[WIDGET_ID.RecordHealth]).toEqual(['ACTIVE']);
        expect(spy).toHaveBeenCalledWith('ACTIVE');
    });

    it('should request record health using the selected category id', () => {
        (dashboardStateService.getWidgetData as jest.Mock).mockReturnValue(of(recordHealthPayload as any));

        component.onRecordHealthFilter('C#2');

        expect(dashboardStateService.getWidgetData).toHaveBeenCalledWith(WIDGET_ID.RecordHealth, { categoryId: 'C#2' });
    });

    it('should include the selected record health category in navigation query params', () => {
        component.edsId = 'EDS-MOCK';
        component.filtersByWidget[WIDGET_ID.RecordHealth] = ['C#2'];

        expect(component.getRecordHealthQueryParams()).toEqual({ eds: 'EDS-MOCK', categoryId: 'C#2' });
        expect(component.getRecordHealthQueryParams('ACTIVE' as any)).toEqual({
            eds: 'EDS-MOCK',
            status: 'ACTIVE',
            categoryId: 'C#2',
        });
    });

    it('should omit the record health category from navigation query params when no category filter is selected', () => {
        component.edsId = 'EDS-MOCK';

        expect(component.getRecordHealthQueryParams()).toEqual({ eds: 'EDS-MOCK' });
    });

    it('should expose dashboard source query params for legal hold drill-down navigation', () => {
        expect(component.legalHoldSummaryNavigationQueryParamOverrides).toEqual({ source: 'dashboard' });
    });

    it('should apply widget filtering when a non-record-health category filter changes', () => {
        component['setData'](WIDGET_ID.ActiveRetention as WidgetId, categoryWidgetPayload as any);
        component.onCategoryChange(WIDGET_ID.ActiveRetention as WidgetId, ['B']);

        const filtered = component.data()[WIDGET_ID.ActiveRetention] as any;
        expect(filtered.series.map((s: any) => s.id)).toEqual(['B']);
    });

    it('should apply widget filtering when a legal case filter changes', () => {
        component['setData'](WIDGET_ID.LegalHoldSummary as WidgetId, categoryWidgetPayload as any);

        component.onLegalCaseChange(WIDGET_ID.LegalHoldSummary as WidgetId, ['A', 'C']);

        const filtered = component.data()[WIDGET_ID.LegalHoldSummary] as any;
        expect(filtered.series.map((s: any) => s.id)).toEqual(['A', 'C']);
    });

    it('should normalize a cleared legal case filter before applying it', () => {
        const widgetId = WIDGET_ID.LegalHoldSummary as WidgetId;
        const onWidgetFilterSpy = jest.spyOn(component, 'onWidgetFilter');

        component.onLegalCaseChange(widgetId, null);

        expect(component.filtersByWidget[widgetId]).toEqual([]);
        expect(onWidgetFilterSpy).toHaveBeenCalledWith(widgetId, []);
    });

    it('should keep legal case filter options sourced from raw legal hold data after filtering', () => {
        component['setData'](WIDGET_ID.LegalHoldSummary as WidgetId, categoryWidgetPayload as any);
        component.onLegalCaseChange(WIDGET_ID.LegalHoldSummary as WidgetId, ['A']);
        fixture.detectChanges();

        const widgetElements = fixture.debugElement.queryAll(By.css('hxp-dashboard-widget'));
        const legalHoldWidgetElement = widgetElements.find(
            (widgetElement) => widgetElement.componentInstance.widgetId() === WIDGET_ID.LegalHoldSummary
        );

        expect(legalHoldWidgetElement).toBeTruthy();
        expect(legalHoldWidgetElement?.componentInstance.legalCaseItems()).toEqual(categoryWidgetPayload.series);
    });

    it('should fetch widget data and update the dashboard when the user refreshes', () => {
        (dashboardStateService.getWidgetData as jest.Mock)
            .mockReturnValueOnce(of(recordHealthPayload as any))
            .mockReturnValue(of(categoryWidgetPayload as any));

        const oldRefresh = component.lastRefresh();
        component.filtersByWidget = { [WIDGET_ID.ActiveRetention]: ['B'] } as any;

        component.refreshAll();

        expect(component.filtersByWidget).toEqual({});
        expect(component.lastRefresh().getTime()).not.toBe(oldRefresh.getTime());
        expect(dashboardStateService.clearWidgetCaches).toHaveBeenCalledTimes(1);
        expect(dashboardStateService.getWidgetData).toHaveBeenCalled();
    });

    it('should mark a widget as failed when the dashboard service returns null', () => {
        (dashboardStateService.getWidgetData as jest.Mock).mockReturnValue(of(null));

        component.retryWidget(WIDGET_ID.ActiveRetention as WidgetId);

        expect(component.error()[WIDGET_ID.ActiveRetention]).toBe(true);
        expect(component.loading()[WIDGET_ID.ActiveRetention]).toBe(false);
    });

    it('should clear widget error state and replace it with data after a successful retry', () => {
        const widgetId = WIDGET_ID.ActiveRetention as WidgetId;
        (dashboardStateService.getWidgetData as jest.Mock).mockReturnValue(of(categoryWidgetPayload as any));
        component.error.set({ ...component.error(), [widgetId]: true });

        component.retryWidget(widgetId);

        expect(component.error()[widgetId]).toBe(false);
        expect(component.data()[widgetId]).toEqual(categoryWidgetPayload as any);
    });

    it('should retry record health using the current category filter', () => {
        (dashboardStateService.getWidgetData as jest.Mock).mockReturnValue(of(recordHealthPayload as any));
        component.filtersByWidget = { [WIDGET_ID.RecordHealth]: ['C#2'] } as any;

        component.retryWidget(WIDGET_ID.RecordHealth as WidgetId);

        expect(dashboardStateService.getWidgetData).toHaveBeenCalledWith(WIDGET_ID.RecordHealth, { categoryId: 'C#2' });
    });

    it('should retry cutoff tracker using the currently selected month', () => {
        const selectedDate = new Date(2026, 11, 3);
        (dashboardStateService.getWidgetData as jest.Mock).mockReturnValue(of(categoryWidgetPayload as any));
        component.selectedMonths[WIDGET_ID.CutoffTracker] = selectedDate;

        component.retryWidget(WIDGET_ID.CutoffTracker as WidgetId);

        expect(dashboardStateService.getWidgetData).toHaveBeenCalledWith(WIDGET_ID.CutoffTracker, { date: selectedDate });
    });

    it('should export the current displayed snapshot when the user exports to PPT', () => {
        component['setData'](WIDGET_ID.ActiveRetention as WidgetId, categoryWidgetPayload as any);
        component.onWidgetFilter(WIDGET_ID.ActiveRetention as WidgetId, ['B']);

        component.exportToPPT();

        expect(pptService.generateDashboardPpt).toHaveBeenCalledTimes(1);

        const args = (pptService.generateDashboardPpt as jest.Mock).mock.calls[0][0];
        expect(args.snapshot).toEqual(component.data());
        expect(args.widgetOrder).toEqual(component.widgetOrder);
    });

    it('should let the user reorder widgets and persist the new order', () => {
        component.widgetOrder = [
            WIDGET_ID.RecordHealth,
            WIDGET_ID.ActiveRetention,
            WIDGET_ID.MissingProperties,
            WIDGET_ID.CutoffTracker,
            WIDGET_ID.DispositionTracker,
        ] as unknown as WidgetId[];

        const event = { previousIndex: 0, currentIndex: 3 } as unknown as CdkDragDrop<string[]>;

        component.drop(event);

        expect(component.widgetOrder).toEqual([
            WIDGET_ID.ActiveRetention,
            WIDGET_ID.MissingProperties,
            WIDGET_ID.CutoffTracker,
            WIDGET_ID.RecordHealth,
            WIDGET_ID.DispositionTracker,
        ]);

        expect(dashboardStateService.saveWidgetOrder).toHaveBeenCalledTimes(1);
        expect(dashboardStateService.saveWidgetOrder).toHaveBeenCalledWith(component.widgetOrder);
    });

    it('should keep the same widget order when the user drops a widget back in the same position', () => {
        const initialOrder = [
            WIDGET_ID.RecordHealth,
            WIDGET_ID.ActiveRetention,
            WIDGET_ID.MissingProperties,
            WIDGET_ID.CutoffTracker,
            WIDGET_ID.DispositionTracker,
        ] as unknown as WidgetId[];

        component.widgetOrder = [...initialOrder];

        const event = { previousIndex: 2, currentIndex: 2 } as unknown as CdkDragDrop<string[]>;

        component.drop(event);

        expect(component.widgetOrder).toEqual(initialOrder);
        expect(dashboardStateService.saveWidgetOrder).toHaveBeenCalledWith(component.widgetOrder);
    });

    it('should let the user open the records list from the total records link', () => {
        (dashboardStateService.getWidgetData as jest.Mock).mockReturnValue(of(recordHealthPayload as any));

        component.ngOnInit();
        component.onRecordHealthFilter('ACTIVE');
        fixture.detectChanges();

        const anchorDe = fixture.debugElement.query(By.css('.hxp-total'));
        expect(anchorDe).toBeTruthy();

        const anchorEl = anchorDe.nativeElement as HTMLAnchorElement;
        expect(anchorEl.textContent?.trim()).toBe('100');

        const hrefAttr = anchorEl.getAttribute('href') ?? '';
        expect(hrefAttr).toContain('/governance/records');
        expect(hrefAttr).toContain('eds=');
    });

    it('should let the user navigate to a filtered records list from the legend', () => {
        (dashboardStateService.getWidgetData as jest.Mock).mockReturnValue(of(recordHealthPayload as any));

        component.ngOnInit();
        component.onRecordHealthFilter('ACTIVE');
        fixture.detectChanges();

        const legendAnchorDe = fixture.debugElement.query(By.css('.hxp-legend-item'));
        expect(legendAnchorDe).toBeTruthy();

        const legendAnchorEl = legendAnchorDe.nativeElement as HTMLAnchorElement;
        const hrefAttr = legendAnchorEl.getAttribute('href') ?? '';
        expect(hrefAttr).toContain('/governance/records');
    });

    it('should pass accessibility checks', async () => {
        fixture.detectChanges();

        const res = await a11yReport(fixture.nativeElement);

        expect(res?.violations).toEqual([]);
    });
});
