/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PermissionEmptyTableComponent } from './permission-empty-table.component';
import { By } from '@angular/platform-browser';
import { NoopTranslateModule } from '@alfresco/adf-core';

describe('EmptyTableComponent', () => {
    let component: PermissionEmptyTableComponent;
    let fixture: ComponentFixture<PermissionEmptyTableComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PermissionEmptyTableComponent, NoopTranslateModule],
        }).compileComponents();

        fixture = TestBed.createComponent(PermissionEmptyTableComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should display no permission message for groups', () => {
        component.message = 'PERMISSIONS_MANAGEMENT_ACTION.PERMISSIONS_TABLE.NO_PERMISSION.GROUP';
        fixture.detectChanges();
        const result = fixture.debugElement.query(By.css('.hxp-no-permission-msg')).nativeElement.textContent.trim();
        expect(result).toEqual('PERMISSIONS_MANAGEMENT_ACTION.PERMISSIONS_TABLE.NO_PERMISSION.GROUP');
    });

    it('should display no permission message for users', () => {
        component.message = 'PERMISSIONS_MANAGEMENT_ACTION.PERMISSIONS_TABLE.NO_PERMISSION.USER';
        fixture.detectChanges();
        const result = fixture.debugElement.query(By.css('.hxp-no-permission-msg')).nativeElement.textContent.trim();
        expect(result).toEqual('PERMISSIONS_MANAGEMENT_ACTION.PERMISSIONS_TABLE.NO_PERMISSION.USER');
    });
});
