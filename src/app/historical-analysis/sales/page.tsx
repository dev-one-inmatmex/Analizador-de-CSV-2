import { supabase } from '@/lib/supabaseClient';
import { ventas } from '@/types/database';
import SalesAnalysisClientPage from './sales-client';
import { unstable_noStore as noStore } from 'next/cache';

async function getVentas(): Promise<ventas[]> {
  noStore();
  if (!supabase) {
    console.warn("Supabase is not configured.");
    return [];
  }
  const { data, error } = await supabase
    .from('ventas')
    .select('*')
    .order('fecha_venta', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error cargando ventas:', error);
    return [];
  }

  return data as ventas[];
}

type TopProduct = {
  name: string;
  product: string; // sku
  sales: number;
};

async function getTopProducts(ventasData: ventas[]): Promise<TopProduct[]> {
  if (!ventasData || ventasData.length === 0) {
    return [];
  }

  const productSales = new Map<string, { name: string; sales: number }>();

  ventasData.forEach(sale => {
    const sku = sale.sku || 'N/A';
    if (sku === 'N/A') return;

    const existing = productSales.get(sku);
    const currentName = sale.titulo_publicacion || sku;

    if (existing) {
      existing.sales += sale.unidades;
    } else {
      productSales.set(sku, { name: currentName, sales: sale.unidades });
    }
  });

  const sortedProducts = Array.from(productSales.entries())
    .map(([sku, data]) => ({
      product: sku,
      name: data.name,
      sales: data.sales,
    }))
    .sort((a, b) => b.sales - a.sales);

  return sortedProducts.slice(0, 5);
}


export default async function SalesAnalysisPage() {
  const ventas = await getVentas();
  const topProducts = await getTopProducts(ventas);

  return <SalesAnalysisClientPage initialRecentSales={ventas.slice(0,5)} initialTopProducts={topProducts} />;
}
