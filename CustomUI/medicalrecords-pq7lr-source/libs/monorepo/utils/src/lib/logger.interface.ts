/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export const LogLevel = {
    error: 'error',
    warn: 'warn',
    info: 'info',
    verbose: 'verbose',
    debug: 'debug',
    silly: 'silly',
} as const;
export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

export interface LoggerLike {
    level: LogLevel;
    getLevels(): LogLevel[];
    error(message: any): void;
    warn(message: any): void;
    info(message: any): void;
    verbose(message: any): void;
    debug(message: any): void;
    silly(message: any): void;
    ln(message: any): void;
}
