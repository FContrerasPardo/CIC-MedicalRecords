/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TableReferenceWidgetComponent } from './table-reference.widget';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { MockComponent } from 'ng-mocks';
import { By } from '@angular/platform-browser';
import { DestroyRef } from '@angular/core';
import { NoopTranslateModule, ViewerComponent, ErrorWidgetComponent, FormFieldModel, FormModel, ErrorMessageModel } from '@alfresco/adf-core';

describe('TableReferenceWidgetComponent', () => {
    let component: TableReferenceWidgetComponent;
    let fixture: ComponentFixture<TableReferenceWidgetComponent>;
    const fieldName = 'Test Data Reference';

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                NoopTranslateModule,
                MatIconTestingModule,
                TableReferenceWidgetComponent,
                MockComponent(ViewerComponent),
                MockComponent(ErrorWidgetComponent),
            ],
            providers: [{ provide: DestroyRef, useValue: { onDestroy: jasmine.createSpy('onDestroy') } }],
        });

        fixture = TestBed.createComponent(TableReferenceWidgetComponent);
        component = fixture.componentInstance;

        // Set up the field input properly
        const field = new FormFieldModel(new FormModel(), {
            id: 'fakeField',
            name: fieldName,
            value: null,
            readOnly: false,
        });
        component.field = field;

        fixture.detectChanges();
    });

    describe('Event Handling', () => {
        let eventSpy: jasmine.Spy;

        beforeEach(() => {
            eventSpy = spyOn(component, 'event');
        });

        it('should call event method on focus', () => {
            const widgetElement = fixture.debugElement;
            const focusEvent = new FocusEvent('focus');
            widgetElement.nativeElement.dispatchEvent(focusEvent);

            expect(eventSpy).toHaveBeenCalledWith(focusEvent);
        });

        it('should call event method on focusin', () => {
            const widgetElement = fixture.debugElement;
            const focusinEvent = new FocusEvent('focusin');
            widgetElement.nativeElement.dispatchEvent(focusinEvent);

            expect(eventSpy).toHaveBeenCalledWith(focusinEvent);
        });

        it('should call event method on focusout', () => {
            const widgetElement = fixture.debugElement;
            const focusoutEvent = new FocusEvent('focusout');
            widgetElement.nativeElement.dispatchEvent(focusoutEvent);

            expect(eventSpy).toHaveBeenCalledWith(focusoutEvent);
        });

        it('should call event method on select', () => {
            const widgetElement = fixture.debugElement;
            const selectEvent = new Event('select');
            widgetElement.nativeElement.dispatchEvent(selectEvent);

            expect(eventSpy).toHaveBeenCalledWith(selectEvent);
        });

        it('should call event method on invalid', () => {
            const widgetElement = fixture.debugElement;
            const invalidEvent = new Event('invalid');
            widgetElement.nativeElement.dispatchEvent(invalidEvent);

            expect(eventSpy).toHaveBeenCalledWith(invalidEvent);
        });
    });

    describe('Extraction Issue Display', () => {
        beforeEach(() => {
            component.field.validationSummary = new ErrorMessageModel();
            fixture.detectChanges();
        });

        it('should show warning icon and extraction issue message when field has extraction issue', () => {
            const validationMessage = 'Extraction Issue';
            component.field.validationSummary.message = validationMessage;

            component.field.markAsInvalid();
            fixture.detectChanges();

            const statusTagElement = fixture.debugElement.query(By.css('sat-status-tag.hxp-extraction-result'));
            expect(statusTagElement).toBeTruthy();
            expect(statusTagElement.nativeElement.dataset.testStatus).toBe('error');
        });

        it('should show check icon and no issue when field has no extraction issue', () => {
            const validationMessage = 'Extracted Successfully';
            component.field.validationSummary.message = validationMessage;

            component.field.markAsValid();
            fixture.detectChanges();

            const statusTagElement = fixture.debugElement.query(By.css('sat-status-tag.hxp-extraction-result'));
            expect(statusTagElement).toBeTruthy();
            expect(statusTagElement.nativeElement.dataset.testStatus).toBe('success');
        });

        it('should update status when field validity changes', () => {
            component.field.validationSummary.message = 'Test Message';

            component.field.markAsInvalid();
            fixture.detectChanges();

            const statusTagElement = fixture.debugElement.query(By.css('sat-status-tag.hxp-extraction-result'));
            expect(statusTagElement.nativeElement.dataset.testStatus).toBe('error');

            component.field.markAsValid();
            fixture.detectChanges();
            expect(statusTagElement.nativeElement.dataset.testStatus).toBe('success');
        });
    });
});
