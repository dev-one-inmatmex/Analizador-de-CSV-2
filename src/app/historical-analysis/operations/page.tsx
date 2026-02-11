import { supabaseAdmin } from '@/lib/supabaseClient';
import OperationsClient from './operations-client';
import { unstable_noStore as noStore } from 'next/cache';
import { format, startOfMonth, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import type { gastos_diarios } from '@/types/database';

export type GastoDiario = gastos_diarios;

export type OperationsData = {
    kpis: {
        totalCost: number;
        companyCount: number;
        avgExpense: number;
        totalRecords: number;
    };
    charts: {
        costByMonth: { month: string; cost: number; sortKey: number }[];
        spendingByCompany: { company: string; spending: number }[];
    };
    expenses: GastoDiario[];
    allCompanies: string[];
};

async function getOperationsData(): Promise<OperationsData> {
    noStore();
    const allCompanies = ['Todos', 'MTM', 'TAL', 'DK']; // Static list for expenses

    const emptyData: OperationsData = { 
        kpis: { totalCost: 0, companyCount: 0, avgExpense: 0, totalRecords: 0 }, 
        charts: { costByMonth: [], spendingByCompany: [] },
        expenses: [],
        allCompanies: allCompanies
    };
    
    if (!supabaseAdmin) {
        console.error('Supabase admin client is not available. Ensure SUPABASE_SERVICE_ROLE_KEY is set.');
        return emptyData;
    }

    const { data: expensesData, error: expensesError } = await supabaseAdmin
        .from('gastos_diarios')
        .select('*')
        .order('fecha', { ascending: false });

    if (expensesError) {
        console.error('Error fetching daily expenses:', expensesError);
        return { ...emptyData, allCompanies };
    }

    const expenses = (expensesData as GastoDiario[]) || [];
    
    // --- KPIs ---
    const totalCost = expenses.reduce((acc, item) => acc + (item.monto || 0), 0);
    const totalRecords = expenses.length;
    const companyCount = new Set(expenses.map(e => e.empresa).filter(Boolean)).size;
    const avgExpense = totalRecords > 0 ? totalCost / totalRecords : 0;

    // --- Charts ---
    const costByMonthMap: { [key: string]: { cost: number; date: Date } } = {};
    expenses.forEach(item => {
        if (item.fecha && item.monto) {
            try {
                const itemDate = parseISO(item.fecha);
                if (!isValid(itemDate)) return;
                const monthKey = format(startOfMonth(itemDate), 'yyyy-MM');
                if (!costByMonthMap[monthKey]) {
                    costByMonthMap[monthKey] = { cost: 0, date: startOfMonth(itemDate) };
                }
                costByMonthMap[monthKey].cost += item.monto;
            } catch (e) {
                // ignore invalid dates
            }
        }
    });

    const costByMonth = Object.entries(costByMonthMap)
        .map(([_, value]) => ({
            month: format(value.date, 'MMM yy', { locale: es }),
            cost: value.cost,
            sortKey: value.date.getTime(),
        }))
        .sort((a, b) => a.sortKey - b.sortKey);

    const spendingByCompanyMap: { [key: string]: number } = {};
    expenses.forEach(item => {
        if (item.empresa && item.monto) {
            spendingByCompanyMap[item.empresa] = (spendingByCompanyMap[item.empresa] || 0) + item.monto;
        }
    });
    
    const spendingByCompany = Object.entries(spendingByCompanyMap)
        .map(([company, spending]) => ({ company, spending }))
        .sort((a, b) => b.spending - a.spending);

    return {
        kpis: { totalCost, companyCount, avgExpense, totalRecords },
        charts: { costByMonth, spendingByCompany },
        expenses,
        allCompanies,
    };
}


export default async function OperationsPage() {
  const operationsData = await getOperationsData();
  return <OperationsClient initialData={operationsData} />;
}
