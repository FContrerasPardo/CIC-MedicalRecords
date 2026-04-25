/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { RecordDeleteButtonComponent } from './record-delete-button.component';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RecordDeleteButtonService } from './record-delete-button.service';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatButtonHarness } from '@angular/material/button/testing';
import { of } from 'rxjs';
import { ActionContext, GovernanceRecord } from '../../../../shared/definitions/governance-shared.interface';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { DialogConfig } from '@alfresco/adf-hx-content-services/ui';
import { RecordStatus } from '@alfresco/adf-hx-content-services/services';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { a11yReport } from '@hxp/workspace-hxp/shared/testing';

describe('RecordDeleteButtonComponent', () => {
    let component: RecordDeleteButtonComponent;
    let fixture: any;
    let loader: HarnessLoader;
    let dialogMock: jest.Mocked<MatDialog>;
    let service: RecordDeleteButtonService;

    const mockRecord: GovernanceRecord = {
        id: 'rec-001',
        contentID: '1',
        fileName: 'Test Record',
        status: RecordStatus.Ready,
        environmentDataSourceId: '',
        cutOffDate: new Date().toISOString(),
        categoryId: '',
        retainUntil: new Date().toISOString(),
    };

    const sampleContext: ActionContext = {
        records: [mockRecord],
        showPanel: false,
    };

    beforeEach(() => {
        dialogMock = {
            open: jest.fn(),
        } as unknown as jest.Mocked<MatDialog>;

        TestBed.configureTestingModule({
            imports: [RecordDeleteButtonComponent, NoopTranslateModule, NoopAnimationsModule, MatIconTestingModule],
            providers: [{ provide: MatDialog, useValue: dialogMock }, RecordDeleteButtonService],
        });

        fixture = TestBed.createComponent(RecordDeleteButtonComponent);
        component = fixture.componentInstance;
        loader = TestbedHarnessEnvironment.loader(fixture);
        service = TestBed.inject(RecordDeleteButtonService);
    });

    it('should not render the delete button when no records are available', async () => {
        component.actionContext = { records: [] };
        fixture.detectChanges();

        const buttons = await loader.getAllHarnesses(MatButtonHarness.with({}));

        expect(buttons.length).toBe(0);
    });

    it('should render the delete button when valid records are provided', async () => {
        component.actionContext = sampleContext;
        fixture.detectChanges();

        const buttons = await loader.getAllHarnesses(MatButtonHarness.with({}));

        expect(buttons.length).toBe(1);
    });

    it('should open the confirmation dialog on click', async () => {
        const afterClosed$ = of(true);
        dialogMock.open.mockReturnValue({ afterClosed: () => afterClosed$ } as any);

        component.actionContext = sampleContext;
        fixture.detectChanges();

        const button = await loader.getHarness(MatButtonHarness.with({}));
        await button.click();

        expect(dialogMock.open).toHaveBeenCalledWith(expect.any(Function), {
            width: DialogConfig.small.width,
            data: sampleContext,
        });
    });

    it('should return true when multiple deletable records are provided', () => {
        const records: GovernanceRecord[] = [
            { ...mockRecord, id: '1', status: 'Ready' },
            { ...mockRecord, id: '2', status: 'Incomplete' },
            { ...mockRecord, id: '3', status: 'Ready' },
        ];

        expect(service.isAvailable(records)).toBe(true);
    });

    it('should pass accessibility audit', async () => {
        component.actionContext = sampleContext;
        fixture.detectChanges();
        const report = await a11yReport(fixture.nativeElement);
        expect(report?.violations).toEqual([]);
    });
});
