import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { MedicalAccount, MetricData } from '../models/medical-record.model';

@Injectable({
    providedIn: 'root'
})
export class MedicalRecordService {

    constructor() { }

    getDashboardMetrics(): Observable<MetricData[]> {
        return of([
            { label: 'Cuentas en Proceso', value: '1,245', trend: '+12%', trendUp: true, icon: 'receipt_long' },
            { label: 'Riesgo de Glosa Estimado', value: '$45.2M', trend: '-5%', trendUp: false, icon: 'warning' },
            { label: 'Tasa de Recuperación', value: '87.4%', trend: '+2.1%', trendUp: true, icon: 'trending_up' },
            { label: 'Tiempo Promedio Ciclo', value: '14 días', trend: '-2 días', trendUp: true, icon: 'schedule' }
        ]);
    }

    getRecentAccounts(): Observable<MedicalAccount[]> {
        return of([
            {
                id: 'ACC-2025-8901',
                status: 'Analysis',
                patient: { id: 'P-10293', name: 'Carlos Mendoza', dob: '1980-05-14', gender: 'M', insuranceId: 'SURA-992' },
                admissionDate: '2025-04-10',
                dischargeDate: '2025-04-15',
                totalBilled: 15400000,
                totalExpected: 15400000,
                insurer: 'SURA',
                urgency: 'High'
            },
            {
                id: 'ACC-2025-8902',
                status: 'Appeals',
                patient: { id: 'P-10294', name: 'Ana Sofía Rojas', dob: '1992-11-20', gender: 'F', insuranceId: 'ALLI-441' },
                admissionDate: '2025-03-20',
                dischargeDate: '2025-03-25',
                totalBilled: 8200000,
                totalExpected: 8200000,
                totalGlosado: 1200000,
                insurer: 'Allianz',
                urgency: 'Medium'
            },
            {
                id: 'ACC-2025-8903',
                status: 'Intake',
                patient: { id: 'P-10295', name: 'Luis Fernando Gómez', dob: '1975-02-10', gender: 'M', insuranceId: 'COMP-112' },
                admissionDate: '2025-04-20',
                dischargeDate: '2025-04-22',
                totalBilled: 3500000,
                totalExpected: 3500000,
                insurer: 'Compensar',
                urgency: 'Low'
            }
        ]);
    }
}
