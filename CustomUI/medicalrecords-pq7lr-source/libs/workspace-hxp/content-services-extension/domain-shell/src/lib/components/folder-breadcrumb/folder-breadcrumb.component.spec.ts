/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FolderBreadcrumbComponent } from './folder-breadcrumb.component';
import { ROOT_DOCUMENT } from '@alfresco/adf-hx-content-services/api';
import { jestMocks } from '@hxp/workspace-hxp/shared/testing';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { IconHarnessUtils } from '@alfresco-dbp/shared-testing/util/component-harnesses';
import { BreadcrumbData, BreadcrumbDataService, BreadcrumbEntryTypes } from '../../services/breadcrumb-data.service';
import { MatIconTestingModule } from '@angular/material/icon/testing';

describe('FolderBreadcrumbComponent', () => {
    let component: FolderBreadcrumbComponent;
    let fixture: ComponentFixture<FolderBreadcrumbComponent>;

    const mockBreadcrumbDataService = { setIsFromFolder: jest.fn() };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NoopTranslateModule, FolderBreadcrumbComponent, MatIconTestingModule],
            providers: [
                {
                    provide: BreadcrumbDataService,
                    useValue: mockBreadcrumbDataService,
                },
            ],
        });

        fixture = TestBed.createComponent(FolderBreadcrumbComponent);
        component = fixture.componentInstance;
    });

    it('should display current folder name', () => {
        const breadcrumbData: BreadcrumbData = {
            parentFolder: ROOT_DOCUMENT,
            currentFolder: jestMocks.folderDocument,
            subFolders: [],
            totalCount: 0,
        };
        component.breadcrumbData = breadcrumbData;
        fixture.detectChanges();
        const currentFolderElement = fixture.nativeElement.querySelector('.hxp-current-folder [data-automation-id="folder-breadcrumb-current-folder"]');
        expect(currentFolderElement.textContent).toBe(jestMocks.folderDocument.sys_name);
    });

    it('when back is clicked, should emit the parent Document', async () => {
        spyOn(component.selectedFolder, 'emit');
        const breadcrumbData: BreadcrumbData = {
            parentFolder: ROOT_DOCUMENT,
            currentFolder: jestMocks.folderDocument,
            subFolders: [...jestMocks.nestedDocumentAncestors, ...jestMocks.nestedDocumentAncestors2],
            totalCount: 4,
        };

        component.breadcrumbData = breadcrumbData;

        const backFolderElement = await IconHarnessUtils.getIcon({ fixture });
        await (await backFolderElement.host()).click();

        expect(component.selectedFolder.emit).toHaveBeenCalledWith({
            document: ROOT_DOCUMENT,
            type: BreadcrumbEntryTypes.PARENT,
        });
    });

    it('should display all sub folders', () => {
        const breadcrumbData: BreadcrumbData = {
            parentFolder: ROOT_DOCUMENT,
            currentFolder: ROOT_DOCUMENT,
            subFolders: [...jestMocks.nestedDocumentAncestors, ...jestMocks.nestedDocumentAncestors2],
            totalCount: 4,
        };
        component.breadcrumbData = breadcrumbData;
        fixture.detectChanges();
        const currentFolderElements = fixture.nativeElement.querySelectorAll('hxp-folder-icon');

        const EXPECTED_SUBFOLDER_COUNT = 4;
        expect(currentFolderElements.length).toBe(EXPECTED_SUBFOLDER_COUNT);
    });

    it('when a subfolder is clicked should emit the sub folder Document', () => {
        spyOn(component.selectedFolder, 'emit');
        const breadcrumbData: BreadcrumbData = {
            parentFolder: ROOT_DOCUMENT,
            currentFolder: ROOT_DOCUMENT,
            subFolders: [...jestMocks.nestedDocumentAncestors, ...jestMocks.nestedDocumentAncestors2],
            totalCount: 4,
        };
        component.breadcrumbData = breadcrumbData;
        fixture.detectChanges();
        const subFolderElements = fixture.nativeElement.querySelectorAll('.hxp-sub-folder');
        subFolderElements[0].click();
        fixture.detectChanges();
        expect(component.selectedFolder.emit).toHaveBeenCalledWith({
            document: jestMocks.nestedDocumentAncestors[0],
            type: BreadcrumbEntryTypes.SELF,
        });
    });

    it('when Document sys_id is present, then should return sys_id as rowId', () => {
        const rowId = component.getFolderId(0, jestMocks.fileDocument);

        expect(rowId).toEqual(jestMocks.fileDocument.sys_id);
    });

    it('when Document sys_id is not present, then a row id based on parent folder sys_id should be returned', () => {
        const documentWithoutSysId = {
            ...jestMocks.fileDocument,
            sys_id: undefined,
        };
        const rowId = component.getFolderId(0, documentWithoutSysId);
        const expectedRowId = documentWithoutSysId.sys_parentId + '_subfolder_' + documentWithoutSysId.sys_name;
        expect(rowId).toEqual(expectedRowId);
    });
});
