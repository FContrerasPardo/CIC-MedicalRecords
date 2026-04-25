/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

/**
 * Helper functions for ESLint rules that parse TypeScript component files.
 * These utilities use the TypeScript Compiler API for reliable AST-based parsing.
 */

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

/**
 * Extracts named and namespace imports from TypeScript source file.
 *
 * @param {ts.SourceFile} sourceFile - Parsed TypeScript source file
 * @returns {{ fileImports: Map<string, { source: string, originalName: string }>, namespaceImports: Map<string, string> }}
 */
export function extractFileImports(sourceFile) {
    const fileImports = new Map();
    const namespaceImports = new Map();

    for (const statement of sourceFile.statements) {
        if (!ts.isImportDeclaration(statement) || !statement.importClause) continue;

        const moduleSpecifier = statement.moduleSpecifier.text;
        const namedBindings = statement.importClause.namedBindings;

        if (!namedBindings) continue;

        if (ts.isNamedImports(namedBindings)) {
            // Handle: import { MatButtonModule } from '@angular/material/button'
            // Handle: import { MatButtonModule as ButtonModule } from '@angular/material/button'
            for (const element of namedBindings.elements) {
                const localName = element.name.text;
                const originalName = element.propertyName?.text || localName;
                fileImports.set(localName, { source: moduleSpecifier, originalName });
            }
        } else if (ts.isNamespaceImport(namedBindings)) {
            // Handle: import * as Material from '@angular/material/button'
            const namespaceName = namedBindings.name.text;
            namespaceImports.set(namespaceName, moduleSpecifier);
        }
    }

    return { fileImports, namespaceImports };
}

/**
 * Extracts imports from a @Component decorator's imports array.
 *
 * @param {ts.ArrayLiteralExpression} importsArray - The imports array from @Component decorator
 * @returns {Set<string>} Set of import names found in the decorator
 */
export function extractDecoratorImports(importsArray) {
    const decoratorImports = new Set();

    for (const element of importsArray.elements) {
        if (ts.isIdentifier(element)) {
            // Handle: imports: [MatButtonModule]
            decoratorImports.add(element.text);
        } else if (ts.isPropertyAccessExpression(element)) {
            // Handle: imports: [Material.MatButtonModule]
            decoratorImports.add(element.name.text);
        }
    }

    return decoratorImports;
}

/**
 * Checks if a decorator is a @Component decorator.
 *
 * @param {ts.Decorator} decorator - The decorator to check
 * @returns {boolean} True if this is a @Component decorator
 */
export function isComponentDecorator(decorator) {
    if (!ts.isCallExpression(decorator.expression)) return false;

    const expression = decorator.expression.expression;
    return ts.isIdentifier(expression) && expression.text === 'Component';
}

/**
 * Extracts metadata from a @Component decorator.
 *
 * @param {ts.Decorator} decorator - The @Component decorator
 * @returns {{ decoratorImports: Set<string>, isStandalone: boolean }}
 */
export function extractComponentMetadata(decorator) {
    let decoratorImports = new Set();
    let isStandalone = true; // Angular 19 default

    const args = decorator.expression.arguments;
    if (args.length === 0 || !ts.isObjectLiteralExpression(args[0])) {
        return { decoratorImports, isStandalone };
    }

    for (const property of args[0].properties) {
        if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name)) continue;

        const propName = property.name.text;

        if (propName === 'standalone' && property.initializer.kind === ts.SyntaxKind.FalseKeyword) {
            isStandalone = false;
        }

        if (propName === 'imports' && ts.isArrayLiteralExpression(property.initializer)) {
            decoratorImports = extractDecoratorImports(property.initializer);
        }
    }

    return { decoratorImports, isStandalone };
}

/**
 * Uses TypeScript AST to extract component metadata reliably.
 * This handles multi-line imports, aliases, comments, and edge cases that regex misses.
 *
 * @param {string} componentPath - Path to the .ts component file
 * @returns {{ fileImports: Map<string, { source: string, originalName: string }>, namespaceImports: Map<string, string>, decoratorImports: Set<string>, isStandalone: boolean } | null}
 */
export function parseComponentWithTypeScript(componentPath) {
    let content;
    try {
        content = fs.readFileSync(componentPath, 'utf8');
    } catch {
        return null;
    }

    const sourceFile = ts.createSourceFile(componentPath, content, ts.ScriptTarget.Latest, true);

    // Extract file-level imports
    const { fileImports, namespaceImports } = extractFileImports(sourceFile);

    // Find @Component decorator and extract its metadata
    let componentMetadata = { decoratorImports: new Set(), isStandalone: true };

    const visitNode = (node) => {
        if (!ts.isClassDeclaration(node)) {
            ts.forEachChild(node, visitNode);
            return;
        }

        const decorators = ts.canHaveDecorators?.(node) ? ts.getDecorators(node) : node.decorators;
        if (!decorators) return;

        for (const decorator of decorators) {
            if (isComponentDecorator(decorator)) {
                componentMetadata = extractComponentMetadata(decorator);
                return; // Found the component, stop searching
            }
        }

        ts.forEachChild(node, visitNode);
    };

    visitNode(sourceFile);

    return {
        fileImports,
        namespaceImports,
        decoratorImports: componentMetadata.decoratorImports,
        isStandalone: componentMetadata.isStandalone,
    };
}

/**
 * Checks if an import from file-level declarations is valid for a directive.
 *
 * @param {string} originalName - The original imported name (before any alias)
 * @param {string} moduleToCheck - The module name to check (e.g., 'MatButtonModule')
 * @param {string[]} allowedClasses - Array of allowed class names for this directive
 * @returns {boolean} True if this import satisfies the directive requirement
 */
export function isValidImport(originalName, moduleToCheck, allowedClasses) {
    // The main module works for all directives
    if (originalName === moduleToCheck) {
        return true;
    }

    // Check if this is one of the allowed directive classes
    return allowedClasses.includes(originalName);
}

/**
 * Checks if a directive has a valid import from a specific package.
 *
 * A valid import must satisfy two conditions:
 * 1. Be present in the @Component.imports array
 * 2. Be imported from the specified package
 *
 * This function handles:
 * - Direct imports: import { Module } from 'package'
 * - Aliased imports: import { Module as Alias } from 'package'
 * - Namespace imports: import * as Namespace from 'package'
 * - Individual directive imports: import { Directive } from 'package'
 *
 * @param {Map<string, {source: string, originalName: string}>} fileImports - Map of local names to import info
 * @param {Map<string, string>} namespaceImports - Map of namespace names to package sources
 * @param {Set<string>} decoratorImports - Set of imports from @Component.imports array
 * @param {string} packageToCheck - Package path to validate against (e.g., '@angular/material/button')
 * @param {string} moduleToCheck - Main module name to check (e.g., 'MatButtonModule')
 * @param {string[]} allowedClasses - Array of allowed class names for this directive
 * @returns {boolean} True if the directive has a valid import
 */
export function hasValidImport(fileImports, namespaceImports, decoratorImports, packageToCheck, moduleToCheck, allowedClasses) {
    // Check file-level imports used in the decorator
    for (const componentImport of decoratorImports) {
        const importInfo = fileImports.get(componentImport);
        if (!importInfo) continue;

        // Only accept imports from the correct package
        if (importInfo.source !== packageToCheck) continue;

        // Check if the original imported name is valid for this directive
        if (isValidImport(importInfo.originalName, moduleToCheck, allowedClasses)) {
            return true;
        }
    }

    // Check namespace imports (e.g., import * as Material)
    for (const [namespace, source] of namespaceImports.entries()) {
        if (source !== packageToCheck) continue;

        // Check if any valid member from this namespace is in decorator imports
        for (const componentImport of decoratorImports) {
            if (componentImport === moduleToCheck || allowedClasses.includes(componentImport)) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Checks if a decorator is a @Directive decorator.
 *
 * @param {ts.Decorator} decorator - The decorator to check
 * @returns {boolean} True if this is a @Directive decorator
 */
export function isDirectiveDecorator(decorator) {
    if (!ts.isCallExpression(decorator.expression)) return false;

    const expression = decorator.expression.expression;
    return ts.isIdentifier(expression) && expression.text === 'Directive';
}

/**
 * Checks if the TypeScript file contains a @Component decorator.
 *
 * @param {string} componentPath - Path to the .ts file
 * @returns {boolean} True if the file contains a @Component decorator
 */
export function isComponentFile(componentPath) {
    let content;
    try {
        content = fs.readFileSync(componentPath, 'utf8');
    } catch {
        return false;
    }

    const sourceFile = ts.createSourceFile(componentPath, content, ts.ScriptTarget.Latest, true);

    let hasComponent = false;

    const visitNode = (node) => {
        if (hasComponent) return;

        if (!ts.isClassDeclaration(node)) {
            ts.forEachChild(node, visitNode);
            return;
        }

        const decorators = ts.canHaveDecorators?.(node) ? ts.getDecorators(node) : node.decorators;
        if (!decorators) return;

        for (const decorator of decorators) {
            if (isComponentDecorator(decorator)) {
                hasComponent = true;
                return;
            }
        }

        ts.forEachChild(node, visitNode);
    };

    visitNode(sourceFile);
    return hasComponent;
}

/**
 * Extracts the templateUrl from a @Component decorator.
 *
 * @param {string} componentPath - Path to the .ts component file
 * @returns {string | null} The templateUrl path if found, null otherwise
 */
export function extractTemplateUrl(componentPath) {
    let content;
    try {
        content = fs.readFileSync(componentPath, 'utf8');
    } catch {
        return null;
    }

    const sourceFile = ts.createSourceFile(componentPath, content, ts.ScriptTarget.Latest, true);
    let templateUrl = null;

    const visitNode = (node) => {
        if (templateUrl) return;

        if (!ts.isClassDeclaration(node)) {
            ts.forEachChild(node, visitNode);
            return;
        }

        const decorators = ts.canHaveDecorators?.(node) ? ts.getDecorators(node) : node.decorators;
        if (!decorators) return;

        for (const decorator of decorators) {
            if (!isComponentDecorator(decorator)) continue;

            const args = decorator.expression.arguments;
            if (args.length === 0 || !ts.isObjectLiteralExpression(args[0])) continue;

            for (const property of args[0].properties) {
                if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name)) continue;

                if (property.name.text === 'templateUrl' && ts.isStringLiteral(property.initializer)) {
                    templateUrl = property.initializer.text;
                    return;
                }
            }
        }

        ts.forEachChild(node, visitNode);
    };

    visitNode(sourceFile);
    return templateUrl;
}

/**
 * Finds all TypeScript component files that reference a specific template.
 *
 * Searches in sibling directories of the template's parent directory.
 * This handles the common pattern where shared templates are in a base folder
 * and referenced by components in sibling folders (e.g., base/filter/*.html used by specific-filter/*.ts).
 *
 * @param {string} templatePath - Absolute path to the template file
 * @returns {string[]} Array of component file paths that use this template
 */
export function findComponentsUsingTemplate(templatePath) {
    const templateDir = path.dirname(templatePath);
    const parentDir = path.dirname(templateDir); // e.g., .../filters/base
    const grandParentDir = path.dirname(parentDir); // e.g., .../filters

    const componentsWithTemplate = [];

    // Helper to check a single TypeScript file
    const checkFile = (filePath) => {
        if (!filePath.endsWith('.ts') || filePath.endsWith('.spec.ts')) return;

        const componentTemplateUrl = extractTemplateUrl(filePath);
        if (!componentTemplateUrl) return;

        // Resolve relative templateUrl to absolute path
        const componentDir = path.dirname(filePath);
        const resolvedTemplatePath = path.resolve(componentDir, componentTemplateUrl);

        if (resolvedTemplatePath === templatePath) {
            componentsWithTemplate.push(filePath);
        }
    };

    // Helper to search a directory (non-recursive, one level only)
    const searchDirectory = (dir) => {
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isFile() && entry.name.endsWith('.ts')) {
                checkFile(fullPath);
            }
        }
    };

    // Search pattern: Look in sibling directories at the grandparent level
    // For example, if template is in base/date-filter/, search cutoff/, disposition/, etc.
    try {
        const siblings = fs.readdirSync(grandParentDir, { withFileTypes: true });
        for (const sibling of siblings) {
            if (sibling.isDirectory()) {
                const siblingPath = path.join(grandParentDir, sibling.name);
                searchDirectory(siblingPath);
            }
        }
    } catch {
        // If we can't read grandparent, just return what we found
    }

    return componentsWithTemplate;
}
