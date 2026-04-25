/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page, Locator } from '@playwright/test';
import { BaseComponent, materialLocators } from '@alfresco-dbp/playwright/shared';

export class HxpDashboardManagementComponent extends BaseComponent {
    static readonly rootElement = '.hxp-dashboard-landing';

    constructor(page: Page) {
        super(page, HxpDashboardManagementComponent.rootElement);
    }

    topBar = this.getChild('.hxp-dashboard-topbar');
    lastRefreshText = this.getChild('.hxp-last-refresh');
    refreshButton = this.getChild('.hxp-refresh-btn');
    exportButton = this.getChild('.hxp-export-btn');
    dashboardGrid = this.getChild('.hxp-dashboard-grid');
    allWidgets = this.getChild('hxp-dashboard-widget');
    widgetWrappers = this.getChild('.hxp-widget-wrapper');

    get datePicker(): Locator {
        return this.page.locator(materialLocators.DatePicker.root);
    }

    get dropdownPanel(): Locator {
        return this.page.locator('.cdk-overlay-pane');
    }

    get dropdownOptions(): Locator {
        return this.page.locator(`${materialLocators.Option.class}, ${materialLocators.Option.root}`);
    }

    get loadingSpinner(): Locator {
        return this.getChild(`${materialLocators.ProgressSpinner.root}, ${materialLocators.ProgressSpinner.class}`);
    }

    get recordHealthWidget(): Locator {
        return this.getChild('hxp-dashboard-widget').filter({ hasText: 'Record Health' });
    }

    get activeRetentionWidget(): Locator {
        return this.getChild('hxp-dashboard-widget').filter({ hasText: 'Active Retention Status' });
    }

    get cutoffTrackerWidget(): Locator {
        return this.getChild('hxp-dashboard-widget').filter({ hasText: 'Cutoff Tracker' });
    }

    get incompleteRecordWidget(): Locator {
        return this.getChild('hxp-dashboard-widget').filter({ hasText: 'Incomplete Record' });
    }

    get dispositionTrackerWidget(): Locator {
        return this.getChild('hxp-dashboard-widget').filter({ hasText: 'Disposition Tracker' });
    }

    get totalRecordsValue(): Locator {
        return this.recordHealthWidget.locator('a.hxp-total, .hxp-total').first();
    }

    get totalRecordsLabel(): Locator {
        return this.recordHealthWidget.locator('.hxp-label', { hasText: 'Total Records' });
    }

    get recordsByStatusLabel(): Locator {
        return this.recordHealthWidget.locator('.hxp-label', { hasText: 'Records by Status' });
    }

    get recordHealthLegend(): Locator {
        return this.recordHealthWidget.locator('.hxp-legend');
    }

    get recordHealthDonutChart(): Locator {
        return this.recordHealthWidget.locator('hxp-cic-gov-donut-chart').first();
    }

    getLegendItem(status: string): Locator {
        return this.recordHealthLegend.locator('.hxp-legend-item', { hasText: status });
    }

    getCategoryChip(widgetLocator: Locator): Locator {
        return widgetLocator.locator(
            `hxp-governance-search-category-filter .hxp-governance-search-filter-chip, hxp-governance-search-category-filter ${materialLocators.Chip.root}`
        );
    }

    getMonthChip(widgetLocator: Locator): Locator {
        return widgetLocator.locator(`${materialLocators.Chip.root}`, { hasText: /This Month|Month/ });
    }

    getColumnChart(widgetLocator: Locator): Locator {
        return widgetLocator.locator('hxp-cicgov-column-chart').first();
    }

    getDonutChart(widgetLocator: Locator): Locator {
        return widgetLocator.locator('hxp-cic-gov-donut-chart').first();
    }

    getEmptyState(widgetLocator: Locator): Locator {
        return widgetLocator.locator('hxp-empty-widget-state');
    }

    getLoadingState(widgetLocator: Locator): Locator {
        return widgetLocator.locator(`${materialLocators.ProgressSpinner.root}, ${materialLocators.ProgressSpinner.class}`);
    }

    getWidgetHeading(widgetLocator: Locator): Locator {
        return widgetLocator.locator('.hxp-widget-heading').first();
    }

    getWidgetSubtitle(widgetLocator: Locator): Locator {
        return widgetLocator.locator('.hxp-widget-subtitle').first();
    }

    getWidgetContent(widgetLocator: Locator): Locator {
        return widgetLocator.locator('.hxp-widget-content');
    }

    get categorySelectionList(): Locator {
        return this.page.locator('.hxp-governance-multi-selection-filter-list');
    }

    get categoryListOptions(): Locator {
        return this.page.locator('.hxp-governance-multi-selection-filter-list-option');
    }

    get applyButton(): Locator {
        return this.page.locator('.hxp-governance-search-filter-overlay-actions-apply');
    }

    get clearButton(): Locator {
        return this.page.locator('.hxp-governance-search-filter-overlay-actions-clear');
    }
}
