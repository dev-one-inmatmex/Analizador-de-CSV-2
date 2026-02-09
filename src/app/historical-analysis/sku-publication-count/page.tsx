import { supabaseAdmin } from '@/lib/supabaseClient';
import SkuPublicationCountClient from './client';
import { unstable_noStore as noStore } from 'next/cache';
import type { publicaciones_por_sku } from '@/types/database';

async function getData() {
    noStore();
    if (!supabaseAdmin) {
        return { data: [], error: 'El cliente de Supabase (admin) no está disponible. Revisa la configuración del servidor.' };
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('publicaciones_por_sku')
            .select('*')
            .order('publicaciones', { ascending: false });

        if (error) throw error;
        
        return { data: (data as publicaciones_por_sku[]) || [], error: null };
    } catch (e: any) {
        let errorMessage = `Ocurrió un error al consultar 'publicaciones_por_sku': ${e.message}. Asegúrate de que la tabla existe y los permisos son correctos.`;
        if (e.code === '42P01') {
            errorMessage = "Error: La tabla 'publicaciones_por_sku' no fue encontrada en la base de datos.";
        } else if (e.message.includes('Failed to fetch')) {
            errorMessage = 'Error de red: No se pudo conectar a la base de datos. Revisa tu conexión y la configuración de las variables de entorno.';
        }
        console.error(errorMessage);
        return { data: [], error: errorMessage };
    }
}

export default async function SkuPublicationCountPage() {
  const { data, error } = await getData();
  return <SkuPublicationCountClient data={data} error={error} />;
}
