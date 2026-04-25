/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { ContentDeleteConfirmationDialogComponent } from '../content-delete-confirmation-dialog/content-delete-confirmation-dialog.component';
import { ContentDeleteButtonComponent } from './content-delete-button.component';
import { a11yReport, jestMocks } from '@hxp/workspace-hxp/shared/testing';
import { DeleteButtonActionService } from './content-delete-button-action.service';
import { ROOT_DOCUMENT } from '@alfresco/adf-hx-content-services/api';
import { MockService } from 'ng-mocks';
import { DocumentCacheService, HXP_DOCUMENT_DELETE_ACTION_SERVICE, DocumentPermissions } from '@alfresco/adf-hx-content-services/services';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { MatIconTestingModule } from '@angular/material/icon/testing';

describe('ContentDeleteButtonComponent', () => {
    let component: ContentDeleteButtonComponent;
    let fixture: ComponentFixture<ContentDeleteButtonComponent>;
    let dialog: MatDialog;
    let button: DebugElement;

    const ROOT_DOCUMENT_WITH_PERMISSIONS = {
        ...ROOT_DOCUMENT,
        sys_effectivePermissions: [DocumentPermissions.DELETE_CHILD],
    };
    const mockDocumentCacheService: DocumentCacheService = MockService(DocumentCacheService);

    const EXPECTED_VIOLATIONS: { [violationId: string]: number }[] | undefined = [];

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [ContentDeleteButtonComponent, MatDialogModule, NoopTranslateModule, MatIconTestingModule],
            providers: [
                MatDialog,
                {
                    provide: DocumentCacheService,
                    useValue: mockDocumentCacheService,
                },
                {
                    provide: HXP_DOCUMENT_DELETE_ACTION_SERVICE,
                    useClass: DeleteButtonActionService,
                },
            ],
        });

        fixture = TestBed.createComponent(ContentDeleteButtonComponent);
        component = fixture.componentInstance;
        dialog = TestBed.inject(MatDialog);
        jest.spyOn(dialog, 'open').mockReturnValue({
            afterClosed: () => of(true),
        } as MatDialogRef<unknown>);
        fixture.detectChanges();
    });

    it('should not be in the DOM if user has neither `Delete` nor `DeleteChild` permissions', () => {
        component.actionContext = {
            parentDocument: ROOT_DOCUMENT,
            documents: [{ ...jestMocks.fileDocument, sys_effectivePermissions: [] }],
        };
        component.ngOnChanges();
        fixture.detectChanges();
        button = fixture.debugElement.query(By.css('button'));

        expect(button).toBeFalsy();
    });

    it('should be in the DOM if user has `Delete` and `DeleteChild` permissions', () => {
        component.actionContext = {
            parentDocument: ROOT_DOCUMENT_WITH_PERMISSIONS,
            documents: [
                {
                    ...jestMocks.fileDocument,
                    sys_effectivePermissions: [DocumentPermissions.DELETE],
                },
            ],
        };
        component.ngOnChanges();
        fixture.detectChanges();
        button = fixture.debugElement.query(By.css('button'));

        expect(button).toBeTruthy();
    });

    it('should open the delete confirmation dialog on click when single document is selected', () => {
        component.actionContext = {
            parentDocument: ROOT_DOCUMENT_WITH_PERMISSIONS,
            documents: [jestMocks.fileDocument],
        };
        component.ngOnChanges();
        fixture.detectChanges();
        button = fixture.debugElement.query(By.css('button'));
        button.triggerEventHandler('click');

        expect(dialog.open).toHaveBeenCalledWith(ContentDeleteConfirmationDialogComponent, {
            data: {
                documents: component.actionContext.documents,
                shouldRedirect: false,
                refererURL: '',
            },
        });
    });

    it('should open the delete confirmation dialog on click when multiple documents are selected', () => {
        component.actionContext = {
            parentDocument: ROOT_DOCUMENT_WITH_PERMISSIONS,
            documents: [jestMocks.fileDocument, jestMocks.fileDocument],
        };
        component.ngOnChanges();
        fixture.detectChanges();
        button = fixture.debugElement.query(By.css('button'));
        button.triggerEventHandler('click');

        expect(dialog.open).toHaveBeenCalledWith(ContentDeleteConfirmationDialogComponent, {
            data: {
                documents: component.actionContext.documents,
                shouldRedirect: false,
                refererURL: '',
            },
        });
    });

    it('should pass accessibility checks', async () => {
        component.actionContext = {
            parentDocument: ROOT_DOCUMENT_WITH_PERMISSIONS,
            documents: [jestMocks.fileDocument],
        };
        component.ngOnChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const res = await a11yReport('button');

        expect(res?.violations).toEqual(EXPECTED_VIOLATIONS);
    });

    it('should not log console.error when fetching parent document fails with a 403', () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        jest.spyOn(mockDocumentCacheService, 'getDocument').mockReturnValue(
            throwError(() => ({ response: { status: 403 } }))
        );

        component.actionContext = {
            documents: [{ ...jestMocks.fileDocument, sys_parentId: 'some-parent-id' }],
        };
        component.ngOnChanges();

        expect(consoleErrorSpy).not.toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
    });

    it('should log console.error when fetching parent document fails with a non-permission error', () => {
        const serverError = { response: { status: 500 } };
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        jest.spyOn(mockDocumentCacheService, 'getDocument').mockReturnValue(
            throwError(() => serverError)
        );

        component.actionContext = {
            documents: [{ ...jestMocks.fileDocument, sys_parentId: 'some-parent-id' }],
        };
        component.ngOnChanges();

        expect(consoleErrorSpy).toHaveBeenCalledWith(serverError);
        consoleErrorSpy.mockRestore();
    });
});
