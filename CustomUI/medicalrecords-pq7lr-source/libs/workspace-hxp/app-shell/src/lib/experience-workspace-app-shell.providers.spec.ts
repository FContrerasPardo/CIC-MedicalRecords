/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { getHeaderConfig } from './experience-workspace-app-shell.providers';

describe('getHeaderConfig', () => {
    it('should use custom application name from config when available', () => {
        const mockAppConfigService = { get: jest.fn().mockReturnValue('Custom App Name') };

        const headerConfig = getHeaderConfig(mockAppConfigService as any);

        expect(mockAppConfigService.get).toHaveBeenCalledWith('custom-modeled-extension.appConfig.application.name');
        expect(headerConfig.title).toBe('Custom App Name');
    });

    it('should default to "Workspace" when custom application name is not configured', () => {
        const mockAppConfigService = { get: jest.fn().mockReturnValue(undefined) };

        const headerConfig = getHeaderConfig(mockAppConfigService as any);

        expect(mockAppConfigService.get).toHaveBeenCalledWith('custom-modeled-extension.appConfig.application.name');
        expect(headerConfig.title).toBe('Workspace');
    });
});
