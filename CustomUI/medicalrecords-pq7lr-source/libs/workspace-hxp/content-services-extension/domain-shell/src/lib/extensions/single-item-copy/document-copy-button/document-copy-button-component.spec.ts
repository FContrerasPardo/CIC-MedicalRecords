/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { throwError } from 'rxjs';
import { DocumentCopyButtonComponent } from './document-copy-button-component';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { a11yReport, jestMocks } from '@hxp/workspace-hxp/shared/testing';
import { DocumentCopyDialogComponent } from '../document-copy-dialog/document-copy-dialog.component';
import { MockService } from 'ng-mocks';
import { CopyButtonActionService } from './document-copy-button-action.service';
import { ROOT_DOCUMENT } from '@alfresco/adf-hx-content-services/api';
import { DialogConfig } from '@alfresco/adf-hx-content-services/ui';
import { DocumentCacheService, HXP_DOCUMENT_COPY_ACTION_SERVICE, DocumentPermissions } from '@alfresco/adf-hx-content-services/services';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { MatIconTestingModule } from '@angular/material/icon/testing';

const mockDocumentCacheService: DocumentCacheService = MockService(DocumentCacheService);

const EXPECTED_VIOLATIONS: { [violationId: string]: number }[] | undefined = [{ 'aria-required-parent': 1 }];

describe('DocumentCopyButtonComponent', () => {
    let component: DocumentCopyButtonComponent;
    let fixture: ComponentFixture<DocumentCopyButtonComponent>;
    let button: DebugElement;

    const mockDialog = { open: jest.fn() };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NoopTranslateModule, DocumentCopyButtonComponent, MatIconTestingModule],
            providers: [
                {
                    provide: DocumentCacheService,
                    useValue: mockDocumentCacheService,
                },
                { provide: MatDialog, useValue: mockDialog },
                {
                    provide: HXP_DOCUMENT_COPY_ACTION_SERVICE,
                    useClass: CopyButtonActionService,
                },
            ],
        });

        fixture = TestBed.createComponent(DocumentCopyButtonComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => {
        fixture.destroy();
    });

    function clickCopyButton() {
        button = fixture.debugElement.query(By.css('button.hxp-copy-button'));
        button.triggerEventHandler('click', null);
        fixture.detectChanges();
    }

    it('should open the copy dialog when onCopy is called with dialogData', () => {
        component.data.parentDocument = {
            ...ROOT_DOCUMENT,
            sys_effectivePermissions: [DocumentPermissions.CREATE_CHILD],
        };
        component.data.documents = [jestMocks.fileDocument];
        component.ngOnChanges();
        fixture.detectChanges();
        const dialogData = {
            parentDocument: component.data.parentDocument,
            documentToCopy: component.data.documents[0],
        };
        expect(mockDialog.open).not.toHaveBeenCalled();
        clickCopyButton();
        expect(mockDialog.open).toHaveBeenCalledWith(DocumentCopyDialogComponent, {
            width: DialogConfig.small.width,
            height: DialogConfig.small.height,
            data: dialogData,
        });
    });

    it('should not be in DOM if no document is provided', () => {
        component.data.documents = [];
        button = fixture.debugElement.query(By.css('button.hxp-copy-button'));
        expect(button).toBeFalsy();
    });

    it('should pass accessibility checks', async () => {
        component.data.parentDocument = {
            ...ROOT_DOCUMENT,
            sys_effectivePermissions: [DocumentPermissions.CREATE_CHILD],
        };
        component.data.documents = [jestMocks.fileDocument];
        component.ngOnChanges();
        fixture.detectChanges();
        await fixture.whenStable();

        const res = await a11yReport('button');

        expect(res?.violations).toEqual(EXPECTED_VIOLATIONS);
    });

    it('should not log console.error when fetching parent document fails with a 403', () => {
        spyOn(mockDocumentCacheService, 'getDocument').and.returnValue(
            throwError(() => ({ response: { status: 403 } }))
        );
        spyOn(console, 'error');

        component.data.documents = [{ ...jestMocks.fileDocument, sys_parentId: 'some-parent-id' }];
        component.data.parentDocument = undefined;
        component.ngOnChanges();

        expect(console.error).not.toHaveBeenCalled();
    });

    it('should log console.error when fetching parent document fails with a non-permission error', () => {
        const serverError = { response: { status: 500 } };
        spyOn(mockDocumentCacheService, 'getDocument').and.returnValue(throwError(() => serverError));
        spyOn(console, 'error');

        component.data.documents = [{ ...jestMocks.fileDocument, sys_parentId: 'some-parent-id' }];
        component.data.parentDocument = undefined;
        component.ngOnChanges();

        expect(console.error).toHaveBeenCalledWith(serverError);
    });
});
