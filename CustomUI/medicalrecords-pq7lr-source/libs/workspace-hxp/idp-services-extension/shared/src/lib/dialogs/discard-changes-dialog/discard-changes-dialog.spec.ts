/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, fakeAsync, flush, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { DiscardChangesDialogComponent } from './discard-changes-dialog';
import { Subject } from 'rxjs';
import { SatIconModule } from '@hylandsoftware/satori-ui/icons';

class MatDialogRefMock {
    close(value: any) {
        return value;
    }
}

describe('DiscardChangesDialogComponent', () => {
    let fixture: ComponentFixture<DiscardChangesDialogComponent>;
    let dialogRef: MatDialogRefMock;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NoopTranslateModule, NoopAnimationsModule, SatIconModule],
            providers: [{ provide: MatDialogRef, useClass: MatDialogRefMock }],
        });

        fixture = TestBed.createComponent(DiscardChangesDialogComponent);
        dialogRef = TestBed.inject(MatDialogRef) as unknown as MatDialogRefMock;
        fixture.detectChanges();
    });

    it('should call dialog close with undefined when cancel is clicked', fakeAsync(() => {
        const cancelButton = select<HTMLInputElement>('[data-automation-id="idp-discard-dialog__cancel-button"]');

        spyOn(dialogRef, 'close');
        cancelButton.click();

        flush();

        expect(dialogRef.close).toHaveBeenCalledWith('');
    }));

    it('should call dialog close with undefined when x is clicked', fakeAsync(() => {
        const xButton = select<HTMLButtonElement>('[data-automation-id="idp-discard-dialog__x-button"]');

        spyOn(dialogRef, 'close');
        xButton.click();

        flush();

        expect(dialogRef.close).toHaveBeenCalledWith('');
    }));

    it('should call dialog close with true when discard is clicked', fakeAsync(() => {
        const discardButton = select<HTMLButtonElement>('[data-automation-id="idp-discard-dialog__discard-button"]');

        spyOn(dialogRef, 'close');
        discardButton.click();

        flush();

        expect(dialogRef.close).toHaveBeenCalledWith(true);
    }));

    describe('static open', () => {
        let dialogMock: MatDialog;
        let dialogRefMock: MatDialogRef<DiscardChangesDialogComponent>;
        let afterClosed$: Subject<unknown>;

        beforeEach(() => {
            afterClosed$ = new Subject<unknown>();
            dialogRefMock = {
                afterClosed: jest.fn().mockReturnValue(afterClosed$.asObservable()),
            } as unknown as MatDialogRef<DiscardChangesDialogComponent>;
            dialogMock = { open: jest.fn().mockReturnValue(dialogRefMock) } as unknown as MatDialog;
        });

        it('should open the dialog with the correct config and return the dialog ref', () => {
            const ref = DiscardChangesDialogComponent.open(dialogMock);

            expect(dialogMock.open).toHaveBeenCalledWith(DiscardChangesDialogComponent, {
                width: '600px',
                height: 'auto',
                autoFocus: '[data-automation-id="idp-discard-dialog__cancel-button"]',
                restoreFocus: true,
            });
            expect(ref).toBe(dialogRefMock);
        });

        it('should not subscribe to afterClosed when no callback is provided', () => {
            DiscardChangesDialogComponent.open(dialogMock);

            expect(dialogRefMock.afterClosed).not.toHaveBeenCalled();
        });

        it('should invoke the callback when dialog closes with true', () => {
            const callback = jest.fn();

            DiscardChangesDialogComponent.open(dialogMock, callback);
            afterClosed$.next(true);

            expect(callback).toHaveBeenCalled();
        });

        it('should not invoke the callback when dialog closes with false', () => {
            const callback = jest.fn();

            DiscardChangesDialogComponent.open(dialogMock, callback);
            afterClosed$.next(false);

            expect(callback).not.toHaveBeenCalled();
        });

        it('should not invoke the callback when dialog closes with undefined', () => {
            const callback = jest.fn();

            DiscardChangesDialogComponent.open(dialogMock, callback);
            afterClosed$.next(undefined);

            expect(callback).not.toHaveBeenCalled();
        });
    });

    function select<T>(selector: string): T {
        return fixture.debugElement.nativeElement.querySelector(selector) as T;
    }
});
