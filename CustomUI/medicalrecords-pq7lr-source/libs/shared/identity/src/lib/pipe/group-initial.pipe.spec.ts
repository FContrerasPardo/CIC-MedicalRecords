/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { IdentityGroupModel } from '../models/identity-group.model';
import { InitialGroupNamePipe } from './group-initial.pipe';

describe('InitialGroupNamePipe', () => {
    let pipe: InitialGroupNamePipe;
    let fakeGroup: IdentityGroupModel;

    beforeEach(() => {
        pipe = new InitialGroupNamePipe();
        fakeGroup = { name: 'mock' };
    });

    it('should return with the group initial', () => {
        fakeGroup.name = 'FAKE-GROUP-NAME';
        const result = pipe.transform(fakeGroup);
        expect(result).toBe('F');
    });

    it('should return an empty string when group is null', () => {
        const result = pipe.transform(null as unknown as IdentityGroupModel);
        expect(result).toBe('');
    });
});
