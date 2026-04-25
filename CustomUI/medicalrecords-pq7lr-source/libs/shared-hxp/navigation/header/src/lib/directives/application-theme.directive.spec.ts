/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ApplicationThemeDirective } from './application-theme.directive';
import { ApplicationThemeService } from '../services/application-theme.service';
import { StorageService } from '@alfresco/adf-core';
import { provideMockFeatureFlags } from '@alfresco/adf-core/feature-flags';
import { SHARED_HXP } from '@features';

@Component({
    template: '<div hxpApplicationTheme></div>',
    imports: [ApplicationThemeDirective],
})
class TestComponent {}

describe('ApplicationThemeDirective', () => {
    let mockStorageService: jest.Mocked<StorageService>;

    beforeEach(() => {
        mockStorageService = {
            getItem: jest.fn(),
            setItem: jest.fn(),
        } as unknown as jest.Mocked<StorageService>;
    });

    afterEach(() => {
        TestBed.resetTestingModule();
    });

    it('should set initial color scheme to light on document body', () => {
        mockStorageService.getItem.mockReturnValue('light');

        TestBed.configureTestingModule({
            imports: [TestComponent, ApplicationThemeDirective],
            providers: [
                ApplicationThemeService,
                { provide: StorageService, useValue: mockStorageService },
                provideMockFeatureFlags([SHARED_HXP.STUDIO_DARK_LIGHT_THEME_SWITCH]),
            ],
        });

        const fixture = TestBed.createComponent(TestComponent);
        fixture.detectChanges();
        expect(document.body.style.colorScheme).toBe('light');
    });

    it('should set initial color scheme to dark on document body', () => {
        mockStorageService.getItem.mockReturnValue('dark');

        TestBed.configureTestingModule({
            imports: [TestComponent, ApplicationThemeDirective],
            providers: [
                ApplicationThemeService,
                { provide: StorageService, useValue: mockStorageService },
                provideMockFeatureFlags([SHARED_HXP.STUDIO_DARK_LIGHT_THEME_SWITCH]),
            ],
        });

        const fixture = TestBed.createComponent(TestComponent);
        fixture.detectChanges();
        expect(document.body.style.colorScheme).toBe('dark');
    });

    it('should update color scheme when theme changes', () => {
        mockStorageService.getItem.mockReturnValue('light');

        TestBed.configureTestingModule({
            imports: [TestComponent, ApplicationThemeDirective],
            providers: [
                ApplicationThemeService,
                { provide: StorageService, useValue: mockStorageService },
                provideMockFeatureFlags([SHARED_HXP.STUDIO_DARK_LIGHT_THEME_SWITCH]),
            ],
        });

        const fixture = TestBed.createComponent(TestComponent);
        const themeService = TestBed.inject(ApplicationThemeService);
        fixture.detectChanges();

        expect(document.body.style.colorScheme).toBe('light');

        themeService.setTheme('dark');
        fixture.detectChanges();
        TestBed.flushEffects();

        expect(document.body.style.colorScheme).toBe('dark');
    });

    it('should update color scheme multiple times', () => {
        mockStorageService.getItem.mockReturnValue('light');

        TestBed.configureTestingModule({
            imports: [TestComponent, ApplicationThemeDirective],
            providers: [
                ApplicationThemeService,
                { provide: StorageService, useValue: mockStorageService },
                provideMockFeatureFlags([SHARED_HXP.STUDIO_DARK_LIGHT_THEME_SWITCH]),
            ],
        });

        const fixture = TestBed.createComponent(TestComponent);
        const themeService = TestBed.inject(ApplicationThemeService);
        fixture.detectChanges();

        expect(document.body.style.colorScheme).toBe('light');

        themeService.setTheme('dark');
        fixture.detectChanges();
        TestBed.flushEffects();
        expect(document.body.style.colorScheme).toBe('dark');

        themeService.setTheme('light');
        fixture.detectChanges();
        TestBed.flushEffects();
        expect(document.body.style.colorScheme).toBe('light');

        themeService.setTheme('dark');
        fixture.detectChanges();
        TestBed.flushEffects();
        expect(document.body.style.colorScheme).toBe('dark');
    });

    it('should react to theme toggle', () => {
        mockStorageService.getItem.mockReturnValue('light');

        TestBed.configureTestingModule({
            imports: [TestComponent, ApplicationThemeDirective],
            providers: [
                ApplicationThemeService,
                { provide: StorageService, useValue: mockStorageService },
                provideMockFeatureFlags([SHARED_HXP.STUDIO_DARK_LIGHT_THEME_SWITCH]),
            ],
        });

        const fixture = TestBed.createComponent(TestComponent);
        const themeService = TestBed.inject(ApplicationThemeService);
        fixture.detectChanges();

        expect(document.body.style.colorScheme).toBe('light');

        themeService.toggleTheme();
        fixture.detectChanges();
        TestBed.flushEffects();

        expect(document.body.style.colorScheme).toBe('dark');
    });

    it('should keep color scheme as light when feature flag is disabled and theme is dark', () => {
        mockStorageService.getItem.mockReturnValue('dark');

        TestBed.configureTestingModule({
            imports: [TestComponent, ApplicationThemeDirective],
            providers: [
                ApplicationThemeService,
                { provide: StorageService, useValue: mockStorageService },
                provideMockFeatureFlags({ [SHARED_HXP.STUDIO_DARK_LIGHT_THEME_SWITCH]: false }),
            ],
        });

        const fixture = TestBed.createComponent(TestComponent);
        fixture.detectChanges();
        expect(document.body.style.colorScheme).toBe('light');
    });

    it('should not update color scheme when feature flag is disabled and theme changes', () => {
        mockStorageService.getItem.mockReturnValue('light');

        TestBed.configureTestingModule({
            imports: [TestComponent, ApplicationThemeDirective],
            providers: [
                ApplicationThemeService,
                { provide: StorageService, useValue: mockStorageService },
                provideMockFeatureFlags({ [SHARED_HXP.STUDIO_DARK_LIGHT_THEME_SWITCH]: false }),
            ],
        });

        const fixture = TestBed.createComponent(TestComponent);
        const themeService = TestBed.inject(ApplicationThemeService);
        fixture.detectChanges();

        expect(document.body.style.colorScheme).toBe('light');

        themeService.setTheme('dark');
        fixture.detectChanges();
        TestBed.flushEffects();

        expect(document.body.style.colorScheme).toBe('light');
    });
});
