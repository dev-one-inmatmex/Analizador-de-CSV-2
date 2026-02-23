import { supabaseAdmin } from '@/lib/supabaseClient';
import SkuToPublicationMapClient from './client';
import type { skuxpublicaciones } from '@/types/database';

async function getData() {
    if (!supabaseAdmin) {
        return { data: [], error: 'El cliente de Supabase (admin) no está disponible. Revisa la configuración del servidor.' };
    }

    try {
        const all: skuxpublicaciones[] = [];
        let from = 0;
        const step = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data, error } = await supabaseAdmin
                .from('skuxpublicaciones')
                .select('*')
                .range(from, from + step - 1);

            if (error) throw error;
            if (data && data.length > 0) {
                all.push(...(data as skuxpublicaciones[]));
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

export default async function SkuToPublicationMapPage() {
    const { data, error } = await getData();
    return <SkuToPublicationMapClient data={data} error={error} />;
}
