/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { NavEnvsPipe } from './nav-envs.pipe';
import { mockAppEnvs, mockNavEnvs } from '../mocks/pipes/nav-envs.pipe.mock';
import { NoopTranslateModule } from '@alfresco/adf-core';

describe('NavEnvsPipe', () => {
    let pipe: NavEnvsPipe;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NoopTranslateModule],
            providers: [NavEnvsPipe],
        });

        pipe = TestBed.inject(NavEnvsPipe);
    });

    it('should return empty nav-env list if app-env list is empty', () => {
        expect(pipe.transform([])).toEqual([]);
    });

    it('should return nav-env list mapped from app-env-list', () => {
        expect(pipe.transform(mockAppEnvs)).toEqual(mockNavEnvs);
    });
});
