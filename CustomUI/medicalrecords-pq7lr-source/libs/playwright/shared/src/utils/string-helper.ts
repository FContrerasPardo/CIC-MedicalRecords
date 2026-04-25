/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export const StringHelper = {
    capitalize(text: string) {
        return text && text[0].toUpperCase() + text.slice(1);
    },

    stripSpecialCharacters(text: string) {
        return text.replaceAll(/[^a-zA-Z0-9]+/g, '');
    },
};
