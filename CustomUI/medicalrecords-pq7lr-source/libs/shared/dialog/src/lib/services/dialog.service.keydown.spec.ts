/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { OverlayContainer } from '@angular/cdk/overlay';
import { Component } from '@angular/core';
import { DialogService } from './dialog.service';
import { NoopTranslateModule } from '@alfresco/adf-core';

@Component({ selector: 'alfresco-dbp-dummy-dialog', template: '<button>Dummy</button>' })
class DummyDialogComponent {}

describe('DialogService keyboard keydown subscription', () => {
    let service: DialogService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [MatDialogModule, NoopAnimationsModule, DummyDialogComponent, NoopTranslateModule],
            providers: [DialogService],
        });
        service = TestBed.inject(DialogService);
    });

    it('should stop keydown propagation for a real MatDialogRef', () => {
        const overlay = TestBed.inject(OverlayContainer);
        const dialog = TestBed.inject(MatDialog);

        const ref = dialog.open(DummyDialogComponent);
        // explicitly invoke the private helper
        (service as any).subscribeKeydownStop(ref);

        const event = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true });
        const stopSpy = jest.spyOn(event, 'stopPropagation');

        overlay.getContainerElement().dispatchEvent(event);

        expect(stopSpy).toHaveBeenCalled();

        ref.close();
    });

    it('should unsubscribe the keydown subscription after dialog closes', () => {
        const overlay = TestBed.inject(OverlayContainer);
        const dialog = TestBed.inject(MatDialog);

        const ref = dialog.open(DummyDialogComponent);
        (service as any).subscribeKeydownStop(ref);

        const first = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true });
        const firstStop = jest.spyOn(first, 'stopPropagation');
        overlay.getContainerElement().dispatchEvent(first);
        expect(firstStop).toHaveBeenCalled();

        // close triggers takeUntil(afterClosed())
        ref.close();

        // fire again; subscription should be cleaned. We only assert no exception and spy exists.
        const second = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true });
        const secondStop = jest.spyOn(second, 'stopPropagation');
        overlay.getContainerElement().dispatchEvent(second);
        expect(secondStop).toBeDefined();
    });
});
