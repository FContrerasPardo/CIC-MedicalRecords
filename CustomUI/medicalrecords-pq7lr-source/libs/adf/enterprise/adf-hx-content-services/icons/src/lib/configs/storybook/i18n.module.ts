/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TranslateLoaderService } from '@alfresco/adf-core';
import { provideHttpClient } from '@angular/common/http';
import { LOCALE_ID, NgModule } from '@angular/core';
// eslint-disable-next-line no-restricted-imports
import { provideTranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import translations from '../../../../assets/i18n/en.json';

@NgModule({
    declarations: [],
    providers: [{ provide: LOCALE_ID, useValue: 'en' }, TranslateService, provideHttpClient(), provideTranslateLoader(TranslateLoaderService)],
    exports: [TranslateModule],
})
export class I18nModule {
    constructor(translate: TranslateService) {
        (translate.currentLoader as any).providers = [];
        translate.setFallbackLang('en');
        translate.use('en');
        translate.setTranslation('en', { ...translations });
    }
}
