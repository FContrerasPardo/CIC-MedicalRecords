/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NoopTranslateModule } from '@alfresco/adf-core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { jestMocks } from '@hxp/workspace-hxp/shared/testing';
import { PermissionsManagementPanelComponent } from './permissions-management-panel.component';
import { MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import {
    NewPermissionEntity,
    PermissionsPanelRequestService,
    IDENTITY_USER_SERVICE_TOKEN,
    IIdentityUserService,
    provideAdfEnterpriseAdfHxContentServicesServices,
    DocumentService,
    PermissionsManagementFacade,
    PermissionsManagementStateService,
    UserType,
    PermissionsDataAccessService,
} from '@alfresco/adf-hx-content-services/services';
import { MockProvider } from 'ng-mocks';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { mockHxcsJsClientConfigurationService } from '@alfresco/adf-hx-content-services/api';
import { of } from 'rxjs';
import { RestorePermissionDialogComponent } from '../cancel-permission-dialog/restore-permission-dialog.component';
import { DialogConfig } from '../../../util/dialog/config';
import { ButtonHarnessUtils } from '@alfresco-dbp/shared-testing/util/component-harnesses';
import { ACE } from '@hylandsoftware/hxcs-js-client';
import { MatIconTestingModule } from '@angular/material/icon/testing';

const mockIdentityUserService = {
    getCurrentUserInfo: () => ({ id: '0000-fake-user-uuid-0000' }),
} as unknown as IIdentityUserService;

const documentMock = {
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
    ] as ACE[],
};

describe('PermissionsManagementPanelComponent', () => {
    let fixture: ComponentFixture<PermissionsManagementPanelComponent>;
    let component: PermissionsManagementPanelComponent;
    let mockPermissionsDataAccessService: Partial<PermissionsDataAccessService>;
    let mockDocumentService: Partial<DocumentService>;

    const mockDialogRef = {
        close: jest.fn(),
        afterClosed: jest.fn(),
    };

    beforeEach(() => {
        mockPermissionsDataAccessService = {
            updateDocument: jest.fn().mockReturnValue(of(true))
        };

        mockDocumentService = {
            updateDocument: jest.fn().mockReturnValue(of({})),
            requestReload: jest.fn()
        };

        TestBed.configureTestingModule({
            imports: [MatSnackBarModule, NoopTranslateModule, NoopAnimationsModule, MatIconTestingModule],
            providers: [
                provideAdfEnterpriseAdfHxContentServicesServices(),
                mockHxcsJsClientConfigurationService,
                { provide: MatDialogRef, useValue: mockDialogRef },
                MockProvider(IDENTITY_USER_SERVICE_TOKEN, mockIdentityUserService),
                PermissionsManagementFacade,
                PermissionsManagementStateService,
                // Override services after all other providers
                { provide: DocumentService, useValue: mockDocumentService },
                { provide: PermissionsDataAccessService, useValue: mockPermissionsDataAccessService },
            ],
        });

        fixture = TestBed.createComponent(PermissionsManagementPanelComponent);
        component = fixture.componentInstance;
        component.document = documentMock;
        fixture.detectChanges();
    });

    it('should request to close the panel', () => {
        const permissionsPanelRequestService = TestBed.inject(PermissionsPanelRequestService);
        const spy = jest.spyOn(permissionsPanelRequestService, 'requestClosePanel');

        expect(spy).toHaveBeenCalledTimes(0);

        const nodeContainer = fixture.debugElement.query(By.css('.hxp-cancel-button'));
        nodeContainer.nativeElement.click();

        expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should open cancel popup when cancel button clicked and document is edited', () => {
        const matDialogService = (component as any).dialog;
        const dialogRefOpenSpy = jest.spyOn(matDialogService, 'open');
        const cancelButton = fixture.debugElement.query(By.css('.hxp-cancel-button'));
        cancelButton.nativeElement.click();

        expect(dialogRefOpenSpy).not.toHaveBeenCalled();

        const mockNewPermission: NewPermissionEntity = jestMocks.permission as NewPermissionEntity;
        const addPermissionComponent = fixture.debugElement.query(By.css('#hxp-add-user-group'));
        addPermissionComponent.triggerEventHandler('addNewPermission', mockNewPermission);
        fixture.detectChanges();
        cancelButton.nativeElement.click();

        expect(dialogRefOpenSpy).toHaveBeenCalled();
    });

    describe('Restore inherited permissions button', () => {
        it('should open restore dialog with correct configuration', async () => {
            const matDialogService = (component as any).dialog;
            const dialogRefOpenSpy = jest.spyOn(matDialogService, 'open').mockReturnValue({
                afterClosed: jest.fn(() => of({ restore: false })),
            });

            await ButtonHarnessUtils.clickButton({
                fixture,
                buttonFilters: {
                    selector: '.hxp-restore-button',
                },
            });

            expect(dialogRefOpenSpy).toHaveBeenCalledWith(RestorePermissionDialogComponent, {
                width: DialogConfig.small.width,
            });
        });

        it('should call container.restorePermissions when restore dialog result is true', async () => {
            const matDialogService = (component as any).dialog;
            const restoreOption = 'inherited';
            const mockDialogResult = { restore: true, option: restoreOption };

            jest.spyOn(matDialogService, 'open').mockReturnValue({
                afterClosed: jest.fn(() => of(mockDialogResult)),
            });

            const containerSpy = jest.spyOn(component.container, 'restorePermissions');

            await ButtonHarnessUtils.clickButton({
                fixture,
                buttonFilters: {
                    selector: '.hxp-restore-button',
                },
            });

            expect(containerSpy).toHaveBeenCalledWith(restoreOption);
        });

        it('should not call container.restorePermissions when restore dialog result is false', async () => {
            const matDialogService = (component as any).dialog;
            const mockDialogResult = { restore: false, option: 'inherited' };

            jest.spyOn(matDialogService, 'open').mockReturnValue({
                afterClosed: jest.fn(() => of(mockDialogResult)),
            });

            const containerSpy = jest.spyOn(component.container, 'restorePermissions');

            await ButtonHarnessUtils.clickButton({
                fixture,
                buttonFilters: {
                    selector: '.hxp-restore-button',
                },
            });

            expect(containerSpy).not.toHaveBeenCalled();
        });

        it('should not call container.restorePermissions when restore dialog result is undefined', async () => {
            const matDialogService = (component as any).dialog;

            jest.spyOn(matDialogService, 'open').mockReturnValue({
                afterClosed: jest.fn(() => of(undefined)),
            });

            const containerSpy = jest.spyOn(component.container, 'restorePermissions');

            await ButtonHarnessUtils.clickButton({
                fixture,
                buttonFilters: {
                    selector: '.hxp-restore-button',
                },
            });

            expect(containerSpy).not.toHaveBeenCalled();
        });

        it('should not call container.restorePermissions when restore property is undefined but result exists', async () => {
            const matDialogService = (component as any).dialog;
            const mockDialogResult = { option: 'inherited' }; // restore property is missing

            jest.spyOn(matDialogService, 'open').mockReturnValue({
                afterClosed: jest.fn(() => of(mockDialogResult)),
            });

            const containerSpy = jest.spyOn(component.container, 'restorePermissions');

            await ButtonHarnessUtils.clickButton({
                fixture,
                buttonFilters: {
                    selector: '.hxp-restore-button',
                },
            });

            expect(containerSpy).not.toHaveBeenCalled();
        });

        it('should handle different restore option values', async () => {
            const matDialogService = (component as any).dialog;
            const testOptions = [UserType.ALL, UserType.USERS, UserType.GROUPS];

            for (const option of testOptions) {
                const mockDialogResult = { restore: true, option };

                jest.spyOn(matDialogService, 'open').mockReturnValue({
                    afterClosed: jest.fn(() => of(mockDialogResult)),
                });

                const containerSpy = jest.spyOn(component.container, 'restorePermissions');

                await ButtonHarnessUtils.clickButton({
                    fixture,
                    buttonFilters: {
                        selector: '.hxp-restore-button',
                    },
                });

                expect(containerSpy).toHaveBeenCalledWith(option);
                containerSpy.mockClear();
            }
        });
    });
});
