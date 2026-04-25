/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { input, select, confirm } from '@inquirer/prompts';

export interface InquirerQuestion {
    type?: 'input' | 'list' | 'confirm';
    name: string;
    message: string;
    choices?: any[] | (() => any[]);
    default?: any;
    pageSize?: number;
}

export interface InquirerChoice {
    name: string;
    value?: any;
    disabled?: boolean;
    short?: string;
}

export class Inquirer {
    async prompt<T = any>(questions: InquirerQuestion | InquirerQuestion[]): Promise<T> {
        const questionsArray = Array.isArray(questions) ? questions : [questions];
        const answers: any = {};

        for (const question of questionsArray) {
            let answer: any;

            // Default to 'input' if no type is specified
            const questionType = question.type || (question.choices ? 'list' : 'input');

            switch (questionType) {
                case 'input': {
                    answer = await input({
                        message: question.message,
                        default: question.default,
                    });
                    break;
                }
                case 'list': {
                    answer = await select({
                        message: question.message,
                        choices: this.resolveChoices(question.choices),
                        default: question.default,
                    });
                    break;
                }
                case 'confirm': {
                    answer = await confirm({
                        message: question.message,
                        default: question.default ?? false,
                    });
                    break;
                }
                default: {
                    throw new Error(`Unsupported question type: ${questionType}`);
                }
            }

            answers[question.name] = answer;
        }

        return Array.isArray(questions) ? answers : answers[questions.name];
    }

    private resolveChoices(choices: InquirerQuestion['choices']): { name: string; value: any }[] {
        const resolved = typeof choices === 'function' ? choices() : choices;
        return resolved?.map((choice) => {
            if (typeof choice === 'string') {
                return { name: choice, value: choice };
            }
            return {
                name: choice.name || choice.value || choice,
                value: choice.value || choice.name || choice,
            };
        }) || [];
    }

    // Add compatibility methods for existing code
    registerPrompt() {
        // No-op for compatibility with old inquirer API
    }

    createPromptModule() {
        return this;
    }

    get prompts() {
        return {};
    }

    get Separator() {
        // No-op for compatibility with old inquirer API
        return class Separator {};
    }
}

// Create a default instance to maintain compatibility
export const inquirer = new Inquirer();

// Export for backward compatibility
export default inquirer;
