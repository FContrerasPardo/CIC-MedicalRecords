/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import prompts from 'prompts';

export const promptPassword = async (message: string): Promise<string> => {
    const response = await prompts({
        type: 'password',
        name: 'password',
        message: message,
    });

    return response.password;
};
