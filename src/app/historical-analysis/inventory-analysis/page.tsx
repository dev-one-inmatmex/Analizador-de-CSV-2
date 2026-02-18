import { supabaseAdmin } from '@/lib/supabaseClient';
import InventoryAnalysisClient from './inventory-client';
import type { sku_m, sku_costos, sku_alterno } from '@/types/database';

export type InventoryData = {
    skuM: sku_m[];
    skuCostos: sku_costos[];
    skusAlternos: sku_alterno[];
    error: string | null;
};

async function getInventoryData(): Promise<InventoryData> {
    if (!supabaseAdmin) {
        return { skuM: [], skuCostos: [], skusAlternos: [], error: 'Cliente de base de datos no disponible' };
    }

    try {
        const [skuMRes, costosRes, alternosRes] = await Promise.all([
            supabaseAdmin.from('sku_m').select('*').order('sku_mdr', { ascending: true }),
            supabaseAdmin.from('sku_costos').select('*').order('fecha_desde', { ascending: false }),
            supabaseAdmin.from('sku_alterno').select('*').order('sku', { ascending: true }),
        ]);

        if (skuMRes.error) throw skuMRes.error;
        if (costosRes.error) throw costosRes.error;
        if (alternosRes.error) throw alternosRes.error;

        return {
            skuM: skuMRes.data || [],
            skuCostos: costosRes.data || [],
            skusAlternos: alternosRes.data || [],
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
