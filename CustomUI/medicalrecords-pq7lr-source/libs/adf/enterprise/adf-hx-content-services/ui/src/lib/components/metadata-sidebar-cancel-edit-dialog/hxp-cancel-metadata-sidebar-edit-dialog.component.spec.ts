/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HxpCancelMetadataSidebarEditDialogComponent } from './hxp-cancel-metadata-sidebar-edit-dialog.component';
import { MatDialogRef } from '@angular/material/dialog';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { a11yReport } from '@hxp/workspace-hxp/shared/testing';

const EXPECTED_VIOLATIONS: { [violationId: string]: number }[] | undefined = [];

describe('HxpCancelMetadataSidebarEditDialogComponent', () => {
    let component: HxpCancelMetadataSidebarEditDialogComponent;
    let fixture: ComponentFixture<HxpCancelMetadataSidebarEditDialogComponent>;
    let mockDialogRef: jest.Mocked<MatDialogRef<HxpCancelMetadataSidebarEditDialogComponent>>;
    let dialogRef: MatDialogRef<HxpCancelMetadataSidebarEditDialogComponent>;

    beforeEach(async () => {
        mockDialogRef = {
            close: jest.fn(),
        } as unknown as jest.Mocked<MatDialogRef<HxpCancelMetadataSidebarEditDialogComponent>>;
        await TestBed.configureTestingModule({
            imports: [HxpCancelMetadataSidebarEditDialogComponent, NoopTranslateModule],
            providers: [{ provide: MatDialogRef, useValue: mockDialogRef }],
        }).compileComponents();

        dialogRef = TestBed.inject(MatDialogRef);
        spyOn(dialogRef, 'close');

        fixture = TestBed.createComponent(HxpCancelMetadataSidebarEditDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should close dialog when Continue button is clicked', () => {
        const continueBtn = fixture.nativeElement.querySelector('[data-automation-id="continue-editing-button"]');
        continueBtn.click();
        expect(dialogRef.close).toHaveBeenCalled();
    });

    it('should emit closeSidebar and close dialog when Discard button is clicked', () => {
        spyOn(component.discardChanges, 'emit');
        const discardBtn = fixture.nativeElement.querySelector('[data-automation-id="discard-button"]');
        discardBtn.click();
        expect(dialogRef.close).toHaveBeenCalled();
        expect(component.discardChanges.emit).toHaveBeenCalled();
    });

    it('should emit saveAndExitSidebar and close dialog when Save and Exit button is clicked', () => {
        spyOn(component.saveChanges, 'emit');
        const saveExitBtn = fixture.nativeElement.querySelector('[data-automation-id="save-and-exit-button"]');
        saveExitBtn.click();
        expect(dialogRef.close).toHaveBeenCalled();
        expect(component.saveChanges.emit).toHaveBeenCalled();
    });

    it('should pass accessibility checks', async () => {
        document.body.append(fixture.nativeElement);
        fixture.detectChanges();
        await fixture.whenStable();

        const result = await a11yReport(fixture.nativeElement);

        fixture.nativeElement.remove();

        expect(result?.violations).toEqual(EXPECTED_VIOLATIONS);
    });
});
