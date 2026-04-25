/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import * as Archiver from 'archiver';
import { createWriteStream } from 'node:fs';
import { resolve } from 'node:path';
import { ProjectFilePathToBeExtracted } from '../project-configs/interfaces';
import fastGlob from 'fast-glob';

const archiver = require('archiver');

export class SourceCodeZipper {
    async zipCode(targetFile: string, include: string | ProjectFilePathToBeExtracted[], ignore: string[]): Promise<any> {
        const archive = this.createArchiveStream();
        const output = this.createOutputStream(targetFile);
        archive.pipe(output);

        if (typeof include === 'object') {
            // Move every transformer to the beginning of the array to be processed before glob patterns
            (include as ProjectFilePathToBeExtracted[]) = include.sort((a, b) => {
                const isAFilePathWithTransformer = typeof a === 'object' && 'transformer' in a;
                const isBFilePathWithTransformer = typeof b === 'object' && 'transformer' in b;

                if (isAFilePathWithTransformer && !isBFilePathWithTransformer) {
                    return -1;
                }

                if (!isAFilePathWithTransformer && isBFilePathWithTransformer) {
                    return 1;
                }

                return 0;
            });
        }

        const filesToIgnore = new Set<string>(ignore);

        const globFiles = new Set<string>();

        for (const path of include) {
            if (typeof path === 'string') {
                const allFiles = await fastGlob(path, {
                    cwd: process.cwd(),
                    ignore: [...filesToIgnore],
                });

                allFiles.forEach((file) => globFiles.add(file));
            } else {
                if ('transformer' in path) {
                    let transformerResults: any;

                    if (typeof path.transformer === 'function') {
                        transformerResults = await path.transformer(path.name, path.transformerConfig);
                    } else {
                        throw new TypeError('path.transformer is not a function');
                    }

                    filesToIgnore.add(path.name);
                    archive.append(transformerResults, { name: path.name });
                } else {
                    const allFiles = await fastGlob(path.name, {
                        cwd: process.cwd(),
                        ignore: [...filesToIgnore],
                    });

                    allFiles.forEach((file) => globFiles.add(file));
                }
            }
        }

        for (const filePath of globFiles) {
            archive.file(resolve(process.cwd(), filePath), { name: filePath });
        }

        this.generateEnvironmentVariables(archive);
        await archive.finalize();
    }

    /**
     * Generates an .env file for the archived output
     * @param archive achiever instance
     */
    private generateEnvironmentVariables(archive: Archiver.Archiver) {
        const content = ['APP_CONFIG_PLUGIN_FOLDER_RULES=false'].join('\r\n');

        archive.append(content, { name: '.env' });
    }

    private createOutputStream(targetFile: string): NodeJS.WritableStream {
        const output = createWriteStream(resolve(targetFile));

        output.on('close', () => {
            // eslint-disable-next-line no-console
            console.info(resolve(targetFile));
        });

        output.on('error', (error) => {
            throw error;
        });

        return output;
    }

    private createArchiveStream(): Archiver.Archiver {
        const archive: Archiver.Archiver = archiver('zip', { zlib: { level: 9 } });

        archive.on('warning', (error) => {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        });

        archive.on('error', (error) => {
            throw error;
        });

        archive.on('finish', () => {
            // eslint-disable-next-line no-console
            console.info('Archive has been successfully created!');
            // eslint-disable-next-line no-console
            console.info(convertBytes(archive.pointer()));
        });

        return archive;
    }
}

function convertBytes(bytes: number) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    if (bytes === 0) {
        return 'n/a';
    }

    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    if (i === 0) {
        return bytes + ' ' + sizes[i];
    }

    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
}
