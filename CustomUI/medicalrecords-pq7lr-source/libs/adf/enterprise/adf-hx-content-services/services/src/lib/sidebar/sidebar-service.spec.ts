/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { SidebarService, PanelType } from './sidebar-service';

describe('SidebarService', () => {
    let service: SidebarService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [SidebarService],
        });
        service = TestBed.inject(SidebarService);
    });

    describe('panel signal', () => {
        it('should initialize with null value', () => {
            expect(service.panel()).toBeNull();
        });

        it('should be a signal', () => {
            expect(typeof service.panel).toBe('function');
        });
    });

    describe('togglePanel', () => {
        it('should set panel to property when called with property and panel is null', () => {
            service.togglePanel('property');
            expect(service.panel()).toBe('property');
        });

        it('should set panel to permission when called with permission and panel is null', () => {
            service.togglePanel('permission');
            expect(service.panel()).toBe('permission');
        });

        it('should set panel to version when called with version and panel is null', () => {
            service.togglePanel('version');
            expect(service.panel()).toBe('version');
        });

        it('should set panel to null when closing the panel', () => {
            service.togglePanel('property');
            service.closePanel();
            expect(service.panel()).toBeNull();
        });

        it('should toggle panel to null when called with the same panel type', () => {
            service.togglePanel('property');
            expect(service.panel()).toBe('property');

            service.togglePanel('property');
            expect(service.panel()).toBeNull();
        });

        it('should switch panel type when called with different panel type', () => {
            service.togglePanel('property');
            expect(service.panel()).toBe('property');

            service.togglePanel('version');
            expect(service.panel()).toBe('version');
        });

        it('should handle multiple toggles correctly', () => {
            // Open property panel
            service.togglePanel('property');
            expect(service.panel()).toBe('property');

            // Close property panel
            service.togglePanel('property');
            expect(service.panel()).toBeNull();

            // Open version panel
            service.togglePanel('version');
            expect(service.panel()).toBe('version');

            // Switch to permission panel
            service.togglePanel('permission');
            expect(service.panel()).toBe('permission');

            // Close permission panel
            service.togglePanel('permission');
            expect(service.panel()).toBeNull();
        });

        it('should handle rapid panel switching', () => {
            service.togglePanel('property');
            service.togglePanel('version');
            service.togglePanel('permission');
            expect(service.panel()).toBe('permission');
        });

        it('should close any open panel when calling closePanel', () => {
            service.togglePanel('property');
            expect(service.panel()).toBe('property');

            service.closePanel();
            expect(service.panel()).toBeNull();
        });

        it('should remain null when calling closePanel while already null', () => {
            expect(service.panel()).toBeNull();
            service.closePanel();
            expect(service.panel()).toBeNull();
        });
    });

    describe('signal reactivity', () => {
        it('should allow effects to react to panel changes', () => {
            const values: PanelType[] = [];

            // Simulate effect tracking
            const trackValue = () => {
                values.push(service.panel());
            };

            trackValue(); // Initial value
            service.togglePanel('property');
            trackValue();
            service.togglePanel('version');
            trackValue();
            service.togglePanel('version');
            trackValue();

            expect(values).toEqual([null, 'property', 'version', null]);
        });

        it('should update signal value immediately', () => {
            expect(service.panel()).toBeNull();

            service.togglePanel('property');
            expect(service.panel()).toBe('property');

            service.togglePanel('permission');
            expect(service.panel()).toBe('permission');
        });
    });

    describe('edge cases', () => {
        it('should maintain type safety with PanelType', () => {
            const validTypes: PanelType[] = ['property', 'permission', 'version', null];

            for (const type of validTypes) {
                service.togglePanel(type);
                expect([null, 'property', 'permission', 'version']).toContain(service.panel());
            }
        });
    });
});
