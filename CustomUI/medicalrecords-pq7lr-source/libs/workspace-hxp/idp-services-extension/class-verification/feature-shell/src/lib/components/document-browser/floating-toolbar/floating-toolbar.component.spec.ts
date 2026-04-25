/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FloatingToolbarComponent } from './floating-toolbar.component';
import { IdpDocumentActionToolBarItems, IdpDocumentToolbarService, MessageTemplate } from '../../../services/document/idp-document-toolbar.service';
import { IdpDocumentService } from '../../../services/document/idp-document.service';
import { BehaviorSubject, of, Subject } from 'rxjs';
import {
    IDP_SCREEN_SHORTCUTS_INJECTION_TOKEN,
    IdpShortcut,
    IdpShortcutAction,
    IdpShortcutService,
} from '@hxp/workspace-hxp/idp-services-extension/shared';
import { InjectionToken } from '@angular/core';
import { mockIdpDocuments } from '../../../models/mocked/mocked-documents';
import { IdpDocumentAction } from '../../../models/screen-models';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { SatIconModule } from '@hylandsoftware/satori-ui/icons';

describe('FloatingToolbarComponent', () => {
    let component: FloatingToolbarComponent;
    let fixture: ComponentFixture<FloatingToolbarComponent>;
    let idpDocumentToolbarServiceMock: any;
    let shortcutServiceMock: any;
    let idpDocumentServiceMock: any;
    let element: HTMLElement;

    let mockToolbarMessageTemplate$: BehaviorSubject<MessageTemplate>;

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
            icon: 'icon 2',
            action: IdpDocumentAction.Redo,
            disabled: false,
            onClick$: new Subject<void>(),
            renderType: 'static',
            displayOn: 'header',
            displayOrder: 0,
            showDividerBefore: true,
            shortcutAction: IdpShortcutAction.Redo,
        },
        {
            label: 'Merge',
            icon: 'icon 2',
            action: IdpDocumentAction.Merge,
            disabled: false,
            onClick$: new Subject<void>(),
            renderType: 'static',
            displayOn: 'footer',
            displayOrder: 1,
            showDividerBefore: true,
            shortcutAction: IdpShortcutAction.PageMerge,
        },
        {
            label: 'Undo',
            icon: 'icon 2',
            action: IdpDocumentAction.Undo,
            disabled: false,
            onClick$: new Subject<void>(),
            renderType: 'static',
            displayOn: 'header',
            displayOrder: 1,
            showDividerBefore: true,
            shortcutAction: IdpShortcutAction.Undo,
        },
    ];

    beforeEach(() => {
        mockToolbarMessageTemplate$ = new BehaviorSubject<MessageTemplate>({ key: 'TEST' });
        idpDocumentToolbarServiceMock = {
            getToolbarItems: jasmine.createSpy('getToolbarItems').and.returnValue(of([])),
            documentToolBarItems$: of(toolbarActions),
            toolbarMessageTemplate$: mockToolbarMessageTemplate$.asObservable(),
        };

        shortcutServiceMock = {
            getShortcutTooltipForAction: jasmine.createSpy('getShortcutTooltipForAction').and.returnValue('Ctrl + Z'),
        };

        idpDocumentServiceMock = {
            selectedPages$: of(selectedPages),
        };

        TestBed.configureTestingModule({
            imports: [NoopTranslateModule, FloatingToolbarComponent, SatIconModule],
            providers: [
                { provide: IdpDocumentToolbarService, useValue: idpDocumentToolbarServiceMock },
                { provide: IdpDocumentService, useValue: idpDocumentServiceMock },
                { provide: IdpShortcutService, useValue: shortcutServiceMock },
                { provide: IDP_SCREEN_SHORTCUTS_INJECTION_TOKEN, useValue: new InjectionToken<IdpShortcut[]>('IDP_SCREEN_SHORTCUTS') },
            ],
        });

        fixture = TestBed.createComponent(FloatingToolbarComponent);
        component = fixture.componentInstance;
        element = fixture.debugElement.nativeElement;
        fixture.detectChanges();
    });

    it('should collapse on click', () => {
        expect(component.isCollapsed).toBe(false);
        const btn = getCollapseButton();
        btn.dispatchEvent(new Event('click'));
        fixture.detectChanges();

        expect(component.isCollapsed).toBe(true);
    });

    it('should collapse on Enter press', () => {
        expect(component.isCollapsed).toBe(false);
        const btn = getCollapseButton();
        btn.dispatchEvent(new KeyboardEvent('click', { key: 'Enter' }));
        fixture.detectChanges();

        expect(component.isCollapsed).toBe(true);
    });

    it('should display correct actions', fakeAsync(() => {
        const actualItems: any[] = [];
        const expectedItems = {
            changeClass: toolbarActions[0],
            merge: toolbarActions[2],
        };
        component.toolbarActionItems$.subscribe((items) => {
            actualItems.push(...items);
        });
        tick(2000);

        expect(actualItems.length).toBe(2);
        expect(actualItems).toEqual(
            jasmine.arrayContaining([
                jasmine.objectContaining({
                    ...expectedItems.changeClass,
                }),
                jasmine.objectContaining({
                    ...expectedItems.merge,
                }),
            ])
        );
    }));

    it('should include disabled items when showWhenDisabled is true', fakeAsync(() => {
        const targetActionLabel = 'DisabledShown';
        const targetAction: IdpDocumentActionToolBarItems = {
            label: targetActionLabel,
            disabled: true,
            showWhenDisabled: true,
            displayOn: 'footer',
        } as IdpDocumentActionToolBarItems;

        idpDocumentToolbarServiceMock.documentToolBarItems$ = of([targetAction]);
        fixture = TestBed.createComponent(FloatingToolbarComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();

        const toolbarActionItems: IdpDocumentActionToolBarItems[] = [];
        component.toolbarActionItems$.subscribe((items) => toolbarActionItems.push(...items));
        tick();

        const targetActionItem = toolbarActionItems.find((item) => item.label === targetActionLabel);
        expect(targetActionItem).toBeDefined();
        expect(targetActionItem?.disabled).toBe(true);
    }));

    it('should exclude disabled items when showWhenDisabled is false', fakeAsync(() => {
        const targetActionLabel = 'Disabled';
        const targetAction = {
            label: targetActionLabel,
            disabled: true,
            showWhenDisabled: false,
            displayOn: 'footer',
        } as IdpDocumentActionToolBarItems;

        idpDocumentToolbarServiceMock.documentToolBarItems$ = of([targetAction]);
        fixture = TestBed.createComponent(FloatingToolbarComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();

        const toolbarActionItems: IdpDocumentActionToolBarItems[] = [];
        component.toolbarActionItems$.subscribe((items) => toolbarActionItems.push(...items));
        tick();

        const targetActionItem = toolbarActionItems.find((item) => item.label === targetActionLabel);
        expect(targetActionItem).toBeUndefined();
    }));

    it('should update displayed text when toolbarMessageTemplate$ emits new values', fakeAsync(() => {
        mockToolbarMessageTemplate$.next({ key: 'TEST.1' });

        fixture.detectChanges();
        tick();

        expect(getToolbarMessageText()).toBe('TEST.1');

        mockToolbarMessageTemplate$.next({ key: 'TEST.2', args: { arg: '1' } });

        fixture.detectChanges();
        tick();

        expect(getToolbarMessageText()).toBe('TEST.2');
    }));

    describe('tooltip mapping', () => {
        it('should map tooltip with label and shortcut for enabled items', fakeAsync(() => {
            const toolbarActionItems: any[] = [];
            component.toolbarActionItems$.subscribe((items) => toolbarActionItems.push(...items));
            tick();

            const changeClassActionItem = toolbarActionItems.find((item) => item.action === IdpDocumentAction.ChangeClass);
            expect(changeClassActionItem).toBeDefined();
            expect(changeClassActionItem.tooltip).toBe('ChangeClass (Ctrl + Z)');
        }));

        it('should map tooltip with label only when no shortcut action', fakeAsync(() => {
            const targetActionLabel = 'WithoutShortcut';
            const targetAction = {
                label: targetActionLabel,
                disabled: false,
                displayOn: 'footer',
            } as IdpDocumentActionToolBarItems;

            idpDocumentToolbarServiceMock.documentToolBarItems$ = of([targetAction]);
            fixture = TestBed.createComponent(FloatingToolbarComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();

            const toolbarActionItems: any[] = [];
            component.toolbarActionItems$.subscribe((items) => toolbarActionItems.push(...items));
            tick();

            const targetActionItem = toolbarActionItems.find((item) => item.label === targetActionLabel);
            expect(targetActionItem.tooltip).toBe(targetActionLabel);
        }));

        it('should map tooltip with showWhenDisabledTooltip for disabled items when showWhenDisabled is true', fakeAsync(() => {
            const targetActionLabel = 'DisabledShownWithTooltip';
            const targetAction = {
                label: targetActionLabel,
                disabled: true,
                showWhenDisabled: true,
                showWhenDisabledTooltip: {
                    key: 'TOOLTIP.DISABLED',
                    args: { count: '5' },
                },
                displayOn: 'footer',
            } as unknown as IdpDocumentActionToolBarItems;

            idpDocumentToolbarServiceMock.documentToolBarItems$ = of([targetAction]);
            fixture = TestBed.createComponent(FloatingToolbarComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();

            const toolbarActionItems: any[] = [];
            component.toolbarActionItems$.subscribe((items) => toolbarActionItems.push(...items));
            tick();

            const targetActionItem = toolbarActionItems.find((item) => item.label === targetActionLabel);
            expect(targetActionItem.tooltip).toBe('TOOLTIP.DISABLED');
        }));

        it('should map tooltip with regular label for disabled items when showWhenDisabledTooltip is not provided', fakeAsync(() => {
            const targetActionLabel = 'DisabledShownWithoutTooltip';
            const targetAction = {
                label: targetActionLabel,
                disabled: true,
                showWhenDisabled: true,
                displayOn: 'footer',
                shortcutAction: IdpShortcutAction.PageMerge,
            } as IdpDocumentActionToolBarItems;

            idpDocumentToolbarServiceMock.documentToolBarItems$ = of([targetAction]);
            fixture = TestBed.createComponent(FloatingToolbarComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();

            const toolbarActionItems: any[] = [];
            component.toolbarActionItems$.subscribe((items) => toolbarActionItems.push(...items));
            tick();

            const targetActionItem = toolbarActionItems.find((item) => item.label === targetActionLabel);
            expect(targetActionItem.tooltip).toBe(`${targetActionLabel} (Ctrl + Z)`);
        }));
    });

    describe('onActionClicked', () => {
        it('should trigger onClick$ when Action is not disabled', () => {
            const action: any = {
                disabled: false,
                onClick$: new Subject<void>(),
            };
            spyOn(action.onClick$, 'next');

            component.onActionClicked(action);

            expect(action.onClick$.next).toHaveBeenCalled();
        });

        it('should not trigger onClick$ when Action is disabled', () => {
            const action: any = {
                disabled: true,
                onClick$: new Subject<void>(),
            };
            spyOn(action.onClick$, 'next');

            component.onActionClicked(action);

            expect(action.onClick$.next).not.toHaveBeenCalled();
        });

        it('should handle multiple clicks on enabled Action', () => {
            const action: any = {
                disabled: false,
                onClick$: new Subject<void>(),
            };
            spyOn(action.onClick$, 'next');

            component.onActionClicked(action);
            component.onActionClicked(action);
            component.onActionClicked(action);

            expect(action.onClick$.next).toHaveBeenCalledTimes(3);
        });
    });

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const getCollapseButton = (): HTMLButtonElement => element.querySelector('.idp-footer-toolbar__collapse-button')!;
    const getToolbarMessageText = (): string => element.querySelector('.idp-footer-toolbar__select-text')?.textContent?.trim() ?? '';
});
