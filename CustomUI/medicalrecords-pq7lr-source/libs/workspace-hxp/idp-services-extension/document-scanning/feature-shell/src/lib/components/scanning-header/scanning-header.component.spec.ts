/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { ScanningHeaderComponent } from './scanning-header.component';
import { ScanningSession } from '../../services/scanning-session.service';
import { provideSatoriIcons } from '@hylandsoftware/satori-ui';
import { signal } from '@angular/core';

describe(ScanningHeaderComponent.name, () => {
    let fixture: ComponentFixture<ScanningHeaderComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                NoopTranslateModule,
            ],
            providers: [
                provideSatoriIcons(),
                {
                    provide: ScanningSession,
                    useValue: {
                        isBusy: signal(false),
                        isScanning: signal(false),
                        canUploadBatch: signal(false),
                        selectedScanner: signal({ name: 'Fake Scanner', protocol: 'Twain' }),
                        scanClientState: signal({ status: 'connected' }),
                    } satisfies Partial<ScanningSession>,
                },
            ],
        });

        fixture = TestBed.createComponent(ScanningHeaderComponent);
    });

    it('renders buttons', () => {
        fixture.detectChanges();
        const settingsButton = fixture.debugElement.query((e) => e.attributes['data-automation-id'] === 'idp-scanning-settings-button');
        const cancelButton = fixture.debugElement.query((e) => e.attributes['data-automation-id'] === 'idp-scanning-cancel-button');
        const submitBatchButton = fixture.debugElement.query((e) => e.attributes['data-automation-id'] === 'idp-scanning-submit-button');

        expect(settingsButton).toBeDefined();
        expect(settingsButton.properties['disabled']).toBe(false);
        expect(cancelButton).toBeDefined();
        expect(cancelButton.properties['disabled']).toBe(false);
        expect(submitBatchButton).toBeDefined();
        expect(submitBatchButton.properties['disabled']).toBe(true);
    });
});
