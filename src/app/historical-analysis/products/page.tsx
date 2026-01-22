import { supabase } from '@/lib/supabaseClient';
import type { SkuWithProduct } from '@/types/database';
import ProductsAnalysisClientPage from './products-client';

export default async function ProductsAnalysisPage() {
  const { data: productSkus, error } = await supabase
    .from('skus')
    .select(`
      id,
      sku,
      fecha_registro,
      productos_madre (
        id,
        nombre_madre,
        costo,
        tiempo_preparacion
      )
    `);

  if (error) {
    console.error('Error cargando SKUs y productos madre:', error);
    // Devuelve la página del cliente con un array vacío para que el usuario vea un mensaje
    return <ProductsAnalysisClientPage productSkus={[]} />;
  }

  // Asegurarse de que los datos se ajustan al tipo esperado, incluso si la consulta devuelve null
  const typedProductSkus = (productSkus || []) as SkuWithProduct[];

  return <ProductsAnalysisClientPage productSkus={typedProductSkus} />;
}
