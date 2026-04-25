/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateDocumentVersionButtonComponent } from './document-version.component';
import { CreateDocumentVersionActionService } from './document-version.service';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { jestMocks, a11yReport } from '@hxp/workspace-hxp/shared/testing';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { By } from '@angular/platform-browser';
import { MockProviders } from 'ng-mocks';
import { MatSnackBar } from '@angular/material/snack-bar';
import { mockHxcsJsClientConfigurationService } from '@alfresco/adf-hx-content-services/api';
import { DocumentService } from '@alfresco/adf-hx-content-services/services';
import { map, of } from 'rxjs';
import { MatIconTestingModule } from '@angular/material/icon/testing';

// https://hyland.atlassian.net/browse/CSX-333
const EXPECTED_VIOLATIONS: { [violationId: string]: number }[] = [{ 'aria-required-parent': 1 }];

describe('CreateDocumentVersionButtonComponent', () => {
    let component: CreateDocumentVersionButtonComponent;
    let fixture: ComponentFixture<CreateDocumentVersionButtonComponent>;
    const createDocumentVersionActionServiceSpy: any = {
        isAvailable: jest.fn(),
        execute: jest.fn(),
    };
    let documentServiceSpyObj: any;
    const getCreateVersionButton = () => fixture.debugElement.query(By.css('.hxp-create-version-button'));

    beforeEach(async () => {
        documentServiceSpyObj = { updateDocument: jest.fn() };
        documentServiceSpyObj.documentVersionCreated$ = of({ undefined });
        documentServiceSpyObj.documentUpdated$ = of({ document: undefined, updatedProperties: new Map() });

        await TestBed.configureTestingModule({
            imports: [CreateDocumentVersionButtonComponent, NoopTranslateModule, NoopAnimationsModule, MatIconTestingModule],
            providers: [
                mockHxcsJsClientConfigurationService,
                { provide: DocumentService, useValue: documentServiceSpyObj },
                { provide: CreateDocumentVersionActionService, useValue: createDocumentVersionActionServiceSpy },
                MockProviders(MatSnackBar),
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(CreateDocumentVersionButtonComponent);
        component = fixture.componentInstance;
        createDocumentVersionActionServiceSpy.isAvailable.mockClear();
        createDocumentVersionActionServiceSpy.execute.mockClear();
        createDocumentVersionActionServiceSpy.isAvailable.mockReturnValue(false);
        fixture.detectChanges();
    });

    it('should display the component if the action is available', () => {
        let button = getCreateVersionButton();

        expect(button).toBeFalsy();

        documentServiceSpyObj.documentVersionCreated$ = of({ document: jestMocks.fileDocument }).pipe(map((response) => response.document));
        documentServiceSpyObj.documentUpdated$ = of({ document: jestMocks.fileDocument, updatedProperties: new Map() });

        createDocumentVersionActionServiceSpy.isAvailable.mockReturnValue(true);
        component.data = { documents: [jestMocks.fileDocument] };

        component.ngOnChanges();
        fixture.detectChanges();

        button = getCreateVersionButton();

        expect(button).toBeTruthy();
    });

    it('should not display the component if the action is not available', () => {
        let button = getCreateVersionButton();

        expect(button).toBeFalsy();

        createDocumentVersionActionServiceSpy.isAvailable.mockReturnValue(false);
        component.data = { documents: [jestMocks.fileDocument] };
        fixture.detectChanges();

        button = getCreateVersionButton();

        expect(button).toBeFalsy();
    });

    it('should call execute on the service when the button is clicked', () => {
        component.data = { documents: [jestMocks.fileDocument] };

        createDocumentVersionActionServiceSpy.isAvailable.mockReturnValue(true);
        documentServiceSpyObj.documentVersionCreated$ = of({ document: jestMocks.fileDocument }).pipe(map((response) => response.document));
        documentServiceSpyObj.documentUpdated$ = of({ document: jestMocks.fileDocument, updatedProperties: new Map() });

        component.ngOnChanges();
        fixture.detectChanges();

        const button = getCreateVersionButton();

        expect(button).toBeTruthy();

        button.nativeElement.click();

        expect(createDocumentVersionActionServiceSpy.execute).toHaveBeenCalledWith(component.data);
    });

    it('should update isAvailable when data changes', () => {
        createDocumentVersionActionServiceSpy.isAvailable.mockReturnValue(true);
        component.data = { documents: [jestMocks.fileDocument] };

        documentServiceSpyObj.documentVersionCreated$ = of({ document: jestMocks.fileDocument }).pipe(map((response) => response.document));
        documentServiceSpyObj.documentUpdated$ = of({ document: jestMocks.fileDocument, updatedProperties: new Map() });

        component.ngOnChanges();
        fixture.detectChanges();

        expect(component.isAvailable).toBe(true);
    });

    it('should not call execute if the action is not available', () => {
        createDocumentVersionActionServiceSpy.isAvailable.mockReturnValue(false);
        component.data = { documents: [jestMocks.fileDocument] };

        documentServiceSpyObj.documentVersionCreated$ = of({ document: jestMocks.fileDocument }).pipe(map((response) => response.document));
        documentServiceSpyObj.documentUpdated$ = of({ document: jestMocks.fileDocument, updatedProperties: new Map() });

        component.ngOnChanges();
        fixture.detectChanges();

        const button = getCreateVersionButton();

        expect(button).toBeFalsy();
        expect(createDocumentVersionActionServiceSpy.execute).not.toHaveBeenCalled();
    });

    it('should pass accessibility checks', async () => {
        createDocumentVersionActionServiceSpy.isAvailable.mockReturnValue(true);
        component.data = { documents: [jestMocks.fileDocument] };
        component.ngOnChanges();
        fixture.detectChanges();
        await fixture.whenStable();

        const result = await a11yReport('button');

        expect(result?.violations).toEqual(EXPECTED_VIOLATIONS);
    });
});
