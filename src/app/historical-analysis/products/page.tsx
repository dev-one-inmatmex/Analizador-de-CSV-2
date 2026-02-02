import { supabase } from '@/lib/supabaseClient';
import type { publicaciones, publicaciones_por_sku, skuxpublicaciones } from '@/types/database';
import { unstable_noStore as noStore } from 'next/cache';
import ProductsClientPage from './products-client';

// Define a new type that extends 'publicaciones' with an optional 'nombre_madre'
export type PublicationWithMadre = publicaciones & { nombre_madre?: string | null };

async function getPublications(): Promise<publicaciones[]> {
  noStore();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('publicaciones')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return (data as publicaciones[]) || [];
  } catch (e: any) {
    console.error('Error fetching publications:', e.message);
    return [];
  }
}

async function getSkuPublicationCount(): Promise<publicaciones_por_sku[]> {
    noStore();
    if (!supabase) return [];

    try {
        const { data, error } = await supabase
            .from('publicaciones_por_sku')
            .select('sku, publicaciones')
            .order('publicaciones', { ascending: false })
            .limit(10);
        
        if (error) throw error;
        return data || [];
    } catch(e: any) {
        console.error('Error fetching SKU publication count:', e.message);
        return [];
    }
}

async function getMadreNamesForPublications(publicationIds: string[]): Promise<Record<string, string>> {
    noStore();
    if (!supabase || publicationIds.length === 0) return {};

    try {
        const { data, error } = await supabase
            .from('skuxpublicaciones')
            .select('publicacion_id, nombre_madre')
            .in('publicacion_id', publicationIds);

        if (error) throw error;
        
        const madreNameMap: Record<string, string> = {};
        data.forEach(item => {
            if(item.publicacion_id) {
                madreNameMap[item.publicacion_id] = item.nombre_madre;
            }
        });

        return madreNameMap;
    } catch (e: any) {
        console.error('Error fetching madre names:', e.message);
        return {};
    }
}


export default async function ProductsPage() {
    const publications = await getPublications();
    const skuCounts = await getSkuPublicationCount();
    
    let publicationsWithMadre: PublicationWithMadre[] = [];
    let errorMessage: string | null = null;
    
    if (publications.length > 0) {
        const publicationIds = publications.map(p => p.item_id).filter((id): id is string => id !== null);
        
        try {
            const madreNamesMap = await getMadreNamesForPublications(publicationIds);
            publicationsWithMadre = publications.map(pub => ({
                ...pub,
                nombre_madre: pub.item_id ? madreNamesMap[pub.item_id] : null,
            }));
        } catch(e: any) {
            errorMessage = e.message;
        }
    }

  return (
    <ProductsClientPage
      initialPublications={publicationsWithMadre}
      skuPublicationCount={skuCounts}
      error={errorMessage}
    />
  );
}
