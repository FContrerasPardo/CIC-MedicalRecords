// The app build type-checks the plugin specs with Jasmine typings (tsconfig.app.json), so specs here
// stick to describe/it/expect: no `jest` global, no jest.fn().
import {
    DEFAULT_APPEARANCE,
    WORKSPACE_NAV_ATTRIBUTE,
    WORKSPACE_NAV_STORAGE_KEY,
    applyPreferences,
    parseWorkspaceNav,
    readStoredPreferences,
    storePreferences,
} from './appearance.model';

describe('appearance model', () => {
    describe('parseWorkspaceNav', () => {
        it('accepts the supported modes', () => {
            expect(parseWorkspaceNav('auto')).toBe('auto');
            expect(parseWorkspaceNav('collapsed')).toBe('collapsed');
        });

        it('falls back to automatic for anything else', () => {
            expect(parseWorkspaceNav('expanded')).toBe('auto');
            expect(parseWorkspaceNav('')).toBe('auto');
            expect(parseWorkspaceNav(null)).toBe('auto');
            expect(parseWorkspaceNav(undefined)).toBe('auto');
            expect(parseWorkspaceNav(42)).toBe('auto');
        });
    });

    describe('readStoredPreferences', () => {
        it('reads the stored menu mode from the medical records key', () => {
            const requestedKeys: string[] = [];
            const storage = {
                getItem: (key: string) => {
                    requestedKeys.push(key);
                    return 'collapsed';
                },
            };

            expect(readStoredPreferences(storage)).toEqual({ workspaceNav: 'collapsed' });
            expect(requestedKeys).toEqual([WORKSPACE_NAV_STORAGE_KEY]);
        });

        it('uses the defaults when nothing is stored', () => {
            expect(readStoredPreferences({ getItem: () => null })).toEqual(DEFAULT_APPEARANCE);
        });

        it('uses the defaults when storage is unavailable', () => {
            expect(readStoredPreferences(null)).toEqual(DEFAULT_APPEARANCE);
            expect(readStoredPreferences(undefined)).toEqual(DEFAULT_APPEARANCE);
        });

        it('uses the defaults when reading storage throws', () => {
            const blocked = {
                getItem: () => {
                    throw new Error('blocked');
                },
            };

            expect(readStoredPreferences(blocked)).toEqual(DEFAULT_APPEARANCE);
        });

        it('returns a copy, so callers cannot mutate the shared defaults', () => {
            const preferences = readStoredPreferences(null);
            preferences.workspaceNav = 'collapsed';

            expect(DEFAULT_APPEARANCE.workspaceNav).toBe('auto');
        });
    });

    describe('storePreferences', () => {
        it('writes the menu mode under the medical records key', () => {
            const written: string[] = [];
            const storage = {
                setItem: (key: string, value: string) => {
                    written.push(key + '=' + value);
                },
            };

            storePreferences(storage, { workspaceNav: 'collapsed' });

            expect(written).toEqual(['medicalrecords.workspaceNav=collapsed']);
        });

        it('does not throw when storage is blocked or missing', () => {
            const blocked = {
                setItem: () => {
                    throw new Error('quota');
                },
            };

            expect(() => storePreferences(blocked, { workspaceNav: 'auto' })).not.toThrow();
            expect(() => storePreferences(null, { workspaceNav: 'auto' })).not.toThrow();
        });
    });

    describe('applyPreferences', () => {
        it('reflects the menu mode on the root element', () => {
            const root = document.createElement('html');

            applyPreferences(root, { workspaceNav: 'collapsed' });
            expect(root.getAttribute(WORKSPACE_NAV_ATTRIBUTE)).toBe('collapsed');

            applyPreferences(root, { workspaceNav: 'auto' });
            expect(root.getAttribute(WORKSPACE_NAV_ATTRIBUTE)).toBe('auto');
        });
    });
});
