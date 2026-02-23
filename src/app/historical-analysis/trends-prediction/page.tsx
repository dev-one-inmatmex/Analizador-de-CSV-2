import { predictSales } from '@/ai/flows/predict-sales-flow';
import { SalesPredictionInput, SalesPredictionOutput } from '@/ai/schemas/sales-prediction-schemas';
import TrendsPredictionClient from './trends-prediction-client';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { format, subMonths, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

export type ChartData = {
    name: string;
    value: number;
};

export type RecentSale = {
    sku: string;
    total: number;
    unidades: number;
    fecha_venta: string;
    title: string;
    company: string;
};

async function getPredictionData() {
    if (!supabaseAdmin) return { salesHistoryForChart: [], predictionResult: null, salesByCompanyChart: [], recentSales: [] };

    // 1. Fetch last 12 months of sales from 'ventas' (Unlimited batch fetch)
    const twelveMonthsAgo = subMonths(new Date(), 12);
    const salesData: any[] = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    try {
        while (hasMore) {
            const { data, error } = await supabaseAdmin
                .from('ventas')
                .select('sku, total, unidades, fecha_venta, title, company')
                .gte('fecha_venta', twelveMonthsAgo.toISOString())
                .range(from, from + step - 1);
            
            if (error) throw error;
            if (data && data.length > 0) {
                salesData.push(...data);
                if (data.length < step) hasMore = false;
                else from += step;
            } else {
                hasMore = false;
            }
        }
    } catch (e) {
        console.error('Error fetching sales history:', e);
        return { salesHistoryForChart: [], predictionResult: null, salesByCompanyChart: [], recentSales: [] };
    }
    
    if (salesData.length === 0) {
        return { salesHistoryForChart: [], predictionResult: null, salesByCompanyChart: [], recentSales: [] };
    }

    // 2. Fetch categories from 'publicaciones'
    const skus = [...new Set(salesData.map(s => s.sku).filter(Boolean))];
    const { data: pubsData } = await supabaseAdmin
        .from('publicaciones')
        .select('sku, nombre_madre')
        .in('sku', skus);

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
    
    // 5. Monthly aggregation
    const monthlySales: Record<string, number> = {};
    salesData.forEach(sale => {
        try {
            const saleDate = new Date(sale.fecha_venta);
            if (isNaN(saleDate.getTime())) return;
            const monthKey = format(startOfMonth(saleDate), 'yyyy-MM');
            monthlySales[monthKey] = (monthlySales[monthKey] || 0) + (sale.total || 0);
        } catch (e) {}
    });

    const salesHistoryForChart = Object.entries(monthlySales)
        .map(([dateKey, ventas]) => {
            const [year, month] = dateKey.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, 1);
            return {
                date: format(date, 'MMM yy', { locale: es }),
                ventas,
                sortKey: date.getTime(),
            };
        })
        .sort((a,b) => a.sortKey - b.sortKey)
        .map(({date, ventas}) => ({date, ventas}));

    // 6. Company breakdown
    const companyRevenue: Record<string, number> = {};
    salesData.forEach(sale => {
        const key = sale.company || 'Compañía Desconocida';
        companyRevenue[key] = (companyRevenue[key] || 0) + (sale.total || 0);
    });
    const salesByCompanyChart: ChartData[] = Object.entries(companyRevenue)
        .map(([name, value]) => ({ name, value }));
    
    // 7. Recent sales for table
    const recentSales: RecentSale[] = [...salesData]
      .sort((a, b) => new Date(b.fecha_venta).getTime() - new Date(a.fecha_venta).getTime());

    return { salesHistoryForChart, predictionResult, salesByCompanyChart, recentSales };
}


export default async function TrendsPredictionPage() {
    const { salesHistoryForChart, predictionResult, salesByCompanyChart, recentSales } = await getPredictionData();

    return (
        <TrendsPredictionClient
            salesHistory={salesHistoryForChart}
            predictionResult={predictionResult}
            salesByCompany={salesByCompanyChart || []}
            recentSales={recentSales || []}
        />
    );
}
