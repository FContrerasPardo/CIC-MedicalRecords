/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MimeTypeIconComponent } from './mime-type-icon.component';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { MatIconTestingModule, MatIconHarness } from '@angular/material/icon/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HarnessLoader } from '@angular/cdk/testing';

describe('MimeTypeIconComponent', () => {
    let component: MimeTypeIconComponent;
    let fixture: ComponentFixture<MimeTypeIconComponent>;
    let loader: HarnessLoader;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NoopTranslateModule, MatIconTestingModule, MimeTypeIconComponent],
        });

        fixture = TestBed.createComponent(MimeTypeIconComponent);
        component = fixture.componentInstance;
        loader = TestbedHarnessEnvironment.loader(fixture);
    });


    it('should display the correct svgIcon for a plain text file', async () => {
        component.mimeType = 'text/plain';
        fixture.detectChanges();
        const icon = await loader.getHarness(MatIconHarness);

        expect(await icon.getName()).toBe('text/plain');
    });

    it('should display the correct svgIcon for a PDF file', async () => {
        component.mimeType = 'application/pdf';
        fixture.detectChanges();
        const icon = await loader.getHarness(MatIconHarness);

        expect(await icon.getName()).toBe('application/pdf');
    });

    it('should display the correct svgIcon for a PNG file', async () => {
        component.mimeType = 'image/png';
        fixture.detectChanges();
        const icon = await loader.getHarness(MatIconHarness);

        expect(await icon.getName()).toBe('image/png');
    });

    it('should display the correct svgIcon for a MP3 audio file', async () => {
        component.mimeType = 'audio/mp3';
        fixture.detectChanges();
        const icon = await loader.getHarness(MatIconHarness);

        expect(await icon.getName()).toBe('audio/mp3');
    });

    it('should display the correct svgIcon for a MP4 video file', async () => {
        component.mimeType = 'video/mp4';
        fixture.detectChanges();
        const icon = await loader.getHarness(MatIconHarness);

        expect(await icon.getName()).toBe('video/mp4');
    });

    it('should display the default svgIcon for an unknown file type', async () => {
        component.mimeType = 'x-unknown/yyy';
        fixture.detectChanges();
        const icon = await loader.getHarness(MatIconHarness);

        expect(await icon.getName()).toBe('x-unknown/yyy');
    });

    it('should display the folder icon from the satori namespace', async () => {
        component.mimeType = 'folder';
        fixture.detectChanges();
        const icon = await loader.getHarness(MatIconHarness);

        expect(await icon.getName()).toBe('folder');
        expect(await icon.getNamespace()).toBe('satori');
    });
});
