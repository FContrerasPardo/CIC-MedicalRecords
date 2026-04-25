/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SearchFilterInputComponent } from './search-filter-input.component';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { a11yReport } from '@hxp/workspace-hxp/shared/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';

const EXPECTED_VIOLATIONS: { [violationId: string]: number }[] | undefined = [{ label: 1 }];

describe('WorkspaceHxpSharedSearchFilterInputComponent', () => {
    let component: SearchFilterInputComponent;
    let fixture: ComponentFixture<SearchFilterInputComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CommonModule, FormsModule, SearchFilterInputComponent, NoopTranslateModule, NoopAnimationsModule, MatIconTestingModule],
        }).compileComponents();

        fixture = TestBed.createComponent(SearchFilterInputComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should emit search event when applyFilter is called without applyOnEnter', () => {
        jest.spyOn(component.search, 'emit');

        const event = new KeyboardEvent('keyup', { key: 'a' });
        component.applyOnEnter = false;
        component.searchTerm = 'test';
        component.applyFilter(event);

        expect(component.search.emit).toHaveBeenCalledWith('test');
    });

    it('should emit search event when applyFilter is called with applyOnEnter and Enter key is pressed', () => {
        jest.spyOn(component.search, 'emit');

        const event = new KeyboardEvent('keyup', { key: 'Enter' });
        component.applyOnEnter = true;
        component.searchTerm = 'test';
        component.applyFilter(event);

        expect(component.search.emit).toHaveBeenCalledWith('test');
    });

    it('should not emit search event when applyFilter is called with applyOnEnter and non-Enter key is pressed', () => {
        jest.spyOn(component.search, 'emit');

        const event = new KeyboardEvent('keyup', { key: 'a' });
        component.applyOnEnter = true;
        component.searchTerm = 'test';
        component.applyFilter(event);

        expect(component.search.emit).not.toHaveBeenCalled();
    });

    it('should clear searchTerm and emit clear event when clearInput is called', () => {
        jest.spyOn(component.clear, 'emit');

        component.searchTerm = 'test';
        component.clearInput();

        expect(component.searchTerm).toBe('');
        expect(component.clear.emit).toHaveBeenCalled();
    });

    it('should emit prefixClick event when onPrefixClick is called', () => {
        jest.spyOn(component.prefixClick, 'emit');

        component.onPrefixClick();

        expect(component.prefixClick.emit).toHaveBeenCalled();
    });

    it('should pass accessibility test', async () => {
        await fixture.whenStable();

        const searchFilterInput = await a11yReport('.hxp-search-filter-input');

        expect(searchFilterInput?.violations).toEqual(EXPECTED_VIOLATIONS);
    });
});
