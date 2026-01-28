import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import type { SkuWithProduct, publicaciones } from '@/types/database';
import ProductsAnalysisClientPage from './products-client';
import { unstable_noStore as noStore } from 'next/cache';

// This function will fetch the data on the server.
async function getProductSkus(): Promise<SkuWithProduct[]> {
  noStore();
  if (!isSupabaseConfigured || !supabase) {
    console.warn("Supabase is not configured. Returning empty data. Please check your .env file.");
    return [];
  }

  const { data, error } = await supabase
    .from('skus')
    .select(`
      sku,
      variacion,
      productos_madre (
        nombre_madre,
        costo
      ),
      tiempo_preparacion,
      fecha_registro
    `)
    .order('fecha_registro', { ascending: false });

  if (error) {
    // Log the full error to see if there's more information
    console.error('Error cargando SKUs y productos madre:', JSON.stringify(error, null, 2));
    // Devuelve la página del cliente con un array vacío para que el usuario vea un mensaje
    return [];
  }

  return data as SkuWithProduct[];
}

async function getPublications(): Promise<publicaciones[]> {
  noStore();
  if (!isSupabaseConfigured || !supabase) {
    console.warn("Supabase is not configured.");
    return [];
  }

  const { data, error } = await supabase
    .from('publicaciones')
    .select('id, item_id, sku, title, status, company, price, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching publications:', error);
    return [];
  }
  return data as publicaciones[];
}


export default async function ProductsAnalysisPage() {
  const productSkus = await getProductSkus();
  const publications = await getPublications();

  // En el caso de que la carga de datos falle, productSkus será un array vacío.
  // El componente cliente ya maneja el caso de un array vacío mostrando un mensaje.
  return <ProductsAnalysisClientPage productSkus={productSkus} publications={publications} />;
}
