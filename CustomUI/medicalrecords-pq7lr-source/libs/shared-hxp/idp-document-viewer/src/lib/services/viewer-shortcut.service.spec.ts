/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NoopTranslateModule, NoopTranslationService } from '@alfresco/adf-core';
import { TestBed } from '@angular/core/testing';
import { ViewerShortcutService, ViewerShortcutAction, ViewerModifierKey } from './viewer-shortcut.service';
import { Platform, PlatformUtil } from '../utils/platform-util';
import { MatIconTestingModule } from '@angular/material/icon/testing';

describe('ViewerShortcutService', () => {
    let service: ViewerShortcutService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NoopTranslateModule, MatIconTestingModule],
            providers: [ViewerShortcutService, NoopTranslationService],
        });

        service = TestBed.inject(ViewerShortcutService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should return shortcut summary', () => {
        const summary = service.getShortcutSummary();

        expect(summary['viewer_general'].length).toBeGreaterThan(0);
        expect(summary['viewer_navigation'].length).toBeGreaterThan(0);
    });

    it('should return shortcut tooltip for action', () => {
        const tooltip = service.getShortcutTooltipForAction(ViewerShortcutAction.LayoutChange);
        expect(tooltip).toBe('SHIFT + L');
    });

    it('should return shortcut tooltip for redaction actions', () => {
        expect(service.getShortcutTooltipForAction(ViewerShortcutAction.RedactionToggle)).toBe('SHIFT + H');
        expect(service.getShortcutTooltipForAction(ViewerShortcutAction.RedactionDrawMode)).toBe('SHIFT + D');
    });

    it('should return undefined for non-existing action', () => {
        const tooltip = service.getShortcutTooltipForAction('NonExistingAction' as ViewerShortcutAction);
        expect(tooltip).toBeUndefined();
    });

    it('should return shortcut for event', () => {
        const event = new KeyboardEvent('keydown', { key: 'l', shiftKey: true });
        const shortcut = service.getShortcutForEvent(event);
        expect(shortcut?.action).toBe(ViewerShortcutAction.LayoutChange);
    });

    it('should return proper action for the text layer shortcut', () => {
        const event = new KeyboardEvent('keydown', { key: 'w', shiftKey: true });
        const shortcut = service.getShortcutForEvent(event);
        expect(shortcut?.action).toBe(ViewerShortcutAction.Text);
    });

    it('should return proper action for the image layer shortcut', () => {
        const event = new KeyboardEvent('keydown', { key: 'i', shiftKey: true });
        const shortcut = service.getShortcutForEvent(event);
        expect(shortcut?.action).toBe(ViewerShortcutAction.Image);
    });

    it('should return proper action for the redaction toggle shortcut (Shift+H)', () => {
        const event = new KeyboardEvent('keydown', { key: 'h', shiftKey: true });
        const shortcut = service.getShortcutForEvent(event);
        expect(shortcut?.action).toBe(ViewerShortcutAction.RedactionToggle);
    });

    it('should return proper action for the redaction draw mode shortcut (Shift+D)', () => {
        const event = new KeyboardEvent('keydown', { key: 'd', shiftKey: true });
        const shortcut = service.getShortcutForEvent(event);
        expect(shortcut?.action).toBe(ViewerShortcutAction.RedactionDrawMode);
    });

    it('should return undefined for non-matching event', () => {
        const event = new KeyboardEvent('keydown', { key: 'x', shiftKey: true });
        const shortcut = service.getShortcutForEvent(event);
        expect(shortcut).toBeUndefined();
    });

    it('should return correct icon for arrow keys', () => {
        expect(service.getShortcutIcon('ArrowUp')).toBe('arrow_up');
        expect(service.getShortcutIcon('ArrowDown')).toBe('arrow_down');
        expect(service.getShortcutIcon('ArrowLeft')).toBe('arrow_left');
        expect(service.getShortcutIcon('ArrowRight')).toBe('arrow_right');
    });

    it('should return undefined for non-arrow keys', () => {
        expect(service.getShortcutIcon('a')).toBeUndefined();
    });

    it('should not replace CTRL with COMMAND for Windows', () => {
        jest.spyOn(PlatformUtil, 'getPlatform').mockReturnValue(Platform.Windows);

        service.shortcuts = [
            {
                key: 'c',
                modifierKeys: [ViewerModifierKey.ctrlKey],
                action: ViewerShortcutAction.CopyToClipboard,
                category: 'viewer_general',
                description: 'VIEWER.SERVICES.SHORTCUT.CLIPBOARD_COPY',
            },
        ];
        jest.spyOn(TestBed.inject(NoopTranslationService), 'instant').mockReturnValue('Copy');

        const summary = service.getShortcutSummary();
        expect(summary['viewer_general'][0].keys[0].text).not.toBe('COMMAND');
        expect(summary['viewer_general'][0].keys[0].text).toBe('CTRL');
    });

    it('should replace CTRL with COMMAND for Mac', () => {
        jest.spyOn(PlatformUtil, 'getPlatform').mockReturnValue(Platform.Mac);

        service.shortcuts = [
            {
                key: 'c',
                modifierKeys: [ViewerModifierKey.ctrlKey],
                action: ViewerShortcutAction.CopyToClipboard,
                category: 'viewer_general',
                description: 'VIEWER.SERVICES.SHORTCUT.CLIPBOARD_COPY',
            },
        ];
        jest.spyOn(TestBed.inject(NoopTranslationService), 'instant').mockReturnValue('Copy');

        const summary = service.getShortcutSummary();
        expect(summary['viewer_general'][0].keys[0].text).toBe('COMMAND');
    });

    it('should filter shortcuts by partial text in getShortcutSummary', () => {
        service.shortcuts = [
            {
                key: 't',
                modifierKeys: [ViewerModifierKey.shiftKey],
                action: ViewerShortcutAction.ThumbnailViewer,
                category: 'viewer_general',
                description: 'VIEWER.SERVICES.SHORTCUT.THUMBNAIL_VIEWER',
            },
            {
                key: 'w',
                modifierKeys: [ViewerModifierKey.shiftKey],
                action: ViewerShortcutAction.Text,
                category: 'viewer_general',
                description: 'VIEWER.SERVICES.SHORTCUT.TEXT_LAYER',
            },
        ];

        const summary = service.getShortcutSummary('thumb');
        expect(summary['viewer_general'].length).toBe(1);
        expect(summary['viewer_general'][0].description).toBe('VIEWER.SERVICES.SHORTCUT.THUMBNAIL_VIEWER');
    });

    it('should add CTRL as a modifier on Mac when metaKey is pressed and no other modifiers are present', () => {
        jest.spyOn(PlatformUtil, 'getPlatform').mockReturnValue(Platform.Mac);

        const event = new KeyboardEvent('keydown', { key: 'c', metaKey: true });
        const shortcut = service.getShortcutForEvent(event);

        expect(shortcut?.action).toBe(ViewerShortcutAction.CopyToClipboard);
    });

    it('should not add CTRL as a modifier on non-Mac platforms when metaKey is pressed', () => {
        jest.spyOn(PlatformUtil, 'getPlatform').mockReturnValue(Platform.Windows);

        const event = new KeyboardEvent('keydown', { key: 'c', metaKey: true });
        const shortcut = service.getShortcutForEvent(event);

        expect(shortcut).toBeUndefined();
    });

    it('should not add CTRL as a modifier on Mac when other modifiers are present', () => {
        jest.spyOn(PlatformUtil, 'getPlatform').mockReturnValue(Platform.Mac);

        const event = new KeyboardEvent('keydown', { key: 'c', metaKey: true, shiftKey: true });
        const shortcut = service.getShortcutForEvent(event);

        expect(shortcut).toBeUndefined();
    });

    describe('applyOverrides', () => {
        it('should recognize the overridden key for an action', () => {
            service.applyShortcutOverrides({ [ViewerShortcutAction.RedactionToggle]: { key: 'g', modifierKeys: [ViewerModifierKey.shiftKey] } });

            const event = new KeyboardEvent('keydown', { key: 'g', shiftKey: true });
            const shortcut = service.getShortcutForEvent(event);

            expect(shortcut?.action).toBe(ViewerShortcutAction.RedactionToggle);
        });

        it('should no longer match the original Shift+H after overriding RedactionToggle', () => {
            service.applyShortcutOverrides({ [ViewerShortcutAction.RedactionToggle]: { key: 'g', modifierKeys: [ViewerModifierKey.shiftKey] } });

            const event = new KeyboardEvent('keydown', { key: 'h', shiftKey: true });
            const shortcut = service.getShortcutForEvent(event);

            expect(shortcut?.action).not.toBe(ViewerShortcutAction.RedactionToggle);
        });

        it('should return the overridden tooltip text for the action', () => {
            service.applyShortcutOverrides({ [ViewerShortcutAction.RedactionToggle]: { key: 'g', modifierKeys: [ViewerModifierKey.shiftKey] } });

            expect(service.getShortcutTooltipForAction(ViewerShortcutAction.RedactionToggle)).toBe('SHIFT + G');
        });

        it('should reflect overridden key in getShortcutSummary', () => {
            service.shortcuts = [
                {
                    key: 'h',
                    modifierKeys: [ViewerModifierKey.shiftKey],
                    action: ViewerShortcutAction.RedactionToggle,
                    category: 'viewer_general',
                    toolbarItemType: undefined,
                    description: 'VIEWER.SERVICES.SHORTCUT.REDACTION_TOGGLE',
                },
            ];
            service.applyShortcutOverrides({ [ViewerShortcutAction.RedactionToggle]: { key: 'g', modifierKeys: [ViewerModifierKey.shiftKey] } });

            const summary = service.getShortcutSummary();
            const keyTexts = summary['viewer_general'][0].keys.map((k) => k.text);

            expect(keyTexts).toContain('g');
            expect(keyTexts).not.toContain('h');
        });

        it('should leave non-overridden shortcuts unchanged', () => {
            service.applyShortcutOverrides({ [ViewerShortcutAction.RedactionToggle]: { key: 'g', modifierKeys: [ViewerModifierKey.shiftKey] } });

            const event = new KeyboardEvent('keydown', { key: 'd', shiftKey: true });
            const shortcut = service.getShortcutForEvent(event);

            expect(shortcut?.action).toBe(ViewerShortcutAction.RedactionDrawMode);
        });

        it('should restore default behaviour after overrides are cleared', () => {
            service.applyShortcutOverrides({ [ViewerShortcutAction.RedactionToggle]: { key: 'g', modifierKeys: [ViewerModifierKey.shiftKey] } });
            service.applyShortcutOverrides({});

            const event = new KeyboardEvent('keydown', { key: 'h', shiftKey: true });
            const shortcut = service.getShortcutForEvent(event);

            expect(shortcut?.action).toBe(ViewerShortcutAction.RedactionToggle);
        });

        it('should throw when an override maps two actions to the same key combination', () => {
            expect(() =>
                service.applyShortcutOverrides({
                    [ViewerShortcutAction.RedactionToggle]: { key: 'd', modifierKeys: [ViewerModifierKey.shiftKey] },
                })
            ).toThrow(/RedactionToggle.*RedactionDrawMode|RedactionDrawMode.*RedactionToggle/);
        });

        it('should accept a swap where two actions exchange their default keys', () => {
            expect(() =>
                service.applyShortcutOverrides({
                    [ViewerShortcutAction.RedactionToggle]: { key: 'd', modifierKeys: [ViewerModifierKey.shiftKey] },
                    [ViewerShortcutAction.RedactionDrawMode]: { key: 'h', modifierKeys: [ViewerModifierKey.shiftKey] },
                })
            ).not.toThrow();
        });

        it('should not apply the overrides when a conflict is detected', () => {
            try {
                service.applyShortcutOverrides({
                    [ViewerShortcutAction.RedactionToggle]: { key: 'd', modifierKeys: [ViewerModifierKey.shiftKey] },
                });
            } catch {
                // expected
            }

            const event = new KeyboardEvent('keydown', { key: 'h', shiftKey: true });
            expect(service.getShortcutForEvent(event)?.action).toBe(ViewerShortcutAction.RedactionToggle);
        });
    });
});
