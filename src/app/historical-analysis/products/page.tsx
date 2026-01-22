import { supabase } from '@/lib/supabaseClient';
import type { SkuWithProduct } from '@/types/database';
import ProductsAnalysisClientPage from './products-client';

async function getProductSkus(): Promise<SkuWithProduct[]> {
  // Fase 1: Cargar los SKUs base
  const { data: skusData, error: skusError } = await supabase
    .from('skus')
    .select('id, sku, fecha_registro, producto_madre_id');

  if (skusError) {
    console.error('Error cargando SKUs de productos (fase 1):', skusError);
    return [];
  }

  if (!skusData || skusData.length === 0) {
    return [];
  }

  // Extraer los IDs de los productos madre para la siguiente consulta
  const productoMadreIds = [...new Set(skusData.map((sku) => sku.producto_madre_id).filter(id => id !== null))];

  // Si no hay productos madre referenciados, devolver solo los skus.
  if (productoMadreIds.length === 0) {
    return skusData.map(sku => ({ ...sku, productos_madre: null })) as SkuWithProduct[];
  }

  // Fase 2: Cargar los productos madre correspondientes
  const { data: productosMadreData, error: pmError } = await supabase
    .from('productos_madre')
    .select('id, nombre_madre, costo, tiempo_preparacion, fecha_registro')
    .in('id', productoMadreIds);

  if (pmError) {
    console.error('Error cargando productos madre (fase 2):', pmError);
    // En caso de error, devolver los SKUs sin la información del producto madre
    return skusData.map(sku => ({ ...sku, productos_madre: null })) as SkuWithProduct[];
  }

  // Crear un mapa para una búsqueda eficiente
  const productosMadreMap = new Map(productosMadreData.map(pm => [pm.id, pm]));

  // Combinar los datos
  const combinedData = skusData.map(sku => ({
    ...sku,
    productos_madre: productosMadreMap.get(sku.producto_madre_id) || null,
  }));

  return combinedData as SkuWithProduct[];
}


export default async function ProductsAnalysisPage() {
  const productSkus = await getProductSkus();

  return <ProductsAnalysisClientPage productSkus={productSkus} />;
}
