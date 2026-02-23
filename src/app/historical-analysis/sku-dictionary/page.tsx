import { supabaseAdmin } from '@/lib/supabaseClient';
import SkuDictionaryClient from './client';
import type { diccionario_skus } from '@/types/database';

async function getData() {
    if (!supabaseAdmin) {
        return { data: [], error: 'El cliente de Supabase (admin) no está disponible. Revisa la configuración del servidor.' };
    }

    try {
        const all: diccionario_skus[] = [];
        let from = 0;
        const step = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data, error } = await supabaseAdmin
                .from('diccionario_skus')
                .select('*')
                .order('sku', { ascending: true })
                .range(from, from + step - 1);

            if (error) throw error;
            if (data && data.length > 0) {
                all.push(...(data as diccionario_skus[]));
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


export default async function SkuDictionaryPage() {
  const { data, error } = await getData();
  return <SkuDictionaryClient data={data} error={error} />;
}
