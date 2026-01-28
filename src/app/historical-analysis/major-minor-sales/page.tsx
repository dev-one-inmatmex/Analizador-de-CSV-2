/* import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import MajorMinorSalesClientPage from './major-minor-sales-client';
import { unstable_noStore as noStore } from 'next/cache';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export type Transaction = {
  id: string;
  customer: string;
  type: 'Mayorista' | 'Minorista';
  amount: number;
  time: string;
};

async function getRecentTransactions(): Promise<Transaction[]> {
  noStore();
  if (!isSupabaseConfigured || !supabase) {
    console.warn("Supabase is not configured.");
    return [];
  }

  const { data, error } = await supabase
    .from('ventas')
    .select('id, numero_venta, comprador, total, fecha_venta')
    .order('fecha_venta', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching recent transactions for major/minor sales:', error);
    return [];
  }

  // Transform Supabase data to match the component's expected structure
  const transactions: Transaction[] = data.map((sale) => ({
    id: `#${sale.numero_venta || sale.id}`,
    customer: sale.comprador || 'N/A',
    // Simple logic to determine type based on mock data pattern
    type: sale.comprador !== 'Público General' ? 'Mayorista' : 'Minorista',
    amount: sale.total || 0,
    time: formatDistanceToNow(new Date(sale.fecha_venta), { addSuffix: true, locale: es }),
  }));

  return transactions;
}


export default async function MajorMinorSalesPage() {
  const recentTransactions = await getRecentTransactions();

  return <MajorMinorSalesClientPage initialRecentTransactions={recentTransactions} />;
}
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import { unstable_noStore as noStore } from 'next/cache'

export interface ventas {
  id: number;
  numero_venta: number;
  fecha_venta: string;
  total: number;
  comprador: string | null;
  estado: string | null;
  sku: string | null;
  titulo_publicacion: string | null;
  unidades: number;
  created_at: string;
}

export async function getVentas(): Promise<ventas[]> {
  noStore()

  const { data, error } = await supabase
    .from('ventas')
    .select(`
      id,
      numero_venta,
      fecha_venta,
      total,
      comprador,
      estado,
      sku,
      titulo_publicacion,
      unidades,
      created_at
    `)
    .order('fecha_venta', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Error cargando ventas:', error)
    return []
  }

  return data ?? []
}