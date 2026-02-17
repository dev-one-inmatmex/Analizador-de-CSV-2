import { supabaseAdmin } from '@/lib/supabaseClient'
import PublicationsClient from './publications-client';
import type { publi_tienda, publi_xsku } from '@/types/database';

export type EnrichedPublicationCount = publi_xsku & { publication_title?: string };

export type ProductsData = {
    publications: publi_tienda[];
    skuCounts: EnrichedPublicationCount[];
    error: string | null;
}

async function getProductsData(): Promise<ProductsData> {
    if (!supabaseAdmin) return { publications: [], skuCounts: [], error: 'Supabase admin client no configurado' };

    try {
        const [pubsRes, countsRes] = await Promise.all([
            supabaseAdmin.from('publi_tienda').select('*'),
            supabaseAdmin.from('publi_xsku').select('*').order('num_publicaciones', { ascending: false }),
        ]);

        if (pubsRes.error) throw pubsRes.error;
        if (countsRes.error) throw countsRes.error;

        const allPublications = (pubsRes.data as publi_tienda[]) ?? [];
        const sortedPublications = allPublications.sort((a, b) => new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime());

        const pubsMap = new Map<string, publi_tienda>();
        for (const pub of allPublications) {
          if (pub.sku && !pubsMap.has(pub.sku)) pubsMap.set(pub.sku, pub);
        }

        const rawSkuCounts = (countsRes.data as publi_xsku[]) ?? [];
        const enrichedSkuCounts = rawSkuCounts.map(item => ({ ...item, publication_title: pubsMap.get(item.sku ?? '')?.titulo ?? 'N/A' }));
        
        return {
            publications: sortedPublications,
            skuCounts: enrichedSkuCounts,
            error: null
        }
      } catch (err: any) {
        console.error('Error fetching products data', err);
        let errorMessage = `Ocurrió un error al consultar los datos de publicaciones: ${err.message}.`;
        if (err.code === '42P01') {
            errorMessage = `Error: Una de las tablas ('publi_tienda', 'publi_xsku') no fue encontrada en la base de datos. Por favor, verifica el esquema.`;
        }
        return { publications: [], skuCounts: [], error: errorMessage };
      }
}


export default async function PublicationsPage() {
  const productsData = await getProductsData();

  return <PublicationsClient productsData={productsData} />;
}
