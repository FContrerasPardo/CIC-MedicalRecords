/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { RecordPropertiesButtonComponent } from './record-properties-button.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RecordPropertiesButtonService } from './record-properties-button.service';
import { MatButtonHarness } from '@angular/material/button/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HarnessLoader } from '@angular/cdk/testing';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { GovernanceRecord, ActionContext } from '../../../../shared/definitions/governance-shared.interface';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { a11yReport } from '@hxp/workspace-hxp/shared/testing';

describe('RecordPropertiesButtonComponent', () => {
    let component: RecordPropertiesButtonComponent;
    let fixture: any;
    let loader: HarnessLoader;
    let mockService: RecordPropertiesButtonService;

    const mockRecord: GovernanceRecord = {
        id: 'rec-001',
        contentID: '1',
        fileName: 'Test Record',
        status: 'Ready',
        environmentDataSourceId: '',
        cutOffDate: new Date().toISOString(),
        categoryId: '',
        retainUntil: new Date().toISOString(),
    };

    const mockContext: ActionContext = {
        records: [mockRecord],
        showPanel: false,
    };

    beforeEach(() => {
        mockService = {
            isAvailable: jest.fn().mockReturnValue(true),
            execute: jest.fn(),
        } as unknown as RecordPropertiesButtonService;

        TestBed.configureTestingModule({
            imports: [RecordPropertiesButtonComponent, NoopTranslateModule, NoopAnimationsModule, MatIconTestingModule],
            providers: [{ provide: RecordPropertiesButtonService, useValue: mockService }],
        });

        fixture = TestBed.createComponent(RecordPropertiesButtonComponent);
        component = fixture.componentInstance;
        loader = TestbedHarnessEnvironment.loader(fixture);
    });

    it('should render the button as disabled when isAvailable is false', async () => {
        mockService.isAvailable = jest.fn().mockReturnValue(false);
        component.actionContext = { records: [] };
        fixture.detectChanges();

        const button = await loader.getHarness(MatButtonHarness);
        expect(await button.isDisabled()).toBe(true);
    });

    it('should render the button as enabled when isAvailable is true', async () => {
        component.actionContext = mockContext;
        fixture.detectChanges();

        const button = await loader.getHarness(MatButtonHarness);
        expect(await button.isDisabled()).toBe(false);
    });

    it('should call service.execute with showPanel true when clicked', async () => {
        component.actionContext = mockContext;
        fixture.detectChanges();

        const button = await loader.getHarness(MatButtonHarness);
        await button.click();

        expect(mockService.execute).toHaveBeenCalledWith({
            ...mockContext,
            showPanel: true,
        });
    });

    it('should pass accessibility audit', async () => {
        component.actionContext = mockContext;
        fixture.detectChanges();
        const report = await a11yReport(fixture.nativeElement);
        expect(report?.violations).toEqual([]);
    });
});
