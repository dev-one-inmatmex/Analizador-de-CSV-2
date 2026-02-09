import { supabase } from '@/lib/supabaseClient'
import SalesDashboardClient from './sales-client';
import { unstable_noStore as noStore } from 'next/cache';
import { startOfMonth, subMonths, format, isValid, startOfDay, endOfDay } from 'date-fns';
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
    
  if (error || !sales) {
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
  // Gráfica 80/20 - Productos más vendidos
  const topProductsChart: ChartData[] = Object.entries(productRevenue)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));
    
  // Ventas por empresa
  const companyRevenue: Record<string, number> = {};
  sales.forEach(sale => {
    const key = sale.company || 'Compañía Desconocida';
    companyRevenue[key] = (companyRevenue[key] || 0) + (sale.total || 0);
  });
  const salesByCompanyChart: ChartData[] = Object.entries(companyRevenue)
    .map(([name, value]) => ({ name, value }));
    
  // Sales Trend by Month
  const salesByMonth: Record<string, { total: number, date: Date }> = {};
  sales.forEach(sale => {
      try {
        const saleDate = new Date(sale.fecha_venta);
        if(!isValid(saleDate)) return;
        const monthKey = format(saleDate, 'yyyy-MM');
        
        if (!salesByMonth[monthKey]) {
          salesByMonth[monthKey] = { total: 0, date: startOfMonth(saleDate) };
        }
        salesByMonth[monthKey].total += sale.total || 0;
      } catch (e) {
          // ignore invalid dates
      }
  });
  
  const salesTrendChart: ChartData[] = Object.values(salesByMonth)
    .sort((a,b) => a.date.getTime() - b.date.getTime())
    .map(month => ({
      name: (format(month.date, 'MMM yy', { locale: es })).replace(/^\w/, c => c.toUpperCase()),
      value: month.total
    }));

  // Ventas por día
  const salesByDay: Record<string, { total: number, date: Date }> = {};
  const ninetyDaysAgo = subMonths(new Date(), 3);
  sales.filter(s => new Date(s.fecha_venta) >= ninetyDaysAgo).forEach(sale => {
    try {
      const saleDate = new Date(sale.fecha_venta);
      if(!isValid(saleDate)) return;
      const dayKey = format(saleDate, 'yyyy-MM-dd');
      
      if (!salesByDay[dayKey]) {
        salesByDay[dayKey] = { total: 0, date: startOfDay(saleDate) };
      }
      salesByDay[dayKey].total += sale.total || 0;
    } catch (e) {
      // ignore invalid dates
    }
  });
  const salesByDayChart: ChartData[] = Object.values(salesByDay)
    .sort((a,b) => a.date.getTime() - b.date.getTime())
    .map(day => ({
      name: format(day.date, 'dd MMM', { locale: es }),
      value: day.total
    }));

  // Gráfica tipo “queso” de participación por empresa según pedidos del día
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const todaySales = sales.filter(sale => {
    try {
      const saleDate = new Date(sale.fecha_venta);
      return isValid(saleDate) && saleDate >= todayStart && saleDate <= todayEnd;
    } catch(e) {
      return false;
    }
  });

  const ordersByCompanyToday: Record<string, number> = {};
  todaySales.forEach(sale => {
      const key = sale.company || 'Compañía Desconocida';
      ordersByCompanyToday[key] = (ordersByCompanyToday[key] || 0) + 1; // Counting orders (transactions)
  });
  const ordersByCompanyTodayChart: ChartData[] = Object.entries(ordersByCompanyToday)
    .map(([name, value]) => ({ name, value }));


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
      salesByDay: salesByDayChart,
      ordersByCompanyToday: ordersByCompanyTodayChart
    }
  };
}

export default async function SalesAnalysisDashboardPage() {
  const { sales, kpis, charts } = await getSalesData();
  return <SalesDashboardClient sales={sales as Sale[]} kpis={kpis} charts={charts} />;
}
