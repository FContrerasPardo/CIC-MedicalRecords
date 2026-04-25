/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { TablePanelStateService, TablePanelMode } from './table-panel-state.service';

describe('TablePanelStateService', () => {
    let service: TablePanelStateService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [TablePanelStateService],
        });
        service = TestBed.inject(TablePanelStateService);
    });

    describe('initial state', () => {
        it('should initialize with hidden mode', () => {
            expect(service.mode()).toBe(TablePanelMode.Hidden);
        });

        it('should initialize with 40% height', () => {
            expect(service.height()).toBe(40);
        });

        it('should initialize with transitioning as false', () => {
            expect(service.transitioning()).toBe(false);
        });
    });

    describe('maximize', () => {
        it('should set mode to maximized', () => {
            service.maximize();

            expect(service.mode()).toBe(TablePanelMode.Maximized);
        });

        it('should set height to 100%', () => {
            service.maximize();

            expect(service.height()).toBe(100);
        });

        it('should enable transitioning', () => {
            service.maximize();

            expect(service.transitioning()).toBe(true);
        });
    });

    describe('minimize', () => {
        it('should set mode to minimized', () => {
            service.minimize();

            expect(service.mode()).toBe(TablePanelMode.Minimized);
        });

        it('should set height to 3em (header only)', () => {
            service.minimize();

            expect(service.height()).toBe(3);
        });

        it('should enable transitioning', () => {
            service.minimize();

            expect(service.transitioning()).toBe(true);
        });
    });

    describe('setDefault', () => {
        it('should set mode to default', () => {
            service.setDefault();

            expect(service.mode()).toBe(TablePanelMode.Default);
        });

        it('should set height to 40%', () => {
            service.setDefault();

            expect(service.height()).toBe(40);
        });

        it('should enable transitioning', () => {
            service.setDefault();

            expect(service.transitioning()).toBe(true);
        });
    });

    describe('hide', () => {
        it('should set mode to hidden', () => {
            service.mode.set(TablePanelMode.Maximized);

            service.hide();

            expect(service.mode()).toBe(TablePanelMode.Hidden);
        });

        it('should not change height', () => {
            service.height.set(75);

            service.hide();

            expect(service.height()).toBe(75);
        });

        it('should not change transitioning state', () => {
            service.transitioning.set(true);

            service.hide();

            expect(service.transitioning()).toBe(true);
        });
    });

    describe('setHeight', () => {
        it('should set height within valid range', () => {
            service.setHeight(60);

            expect(service.height()).toBe(60);
        });

        it('should clamp height to minimum 20%', () => {
            service.setHeight(10);

            expect(service.height()).toBe(20);
        });

        it('should clamp height to maximum 100%', () => {
            service.setHeight(150);

            expect(service.height()).toBe(100);
        });

        it('should accept boundary value 20%', () => {
            service.setHeight(20);

            expect(service.height()).toBe(20);
        });

        it('should accept boundary value 100%', () => {
            service.setHeight(100);

            expect(service.height()).toBe(100);
        });

        it('should handle negative values by clamping to 20%', () => {
            service.setHeight(-50);

            expect(service.height()).toBe(20);
        });

        it('should handle decimal values', () => {
            service.setHeight(45.5);

            expect(service.height()).toBe(45.5);
        });
    });

    describe('endTransition', () => {
        it('should set transitioning to false', () => {
            service.transitioning.set(true);

            service.endTransition();

            expect(service.transitioning()).toBe(false);
        });
    });

    describe('startTransition', () => {
        it('should set transitioning to true', () => {
            service.transitioning.set(false);

            service.startTransition();

            expect(service.transitioning()).toBe(true);
        });
    });

    describe('integration scenarios', () => {
        it('should handle complete mode cycle', () => {
            // Start hidden
            expect(service.mode()).toBe(TablePanelMode.Hidden);

            // Show minimized
            service.minimize();
            expect(service.mode()).toBe(TablePanelMode.Minimized);
            expect(service.height()).toBe(3);

            // Switch to default
            service.setDefault();
            expect(service.mode()).toBe(TablePanelMode.Default);
            expect(service.height()).toBe(40);

            // Switch to maximized
            service.maximize();
            expect(service.mode()).toBe(TablePanelMode.Maximized);
            expect(service.height()).toBe(100);

            // Switch back to minimized
            service.minimize();
            expect(service.mode()).toBe(TablePanelMode.Minimized);
            expect(service.height()).toBe(3);

            // Hide
            service.hide();
            expect(service.mode()).toBe(TablePanelMode.Hidden);
        });

        it('should handle resize during minimized state', () => {
            service.minimize();
            service.endTransition();

            service.setHeight(65);

            expect(service.mode()).toBe(TablePanelMode.Minimized);
            expect(service.height()).toBe(65);
            expect(service.transitioning()).toBe(false);
        });

        it('should preserve custom height when hiding and showing', () => {
            service.minimize();
            service.setHeight(55);
            const heightBeforeHide = service.height();

            service.hide();
            expect(service.height()).toBe(heightBeforeHide);

            service.minimize();
            // minimize() resets to 3em, this is expected behavior
            expect(service.height()).toBe(3);
        });
    });
});
