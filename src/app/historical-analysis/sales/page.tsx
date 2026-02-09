import { supabase } from '@/lib/supabaseClient'
import SalesDashboardClient from './sales-client';
import { unstable_noStore as noStore } from 'next/cache';
import { startOfMonth, subMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ventas } from '@/types/database';

export type Sale = ventas;

export type ChartData = {
  name: string;
  value: number;
}

async function getSalesData() {
  noStore();
  if (!supabase) return { sales: [], kpis: {}, charts: {} };
  
  const twelveMonthsAgo = subMonths(new Date(), 12);

  const { data: sales, error } = await supabase
    .from('ventas')
    .select('*')
    .gte('fecha_venta', twelveMonthsAgo.toISOString());
    
  if (error) {
    console.error('Error fetching sales data:', error);
    return { sales: [], kpis: {}, charts: {} };
  }

  // --- Process KPIs ---
  const totalRevenue = sales.reduce((acc, sale) => acc + (sale.total || 0), 0);
  const totalSales = sales.length;
  const avgSale = totalSales > 0 ? totalRevenue / totalSales : 0;
  
  const productRevenue: Record<string, number> = {};
  sales.forEach(sale => {
    const key = sale.title || 'Producto Desconocido';
    productRevenue[key] = (productRevenue[key] || 0) + (sale.total || 0);
  });
  const topProduct = Object.entries(productRevenue).sort((a, b) => b[1] - a[1])[0] || ['N/A', 0];

  // --- Process Chart Data ---
  // Top 10 Products by Revenue (Pareto)
  const topProductsChart: ChartData[] = Object.entries(productRevenue)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));
    
  // Sales by Company
  const companyRevenue: Record<string, number> = {};
  sales.forEach(sale => {
    const key = sale.company || 'Compañía Desconocida';
    companyRevenue[key] = (companyRevenue[key] || 0) + (sale.total || 0);
  });
  const salesByCompanyChart: ChartData[] = Object.entries(companyRevenue)
    .map(([name, value]) => ({ name, value }));
    
  // Sales Trend by Month
  const salesByMonth: Record<string, number> = {};
  sales.forEach(sale => {
      try {
        const month = format(new Date(sale.fecha_venta), 'MMM yy', { locale: es });
        salesByMonth[month] = (salesByMonth[month] || 0) + (sale.total || 0);
      } catch (e) {
          // ignore invalid dates
      }
  });

  const sortedMonths = Object.keys(salesByMonth).sort((a, b) => {
    const [monthA, yearA] = a.split(' ');
    const [monthB, yearB] = b.split(' ');
    const dateA = new Date(`${monthA} 1, ${yearA}`);
    const dateB = new Date(`${monthB} 1, ${yearB}`);
    return dateA.getTime() - dateB.getTime();
  });
  
  const salesTrendChart: ChartData[] = sortedMonths.map(month => ({
    name: month.charAt(0).toUpperCase() + month.slice(1),
    value: salesByMonth[month]
  }));


  return {
    sales,
    kpis: {
      totalRevenue,
      totalSales,
      avgSale,
      topProductName: topProduct[0],
      topProductRevenue: topProduct[1],
    },
    charts: {
      topProducts: topProductsChart,
      salesByCompany: salesByCompanyChart,
      salesTrend: salesTrendChart,
    }
  };
}

export default async function SalesAnalysisDashboardPage() {
  const { sales, kpis, charts } = await getSalesData();
  return <SalesDashboardClient sales={sales as Sale[]} kpis={kpis} charts={charts} />;
}
