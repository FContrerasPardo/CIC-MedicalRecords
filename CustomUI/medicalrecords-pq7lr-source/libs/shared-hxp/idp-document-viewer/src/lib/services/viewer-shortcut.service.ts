/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { ToolbarItemTypes } from '../models/toolbar';
import { TranslationService } from '@alfresco/adf-core';
import { Platform, PlatformUtil } from '../utils/platform-util';

export const ViewerModifierKey = {
    ctrlKey: 'ctrlKey',
    shiftKey: 'shiftKey',
    altKey: 'altKey',
} as const;

export type ViewerModifierKey = typeof ViewerModifierKey[keyof typeof ViewerModifierKey];

export const MODIFIER_KEYS = Object.keys(ViewerModifierKey)
    .filter((key) => Number.isNaN(Number(key)))
    .map((key) => key as ViewerModifierKey);

export type ViewerShortcutCategory = 'viewer_navigation' | 'viewer_general';

export const ViewerShortcutAction = {
    LayoutChange: 'LayoutChange',
    ThumbnailViewer: 'ThumbnailViewer',

    NavigateUp: 'NavigateUp',
    NavigateDown: 'NavigateDown',
    NavigateLeft: 'NavigateLeft',
    NavigateRight: 'NavigateRight',

    NavigatePreviousPage: 'NavigatePreviousPage',
    NavigateNextPage: 'NavigateNextPage',
    NavigateFirstPage: 'NavigateFirstPage',
    NavigateLastPage: 'NavigateLastPage',

    ZoomIn: 'ZoomIn',
    ZoomOut: 'ZoomOut',

    BestFit: 'BestFit',
    Rotate: 'Rotate',
    FullScreen: 'FullScreen',

    Image: 'Image',
    Text: 'Text',

    CopyToClipboard: 'CopyToClipboard',

    RedactionToggle: 'RedactionToggle',
    RedactionDrawMode: 'RedactionDrawMode',
} as const;

export type ViewerShortcutAction = typeof ViewerShortcutAction[keyof typeof ViewerShortcutAction];

export interface ViewerShortcutKeyConfig {
    key: string;
    modifierKeys: ViewerModifierKey[];
}

export interface ViewerShortcut extends ViewerShortcutKeyConfig {
    action: ViewerShortcutAction;
    category: ViewerShortcutCategory;
    toolbarItemType?: ToolbarItemTypes;
    description: string;
}

export type ViewerShortcutSummary = Record<
    string,
    Array<{
        description: string;
        keys: Array<{
            text: string;
            icon?: string;
        }>;
    }>
>;

@Injectable({
    providedIn: 'root',
})
export class ViewerShortcutService {
    private readonly translationService: TranslationService = inject(TranslationService);
    private shortcutOverrides: Partial<Record<ViewerShortcutAction, ViewerShortcutKeyConfig>> = {};
    shortcuts: ViewerShortcut[] = [
        {
            key: 'l',
            modifierKeys: [ViewerModifierKey.shiftKey],
            action: ViewerShortcutAction.LayoutChange,
            category: 'viewer_general',
            toolbarItemType: ToolbarItemTypes.LayoutChange,
            description: 'VIEWER.SERVICES.SHORTCUT.LAYOUT_CHANGE',
        },
        {
            key: 't',
            modifierKeys: [ViewerModifierKey.shiftKey],
            action: ViewerShortcutAction.ThumbnailViewer,
            category: 'viewer_general',
            toolbarItemType: ToolbarItemTypes.ThumbnailViewer,
            description: 'VIEWER.SERVICES.SHORTCUT.THUMBNAIL_VIEWER',
        },
        {
            key: 'i',
            modifierKeys: [ViewerModifierKey.shiftKey],
            action: ViewerShortcutAction.Image,
            category: 'viewer_general',
            toolbarItemType: ToolbarItemTypes.LayerSelection,
            description: 'VIEWER.SERVICES.SHORTCUT.IMAGE_LAYER',
        },
        {
            key: 'w',
            modifierKeys: [ViewerModifierKey.shiftKey],
            action: ViewerShortcutAction.Text,
            category: 'viewer_general',
            toolbarItemType: ToolbarItemTypes.LayerSelection,
            description: 'VIEWER.SERVICES.SHORTCUT.TEXT_LAYER',
        },
        {
            key: 'p',
            modifierKeys: [ViewerModifierKey.shiftKey],
            action: ViewerShortcutAction.NavigatePreviousPage,
            category: 'viewer_navigation',
            toolbarItemType: ToolbarItemTypes.PageNavigation,
            description: 'VIEWER.SERVICES.SHORTCUT.NAVIGATE_PREVIOUS_PAGE',
        },
        {
            key: 'n',
            modifierKeys: [ViewerModifierKey.shiftKey],
            action: ViewerShortcutAction.NavigateNextPage,
            category: 'viewer_navigation',
            toolbarItemType: ToolbarItemTypes.PageNavigation,
            description: 'VIEWER.SERVICES.SHORTCUT.NAVIGATE_NEXT_PAGE',
        },
        {
            key: 'Home',
            modifierKeys: [],
            action: ViewerShortcutAction.NavigateFirstPage,
            category: 'viewer_navigation',
            toolbarItemType: ToolbarItemTypes.PageNavigation,
            description: 'VIEWER.SERVICES.SHORTCUT.NAVIGATE_FIRST_PAGE',
        },
        {
            key: 'End',
            modifierKeys: [],
            action: ViewerShortcutAction.NavigateLastPage,
            category: 'viewer_navigation',
            toolbarItemType: ToolbarItemTypes.PageNavigation,
            description: 'VIEWER.SERVICES.SHORTCUT.NAVIGATE_LAST_PAGE',
        },
        {
            key: 'ArrowUp',
            modifierKeys: [],
            action: ViewerShortcutAction.NavigateUp,
            category: 'viewer_navigation',
            toolbarItemType: ToolbarItemTypes.PageNavigation,
            description: 'VIEWER.SERVICES.SHORTCUT.NAVIGATE_UP',
        },
        {
            key: 'ArrowDown',
            modifierKeys: [],
            action: ViewerShortcutAction.NavigateDown,
            category: 'viewer_navigation',
            toolbarItemType: ToolbarItemTypes.PageNavigation,
            description: 'VIEWER.SERVICES.SHORTCUT.NAVIGATE_DOWN',
        },
        {
            key: 'ArrowLeft',
            modifierKeys: [],
            action: ViewerShortcutAction.NavigateLeft,
            category: 'viewer_navigation',
            toolbarItemType: ToolbarItemTypes.PageNavigation,
            description: 'VIEWER.SERVICES.SHORTCUT.NAVIGATE_LEFT',
        },
        {
            key: 'ArrowRight',
            modifierKeys: [],
            action: ViewerShortcutAction.NavigateRight,
            category: 'viewer_navigation',
            toolbarItemType: ToolbarItemTypes.PageNavigation,
            description: 'VIEWER.SERVICES.SHORTCUT.NAVIGATE_RIGHT',
        },
        {
            key: '+',
            modifierKeys: [ViewerModifierKey.shiftKey, ViewerModifierKey.altKey],
            action: ViewerShortcutAction.ZoomIn,
            category: 'viewer_general',
            toolbarItemType: ToolbarItemTypes.Zoom,
            description: 'VIEWER.SERVICES.SHORTCUT.ZOOM_IN',
        },
        {
            key: '-',
            modifierKeys: [ViewerModifierKey.shiftKey, ViewerModifierKey.altKey],
            action: ViewerShortcutAction.ZoomOut,
            category: 'viewer_general',
            toolbarItemType: ToolbarItemTypes.Zoom,
            description: 'VIEWER.SERVICES.SHORTCUT.ZOOM_OUT',
        },
        {
            key: 'r',
            modifierKeys: [ViewerModifierKey.shiftKey],
            action: ViewerShortcutAction.Rotate,
            category: 'viewer_general',
            toolbarItemType: ToolbarItemTypes.Rotate,
            description: 'VIEWER.SERVICES.SHORTCUT.ROTATE_RIGHT',
        },
        {
            key: 'f',
            modifierKeys: [ViewerModifierKey.shiftKey],
            action: ViewerShortcutAction.FullScreen,
            category: 'viewer_general',
            toolbarItemType: ToolbarItemTypes.FullScreen,
            description: 'VIEWER.SERVICES.SHORTCUT.FULL_SCREEN',
        },
        {
            key: 'c',
            modifierKeys: [ViewerModifierKey.ctrlKey],
            action: ViewerShortcutAction.CopyToClipboard,
            category: 'viewer_general',
            description: 'VIEWER.SERVICES.SHORTCUT.CLIPBOARD_COPY',
        },
        {
            key: 'h',
            modifierKeys: [ViewerModifierKey.shiftKey],
            action: ViewerShortcutAction.RedactionToggle,
            category: 'viewer_general',
            toolbarItemType: ToolbarItemTypes.RedactionToggle,
            description: 'VIEWER.SERVICES.SHORTCUT.REDACTION_TOGGLE',
        },
        {
            key: 'd',
            modifierKeys: [ViewerModifierKey.shiftKey],
            action: ViewerShortcutAction.RedactionDrawMode,
            category: 'viewer_general',
            toolbarItemType: ToolbarItemTypes.RedactionDrawMode,
            description: 'VIEWER.SERVICES.SHORTCUT.REDACTION_DRAW_MODE',
        },
    ];

    applyShortcutOverrides(overrides: Partial<Record<ViewerShortcutAction, ViewerShortcutKeyConfig>>) {
        const effectiveKeys = this.shortcuts.map((shortcut) => {
            const override = overrides[shortcut.action];
            return {
                action: shortcut.action,
                key: (override?.key ?? shortcut.key).toLowerCase(),
                modifierKeys: [...(override?.modifierKeys ?? shortcut.modifierKeys)].sort((a, b) => a.localeCompare(b)).join(','),
            };
        });

        for (let i = 0; i < effectiveKeys.length; i++) {
            for (let j = i + 1; j < effectiveKeys.length; j++) {
                if (effectiveKeys[i].key === effectiveKeys[j].key && effectiveKeys[i].modifierKeys === effectiveKeys[j].modifierKeys) {
                    throw new Error(
                        `Shortcut conflict: actions "${effectiveKeys[i].action}" and "${effectiveKeys[j].action}" both resolve to the same key combination.`
                    );
                }
            }
        }

        this.shortcutOverrides = overrides;
    }

    getShortcutSummary(inputText?: string) {
        const summary: ViewerShortcutSummary = {};

        for (const shortcut of this.shortcuts) {
            if (!summary[shortcut.category]) {
                summary[shortcut.category] = [];
            }

            const override = this.shortcutOverrides[shortcut.action];
            const effectiveKey = override?.key ?? shortcut.key;
            const effectiveModifierKeys = override?.modifierKeys ?? shortcut.modifierKeys;
            const description = this.translationService.instant(shortcut.description);
            if (!inputText || description.toLowerCase().includes(inputText.toLowerCase())) {
                summary[shortcut.category].push({
                    description,
                    keys: [
                        ...effectiveModifierKeys.map((modifierKey) => {
                            const text = modifierKey.replace('Key', '').toUpperCase();
                            return PlatformUtil.getPlatform() === Platform.Mac && text === 'CTRL' ? { text: 'COMMAND' } : { text };
                        }),
                        {
                            text: effectiveKey,
                            icon: this.getShortcutIcon(effectiveKey),
                        },
                    ],
                });
            }
        }

        return summary;
    }

    getShortcutTooltipForAction(action: ViewerShortcutAction): string | undefined {
        const shortcut = this.shortcuts.find((sc) => sc.action === action);
        if (!shortcut) {
            return undefined;
        }
        const override = this.shortcutOverrides[action];
        const key = override?.key ?? shortcut.key;
        const modifierKeys = override?.modifierKeys ?? shortcut.modifierKeys;
        const keys = [...modifierKeys.map((modifierKey) => modifierKey.replace('Key', '').toUpperCase()), key.toUpperCase()];
        return keys.join(' + ');
    }

    getShortcutIcon(eventKey: string): string | undefined {
        switch (eventKey) {
            case 'ArrowUp': {
                return 'arrow_up';
            }
            case 'ArrowDown': {
                return 'arrow_down';
            }
            case 'ArrowLeft': {
                return 'arrow_left';
            }
            case 'ArrowRight': {
                return 'arrow_right';
            }
            default: {
                return undefined;
            }
        }
    }

    getShortcutForEvent(event: KeyboardEvent): ViewerShortcut | undefined {
        if (!event || !event.key) {
            return undefined;
        }

        return this.shortcuts.find((shortcut) => {
            const override = this.shortcutOverrides[shortcut.action];
            const effectiveKey = override?.key ?? shortcut.key;
            const effectiveModifierKeys = override?.modifierKeys ?? shortcut.modifierKeys;

            const modifiersInEvent = MODIFIER_KEYS.filter((modifierKey) => event[modifierKey]);

            if (event.metaKey && modifiersInEvent.length === 0 && PlatformUtil.getPlatform() === Platform.Mac) {
                modifiersInEvent.push(ViewerModifierKey.ctrlKey);
            }

            const hasKey =
                [event.code.toLowerCase(), event.key.toLowerCase()].includes(effectiveKey.toLowerCase()) ||
                (event.code.toLowerCase() === 'minus' && event.key === '_' && effectiveKey === '-');
            const noModifierMatch = effectiveModifierKeys.length === 0 && modifiersInEvent.length === 0;
            const exactMatchingModifier =
                effectiveModifierKeys.length === modifiersInEvent.length && effectiveModifierKeys.every((m) => modifiersInEvent.includes(m));
            const hasModifierKeys = noModifierMatch || exactMatchingModifier;

            return hasKey && hasModifierKeys;
        });
    }
}
