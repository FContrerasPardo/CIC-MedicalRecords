/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { isPermissionInheritanceEnabled } from './permissions-utils';
import { jestMocks } from '@hxp/workspace-hxp/shared/testing';

describe('Permission Utils', () => {
    it('should return correct inheritance status from document ACL', () => {
        let result = isPermissionInheritanceEnabled(jestMocks.documentWithAcl);
        expect(result).toBe(true);

        jestMocks.documentWithAcl.sys_acl.push({
            user: { id: '__Everyone__' },
            permission: 'Everything',
            granted: false,
            status: 'EFFECTIVE',
        });

        result = isPermissionInheritanceEnabled(jestMocks.documentWithAcl);
        expect(result).toBe(false);
    });
});
