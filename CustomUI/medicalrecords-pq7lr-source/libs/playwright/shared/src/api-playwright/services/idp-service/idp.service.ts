/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { BaseService } from '../base.service';
import { CustomAPIRequest } from '../../context-factory/context.models';
import { IdpApiRecognitionEndpoint } from './endpoints';

export class IdpService extends BaseService {
    private readonly serviceUrl: string;
    recognition: IdpApiRecognitionEndpoint;

    constructor(context: CustomAPIRequest) {
        super(context);

        this.serviceUrl = process.env['HXP_INTELLIGENT_DOCUMENT_PROCESSING_URL'] ?? '';

        this.recognition = new IdpApiRecognitionEndpoint(this.context, this.serviceUrl);
    }
}
