import { supabaseAdmin } from '@/lib/supabaseClient';
import SkuPublicationCountClient from './client';
import type { publicaciones_por_sku } from '@/types/database';

async function getData() {
    if (!supabaseAdmin) {
        return { data: [], error: 'El cliente de Supabase (admin) no está disponible. Revisa la configuración del servidor.' };
    }

    try {
        const all: publicaciones_por_sku[] = [];
        let from = 0;
        const step = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data, error } = await supabaseAdmin
                .from('publicaciones_por_sku')
                .select('*')
                .order('publicaciones', { ascending: false })
                .range(from, from + step - 1);

            if (error) throw error;
            if (data && data.length > 0) {
                all.push(...(data as publicaciones_por_sku[]));
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

export default async function SkuPublicationCountPage() {
  const { data, error } = await getData();
  return <SkuPublicationCountClient data={data} error={error} />;
}
