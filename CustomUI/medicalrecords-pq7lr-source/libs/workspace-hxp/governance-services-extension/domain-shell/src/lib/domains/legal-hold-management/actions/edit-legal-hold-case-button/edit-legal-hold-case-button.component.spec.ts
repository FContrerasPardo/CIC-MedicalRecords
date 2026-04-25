/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditLegalHoldCaseButtonComponent } from './edit-legal-hold-case-button.component';
import { EditLegalHoldCaseButtonService } from './edit-legal-hold-case-button.service';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatButtonHarness } from '@angular/material/button/testing';
import { LegalActionContext, LegalHoldCase } from '../../definitions/legal-hold.interface';
import { HarnessLoader } from '@angular/cdk/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { a11yReport } from '@hxp/workspace-hxp/shared/testing';

describe('EditLegalHoldCaseButtonComponent', () => {
    let component: EditLegalHoldCaseButtonComponent;
    let fixture: ComponentFixture<EditLegalHoldCaseButtonComponent>;
    let loader: HarnessLoader;
    let mockService: EditLegalHoldCaseButtonService;

    const mockRecord: LegalHoldCase = {
        legalCaseId: 'lc-001',
        legalCaseName: 'Test Legal Hold Case',
        legalCaseReason: 'Test Reason',
        legalCaseDescription: 'Test Description',
    };

    const mockContext: LegalActionContext = {
        legalHoldCases: [mockRecord],
    };

    beforeEach(() => {
        mockService = {
            isAvailable: jest.fn().mockReturnValue(true),
            execute: jest.fn(),
        } as unknown as EditLegalHoldCaseButtonService;

        TestBed.configureTestingModule({
            imports: [EditLegalHoldCaseButtonComponent, NoopTranslateModule, NoopAnimationsModule, MatIconTestingModule],
            providers: [{ provide: EditLegalHoldCaseButtonService, useValue: mockService }],
        }).compileComponents();

        fixture = TestBed.createComponent(EditLegalHoldCaseButtonComponent);
        component = fixture.componentInstance;
        loader = TestbedHarnessEnvironment.loader(fixture);
    });

    it('should not render the button when isAvailable is false', async () => {
        mockService.isAvailable = jest.fn().mockReturnValue(false);
        component.legalActionContext = { legalHoldCases: [] };
        fixture.detectChanges();

        const buttons = await loader.getAllHarnesses(MatButtonHarness);
        expect(buttons.length).toBe(0);
    });

    it('should render the button when isAvailable is true', async () => {
        component.legalActionContext = mockContext;
        fixture.detectChanges();

        const buttons = await loader.getAllHarnesses(MatButtonHarness);
        expect(buttons.length).toBe(1);
    });

    it('should call service.execute when clicked', async () => {
        component.legalActionContext = mockContext;
        fixture.detectChanges();

        const button = await loader.getHarness(MatButtonHarness);
        await button.click();

        expect(mockService.execute).toHaveBeenCalledWith(mockContext);
    });

    it('should pass accessibility audit', async () => {
        component.legalActionContext = mockContext;
        fixture.detectChanges();
        const report = await a11yReport(fixture.nativeElement);
        expect(report?.violations).toEqual([]);
    });
});
