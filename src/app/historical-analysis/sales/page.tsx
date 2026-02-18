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
    .gte('fecha_venta', twelveMonthsAgo.toISOString());
    
  if (error || !data) {
    console.error('Error fetching sales data:', error);
    return { sales: [], allCompanies: [] };
  }

  const sales: Sale[] = data;
  const allCompanies = ['Todos', ...Array.from(new Set(sales.map(s => s.tienda).filter(Boolean) as string[]))];
  
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