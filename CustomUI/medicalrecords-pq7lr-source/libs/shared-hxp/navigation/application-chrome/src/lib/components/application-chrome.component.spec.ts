/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApplicationChromeComponent } from './application-chrome.component';
import { NoopAuthModule, NoopTranslateModule } from '@alfresco/adf-core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AppListService } from '../services/app-list.service';
import { of } from 'rxjs';
import { mockDisplayName, mockGlobalApps, mockSelectedEnv } from '../mocks/components/application-chrome.component.mock';
import { AppEnvService } from '../services/app-env.service';
import { UserInfoService } from '../services/user-info.service';
import { NavigationService } from '../services/navigation.service';
import { By } from '@angular/platform-browser';
import { DisplayModeService, FormCloudDisplayMode } from '@alfresco/adf-process-services-cloud';
import { AppKeyService } from '../services/app-key.service';
import { mockAppV1, mockAppV2, mockIconV1, mockIconV2, mockNavIcons } from '../mocks/pipes/nav-icon.pipe.mock';
import { mockAppV1 as mockActiveAppV1, mockAppV2 as mockActiveAppV2, mockCurrentAppKey } from '../mocks/pipes/nav-active.pipe.mock';
import { ContextApp } from '../interfaces/context-app.interface';
import { NAV_ICONS_TOKEN } from '../tokens/nav-icons.token';
import { MatIconTestingModule } from '@angular/material/icon/testing';

describe('ApplicationChromeComponent', () => {
    let fixture: ComponentFixture<ApplicationChromeComponent>;

    afterEach(() => {
        fixture.destroy();
    });

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [ApplicationChromeComponent, NoopTranslateModule, NoopAuthModule, NoopAnimationsModule, MatIconTestingModule],
            providers: [
                {
                    provide: AppListService,
                    useValue: {
                        globalApps$: of(mockGlobalApps),
                    },
                },
                {
                    provide: AppEnvService,
                    useValue: {
                        selectedEnv$: of(mockSelectedEnv),
                    },
                },
                {
                    provide: UserInfoService,
                    useValue: {
                        displayName: mockDisplayName,
                    },
                },
                {
                    provide: NavigationService,
                    useValue: {
                        goTo: jest.fn(),
                    },
                },
                {
                    provide: AppKeyService,
                    useValue: {
                        currentKey: mockCurrentAppKey,
                    },
                },
                DisplayModeService,
            ],
        })
            .overrideProvider(NAV_ICONS_TOKEN, { useValue: mockNavIcons })
            .compileComponents();

        fixture = TestBed.createComponent(ApplicationChromeComponent);

        fixture.detectChanges();
    });

    it('should display 3 nav items which include home plus 2 apps belonging to the selected env', () => {
        const navItems = fixture.debugElement.queryAll(By.css('sat-platform-nav-list-item'));

        expect(navItems.length).toBe(3);
        expect(navItems[0].query(By.css('.sat-platform-nav-item-label')).nativeElement.textContent.trim()).toBe('APP_CHROME.APP_LIST.HOME');
        expect(navItems[1].query(By.css('.sat-platform-nav-item-label')).nativeElement.textContent.trim()).toBe('mock-app-localized-name-v1');
        expect(navItems[2].query(By.css('.sat-platform-nav-item-label')).nativeElement.textContent.trim()).toBe('mock-app-localized-name-v2');
    });

    it('should display user name', () => {
        const userProfile = fixture.debugElement.query(By.css('sat-platform-nav-user-profile .sat-platform-nav-item-label'));
        expect(userProfile.nativeElement.textContent.trim()).toBe('mock-first-name mock-last-name');
    });

    it('should hide the navbar when fullscreen on form is triggered', () => {
        DisplayModeService.changeDisplayMode({ displayMode: FormCloudDisplayMode.fullScreen, id: 'fake-form-id' });

        fixture.detectChanges();

        const platformNav = fixture.debugElement.query(By.css('sat-platform-nav'));
        expect(platformNav).toBeFalsy();
    });

    describe('getNavigationItemFromContextApp', () => {
        it('should return navigation item with icon when icon list contains app id', () => {
            const result = fixture.componentInstance.getNavigationItemFromContextApp(mockAppV1);

            expect(result.icon).toBe(mockIconV1);
        });

        it('should return navigation item with icon when icon list contains app id (second app)', () => {
            const result = fixture.componentInstance.getNavigationItemFromContextApp(mockAppV2);

            expect(result.icon).toBe(mockIconV2);
        });

        it('should return navigation item with undefined icon when icon list does not contain app id', () => {
            const mockAppV3: ContextApp = {
                id: 'mock-id-v3',
                name: 'mock-name-v3',
                launchUrl: 'mock-launch-url-v3',
            };

            const result = fixture.componentInstance.getNavigationItemFromContextApp(mockAppV3);

            expect(result.icon).toBeUndefined();
        });

        it('should return navigation item with active true when appKey matches current appKey', () => {
            const result = fixture.componentInstance.getNavigationItemFromContextApp(mockActiveAppV1);

            expect(result.active).toBe(true);
        });

        it('should return navigation item with active false when appKey does not match current appKey', () => {
            const result = fixture.componentInstance.getNavigationItemFromContextApp(mockActiveAppV2);

            expect(result.active).toBe(false);
        });

        it('should return navigation item with correct label and path', () => {
            const result = fixture.componentInstance.getNavigationItemFromContextApp(mockAppV1);

            expect(result.label).toBe(mockAppV1.name);
            expect(result.path).toBe(mockAppV1.launchUrl);
        });
    });
});
