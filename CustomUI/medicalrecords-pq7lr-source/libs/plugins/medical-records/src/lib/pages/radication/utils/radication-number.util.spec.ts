import { generateRadicationNumber, isValidRadicationNumber, parseRadicationNumber, RADICATION_NUMBER_PATTERN } from './radication-number.util';

describe('radication number', () => {
    const date = new Date(2026, 10, 15, 9, 30);

    it('follows the CIC-Fin application number shape: prefix, year and five digits', () => {
        expect(generateRadicationNumber({ date, random: () => 0 })).toBe('RAD-2026-10000');
        expect(generateRadicationNumber({ date, random: () => 0.5 })).toBe('RAD-2026-55000');
        expect(generateRadicationNumber({ date, random: () => 0.999999 })).toBe('RAD-2026-99999');
        expect(generateRadicationNumber({ date: new Date(2027, 0, 1), random: () => 0.25 })).toBe('RAD-2027-32500');
    });

    it('always produces a valid number without letters other than the prefix', () => {
        for (let index = 0; index < 200; index++) {
            const value = generateRadicationNumber({ date });
            expect(value).toMatch(RADICATION_NUMBER_PATTERN);
        }
    });

    it('varies between radications of the same day', () => {
        const values = new Set(Array.from({ length: 50 }, () => generateRadicationNumber({ date })));
        expect(values.size > 40).toBe(true);
    });

    it('parses valid numbers and rejects anything else', () => {
        expect(parseRadicationNumber(' rad-2026-48213 ')).toEqual({ year: 2026, serial: '48213' });
        expect(isValidRadicationNumber('RAD-2026-48213')).toBe(true);
        expect(isValidRadicationNumber('RAD-2026-4821')).toBe(false);
        expect(isValidRadicationNumber('AB-2026-48213')).toBe(false);
        expect(isValidRadicationNumber(null)).toBe(false);
    });
});
