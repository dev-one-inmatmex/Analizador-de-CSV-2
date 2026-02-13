import { supabaseAdmin } from '@/lib/supabaseClient'
import MajorMinorSalesClientPage from './major-minor-sales-client';

export type Transaction = {
  id: string;
  customer: string;
  type: 'Mayorista' | 'Minorista';
  amount: number;
  date: string;
};

async function getRecentTransactions(): Promise<Transaction[]> {
  if (!supabaseAdmin) {
    console.warn("Supabase admin client is not configured.");
    return [];
  }

  const { data, error } = await supabaseAdmin
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
    date: sale.fecha_venta,
  }));

  return transactions;
}


export default async function MajorMinorSalesPage() {
  const recentTransactions = await getRecentTransactions();

  return <MajorMinorSalesClientPage initialRecentTransactions={recentTransactions} />;
}
