#!/usr/bin/env node
/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */


/**
 * TypeScript Dependency Analyzer
 * Uses TSC to check actual imports and determine which dependency tags are needed
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

class TypeScriptDependencyAnalyzer {
    constructor() {
        this.workspaceRoot = process.cwd();
        this.tsConfig = this.loadTsConfig();
        this.aliasToTagMap = new Map();
        this.buildAliasToTagMap();
    }

    loadTsConfig() {
        const configPath = path.join(this.workspaceRoot, 'tsconfig.base.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return config;
    }

    buildAliasToTagMap() {
        // Get all project.json files and build alias -> tag mapping
        const projectFiles = this.findFiles('project.json');

        for (const projectFile of projectFiles) {
            try {
                const projectConfig = JSON.parse(fs.readFileSync(projectFile, 'utf8'));
                const tags = projectConfig.tags || [];
                const projectDir = path.dirname(projectFile);
                const relativePath = path.relative(this.workspaceRoot, projectDir);

                // Find matching alias in tsconfig
                const paths = this.tsConfig.compilerOptions.paths || {};
                for (const [alias, pathArray] of Object.entries(paths)) {
                    if (pathArray.length > 0) {
                        const cleanPath = pathArray[0].replace(/\/\*$/, '').replace(/\/src\/.*$/, '');
                        if (cleanPath === relativePath) {
                            // Map scope tags to alias
                            const scopeTag = tags.find((tag) => tag.startsWith('scope:'));
                            if (scopeTag) {
                                this.aliasToTagMap.set(alias, scopeTag);
                                console.log(`📍 Mapped alias "${alias}" -> tag "${scopeTag}"`);
                            }
                            break;
                        }
                    }
                }
            } catch (error) {
                // Skip invalid files
            }
        }

        console.log(`\n🗺️  Built ${this.aliasToTagMap.size} alias mappings\n`);
    }

    findFiles(filename) {
        const results = [];
        const search = (dir) => {
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                        search(fullPath);
                    } else if (entry.name === filename) {
                        results.push(fullPath);
                    }
                }
            } catch (error) {
                // Skip inaccessible directories
            }
        };
        search(this.workspaceRoot);
        return results;
    }

    getProjectPath(projectName) {
        const projectFiles = this.findFiles('project.json');

        for (const projectFile of projectFiles) {
            try {
                const projectConfig = JSON.parse(fs.readFileSync(projectFile, 'utf8'));
                if (projectConfig.name === projectName) {
                    return path.relative(this.workspaceRoot, path.dirname(projectFile));
                }
            } catch (error) {
                // Skip invalid files
            }
        }
        return null;
    }

    getSourceFiles(projectPath) {
        const sourceFiles = [];
        const srcPath = path.join(this.workspaceRoot, projectPath, 'src');

        if (!fs.existsSync(srcPath)) return sourceFiles;

        const findFiles = (dir) => {
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory()) {
                        findFiles(fullPath);
                    } else if (entry.name.match(/\.(ts|tsx)$/)) {
                        sourceFiles.push(fullPath);
                    }
                }
            } catch (error) {
                // Skip inaccessible directories
            }
        };

        findFiles(srcPath);
        return sourceFiles;
    }

    analyzeImportsWithTSC(projectName) {
        const projectPath = this.getProjectPath(projectName);
        if (!projectPath) {
            throw new Error(`Project ${projectName} not found`);
        }

        const sourceFiles = this.getSourceFiles(projectPath);
        console.log(`📁 Found ${sourceFiles.length} TypeScript files in ${projectName}`);

        const actualImports = new Set();

        // Parse each file with TypeScript compiler
        for (const sourceFile of sourceFiles) {
            try {
                const sourceText = fs.readFileSync(sourceFile, 'utf8');
                const sourceFileNode = ts.createSourceFile(sourceFile, sourceText, ts.ScriptTarget.Latest, true);

                this.visitNode(sourceFileNode, actualImports);
            } catch (error) {
                console.warn(`⚠️  Could not parse ${sourceFile}: ${error.message}`);
            }
        }

        return Array.from(actualImports);
    }

    visitNode(node, imports) {
        if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
            const importPath = node.moduleSpecifier.text;

            // Check if it's an internal alias or workspace import
            if (this.isInternalImport(importPath)) {
                imports.add(importPath);
            }
        }

        ts.forEachChild(node, (child) => this.visitNode(child, imports));
    }

    isInternalImport(importPath) {
        return (
            importPath.startsWith('@alfresco-dbp/') ||
            importPath.startsWith('@hxp/') ||
            importPath.startsWith('@features') ||
            this.aliasToTagMap.has(importPath)
        );
    }

    getEslintAllowedTags(projectName) {
        try {
            const eslintConfigPath = path.join(this.workspaceRoot, '.eslintrc.json');
            const eslintContent = fs.readFileSync(eslintConfigPath, 'utf-8');

            // Get the project tags to find the exact sourceTag
            const projectPath = path.join(this.workspaceRoot, 'apps', projectName, 'project.json');
            let projectTags = [];

            try {
                const projectConfig = JSON.parse(fs.readFileSync(projectPath, 'utf-8'));
                projectTags = projectConfig.tags || [];
            } catch {
                // Fallback to scope:projectName if project.json not found or has issues
                projectTags = [`scope:${projectName}`];
            }

            // Find the scope tag for this project
            const scopeTag = projectTags.find((tag) => tag.startsWith('scope:'));
            if (!scopeTag) {
                console.warn(`⚠️  No scope tag found for ${projectName}`);
                return [];
            }

            // Use regex to find the constraint for the exact scope tag
            const escapedScopeTag = scopeTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const constraintPattern = new RegExp(
                `"sourceTag"\\s*:\\s*"${escapedScopeTag}"[^}]*"onlyDependOnLibsWithTags"\\s*:\\s*\\[([^\\]]+)\\]`,
                'ms'
            );

            const match = eslintContent.match(constraintPattern);
            if (!match) {
                return [];
            }

            const tagsString = match[1];
            const tags = tagsString.match(/"([^"]+)"/g);

            return tags ? tags.map((tag) => tag.slice(1, -1)) : []; // Remove quotes
        } catch (error) {
            console.warn(`⚠️  Could not parse ESLint config: ${error.message}`);
            return [];
        }
    }

    analyzeProject(projectName) {
        console.log(`🔍 Analyzing ${projectName} with TypeScript compiler...\n`);

        // Get actual imports using TSC
        const actualImports = this.analyzeImportsWithTSC(projectName);
        console.log(`\n📦 Found ${actualImports.length} internal imports:`);
        actualImports.forEach((imp) => console.log(`   ${imp}`));

        // Convert imports to required tags
        const requiredTags = new Set();
        console.log(`\n🏷️  Mapping imports to required tags:`);

        for (const importAlias of actualImports) {
            const tag = this.aliasToTagMap.get(importAlias);
            if (tag) {
                requiredTags.add(tag);
                console.log(`   ✓ ${importAlias} -> ${tag}`);
            } else {
                console.log(`   ? ${importAlias} -> (no tag mapping found)`);
            }
        }

        // Get allowed tags from ESLint config
        const allowedTags = this.getEslintAllowedTags(projectName);
        console.log(`\n📋 ESLint allowed tags (${allowedTags.length}):`);
        allowedTags.forEach((tag) => console.log(`   • ${tag}`));

        // Find differences
        const unusedTags = allowedTags.filter((tag) => !requiredTags.has(tag));
        const missingTags = Array.from(requiredTags).filter((tag) => !allowedTags.includes(tag));

        console.log(`\n📊 Analysis Results:`);
        console.log(`   Required tags: ${requiredTags.size}`);
        console.log(`   Allowed tags: ${allowedTags.length}`);
        console.log(`   Unused tags: ${unusedTags.length}`);
        console.log(`   Missing tags: ${missingTags.length}`);

        if (unusedTags.length > 0) {
            console.log(`\n🚫 Unused dependency tags (can be removed):`);
            unusedTags.forEach((tag) => console.log(`   ❌ ${tag}`));
        }

        if (missingTags.length > 0) {
            console.log(`\n⚠️  Missing dependency tags (should be added):`);
            missingTags.forEach((tag) => console.log(`   ➕ ${tag}`));
        }

        if (unusedTags.length === 0 && missingTags.length === 0) {
            console.log(`\n✅ All dependency tags are correctly configured!`);
        }

        return { unusedTags, missingTags, requiredTags: Array.from(requiredTags), allowedTags, actualImports };
    }
}

// CLI
const projectName = process.argv[2];
if (!projectName) {
    console.log('Usage: node tsc-dep-analyzer.js <project-name>');
    process.exit(1);
}

try {
    const analyzer = new TypeScriptDependencyAnalyzer();
    const result = analyzer.analyzeProject(projectName);

    // Exit with error if issues found
    if (result.unusedTags.length > 0 || result.missingTags.length > 0) {
        process.exit(1);
    }
} catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
}
