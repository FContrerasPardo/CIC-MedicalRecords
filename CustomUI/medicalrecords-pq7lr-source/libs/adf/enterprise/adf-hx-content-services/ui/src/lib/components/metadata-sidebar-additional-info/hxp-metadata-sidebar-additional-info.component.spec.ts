/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { By } from '@angular/platform-browser';
import { Clipboard } from '@angular/cdk/clipboard';
import { HxpMetadataSidebarAdditionalInfoComponent } from './hxp-metadata-sidebar-additional-info.component';
import { HxpNotificationService } from '@alfresco/adf-hx-content-services/services';
import { CardViewItem, NoopTranslateModule } from '@alfresco/adf-core';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { a11yReport } from '@hxp/workspace-hxp/shared/testing';

const EXPECTED_VIOLATIONS: { [violationId: string]: number }[] | undefined = [];

describe('HxpMetadataSidebarAdditionalInfoComponent', () => {
    let component: HxpMetadataSidebarAdditionalInfoComponent;
    let fixture: ComponentFixture<HxpMetadataSidebarAdditionalInfoComponent>;
    let mockClipboard: { copy: jest.Mock };
    let mockNotificationService: { showSuccess: jest.Mock };
    let resizeCallback: (entries: ResizeObserverEntry[]) => void;

    beforeEach(() => {
        globalThis.ResizeObserver = jest.fn().mockImplementation((callback) => {
            resizeCallback = callback;
            return {
                observe: jest.fn(),
                unobserve: jest.fn(),
                disconnect: jest.fn(),
            };
        });

        mockClipboard = { copy: jest.fn() };
        mockNotificationService = { showSuccess: jest.fn() };

        TestBed.configureTestingModule({
            imports: [
                MatButtonModule,
                MatDividerModule,
                MatTooltipModule,
                NoopTranslateModule,
                HxpMetadataSidebarAdditionalInfoComponent,
                MatIconTestingModule,
            ],
            providers: [
                { provide: Clipboard, useValue: mockClipboard },
                { provide: HxpNotificationService, useValue: mockNotificationService },
            ],
        });

        fixture = TestBed.createComponent(HxpMetadataSidebarAdditionalInfoComponent);
        component = fixture.componentInstance;

        const nonEditableItems: CardViewItem[] = [
            { key: 'path', label: 'Path', displayValue: 'path/to/the/document', editable: false } as CardViewItem,
        ];
        fixture.componentRef.setInput('nonEditableSystemProperties', nonEditableItems);
        fixture.detectChanges();

        jest.spyOn(component.pathContent()?.nativeElement, 'scrollHeight', 'get').mockReturnValue(200);
        jest.spyOn(component.pathContent()?.nativeElement, 'clientHeight', 'get').mockReturnValue(100);
    });

    it('should toggle clamp when expand button is clicked', async () => {
        let expandButton = fixture.debugElement.query(By.css('.hxp-metadata-panel-additional-info-property-path-expand-button'));
        expect(expandButton).toBeFalsy();

        const longPath = '/very/long/path/that/should/cause/overflow/in/the/display/container/with/many/nested/folders/and/subfolders';

        fixture.componentRef.setInput('nonEditableSystemProperties', [
            {
                key: 'path',
                label: 'Path',
                displayValue: longPath,
                value: undefined,
                type: '',
                editable: false,
            } as CardViewItem,
        ]);

        resizeCallback([]);
        fixture.detectChanges();

        expandButton = fixture.debugElement.query(By.css('.hxp-metadata-panel-additional-info-property-path-expand-button'));

        expect(expandButton).toBeTruthy();
        expect(expandButton.nativeElement).toBeTruthy();

        let ddElement = fixture.nativeElement.querySelector('.hxp-metadata-panel-additional-info-property-value');
        expect(ddElement.className).toContain('hxp-metadata-panel-additional-info-property-value');
        expect(ddElement.className).toContain('hxp-metadata-panel-additional-info-property-value_clamp');

        expandButton.nativeElement.click();
        fixture.detectChanges();
        await fixture.whenStable();

        ddElement = fixture.nativeElement.querySelector('.hxp-metadata-panel-additional-info-property-value');
        expect(ddElement.className).toContain('hxp-metadata-panel-additional-info-property-value');
        expect(ddElement.className).not.toContain('hxp-metadata-panel-additional-info-property-value_clamp');
    });

    it('should open snackbar when copy button is clicked', async () => {
        mockClipboard.copy.mockReturnValue(true);
        await fixture.whenStable();

        const copyButton = fixture.debugElement.query(By.css('.hxp-metadata-panel-additional-info-property-path-copy-button'));

        expect(copyButton).toBeTruthy();

        copyButton.nativeElement.click();
        fixture.detectChanges();

        expect(mockNotificationService.showSuccess).toHaveBeenCalledWith('DOCUMENT.METADATA.COPY_PATH.SUCCESS');
    });

    it('should pass accessibility checks', async () => {
        fixture.detectChanges();
        await fixture.whenStable();

        const result = await a11yReport(fixture.nativeElement);

        expect(result?.violations).toEqual(EXPECTED_VIOLATIONS);
    });
});
