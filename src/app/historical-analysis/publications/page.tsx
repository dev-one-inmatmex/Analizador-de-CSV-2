import { supabaseAdmin } from '@/lib/supabaseClient'
import PublicationsClient from './publications-client';
import type { publi_tienda, publi_xsku } from '@/types/database';

export type EnrichedPublicationCount = publi_xsku & { publication_title?: string };

export type ProductsData = {
    publications: publi_tienda[];
    skuCounts: EnrichedPublicationCount[];
    error: string | null;
}

async function fetchFullTable(tableName: string) {
    if (!supabaseAdmin) return [];
    const all: any[] = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabaseAdmin
            .from(tableName)
            .select('*')
            .range(from, from + step - 1);
        
        if (error) throw error;
        if (data && data.length > 0) {
            all.push(...data);
            if (data.length < step) hasMore = false;
            else from += step;
        } else {
            hasMore = false;
        }
    }
    return all;
}

async function getProductsData(): Promise<ProductsData> {
    if (!supabaseAdmin) return { publications: [], skuCounts: [], error: 'Supabase admin client no configurado' };

    try {
        const [pubsData, countsData] = await Promise.all([
            fetchFullTable('publi_tienda'),
            fetchFullTable('publi_xsku'),
        ]);

        const allPublications = (pubsData as publi_tienda[]) ?? [];
        const sortedPublications = allPublications.sort((a, b) => new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime());

        const pubsMap = new Map<string, publi_tienda>();
        for (const pub of allPublications) {
          if (pub.sku && !pubsMap.has(pub.sku)) pubsMap.set(pub.sku, pub);
        }

        const rawSkuCounts = (countsData as publi_xsku[]) ?? [];
        const enrichedSkuCounts = rawSkuCounts
            .map(item => ({ ...item, publication_title: pubsMap.get(item.sku ?? '')?.titulo ?? 'N/A' }))
            .sort((a, b) => (b.num_publicaciones || 0) - (a.num_publicaciones || 0));
        
        return {
            publications: sortedPublications,
            skuCounts: enrichedSkuCounts,
            error: null
        }
      } catch (err: any) {
        console.error('Error fetching products data', err);
        return { publications: [], skuCounts: [], error: err.message };
      }
}


export default async function PublicationsPage() {
  const productsData = await getProductsData();
  return <PublicationsClient productsData={productsData} />;
}
