'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { publicaciones, publicaciones_por_sku, skuxpublicaciones, catalogo_madre } from '@/types/database';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut, Loader2, BarChart3 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import GlobalNav from '@/components/global-nav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type EnrichedPublicationCount = publicaciones_por_sku & { publication_title?: string };
type EnrichedSkuMap = skuxpublicaciones & { company?: string; category?: string };
type EnrichedMotherCatalog = catalogo_madre & { publication_title?: string; price?: number; category?: string };

type LoadingState = {
    publicaciones: boolean;
    conteoSkus: boolean;
    mapeoSkus: boolean;
    catalogoMadre: boolean;
};

export default function ProductsPage() {
  const [publications, setPublications] = useState<publicaciones[]>([]);
  const [skuCounts, setSkuCounts] = useState<EnrichedPublicationCount[]>([]);
  const [skuMap, setSkuMap] = useState<EnrichedSkuMap[]>([]);
  const [motherCatalog, setMotherCatalog] = useState<EnrichedMotherCatalog[]>([]);

  const [loading, setLoading] = useState<LoadingState>({
    publicaciones: true,
    conteoSkus: true,
    mapeoSkus: true,
    catalogoMadre: true,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!supabase) {
        setError(
          'El cliente de Supabase no está disponible. Revisa la configuración en src/lib/supabaseClient.ts'
        );
        setLoading({ publicaciones: false, conteoSkus: false, mapeoSkus: false, catalogoMadre: false });
        return;
      }

      try {
        const [
            pubsRes,
            countsRes,
            mapsRes,
            catalogRes
        ] = await Promise.all([
          supabase.from('publicaciones').select('*'),
          supabase.from('publicaciones_por_sku').select('*').order('publicaciones', { ascending: false }),
          supabase.from('skuxpublicaciones').select('*').limit(50),
          supabase.from('catalogo_madre').select('*').order('nombre_madre', { ascending: true })
        ]);

        if (pubsRes.error) throw pubsRes.error;
        const allPublications = (pubsRes.data as publicaciones[]) || [];
        setPublications(allPublications.slice(0, 20).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        setLoading(prev => ({ ...prev, publicaciones: false }));

        const pubsMap = new Map<string, publicaciones>();
        for (const pub of allPublications) {
            if (pub.sku && !pubsMap.has(pub.sku)) {
                pubsMap.set(pub.sku, pub);
            }
        }
        
        if (countsRes.error) throw countsRes.error;
        const rawSkuCounts = (countsRes.data as publicaciones_por_sku[]) || [];
        const enrichedSkuCounts: EnrichedPublicationCount[] = rawSkuCounts.map(item => ({
            ...item,
            publication_title: item.sku ? (pubsMap.get(item.sku)?.title || 'N/A') : 'N/A',
        }));
        setSkuCounts(enrichedSkuCounts);
        setLoading(prev => ({ ...prev, conteoSkus: false }));

        if (mapsRes.error) throw mapsRes.error;
        const rawSkuMap = (mapsRes.data as skuxpublicaciones[]) || [];
        const enrichedSkuMap: EnrichedSkuMap[] = rawSkuMap.map(item => {
            const pub = item.sku ? pubsMap.get(item.sku) : undefined;
            return {
                ...item,
                company: pub?.company || 'N/A',
                category: pub?.category || 'N/A',
            };
        });
        setSkuMap(enrichedSkuMap);
        setLoading(prev => ({ ...prev, mapeoSkus: false }));

        if (catalogRes.error) throw catalogRes.error;
        const rawMotherCatalog = (catalogRes.data as catalogo_madre[]) || [];
        const enrichedMotherCatalog: EnrichedMotherCatalog[] = rawMotherCatalog.map(item => {
            const pub = item.sku ? pubsMap.get(item.sku) : undefined;
            return {
                ...item,
                publication_title: pub?.title,
                price: pub?.price,
                category: pub?.category
            };
        });
        setMotherCatalog(enrichedMotherCatalog);
        setLoading(prev => ({ ...prev, catalogoMadre: false }));

      } catch (e: any) {
        let errorMessage = 'Ocurrió un error inesperado.';
        if (e instanceof TypeError && e.message.includes('Failed to fetch')) {
          errorMessage =
            'Error de red: No se pudo conectar a la base de datos. Revisa tu conexión a internet y la configuración de las variables de entorno.';
        } else {
          errorMessage = e.message || String(e);
        }
        setError(errorMessage);
        setLoading({ publicaciones: false, conteoSkus: false, mapeoSkus: false, catalogoMadre: false });
      }
    };

    fetchData();
  }, []);

  const isAnythingLoading = Object.values(loading).some(Boolean);

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Link href="/historical-analysis" passHref>
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Volver</span>
            </Button>
          </Link>
          <h1 className="text-xl font-bold tracking-tight">Análisis de Publicaciones y Catálogo</h1>
        </div>
        <div className="flex items-center gap-4">
            <Link href="/historical-analysis" passHref>
                <Button>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Análisis de Históricos
                </Button>
            </Link>
            <GlobalNav />
            <Button variant="outline">
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
            </Button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 space-y-8">
        {error && (
            <div className="p-4 mb-6 text-red-800 bg-red-100 border border-red-300 rounded-lg">
            <p className="font-bold">Error al cargar datos:</p>
            <p className="text-sm mt-1 font-mono">{error}</p>
            </div>
        )}
        
        {isAnythingLoading ? (
             <div className="flex min-h-[50vh] items-center justify-center bg-muted/40 rounded-lg">
                <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Cargando datos del catálogo...</p>
                </div>
            </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="space-y-8">
                {/* ============== PUBLICACIONES ============== */}
                <Card>
                    <CardHeader>
                        <CardTitle>Publicaciones Recientes</CardTitle>
                        <CardDescription>Últimas 20 publicaciones añadidas.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item ID</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Título</TableHead>
                                    <TableHead className="text-right">Precio</TableHead>
                                    <TableHead>Estado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {publications.map((pub) => (
                                <TableRow key={pub.item_id}>
                                    <TableCell className="font-mono text-primary">{pub.item_id}</TableCell>
                                    <TableCell className="font-mono">{pub.sku}</TableCell>
                                    <TableCell className="font-medium max-w-xs truncate" title={pub.title || ''}>{pub.title}</TableCell>
                                    <TableCell className="text-right font-semibold">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(pub.price)}</TableCell>
                                    <TableCell className="text-center"><Badge variant={pub.status === 'active' ? 'secondary' : 'outline'}>{pub.status}</Badge></TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                 {/* ============== SKU A PUBLICACION ============== */}
                <Card>
                    <CardHeader>
                        <CardTitle>Mapeo SKU a Producto Madre</CardTitle>
                        <CardDescription>Relación entre SKUs, publicaciones y el producto principal.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>ID Publicación</TableHead>
                                    <TableHead>Producto Madre</TableHead>
                                    <TableHead>Compañía (Pub.)</TableHead>
                                    <TableHead>Categoría (Pub.)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                            {skuMap.map((item, index) => (
                                <TableRow key={`${item.sku}-${item.publicacion_id}-${index}`}>
                                    <TableCell className="font-mono">{item.sku}</TableCell>
                                    <TableCell className="font-mono text-muted-foreground">{item.publicacion_id}</TableCell>
                                    <TableCell className="font-medium text-primary">{item.nombre_madre}</TableCell>
                                    <TableCell>{item.company}</TableCell>
                                    <TableCell>{item.category}</TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            <div className="space-y-8">
                 {/* ============== CONTEO SKU ============== */}
                <Card>
                    <CardHeader>
                        <CardTitle>Conteo de Publicaciones por SKU</CardTitle>
                        <CardDescription>SKUs ordenados por la cantidad de publicaciones que tienen.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Título (Ejemplo)</TableHead>
                                    <TableHead className="text-right"># de Publicaciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {skuCounts.map((item, index) => (
                                <TableRow key={`${item.sku}-${index}`}>
                                    <TableCell className="font-mono text-primary">{item.sku}</TableCell>
                                    <TableCell className="font-medium text-muted-foreground max-w-xs truncate" title={item.publication_title || ''}>{item.publication_title}</TableCell>
                                    <TableCell className="font-medium text-right">{item.publicaciones}</TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                 {/* ============== CATALOGO MADRE ============== */}
                <Card>
                    <CardHeader>
                        <CardTitle>Catálogo de Productos Madre</CardTitle>
                        <CardDescription>Listado maestro de los productos principales y su compañía.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Título Publicación</TableHead>
                                    <TableHead>Categoría (Pub.)</TableHead>
                                    <TableHead>Compañía</TableHead>
                                    <TableHead className="text-right">Precio (Ejemplo)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {motherCatalog.map((item, index) => (
                                <TableRow key={`${item.sku}-${index}`}>
                                    <TableCell className="font-mono">{item.sku}</TableCell>
                                    <TableCell className="font-medium text-primary">{item.publication_title || item.nombre_madre}</TableCell>
                                    <TableCell>{item.category || 'N/A'}</TableCell>
                                    <TableCell>{item.company}</TableCell>
                                    <TableCell className="text-right font-medium">{item.price ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(item.price) : 'N/A'}</TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
        )}
      </main>
    </div>
  );
}
