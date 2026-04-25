/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NoopAuthModule, NoopTranslateModule } from '@alfresco/adf-core';
import { UserFilterMenuComponent } from './user-filter-menu.component';
import { getClearSelectionButton, getUpdateButton } from '../../../../utils/filter-testing-utils';

describe('UserFilterMenuComponent', () => {
    let component: UserFilterMenuComponent;
    let fixture: ComponentFixture<UserFilterMenuComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NoopAnimationsModule, NoopTranslateModule, UserFilterMenuComponent, NoopAuthModule],
        });

        fixture = TestBed.createComponent(UserFilterMenuComponent);
        component = fixture.componentInstance;
    });

    it('should enable clear selection button when there are selected users', async () => {
        component.selectedUsers = [{ id: 'mockId', username: 'mockUsername' }];
        fixture.detectChanges();

        const clearSelectionButton = fixture.debugElement.nativeElement.querySelector(
            '[data-automation-id="hxp-filter-menu-clear-selection-button"]'
        );
        expect(clearSelectionButton.disabled).toBe(false);
    });

    it('should disable clear selection button when there are no selected users', async () => {
        component.selectedUsers = [];
        fixture.detectChanges();

        const clearSelectionButton = fixture.debugElement.nativeElement.querySelector(
            '[data-automation-id="hxp-filter-menu-clear-selection-button"]'
        );
        expect(clearSelectionButton.disabled).toBe(true);
    });

    it('should clear selected users when clear button is clicked', async () => {
        component.selectedUsers = [{ id: 'mockId', username: 'mockUsername' }];
        fixture.detectChanges();

        const clearSelectionButton = await getClearSelectionButton(fixture);
        await clearSelectionButton.click();

        expect(component.selectedUsers.length).toBe(0);
    });

    it('should emit update with selected users on update button click', async () => {
        jest.spyOn(component.update, 'emit');
        component.selectedUsers = [{ id: 'mockId', username: 'mockUsername' }];
        fixture.detectChanges();

        const updateButton = await getUpdateButton(fixture);
        await updateButton.click();

        expect(component.update.emit).toHaveBeenCalledWith(component.selectedUsers);
    });
});
