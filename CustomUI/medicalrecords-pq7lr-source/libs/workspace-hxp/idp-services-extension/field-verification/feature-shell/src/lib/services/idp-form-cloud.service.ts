/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { FormCloudService } from '@alfresco/adf-process-services-cloud';
import { Injectable } from '@angular/core';
import { from, map } from 'rxjs';

@Injectable()
export class IdpFormCloudService extends FormCloudService {
    getForms(appName: string) {
        const basePath = this.getBasePath(appName);
        return from(
            this.adfHttpClient.get<
                Array<{
                    formRepresentation: { id: string; name: string; key: string; description: string };
                }>
            >(`${basePath}/form/v1/forms`)
        );
    }

    getFormByModelKey(appName: string, formModelKey: string) {
        return this.getForms(appName).pipe(map((forms) => forms.find((form) => form.formRepresentation.key === formModelKey)));
    }
}
