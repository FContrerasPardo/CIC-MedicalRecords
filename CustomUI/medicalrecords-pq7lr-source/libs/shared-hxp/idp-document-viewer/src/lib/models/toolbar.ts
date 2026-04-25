/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TemplateRef } from '@angular/core';
import { EventTypes } from './events';

export const ToolbarItemTypes = {
    Zoom: 'Zoom',
    Rotate: 'Rotate',
    LayoutChange: 'LayoutChange',
    FullScreen: 'FullScreen',
    BestFit: 'BestFit',
    PageNavigation: 'PageNavigation',
    ThumbnailViewer: 'ThumbnailViewer',
    LayerSelection: 'LayerSelection',
    RedactionToggle: 'RedactionToggle',
    RedactionDrawMode: 'RedactionDrawMode',
} as const;

export type ToolbarItemTypes = typeof ToolbarItemTypes[keyof typeof ToolbarItemTypes];

export const ToolbarControlPosition = {
    Start: 'start',
    Middle: 'middle',
    End: 'end',
} as const;

export type ToolbarControlPosition = typeof ToolbarControlPosition[keyof typeof ToolbarControlPosition];

export interface ToolbarItem {
    type: ToolbarItemTypes;
    icon: string;
    label: string;
    shortcutKey?: string;
    enabled: boolean;
    canStaySelected: boolean;
    selected: boolean;
    order: number;
    position: ToolbarControlPosition;
    displayType: 'button' | 'composite' | 'menu';
    eventType: EventTypes;
    subItems?: Record<string, ToolbarSubItem>;
    readonly config?: ZoomConfig | RotationConfig;
    templateRef?: TemplateRef<unknown>;
}

export type ToolbarSubItem = Pick<ToolbarItem, 'icon' | 'label' | 'shortcutKey' | 'enabled' | 'order'> & {
    id: string;
    selected?: boolean;
};

export interface ZoomConfig {
    readonly min: number;
    readonly max: number;
    readonly step: number;
}

export interface RotationConfig {
    readonly step: number;
}
