import { supabaseAdmin } from '@/lib/supabaseClient'
import SalesDashboardClient from './sales-client';
import { subMonths } from 'date-fns';
import type { ml_sales } from '@/types/database';

export type Sale = ml_sales;

async function getSalesData() {
  if (!supabaseAdmin) return { sales: [], allCompanies: [] };
  
  const twelveMonthsAgo = subMonths(new Date(), 12);

  const { data, error } = await supabaseAdmin
    .from('ml_sales')
    .select('*')
    .gte('fecha_venta', twelveMonthsAgo.toISOString())
    .order('fecha_venta', { ascending: false });
    
  if (error || !data) {
    console.error('Error fetching sales data from ml_sales:', error);
    return { sales: [], allCompanies: [] };
  }

  const sales: Sale[] = data;
  
  // Extraemos las tiendas únicas directamente de los registros
  const allCompanies = Array.from(new Set(sales.map(s => s.tienda).filter(Boolean) as string[])).sort();
  
  return {
    sales,
    allCompanies
  };
}

export default async function SalesAnalysisDashboardPage() {
  const { sales, allCompanies } = await getSalesData();

  return <SalesDashboardClient 
    initialSales={sales} 
    allCompanies={allCompanies}
  />;
}
