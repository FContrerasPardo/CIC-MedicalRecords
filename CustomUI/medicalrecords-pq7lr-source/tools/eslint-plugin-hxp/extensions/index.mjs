import { execSync } from 'node:child_process';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Check if Git is initialized in the repository
 * @param {string} repoPath The path to the Git repository
 * @returns {boolean} True if Git is initialized, false otherwise
 */
const checkIfGitExists = (repoPath) => {
    const gitDir = path.join(repoPath, '.git');
    const isGitExist = fs.existsSync(gitDir);
    return isGitExist;
};

/**
 * Check if a Git branch exists
 * @param {string} branchName The name of the branch to check
 * @returns {boolean} True if the branch exists, false otherwise
 */
const checkIfBranchExists = (branchName) => {
    try {
        const result = execSync(`git rev-parse --verify ${branchName}`, { stdio: 'pipe' });
        return !!result.toString().trim();
    } catch {
        console.error(`Branch ${branchName} does not exist.`);
    }

    return false;
};

/**
 * Check if file is eligible to be checked by the rule
 * @param {string} filename File name with full path
 * @param {string} repoPath Repository root path
 * @param {string[]} pluginsPath List of paths where we can change files
 * @returns {boolean}
 */
const isFileCheckRequired = (filename, repoPath, pluginsPath) => {
    let isFileInAllowedFolder = false;

    for (const pluginPath of pluginsPath) {
        const targetDir = path.join(repoPath, pluginPath);

        if (filename.match(new RegExp(`^${targetDir}`))) {
            isFileInAllowedFolder = true;
            break;
        }
    }

    if (isFileInAllowedFolder) {
        // Do not check file inside allowed folders
        return false;
    }

    const isFileInvalid = filename.includes('.ts') && filename.includes('.html');
    if (isFileInvalid) {
        // Sometimes we receive .ts.html files, we should skip them
        return false;
    }

    return true;
};

/**
 * Verify if a file was changed compared to a specific branch
 * @param {string} filename
 * @param {string} repoPath
 * @param {string} branchToCompare
 * @returns {boolean}
 */
const isFileChangedComparedToBranch = (filename, branchToCompare) => {
    let isChanged = false;

    try {
        const result = execSync(`git diff ${branchToCompare} --name-only ${filename}`, { encoding: 'utf8' });
        isChanged = result.trim().length > 0;
    } catch (e) {
        console.error({ e });
    }
    return isChanged;
};

const allowOnlyPluginChange = (defaultConfigExample, repoPath) => ({
    meta: {
        type: 'problem',
        docs: {
            description: 'Restrict changes to specific paths only',
        },
        messages: {
            updateFileError:
                "Please change files only related to plugins i.e. [{{pluginsPath}}] Any changes outside these paths are not allowed.\nIn case there are valid reasons for changing files in the 'core' application, please contact the responsible team for further assistance.",
            gitMissing:
                'Git is not available or not initialized in this repository.\nIn order to apply "hxp" eslint plugins restrictions, git must be installed and the repository must be initialized.',
            missingBranch:
                'HxP eslint plugin restriction cannot be applied because the branch "{{branchName}}" does not exist in the repository.\nPlease create a valid main branch with name "{{branchName}}" or update the eslint plugin configuration to use an existing branch.\n\n e.g. {{configExample}}',
        },
        schema: [
            {
                type: 'object',
                properties: {
                    mainBranch: {
                        type: 'string',
                    },
                    pluginsPath: {
                        type: 'array',
                        items: {
                            type: 'string',
                        },
                    },
                },
                additionalProperties: false,
            },
        ],
    },
    create: function (context) {
        function checkFiles(node) {
            const filename = context.filename || context.getFilename();
            const branchToCompare = context.options[0]?.mainBranch ?? 'develop';
            const pluginsPath = context.options[0]?.pluginsPath ?? [];

            const shouldCheckFile = isFileCheckRequired(filename, repoPath, pluginsPath);
            if (!shouldCheckFile) {
                return;
            }

            const isGitInitialized = checkIfGitExists(repoPath);
            if (!isGitInitialized) {
                context.report({
                    node,
                    messageId: 'gitMissing',
                    loc: {
                        start: { line: 1 },
                        end: { line: 2 },
                    },
                });
                return;
            }

            const canUseGitToCompareIfFileWasChanged = checkIfBranchExists(branchToCompare);
            if (!canUseGitToCompareIfFileWasChanged) {
                context.report({
                    node,
                    messageId: 'missingBranch',
                    data: {
                        branchName: branchToCompare,
                        configExample: defaultConfigExample,
                    },
                });
                return;
            }

            const isFileChanged = isFileChangedComparedToBranch(filename, branchToCompare);
            if (isFileChanged) {
                context.report({
                    node,
                    messageId: 'updateFileError',
                    data: {
                        pluginsPath: pluginsPath.join(', '),
                    },
                });
            }
        }

        return {
            'Program:exit': checkFiles,
        };
    },
});

export { allowOnlyPluginChange };
