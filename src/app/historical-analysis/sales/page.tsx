import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import type { ventas } from '@/types/database';
import SalesAnalysisClientPage from './sales-client';
import { unstable_noStore as noStore } from 'next/cache';

async function getRecentSales(): Promise<ventas[]> {
  noStore();
  if (!isSupabaseConfigured || !supabase) {
    console.warn("Supabase is not configured.");
    return [];
  }

  const { data, error } = await supabase
    .from('ventas')
    .select('id, titulo_publicacion, comprador, tienda_oficial, total, fecha_venta')
    .order('fecha_venta', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching recent sales:', error);
    return [];
  }
  return data as ventas[];
}

type TopProduct = {
  name: string;
  product: string; // sku
  sales: number;
}

async function getTopProducts(): Promise<TopProduct[]> {
  noStore();
  if (!isSupabaseConfigured || !supabase) {
    console.warn("Supabase is not configured.");
    return [];
  }

  const { data, error } = await supabase
    .from('ventas')
    .select('sku, titulo_publicacion, unidades')
    .limit(1000); // get a decent chunk to aggregate

  if (error) {
    console.error('Error fetching sales for top products:', error);
    return [];
  }

  const productSales = data.reduce((acc, sale) => {
    if(!sale.sku) return acc;
    if (!acc[sale.sku]) {
      acc[sale.sku] = {
        name: sale.titulo_publicacion || sale.sku,
        product: sale.sku,
        sales: 0,
      };
    }
    acc[sale.sku].sales += sale.unidades || 0;
    return acc;
  }, {} as Record<string, TopProduct>);

  const sortedProducts = Object.values(productSales)
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 4);

  return sortedProducts;
}

export default async function SalesAnalysisPage() {
  const recentSales = await getRecentSales();
  const topProducts = await getTopProducts();

  return <SalesAnalysisClientPage initialRecentSales={recentSales} initialTopProducts={topProducts} />;
}
