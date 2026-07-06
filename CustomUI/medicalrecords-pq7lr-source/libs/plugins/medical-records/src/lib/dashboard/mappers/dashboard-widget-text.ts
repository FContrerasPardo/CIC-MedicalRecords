import { TranslateService } from '@ngx-translate/core';



export function resolveWidgetText(

    text: string | undefined,

    legacyKey: string | undefined,

    translate: TranslateService

): string {

    const trimmed = text?.trim();

    if (trimmed) {

        return trimmed;

    }



    if (legacyKey?.trim()) {

        const translated = translate.instant(legacyKey);

        if (translated && translated !== legacyKey) {

            return translated;

        }

    }



    return '';

}



/** @deprecated Stored layouts v4 may still have { en, es } objects — pick first non-empty value. */

export function coerceLegacyLocalizedText(value: unknown): string | undefined {

    if (typeof value === 'string') {

        return value.trim() || undefined;

    }



    if (value && typeof value === 'object') {

        const record = value as Record<string, unknown>;

        for (const key of ['en', 'es']) {

            const candidate = record[key];

            if (typeof candidate === 'string' && candidate.trim()) {

                return candidate.trim();

            }

        }

    }



    return undefined;

}


