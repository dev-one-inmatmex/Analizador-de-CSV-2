import { supabaseAdmin } from '@/lib/supabaseClient';
import MotherCatalogClient from './client';
import type { sku_m } from '@/types/database';

async function getData() {
    if (!supabaseAdmin) {
        return { data: [], error: 'El cliente de Supabase (admin) no está disponible. Revisa la configuración del servidor.' };
    }

    try {
        const all: sku_m[] = [];
        let from = 0;
        const step = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data, error } = await supabaseAdmin
                .from('sku_madre')
                .select('*')
                .order('nombre_madre', { ascending: true })
                .range(from, from + step - 1);

            if (error) throw error;
            if (data && data.length > 0) {
                all.push(...(data as sku_m []));
                if (data.length < step) hasMore = false;
                else from += step;
            } else {
                hasMore = false;
            }
        }
        
        return { data: all, error: null };
    } catch (e: any) {
        return { data: [], error: e.message };
    }
}


export default async function MotherCatalogPage() {
  const { data, error } = await getData();
  return <MotherCatalogClient data={data} error={error} />;
}
