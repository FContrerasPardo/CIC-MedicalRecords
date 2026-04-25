/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export * from './command-runner';
export { CommandDecorator as Command } from './decorators/command.decorator';
export {
    InputParamDecorator as InputParam,
    ConfirmParamDecorator as ConfirmParam,
    ListParamDecorator as ListParam,
} from './decorators/param.decorators';
