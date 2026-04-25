/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Pipe, PipeTransform } from '@angular/core';

const STATUS_CLASS_MAP_LOWER: { [key: string]: string } = {
    // eslint-disable-next-line @cspell/spellchecker
    underretention: 'hxp-governance-record-status-under-retention',
    unprocessed: 'hxp-governance-record-status-unprocessed',
    incomplete: 'hxp-governance-record-status-incomplete',
    ready: 'hxp-governance-record-status-ready',
    // eslint-disable-next-line @cspell/spellchecker
    reacheddisposition: 'hxp-governance-record-status-reached-disposition',
    archived: 'hxp-governance-record-status-archived',
    // eslint-disable-next-line @cspell/spellchecker
    onhold: 'hxp-governance-record-status-on-hold',
};

@Pipe({
    name: 'recordStatusClass',
})
export class RecordStatusClassPipe implements PipeTransform {
    transform(status: string): string {
        return status ? STATUS_CLASS_MAP_LOWER[status.toLowerCase()] ?? '' : '';
    }
}
