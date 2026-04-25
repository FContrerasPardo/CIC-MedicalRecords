/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FieldVerificationRootComponent } from './field-verification-root.component';
import { FieldVerificationContextTaskService } from '../../services/context-task/field-verification-context-task.service';
import { BehaviorSubject } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { By } from '@angular/platform-browser';
import {
    DiscardChangesDialogComponent,
    IDP_SCREEN_SHORTCUTS_INJECTION_TOKEN,
    IdpShortcutAction,
    IdpShortcutService,
    ModifierKey,
    SessionService,
} from '@hxp/workspace-hxp/idp-services-extension/shared';
import { FeaturesDirective } from '@alfresco/adf-core/feature-flags';
import { TranslatePipe } from '@ngx-translate/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatButtonHarness } from '@angular/material/button/testing';
import { A11yModule } from '@angular/cdk/a11y';
import { TablePanelMode, TablePanelStateService } from '../../services/table-panel-state/table-panel-state.service';

@Component({ selector: 'hyland-idp-extraction-view', template: '' })
class MockExtractionViewComponent {}

describe('FieldVerificationRootComponent', () => {
    let component: FieldVerificationRootComponent;
    let fixture: ComponentFixture<FieldVerificationRootComponent>;
    let contextService: FieldVerificationContextTaskService;
    let sessionServiceSpy: jest.Mocked<SessionService>;

    const toggleScreenReady$ = new BehaviorSubject(true);
    const toggleCanSave$ = new BehaviorSubject(true);
    const toggleCanComplete$ = new BehaviorSubject(true);
    const toggleShowUnclaim$ = new BehaviorSubject(true);
    const toggleUnclaimEnabled$ = new BehaviorSubject(true);
    class MockContextService implements Partial<FieldVerificationContextTaskService> {
        screenReady$ = toggleScreenReady$.asObservable();
        taskCanSave$ = toggleCanSave$.asObservable();
        taskCanComplete$ = toggleCanComplete$.asObservable();
        taskCanUnclaim$ = toggleShowUnclaim$.asObservable();
        taskUnclaimEnabled$ = toggleUnclaimEnabled$.asObservable();
        completeTask = jest.fn();
        saveTask = jest.fn();
        unclaimTask = jest.fn();
    }

    beforeEach(() => {
        sessionServiceSpy = {
            toggleAutoNextTask: jest.fn(),
            isAutoNextTaskChecked$: new BehaviorSubject(false).asObservable(),
        } as jest.Mocked<SessionService>;

        TestBed.configureTestingModule({
            providers: [{ provide: FieldVerificationContextTaskService, useClass: MockContextService }],
        }).overrideComponent(FieldVerificationRootComponent, {
            set: {
                providers: [
                    IdpShortcutService,
                    { provide: IDP_SCREEN_SHORTCUTS_INJECTION_TOKEN, useValue: [] },
                    { provide: SessionService, useValue: sessionServiceSpy },
                    TablePanelStateService,
                ],
                imports: [
                    A11yModule,
                    TranslatePipe,
                    CommonModule,
                    MatCheckboxModule,
                    MatButtonModule,
                    MatTooltipModule,
                    MatProgressSpinnerModule,
                    NoopTranslateModule,
                    MockExtractionViewComponent,
                    FeaturesDirective,
                ],
            },
        });

        fixture = TestBed.createComponent(FieldVerificationRootComponent);
        component = fixture.componentInstance;
        contextService = TestBed.inject(FieldVerificationContextTaskService);
        fixture.detectChanges();
    });

    it('should call completeTask on onSubmit', () => {
        fixture.debugElement.query(By.css('.idp-footer-container__submit-button')).nativeElement.click();
        expect(contextService.completeTask).toHaveBeenCalled();
    });

    it('should call saveTask on onSave', () => {
        fixture.debugElement.query(By.css('.idp-footer-container__save-button')).nativeElement.click();
        expect(contextService.saveTask).toHaveBeenCalled();
    });

    it('should show progress spinner based on screenReady', () => {
        toggleScreenReady$.next(false);
        fixture.detectChanges();
        expect(fixture.debugElement.query(By.css('.idp-field-verification-root__progress'))).toBeTruthy();
        expect(fixture.debugElement.query(By.css('.idp-field-verification-root'))).toBeFalsy();

        toggleScreenReady$.next(true);
        fixture.detectChanges();
        expect(fixture.debugElement.query(By.css('.idp-field-verification-root__progress'))).toBeFalsy();
        expect(fixture.debugElement.query(By.css('.idp-field-verification-root'))).toBeTruthy();
    });

    it('should toggle save button based on taskCanSave', () => {
        toggleCanSave$.next(false);
        fixture.detectChanges();
        expect(fixture.debugElement.query(By.css('.idp-footer-container__save-button')).attributes['disabled']).toEqual('true');

        toggleCanSave$.next(true);
        fixture.detectChanges();
        expect(fixture.debugElement.query(By.css('.idp-footer-container__save-button')).attributes['disabled']).toBeUndefined();
    });

    it('should toggle submit button based on taskCanSave', () => {
        toggleCanComplete$.next(false);
        fixture.detectChanges();
        expect(fixture.debugElement.query(By.css('.idp-footer-container__submit-button')).attributes['disabled']).toEqual('true');

        toggleCanComplete$.next(true);
        fixture.detectChanges();
        expect(fixture.debugElement.query(By.css('.idp-footer-container__submit-button')).attributes['disabled']).toBeUndefined();
    });

    it('should call SessionService.toggleAutoNextTask on onNextTaskCheckboxCheckedChanged', () => {
        component.onNextTaskCheckboxCheckedChanged();
        expect(sessionServiceSpy.toggleAutoNextTask).toHaveBeenCalled();
    });

    describe('keyboard shortcuts', () => {
        let shortcutService: IdpShortcutService;

        beforeEach(() => {
            shortcutService = fixture.debugElement.injector.get(IdpShortcutService);
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should call preventDefault and stopPropagation on keydown when a root-handled shortcut matches', () => {
            jest.spyOn(shortcutService, 'getShortcutForEvent').mockReturnValue({
                key: '1',
                modifierKeys: [ModifierKey.ctrlKey, ModifierKey.shiftKey],
                action: IdpShortcutAction.TablePanelMinimize,
                category: 'table_navigation',
                description: 'x',
            });
            const event = new KeyboardEvent('keydown', { key: '1', ctrlKey: true, shiftKey: true, bubbles: true });
            const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
            const stopPropagationSpy = jest.spyOn(event, 'stopPropagation');
            window.dispatchEvent(event);
            expect(preventDefaultSpy).toHaveBeenCalled();
            expect(stopPropagationSpy).toHaveBeenCalled();
        });

        it('should not call preventDefault on keydown for shortcuts not handled by the root', () => {
            jest.spyOn(shortcutService, 'getShortcutForEvent').mockReturnValue({
                key: 'z',
                modifierKeys: [ModifierKey.ctrlKey],
                action: IdpShortcutAction.Undo,
                category: 'general',
                description: 'x',
            });
            const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true });
            const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
            window.dispatchEvent(event);
            expect(preventDefaultSpy).not.toHaveBeenCalled();
        });

        it('should call preventDefault and stopPropagation on keydown for Save shortcut', () => {
            jest.spyOn(shortcutService, 'getShortcutForEvent').mockReturnValue({
                key: 's',
                modifierKeys: [ModifierKey.ctrlKey],
                action: IdpShortcutAction.Save,
                category: 'general',
                description: 'x',
            });
            const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true });
            const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
            const stopPropagationSpy = jest.spyOn(event, 'stopPropagation');
            window.dispatchEvent(event);
            expect(preventDefaultSpy).toHaveBeenCalled();
            expect(stopPropagationSpy).toHaveBeenCalled();
        });

        it('should call preventDefault and stopPropagation on keydown for Submit shortcut', () => {
            jest.spyOn(shortcutService, 'getShortcutForEvent').mockReturnValue({
                key: 'Enter',
                modifierKeys: [ModifierKey.ctrlKey],
                action: IdpShortcutAction.Submit,
                category: 'general',
                description: 'x',
            });
            const event = new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true });
            const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
            const stopPropagationSpy = jest.spyOn(event, 'stopPropagation');
            window.dispatchEvent(event);
            expect(preventDefaultSpy).toHaveBeenCalled();
            expect(stopPropagationSpy).toHaveBeenCalled();
        });
    });

    describe('table panel keyboard shortcuts (keyup)', () => {
        let shortcutService: IdpShortcutService;
        let tablePanelStateService: TablePanelStateService;

        beforeEach(() => {
            shortcutService = fixture.debugElement.injector.get(IdpShortcutService);
            tablePanelStateService = fixture.debugElement.injector.get(TablePanelStateService);
        });

        afterEach(() => {
            toggleCanSave$.next(true);
            toggleCanComplete$.next(true);
            fixture.detectChanges();
            jest.restoreAllMocks();
        });

        it('should minimize table panel on TablePanelMinimize when panel is visible', () => {
            tablePanelStateService.setDefault();
            jest.spyOn(shortcutService, 'getShortcutForEvent').mockReturnValue({
                key: '1',
                modifierKeys: [],
                action: IdpShortcutAction.TablePanelMinimize,
                category: 'table_navigation',
                description: 'x',
            });
            const minimizeSpy = jest.spyOn(tablePanelStateService, 'minimize');

            component.onKeyUp(new KeyboardEvent('keyup', { key: '1', bubbles: true }));

            expect(minimizeSpy).toHaveBeenCalled();
        });

        it('should not call minimize when panel is already minimized', () => {
            tablePanelStateService.minimize();
            jest.spyOn(shortcutService, 'getShortcutForEvent').mockReturnValue({
                key: '1',
                modifierKeys: [],
                action: IdpShortcutAction.TablePanelMinimize,
                category: 'table_navigation',
                description: 'x',
            });
            const minimizeSpy = jest.spyOn(tablePanelStateService, 'minimize');
            minimizeSpy.mockClear();

            component.onKeyUp(new KeyboardEvent('keyup', { key: '1', bubbles: true }));

            expect(minimizeSpy).not.toHaveBeenCalled();
        });

        it('should not change table panel when panel is hidden', () => {
            tablePanelStateService.hide();
            expect(tablePanelStateService.mode()).toBe(TablePanelMode.Hidden);
            jest.spyOn(shortcutService, 'getShortcutForEvent').mockReturnValue({
                key: '1',
                modifierKeys: [],
                action: IdpShortcutAction.TablePanelMinimize,
                category: 'table_navigation',
                description: 'x',
            });
            const minimizeSpy = jest.spyOn(tablePanelStateService, 'minimize');

            component.onKeyUp(new KeyboardEvent('keyup', { key: '1', bubbles: true }));

            expect(minimizeSpy).not.toHaveBeenCalled();
        });

        it('should set default layout on TablePanelDefault when not already default', () => {
            tablePanelStateService.maximize();
            jest.spyOn(shortcutService, 'getShortcutForEvent').mockReturnValue({
                key: '2',
                modifierKeys: [],
                action: IdpShortcutAction.TablePanelDefault,
                category: 'table_navigation',
                description: 'x',
            });
            const setDefaultSpy = jest.spyOn(tablePanelStateService, 'setDefault');

            component.onKeyUp(new KeyboardEvent('keyup', { key: '2', bubbles: true }));

            expect(setDefaultSpy).toHaveBeenCalled();
        });

        it('should maximize table panel on TablePanelMaximize when not already maximized', () => {
            tablePanelStateService.setDefault();
            jest.spyOn(shortcutService, 'getShortcutForEvent').mockReturnValue({
                key: '3',
                modifierKeys: [],
                action: IdpShortcutAction.TablePanelMaximize,
                category: 'table_navigation',
                description: 'x',
            });
            const maximizeSpy = jest.spyOn(tablePanelStateService, 'maximize');

            component.onKeyUp(new KeyboardEvent('keyup', { key: '3', bubbles: true }));

            expect(maximizeSpy).toHaveBeenCalled();
        });

        it('should not call saveTask on Save keyup when task cannot save', () => {
            toggleCanSave$.next(false);
            fixture.detectChanges();
            jest.spyOn(shortcutService, 'getShortcutForEvent').mockReturnValue({
                key: 's',
                modifierKeys: [ModifierKey.ctrlKey],
                action: IdpShortcutAction.Save,
                category: 'general',
                description: 'x',
            });

            component.onKeyUp(new KeyboardEvent('keyup', { key: 's', ctrlKey: true, bubbles: true }));

            expect(contextService.saveTask).not.toHaveBeenCalled();
        });

        it('should not call completeTask on Submit keyup when task cannot complete', () => {
            toggleCanComplete$.next(false);
            fixture.detectChanges();
            jest.spyOn(shortcutService, 'getShortcutForEvent').mockReturnValue({
                key: 'Enter',
                modifierKeys: [ModifierKey.ctrlKey],
                action: IdpShortcutAction.Submit,
                category: 'general',
                description: 'x',
            });

            component.onKeyUp(new KeyboardEvent('keyup', { key: 'Enter', ctrlKey: true, bubbles: true }));

            expect(contextService.completeTask).not.toHaveBeenCalled();
        });
    });

    describe('unclaim', () => {
        let openDiscardDialogSpy: jasmine.Spy;

        beforeEach(() => {
            openDiscardDialogSpy = spyOn(DiscardChangesDialogComponent, 'open');
        });

        it('should show unclaim button based on taskCanUnclaim', async () => {
            toggleShowUnclaim$.next(false);
            fixture.detectChanges();
            expect(fixture.debugElement.query(By.css('[data-automation-id="idp-field-unclaim-button"]'))).toBeFalsy();

            toggleShowUnclaim$.next(true);
            fixture.detectChanges();
            expect(fixture.debugElement.query(By.css('[data-automation-id="idp-field-unclaim-button"]'))).toBeTruthy();
        });

        it('should disable the unclaim button when unclaimEnabled is false', async () => {
            toggleShowUnclaim$.next(true);
            toggleUnclaimEnabled$.next(false);
            fixture.detectChanges();

            const loader = TestbedHarnessEnvironment.loader(fixture);
            const button = await loader.getHarness(MatButtonHarness.with({ selector: '[data-automation-id="idp-field-unclaim-button"]' }));
            expect(await button.isDisabled()).toBe(true);
        });

        it('should enable the unclaim button when unclaimEnabled is true', async () => {
            toggleShowUnclaim$.next(true);
            toggleUnclaimEnabled$.next(true);
            fixture.detectChanges();

            const loader = TestbedHarnessEnvironment.loader(fixture);
            const button = await loader.getHarness(MatButtonHarness.with({ selector: '[data-automation-id="idp-field-unclaim-button"]' }));
            expect(await button.isDisabled()).toBe(false);
        });

        describe('when taskCanSave is false', () => {
            it('should call unclaimTask directly without opening a dialog', async () => {
                toggleCanSave$.next(false);
                toggleShowUnclaim$.next(true);
                fixture.detectChanges();

                const loader = TestbedHarnessEnvironment.loader(fixture);
                const button = await loader.getHarness(MatButtonHarness.with({ selector: '[data-automation-id="idp-field-unclaim-button"]' }));
                await button.click();

                expect(contextService.unclaimTask).toHaveBeenCalled();
                expect(openDiscardDialogSpy).not.toHaveBeenCalled();
            });
        });

        describe('when taskCanSave is true', () => {
            beforeEach(() => {
                toggleCanSave$.next(true);
                fixture.detectChanges();
            });

            it('should open the discard dialog instead of calling unclaimTask directly', () => {
                component.onUnclaim();

                expect(openDiscardDialogSpy).toHaveBeenCalled();
                expect(contextService.unclaimTask).not.toHaveBeenCalled();
            });

            it('should call unclaimTask when the discard callback is invoked', () => {
                component.onUnclaim();

                const discardCallback = openDiscardDialogSpy.calls.mostRecent().args[1] as () => void;
                discardCallback();

                expect(contextService.unclaimTask).toHaveBeenCalled();
            });
        });
    });
});
