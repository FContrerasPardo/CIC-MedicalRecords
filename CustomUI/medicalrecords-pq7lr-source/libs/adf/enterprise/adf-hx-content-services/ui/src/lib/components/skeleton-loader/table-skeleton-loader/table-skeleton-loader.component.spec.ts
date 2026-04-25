/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TableSkeletonLoaderComponent } from './table-skeleton-loader.component';
import { By } from '@angular/platform-browser';

@Component({
    template: '<hxp-table-skeleton-loader [skeletonRows]="rows" />',
    imports: [TableSkeletonLoaderComponent],
})
class TestHostComponent {
    rows?: number;
}

describe('TableSkeletonLoaderComponent', () => {
    let fixture: ComponentFixture<TestHostComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TestHostComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(TestHostComponent);
        fixture.detectChanges();
    });

    it('should render 5 skeleton rows by default', () => {
        const rows = fixture.debugElement.queryAll(By.css('tbody tr'));

        expect(rows.length).toBe(5);
    });

    it('should render the correct number of skeleton rows when @Input() skeletonRows is set', () => {
        const component = fixture.componentInstance;
        component.rows = 7;
        fixture.detectChanges();
        let rows = fixture.debugElement.queryAll(By.css('tbody tr'));

        expect(rows.length).toBe(7);

        component.rows = 0;
        fixture.detectChanges();
        rows = fixture.debugElement.queryAll(By.css('tbody tr'));

        expect(rows.length).toBe(0);
    });
});
