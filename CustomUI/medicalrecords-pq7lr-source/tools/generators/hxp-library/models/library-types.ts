/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

const COMPONENT_LIBRARY_TYPES = new Set(['ui', 'smart']);

/**
 * Process extension libraries (e.g., content-ee) that can use ADF services
 */
const PROCESS_EXTENSION_CATEGORIES = new Set(['content-ee']);

/**
 * DDD dependency rules: maps library type → tags it must NOT depend on.
 * Enforces clean architecture boundaries between library layers.
 *
 * Dependency direction (allowed):
 *   domain-shell / feature-shell → smart → ui / data-access → utils / external
 *
 * Each entry lists the forbidden upstream types for a given library type.
 */
const FORBIDDEN_TYPE_DEPENDENCIES: Record<string, string[]> = {
    'data-access': ['type:smart', 'type:ui', 'type:feature-shell', 'type:domain-shell'],
    smart: ['type:feature-shell', 'type:domain-shell'],
    utils: ['type:smart', 'type:ui', 'type:data-access', 'type:feature-shell', 'type:domain-shell'],
    external: ['type:smart', 'type:ui', 'type:data-access', 'type:feature-shell', 'type:domain-shell'],
    ui: ['type:smart', 'type:data-access', 'type:feature-shell', 'type:domain-shell'],
};

export function isComponentLibrary(type: string): boolean {
    return COMPONENT_LIBRARY_TYPES.has(type);
}

export function isProcessExtensionCategory(category: string): boolean {
    return PROCESS_EXTENSION_CATEGORIES.has(category);
}

export function getForbiddenTypeDependencies(type: string): string[] {
    return FORBIDDEN_TYPE_DEPENDENCIES[type] ?? [];
}
