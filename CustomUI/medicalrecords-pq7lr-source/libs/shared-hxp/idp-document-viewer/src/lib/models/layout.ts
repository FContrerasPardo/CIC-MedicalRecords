/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ToolbarItemTypes } from './toolbar';

export const LayoutType = {
    None: 'None',
    Grid: 'Grid',
    SingleScrollable: 'SingleScrollable',
    SinglePage: 'SinglePage',
} as const;

export type LayoutType = typeof LayoutType[keyof typeof LayoutType];

export const LayoutDirection = {
    Horizontal: 'Horizontal',
    Vertical: 'Vertical',
    None: 'None',
} as const;

export type LayoutDirection = typeof LayoutDirection[keyof typeof LayoutDirection];

export const UserLayoutOptions = {
    Grid: 'Grid',
    Single_Vertical: 'Single_Vertical',
    Single_Horizontal: 'Single_Horizontal',
    SinglePage: 'SinglePage',
    None: 'None',
} as const;

export type UserLayoutOptions = typeof UserLayoutOptions[keyof typeof UserLayoutOptions];

export function userLayoutOptionsFromString(value: string): UserLayoutOptions {
    return UserLayoutOptions[value as keyof typeof UserLayoutOptions];
}

export interface Layout {
    readonly type: LayoutType;
    columns: number;
    rows: number;
    readonly availableActions: ToolbarItemTypes[];
    layoutDirection: LayoutDirection;
}

export const LayoutConfig: Record<LayoutType, Layout> = {
    [LayoutType.None]: {
        type: LayoutType.None,
        columns: 0,
        rows: 0,
        availableActions: [],
        layoutDirection: LayoutDirection.None,
    },
    [LayoutType.Grid]: {
        type: LayoutType.Grid,
        columns: 3,
        rows: 4,
        layoutDirection: LayoutDirection.Vertical,
        availableActions: [ToolbarItemTypes.Zoom, ToolbarItemTypes.Rotate, ToolbarItemTypes.LayoutChange, ToolbarItemTypes.FullScreen],
    },
    [LayoutType.SingleScrollable]: {
        type: LayoutType.SingleScrollable,
        columns: 1,
        rows: 1,
        layoutDirection: LayoutDirection.Vertical,
        availableActions: [ToolbarItemTypes.Zoom, ToolbarItemTypes.Rotate, ToolbarItemTypes.LayoutChange, ToolbarItemTypes.FullScreen],
    },
    [LayoutType.SinglePage]: {
        type: LayoutType.SinglePage,
        columns: 1,
        rows: 1,
        layoutDirection: LayoutDirection.None,
        availableActions: [
            ToolbarItemTypes.ThumbnailViewer,
            ToolbarItemTypes.PageNavigation,
            ToolbarItemTypes.LayerSelection,
            ToolbarItemTypes.Zoom,
            ToolbarItemTypes.Rotate,
            ToolbarItemTypes.FullScreen,
            ToolbarItemTypes.RedactionToggle,
            ToolbarItemTypes.RedactionDrawMode,
        ],
    },
};

export const UserLayoutOptionConfig: Record<UserLayoutOptions, { id: UserLayoutOptions; layout: Layout }> = {
    [UserLayoutOptions.Grid]: {
        id: UserLayoutOptions.Grid,
        layout: { ...LayoutConfig[LayoutType.Grid] },
    },
    [UserLayoutOptions.Single_Vertical]: {
        id: UserLayoutOptions.Single_Vertical,
        layout: {
            ...LayoutConfig[LayoutType.SingleScrollable],
            layoutDirection: LayoutDirection.Vertical,
        },
    },
    [UserLayoutOptions.Single_Horizontal]: {
        id: UserLayoutOptions.Single_Horizontal,
        layout: {
            ...LayoutConfig[LayoutType.SingleScrollable],
            layoutDirection: LayoutDirection.Horizontal,
        },
    },
    [UserLayoutOptions.SinglePage]: {
        id: UserLayoutOptions.SinglePage,
        layout: {
            ...LayoutConfig[LayoutType.SinglePage],
            layoutDirection: LayoutDirection.None,
        },
    },
    [UserLayoutOptions.None]: {
        id: UserLayoutOptions.None,
        layout: LayoutConfig[LayoutType.None],
    },
};

export function getAllowedActions(layoutType: UserLayoutOptions): ToolbarItemTypes[] {
    return UserLayoutOptionConfig[layoutType].layout.availableActions || [];
}

export interface LayoutInfo {
    type: LayoutType;
    columnWidthPercent: number;
    rowHeightPercent: number;
    fullViewerScreen: boolean;
    singleRowView: boolean;
    scrollDirection?: LayoutDirection;
    currentScaleFactor: number;
}
