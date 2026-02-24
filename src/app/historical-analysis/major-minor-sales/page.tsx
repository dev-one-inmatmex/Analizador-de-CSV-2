import { supabaseAdmin } from '@/lib/supabaseClient'
import ConsumptionClient from './consumption-client';
import { subMonths } from 'date-fns';
import type { ml_sales, inventario_master } from '@/types/database';

export type Sale = ml_sales & { categoria?: string };

// Exporting Transaction type to fix the import error in major-minor-sales-client.tsx
// even if this specific type is not used in the new Consumo logic.
export type Transaction = {
  id: string;
  customer: string;
  amount: number;
  type: 'Mayorista' | 'Minorista';
  date: string;
};

async function getSalesData() {
  if (!supabaseAdmin) return { sales: [], allCompanies: [] };
  
  // Traemos los últimos 12 meses para tener data suficiente
  const twelveMonthsAgo = subMonths(new Date(), 12);
  const allSales: ml_sales[] = [];
  let from = 0;
  const step = 1000;
  let hasMore = true;

  // Fetch paginado de Supabase para superar el límite de 1000 registros
  while (hasMore && allSales.length < 50000) { 
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
      allSales.push(...(data as ml_sales[]));
      if (data.length < step) hasMore = false;
      else from += step;
    } else {
      hasMore = false;
    }
  }

  // Enriquecer con categorías desde publi_tienda
  const skus = Array.from(new Set(allSales.map(s => s.sku).filter(Boolean) as string[]));
  let categoryMap = new Map<string, string>();
  
  if (skus.length > 0) {
    const { data: pubsData } = await supabaseAdmin
      .from('publi_tienda')
      .select('sku, cat_mdr')
      .in('sku', skus);
    
    pubsData?.forEach(p => {
      if (p.sku && p.cat_mdr) categoryMap.set(p.sku, p.cat_mdr);
    });
  }

  const enrichedSales: Sale[] = allSales.map(s => ({
    ...s,
    categoria: categoryMap.get(s.sku || '') || 'Sin Categoría'
  }));
  
  const allCompanies = Array.from(new Set(allSales.map(s => s.tienda).filter(Boolean) as string[])).sort();
  
  return {
    sales: enrichedSales,
    allCompanies
  };
}

async function getInventoryMaster(): Promise<inventario_master[]> {
  if (!supabaseAdmin) return [];
  const all: inventario_master[] = [];
  let from = 0;
  const step = 1000;
  let hasMore = true;

  try {
    while (hasMore) {
      const { data, error } = await supabaseAdmin
        .from('inventario_master')
        .select('*')
        .order('sku', { ascending: true })
        .range(from, from + step - 1);
      
      if (error) throw error;
      if (data && data.length > 0) {
        all.push(...(data as inventario_master[]));
        if (data.length < step) hasMore = false;
        else from += step;
      } else {
        hasMore = false;
      }
    }
  } catch (e) {
    console.error('Error fetching inventory master:', e);
  }
  return all;
}

export default async function ConsumoVentasPage() {
  const [{ sales, allCompanies }, inventory] = await Promise.all([
    getSalesData(),
    getInventoryMaster()
  ]);

  return (
    <ConsumptionClient 
      initialSales={sales} 
      allCompanies={allCompanies}
      inventoryMaster={inventory}
    />
  );
}
