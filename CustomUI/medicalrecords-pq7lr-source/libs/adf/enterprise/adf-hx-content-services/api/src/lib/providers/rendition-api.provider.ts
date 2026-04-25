/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { getHxcsJsClientProvider } from '../hxcs-js-client/hxcs-js-client.factory';
import { RenditionsApi } from '@hylandsoftware/hxcs-js-client';

export const renditionsApiProvider = getHxcsJsClientProvider('RenditionsApi', RenditionsApi);

export const RENDITIONS_API_TOKEN = renditionsApiProvider.provide;
