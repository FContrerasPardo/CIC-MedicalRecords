/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { IdpDocumentActionToolBarItems, IdpDocumentToolbarService } from '../../../services/document/idp-document-toolbar.service';
import { IdpDocumentService } from '../../../services/document/idp-document.service';
import { of, Subject } from 'rxjs';
import {
    IDP_SCREEN_SHORTCUTS_INJECTION_TOKEN,
    IdpShortcut,
    IdpShortcutAction,
    IdpShortcutService,
} from '@hxp/workspace-hxp/idp-services-extension/shared';
import { InjectionToken } from '@angular/core';
import { mockIdpDocuments } from '../../../models/mocked/mocked-documents';
import { IdpDocumentAction } from '../../../models/screen-models';
import { ClassListHeaderToolbarComponent } from './class-list-header-toolbar.component';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { IdpScreenViewFilter, IdpScreenViewSortOption } from '../../../models/common-models';
import { By } from '@angular/platform-browser';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { MatSelectChange } from '@angular/material/select';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SatIconModule } from '@hylandsoftware/satori-ui/icons';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatIconHarness } from '@angular/material/icon/testing';

describe('ClassListHeaderToolbarComponent', () => {
    let component: ClassListHeaderToolbarComponent;
    let fixture: ComponentFixture<ClassListHeaderToolbarComponent>;
    let idpDocumentToolbarServiceMock: any;
    let shortcutServiceMock: any;
    let idpDocumentServiceMock: any;
    let loader: HarnessLoader;

    const mockedDocuments = mockIdpDocuments();
    const selectedPages = mockedDocuments[0].pages;

    const toolbarActions: IdpDocumentActionToolBarItems[] = [
        {
            label: 'ChangeClass',
            icon: 'icon 1',
            action: IdpDocumentAction.ChangeClass,
            disabled: false,
            onClick$: new Subject<void>(),
            renderType: 'static',
            displayOn: 'footer',
            displayOrder: 0,
            showDividerBefore: true,
            shortcutAction: IdpShortcutAction.ChangeClass,
        },
        {
            label: 'Redo',
            icon: 'redo',
            action: IdpDocumentAction.Redo,
            disabled: false,
            onClick$: new Subject<void>(),
            renderType: 'dynamic',
            displayOn: 'header',
            displayOrder: 0,
            showDividerBefore: true,
            shortcutAction: IdpShortcutAction.Redo,
        },
        {
            label: 'Merge',
            icon: 'icon 3',
            action: IdpDocumentAction.Merge,
            disabled: false,
            onClick$: new Subject<void>(),
            renderType: 'dynamic',
            displayOn: 'footer',
            displayOrder: 1,
            showDividerBefore: true,
            shortcutAction: IdpShortcutAction.PageMerge,
        },
        {
            label: 'Undo',
            icon: 'undo',
            action: IdpDocumentAction.Undo,
            disabled: false,
            onClick$: new Subject<void>(),
            renderType: 'dynamic',
            displayOn: 'header',
            displayOrder: 1,
            showDividerBefore: true,
            shortcutAction: IdpShortcutAction.Undo,
        },
    ];

    beforeEach(() => {
        idpDocumentToolbarServiceMock = {
            getToolbarItems: jasmine.createSpy('getToolbarItems').and.returnValue(of([])),
            documentToolBarItems$: of(toolbarActions),
        };

        shortcutServiceMock = {
            getShortcutTooltipForAction: jasmine.createSpy('getShortcutTooltipForAction').and.returnValue('Ctrl + Z'),
        };

        idpDocumentServiceMock = {
            setDocumentSortOption: jasmine.createSpy('setDocumentSortOption', (option: IdpScreenViewSortOption) => option),
            selectedPages$: of(selectedPages),
            documentViewFilter$: of(IdpScreenViewFilter.All),
            setDocumentViewFilter: jasmine.createSpy('setDocumentViewFilter', (viewFilter: IdpScreenViewFilter) => viewFilter),
        };

        TestBed.configureTestingModule({
            imports: [NoopTranslateModule, NoopAnimationsModule, ClassListHeaderToolbarComponent, SatIconModule],
            providers: [
                { provide: IdpDocumentToolbarService, useValue: idpDocumentToolbarServiceMock },
                { provide: IdpDocumentService, useValue: idpDocumentServiceMock },
                { provide: IdpShortcutService, useValue: shortcutServiceMock },
                { provide: IDP_SCREEN_SHORTCUTS_INJECTION_TOKEN, useValue: new InjectionToken<IdpShortcut[]>('IDP_SCREEN_SHORTCUTS') },
            ],
        });

        fixture = TestBed.createComponent(ClassListHeaderToolbarComponent);
        component = fixture.componentInstance;
        loader = TestbedHarnessEnvironment.loader(fixture);
        fixture.detectChanges();
    });

    it('should switch filter to OnlyIssues on toggle change', () => {
        testToggleSwitch(IdpScreenViewFilter.OnlyIssues, true);
    });

    it('should switch filter to All on toggle change', () => {
        testToggleSwitch(IdpScreenViewFilter.All, false);
    });

    it('should show correct sort options', () => {
        expect(component.sortOptions).toEqual([
            {
                value: IdpScreenViewSortOption.Original,
                label: 'IDP_CLASS_VERIFICATION.CLASS_LIST_HEADER.SORT_SELECTOR.ORIGINAL_ORDER_LABEL',
            },
            {
                value: IdpScreenViewSortOption.Classes,
                label: 'IDP_CLASS_VERIFICATION.CLASS_LIST_HEADER.SORT_SELECTOR.CLASSES_ORDER_LABEL',
            },
        ]);
    });

    it('should change current sort option', () => {
        spyOn(component, 'onIssuesFilterChange').and.callThrough();
        component.selectedSortOption = IdpScreenViewSortOption.Original;
        component.onSortChanged({
            value: IdpScreenViewSortOption.Classes,
        } as MatSelectChange);

        expect(component.selectedSortOption).toBe(IdpScreenViewSortOption.Classes);
        expect(idpDocumentServiceMock.setDocumentSortOption).toHaveBeenCalledOnceWith(IdpScreenViewSortOption.Classes);
    });

    it('should show only header dynamic actions', async () => {
        const buttons = await loader.getAllHarnesses(MatButtonHarness);
        expect(buttons.length).toBe(2);

        const iconRedo = await buttons[0].getHarness(MatIconHarness);
        const iconUndo = await buttons[1].getHarness(MatIconHarness);

        expect(await iconRedo.getName()).toBe('redo');
        expect(await iconUndo.getName()).toBe('undo');
    });

    describe('showToolbarActionItem', () => {
        type ToolbarItemData = IdpDocumentActionToolBarItems & { tooltip: string };

        const baseItem: Omit<ToolbarItemData, 'icon' | 'renderType' | 'displayOn'> = {
            label: 'Action',
            action: IdpDocumentAction.ChangeClass,
            disabled: false,
            onClick$: new Subject<void>(),
            displayOrder: 0,
            showDividerBefore: false,
            shortcutAction: IdpShortcutAction.ChangeClass,
            tooltip: '',
        };

        it('should return true for header dynamic actions', () => {
            const item: ToolbarItemData = {
                ...baseItem,
                icon: 'icon',
                renderType: 'dynamic',
                displayOn: 'header',
            };

            expect(component.showToolbarActionItem(item)).toBeTrue();
        });

        it('should return false for non-header or non-dynamic actions', () => {
            const footerItem: ToolbarItemData = {
                ...baseItem,
                icon: 'icon',
                renderType: 'dynamic',
                displayOn: 'footer',
            };

            const staticItem: ToolbarItemData = {
                ...baseItem,
                icon: 'icon',
                renderType: 'static',
                displayOn: 'header',
            };

            expect(component.showToolbarActionItem(footerItem)).toBeFalse();
            expect(component.showToolbarActionItem(staticItem)).toBeFalse();
        });
    });

    describe('getToolbarActionButtonDataAutomationId', () => {
        type ToolbarItemData = IdpDocumentActionToolBarItems & { tooltip: string };

        const createItem = (action: IdpDocumentAction): ToolbarItemData => ({
            action,
            label: 'Action',
            icon: '',
            disabled: false,
            onClick$: new Subject<void>(),
            renderType: 'dynamic',
            displayOn: 'header',
            displayOrder: 0,
            showDividerBefore: false,
            shortcutAction: IdpShortcutAction.ChangeClass,
            tooltip: '',
        });

        it('should return undo automation id for undo icon', () => {
            const item = createItem(IdpDocumentAction.Undo);

            expect(component.getToolbarActionButtonDataAutomationId(item)).toBe('idp-undo-button');
        });

        it('should return redo automation id for redo icon', () => {
            const item = createItem(IdpDocumentAction.Redo);

            expect(component.getToolbarActionButtonDataAutomationId(item)).toBe('idp-redo-button');
        });

        it('should return null for unsupported icons', () => {
            const item = createItem(IdpDocumentAction.ChangeClass);

            expect(component.getToolbarActionButtonDataAutomationId(item)).toBeNull();
        });
    });

    const testToggleSwitch = (calledWith: IdpScreenViewFilter, isIssuesOnlyView: boolean) => {
        component.isIssuesOnlyView = isIssuesOnlyView;
        expect(component.isIssuesOnlyView).toBe(isIssuesOnlyView);

        spyOn(component, 'onIssuesFilterChange').and.callThrough();

        const toggle = fixture.debugElement.query(By.directive(MatSlideToggle));
        toggle.triggerEventHandler('change', { checked: isIssuesOnlyView });
        fixture.detectChanges();

        expect(component.onIssuesFilterChange).toHaveBeenCalledOnceWith(isIssuesOnlyView);
        expect(idpDocumentServiceMock.setDocumentViewFilter).toHaveBeenCalledOnceWith(calledWith);
    };
});
