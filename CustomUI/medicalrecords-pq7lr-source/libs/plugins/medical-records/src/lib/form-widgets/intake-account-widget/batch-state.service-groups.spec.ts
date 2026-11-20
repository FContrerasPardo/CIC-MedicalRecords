import { assignServiceGroups, mapBatchStateToIntakeForDocuments, sectionHeaderOf, ServiceGroupRowLike, serviceGroupText } from './batch-state.mapper';
import { BatchStateSource } from './batch-state.model';

/** Synthetic billed rows (no real data): [date, service, cup, description, price, total]. */
type Cells = [string | null, string | null, string | null, string | null, string | null, string | null];
const row = ([serviceDate, serviceCode, cup, description, price, total]: Cells): ServiceGroupRowLike & { tag: string } => ({
    serviceDate,
    serviceCode,
    cup,
    description,
    quantity: null,
    price,
    total,
    tag: description ?? '',
});
/** Item with a date and an amount in Total. */
const item = (description: string, total: string): Cells => ['01/11/2026', null, 'C-1', description, null, total];
/** Group (subtotal) row: "<code> <name>" in the description and the amount in Price. */
const groupRow = (description: string, price: string | null): Cells => [null, null, null, description, price, null];

const groupsOf = (rows: Cells[]) => assignServiceGroups(rows.map(row)).map(({ row: entry, group }) => [entry.tag, group?.label ?? null]);

describe('service groups of the billed-services table', () => {
    it('detects group rows in both extractions and keeps rows with a date or a service as items', () => {
        expect(sectionHeaderOf(row(groupRow('400   LABORATORIO', '19,372.11')))).toEqual({ code: '400', name: 'LABORATORIO', amount: 19372.11 });
        expect(sectionHeaderOf(row([null, null, '400', 'LABORATORIO', '120.50', null]))).toEqual({ code: '400', name: 'LABORATORIO', amount: 120.5 });
        expect(sectionHeaderOf(row([null, null, null, '361 EQUIPO CIRUGIA', null, '80.00']))).toEqual({ code: '361', name: 'EQUIPO CIRUGIA', amount: 80 });
        expect(sectionHeaderOf(row(groupRow('300 HABITACION', null)))).toEqual({ code: '300', name: 'HABITACION', amount: null });
        expect(sectionHeaderOf(row(['01/11/2026', null, null, 'PAQUETE QUIRURGICO', null, null]))).toBeNull();
        expect(sectionHeaderOf(row(['01/11/2026', null, null, '400 LABORATORIO', '10.00', null]))).toBeNull();
        expect(sectionHeaderOf(row([null, '3100012', null, '400 LABORATORIO', null, '10.00']))).toBeNull();
        expect(sectionHeaderOf(row([null, null, 'C-1', '400 LABORATORIO', null, '10.00']))).toBeNull();
        expect(sectionHeaderOf(row(groupRow('LABORATORIO', '10.00')))).toBeNull();
        expect(sectionHeaderOf(row(groupRow('400 123', '10.00')))).toBeNull();
    });

    it('tells a group text of the "Servicio" column from an item code', () => {
        expect(serviceGroupText('02-CONSUL CONSULTA E INTERNCONSULTA')).toBe('02-CONSUL CONSULTA E INTERNCONSULTA');
        expect(serviceGroupText('8470009722678')).toBeNull();
        expect(serviceGroupText('  ')).toBeNull();
    });

    it('closes the items ABOVE each group row, with exact amounts, and never maps a group row as an item', () => {
        const result = assignServiceGroups(
            [
                item('HEMOGRAMA', '100.00'),
                item('GLUCOSA', '50.00'),
                groupRow('361   EQUIPO CIRUGIA', '150.00'),
                item('MONITOR', '70.00'),
                groupRow('365 RECUPERACION', '70.00'),
            ].map(row)
        );
        expect(result.map(({ row: entry, group }) => [entry.tag, group?.label ?? null])).toEqual([
            ['HEMOGRAMA', '361 EQUIPO CIRUGIA'],
            ['GLUCOSA', '361 EQUIPO CIRUGIA'],
            ['MONITOR', '365 RECUPERACION'],
        ]);
        expect(result[0].group).toEqual({ key: 'section:361', code: '361', label: '361 EQUIPO CIRUGIA', order: 0, billedSubtotal: 150 });
        expect(result[2].group?.billedSubtotal).toBe(70);
    });

    it('merges the spans of a code repeated across a page break and counts a repeated amount once', () => {
        const result = assignServiceGroups(
            [
                item('HEMOGRAMA', '60.00'),
                item('GLUCOSA', '40.00'),
                groupRow('400 LABORATORIO', '150.00'),
                item('UREA', '50.00'),
                groupRow('400 LABORATORIO', '150.00'),
            ].map(row)
        );
        expect(result.map(({ group }) => group?.label ?? null)).toEqual(['400 LABORATORIO', '400 LABORATORIO', '400 LABORATORIO']);
        expect(result[0].group).toBe(result[2].group);
        expect(result[0].group?.billedSubtotal).toBe(150);
    });

    it('gives the first items of an oversized span to the previous group row without items (page break)', () => {
        const result = assignServiceGroups(
            [
                groupRow('300 HABITACION', '350.00'),
                item('CUARTO PRIVADO', '200.00'),
                item('CUARTO COMPARTIDO', '150.00'),
                item('UCI DIA 1', '500.00'),
                item('UCI DIA 2', '700.00'),
                groupRow('310 CUIDADO INTENSIVO', '1,200.00'),
            ].map(row)
        );
        expect(result.map(({ row: entry, group }) => [entry.tag, group?.label ?? null])).toEqual([
            ['CUARTO PRIVADO', '300 HABITACION'],
            ['CUARTO COMPARTIDO', '300 HABITACION'],
            ['UCI DIA 1', '310 CUIDADO INTENSIVO'],
            ['UCI DIA 2', '310 CUIDADO INTENSIVO'],
        ]);
        expect(result[0].group?.order).toBe(1);
        expect(result[0].group?.billedSubtotal).toBe(350);
        expect(result[2].group?.billedSubtotal).toBe(1200);
    });

    it('keeps the extra items in the group when no previous group misses amount', () => {
        expect(groupsOf([item('INSUMO A', '100.00'), item('INSUMO B', '100.00'), groupRow('372 EQUIPOS', '100.00')])).toEqual([
            ['INSUMO A', '372 EQUIPOS'],
            ['INSUMO B', '372 EQUIPOS'],
        ]);
    });

    it('creates no group for a summary block of consecutive group rows, but keeps their amounts as reference', () => {
        const result = assignServiceGroups(
            [
                item('HEMOGRAMA', '10.00'),
                groupRow('400 LABORATORIO', '10.00'),
                groupRow('405 BANCO DE SANGRE', '30.00'),
                groupRow('410 PATOLOGIA', '20.00'),
                groupRow('420 RADIOLOGIA', '40.00'),
                item('TRANSFUSION', '30.00'),
                groupRow('405 BANCO DE SANGRE', '30.00'),
                item('RX TORAX', '40.00'),
                groupRow('420 RADIOLOGIA', null),
            ].map(row)
        );
        expect(result.map(({ row: entry, group }) => [entry.tag, group?.label ?? null])).toEqual([
            ['HEMOGRAMA', '400 LABORATORIO'],
            ['TRANSFUSION', '405 BANCO DE SANGRE'],
            ['RX TORAX', '420 RADIOLOGIA'],
        ]);
        expect(result.map(({ group }) => group?.billedSubtotal ?? null)).toEqual([10, 30, 40]);
    });

    it('treats rows with a date but no service nor CUP as items', () => {
        expect(
            groupsOf([
                ['01/11/2026', null, null, 'PRIVADO PEQUENO', null, '25.00'],
                ['01/11/2026', null, null, 'PAQUETE QUIRURGICO', null, null],
                groupRow('300 HABITACION', '25.00'),
            ])
        ).toEqual([
            ['PRIVADO PEQUENO', '300 HABITACION'],
            ['PAQUETE QUIRURGICO', '300 HABITACION'],
        ]);
    });

    it('leaves without group the items no group row closes', () => {
        expect(groupsOf([item('HEMOGRAMA', '10.00'), groupRow('400 LABORATORIO', '10.00'), item('SONOGRAFIA', '15.00')])).toEqual([
            ['HEMOGRAMA', '400 LABORATORIO'],
            ['SONOGRAFIA', null],
        ]);
        expect(groupsOf([['01/11/2026', '123', 'C-1', 'ITEM', '1.00', '1.00']])).toEqual([['ITEM', null]]);
    });

    it('groups by the "Servicio" text when most items carry one, inheriting it up to a "Sub Total"', () => {
        const result = groupsOf([
            ['01/11/2026', '01-HOTEL INTERNACIONES', 'C-1', 'HABITACION', '50.00', '50.00'],
            ['01/11/2026', '06-INSUMO INSUMOS', 'C-2', 'GUANTES', '5.00', '5.00'],
            ['01/11/2026', null, 'C-3', 'JERINGA', '3.00', '3.00'],
            [null, null, null, 'Sub Total', null, '58.00'],
            ['02/11/2026', null, 'C-4', 'GASA', '2.00', '2.00'],
            ['02/11/2026', '07-IMAG IMÁGENES', 'C-5', 'RX TORAX', '80.00', '80.00'],
            ['02/11/2026', '06-INSUMO  INSUMOS', 'C-6', 'CATETER', '9.00', '9.00'],
            [null, null, null, '400 LABORATORIO', '10.00', null],
        ]);
        expect(result).toEqual([
            ['HABITACION', '01-HOTEL INTERNACIONES'],
            ['GUANTES', '06-INSUMO INSUMOS'],
            ['JERINGA', '06-INSUMO INSUMOS'],
            ['GASA', null],
            ['RX TORAX', '07-IMAG IMÁGENES'],
            ['CATETER', '06-INSUMO INSUMOS'],
            ['400 LABORATORIO', '06-INSUMO INSUMOS'],
        ]);
    });

    it('never maps a group row as a service (CUP/CUM variant) and exposes the billed subtotal', () => {
        const cells = (values: Record<string, string>) => Object.entries(values).map(([recordName, value]) => ({ recordName, value }));
        const batchState: BatchStateSource = {
            documents: [
                {
                    id: 'inv-1',
                    name: 'Invoice one',
                    className: 'Factura y Desglose',
                    fields: [{ name: 'Numero de Factura', value: 'F-1' }],
                    tables: [
                        {
                            name: 'Tabla de Servicios facturados',
                            records: [
                                { records: cells({ Fecha: '01/11/2026', Servicio: '30305', 'CUP/CUM': 'C-2', Descripción: 'HEMOGRAMA', Cantidad: '1', Total: '20.00' }) },
                                { records: cells({ 'CUP/CUM': '400', Descripción: 'LABORATORIO', Precio: '20.00' }) },
                            ],
                        },
                    ],
                },
            ],
        } as unknown as BatchStateSource;
        const view = mapBatchStateToIntakeForDocuments(batchState, ['inv-1']);
        expect(view.services.map((service) => service.description)).toEqual(['HEMOGRAMA']);
        expect(view.services[0].serviceGroup?.label).toBe('400 LABORATORIO');
        expect(view.services[0].serviceGroup?.billedSubtotal).toBe(20);
    });
});
