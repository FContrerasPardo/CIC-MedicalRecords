/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LanguageActionComponent } from './language-action.component';
import { By } from '@angular/platform-browser';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { MatIconTestingModule } from '@angular/material/icon/testing';

describe('LanguageActionComponent', () => {
    let fixture: ComponentFixture<LanguageActionComponent>;

    function getLanguageAction() {
        return fixture.debugElement.query(By.css('.hxp-header-action-language'));
    }

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [LanguageActionComponent, NoopTranslateModule, MatIconTestingModule],
        });

        fixture = TestBed.createComponent(LanguageActionComponent);
        fixture.detectChanges();
    });

    afterEach(() => {
        fixture.destroy();
    });

    it('should display language action', () => {
        expect(getLanguageAction()).toBeTruthy();
    });
});
