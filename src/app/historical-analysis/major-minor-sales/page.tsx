import { supabaseAdmin } from '@/lib/supabaseClient'
import MajorMinorSalesClientPage from './major-minor-sales-client';
import type { inventario_master } from '@/types/database';

export type Transaction = {
  id: string;
  customer: string;
  type: 'Mayorista' | 'Minorista';
  amount: number;
  date: string;
};

async function getAllTransactions(): Promise<Transaction[]> {
  if (!supabaseAdmin) {
    console.warn("Supabase admin client is not configured.");
    return [];
  }

  const allData: any[] = [];
  let from = 0;
  const step = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabaseAdmin
      .from('ml_sales')
      .select('id, num_venta, comprador, total, fecha_venta')
      .order('fecha_venta', { ascending: false })
      .range(from, from + step - 1);

    if (error) {
      console.error('Error fetching transactions batch:', error);
      break;
    }

    if (data && data.length > 0) {
      allData.push(...data);
      if (data.length < step) hasMore = false;
      else from += step;
    } else {
      hasMore = false;
    }
  }

  return allData.map((sale) => ({
    id: `#${sale.num_venta || sale.id}`,
    customer: sale.comprador || 'N/A',
    type: sale.comprador && sale.comprador !== 'Público General' ? 'Mayorista' : 'Minorista',
    amount: sale.total || 0,
    date: sale.fecha_venta,
  }));
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


export default async function MajorMinorSalesPage() {
  const [transactions, inventory] = await Promise.all([
    getAllTransactions(),
    getInventoryMaster()
  ]);
  
  return (
    <MajorMinorSalesClientPage 
      initialRecentTransactions={transactions} 
      inventoryMaster={inventory} 
    />
  );
}
