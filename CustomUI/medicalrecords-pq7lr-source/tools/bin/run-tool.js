#!/usr/bin/env node
/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */


const resolve = require('path').resolve;
const runCommand = require('../shared/es5/run-command');

runCommand(resolve(__dirname, '..'));
