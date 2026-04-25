/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HxpWorkspaceHeaderComponent } from './header.component';
import { AppConfigService, NoopTranslateModule } from '@alfresco/adf-core';
import { HEADER_CONFIG_TOKEN, HeaderComponent } from '@hxp/shared-hxp/navigation/header';
import { FlagsOverrideToken, provideMockFeatureFlags } from '@alfresco/adf-core/feature-flags';
import { SHARED_HXP } from '@features';
import { ActivatedRoute } from '@angular/router';
import { MockComponent } from 'ng-mocks';

class MockAppConfigService {
    config: { [key: string]: any } = {
        headerColor: 'test-color',
        headerTextColor: 'test-text-color',
        application: {
            name: 'Test App',
            logo: 'test-logo.png',
            headerImagePath: 'test-image.png',
        },
        landingPage: '/mock-landing-page',
    };

    get(key: string, defaultValue: any) {
        return this.config[key] === undefined ? defaultValue : this.config[key];
    }
}

const mockHeaderConfig = {
    title: 'mock-title',
    documentationUrl: 'mock-documentation-url',
};

describe('HxpWorkspaceHeaderComponent', () => {
    let fixture: ComponentFixture<HxpWorkspaceHeaderComponent>;
    let headerComponent: HxpWorkspaceHeaderComponent;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HxpWorkspaceHeaderComponent, NoopTranslateModule, MockComponent(HeaderComponent)],
            providers: [
                { provide: FlagsOverrideToken, useValue: false },
                {
                    provide: HEADER_CONFIG_TOKEN,
                    useValue: mockHeaderConfig,
                },
                {
                    provide: ActivatedRoute,
                    useValue: {},
                },
                { provide: AppConfigService, useClass: MockAppConfigService },
                provideMockFeatureFlags({
                    [SHARED_HXP.STUDIO_DARK_LIGHT_THEME_SWITCH]: false,
                    [SHARED_HXP.STUDIO_UNIFIED_MODERN_UI]: false
                })
            ],
        });

        fixture = TestBed.createComponent(HxpWorkspaceHeaderComponent);
        headerComponent = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should set the header background color from app config', () => {
        expect(headerComponent.backgroundColor()).toBe('test-color');
    });

    it('should set the header text color from app config', () => {
        expect(headerComponent.headerTextColor()).toBe('test-text-color');
    });

    it('should set the logo path from app config', () => {
        expect(headerComponent.logoPath()).toBe('test-logo.png');
    });

    it('should set the header image path from app config', () => {
        expect(headerComponent.backgroundImage()).toBe('test-image.png');
    });
});
