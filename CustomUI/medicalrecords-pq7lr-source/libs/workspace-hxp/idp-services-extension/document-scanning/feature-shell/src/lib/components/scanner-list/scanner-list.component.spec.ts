/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScannerListComponent } from './scanner-list.component';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { provideSatoriIcons } from '@hylandsoftware/satori-ui';
import { SelectHarnessUtils } from '@alfresco-dbp/shared-testing/util/component-harnesses';
import { setInput } from '../../util';

describe(ScannerListComponent.name, () => {
    let fixture: ComponentFixture<ScannerListComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                NoopTranslateModule,
            ],
            providers: [
                provideSatoriIcons(),
            ],
        });

        fixture = TestBed.createComponent(ScannerListComponent);
    });

    it('renders scanners', async () => {
        const scanners = [{ name: 'Fake Scanner 1', protocol: 'Twain' }, { name: 'Fake Scanner 2', protocol: 'Twain' }];
        setInput(fixture.componentRef, 'scanClientState', { status: 'connected' });
        setInput(fixture.componentRef, 'scanners', scanners);

        const options = await SelectHarnessUtils.getDropdownOptions({ fixture });
        expect(options.length).toBe(scanners.length);
    });
});
