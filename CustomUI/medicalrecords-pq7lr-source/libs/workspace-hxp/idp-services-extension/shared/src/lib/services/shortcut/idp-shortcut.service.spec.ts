/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import {
    IDP_SCREEN_SHORTCUTS_INJECTION_TOKEN,
    IdpShortcut,
    IdpShortcutAction,
    IdpShortcutService,
    ModifierKey,
} from './idp-shortcut.service';

describe('IdpShortcutService', () => {
    const digitShortcut: IdpShortcut = {
        key: '1',
        modifierKeys: [ModifierKey.ctrlKey, ModifierKey.shiftKey],
        action: IdpShortcutAction.TablePanelMinimize,
        category: 'table_navigation',
        description: 'test',
    };

    let service: IdpShortcutService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                IdpShortcutService,
                { provide: IDP_SCREEN_SHORTCUTS_INJECTION_TOKEN, useValue: [digitShortcut] },
                { provide: TranslateService, useValue: { instant: (k: string) => k } },
            ],
        });
        service = TestBed.inject(IdpShortcutService);
    });

    it('matches digit shortcuts when Shift is held (event.key is the shifted character, e.g. ! for 1)', () => {
        const event = new KeyboardEvent('keydown', {
            key: '!',
            code: 'Digit1',
            ctrlKey: true,
            shiftKey: true,
        });
        expect(service.getShortcutForEvent(event)?.action).toBe(IdpShortcutAction.TablePanelMinimize);
    });

    it('still matches digit shortcuts when event.key is the digit', () => {
        const event = new KeyboardEvent('keydown', {
            key: '1',
            code: 'Digit1',
            ctrlKey: true,
            shiftKey: true,
        });
        expect(service.getShortcutForEvent(event)?.action).toBe(IdpShortcutAction.TablePanelMinimize);
    });

    it('matches shortcut.key to physical digit via event.code Digit2 when key is shifted (e.g. @)', () => {
        const shortcut2: IdpShortcut = {
            key: '2',
            modifierKeys: [ModifierKey.ctrlKey, ModifierKey.shiftKey],
            action: IdpShortcutAction.TablePanelDefault,
            category: 'table_navigation',
            description: 'test2',
        };
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [
                IdpShortcutService,
                { provide: IDP_SCREEN_SHORTCUTS_INJECTION_TOKEN, useValue: [shortcut2] },
                { provide: TranslateService, useValue: { instant: (k: string) => k } },
            ],
        });
        const svc = TestBed.inject(IdpShortcutService);
        const event = new KeyboardEvent('keydown', {
            key: '@',
            code: 'Digit2',
            ctrlKey: true,
            shiftKey: true,
        });
        expect(svc.getShortcutForEvent(event)?.action).toBe(IdpShortcutAction.TablePanelDefault);
    });
});
