/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApplicationThemeActionComponent } from './application-theme-action.component';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { type ApplicationTheme, ApplicationThemeService } from '../../services/application-theme.service';
import { MockProvider } from 'ng-mocks';

describe('ApplicationThemeActionComponent', () => {
    let component: ApplicationThemeActionComponent;
    let fixture: ComponentFixture<ApplicationThemeActionComponent>;
    let mockApplicationThemeService: ApplicationThemeService;
    let mockServiceTheme: WritableSignal<ApplicationTheme>;

    beforeEach(() => {
        mockServiceTheme = signal('light');

        TestBed.configureTestingModule({
            imports: [ApplicationThemeActionComponent, NoopTranslateModule],
            providers: [
                ApplicationThemeService,
                MockProvider(ApplicationThemeService, {
                    applicationTheme: mockServiceTheme,
                    toggleTheme: jest.fn().mockImplementation(() => {
                        const newTheme: ApplicationTheme = mockServiceTheme() === 'light' ? 'dark' : 'light';
                        mockServiceTheme.set(newTheme);
                    }),
                }),
            ],
        });

        fixture = TestBed.createComponent(ApplicationThemeActionComponent);
        component = fixture.componentInstance;
        mockApplicationThemeService = TestBed.inject(ApplicationThemeService);
    });

    it('should initialize with light theme when no theme is stored', () => {
        expect(component.theme()).toBe('light');
    });

    it('should initialize with stored theme from storage', () => {
        mockServiceTheme.set('dark');

        expect(component.theme()).toBe('dark');
    });

    it('should stop event propagation when toggling theme', () => {
        const event = new Event('click');
        const stopPropagationSpy = jest.spyOn(event, 'stopImmediatePropagation');

        component.toggleTheme(event);

        expect(stopPropagationSpy).toHaveBeenCalled();
    });

    it('should toggle theme from light to dark', () => {
        const event = new Event('click');
        component.toggleTheme(event);

        expect(component.theme()).toBe('dark');
        expect(mockApplicationThemeService.toggleTheme).toHaveBeenCalledTimes(1);
    });

    it('should toggle theme from dark to light', () => {
        mockServiceTheme.set('dark');

        const event = new Event('click');
        component.toggleTheme(event);

        expect(component.theme()).toBe('light');
        expect(mockApplicationThemeService.toggleTheme).toHaveBeenCalledTimes(1);
    });

    it('should toggle theme multiple times correctly', () => {
        const event = new Event('click');

        component.toggleTheme(event);
        expect(component.theme()).toBe('dark');

        component.toggleTheme(event);
        expect(component.theme()).toBe('light');

        component.toggleTheme(event);
        expect(component.theme()).toBe('dark');

        expect(mockApplicationThemeService.toggleTheme).toHaveBeenCalledTimes(3);
    });

    it('should set aria-label based on current theme', () => {
        mockServiceTheme.set('light');
        fixture.detectChanges();
        let buttonElement: HTMLElement = fixture.nativeElement.querySelector('button');
        expect(buttonElement.getAttribute('aria-label')).toBe('HEADER.ACTIONS.THEME_SWITCH.DARK_LABEL');

        mockServiceTheme.set('dark');
        fixture.detectChanges();
        buttonElement = fixture.nativeElement.querySelector('button');
        expect(buttonElement.getAttribute('aria-label')).toBe('HEADER.ACTIONS.THEME_SWITCH.LIGHT_LABEL');
    });
});
