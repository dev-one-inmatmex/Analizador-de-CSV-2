import { supabaseAdmin } from '@/lib/supabaseClient';
import MotherCatalogClient from './client';
import type { catalogo_madre } from '@/types/database';

async function getData() {
    if (!supabaseAdmin) {
        return { data: [], error: 'El cliente de Supabase (admin) no está disponible. Revisa la configuración del servidor.' };
    }

    try {
        const all: catalogo_madre[] = [];
        let from = 0;
        const step = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data, error } = await supabaseAdmin
                .from('catalogo_madre')
                .select('*')
                .order('nombre_madre', { ascending: true })
                .range(from, from + step - 1);

            if (error) throw error;
            if (data && data.length > 0) {
                all.push(...(data as catalogo_madre[]));
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
