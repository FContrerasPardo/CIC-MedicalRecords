/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { CopyApi } from '@hylandsoftware/hxcs-js-client';
import { getHxcsJsClientProvider } from '../hxcs-js-client/hxcs-js-client.factory';

export const copyApiProvider = getHxcsJsClientProvider('CopyApi', CopyApi);
export const COPY_API_TOKEN = copyApiProvider.provide;
