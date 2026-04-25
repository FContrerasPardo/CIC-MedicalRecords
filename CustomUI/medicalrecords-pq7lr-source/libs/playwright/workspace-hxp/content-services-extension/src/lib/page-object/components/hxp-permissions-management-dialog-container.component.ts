/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent, DropdownListComponent, MatDialogContainer } from '@alfresco-dbp/playwright/shared';

export class HxpPermissionsManagementDialogContainer extends BaseComponent {
    static readonly rootElement = '.hxp-permissions-management-dialog';
    dropdownList = new DropdownListComponent(this.page, '.cdk-overlay-container');
    matDialogContainer = new MatDialogContainer(this.page);

    constructor(page: Page) {
        super(page, HxpPermissionsManagementDialogContainer.rootElement);
    }

    savePermissionFormButton = this.getChild('.hxp-save-permission-button');
    permissionColumn = this.page.locator('.hxp-permission-select #hxp-user-permission');
    inheritedPermissionColumn = this.getChild('.hxp-inherited-permission');
    individualUserPermissionStatusLabel = this.getChild('.hxp-entity-details .hxp-users-icon').first();
    restorePermissionsButton = this.getChild('.hxp-restore-button');
    dialogBoxRestoreButton = this.matDialogContainer.getButtonByExactText('Restore');
    // Entity refers to both User Groups and Individual Users
    private addEntityButton = this.getChild('#hxp-add-permission-button');
    private addEntityTextInput = this.getChild('#hxp-add-permissions-text-search');
    private addPermissionDropdown = this.page.locator('#hxp-permission-select');
    private permissionTableContent = this.getChild('.hxp-permission-dialog-list');

    getPermissionInheritanceToggle = (state: 'On' | 'Off') =>
        state === 'On'
            ? this.getChild('.hxp-inheritance-toggle-container button[aria-checked="false"]')
            : this.getChild('.hxp-inheritance-toggle-container button[aria-checked="true"]');
    getPermissionTableEntityCell = (entityName: string) => this.permissionTableContent.locator('.hxp-entity-details', { hasText: entityName });
    getInheritedIndividualUsersPermission = (user: string) => this.getChild('.hxp-permission-row').filter({ hasText: user });
    selectEditablePermission = (text: string) => this.page.locator('#hxp-user-permission-panel').locator('span', { hasText: text }).first();
    getRestorePermissionsOptions = (text: string) => this.matDialogContainer.getRadioButtonByNameLocator(text);

    async addPermissionToEntity(entity: string, permission: string): Promise<void> {
        await this.addEntityTextInput.fill(entity);
        await this.dropdownList.getOptionLocator(entity).click();
        await this.addPermissionDropdown.click();
        await this.dropdownList.getOptionLocator(permission).first().click();
        await this.addEntityButton.click();
        await this.savePermissionFormButton.click();
    }

    async editPermissionToEntity(permission: string): Promise<void> {
        await this.permissionColumn.click();
        await this.selectEditablePermission(permission).click();
        await this.savePermissionFormButton.click();
    }

    async switchToTab(tabName: 'User Groups' | 'Individual Users'): Promise<void> {
        await this.getRootLocator.getByRole('tab').getByText(tabName).click();
        await this.spinnerWaitForReload({ locator: '[role="tabpanel"].ng-animating' });
    }
}
