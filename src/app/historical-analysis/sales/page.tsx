import { supabaseAdmin } from '@/lib/supabaseClient'
import SalesDashboardClient from './sales-client';
import { subMonths } from 'date-fns';
import type { ml_sales } from '@/types/database';

export type Sale = ml_sales;

async function getSalesData() {
  if (!supabaseAdmin) return { sales: [], allCompanies: [] };
  
  const twelveMonthsAgo = subMonths(new Date(), 12);
  const allSales: Sale[] = [];
  let from = 0;
  const step = 1000;
  let hasMore = true;

  // Carga exhaustiva para superar el límite de 1000 de Supabase
  while (hasMore && allSales.length < 50000) { // Límite de seguridad de 50k
    const { data, error } = await supabaseAdmin
      .from('ml_sales')
      .select('*')
      .gte('fecha_venta', twelveMonthsAgo.toISOString())
      .order('fecha_venta', { ascending: false })
      .range(from, from + step - 1);

    if (error) {
      console.error('Error fetching sales batch:', error);
      break;
    }

    if (data && data.length > 0) {
      allSales.push(...data);
      if (data.length < step) {
        hasMore = false;
      } else {
        from += step;
      }
    } else {
      hasMore = false;
    }
  }
  
  const allCompanies = Array.from(new Set(allSales.map(s => s.tienda).filter(Boolean) as string[])).sort();
  
  return {
    sales: allSales,
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
