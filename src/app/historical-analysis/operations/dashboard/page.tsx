import { supabaseAdmin } from '@/lib/supabaseClient';
import type { gastos_diarios } from '@/types/database';
import OperationsDashboardClient from './dashboard-client';

async function getExpenses(): Promise<{ expenses: gastos_diarios[], error: string | null }> {
    if (!supabaseAdmin) {
        return { expenses: [], error: "Cliente de Supabase no configurado." };
    }
    
    const { data, error } = await supabaseAdmin
        .from('gastos_diarios')
        .select('*')
        .order('fecha', { ascending: false });

    if (error) {
        console.error("Error fetching expenses:", error);
        return { expenses: [], error: `Error de base de datos: ${error.message}` };
    }
    return { expenses: (data as gastos_diarios[]) || [], error: null };
}

async function getUniqueFieldValues(field: 'empresa' | 'capturista'): Promise<string[]> {
    if (!supabaseAdmin) return [];
    
    const { data, error } = await supabaseAdmin
        .from('gastos_diarios')
        .select(field);

    if (error) {
        console.error(`Error fetching unique ${field} values:`, error);
        return [];
    }

    return [...new Set(data.map(item => item[field]).filter(Boolean))];
}

export default async function OperationsDashboardPage() {
    const { expenses, error } = await getExpenses();
    const companies = await getUniqueFieldValues('empresa');
    const capturistas = await getUniqueFieldValues('capturista');
    
    return (
        <OperationsDashboardClient 
            initialExpenses={expenses} 
            allCompanies={companies}
            allCapturistas={capturistas}
            dbError={error}
        />
    )
}
