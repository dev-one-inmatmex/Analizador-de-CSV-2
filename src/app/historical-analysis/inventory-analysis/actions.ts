'use server';

import { supabaseAdmin } from '@/lib/supabaseClient';
import { revalidatePath } from 'next/cache';
import type { sku_m, sku_costos, sku_alterno } from '@/types/database';

export async function addSkuM(data: Partial<sku_m>) {
    if (!supabaseAdmin) return { error: 'Error de conexión' };
    const { error } = await supabaseAdmin.from('sku_m').insert([data]);
    if (error) return { error: error.message };
    revalidatePath('/historical-analysis/inventory-analysis');
    return { success: true };
}

export async function addSkuCosto(data: Partial<sku_costos>) {
    if (!supabaseAdmin) return { error: 'Error de conexión' };
    const { error } = await supabaseAdmin.from('sku_costos').insert([data]);
    if (error) return { error: error.message };
    revalidatePath('/historical-analysis/inventory-analysis');
    return { success: true };
}

export async function addSkuAlterno(data: Partial<sku_alterno>) {
    if (!supabaseAdmin) return { error: 'Error de conexión' };
    const { error } = await supabaseAdmin.from('sku_alterno').insert([data]);
    if (error) return { error: error.message };
    revalidatePath('/historical-analysis/inventory-analysis');
    return { success: true };
}
