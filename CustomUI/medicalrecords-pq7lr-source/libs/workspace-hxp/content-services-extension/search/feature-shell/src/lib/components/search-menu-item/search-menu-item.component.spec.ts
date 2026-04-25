/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SearchMenuItemComponent } from './search-menu-item.component';
import { MockProvider } from 'ng-mocks';
import { AppConfigService, NoopTranslateModule } from '@alfresco/adf-core';
import { SidenavExpansionService } from '@hxp/workspace-hxp/shared/services';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconTestingModule } from '@angular/material/icon/testing';

describe('SearchMenuItemComponent', () => {
    let fixture: ComponentFixture<SearchMenuItemComponent>;
    let router: Router;

    beforeEach(async () => {
        TestBed.configureTestingModule({
            imports: [
                SearchMenuItemComponent,
                MatIconTestingModule,
                NoopTranslateModule,
                NoopAnimationsModule
            ],
            providers: [
                SidenavExpansionService,
                MockProvider(AppConfigService),
                provideRouter([{ path: 'search', component: SearchMenuItemComponent }])
            ],
        });

        fixture = TestBed.createComponent(SearchMenuItemComponent);
        router = TestBed.inject(Router);
        await RouterTestingHarness.create();
        fixture.detectChanges();
    });

    it('should display the search menu item component', () => {
        const searchMenuItem = fixture.debugElement.query(By.css('[data-automation-id="hxp-search-menu-item"]'));
        expect(searchMenuItem).toBeTruthy();
    });

    it('should navigate to search page when button is clicked', async () => {
        const searchMenuItem = fixture.debugElement.query(By.css('[data-automation-id="hxp-search-menu-item"]'));

        searchMenuItem.nativeElement.click();
        fixture.detectChanges();
        await fixture.whenStable();

        expect(router.url).toBe('/search?type=basic&q=');
    });

    it('should add aria-current attribute when search route is active', async () => {
        const searchMenuItem = fixture.debugElement.query(By.css('[data-automation-id="hxp-search-menu-item"]'));
        expect(searchMenuItem.nativeElement.getAttribute('aria-current')).toBeNull();

        await router.navigate(['/search']);
        fixture.detectChanges();

        expect(searchMenuItem.nativeElement.getAttribute('aria-current')).toBe('page');
    });

    it('should have active class when search route is active', async () => {
        const searchMenuItem = fixture.debugElement.query(By.css('[data-automation-id="hxp-search-menu-item"]'));
        expect(searchMenuItem.nativeElement.classList).not.toContain('hxp-search-menu-item-active');

        await router.navigate(['/search']);
        fixture.detectChanges();

        expect(searchMenuItem.nativeElement.classList).toContain('hxp-search-menu-item-active');
    });

    it('should have correct aria-label for accessibility', () => {
        const searchNavigation = fixture.debugElement.query(By.css('[data-automation-id="hxp-search-navigation"]'));
        expect(searchNavigation.nativeElement.getAttribute('aria-label')).toBe('SEARCH.SIDENAV.ARIA_LABEL');
    });
});
