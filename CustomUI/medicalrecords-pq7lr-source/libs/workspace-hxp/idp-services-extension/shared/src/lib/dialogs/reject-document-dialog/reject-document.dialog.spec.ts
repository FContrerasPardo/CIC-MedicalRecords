/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, fakeAsync, flush, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { RejectReason } from '../../models/contracts/task-input';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { IdpContextTaskBaseService } from '../../services/context-task/context-task-base.service';
import { RejectDocumentDialogData, RejectDocumentDialogComponent } from './reject-document.dialog';
import { FilterableSelectionListItem } from '../../components/filterable-selection-list/filterable-selection-list.component';
import { SatIconModule } from '@hylandsoftware/satori-ui/icons';

class MatDialogRefMock {
    close(value: any) {
        return value;
    }
}

describe('RejectDocumentDialogComponent', () => {
    const mockRejectReasons: RejectReason[] = [
        { id: '1', value: 'rr1' },
        { id: '2', value: 'rr2' },
        { id: '3', value: 'rr3' },
    ];

    const idpContextTaskBaseServiceMock = {
        rejectReasons$: of(mockRejectReasons),
    };

    function select<T>(fixture: ComponentFixture<RejectDocumentDialogComponent>, selector: string): T {
        return fixture.debugElement.nativeElement.querySelector(selector) as T;
    }

    describe('', () => {
        let component: RejectDocumentDialogComponent;
        let fixture: ComponentFixture<RejectDocumentDialogComponent>;
        let dialogRef: MatDialogRefMock;

        beforeEach(() => {
            TestBed.configureTestingModule({
                imports: [NoopTranslateModule, NoopAnimationsModule, SatIconModule],
                providers: [
                    { provide: MatDialogRef, useClass: MatDialogRefMock },
                    { provide: IdpContextTaskBaseService, useValue: idpContextTaskBaseServiceMock },
                    { provide: MAT_DIALOG_DATA, useValue: null },
                ],
            });

            fixture = TestBed.createComponent(RejectDocumentDialogComponent);
            component = fixture.componentInstance;
            dialogRef = TestBed.inject(MatDialogRef) as unknown as MatDialogRefMock;
            fixture.detectChanges();
        });

        it('should map reject reasons to list items correctly', fakeAsync(() => {
            let mapped: FilterableSelectionListItem<RejectReason>[] = [];

            component.items$.subscribe((items) => (mapped = items));

            flush();

            expect(mapped.length).toBe(mockRejectReasons.length);
            expect(mapped[0].item).toBe(mockRejectReasons[0]);
            expect(mapped[0].id).toBe(mockRejectReasons[0].id);
            expect(mapped[0].name).toBe(mockRejectReasons[0].value);
        }));

        it('should set active item correctly', fakeAsync(() => {
            let currentActiveItem: RejectReason | undefined;

            component.activeItem$.subscribe((item) => (currentActiveItem = item));
            component.onActiveItemChanged(mockRejectReasons[1]);

            flush();

            expect(currentActiveItem).toBe(mockRejectReasons[1]);
        }));

        it('should not close dialog on Enter press if element has not been selected', () => {
            const event = new KeyboardEvent('keydown', { key: 'Enter' });

            spyOn(dialogRef, 'close');
            spyOn(event, 'preventDefault');

            component.handleKeyEnter(event);
            expect(dialogRef.close).not.toHaveBeenCalled();
            expect(event.preventDefault).toHaveBeenCalled();
        });

        it('should call handleKeyEnter with correct activeItem', () => {
            const rejectReasonData = { id: '1', value: 'Test 1' };
            const rejectResult = { rejectReason: rejectReasonData, rejectNote: undefined };
            const event = new Event('keydown');
            spyOn(dialogRef, 'close');

            component.handleKeyEnter(event, rejectReasonData);

            expect(dialogRef.close).toHaveBeenCalledWith(rejectResult);
        });

        it('should call dialog close with correct rejectNote', fakeAsync(() => {
            const rejectNoteInput = select<HTMLInputElement>(fixture, '[data-automation-id="idp-reject-dialog__input__reject-note"]');
            const rejectNote = 'Reject note.';
            rejectNoteInput.value = rejectNote;
            rejectNoteInput.dispatchEvent(new Event('input'));
            fixture.detectChanges();

            const rejectButton = select<HTMLElement>(fixture, '[data-automation-id="idp-reject-dialog__save-button"]');

            spyOn(dialogRef, 'close');
            rejectButton.click();

            flush();

            expect(dialogRef.close).toHaveBeenCalledWith({ rejectReason: mockRejectReasons[0], rejectNote });
        }));

        it('should sanitize rejectNote', fakeAsync(() => {
            const ogConsoleWarn = console.warn;
            console.warn = () => {};

            const rejectNoteInput = select<HTMLInputElement>(fixture, '[data-automation-id="idp-reject-dialog__input__reject-note"]');
            const rejectNote = '<img src="javascript:alert(\'xss\')"><div>hello</div><script>alert("xss")</script>';
            rejectNoteInput.value = rejectNote;
            rejectNoteInput.dispatchEvent(new Event('input'));
            fixture.detectChanges();

            flush();

            expect(component.sanitizedRejectNote).toBe('<img src="unsafe:javascript:alert(\'xss\')"><div>hello</div>');

            console.warn = ogConsoleWarn;
        }));
    });

    describe('data initialization', () => {
        it('should set selectedRejectReasonId and rejectNote when data is provided', () => {
            const testData = new RejectDocumentDialogData('test-reason-id', 'test reject note');

            TestBed.configureTestingModule({
                imports: [NoopTranslateModule, NoopAnimationsModule, SatIconModule],
                providers: [
                    { provide: MatDialogRef, useClass: MatDialogRefMock },
                    { provide: IdpContextTaskBaseService, useValue: idpContextTaskBaseServiceMock },
                    { provide: MAT_DIALOG_DATA, useValue: testData },
                ],
            });

            const fixture = TestBed.createComponent(RejectDocumentDialogComponent);
            const component = fixture.componentInstance;
            fixture.detectChanges();

            expect(component.selectedRejectReasonId).toBe('test-reason-id');
            expect(component.rejectNote).toBe('test reject note');
        });

        it('should set selectedRejectReasonId when data is provided with rejectReasonId only', () => {
            const testData = new RejectDocumentDialogData('another-reason-id');

            TestBed.configureTestingModule({
                imports: [NoopTranslateModule, NoopAnimationsModule, SatIconModule],
                providers: [
                    { provide: MatDialogRef, useClass: MatDialogRefMock },
                    { provide: IdpContextTaskBaseService, useValue: idpContextTaskBaseServiceMock },
                    { provide: MAT_DIALOG_DATA, useValue: testData },
                ],
            });

            const fixture = TestBed.createComponent(RejectDocumentDialogComponent);
            const component = fixture.componentInstance;
            fixture.detectChanges();

            expect(component.selectedRejectReasonId).toBe('another-reason-id');
            expect(component.rejectNote).toBeNull();
        });

        it('should have undefined selectedRejectReasonId and rejectNote when no data is provided', () => {
            TestBed.configureTestingModule({
                imports: [NoopTranslateModule, NoopAnimationsModule, SatIconModule],
                providers: [
                    { provide: MatDialogRef, useClass: MatDialogRefMock },
                    { provide: IdpContextTaskBaseService, useValue: idpContextTaskBaseServiceMock },
                    { provide: MAT_DIALOG_DATA, useValue: null },
                ],
            });

            const fixture = TestBed.createComponent(RejectDocumentDialogComponent);
            const component = fixture.componentInstance;
            fixture.detectChanges();

            expect(component.selectedRejectReasonId).toBeUndefined();
            expect(component.rejectNote).toBeNull();
        });

        it('should handle empty rejectNote in data correctly', () => {
            const testData = new RejectDocumentDialogData('reason-id', '');

            TestBed.configureTestingModule({
                imports: [NoopTranslateModule, NoopAnimationsModule, SatIconModule],
                providers: [
                    { provide: MatDialogRef, useClass: MatDialogRefMock },
                    { provide: IdpContextTaskBaseService, useValue: idpContextTaskBaseServiceMock },
                    { provide: MAT_DIALOG_DATA, useValue: testData },
                ],
            });

            const fixture = TestBed.createComponent(RejectDocumentDialogComponent);
            const component = fixture.componentInstance;
            fixture.detectChanges();

            expect(component.selectedRejectReasonId).toBe('reason-id');
            expect(component.rejectNote).toBeNull();
        });

        it('should set isFlagged false when empty data rejectReasonId is provided', () => {
            const testData = new RejectDocumentDialogData('', '');

            TestBed.configureTestingModule({
                imports: [NoopTranslateModule, NoopAnimationsModule, SatIconModule],
                providers: [
                    { provide: MatDialogRef, useClass: MatDialogRefMock },
                    { provide: IdpContextTaskBaseService, useValue: idpContextTaskBaseServiceMock },
                    { provide: MAT_DIALOG_DATA, useValue: testData },
                ],
            });

            const fixture = TestBed.createComponent(RejectDocumentDialogComponent);
            const component = fixture.componentInstance;
            fixture.detectChanges();

            expect(component.isRejected).toEqual(false);
        });

        it('should set isRejected false when empty data is provided', () => {
            TestBed.configureTestingModule({
                imports: [NoopTranslateModule, NoopAnimationsModule, SatIconModule],
                providers: [
                    { provide: MatDialogRef, useClass: MatDialogRefMock },
                    { provide: IdpContextTaskBaseService, useValue: idpContextTaskBaseServiceMock },
                    { provide: MAT_DIALOG_DATA, useValue: undefined },
                ],
            });

            const fixture = TestBed.createComponent(RejectDocumentDialogComponent);
            const component = fixture.componentInstance;
            fixture.detectChanges();

            expect(component.isRejected).toEqual(false);
        });

        it('should set isRejected true when data rejectReasonId is provided', () => {
            const testData = new RejectDocumentDialogData('reason-id', '');
            TestBed.configureTestingModule({
                imports: [NoopTranslateModule, NoopAnimationsModule, SatIconModule],
                providers: [
                    { provide: MatDialogRef, useClass: MatDialogRefMock },
                    { provide: IdpContextTaskBaseService, useValue: idpContextTaskBaseServiceMock },
                    { provide: MAT_DIALOG_DATA, useValue: testData },
                ],
            });

            const fixture = TestBed.createComponent(RejectDocumentDialogComponent);
            const component = fixture.componentInstance;
            fixture.detectChanges();

            expect(component.isRejected).toEqual(true);
        });
    });

    describe('remove flag button visibility', () => {
        it('should not display remove button when isRejected is false', () => {
            TestBed.configureTestingModule({
                imports: [NoopTranslateModule, NoopAnimationsModule, SatIconModule],
                providers: [
                    { provide: MatDialogRef, useClass: MatDialogRefMock },
                    { provide: IdpContextTaskBaseService, useValue: idpContextTaskBaseServiceMock },
                    { provide: MAT_DIALOG_DATA, useValue: null },
                ],
            });

            const fixture = TestBed.createComponent(RejectDocumentDialogComponent);
            const component = fixture.componentInstance;
            fixture.detectChanges();

            const removeButton = select<HTMLElement>(fixture, '[data-automation-id="idp-reject-dialog__remove-button"]');

            expect(component.isRejected).toBe(false);
            expect(removeButton).toBeNull();
        });

        it('should display remove button when isRejected is true', () => {
            const testData = new RejectDocumentDialogData('reason-id', 'some note');

            TestBed.configureTestingModule({
                imports: [NoopTranslateModule, NoopAnimationsModule, SatIconModule],
                providers: [
                    { provide: MatDialogRef, useClass: MatDialogRefMock },
                    { provide: IdpContextTaskBaseService, useValue: idpContextTaskBaseServiceMock },
                    { provide: MAT_DIALOG_DATA, useValue: testData },
                ],
            });

            const fixture = TestBed.createComponent(RejectDocumentDialogComponent);
            const component = fixture.componentInstance;
            fixture.detectChanges();

            const removeButton = select<HTMLElement>(fixture, '[data-automation-id="idp-reject-dialog__remove-button"]');

            expect(component.isRejected).toBe(true);
            expect(removeButton).toBeTruthy();
        });
    });
});
