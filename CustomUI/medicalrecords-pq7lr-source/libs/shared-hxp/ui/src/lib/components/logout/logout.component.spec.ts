/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed, ComponentFixture } from '@angular/core/testing';
import { LogoutComponent } from './logout.component';
import { LogoutDirective, AuthenticationService, NoopTranslateModule } from '@alfresco/adf-core';
import { By } from '@angular/platform-browser';
import { MatIconTestingModule } from '@angular/material/icon/testing';

describe('LogoutComponent', () => {
    let fixture: ComponentFixture<LogoutComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NoopTranslateModule, LogoutDirective, MatIconTestingModule],
            providers: [
                {
                    provide: AuthenticationService,
                    useValue: { getToken: () => 'fake token' },
                },
            ],
        });

        fixture = TestBed.createComponent(LogoutComponent);
        fixture.detectChanges();
    });

    it('should have button with adf-logout', () => {
        const button = fixture?.debugElement.queryAll(By.directive(LogoutDirective));
        const buttonText = button[0].nativeElement.textContent;
        expect(buttonText).toMatch('APP.HEADER.SIGN_OUT');
    });
});
