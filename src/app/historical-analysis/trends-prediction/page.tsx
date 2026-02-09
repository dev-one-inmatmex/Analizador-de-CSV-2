import { predictSales } from '@/ai/flows/predict-sales-flow';
import { SalesPredictionInput, SalesPredictionOutput } from '@/ai/schemas/sales-prediction-schemas';
import TrendsPredictionClient from './trends-prediction-client';
import { unstable_noStore as noStore } from 'next/cache';
import { supabase } from '@/lib/supabaseClient';
import { format, subMonths, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

async function getPredictionData() {
    noStore();
    if (!supabase) return { salesHistoryForChart: [], predictionResult: null };

    // 1. Fetch last 12 months of sales from 'ventas'
    const twelveMonthsAgo = subMonths(new Date(), 12);
    const { data: salesData, error: salesError } = await supabase
        .from('ventas')
        .select('sku, total, unidades, fecha_venta, title, company')
        .gte('fecha_venta', twelveMonthsAgo.toISOString());
    
    if (salesError || !salesData || salesData.length === 0) {
        console.error('Error fetching sales or no sales data:', salesError);
        return { salesHistoryForChart: [], predictionResult: null };
    }

    // 2. Fetch categories from 'publicaciones'
    const skus = [...new Set(salesData.map(s => s.sku).filter(Boolean))];
    const { data: pubsData, error: pubsError } = await supabase
        .from('publicaciones')
        .select('sku, nombre_madre')
        .in('sku', skus);

    if (pubsError) {
        console.error('Error fetching publications for categories:', pubsError);
    }
    const categoryMap = new Map(pubsData?.map(p => [p.sku, p.nombre_madre]));
    
    // 3. Prepare data for AI Flow
    const salesHistoryForAI: SalesPredictionInput['salesHistory'] = salesData.map(sale => ({
        product: sale.title || 'Producto Desconocido',
        category: categoryMap.get(sale.sku) || 'Sin Categoría',
        sku: sale.sku || 'N/A',
        date: sale.fecha_venta,
        amount: sale.total || 0,
        units: sale.unidades || 0,
    }));

    // 4. Generate prediction
    let predictionResult: SalesPredictionOutput | null = null;
    try {
        predictionResult = await predictSales({
            salesHistory: salesHistoryForAI,
            predictionMonths: 6,
        });
    } catch (aiError) {
        console.error("AI prediction failed:", aiError);
    }
    
    // 5. Prepare historical data for chart (aggregate by month)
    const monthlySales: Record<string, number> = {};
    salesData.forEach(sale => {
        try {
            const monthKey = format(startOfMonth(new Date(sale.fecha_venta)), 'MMM yy', { locale: es });
            monthlySales[monthKey] = (monthlySales[monthKey] || 0) + (sale.total || 0);
        } catch (e) {
            // Ignore invalid date formats
        }
    });

    const salesHistoryForChart = Object.entries(monthlySales)
        .map(([date, ventas]) => ({ date, ventas }))
        .sort((a, b) => {
             const [monthA, yearA] = a.date.split(' ');
             const [monthB, yearB] = b.date.split(' ');
             // A proper date conversion is needed for robust sorting
             const dateA = new Date(`01 ${monthA} ${yearA}`);
             const dateB = new Date(`01 ${monthB} ${yearB}`);
             return dateA.getTime() - dateB.getTime();
        });

    return { salesHistoryForChart, predictionResult };
}


export default async function TrendsPredictionPage() {
    const { salesHistoryForChart, predictionResult } = await getPredictionData();

    return (
        <TrendsPredictionClient
            salesHistory={salesHistoryForChart}
            predictionResult={predictionResult}
        />
    );
}

    