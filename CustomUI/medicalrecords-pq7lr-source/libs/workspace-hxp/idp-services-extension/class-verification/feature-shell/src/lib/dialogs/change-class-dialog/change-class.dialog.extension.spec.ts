/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { of } from 'rxjs';
import { ChangeClassListDialogComponent } from './change-class.dialog';
import { openChangeClassListDialog, ChangeClassListDialogData } from './change-class.dialog.extension';
import { MatIconTestingModule } from '@angular/material/icon/testing';

describe('openChangeClassListDialog', () => {
    let matDialogMock: any;
    let dialogRefMock: any;

    beforeEach(() => {
        dialogRefMock = {
            afterClosed: jasmine.createSpy('afterClosed').and.returnValue(of('result')),
        };

        matDialogMock = {
            open: jasmine.createSpy('open').and.returnValue(dialogRefMock),
        };

        TestBed.configureTestingModule({
            imports: [MatIconTestingModule],
            providers: [{ provide: MatDialog, useValue: matDialogMock }],
        });
    });

    it('should open the dialog with the correct configuration', () => {
        const dialogData: ChangeClassListDialogData = { currentClassId: '123' };
        const onDialogClose = jasmine.createSpy('onDialogClose');
        const config: MatDialogConfig = { width: '50%', height: '70%' };

        openChangeClassListDialog(matDialogMock, dialogData, onDialogClose, config);

        expect(matDialogMock.open).toHaveBeenCalledWith(
            ChangeClassListDialogComponent,
            jasmine.objectContaining({
                data: dialogData,
                width: '50%',
                height: '70%',
                restoreFocus: true,
            })
        );
    });

    it('should call onDialogClose with the result when the dialog is closed', () => {
        const dialogData: ChangeClassListDialogData = { currentClassId: '123' };
        const onDialogClose = jasmine.createSpy('onDialogClose');

        openChangeClassListDialog(matDialogMock, dialogData, onDialogClose);

        expect(dialogRefMock.afterClosed).toHaveBeenCalled();
        expect(onDialogClose).toHaveBeenCalledWith('result');
    });

    it('should not call onDialogClose if the dialog is closed without a result', () => {
        dialogRefMock.afterClosed.and.returnValue(of());
        const dialogData: ChangeClassListDialogData = { currentClassId: '123' };
        const onDialogClose = jasmine.createSpy('onDialogClose');

        openChangeClassListDialog(matDialogMock, dialogData, onDialogClose);

        expect(dialogRefMock.afterClosed).toHaveBeenCalled();
        expect(onDialogClose).not.toHaveBeenCalled();
    });
});
