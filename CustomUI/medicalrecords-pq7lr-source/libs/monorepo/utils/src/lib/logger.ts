/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { createLogger, transports, format, Logger } from 'winston';
import { styleText } from 'node:util';
import { LoggerLike } from './logger.interface';

const levels = {
    error: 'red',
    warn: 'yellow',
    info: 'cyan',
    verbose: 'magenta',
    debug: 'green',
    silly: 'blue',
};

const myFormat = format.printf(({ level, message }) => styleText(levels[level], message as string));

const loggerInstance: any = createLogger({
    transports: [new transports.Console()],
    format: format.combine(format.timestamp(), format.prettyPrint(), myFormat),
});

loggerInstance.getLevels = () => Object.keys(levels);
loggerInstance.ln = (message: any) => loggerInstance.info(message + '\n');

export const logger: Logger & LoggerLike = loggerInstance;
