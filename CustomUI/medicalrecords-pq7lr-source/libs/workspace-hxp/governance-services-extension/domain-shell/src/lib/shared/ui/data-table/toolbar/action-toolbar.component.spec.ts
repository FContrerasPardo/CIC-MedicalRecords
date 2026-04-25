/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActionToolbarComponent } from './action-toolbar.component';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { a11yReport } from '@hxp/workspace-hxp/shared/testing';

describe('ActionToolbarComponent', () => {
    let component: ActionToolbarComponent;
    let fixture: ComponentFixture<ActionToolbarComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ActionToolbarComponent, NoopTranslateModule, NoopAnimationsModule, MatIconTestingModule],
        }).compileComponents();

        fixture = TestBed.createComponent(ActionToolbarComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    describe('behavior', () => {
        it('should render toolbar with default state (no selection)', () => {
            expect(component.hasSelection).toBe(false);
            expect(component.selectedCount).toBe(0);
        });

        it('should show selection count when hasSelection is true', () => {
            component.hasSelection = true;
            component.selectedCount = 3;
            fixture.detectChanges();
            const selectedSpan = fixture.nativeElement.querySelector('.hxp-governance-toolbar-selected');
            expect(selectedSpan?.textContent).toContain('GOVERNANCE.SEARCH_RESULTS.SELECTED_RESULTS_COUNT');
        });

        it('should call clearAll when clear button is clicked', () => {
            const clearAllSpy = jest.fn();
            component.hasSelection = true;
            component.selectedCount = 2;
            component.clearAll = clearAllSpy;
            fixture.detectChanges();

            const clearBtn: HTMLButtonElement = fixture.nativeElement.querySelector('button[mat-icon-button]');
            clearBtn.click();
            expect(clearAllSpy).toHaveBeenCalled();
        });

        it('should show divider when showDivider is true and hasSelection is true', () => {
            component.hasSelection = true;
            component.showDivider = true;
            fixture.detectChanges();
            const divider = fixture.nativeElement.querySelector('.hxp-governance-toolbar-divider');
            expect(divider).toBeTruthy();
        });

        it('should hide divider when showDivider is false', () => {
            component.hasSelection = true;
            component.showDivider = false;
            fixture.detectChanges();
            const divider = fixture.nativeElement.querySelector('.hxp-governance-toolbar-divider');
            expect(divider).toBeFalsy();
        });
    });

    describe('accessibility', () => {
        it('should pass accessibility audit (no selection)', async () => {
            const report = await a11yReport(fixture.nativeElement);
            expect(report?.violations).toEqual([]);
        });

        it('should pass accessibility audit (with selection)', async () => {
            component.hasSelection = true;
            component.selectedCount = 1;
            component.clearAll = jest.fn();
            fixture.detectChanges();
            const report = await a11yReport(fixture.nativeElement);
            expect(report?.violations).toEqual([]);
        });
    });
});
