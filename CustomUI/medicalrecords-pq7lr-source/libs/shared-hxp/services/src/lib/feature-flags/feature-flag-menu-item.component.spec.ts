/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NoopTranslateModule } from '@alfresco/adf-core';
import { FeaturesServiceToken, FlagsComponent, FlagsOverrideToken, IFeaturesService } from '@alfresco/adf-core/feature-flags';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { FeatureFlagsMenuItemComponent } from './feature-flag-menu-item.component';
import { MatIconTestingModule } from '@angular/material/icon/testing';

describe('FeatureFlagsMenuItemComponent', () => {
    let component: FeatureFlagsMenuItemComponent;
    let fixture: ComponentFixture<FeatureFlagsMenuItemComponent>;
    let mockDialog: jest.Mocked<MatDialog>;
    let mockFeaturesService: jest.Mocked<IFeaturesService>;

    beforeEach(async () => {
        mockDialog = {
            open: jest.fn(),
        } as any;
        mockFeaturesService = {
            isOn$: jest.fn().mockReturnValue(true),
        } as any;

        await TestBed.configureTestingModule({
            imports: [FeatureFlagsMenuItemComponent, NoopTranslateModule, MatIconTestingModule],
            providers: [
                { provide: FlagsOverrideToken, useValue: true },
                { provide: FeaturesServiceToken, useValue: mockFeaturesService },
                { provide: MatDialog, useValue: mockDialog },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(FeatureFlagsMenuItemComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should render button when isVisible is true', () => {
        expect(component.isVisible).toBe(true);

        const button = fixture.nativeElement.querySelector('[data-automation-id="features"]');

        expect(button).toBeTruthy();
    });

    it('should open feature flags dialog with correct configuration', () => {
        component.openFeatureFlags();

        expect(mockDialog.open).toHaveBeenCalledWith(FlagsComponent, {
            width: '700px',
            height: '500px',
            panelClass: 'override-features-dialog',
        });
    });
});

describe('FeatureFlagsMenuItemComponent without FlagsOverrideToken', () => {
    let component: FeatureFlagsMenuItemComponent;
    let fixture: ComponentFixture<FeatureFlagsMenuItemComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [FeatureFlagsMenuItemComponent, NoopTranslateModule],
            providers: [MatDialog],
        }).compileComponents();

        fixture = TestBed.createComponent(FeatureFlagsMenuItemComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should not render button when isVisible is false', () => {
        expect(component.isVisible).toBe(false);

        const button = fixture.nativeElement.querySelector('[data-automation-id="features"]');

        expect(button).toBeFalsy();
    });
});
