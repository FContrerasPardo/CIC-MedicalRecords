/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { SideNavbarComponent } from '@alfresco-dbp/playwright/shared';

const ContentExpandableMenuLabels = {
    ProcessManagement: 'Process Management',
    ContentManagement: 'Content Management',
} as const;
type ContentExpandableMenuLabels = typeof ContentExpandableMenuLabels[keyof typeof ContentExpandableMenuLabels];

const ProcessManagementIds = {
    MyTasks: 'my-tasks_filter',
    QueuedTasks: 'queued-tasks_filter',
    CompletedTasks: 'completed-tasks_filter',
    RunningProcesses: 'running-processes_filter',
    CompletedProcesses: 'completed-processes_filter',
    AllProcesses: 'all-processes_filter',
} as const;
type ProcessManagementIds = typeof ProcessManagementIds[keyof typeof ProcessManagementIds];

const ContentBrowserLabels = {
    HomeLabel: 'Home',
} as const;
type ContentBrowserLabels = typeof ContentBrowserLabels[keyof typeof ContentBrowserLabels];

const ProcessManagementLabels = {
    MyTasks: 'MyTasks',
    QueuedTasks: 'QueuedTasks',
    CompletedTasks: 'CompletedTasks',
    RunningProcesses: 'RunningProcesses',
    CompletedProcesses: 'CompletedProcesses',
    AllProcesses: 'AllProcesses',
} as const;
type ProcessManagementLabels = typeof ProcessManagementLabels[keyof typeof ProcessManagementLabels];

export class AppSideNavComponent extends SideNavbarComponent {
    static rootElement = '.adf-layout-container-sidenav';

    constructor(page: Page) {
        super(page, AppSideNavComponent.rootElement);
    }

    private leftMenuItemPanel = '.hxp-node-container';
    private sideNavPanelTitle = '.hxp-panel-title';

    searchButton = this.getElementByAutomationId('hxp-search-menu-item');
    queuedTaskCounter = this.getElementByAutomationId('queued-tasks_filter-counter');
    queuedTasksCounterActive = this.getChild('[data-automation-id="queued-tasks_filter-counter"][class*="adf-active"]');

    getSidenavItemLabel = (label: ProcessManagementLabels) => this.getElementByAutomationId(ProcessManagementIds[label as keyof typeof ProcessManagementIds]);
    getSideNavbarTitle = (titleName: string) => this.getChild(this.sideNavPanelTitle, { hasText: titleName });
    getContentMenuItemByName = (headerName: string) => this.getChild(this.leftMenuItemPanel, { hasText: headerName });
    getRowByName = (name: string) => this.getChild('hxp-workspace-document-tree .hxp-node-container', { hasText: name.toString() });
    getDocumentInContentTreeByName = (documentToFind: string) => this.getChild('[role = "treeitem"]', { hasText: documentToFind.toString() });

    getEllipsisByTitle = (documentTitle: string) =>
        this.getDocumentInContentTreeByName(documentTitle).locator('.hxp-context-btn').locator('[data-automation-id="document-tree-context-menu-button"]');

    async clickEllipsisMenuByTitle(documentTitle: string): Promise<void> {
        const treeItem = this.getDocumentInContentTreeByName(documentTitle);
        await treeItem.hover();
        await this.getEllipsisByTitle(documentTitle).click({ force: true });
    }

    /**
     *
     * original navigateTo retrieves locator via automation-id
     * hxpContentBrowserNavigateTo retrieves locator from children of element with class hxp-node-container
     * with a particular text, because the document tree is generated dynamically and there is no automation-id.
     *
     */
    override async navigateTo(buttonName: ProcessManagementLabels | ContentBrowserLabels, parentExpandablePanelName?: string): Promise<void> {

        const processExpandableButtons = Object.values<string>(ProcessManagementLabels);
        if (processExpandableButtons.includes(buttonName)) {
            return super.navigateTo(ProcessManagementIds[buttonName as keyof typeof ProcessManagementIds], parentExpandablePanelName);
        }
        const contentExpandableButtons = Object.values<string>(ContentBrowserLabels);
        if (contentExpandableButtons.includes(buttonName)) {
            return this.contentBrowserNavigateTo(buttonName, parentExpandablePanelName);
        }
    }

    async contentBrowserNavigateTo(
        menuItem: string,
        parentExpandablePanelName: string = ContentExpandableMenuLabels.ContentManagement
    ): Promise<void> {
        if (parentExpandablePanelName) {
            await this.expandPanelHeader(parentExpandablePanelName);
        }
        await this.getContentMenuItemByName(menuItem).dblclick();
        await this.spinnerWaitForReload();
    }
}
