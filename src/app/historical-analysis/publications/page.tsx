import { supabaseAdmin } from '@/lib/supabaseClient'
import PublicationsClient from './publications-client';
import type { publi_tienda, publi_xsku, skuxpublicaciones, catalogo_madre } from '@/types/database';

export type EnrichedPublicationCount = publi_xsku & { publication_title?: string };
export type EnrichedSkuMap = skuxpublicaciones & { company?: string; nombre_madre?: string };
export type EnrichedMotherCatalog = catalogo_madre & { publication_title?: string; price?: number; nombre_madre?: string };
export type PublicacionMin = Pick<publi_tienda, 'sku' | 'titulo'>;

export type ProductsData = {
    publications: publi_tienda[];
    skuCounts: EnrichedPublicationCount[];
    skuMap: EnrichedSkuMap[];
    motherCatalog: EnrichedMotherCatalog[];
    error: string | null;
}

async function getProductsData(): Promise<ProductsData> {
    if (!supabaseAdmin) return { publications: [], skuCounts: [], skuMap: [], motherCatalog: [], error: 'Supabase admin client no configurado' };

    try {
        const [pubsRes, countsRes, mapsRes, catalogRes] = await Promise.all([
            supabaseAdmin.from('publi_tienda').select('*'),
            supabaseAdmin.from('publi_xsku').select('*').order('num_publicaciones', { ascending: false }),
            supabaseAdmin.from('skuxpublicaciones').select('*').limit(100),
            supabaseAdmin.from('catalogo_madre').select('*').order('nombre_madre', { ascending: true }),
        ]);

        if (pubsRes.error) throw pubsRes.error;
        if (countsRes.error) throw countsRes.error;
        if (mapsRes.error) throw mapsRes.error;
        if (catalogRes.error) throw catalogRes.error;

        const allPublications = (pubsRes.data as publi_tienda[]) ?? [];
        const sortedPublications = allPublications.sort((a, b) => new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime());

        const pubsMap = new Map<string, publi_tienda>();
        for (const pub of allPublications) {
          if (pub.sku && !pubsMap.has(pub.sku)) pubsMap.set(pub.sku, pub);
        }

        const rawSkuCounts = (countsRes.data as publi_xsku[]) ?? [];
        const enrichedSkuCounts = rawSkuCounts.map(item => ({ ...item, publication_title: pubsMap.get(item.sku ?? '')?.titulo ?? 'N/A' }));

        const rawSkuMap = (mapsRes.data as skuxpublicaciones[]) ?? [];
        const enrichedSkuMap = rawSkuMap.map(item => ({ ...item, company: pubsMap.get(item.sku ?? '')?.tienda ?? 'N/A', nombre_madre: pubsMap.get(item.sku ?? '')?.cat_mdr ?? 'N/A' }));

        const rawCatalog = (catalogRes.data as catalogo_madre[]) ?? [];
        const enrichedMotherCatalog = rawCatalog.map(item => {
            const pub = pubsMap.get(item.sku ?? '');
            return { ...item, nombre_madre: pub?.cat_mdr ?? item.nombre_madre, price: pub?.costo, publication_title: pub?.titulo };
        });

        return {
            publications: sortedPublications,
            skuCounts: enrichedSkuCounts,
            skuMap: enrichedSkuMap,
            motherCatalog: enrichedMotherCatalog,
            error: null
        }
      } catch (err: any) {
        console.error('Error fetching products data', err);
        return { publications: [], skuCounts: [], skuMap: [], motherCatalog: [], error: err.message };
      }
}


export default async function PublicationsPage() {
  const productsData = await getProductsData();

  return <PublicationsClient productsData={productsData} />;
}
