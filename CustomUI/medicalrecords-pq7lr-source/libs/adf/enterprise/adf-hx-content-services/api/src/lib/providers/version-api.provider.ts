/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { VersionApi } from '@hylandsoftware/hxcs-js-client';
import { getHxcsJsClientProvider } from '../hxcs-js-client/hxcs-js-client.factory';

export const versionApiProvider = getHxcsJsClientProvider('VersionApi', VersionApi);
export const VERSION_API_TOKEN = versionApiProvider.provide;
