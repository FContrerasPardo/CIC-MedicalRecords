/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { isProcessServiceCloudPluginEnabled } from '../../../rules/process-services-cloud.rules';
import { NodeEntry } from '@alfresco/js-api';
import { RuleContext } from '@alfresco/adf-extensions';

export function canShow(context: RuleContext): boolean {
    return (
        isProcessServiceCloudPluginEnabled() &&
        (hasSelectedFile(context.selection.nodes) || isSharedFiles(context)) &&
        !isTrashcan(context) &&
        !hasSelectedFolder(context.selection.nodes) &&
        !hasSelectedLink(context.selection.nodes)
    );
}

export function hasSelectedFile(nodes: NodeEntry[]): boolean {
    const files = nodes.filter((node) => node.entry.isFile);
    return files.length > 0;
}

export function hasSelectedFolder(nodes: NodeEntry[]): boolean {
    const folder = nodes.filter((node) => node.entry.isFolder);
    return folder.length > 0;
}

export function hasSelectedLink(nodes: NodeEntry[]): boolean {
    const links = nodes.filter((node) => node.entry.nodeType === 'app:filelink');
    return links.length > 0;
}

export function isSharedFiles(context: RuleContext): boolean {
    const { url } = context.navigation;
    return url?.startsWith('/shared') && !isPreview(context);
}

export function isTrashcan(context: RuleContext): boolean {
    const { url } = context.navigation;
    return url?.startsWith('/trashcan');
}

export function isPreview(context: RuleContext): boolean {
    const { url } = context.navigation;
    return url && (url.includes('/preview/') || url.includes('viewer:view') || url.includes('/view/'));
}
