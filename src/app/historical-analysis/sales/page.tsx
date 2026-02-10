import { supabaseAdmin } from '@/lib/supabaseClient'
import SalesDashboardClient from './sales-client';
import { unstable_noStore as noStore } from 'next/cache';
import { startOfMonth, subMonths, format, isValid, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ventas, publicaciones, publicaciones_por_sku, skuxpublicaciones, catalogo_madre, categorias_madre, skus_unicos } from '@/types/database';

export type Sale = ventas;

export type ChartData = {
  name: string;
  value: number;
  cumulative?: number;
}

export type EnrichedPublicationCount = publicaciones_por_sku & { publication_title?: string };
export type EnrichedSkuMap = skuxpublicaciones & { company?: string; nombre_madre?: string };
export type EnrichedMotherCatalog = catalogo_madre & { publication_title?: string; price?: number; nombre_madre?: string };
export type PublicacionMin = Pick<publicaciones, 'sku' | 'title'>;
export type EnrichedCategoriaMadre = categorias_madre & { title?: string };

async function getSalesData() {
  noStore();
  if (!supabaseAdmin) return { sales: [], kpis: {}, charts: {} };
  
  const twelveMonthsAgo = subMonths(new Date(), 12);

  const { data: sales, error } = await supabaseAdmin
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
  const sortedProducts = Object.entries(productRevenue)
    .sort((a, b) => b[1] - a[1]);
    
  let cumulativeValue = 0;
  const topProductsChart: ChartData[] = sortedProducts
    .slice(0, 10)
    .map(([name, value]) => {
        cumulativeValue += value;
        return { 
            name, 
            value,
            cumulative: (cumulativeValue / totalRevenue) * 100 
        };
    });
    
  const companyRevenue: Record<string, number> = {};
  sales.forEach(sale => {
    const key = sale.company || 'Compañía Desconocida';
    companyRevenue[key] = (companyRevenue[key] || 0) + (sale.total || 0);
  });
  const salesByCompanyChart: ChartData[] = Object.entries(companyRevenue)
    .map(([name, value]) => ({ name, value }));
    
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
      ordersByCompanyToday[key] = (ordersByCompanyToday[key] || 0) + 1;
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

async function getInventoryData() {
    noStore();
    if (!supabaseAdmin) return { categoriasMadre: [], skusUnicos: [], skuPublicaciones: [], error: 'Supabase admin client no configurado' };

    try {
        const [
            { data: categorias, error: catError },
            { data: publicacionesData, error: pubError },
            { data: skusData, error: skuError },
            { data: skuPubData, error: skuPubError }
        ] = await Promise.all([
            supabaseAdmin.from('categorias_madre').select('*').order('sku', { ascending: true }),
            supabaseAdmin.from('publicaciones').select('sku, title'),
            supabaseAdmin.from('skus_unicos').select('*').order('sku', { ascending: true }),
            supabaseAdmin.from('skuxpublicaciones').select('*').limit(100).order('sku', { ascending: true })
        ]);

        if (catError) throw catError;
        if (pubError) throw pubError;
        if (skuError) throw skuError;
        if (skuPubError) throw skuPubError;

        const pubMap = new Map<string, string>();
        publicacionesData?.forEach((p: PublicacionMin) => {
          if (p.sku) pubMap.set(p.sku, p.title ?? '');
        });
        const enrichedCategorias: EnrichedCategoriaMadre[] = categorias?.map((cat: categorias_madre) => ({ ...cat, title: pubMap.get(cat.sku) })) ?? [];

        return { 
            categoriasMadre: enrichedCategorias, 
            skusUnicos: skusData || [], 
            skuPublicaciones: skuPubData || [],
            error: null 
        };

      } catch (err: any) {
        console.error(err);
        return { categoriasMadre: [], skusUnicos: [], skuPublicaciones: [], error: err.message };
      }
}

async function getProductsData() {
    noStore();
    if (!supabaseAdmin) return { publications: [], skuCounts: [], skuMap: [], motherCatalog: [], error: 'Supabase admin client no configurado' };

    try {
        const [pubsRes, countsRes, mapsRes, catalogRes] = await Promise.all([
            supabaseAdmin.from('publicaciones').select('*'),
            supabaseAdmin.from('publicaciones_por_sku').select('*').order('publicaciones', { ascending: false }),
            supabaseAdmin.from('skuxpublicaciones').select('*').limit(100),
            supabaseAdmin.from('catalogo_madre').select('*').order('nombre_madre', { ascending: true }),
        ]);

        if (pubsRes.error) throw pubsRes.error;
        if (countsRes.error) throw countsRes.error;
        if (mapsRes.error) throw mapsRes.error;
        if (catalogRes.error) throw catalogRes.error;

        const allPublications = (pubsRes.data as publicaciones[]) ?? [];
        const sortedPublications = allPublications.sort((a, b) => new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime());

        const pubsMap = new Map<string, publicaciones>();
        for (const pub of allPublications) {
          if (pub.sku && !pubsMap.has(pub.sku)) pubsMap.set(pub.sku, pub);
        }

        const rawSkuCounts = (countsRes.data as publicaciones_por_sku[]) ?? [];
        const enrichedSkuCounts = rawSkuCounts.map(item => ({ ...item, publication_title: pubsMap.get(item.sku ?? '')?.title ?? 'N/A' }));

        const rawSkuMap = (mapsRes.data as skuxpublicaciones[]) ?? [];
        const enrichedSkuMap = rawSkuMap.map(item => ({ ...item, company: pubsMap.get(item.sku ?? '')?.company ?? 'N/A', nombre_madre: pubsMap.get(item.sku ?? '')?.nombre_madre ?? 'N/A' }));

        const rawCatalog = (catalogRes.data as catalogo_madre[]) ?? [];
        const enrichedMotherCatalog = rawCatalog.map(item => {
            const pub = pubsMap.get(item.sku ?? '');
            return { ...item, nombre_madre: pub?.nombre_madre ?? item.nombre_madre, price: pub?.price, publication_title: pub?.title };
        });

        return {
            publications: sortedPublications,
            skuCounts: enrichedSkuCounts,
            skuMap: enrichedSkuMap,
            motherCatalog: enrichedMotherCatalog,
            error: null
        }
      } catch (err: any) {
        console.error('Error fetching products data', err);
        return { publications: [], skuCounts: [], skuMap: [], motherCatalog: [], error: err.message };
      }
}


export default async function SalesAnalysisDashboardPage() {
  const { sales, kpis, charts } = await getSalesData();
  const inventoryData = await getInventoryData();
  const productsData = await getProductsData();

  return <SalesDashboardClient 
    sales={sales as Sale[]} 
    kpis={kpis} 
    charts={charts}
    inventoryData={inventoryData}
    productsData={productsData}
  />;
}
