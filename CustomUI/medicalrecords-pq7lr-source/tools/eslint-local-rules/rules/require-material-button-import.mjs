/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

/**
 * ESLint Rule: require-material-button-import
 *
 * Ensures that Angular Material button attribute directives have corresponding imports
 * in the component's @Component.imports array (for standalone components).
 *
 * This rule uses the TypeScript Compiler API for reliable AST-based parsing,
 * avoiding regex-based edge cases.
 *
 * ## Why This Rule Exists
 *
 * Angular Material buttons use attribute selectors (not element selectors), which means:
 * - `<button mat-button>` requires MatButtonModule or MatButton to be imported
 * - Unlike `<mat-icon>`, these won't cause a template parse error if missing
 * - The button will render but without Material styling or functionality
 *
 * ## Limitations
 *
 * - Only checks external template files (.html), not inline templates
 * - Doesn't detect imports from spread operators or complex expressions
 *
 * @see https://eslint.org/docs/latest/extend/custom-rule-tutorial
 * @see https://material.angular.dev/components/button/overview
 */

import fs from 'node:fs';
import { parseComponentWithTypeScript, hasValidImport, isComponentFile, findComponentsUsingTemplate } from './helpers.mjs';

const BUTTON_MODULE = 'MatButtonModule';
const BUTTON_PACKAGE = '@angular/material/button';

/**
 * Map of Material button attribute directives to their specific directive classes.
 *
 * Each directive (e.g., 'mat-button') can be satisfied by either:
 * - MatButtonModule (imports all button directives)
 * - Individual directive classes listed in the array
 *
 * Note: Some directives map to multiple classes because they can be used
 * on both <button> elements (e.g., MatButton) and <a> elements (e.g., MatAnchor).
 */
const MATERIAL_BUTTON_DIRECTIVES = {
    'mat-button': ['MatButton', 'MatAnchor'],
    'mat-raised-button': ['MatButton', 'MatAnchor'],
    'mat-flat-button': ['MatButton', 'MatAnchor'],
    'mat-stroked-button': ['MatButton', 'MatAnchor'],
    'mat-icon-button': ['MatIconButton', 'MatIconAnchor'],
    'mat-fab': ['MatFabButton', 'MatFabAnchor'],
    'mat-mini-fab': ['MatMiniFabButton', 'MatMiniFabAnchor'],
};

export default {
    meta: {
        type: 'problem',
        docs: {
            description: 'Ensure Material button attribute directives have corresponding imports in standalone components',
            category: 'Best Practices',
            recommended: true,
            url: 'https://material.angular.dev/components/button/overview',
        },
        messages: {
            missingImport:
                "Material button directive '{{directive}}' requires {{module}} to be imported. " +
                "Add 'import { {{module}} } from '{{package}}';' and include it in the @Component imports array. " +
                'Alternatively, import the specific directive class (e.g., MatButton, MatIconButton).',
        },
        schema: [],
    },

    create(context) {
        const filename = context.filename ?? context.getFilename();

        // Only process HTML template files (inline templates are not checked)
        if (!filename.endsWith('.html')) {
            return {};
        }

        // Find corresponding TypeScript component file
        const componentPath = filename.replace(/\.html$/, '.ts');
        if (!fs.existsSync(componentPath)) {
            return {}; // Can't verify without component file
        }

        // Parse component using TypeScript AST for robust import detection
        const parsed = parseComponentWithTypeScript(componentPath);
        if (!parsed) {
            return {}; // Parsing failed
        }

        const { fileImports, namespaceImports, decoratorImports, isStandalone } = parsed;

        // Skip non-standalone components (they use NgModule imports instead)
        if (!isStandalone) {
            return {};
        }

        // Track reported directives to avoid duplicate error messages for the same directive
        const reportedDirectives = new Set();

        return {
            Element(node) {
                if (!node.attributes) {
                    return;
                }

                node.attributes.forEach((attr) => {
                    const directiveName = attr.name;

                    // Skip if not a Material button directive
                    if (!MATERIAL_BUTTON_DIRECTIVES[directiveName]) {
                        return;
                    }

                    // Skip if we already reported this directive
                    if (reportedDirectives.has(directiveName)) {
                        return;
                    }

                    // Check if properly imported in the matching component file
                    const allowedClasses = MATERIAL_BUTTON_DIRECTIVES[directiveName];
                    const hasImportInMatchingFile = hasValidImport(
                        fileImports,
                        namespaceImports,
                        decoratorImports,
                        BUTTON_PACKAGE,
                        BUTTON_MODULE,
                        allowedClasses
                    );

                    if (hasImportInMatchingFile) {
                        return;
                    }

                    // If the matching .ts file doesn't have imports, it might be a shared template.
                    // Check if this is a directive file (not component) or if decoratorImports is empty
                    if (!isComponentFile(componentPath) || decoratorImports.size === 0) {
                        // Find all components that reference this template
                        const componentsUsingTemplate = findComponentsUsingTemplate(filename);

                        // For shared templates, ALL components using it must have the proper imports
                        // If even one component is missing the import, that's a runtime bug
                        const allComponentsHaveImport =
                            componentsUsingTemplate.length > 0 &&
                            componentsUsingTemplate.every((compPath) => {
                                const componentParsed = parseComponentWithTypeScript(compPath);
                                if (!componentParsed) return false;

                                return (
                                    componentParsed.isStandalone &&
                                    hasValidImport(
                                        componentParsed.fileImports,
                                        componentParsed.namespaceImports,
                                        componentParsed.decoratorImports,
                                        BUTTON_PACKAGE,
                                        BUTTON_MODULE,
                                        allowedClasses
                                    )
                                );
                            });

                        if (allComponentsHaveImport) {
                            return; // All components using this template have the proper import
                        }
                    }

                    // Report the missing import
                    reportedDirectives.add(directiveName);
                    context.report({
                        node: attr,
                        messageId: 'missingImport',
                        data: {
                            directive: directiveName,
                            module: BUTTON_MODULE,
                            package: BUTTON_PACKAGE,
                        },
                    });
                });
            },
        };
    },
};
