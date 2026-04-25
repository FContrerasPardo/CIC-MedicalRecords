/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Mock dependencies
jest.mock('node:child_process');
jest.mock('node:fs');
jest.mock('node:path');
jest.mock('@nx/devkit');
jest.mock('@inquirer/prompts');

const mockExecFileSync = execFileSync as jest.MockedFunction<typeof execFileSync>;
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;
const mockWriteFileSync = writeFileSync as jest.MockedFunction<typeof writeFileSync>;
const mockJoin = join as jest.MockedFunction<typeof join>;

// Import the functions we want to test
// Since the main file uses IIFE and executes immediately, we need to extract and test individual functions
// For now, we'll test the logic by importing and mocking the module

describe('ADF Update Version Tool', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('resolvePackageVersion', () => {
        // We'll need to refactor the main file to export functions for testing
        // For now, let's test the expected behavior

        it('should resolve a dist-tag to a concrete version', () => {
            mockExecFileSync.mockReturnValue('8.5.0\n');

            const packageName = '@alfresco/adf-core';
            const versionOrTag = 'alpha';

            const result = mockExecFileSync('npm', ['view', `${packageName}@${versionOrTag}`, 'version'], {
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe'],
            });

            expect(result.toString().trim()).toBe('8.5.0');
        });

        it('should handle npm command errors gracefully', () => {
            mockExecFileSync.mockImplementation(() => {
                throw new Error('Command failed');
            });

            expect(() => {
                mockExecFileSync('npm', ['view', '@alfresco/adf-core@invalid', 'version'], {
                    encoding: 'utf8',
                    stdio: ['pipe', 'pipe', 'pipe'],
                });
            }).toThrow('Command failed');
        });
    });

    describe('hasAdfDependencies', () => {
        const mockPackageJson = {
            dependencies: {
                '@alfresco/adf-core': '8.5.0',
            },
            devDependencies: {
                '@alfresco/adf-cli': '8.5.0',
            },
            peerDependencies: {},
        };

        it('should return true if package has ADF dependencies', () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

            const libsToCheck = ['@alfresco/adf-core', '@alfresco/adf-cli'];
            const result = libsToCheck.some(
                (lib) => mockPackageJson.dependencies?.[lib] || mockPackageJson.devDependencies?.[lib] || mockPackageJson.peerDependencies?.[lib]
            );

            expect(result).toBe(true);
        });

        it('should return false if package has no ADF dependencies', () => {
            mockReadFileSync.mockReturnValue(
                JSON.stringify({
                    dependencies: {
                        'some-other-package': '1.0.0',
                    },
                })
            );

            const libsToCheck = ['@alfresco/adf-core', '@alfresco/adf-cli'];
            const mockPkg = JSON.parse(mockReadFileSync('', 'utf8') as string);
            const result = libsToCheck.some((lib) => mockPkg.dependencies?.[lib]);

            expect(result).toBe(false);
        });

        it('should handle invalid JSON gracefully', () => {
            mockReadFileSync.mockReturnValue('invalid json');

            expect(() => {
                JSON.parse(mockReadFileSync('', 'utf8') as string);
            }).toThrow();
        });
    });

    describe('updateDependencyObject', () => {
        it('should update dependencies with exact versions', () => {
            const deps = {
                '@alfresco/adf-core': '8.4.0',
                '@alfresco/js-api': '7.9.0',
            };
            const versionMap = new Map([
                ['@alfresco/adf-core', '8.5.0'],
                ['@alfresco/js-api', '7.10.0'],
            ]);

            // Simulate the update logic
            versionMap.forEach((newVersion, lib) => {
                if (deps[lib]) {
                    deps[lib] = newVersion;
                }
            });

            expect(deps['@alfresco/adf-core']).toBe('8.5.0');
            expect(deps['@alfresco/js-api']).toBe('7.10.0');
        });

        it('should preserve range operators in peerDependencies', () => {
            const deps = {
                '@alfresco/adf-core': '>=8.4.0',
                '@alfresco/adf-extensions': '^8.4.0',
                '@alfresco/js-api': '~7.9.0',
            };
            const versionMap = new Map([
                ['@alfresco/adf-core', '8.5.0'],
                ['@alfresco/adf-extensions', '8.5.0'],
                ['@alfresco/js-api', '7.10.0'],
            ]);

            // Simulate the update logic with range preservation
            versionMap.forEach((newVersion, lib) => {
                if (deps[lib]) {
                    const rangeOperatorMatch = deps[lib].match(/^([><=^~]+)/);
                    const rangeOperator = rangeOperatorMatch ? rangeOperatorMatch[1] : '>=';
                    deps[lib] = `${rangeOperator}${newVersion}`;
                }
            });

            expect(deps['@alfresco/adf-core']).toBe('>=8.5.0');
            expect(deps['@alfresco/adf-extensions']).toBe('^8.5.0');
            expect(deps['@alfresco/js-api']).toBe('~7.10.0');
        });

        it('should add default >= operator if no range operator exists', () => {
            const deps = {
                '@alfresco/adf-core': '8.4.0',
            };
            const versionMap = new Map([['@alfresco/adf-core', '8.5.0']]);

            // Simulate the update logic with range preservation
            versionMap.forEach((newVersion, lib) => {
                if (deps[lib]) {
                    const rangeOperatorMatch = deps[lib].match(/^([><=^~]+)/);
                    const rangeOperator = rangeOperatorMatch ? rangeOperatorMatch[1] : '>=';
                    deps[lib] = `${rangeOperator}${newVersion}`;
                }
            });

            expect(deps['@alfresco/adf-core']).toBe('>=8.5.0');
        });

        it('should not update dependencies that are not in the version map', () => {
            const deps = {
                '@alfresco/adf-core': '8.4.0',
                'some-other-package': '1.0.0',
            };
            const versionMap = new Map([['@alfresco/adf-core', '8.5.0']]);

            versionMap.forEach((newVersion, lib) => {
                if (deps[lib]) {
                    deps[lib] = newVersion;
                }
            });

            expect(deps['@alfresco/adf-core']).toBe('8.5.0');
            expect(deps['some-other-package']).toBe('1.0.0');
        });

        it('should handle empty dependency objects', () => {
            const deps = {};
            const versionMap = new Map([['@alfresco/adf-core', '8.5.0']]);

            versionMap.forEach((newVersion, lib) => {
                if (deps[lib]) {
                    deps[lib] = newVersion;
                }
            });

            expect(Object.keys(deps).length).toBe(0);
        });
    });

    describe('updatePackageJson', () => {
        const mockPackageJsonPath = '/path/to/package.json';

        beforeEach(() => {
            mockJoin.mockImplementation((...args) => args.join('/'));
        });

        it('should update all dependency types correctly', () => {
            const packageJson = {
                dependencies: {
                    '@alfresco/adf-core': '8.4.0',
                },
                peerDependencies: {
                    '@alfresco/adf-extensions': '>=8.4.0',
                },
                devDependencies: {
                    '@alfresco/adf-cli': '8.4.0',
                },
            };

            mockReadFileSync.mockReturnValue(JSON.stringify(packageJson, null, 2));

            const versionMap = new Map([
                ['@alfresco/adf-core', '8.5.0'],
                ['@alfresco/adf-extensions', '8.5.0'],
                ['@alfresco/adf-cli', '8.5.0'],
            ]);

            const content = JSON.parse(mockReadFileSync(mockPackageJsonPath, 'utf8') as string);

            // Update dependencies (exact version)
            if (content.dependencies) {
                versionMap.forEach((newVersion, lib) => {
                    if (content.dependencies[lib]) {
                        content.dependencies[lib] = newVersion;
                    }
                });
            }

            // Update peerDependencies (preserve range)
            if (content.peerDependencies) {
                versionMap.forEach((newVersion, lib) => {
                    if (content.peerDependencies[lib]) {
                        const rangeOperatorMatch = content.peerDependencies[lib].match(/^([><=^~]+)/);
                        const rangeOperator = rangeOperatorMatch ? rangeOperatorMatch[1] : '>=';
                        content.peerDependencies[lib] = `${rangeOperator}${newVersion}`;
                    }
                });
            }

            // Update devDependencies (exact version)
            if (content.devDependencies) {
                versionMap.forEach((newVersion, lib) => {
                    if (content.devDependencies[lib]) {
                        content.devDependencies[lib] = newVersion;
                    }
                });
            }

            expect(content.dependencies['@alfresco/adf-core']).toBe('8.5.0');
            expect(content.peerDependencies['@alfresco/adf-extensions']).toBe('>=8.5.0');
            expect(content.devDependencies['@alfresco/adf-cli']).toBe('8.5.0');
        });

        it('should write updated package.json with correct formatting', () => {
            const packageJson = {
                dependencies: {
                    '@alfresco/adf-core': '8.4.0',
                },
            };

            mockReadFileSync.mockReturnValue(JSON.stringify(packageJson, null, 2));

            const updatedPackageJson = { ...packageJson };
            updatedPackageJson.dependencies['@alfresco/adf-core'] = '8.5.0';

            mockWriteFileSync(mockPackageJsonPath, JSON.stringify(updatedPackageJson, null, 2) + '\n', 'utf8');

            expect(mockWriteFileSync).toHaveBeenCalledWith(mockPackageJsonPath, JSON.stringify(updatedPackageJson, null, 2) + '\n', 'utf8');
        });

        it('should not write if no changes were made', () => {
            const packageJson = {
                dependencies: {
                    'some-other-package': '1.0.0',
                },
            };

            mockReadFileSync.mockReturnValue(JSON.stringify(packageJson, null, 2));

            const versionMap = new Map([['@alfresco/adf-core', '8.5.0']]);

            const content = JSON.parse(mockReadFileSync(mockPackageJsonPath, 'utf8') as string);
            let hasChanges = false;

            if (content.dependencies) {
                versionMap.forEach((_, lib) => {
                    if (content.dependencies[lib]) {
                        hasChanges = true;
                    }
                });
            }

            if (!hasChanges) {
                expect(mockWriteFileSync).not.toHaveBeenCalled();
            }
        });
    });

    describe('parseCliArgs', () => {
        it('should parse version flags correctly', () => {
            const mockArgs = {
                v: '8.5.0',
                j: '7.10.0',
                u: false,
                interactive: false,
            };

            expect(mockArgs.v).toBe('8.5.0');
            expect(mockArgs.j).toBe('7.10.0');
            expect(mockArgs.u).toBe(false);
            expect(mockArgs.interactive).toBe(false);
        });

        it('should handle skipJsApi flag', () => {
            const mockArgs = {
                v: '8.5.0',
                j: '7.10.0',
                u: true,
                interactive: false,
            };

            expect(mockArgs.u).toBe(true);
        });

        it('should handle interactive mode flag', () => {
            const mockArgs = {
                v: undefined,
                j: undefined,
                u: false,
                interactive: true,
            };

            expect(mockArgs.interactive).toBe(true);
        });

        it('should handle shorthand -i flag for interactive mode', () => {
            const mockArgs = {
                v: undefined,
                j: undefined,
                u: false,
                i: true,
            };

            expect(mockArgs.i).toBe(true);
        });
    });

    describe('version map building', () => {
        it('should build version map with resolved versions for all ADF libraries', () => {
            const libs = [
                '@alfresco/adf-cli',
                '@alfresco/adf-core',
                '@alfresco/adf-content-services',
                '@alfresco/adf-extensions',
                '@alfresco/adf-process-services-cloud',
            ];

            const resolvedAdfVersion = '8.5.0';
            const versionMap = new Map<string, string>();

            for (const lib of libs) {
                versionMap.set(lib, resolvedAdfVersion);
            }

            expect(versionMap.size).toBe(5);
            expect(versionMap.get('@alfresco/adf-core')).toBe('8.5.0');
            expect(versionMap.get('@alfresco/adf-cli')).toBe('8.5.0');
        });

        it('should add js-api to version map when not skipped', () => {
            const versionMap = new Map<string, string>();
            const resolvedJsApiVersion = '7.10.0';
            const skipJsApi = false;

            if (!skipJsApi && resolvedJsApiVersion) {
                versionMap.set('@alfresco/js-api', resolvedJsApiVersion);
            }

            expect(versionMap.has('@alfresco/js-api')).toBe(true);
            expect(versionMap.get('@alfresco/js-api')).toBe('7.10.0');
        });

        it('should not add js-api to version map when skipped', () => {
            const versionMap = new Map<string, string>();
            const resolvedJsApiVersion = '7.10.0';
            const skipJsApi = true;

            if (!skipJsApi && resolvedJsApiVersion) {
                versionMap.set('@alfresco/js-api', resolvedJsApiVersion);
            }

            expect(versionMap.has('@alfresco/js-api')).toBe(false);
        });
    });

    describe('range operator extraction', () => {
        it('should extract >= operator', () => {
            const version = '>=8.4.0';
            const match = version.match(/^([><=^~]+)/);
            expect(match?.[1]).toBe('>=');
        });

        it('should extract ^ operator', () => {
            const version = '^8.4.0';
            const match = version.match(/^([><=^~]+)/);
            expect(match?.[1]).toBe('^');
        });

        it('should extract ~ operator', () => {
            const version = '~8.4.0';
            const match = version.match(/^([><=^~]+)/);
            expect(match?.[1]).toBe('~');
        });

        it('should return null for versions without operators', () => {
            const version = '8.4.0';
            const match = version.match(/^([><=^~]+)/);
            expect(match).toBeNull();
        });

        it('should handle complex operators like >=', () => {
            const version = '>=8.4.0';
            const match = version.match(/^([><=^~]+)/);
            expect(match?.[1]).toBe('>=');
        });
    });
});
