/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ManageColumnButtonComponent } from './manage-column-button-component';
import { HXP_MANAGE_COLUMN_ACTION_SERVICE } from '@alfresco/adf-hx-content-services/services';
import { ManageColumnActionService } from './manage-column-button-action.service';
import { MatDialog } from '@angular/material/dialog';
import { jestMocks } from '@hxp/workspace-hxp/shared/testing';
import { ManageColumnDialogComponent } from '../manage-column-dialog/manage-column-dialog.component';
import { ButtonHarnessUtils } from '@alfresco-dbp/shared-testing/util/component-harnesses';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { MatIconTestingModule } from '@angular/material/icon/testing';

describe('ManageColumnButtonComponent', () => {
    let component: ManageColumnButtonComponent;
    let fixture: ComponentFixture<ManageColumnButtonComponent>;
    let dialog: jest.Mocked<MatDialog>;

    beforeEach(() => {
        dialog = {
            open: jest.fn(),
        } as unknown as jest.Mocked<MatDialog>;

        TestBed.configureTestingModule({
            imports: [ManageColumnButtonComponent, NoopTranslateModule, MatIconTestingModule],
            declarations: [],
            providers: [
                {
                    provide: HXP_MANAGE_COLUMN_ACTION_SERVICE,
                    useClass: ManageColumnActionService,
                },
                { provide: MatDialog, useValue: dialog },
            ],
        });

        fixture = TestBed.createComponent(ManageColumnButtonComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    function setActionContext(refererURL: string) {
        component.actionContext = {
            refererURL,
            documents: [jestMocks.fileDocument],
        };
        component.ngOnChanges();
        fixture.detectChanges();
    }

    const buttonFilter = () => ({
        fixture,
        buttonFilters: { selector: '.hxp-manage-column-button' },
    });

    it('should display button when refererURL includes "search"', async () => {
        setActionContext('http://example.com/search/results');

        const hasButton = await ButtonHarnessUtils.hasButton(buttonFilter());
        expect(hasButton).toBeTruthy();
    });

    it('should not display button when refererURL does not include "search"', async () => {
        setActionContext('http://example.com/other/results');

        const hasButton = await ButtonHarnessUtils.hasButton(buttonFilter());
        expect(hasButton).toBe(false);
    });

    it('should open the manage column dialog on button click', async () => {
        setActionContext('http://example.com/search/results');

        await ButtonHarnessUtils.clickButton(buttonFilter());

        expect(dialog.open).toHaveBeenCalledWith(ManageColumnDialogComponent, expect.objectContaining({ data: component.actionContext }));
    });
});
