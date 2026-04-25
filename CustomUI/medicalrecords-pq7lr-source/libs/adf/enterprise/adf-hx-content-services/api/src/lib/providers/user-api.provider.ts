/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { UserApi } from '@hylandsoftware/hxcs-js-client';
import { getHxcsJsClientProvider } from '../hxcs-js-client/hxcs-js-client.factory';

export const userApiProvider = getHxcsJsClientProvider('UserApi', UserApi);

export const USER_API_TOKEN = userApiProvider.provide;
