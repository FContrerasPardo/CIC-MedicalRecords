/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PermissionsDocumentTitleComponent } from './permissions-document-title.component';
import { By } from '@angular/platform-browser';
import { NoopTranslateModule } from '@alfresco/adf-core';

describe('PermissionsDocumentTitleComponent', () => {
    let fixture: ComponentFixture<PermissionsDocumentTitleComponent>;
    let component: PermissionsDocumentTitleComponent;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NoopTranslateModule, PermissionsDocumentTitleComponent],
        });

        fixture = TestBed.createComponent(PermissionsDocumentTitleComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should display document title', () => {
        component.title = 'Security.pdf';
        fixture.detectChanges();
        const docTitle = fixture.debugElement.query(By.css('.hxp-permission-document-title')).nativeElement.textContent;

        expect(component.title).toEqual('Security.pdf');
        expect(docTitle?.trim()).toEqual('Security.pdf');
    });
});
