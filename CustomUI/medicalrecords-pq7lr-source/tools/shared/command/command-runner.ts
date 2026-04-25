/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { relative, join } from 'node:path';
import { exit } from 'node:process';
import * as CLI from '../cli';
import { inputParamsTable } from './decorators/param.decorators';
import { Inquirer, inquirer } from '../cli/inquirer-wrapper';

export type CommandInquirer = Inquirer;
export type BeforeRunReturnValue = Promise<null | undefined | number>;

export interface Runnable {
    run(): Promise<void>;
    beforeRun?(inquirer: CommandInquirer, paramsProvidedFromCli: { [key: string]: any }): BeforeRunReturnValue;
}

export interface RunnableCommand extends Runnable {
    name: string;
    description: string;
    version?: string;
    [inputParamsTable]: { [key: string]: CLI.Param };
}

export default class CommandRunner {
    constructor(private commandFilePath: string, protected cliArgs: string[]) {}

    public async invoke(): Promise<void> {
        let command: RunnableCommand;
        try {
            command = await this.loadCommand();
        } catch (error) {
            console.error(`Command does not exist: ${this.commandFilePath}`);
            throw error;
        }

        const everyProvidedParam = await this.getCommandParams(command);
        this.mergeParamsBackIntoCommandInstance(command, everyProvidedParam);

        await command.run();
    }

    private async loadCommand(): Promise<RunnableCommand> {
        const relativeCommandPath = relative(__dirname, this.commandFilePath);
        const CommandClass = (await import(relativeCommandPath)).default;
        return new CommandClass();
    }

    private async getCommandParams(command: RunnableCommand): Promise<{ [key: string]: any }> {
        const { version } = await import(join(process.cwd(), 'package.json'));
        const cliReader = new CLI.Reader(inquirer, command.name, command.description, command.version ?? version);
        const readerGenerator = cliReader.getReader(Object.values(command[inputParamsTable] || {}), this.cliArgs);
        const paramsProvidedFromCli = (await readerGenerator.next()).value;

        if (command.beforeRun) {
            const exitStatusCode = await command?.beforeRun(inquirer, paramsProvidedFromCli);

            if (exitStatusCode !== null && exitStatusCode !== undefined) {
                exit(exitStatusCode);
            }
        }

        return (await readerGenerator.next()).value;
    }

    private mergeParamsBackIntoCommandInstance(command: RunnableCommand, everyProvidedParam: { [key: string]: any }) {
        Object.values(command[inputParamsTable] || {}).forEach((inputParam) => {
            if (everyProvidedParam[inputParam.name] !== undefined) {
                command[inputParam.name] = everyProvidedParam[inputParam.name];
            }
        });
    }
}
