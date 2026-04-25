/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, fakeAsync, flush, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ChangeClassListDialogComponent } from './change-class.dialog';
import { IdpDocumentClassService } from '../../services/document-class/idp-document-class.service';
import { of } from 'rxjs';
import { IdpConfigClass, REJECTED_CLASS_ID } from '../../models/screen-models';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { FilterableSelectionListItem, IdentifierData } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { SatIconModule } from '@hylandsoftware/satori-ui/icons';
import { MatIconTestingModule } from '@angular/material/icon/testing';

class MatDialogRefMock {
    close(value: any) {
        return value;
    }
}

describe('ChangeClassListDialogComponent', () => {
    let component: ChangeClassListDialogComponent;
    let fixture: ComponentFixture<ChangeClassListDialogComponent>;
    let dialogRef: MatDialogRefMock;

    const mockClasses: IdpConfigClass[] = [
        {
            id: REJECTED_CLASS_ID,
            name: 'Test',
            isSpecialClass: true,
            isExpanded: false,
            isSelected: false,
        },
        {
            id: '2',
            name: 'Test1',
            isSpecialClass: false,
            isExpanded: false,
            isSelected: false,
        },
        {
            id: '3',
            name: 'Test2',
            isSpecialClass: false,
            isExpanded: false,
            isSelected: false,
        },
    ];

    const idpDocumentClassServiceMock = jasmine.createSpyObj('IdpDocumentClassService', ['toggleExpandClass', 'setSelectedClass'], {
        selectedClass$: of(),
        allClasses$: of(mockClasses),
        documentClassMetadata$: of([]),
    });

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NoopTranslateModule, NoopAnimationsModule, SatIconModule, MatIconTestingModule],
            providers: [
                { provide: MAT_DIALOG_DATA, useValue: {} },
                { provide: MatDialogRef, useClass: MatDialogRefMock },
                { provide: IdpDocumentClassService, useValue: idpDocumentClassServiceMock },
            ],
        });

        fixture = TestBed.createComponent(ChangeClassListDialogComponent);
        component = fixture.componentInstance;
        dialogRef = TestBed.inject(MatDialogRef) as unknown as MatDialogRefMock;
        fixture.detectChanges();
    });

    it('should map classes to list items correctly', fakeAsync(() => {
        let mapped: FilterableSelectionListItem<IdentifierData>[] = [];

        component.items$.subscribe((items) => (mapped = items));

        flush();

        expect(mapped.length).toBe(mockClasses.length - 1);
        expect(mapped.findIndex((i) => i.id === REJECTED_CLASS_ID)).toEqual(-1);
        expect(mapped[0].item).toBe(mockClasses[1]);
        expect(mapped[0].id).toBe(mockClasses[1].id);
        expect(mapped[0].name).toBe(mockClasses[1].name);
    }));

    it('should set active item correctly', fakeAsync(() => {
        let currentActiveItem: IdentifierData | undefined;

        component.activeItem$.subscribe((item) => (currentActiveItem = item));
        component.onActiveItemChanged(mockClasses[1]);

        flush();

        expect(currentActiveItem).toBe(mockClasses[1] as IdentifierData);
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
        const classData = { id: '1', name: 'Test' };
        const event = new Event('keydown');
        spyOn(dialogRef, 'close');

        component.handleKeyEnter(event, classData);

        expect(dialogRef.close).toHaveBeenCalledOnceWith(classData);
    });

    describe('ignoreForReview filtering', () => {
        it('should not display classes that are ignoreForReview', fakeAsync(() => {
            const ignored: IdpConfigClass = {
                id: 'IGNORED_ID',
                name: 'Ignored Class',
                isSpecialClass: false,
                isExpanded: false,
                isSelected: false,
                ignoreForReview: true,
            } as unknown as IdpConfigClass;

            const visible: IdpConfigClass = {
                id: 'VISIBLE_ID',
                name: 'Visible Class',
                isSpecialClass: false,
                isExpanded: false,
                isSelected: false,
            };

            const idpDocumentClassServiceLocalMock = jasmine.createSpyObj('IdpDocumentClassService', ['toggleExpandClass', 'setSelectedClass'], {
                selectedClass$: of(),
                allClasses$: of([ignored, visible]),
                documentClassMetadata$: of([]),
            });

            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                imports: [NoopTranslateModule],
                providers: [
                    { provide: MAT_DIALOG_DATA, useValue: {} },
                    { provide: MatDialogRef, useClass: MatDialogRefMock },
                    { provide: IdpDocumentClassService, useValue: idpDocumentClassServiceLocalMock },
                ],
            });
            const localFixture = TestBed.createComponent(ChangeClassListDialogComponent);
            const localComponent = localFixture.componentInstance;
            localFixture.detectChanges();

            let items: FilterableSelectionListItem<IdentifierData>[] = [];
            localComponent.items$.subscribe((i) => (items = i));

            flush();

            expect(items.find((i) => i.id === 'IGNORED_ID')).toBeUndefined();
            expect(items.map((i) => i.id)).toEqual(['VISIBLE_ID']);
        }));
    });
});
