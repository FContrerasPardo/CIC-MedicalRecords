/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ContentActionRef, ContentActionType, ExtensionService } from '@alfresco/adf-extensions';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MainActionButtonComponent } from './main-action-button.component';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatButtonHarness } from '@angular/material/button/testing';
import { of } from 'rxjs';
import { ExtensionActionsHandler } from '../extensions/extensions-actions-handler.service';
import { NoopTranslateModule } from '@alfresco/adf-core';

const MOCK_MAIN_ACTION: ContentActionRef = {
    id: 'app.main-action.start.process-cloud',
    title: 'PROCESS_CLOUD_EXTENSION.MENU.CREATE_NEW_PROCESS',
    description: 'PROCESS_CLOUD_EXTENSION.MENU.CREATE_NEW_PROCESS',
    icon: 'filter_drama',
    type: ContentActionType.button,
    actions: {
        click: 'start-process-cloud.actions.new.execute',
    },
    rules: {
        visible: 'app.process-cloud.isProcessServiceCloudRunningAndPluginEnabled',
    },
};

describe('MainActionButtonComponent', () => {
    let loader: HarnessLoader;
    let fixture: ComponentFixture<MainActionButtonComponent>;

    const initializeComponent = () => {
        fixture = TestBed.createComponent(MainActionButtonComponent);
        fixture.detectChanges();
        loader = TestbedHarnessEnvironment.loader(fixture);
    };

    const mockExtensionActionsHandler = {
        runActionById: jest.fn(),
    };

    const mockExtensionService = {
        setup$: of(undefined),
        getFeature: jest.fn().mockReturnValue(MOCK_MAIN_ACTION),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockExtensionService.getFeature.mockReturnValue(MOCK_MAIN_ACTION);

        TestBed.configureTestingModule({
            imports: [NoopTranslateModule, MainActionButtonComponent],
            providers: [
                { provide: ExtensionActionsHandler, useValue: mockExtensionActionsHandler },
                { provide: ExtensionService, useValue: mockExtensionService },
            ],
        });
    });

    describe('with main action turned ON', () => {
        beforeEach(() => {
            initializeComponent();
        });

        it('should show action if action is setup in config file', async () => {
            const isButtonPresent = await loader.hasHarness(MatButtonHarness);
            expect(isButtonPresent).toBeTruthy();
        });

        it('should run action on click', async () => {
            const action = await loader.getHarness(MatButtonHarness);

            await action.click();

            expect(mockExtensionActionsHandler.runActionById).toHaveBeenCalledWith(MOCK_MAIN_ACTION.actions.click);
        });
    });

    describe('with main action turned OFF', () => {
        beforeEach(() => {
            mockExtensionService.getFeature.mockReturnValue(undefined);
            initializeComponent();
        });

        it('should NOT show action if is NOT set in config file', async () => {
            const isButtonPresent = await loader.hasHarness(MatButtonHarness);
            expect(isButtonPresent).toBeFalsy();
        });
    });
});
