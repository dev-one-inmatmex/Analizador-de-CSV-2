
import { supabase } from '@/lib/supabaseClient';
import { unstable_noStore as noStore } from 'next/cache';
import { predictSales } from '@/ai/flows/predict-sales-flow';
import { SalesPredictionOutput } from '@/ai/schemas/sales-prediction-schemas';
import TrendsPredictionClient from './trends-prediction-client';
import { addMonths, format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

type MonthlySales = {
  date: string;
  ventas: number;
};

type HistoricalSaleRecord = {
    product: string;
    category: string;
    sku: string;
    date: string;
    amount: number;
    units: number;
};

// Fetches raw sales data to be sent to the AI
async function getRawSalesForAI(): Promise<HistoricalSaleRecord[]> {
    if (!supabase) return [];

    const twelveMonthsAgo = subMonths(new Date(), 12);

    const { data, error } = await supabase
        .from('ventas')
        .select('titulo_publicacion, sku, total, unidades, fecha_venta')
        .gte('fecha_venta', twelveMonthsAgo.toISOString())
        .order('fecha_venta', { ascending: false });

    if (error) {
        console.error('Error fetching raw sales for AI:', error);
        return [];
    }

    // Join with publications to get category
    const skus = data.map(sale => sale.sku).filter(Boolean) as string[];
    const { data: pubs, error: pubError } = await supabase
        .from('publicaciones')
        .select('sku, category')
        .in('sku', skus);
    
    if(pubError) {
      console.error('Error fetching publication categories for AI:', pubError);
      // Continue without categories if it fails
    }

    const categoryMap = new Map(pubs?.map(p => [p.sku, p.category]));

    return data.map((sale) => ({
        product: sale.titulo_publicacion || 'Producto Desconocido',
        category: (sale.sku ? categoryMap.get(sale.sku) : null) || 'Sin Categoría',
        sku: sale.sku || 'N/A',
        date: format(new Date(sale.fecha_venta), 'yyyy-MM-dd'),
        amount: sale.total || 0,
        units: sale.unidades || 0,
    }));
}


// Aggregates sales data by month for chart display
function aggregateSalesByMonth(sales: { fecha_venta: string, total: number | null }[]): MonthlySales[] {
    const monthlyTotals: { [key: string]: number } = {};

    sales.forEach(sale => {
        if (sale.fecha_venta && sale.total) {
            const monthKey = format(new Date(sale.fecha_venta), 'MMM yy', { locale: es });
            monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + sale.total;
        }
    });

    const today = new Date();
    const result: MonthlySales[] = [];
    for (let i = 11; i >= 0; i--) {
        const date = subMonths(today, i);
        const monthKey = format(date, 'MMM yy', { locale: es });
        result.push({
            date: monthKey,
            ventas: monthlyTotals[monthKey] || 0,
        });
    }

    return result;
}

export default async function TrendsPredictionPage() {
    noStore(); // Ensures fresh data on every request

    let salesHistoryForChart: MonthlySales[] = [];
    let predictionResult: SalesPredictionOutput | null = null;
    
    if (supabase) {
        const { data: sales, error } = await supabase
            .from('ventas')
            .select('fecha_venta, total')
            .gte('fecha_venta', subMonths(new Date(), 12).toISOString());

        if (error) {
            console.error('Error fetching historical sales:', error.message);
        } else if (sales) {
            salesHistoryForChart = aggregateSalesByMonth(sales as any);

            if (sales.length > 0) {
              try {
                  const rawSales = await getRawSalesForAI();
                  if (rawSales.length > 0) {
                      predictionResult = await predictSales({ salesHistory: rawSales, predictionMonths: 6 });
                  }
              } catch (aiError: any) {
                  console.error('AI prediction failed:', aiError.message);
                  predictionResult = null; // Ensure client gets a null if AI fails
              }
            }
        }
    } else {
        console.warn('Supabase client not available for sales prediction.');
    }


    return (
        <TrendsPredictionClient
            salesHistory={salesHistoryForChart}
            predictionResult={predictionResult}
        />
    );
}
