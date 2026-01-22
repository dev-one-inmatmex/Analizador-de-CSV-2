import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import type { SkuWithProduct } from '@/types/database';
import ProductsAnalysisClientPage from './products-client';

// This function will fetch the data on the server.
async function getProductSkus(): Promise<SkuWithProduct[]> {
  if (!isSupabaseConfigured || !supabase) {
    console.warn("Supabase is not configured. Returning empty data. Please check your .env file.");
    return [];
  }

  const { data, error } = await supabase
    .from('skus')
    .select(`
      *,
      productos_madre (
        *
      )
    `);

  if (error) {
    // Log the full error to see if there's more information
    console.error('Error cargando SKUs y productos madre:', JSON.stringify(error, null, 2));
    // Devuelve la página del cliente con un array vacío para que el usuario vea un mensaje
    return [];
  }

  return data as SkuWithProduct[];
}


export default async function ProductsAnalysisPage() {
  const productSkus = await getProductSkus();

  // En el caso de que la carga de datos falle, productSkus será un array vacío.
  // El componente cliente ya maneja el caso de un array vacío mostrando un mensaje.
  return <ProductsAnalysisClientPage productSkus={productSkus} />;
}
