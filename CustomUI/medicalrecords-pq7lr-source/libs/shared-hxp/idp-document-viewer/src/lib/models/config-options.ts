/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { UserLayoutOptions } from './layout';
import { ToolbarItemTypes, ZoomConfig } from './toolbar';
import { ViewerShortcutAction, ViewerShortcutKeyConfig } from '../services/viewer-shortcut.service';

export const ToolbarPosition = {
    Left: 'left',
    Right: 'right',
    Top: 'top',
    Bottom: 'bottom',
} as const;

export type ToolbarPosition = typeof ToolbarPosition[keyof typeof ToolbarPosition];
export interface ConfigOptions {
    defaultLayoutType: LayoutState;
    defaultZoomConfig: ZoomConfig;
    defaultZoomLevel: number;
    toolbarPosition: ToolbarPosition;
    lazyLoad?: LazyLoadOptions;
    shortcutOverrides?: Partial<Record<ViewerShortcutAction, ViewerShortcutKeyConfig>>;
}

export interface LayoutState {
    type: UserLayoutOptions;
    availableActions?: ToolbarItemTypes[];
    override?: {
        rows: number;
        columns: number;
    };
}

export interface LazyLoadOptions {
    /** Enable IntersectionObserver-based lazy loading of page images */
    enabled: boolean;
    /** Root margin to preload before entering viewport, e.g. '400px 0px'*/
    rootMargin?: string;
    /** Percentage of the target that must be visible to trigger the callback, defaults to 0.01 */
    threshold?: number | number[];
}
