/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NoopTranslateModule } from '@alfresco/adf-core';
import { DocumentService } from '@alfresco/adf-hx-content-services/services';
import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { a11yReport, mocks } from '@hxp/workspace-hxp/shared/testing';
import { SelectedItemCountComponent } from './selected-item-count.component';
import { MatIconTestingModule } from '@angular/material/icon/testing';

const EXPECTED_VIOLATIONS: { [violationId: string]: number }[] | undefined = [];

describe('SelectedItemCountComponent', () => {
    let component: SelectedItemCountComponent;
    let fixture: ComponentFixture<SelectedItemCountComponent>;
    let clearSelectionSpy: jest.Mock;
    let documentServiceSpy: jest.Mocked<Partial<DocumentService>>;

    beforeEach(async () => {
        documentServiceSpy = {
            clearSelectionDocumentList: jest.fn().mockReturnValue(undefined),
        };
        clearSelectionSpy = documentServiceSpy.clearSelectionDocumentList as jest.Mock;

        await TestBed.configureTestingModule({
            imports: [CommonModule, NoopTranslateModule, SelectedItemCountComponent, MatIconTestingModule],
            providers: [{ provide: DocumentService, useValue: documentServiceSpy }],
        }).compileComponents();

        fixture = TestBed.createComponent(SelectedItemCountComponent);
        component = fixture.componentInstance;
    });

    it('should render the correct selected item count', () => {
        const selectedItems = [mocks.fileDocument, mocks.folderDocument];
        component.selectedItems = selectedItems;

        fixture.detectChanges();

        const selectedItemCountElement = fixture.nativeElement.querySelector('.hxp-selected-item-count');
        const selectedItemCountText = selectedItemCountElement.querySelector('span').textContent;
        expect(selectedItemCountText).toContain(selectedItems.length.toString());
    });

    it("should uncheck all checkbox when 'Clear All' button is clicked", () => {
        component.selectedItems = [mocks.fileDocument];

        fixture.detectChanges();

        const clearAllButton = fixture.nativeElement.querySelector('.hxp-clear-selection button');
        clearAllButton.click();

        expect(clearSelectionSpy).toHaveBeenCalled();
    });

    it('should pass accessibility checks', waitForAsync(async () => {
        component.selectedItems = [mocks.fileDocument];

        fixture.detectChanges();

        await fixture.whenStable();
        const res = await a11yReport('.hxp-document-list-count');

        expect(res.violations).toEqual(EXPECTED_VIOLATIONS);
    }));
});
