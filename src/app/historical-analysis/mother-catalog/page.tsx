import { supabaseAdmin } from '@/lib/supabaseClient';
import MotherCatalogClient from './client';
import { unstable_noStore as noStore } from 'next/cache';
import type { catalogo_madre } from '@/types/database';

async function getData() {
    noStore();
    if (!supabaseAdmin) {
        return { data: [], error: 'El cliente de Supabase (admin) no está disponible. Revisa la configuración del servidor.' };
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('catalogo_madre')
            .select('*')
            .order('nombre_madre', { ascending: true });

        if (error) throw error;
        
        return { data: (data as catalogo_madre[]) || [], error: null };
    } catch (e: any) {
        let errorMessage = `Ocurrió un error al consultar 'catalogo_madre': ${e.message}. Asegúrate de que la tabla existe y los permisos son correctos.`;
        if (e.code === '42P01') {
            errorMessage = "Error: La tabla 'catalogo_madre' no fue encontrada en la base de datos.";
        } else if (e.message.includes('Failed to fetch')) {
            errorMessage = 'Error de red: No se pudo conectar a la base de datos. Revisa tu conexión y la configuración de las variables de entorno.';
        }
        console.error(errorMessage);
        return { data: [], error: errorMessage };
    }
}


export default async function MotherCatalogPage() {
  const { data, error } = await getData();
  return <MotherCatalogClient data={data} error={error} />;
}
