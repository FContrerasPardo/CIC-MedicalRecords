/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { StorageService } from '@alfresco/adf-core';
import { ApplicationThemeService } from './application-theme.service';

describe('ApplicationThemeService', () => {
    let mockStorageService: jest.Mocked<StorageService>;

    beforeEach(() => {
        mockStorageService = {
            getItem: jest.fn(),
            setItem: jest.fn(),
        } as unknown as jest.Mocked<StorageService>;
    });

    function createService(): ApplicationThemeService {
        TestBed.configureTestingModule({
            providers: [ApplicationThemeService, { provide: StorageService, useValue: mockStorageService }],
        });
        return TestBed.inject(ApplicationThemeService);
    }

    afterEach(() => {
        TestBed.resetTestingModule();
    });

    it('should initialize with light theme when no theme is stored', () => {
        mockStorageService.getItem.mockReturnValue(null);

        const service = createService();

        expect(service.applicationTheme()).toBe('light');
    });

    it('should initialize with stored dark theme', () => {
        mockStorageService.getItem.mockReturnValue('dark');

        const service = createService();

        expect(service.applicationTheme()).toBe('dark');
    });

    it('should initialize with stored light theme', () => {
        mockStorageService.getItem.mockReturnValue('light');

        const service = createService();

        expect(service.applicationTheme()).toBe('light');
    });

    it('should ignore invalid stored theme and default to light', () => {
        mockStorageService.getItem.mockReturnValue('invalid-theme');

        const service = createService();

        expect(service.applicationTheme()).toBe('light');
    });

    it('should toggle theme from light to dark', () => {
        mockStorageService.getItem.mockReturnValue('light');
        const service = createService();

        service.toggleTheme();

        expect(service.applicationTheme()).toBe('dark');
        expect(mockStorageService.setItem).toHaveBeenCalledWith('application-theme', 'dark');
    });

    it('should toggle theme from dark to light', () => {
        mockStorageService.getItem.mockReturnValue('dark');
        const service = createService();

        service.toggleTheme();

        expect(service.applicationTheme()).toBe('light');
        expect(mockStorageService.setItem).toHaveBeenCalledWith('application-theme', 'light');
    });

    it('should toggle theme multiple times', () => {
        mockStorageService.getItem.mockReturnValue('light');
        const service = createService();

        service.toggleTheme();
        expect(service.applicationTheme()).toBe('dark');

        service.toggleTheme();
        expect(service.applicationTheme()).toBe('light');

        service.toggleTheme();
        expect(service.applicationTheme()).toBe('dark');

        expect(mockStorageService.setItem).toHaveBeenCalledTimes(3);
    });

    it('should set theme to dark', () => {
        mockStorageService.getItem.mockReturnValue('light');
        const service = createService();

        service.setTheme('dark');

        expect(service.applicationTheme()).toBe('dark');
        expect(mockStorageService.setItem).toHaveBeenCalledWith('application-theme', 'dark');
    });

    it('should set theme to light', () => {
        mockStorageService.getItem.mockReturnValue('dark');
        const service = createService();

        service.setTheme('light');

        expect(service.applicationTheme()).toBe('light');
        expect(mockStorageService.setItem).toHaveBeenCalledWith('application-theme', 'light');
    });

    it('should update signal when setting theme', () => {
        mockStorageService.getItem.mockReturnValue('light');
        const service = createService();

        expect(service.applicationTheme()).toBe('light');

        service.setTheme('dark');
        expect(service.applicationTheme()).toBe('dark');

        service.setTheme('light');
        expect(service.applicationTheme()).toBe('light');
    });
});
