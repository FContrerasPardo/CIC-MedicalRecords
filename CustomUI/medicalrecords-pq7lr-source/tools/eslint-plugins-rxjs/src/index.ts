/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

const requireindex = require('requireindex');

const rulesRaw = requireindex(`${__dirname}/rules`);
const configs = requireindex(`${__dirname}/configs`);

const rules = Object.keys(rulesRaw).reduce<Record<string, any>>((acc, key) => {
    acc[key] = rulesRaw[key].default || rulesRaw[key];
    return acc;
}, {});

module.exports = {
    rules,
    configs,
};

module.exports.default = {
    rules,
};
