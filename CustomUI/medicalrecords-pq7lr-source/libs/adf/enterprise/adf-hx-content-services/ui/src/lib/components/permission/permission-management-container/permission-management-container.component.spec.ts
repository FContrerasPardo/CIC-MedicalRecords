/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PermissionManagementContainerComponent } from './permission-management-container.component';
import {
    provideAdfEnterpriseAdfHxContentServicesServices,
    DocumentService,
    IDENTITY_USER_SERVICE_TOKEN,
    IIdentityUserService,
    NewPermissionEntity,
    PermissionsManagementFacade,
    PermissionsManagementStateService,
    UserType,
} from '@alfresco/adf-hx-content-services/services';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { mockHxcsJsClientConfigurationService } from '@alfresco/adf-hx-content-services/api';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MockProvider } from 'ng-mocks';
import { jestMocks } from '@hxp/workspace-hxp/shared/testing';
import { TabsHarnessUtils } from '@alfresco-dbp/shared-testing/util/component-harnesses';
import { By } from '@angular/platform-browser';
import { firstValueFrom, of } from 'rxjs';
import { AddPermissionComponent } from '../add-permission/add-permission.component';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatSlideToggleHarness } from '@angular/material/slide-toggle/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { HarnessLoader } from '@angular/cdk/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';

const mockIdentityUserService = {
    getCurrentUserInfo: () => ({ id: '0000-fake-user-uuid-0000' }),
} as unknown as IIdentityUserService;

describe('PermissionManagementContainerComponent', () => {
    let component: PermissionManagementContainerComponent;
    let fixture: ComponentFixture<PermissionManagementContainerComponent>;

    const mockDialogRef = {
        close: jest.fn(),
        afterClosed: jest.fn(() => of({ save: false })),
    };

    const documentWithAcl = {
        ...jestMocks.documentWithAcl,
        sys_effectiveAcl: [
            ...jestMocks.documentWithAcl.sys_acl,
            {
                creator: 'creator-id-1',
                permission: 'Everything',
                group: {
                    id: 'id-6',
                    name: 'groupName6',
                },
                granted: true,
                status: 'EFFECTIVE',
            },
            {
                creator: 'creator-id-1',
                permission: 'Everything',
                user: {
                    id: 'id-5',
                    lastName: 'Lenders',
                    firstName: 'Mark',
                },
                granted: true,
                status: 'EFFECTIVE',
            },
        ],
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PermissionManagementContainerComponent, MatSnackBarModule, NoopTranslateModule, NoopAnimationsModule, MatIconTestingModule],
            providers: [
                provideAdfEnterpriseAdfHxContentServicesServices(),
                mockHxcsJsClientConfigurationService,
                DocumentService,
                MockProvider(IDENTITY_USER_SERVICE_TOKEN, mockIdentityUserService),
                { provide: MatDialogRef, useValue: mockDialogRef },
                PermissionsManagementFacade,
                PermissionsManagementStateService,
                {
                    provide: MAT_DIALOG_DATA,
                    useValue: {
                        document: documentWithAcl,
                    },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(PermissionManagementContainerComponent);
        component = fixture.componentInstance;
        component.document = jestMocks.fileDocument;
        fixture.detectChanges();
    });

    afterEach(() => {
        const dialogRefSpy = TestBed.inject(MatDialogRef);
        (dialogRefSpy?.close as jest.Mock).mockReset();
    });

    it('should change user type on tab selection', async () => {
        const tabs = await TabsHarnessUtils.getTabs({ fixture });

        await tabs[0].select();

        expect(await tabs[0].getLabel()).toEqual('PERMISSIONS_MANAGEMENT_ACTION.PERMISSIONS_TABLE.GROUPS');

        await tabs[1].select();

        expect(await tabs[1].getLabel()).toBe('PERMISSIONS_MANAGEMENT_ACTION.PERMISSIONS_TABLE.USERS');
    });

    it('should receive NewPermissionEntity when new permission added', () => {
        const permissionsManagementFacade = fixture.debugElement.injector.get<PermissionsManagementFacade>(PermissionsManagementFacade);
        const mockNewPermission: NewPermissionEntity = jestMocks.permission as NewPermissionEntity;
        const addPermissionComponent = fixture.debugElement.query(By.css('#hxp-add-user-group'));
        jest.spyOn(permissionsManagementFacade, 'onAddNewPermissionsManagementRow').mockImplementation(() => {});

        expect(permissionsManagementFacade.onAddNewPermissionsManagementRow).not.toHaveBeenCalled();

        addPermissionComponent.triggerEventHandler('addNewPermission', mockNewPermission);

        expect(permissionsManagementFacade.onAddNewPermissionsManagementRow).toHaveBeenCalledWith(mockNewPermission);
    });

    it('should filter individual user', async () => {
        const permissionsManagementFacade = fixture.debugElement.injector.get<PermissionsManagementFacade>(PermissionsManagementFacade);
        const onSearchUserFieldSpy = jest.spyOn(permissionsManagementFacade, 'onSearchUserField');

        expect(onSearchUserFieldSpy).not.toHaveBeenCalled();

        const tabs = await TabsHarnessUtils.getTabs({ fixture });
        await tabs[1].select();
        const filterUser = fixture.debugElement.query(By.css('#hxp-permission-search-user'));
        filterUser.triggerEventHandler('search', 'user');

        expect(onSearchUserFieldSpy).toHaveBeenCalled();
    });

    it('should filter user group', () => {
        const permissionsManagementFacade = fixture.debugElement.injector.get<PermissionsManagementFacade>(PermissionsManagementFacade);
        const onSearchGroupFieldSpy = jest.spyOn(permissionsManagementFacade, 'onSearchGroupField');

        expect(onSearchGroupFieldSpy).not.toHaveBeenCalled();

        const filterGroup = fixture.debugElement.query(By.css('#hxp-permission-search-group'));
        filterGroup.triggerEventHandler('search', 'group');

        expect(onSearchGroupFieldSpy).toHaveBeenCalled();
    });

    it('should search user group', () => {
        const permissionsManagementFacade = fixture.debugElement.injector.get<PermissionsManagementFacade>(PermissionsManagementFacade);
        const searchGroupSpy = jest.spyOn(permissionsManagementFacade, 'onNewGroupField');

        expect(searchGroupSpy).not.toHaveBeenCalled();

        const searchGroup = fixture.debugElement.query(By.css('#hxp-add-user-group'));
        searchGroup.triggerEventHandler('search', 'group');

        expect(searchGroupSpy).toHaveBeenCalled();
    });

    it('should search individual user', async () => {
        const permissionsManagementFacade = fixture.debugElement.injector.get<PermissionsManagementFacade>(PermissionsManagementFacade);
        const searchIndividualsSpy = jest.spyOn(permissionsManagementFacade, 'onNewUserField');
        const tabs = await TabsHarnessUtils.getTabs({ fixture });
        await tabs[1].select();

        expect(searchIndividualsSpy).not.toHaveBeenCalled();

        const addPermissionComponent = fixture.debugElement.query(By.directive(AddPermissionComponent));
        addPermissionComponent.triggerEventHandler('search', 'abc');

        expect(searchIndividualsSpy).toHaveBeenCalled();
    });

    it('should update isInheritanceEnabled and toggle save button state when inheritance is toggled', async () => {
        const loader: HarnessLoader = TestbedHarnessEnvironment.loader(fixture);
        const slideToggleHarness = await loader.getHarness(MatSlideToggleHarness);
        const saveButton = await loader.getHarness(MatButtonHarness.with({ selector: '.hxp-save-permission-button' }));

        // Initial state: inheritance enabled and save button disabled
        const isInheritanceEnabled = await firstValueFrom((component as any).isInheritanceEnabled$);

        expect(isInheritanceEnabled).toBe(true);
        expect(await saveButton.isDisabled()).toBe(true);

        // Simulate unchecking the toggle to disable inheritance
        await slideToggleHarness.uncheck();
        fixture.detectChanges();

        const isInheritanceEnabledAfterToggleOff = await firstValueFrom((component as any).isInheritanceEnabled$);

        expect(isInheritanceEnabledAfterToggleOff).toBe(false); // Inheritance disabled
        expect(await saveButton.isDisabled()).toBe(false);

        // Simulate checking the toggle to enable inheritance
        await slideToggleHarness.check();
        fixture.detectChanges();

        const isInheritanceEnabledAfterToggleOn = await firstValueFrom((component as any).isInheritanceEnabled$);

        expect(isInheritanceEnabledAfterToggleOn).toBe(true);
        expect(await saveButton.isDisabled()).toBe(true);
    });

    it('should restore document permissions when restoreDocumentPermissions is called', () => {
        const permissionsManagementFacade = fixture.debugElement.injector.get<PermissionsManagementFacade>(PermissionsManagementFacade);
        const restorePermissionsToInheritedSpy = jest.spyOn(permissionsManagementFacade, 'restorePermissionsToInherited').mockReturnValue(of(true));

        expect(restorePermissionsToInheritedSpy).not.toHaveBeenCalled();

        component.restorePermissions(UserType.ALL);

        expect(restorePermissionsToInheritedSpy).toHaveBeenCalledTimes(1);
        expect(restorePermissionsToInheritedSpy).toHaveBeenCalledWith(UserType.ALL);
    });
});
