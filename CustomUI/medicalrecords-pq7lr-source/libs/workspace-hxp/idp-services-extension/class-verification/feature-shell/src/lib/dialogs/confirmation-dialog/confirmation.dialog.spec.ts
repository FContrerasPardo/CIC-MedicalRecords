/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { ConfirmationDialogComponent, ConfirmButtonModifier, IdpConfirmationDialogData } from './confirmation.dialog';
import { MatIconTestingModule } from '@angular/material/icon/testing';

export interface ComponentFixtureTestBed {
    component: ConfirmationDialogComponent;
    fixture: ComponentFixture<ConfirmationDialogComponent>;
}

function setUpComponentWithDialogData(dialogData: any): ComponentFixtureTestBed {
    TestBed.configureTestingModule({
        imports: [CommonModule, NoopTranslateModule, MatButtonModule, MatDialogModule, MatIconTestingModule],
        providers: [{ provide: MAT_DIALOG_DATA, useValue: dialogData }],
    });
    const fixture = TestBed.createComponent(ConfirmationDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    return { component, fixture };
}

const testDialogSettingApplied = (dialogData: any, selector: string, assertion: (el: HTMLElement) => void) => {
    const componentFixtureTestBed = setUpComponentWithDialogData(dialogData);
    const fixture = componentFixtureTestBed.fixture;
    const element = fixture.debugElement.nativeElement.querySelector(selector);
    expect(element).toBeTruthy();
    assertion(element);
};

describe('ConfirmationDialogComponent', () => {
    it('given the injected data confirmButtonModifier is null, should set the confirm-button color to ' + ConfirmButtonModifier.Primary, () => {
        const dialogData: IdpConfirmationDialogData = {
            dialogHeader: '',
            confirmLabel: '',
            cancelLabel: '',
            content: '',
        };
        const selector = '[data-automation-id=idp-confirmation-dialog__confirm-button]';
        const assertion = (element: HTMLElement) => {
            expect([...element.classList].some((cls) => cls.endsWith(`confirm-button--${ConfirmButtonModifier.Primary}`))).toBeTrue();
        };
        testDialogSettingApplied(dialogData, selector, assertion);
    });
    it(
        'given the injected data confirmButtonModifier is ' +
            ConfirmButtonModifier.Primary +
            ', should set the confirm-button color to ' +
            ConfirmButtonModifier.Primary,
        () => {
            const dialogData: IdpConfirmationDialogData = {
                dialogHeader: '',
                confirmLabel: '',
                cancelLabel: '',
                content: '',
                confirmButtonModifier: ConfirmButtonModifier.Primary,
            };
            const selector = '[data-automation-id=idp-confirmation-dialog__confirm-button]';

            const assertion = (element: HTMLElement) => {
                expect([...element.classList].some((cls) => cls.endsWith(`confirm-button--${ConfirmButtonModifier.Primary}`))).toBeTrue();
            };
            testDialogSettingApplied(dialogData, selector, assertion);
        }
    );
    it(
        'given the injected data confirmButtonModifier is ' +
            ConfirmButtonModifier.Warn +
            ', should set the confirm-button color to ' +
            ConfirmButtonModifier.Warn,
        () => {
            const dialogData: IdpConfirmationDialogData = {
                dialogHeader: '',
                confirmLabel: '',
                cancelLabel: '',
                content: '',
                confirmButtonModifier: ConfirmButtonModifier.Warn,
            };
            const selector = '[data-automation-id=idp-confirmation-dialog__confirm-button]';
            const assertion = (element: HTMLElement) => {
                expect([...element.classList].some((cls) => cls.endsWith(`confirm-button--${ConfirmButtonModifier.Warn}`))).toBeTrue();
            };
            testDialogSettingApplied(dialogData, selector, assertion);
        }
    );
    it('given the injected data confirmLabel is "Test", should set the confirm-button label to "Test"', () => {
        const testValue = 'Test';
        const dialogData: IdpConfirmationDialogData = {
            dialogHeader: '',
            confirmLabel: testValue,
            cancelLabel: '',
            content: '',
        };
        const selector = '[data-automation-id=idp-confirmation-dialog__confirm-button]';
        const assertion = (element: HTMLElement) => {
            expect(element.textContent).toBe(testValue);
        };
        testDialogSettingApplied(dialogData, selector, assertion);
    });

    it('given the injected data cancelLabel is "Test", should set the cancel-button label to "Test"', () => {
        const testValue = 'Test';
        const dialogData: IdpConfirmationDialogData = {
            dialogHeader: '',
            confirmLabel: '',
            cancelLabel: testValue,
            content: '',
        };
        const selector = '[data-automation-id=idp-confirmation-dialog__cancel-button]';
        const assertion = (element: HTMLElement) => {
            expect(element.textContent).toBe(testValue);
        };
        testDialogSettingApplied(dialogData, selector, assertion);
    });

    it('given the injected data content is "Test", should set the dialog content to "Test"', () => {
        const testValue = 'Test';
        const dialogData: IdpConfirmationDialogData = {
            dialogHeader: '',
            confirmLabel: '',
            cancelLabel: '',
            content: testValue,
        };
        const selector = '[data-automation-id=idp-confirmation-dialog__content]';
        const assertion = (element: HTMLElement) => {
            expect(element.textContent).toBe(testValue);
        };
        testDialogSettingApplied(dialogData, selector, assertion);
    });

    it('given the injected data dialogHeader is "Test", should set the dialog header to "Test"', () => {
        const testValue = 'Test';
        const dialogData: IdpConfirmationDialogData = {
            dialogHeader: testValue,
            confirmLabel: '',
            cancelLabel: '',
            content: '',
        };
        const selector = '[data-automation-id=idp-confirmation-dialog__header]';
        const assertion = (element: HTMLElement) => {
            expect(element.textContent).toBe(testValue);
        };
        testDialogSettingApplied(dialogData, selector, assertion);
    });
});
