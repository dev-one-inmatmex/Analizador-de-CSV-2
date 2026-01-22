import { supabase } from '@/lib/supabaseClient';
import type { SkuWithProduct, skus, productos_madre } from '@/types/database';
import ProductsAnalysisClientPage from './products-client';

// This function will fetch the data on the server.
async function getProductSkus(): Promise<SkuWithProduct[]> {
  // Fase 1: Cargar todos los SKUs
  const { data: skusData, error: skusError } = await supabase
    .from('skus')
    .select('*');

  if (skusError) {
    // Log the full error to see if there's more information
    console.error('Error cargando SKUs (fase 1):', JSON.stringify(skusError, null, 2));
    return [];
  }

  // Si no hay skus, no hay nada que hacer.
  if (!skusData || skusData.length === 0) {
    return [];
  }

  // Fase 2: Cargar todos los productos madre
  const { data: productosMadreData, error: productosMadreError } = await supabase
    .from('productos_madre')
    .select('*');
    
  if (productosMadreError) {
    console.error('Error cargando productos madre (fase 2):', JSON.stringify(productosMadreError, null, 2));
    // Fallback: Devolvemos los SKUs sin la info de producto madre
    return (skusData as skus[]).map(sku => ({
      ...sku,
      productos_madre: null,
    }));
  }

  // Crear un mapa de productos madre para una búsqueda eficiente
  const productosMadreMap = new Map<number, productos_madre>();
  if (productosMadreData) {
    for (const producto of productosMadreData) {
      productosMadreMap.set(producto.id, producto as productos_madre);
    }
  }
  
  // Unir los datos manualmente
  const productSkus: SkuWithProduct[] = (skusData as skus[]).map(sku => ({
    ...sku,
    productos_madre: productosMadreMap.get(sku.producto_madre_id) || null,
  }));

  return productSkus;
}


export default async function ProductsAnalysisPage() {
  const productSkus = await getProductSkus();

  // En el caso de que la carga de datos falle, productSkus será un array vacío.
  // El componente cliente ya maneja el caso de un array vacío mostrando un mensaje.
  return <ProductsAnalysisClientPage productSkus={productSkus} />;
}
