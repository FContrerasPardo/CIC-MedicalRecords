/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentMoreActionComponent } from './document-more-action.component';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { jestMocks } from '@hxp/workspace-hxp/shared/testing';
import { HttpClientModule } from '@angular/common/http';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { ContentActionRef } from '@alfresco/adf-extensions';

const mockMenuItems: ContentActionRef = {
    id: 'app.document.more',
    type: 'menu',
    icon: 'more_vert',
    title: 'APP.ACTIONS.MORE',
    children: [
        { id: 'action.one', type: 'custom', component: 'action.one' },
    ],
};

const mockEmptyMenuItems: ContentActionRef = {
    ...mockMenuItems,
    children: [],
};

describe('DocumentMoreActionComponent', () => {
    let component: DocumentMoreActionComponent;
    let fixture: ComponentFixture<DocumentMoreActionComponent>;
    let button: DebugElement;
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DocumentMoreActionComponent, HttpClientModule, MatIconTestingModule],
        }).compileComponents();

        fixture = TestBed.createComponent(DocumentMoreActionComponent);
        component = fixture.componentInstance;
        button = fixture.debugElement.query(By.css('button.hxp-more-action-button'));
        fixture.detectChanges();
    });

    it('should not be in DOM on element instantiation', () => {
        expect(button).toBeNull();
    });

    it('should not be in DOM the button when file without blob', () => {
        component.actionContext = { documents: [] };
        fixture.detectChanges();
        expect(button).toBeFalsy();
    });

    it('should be in DOM when file contains blob', () => {
        component.actionContext = { documents: [jestMocks.fileDocument] };
        fixture.detectChanges();
        button = fixture.debugElement.query(By.css('div.hxp-more-action-button'));
        expect(button).toBeTruthy();
    });

    it('should not render the more menu button when menuItems has no children', () => {
        component.actionContext = { documents: [jestMocks.fileDocument] };
        component.menuItems = mockEmptyMenuItems;
        fixture.detectChanges();
        const moreButton = fixture.debugElement.query(By.css('button[mat-icon-button]'));

        expect(moreButton).toBeNull();
    });

    it('should render the more menu button when menuItems has children and items are available', () => {
        component.actionContext = { documents: [jestMocks.fileDocument] };
        component.menuItems = mockMenuItems;
        component.isAvailable.set(true);
        fixture.detectChanges();
        const moreButton = fixture.debugElement.query(By.css('button[mat-icon-button]'));

        expect(moreButton).toBeTruthy();
    });

    it('should not render the more menu button when menuItems is not provided', () => {
        component.actionContext = { documents: [jestMocks.fileDocument] };
        fixture.detectChanges();
        const moreButton = fixture.debugElement.query(By.css('button[mat-icon-button]'));

        expect(moreButton).toBeNull();
    });
});
