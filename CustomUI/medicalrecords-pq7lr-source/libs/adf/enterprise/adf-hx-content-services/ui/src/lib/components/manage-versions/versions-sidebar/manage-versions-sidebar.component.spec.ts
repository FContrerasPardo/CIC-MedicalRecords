/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ManageVersionsSidebarComponent } from './manage-versions-sidebar.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { jestMocks } from '@hxp/workspace-hxp/shared/testing';
import { AsyncPipe, DatePipe } from '@angular/common';
import {
    DocumentRouterService,
    DocumentVersionsService,
    HXP_DOCUMENT_COPY_ACTION_SERVICE,
    HXP_DOCUMENT_DELETE_ACTION_SERVICE,
    HXP_DOCUMENT_MOVE_ACTION_SERVICE,
    HXP_DOCUMENT_PERMISSIONS_ACTION_SERVICE,
    HXP_DOCUMENT_SHARE_ACTION_SERVICE,
    HXP_DOCUMENT_SINGLE_ITEM_DOWNLOAD_ACTION_SERVICE,
    HXP_DOCUMENT_INFO_ACTION_SERVICE,
    UserResolverPipe,
    UserResolverService,
    versionsMocks,
    DocumentActionService,
    ManageVersionsButtonActionService,
} from '@alfresco/adf-hx-content-services/services';
import { VersionContextMenuActionsService } from './version-context-menu.service';
import { MockService } from 'ng-mocks';
import { By } from '@angular/platform-browser';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { Subject } from 'rxjs';
import { MatIconTestingModule } from '@angular/material/icon/testing';

describe('ManageVersionsSidebarComponent', () => {
    let component: ManageVersionsSidebarComponent;
    let fixture: ComponentFixture<ManageVersionsSidebarComponent>;

    const mockDocumentRouterService = {
        navigateTo: jest.fn(),
    };
    const mockDocumentVersionsService = {
        versionDeleted$: new Subject<void>(),
        versionUpdated$: new Subject<void>(),
        getCurrentDocument: jest.fn(),
        getVersions: jest.fn(),
    };
    const mockUserResolverService: UserResolverService = MockService(UserResolverService);

    const mockDocumentCopyActionService = MockService(DocumentActionService);
    const mockDocumentMoveActionService = MockService(DocumentActionService);
    const mockContentShareButtonActionService = MockService(DocumentActionService);
    const mockDeleteButtonActionService = MockService(DocumentActionService);
    const mockPermissionsButtonActionService = MockService(DocumentActionService);
    const mockSingleItemDownloadButtonActionService = MockService(DocumentActionService);
    const mockSingleItemInfoButtonActionService = MockService(DocumentActionService);
    const mockManageVersionsButtonActionService = MockService(ManageVersionsButtonActionService);
    const mockVersionContextMenuService = MockService(VersionContextMenuActionsService);

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [NoopAnimationsModule, NoopTranslateModule, MatMenuModule, ManageVersionsSidebarComponent, MatIconTestingModule],
            providers: [
                DatePipe,
                UserResolverPipe,
                AsyncPipe,
                { provide: UserResolverService, useValue: mockUserResolverService },
                { provide: DocumentRouterService, useValue: mockDocumentRouterService },
                { provide: DocumentVersionsService, useValue: mockDocumentVersionsService },
                { provide: MatSnackBar, useValue: { open: jest.fn() } },
                { provide: MatDialog, useValue: { open: jest.fn() } },
                {
                    provide: HXP_DOCUMENT_MOVE_ACTION_SERVICE,
                    useValue: mockDocumentMoveActionService,
                },
                {
                    provide: HXP_DOCUMENT_SHARE_ACTION_SERVICE,
                    useValue: mockContentShareButtonActionService,
                },
                {
                    provide: HXP_DOCUMENT_DELETE_ACTION_SERVICE,
                    useValue: mockDeleteButtonActionService,
                },
                {
                    provide: HXP_DOCUMENT_COPY_ACTION_SERVICE,
                    useValue: mockDocumentCopyActionService,
                },
                {
                    provide: HXP_DOCUMENT_PERMISSIONS_ACTION_SERVICE,
                    useValue: mockPermissionsButtonActionService,
                },
                {
                    provide: HXP_DOCUMENT_SINGLE_ITEM_DOWNLOAD_ACTION_SERVICE,
                    useValue: mockSingleItemDownloadButtonActionService,
                },
                {
                    provide: HXP_DOCUMENT_INFO_ACTION_SERVICE,
                    useValue: mockSingleItemInfoButtonActionService,
                },
                {
                    provide: ManageVersionsButtonActionService,
                    useValue: mockManageVersionsButtonActionService,
                },
                {
                    provide: VersionContextMenuActionsService,
                    useValue: mockVersionContextMenuService,
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(ManageVersionsSidebarComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should list all versions including current version of document', () => {
        component.isLoading = false;
        component.documentVersions = [jestMocks.versionSupportedDocument, ...versionsMocks];
        fixture.detectChanges();

        const records = fixture.debugElement.queryAll(By.css('.hxp-version-item'));
        const descriptionRows = fixture.debugElement.queryAll(By.css('.hxp-version-description'));

        expect(records.length).toBeGreaterThan(0);
        expect(descriptionRows[0].nativeElement.textContent.trim()).toEqual('MANAGE_VERSIONS.DIALOG.CURRENT_VERSION');
        expect(component.documentVersions.filter((version) => !version.sysver_isVersion)).toHaveLength(1);
    });

    it('should not render version description if it does not exist', () => {
        component.isLoading = false;
        const versionsWithoutDescription = versionsMocks.map((version) => {
            return { ...version, sysver_description: '' };
        });
        component.documentVersions = versionsWithoutDescription;
        fixture.detectChanges();

        const records = fixture.debugElement.query(By.css('.hxp-version-description'));
        expect(records).toBeNull();
    });

    it('should navigate to a specific version', () => {
        component.isLoading = false;
        component.documentVersions = [jestMocks.versionSupportedDocument, ...versionsMocks];
        fixture.detectChanges();

        const records = fixture.debugElement.queryAll(By.css('.hxp-version-item'));
        records[1].nativeElement.click();
        fixture.detectChanges();

        expect(mockDocumentRouterService.navigateTo).toHaveBeenCalledTimes(1);
        expect(mockDocumentRouterService.navigateTo).toHaveBeenCalledWith(component.documentVersions[1] as any);
    });

    it('should show skeleton loader while loading and hide it after loading completes', async () => {
        component.isLoading = true;
        fixture.detectChanges();
        await fixture.whenStable();

        const skeletonLoader = fixture.debugElement.query(By.css('hxp-panel-skeleton-loader'));
        expect(skeletonLoader).toBeTruthy();

        component.isLoading = false;
        fixture.detectChanges();
        await fixture.whenStable();

        const skeletonLoaderAfterLoad = fixture.debugElement.query(By.css('hxp-panel-skeleton-loader'));
        expect(skeletonLoaderAfterLoad).toBeNull();
    });
});
