/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FolderIconComponent } from './folder-icon.component';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { MatIconTestingModule, MatIconHarness } from '@angular/material/icon/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HarnessLoader } from '@angular/cdk/testing';

describe('FolderIconComponent', () => {
    let component: FolderIconComponent;
    let fixture: ComponentFixture<FolderIconComponent>;
    let loader: HarnessLoader;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NoopTranslateModule, MatIconTestingModule, FolderIconComponent],
        });

        fixture = TestBed.createComponent(FolderIconComponent);
        component = fixture.componentInstance;
        loader = TestbedHarnessEnvironment.loader(fixture);
    });

    it('should render folder svgIcon when not expanded', async () => {
        fixture.detectChanges();
        const icon = await loader.getHarness(MatIconHarness);

        expect(await icon.getName()).toBe('folder');
    });

    it('should render folder_open svgIcon when expanded', async () => {
        component.isExpanded = true;
        fixture.detectChanges();
        const icon = await loader.getHarness(MatIconHarness);

        expect(await icon.getName()).toBe('folder_open');
    });
});
