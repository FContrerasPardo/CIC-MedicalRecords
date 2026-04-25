/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultsPaginatorComponent } from './results-paginator.component';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { a11yReport, defaultConfiguration } from '@hxp/workspace-hxp/shared/testing';

describe('ResultsPaginatorComponent', () => {
    let component: ResultsPaginatorComponent;
    let fixture: ComponentFixture<ResultsPaginatorComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ResultsPaginatorComponent, NoopTranslateModule, NoopAnimationsModule, MatIconTestingModule],
        }).compileComponents();

        fixture = TestBed.createComponent(ResultsPaginatorComponent);
        component = fixture.componentInstance;
        component.pageSize = 25;
        component.pageSizeOptions = [25, 50, 100];
        fixture.detectChanges();
    });

    it('should emit pageSizeChange when page size changes', () => {
        const spy = jest.spyOn(component.pageSizeChange, 'emit');
        component.onPageSizeChange(50);
        expect(spy).toHaveBeenCalledWith(50);
    });

    it('should emit nextPage when loadNextPage is called', () => {
        const spy = jest.spyOn(component.nextPage, 'emit');
        component.loadNextPage();
        expect(spy).toHaveBeenCalled();
    });

    it('should emit previousPage when loadPreviousPage is called', () => {
        const spy = jest.spyOn(component.previousPage, 'emit');
        component.loadPreviousPage();
        expect(spy).toHaveBeenCalled();
    });

    it('should disable previous button when previousDisabled is true', () => {
        component.previousDisabled = true;
        fixture.detectChanges();
        const prevBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="prev-page-button"]');
        expect(prevBtn.disabled).toBe(true);
    });

    it('should disable next button when nextDisabled is true', () => {
        component.nextDisabled = true;
        fixture.detectChanges();
        const nextBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="next-page-button"]');
        expect(nextBtn.disabled).toBe(true);
    });

    it('should enable navigation buttons when not disabled', () => {
        component.previousDisabled = false;
        component.nextDisabled = false;
        fixture.detectChanges();
        const prevBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="prev-page-button"]');
        const nextBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="next-page-button"]');
        expect(prevBtn.disabled).toBe(false);
        expect(nextBtn.disabled).toBe(false);
    });

    it('should pass accessibility audit', async () => {
        const report = await a11yReport(fixture.nativeElement, defaultConfiguration);
        expect(report?.violations).toEqual([]);
    });
});
