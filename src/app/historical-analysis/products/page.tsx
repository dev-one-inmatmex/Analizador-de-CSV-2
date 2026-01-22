import { supabase } from '@/lib/supabaseClient';
import type { SkuWithProduct } from '@/types/database';
import ProductsAnalysisClientPage from './products-client';

async function getProductSkus(): Promise<SkuWithProduct[]> {
  const { data, error } = await supabase
    .from('skus')
    .select(`
      id,
      sku,
      fecha_registro,
      productos_madre (
        id,
        nombre_madre,
        costo,
        tiempo_preparacion,
        fecha_registro
      )
    `);

  if (error) {
    console.error('Error cargando SKUs de productos:', error);
    return [];
  }

  return data as SkuWithProduct[];
}


export default async function ProductsAnalysisPage() {
  const productSkus = await getProductSkus();

  return <ProductsAnalysisClientPage productSkus={productSkus} />;
}
