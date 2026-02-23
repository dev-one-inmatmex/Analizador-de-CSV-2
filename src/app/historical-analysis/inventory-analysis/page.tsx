import { supabaseAdmin } from '@/lib/supabaseClient';
import InventoryAnalysisClient from './inventory-client';
import type { sku_m, sku_costos, sku_alterno } from '@/types/database';

export type InventoryData = {
    skuM: sku_m[];
    skuCostos: sku_costos[];
    skusAlternos: sku_alterno[];
    error: string | null;
};

async function fetchFullTable(tableName: string, orderBy: string = 'id') {
    if (!supabaseAdmin) return [];
    const all: any[] = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabaseAdmin
            .from(tableName)
            .select('*')
            .order(orderBy, { ascending: true })
            .range(from, from + step - 1);
        
        if (error) throw error;
        if (data && data.length > 0) {
            all.push(...data);
            if (data.length < step) hasMore = false;
            else from += step;
        } else {
            hasMore = false;
        }
    }
    return all;
}

async function getInventoryData(): Promise<InventoryData> {
    if (!supabaseAdmin) {
        return { skuM: [], skuCostos: [], skusAlternos: [], error: 'Cliente de base de datos no disponible' };
    }

    try {
        const [skuM, skuCostos, skusAlternos] = await Promise.all([
            fetchFullTable('sku_m', 'sku_mdr'),
            fetchFullTable('sku_costos', 'fecha_desde'),
            fetchFullTable('sku_alterno', 'sku'),
        ]);

        return {
            skuM: skuM || [],
            skuCostos: skuCostos || [],
            skusAlternos: skusAlternos || [],
            error: null,
        };
    } catch (err: any) {
        return { skuM: [], skuCostos: [], skusAlternos: [], error: err.message };
    }
}

export default async function InventoryAnalysisPage() {
    const data = await getInventoryData();
    return <InventoryAnalysisClient inventoryData={data} />;
}
