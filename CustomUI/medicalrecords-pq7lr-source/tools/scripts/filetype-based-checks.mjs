import { readFileSync } from 'node:fs';
import { styleText } from 'node:util';
import { exit } from 'node:process';
import { dirname, resolve } from 'node:path';
import { flattenDiagnosticMessageText, parseJsonConfigFileContent, readConfigFile, sys } from 'typescript';

export function checkForForbiddenPattern(files) {
    const forbiddenPattern = /\[@\.disabled\]\s*=\s*"true"/g;
    for (const file of files) {
        const content = readFileSync(file, 'utf8');
        if (forbiddenPattern.test(content)) {
            console.error(styleText('red', `❌ Forbidden pattern found in: ${file}.`));
            console.error(
                styleText(
                    'red',
                    '❌ Using the @.disabled host binding, animations are turned off on all inner elements as well. This might result in animations missing unexpectedly from child components. Please remove this pattern before committing.'
                )
            );
            exit(1);
        }
    }
}

export function checkForMissingFeatureFlags(files) {
    const flagPattern = /TestFlags\.UnderFF/g;
    const testPattern = /test\(/g;
    let missingFlags = false;
    for (const file of files) {
        const content = readFileSync(file, 'utf8');
        const flagCount = (content.match(flagPattern) || []).length;
        const testCount = (content.match(testPattern) || []).length;

        if (flagCount < testCount) {
            missingFlags = true;
            console.warn(styleText('yellow', `File: ${file}`));
            console.warn(
                styleText(
                    'yellow',
                    ` └── has ${testCount} ${testCount === 1 ? 'test' : 'tests'} and ${flagCount} feature ${flagCount === 1 ? 'flag' : 'flags'}`
                )
            );
        }
    }

    if (missingFlags) {
        console.warn(
            styleText(
                'yellow',
                `⚠️ Some tests appear to be missing feature flags. If these tests are for features under development, consider adding the appropriate feature flag tag.`
            )
        );
    }
}

export function checkTsconfigValidity(files) {
    for (const file of files) {
        const configFile = readConfigFile(file, sys.readFile);
        if (configFile.error) {
            const message = flattenDiagnosticMessageText(configFile.error.messageText, '\n');
            console.error(styleText('red', `❌ Invalid tsconfig file: ${file}`));
            console.error(styleText('red', `   ${message}`));
            exit(1);
        }

        const parsed = parseJsonConfigFileContent(configFile.config, sys, dirname(resolve(file)));
        const relevantErrors = parsed.errors.filter((e) => e.code !== 18003);
        if (relevantErrors.length > 0) {
            console.error(styleText('red', `❌ Invalid tsconfig file: ${file}`));
            for (const error of relevantErrors) {
                const message = flattenDiagnosticMessageText(error.messageText, '\n');
                console.error(styleText('red', `   ${message}`));
            }
            exit(1);
        }
    }
}
