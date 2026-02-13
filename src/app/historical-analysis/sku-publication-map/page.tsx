import { supabaseAdmin } from '@/lib/supabaseClient';
import SkuToPublicationMapClient from './client';
import type { skuxpublicaciones } from '@/types/database';

async function getData() {
    if (!supabaseAdmin) {
        return { data: [], error: 'El cliente de Supabase (admin) no está disponible. Revisa la configuración del servidor.' };
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('skuxpublicaciones')
            .select('*');

        if (error) throw error;
        
        return { data: (data as skuxpublicaciones[]) || [], error: null };
    } catch (e: any) {
        let errorMessage = `Ocurrió un error al consultar 'skuxpublicaciones': ${e.message}. Asegúrate de que la tabla existe y los permisos son correctos.`;
        if (e.code === '42P01') {
            errorMessage = "Error: La tabla 'skuxpublicaciones' no fue encontrada en la base de datos.";
        } else if (e.message.includes('Failed to fetch')) {
            errorMessage = 'Error de red: No se pudo conectar a la base de datos. Revisa tu conexión y la configuración de las variables de entorno.';
        }
        console.error(errorMessage);
        return { data: [], error: errorMessage };
    }
}

export default async function SkuToPublicationMapPage() {
    const { data, error } = await getData();
    return <SkuToPublicationMapClient data={data} error={error} />;
}
