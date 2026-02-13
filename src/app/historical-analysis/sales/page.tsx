import { supabaseAdmin } from '@/lib/supabaseClient'
import SalesDashboardClient from './sales-client';
import { unstable_noStore as noStore } from 'next/cache';
import { subMonths } from 'date-fns';
import type { ventas, publicaciones, publicaciones_por_sku, skuxpublicaciones, catalogo_madre, categorias_madre, skus_unicos } from '@/types/database';

export type Sale = ventas;

export type ChartData = {
  name: string;
  value: number;
  cumulative?: number;
}

export type EnrichedCategoriaMadre = categorias_madre & { title?: string };

export type KpiType = {
    totalRevenue?: number;
    totalSales?: number;
    avgSale?: number;
    topProductName?: string;
    topProductRevenue?: number;
}

export type ChartDataType = {
    topProducts?: ChartData[];
    salesByCompany?: ChartData[];
    salesTrend?: ChartData[];
    salesByDay?: ChartData[];
    ordersByCompanyToday?: ChartData[];
}

type GetSalesDataReturn = {
  sales: Sale[];
  allCompanies: string[];
}


async function getSalesData(): Promise<GetSalesDataReturn> {
  noStore();
  if (!supabaseAdmin) return { sales: [], allCompanies: [] };
  
  const twelveMonthsAgo = subMonths(new Date(), 12);

  const { data, error } = await supabaseAdmin
    .from('ventas')
    .select('*')
    .gte('fecha_venta', twelveMonthsAgo.toISOString());
    
  if (error || !data) {
    console.error('Error fetching sales data:', error);
    return { sales: [], allCompanies: [] };
  }

  const sales: Sale[] = data;
  const allCompanies = ['Todos', ...Array.from(new Set(sales.map(s => s.company).filter(Boolean) as string[]))];
  
  return {
    sales,
    allCompanies
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
        publicacionesData?.forEach((p: Pick<publicaciones, 'sku' | 'title'>) => {
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


export default async function SalesAnalysisDashboardPage() {
  const { sales, allCompanies } = await getSalesData();
  const inventoryData = await getInventoryData();

  return <SalesDashboardClient 
    initialSales={sales} 
    allCompanies={allCompanies}
    inventoryData={inventoryData}
  />;
}
