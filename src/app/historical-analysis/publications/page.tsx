import { supabaseAdmin } from '@/lib/supabaseClient'
import PublicationsClient from './publications-client';
import type { publicaciones, publicaciones_por_sku, skuxpublicaciones, catalogo_madre } from '@/types/database';

export type EnrichedPublicationCount = publicaciones_por_sku & { publication_title?: string };
export type EnrichedSkuMap = skuxpublicaciones & { company?: string; nombre_madre?: string };
export type EnrichedMotherCatalog = catalogo_madre & { publication_title?: string; price?: number; nombre_madre?: string };
export type PublicacionMin = Pick<publicaciones, 'sku' | 'title'>;

export type ProductsData = {
    publications: any[];
    skuCounts: EnrichedPublicationCount[];
    skuMap: EnrichedSkuMap[];
    motherCatalog: EnrichedMotherCatalog[];
    error: string | null;
}

async function getProductsData(): Promise<ProductsData> {
    if (!supabaseAdmin) return { publications: [], skuCounts: [], skuMap: [], motherCatalog: [], error: 'Supabase admin client no configurado' };

    try {
        const [pubsRes, countsRes, mapsRes, catalogRes] = await Promise.all([
            supabaseAdmin.from('publicaciones').select('*'),
            supabaseAdmin.from('publicaciones_por_sku').select('*').order('publicaciones', { ascending: false }),
            supabaseAdmin.from('skuxpublicaciones').select('*').limit(100),
            supabaseAdmin.from('catalogo_madre').select('*').order('nombre_madre', { ascending: true }),
        ]);

        if (pubsRes.error) throw pubsRes.error;
        if (countsRes.error) throw countsRes.error;
        if (mapsRes.error) throw mapsRes.error;
        if (catalogRes.error) throw catalogRes.error;

        const allPublications = (pubsRes.data as publicaciones[]) ?? [];
        const sortedPublications = allPublications.sort((a, b) => new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime());

        const pubsMap = new Map<string, publicaciones>();
        for (const pub of allPublications) {
          if (pub.sku && !pubsMap.has(pub.sku)) pubsMap.set(pub.sku, pub);
        }

        const rawSkuCounts = (countsRes.data as publicaciones_por_sku[]) ?? [];
        const enrichedSkuCounts = rawSkuCounts.map(item => ({ ...item, publication_title: pubsMap.get(item.sku ?? '')?.title ?? 'N/A' }));

        const rawSkuMap = (mapsRes.data as skuxpublicaciones[]) ?? [];
        const enrichedSkuMap = rawSkuMap.map(item => ({ ...item, company: pubsMap.get(item.sku ?? '')?.company ?? 'N/A', nombre_madre: pubsMap.get(item.sku ?? '')?.nombre_madre ?? 'N/A' }));

        const rawCatalog = (catalogRes.data as catalogo_madre[]) ?? [];
        const enrichedMotherCatalog = rawCatalog.map(item => {
            const pub = pubsMap.get(item.sku ?? '');
            return { ...item, nombre_madre: pub?.nombre_madre ?? item.nombre_madre, price: pub?.price, publication_title: pub?.title };
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
