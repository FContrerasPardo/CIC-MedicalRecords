/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

const { join } = require('path');
const getBaseKarmaConfig = require('../../../karma.conf');

module.exports = function (config) {
const baseConfig = getBaseKarmaConfig();
config.set({
    ...baseConfig,
    coverageReporter: {
        ...baseConfig.coverageReporter,
        dir: join(__dirname, '../../../coverage/libs/content-ee/process-services-cloud-extension'),
    },
});
};
