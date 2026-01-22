import { supabase } from '@/lib/supabaseClient';
import type { SkuWithProduct } from '@/types/database';
import ProductsAnalysisClientPage from './products-client';

// This function will fetch the data on the server.
async function getProductSkus(): Promise<SkuWithProduct[]> {
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
    return [];
  }

  return data as SkuWithProduct[];
}


export default async function ProductsAnalysisPage() {
  const productSkus = await getProductSkus();

  // In case the data loading fails, productSkus will be an empty array.
  // The client component already handles the case of an empty array by showing a message.
  return <ProductsAnalysisClientPage productSkus={productSkus} />;
}
