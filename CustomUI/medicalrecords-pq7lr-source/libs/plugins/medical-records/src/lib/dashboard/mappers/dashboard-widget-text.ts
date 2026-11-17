import { TranslateService } from '@ngx-translate/core';



export function resolveWidgetText(

    text: string | undefined,

    legacyKey: string | undefined,

    translate: TranslateService

): string {

    const trimmed = text?.trim();

    if (trimmed) {

        // A title may be an i18n key (e.g. the demo template), so it follows the UI language.
        if (/^[A-Z][A-Z0-9_]*(\.[A-Z0-9_]+)+$/.test(trimmed)) {
            const translated = translate.instant(trimmed);
            return translated && translated !== trimmed ? translated : trimmed;
        }

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


