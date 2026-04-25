/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { NewUiBannerComponent } from './new-ui-banner.component';
import { By } from '@angular/platform-browser';

describe('NewUiBannerComponent', () => {
    let component: NewUiBannerComponent;
    let fixture: ComponentFixture<NewUiBannerComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NewUiBannerComponent, NoopTranslateModule],
        });

        fixture = TestBed.createComponent(NewUiBannerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should emit try new UI event when the try button is clicked', () => {
        const emitSpy = jest.spyOn(component.tryNewUi, 'emit');

        component.onTryNewUi();

        expect(emitSpy).toHaveBeenCalledTimes(1);
    });

    it('should emit close banner event when the close button is clicked', () => {
        const emitSpy = jest.spyOn(component.closeBanner, 'emit');

        component.onClose();

        expect(emitSpy).toHaveBeenCalledTimes(1);
    });

    describe('promote variant', () => {
        it('should show try new UI button, info button, and close button', () => {
            expect(fixture.debugElement.query(By.css('[data-automation-id="new-ui-banner-try-button"]'))).toBeTruthy();
            expect(fixture.debugElement.query(By.css('.hxp-new-ui-banner__info'))).toBeTruthy();
            expect(fixture.debugElement.query(By.css('[data-automation-id="new-ui-banner-close"]'))).toBeTruthy();
            expect(fixture.debugElement.query(By.css('[data-automation-id="new-ui-banner-understood"]'))).toBeFalsy();
        });
    });

    describe('navigate-back variant', () => {
        beforeEach(() => {
            fixture.componentRef.setInput('variant', 'navigate-back');
            fixture.detectChanges();
        });

        it('should show only the understood button', () => {
            expect(fixture.debugElement.query(By.css('[data-automation-id="new-ui-banner-understood"]'))).toBeTruthy();
            expect(fixture.debugElement.query(By.css('[data-automation-id="new-ui-banner-try-button"]'))).toBeFalsy();
            expect(fixture.debugElement.query(By.css('.hxp-new-ui-banner__info'))).toBeFalsy();
            expect(fixture.debugElement.query(By.css('[data-automation-id="new-ui-banner-close"]'))).toBeFalsy();
        });

        it('should emit close banner event when understood is clicked', () => {
            const emitSpy = jest.spyOn(component.closeBanner, 'emit');

            component.onClose();

            expect(emitSpy).toHaveBeenCalledTimes(1);
        });
    });
});
