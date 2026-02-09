'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type {
  publicaciones,
  publicaciones_por_sku,
  skuxpublicaciones,
  catalogo_madre,
} from '@/types/database';

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

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

/* ===================== TYPES ===================== */

type EnrichedPublicationCount = publicaciones_por_sku & {
  publication_title?: string;
};

type EnrichedSkuMap = skuxpublicaciones & {
  company?: string;
  nombre_madre?: string;
};

type EnrichedMotherCatalog = catalogo_madre & {
  publication_title?: string;
  price?: number;
  nombre_madre?: string;
};

type LoadingState = {
  publicaciones: boolean;
  conteoSkus: boolean;
  mapeoSkus: boolean;
  catalogoMadre: boolean;
};

const PAGE_SIZE = 10;

/* ===================== COMPONENT ===================== */

export default function ProductsPage() {
  const [publications, setPublications] = useState<publicaciones[]>([]);
  const [skuCounts, setSkuCounts] = useState<EnrichedPublicationCount[]>([]);
  const [skuMap, setSkuMap] = useState<EnrichedSkuMap[]>([]);
  const [motherCatalog, setMotherCatalog] =
    useState<EnrichedMotherCatalog[]>([]);

  const [loading, setLoading] = useState<LoadingState>({
    publicaciones: true,
    conteoSkus: true,
    mapeoSkus: true,
    catalogoMadre: true,
  });

  const [error, setError] = useState<string | null>(null);

  const [pages, setPages] = useState({
    pubs: 1,
    counts: 1,
    map: 1,
    catalog: 1,
  });

  /* ===================== DATA ===================== */

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pubsRes, countsRes, mapsRes, catalogRes] = await Promise.all([
          supabase.from('publicaciones').select('*'),
          supabase
            .from('publicaciones_por_sku')
            .select('*')
            .order('publicaciones', { ascending: false }),
          supabase.from('skuxpublicaciones').select('*').limit(100),
          supabase
            .from('catalogo_madre')
            .select('*')
            .order('nombre_madre', { ascending: true }),
        ]);

        if (pubsRes.error) throw pubsRes.error;
        if (countsRes.error) throw countsRes.error;
        if (mapsRes.error) throw mapsRes.error;
        if (catalogRes.error) throw catalogRes.error;

        const allPublications = (pubsRes.data as publicaciones[]) ?? [];

        /* ---- publicaciones recientes ---- */
        setPublications(
          allPublications
            .sort(
              (a, b) =>
                new Date(b.created_at ?? '').getTime() -
                new Date(a.created_at ?? '').getTime()
            )
        );
        setLoading(p => ({ ...p, publicaciones: false }));

        /* ---- map SKU → publicación ---- */
        const pubsMap = new Map<string, publicaciones>();
        for (const pub of allPublications) {
          if (pub.sku && !pubsMap.has(pub.sku)) {
            pubsMap.set(pub.sku, pub);
          }
        }

        /* ---- conteo SKU ---- */
        const rawSkuCounts =
          (countsRes.data as publicaciones_por_sku[]) ?? [];

        setSkuCounts(
          rawSkuCounts.map(item => ({
            ...item,
            publication_title:
              pubsMap.get(item.sku ?? '')?.title ?? 'N/A',
          }))
        );
        setLoading(p => ({ ...p, conteoSkus: false }));

        /* ---- sku ↔ publicación ---- */
        const rawSkuMap = (mapsRes.data as skuxpublicaciones[]) ?? [];
        setSkuMap(
          rawSkuMap.map(item => {
            const pub = pubsMap.get(item.sku ?? '');
            return {
              ...item,
              company: pub?.company ?? 'N/A',
              nombre_madre: pub?.nombre_madre ?? 'N/A',
            };
          })
        );
        setLoading(p => ({ ...p, mapeoSkus: false }));

        /* ---- catálogo madre ---- */
        const rawCatalog = (catalogRes.data as catalogo_madre[]) ?? [];
        setMotherCatalog(
          rawCatalog.map(item => {
            const pub = pubsMap.get(item.sku ?? '');
            return {
              ...item,
              nombre_madre: pub?.nombre_madre ?? item.nombre_madre,
              price: pub?.price,
              publication_title: pub?.title,
            };
          })
        );
        setLoading(p => ({ ...p, catalogoMadre: false }));
      } catch (err: any) {
        setError(err.message ?? 'Error inesperado');
        setLoading({
          publicaciones: false,
          conteoSkus: false,
          mapeoSkus: false,
          catalogoMadre: false,
        });
      }
    };

    fetchData();
  }, []);

  const isLoading = Object.values(loading).some(Boolean);
  
  const renderPagination = (currentPage: number, totalPages: number, setPage: (page: number) => void) => (
    <CardFooter>
      <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
        <div>
          Página {currentPage} de {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </CardFooter>
  );
  
  const paginatedPubs = publications.slice((pages.pubs - 1) * PAGE_SIZE, pages.pubs * PAGE_SIZE);
  const totalPagesPubs = Math.ceil(publications.length / PAGE_SIZE);

  const paginatedCounts = skuCounts.slice((pages.counts - 1) * PAGE_SIZE, pages.counts * PAGE_SIZE);
  const totalPagesCounts = Math.ceil(skuCounts.length / PAGE_SIZE);

  const paginatedMap = skuMap.slice((pages.map - 1) * PAGE_SIZE, pages.map * PAGE_SIZE);
  const totalPagesMap = Math.ceil(skuMap.length / PAGE_SIZE);

  const paginatedCatalog = motherCatalog.slice((pages.catalog - 1) * PAGE_SIZE, pages.catalog * PAGE_SIZE);
  const totalPagesCatalog = Math.ceil(motherCatalog.length / PAGE_SIZE);


  /* ===================== UI ===================== */

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-6">
        <div className="flex items-center gap-4">
          <Link href="/historical-analysis">
            <Button size="icon" variant="outline">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">
            Análisis de Publicaciones y Catálogo
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/historical-analysis">
            <Button>
              <BarChart3 className="mr-2 h-4 w-4" />
              Históricos
            </Button>
          </Link>
          <GlobalNav />
          <Button variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </header>

      <main className="flex-1 space-y-8 p-6">
        {error && (
          <div className="rounded border border-red-300 bg-red-100 p-4 text-red-800">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex h-[50vh] items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* ============== PUBLICACIONES ============== */}
            <Card>
              <CardHeader>
                <CardTitle>Publicaciones Recientes</CardTitle>
                <CardDescription>Últimas publicaciones añadidas.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>ITEM_ID</TableHead>
                      <TableHead>PRODUCT_NUMBER</TableHead>
                      <TableHead>VARIATION_ID</TableHead>
                      <TableHead>TITLE</TableHead>
                      <TableHead>STATUS</TableHead>
                      <TableHead>CATEGORÍA</TableHead>
                      <TableHead className="text-right">PRICE</TableHead>
                      <TableHead>COMPANY</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPubs.map(pub => (
                      <TableRow key={pub.item_id}>
                        <TableCell className="font-mono">{pub.sku ?? 'N/A'}</TableCell>
                        <TableCell className="font-mono">{pub.item_id}</TableCell>
                        <TableCell className="font-mono">
                          {pub.product_number ?? 'N/A'}
                        </TableCell>
                        <TableCell className="font-mono">
                          {pub.variation_id ?? 'N/A'}
                        </TableCell>
                        <TableCell className="max-w-sm truncate" title={pub.title ?? ''}>
                          {pub.title}
                        </TableCell>
                        <TableCell>
                          <Badge variant={pub.status === 'active' ? 'secondary' : 'outline'}>
                            {pub.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{pub.nombre_madre ?? 'N/A'}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {new Intl.NumberFormat('es-MX', {
                            style: 'currency',
                            currency: 'MXN',
                          }).format(pub.price ?? 0)}
                        </TableCell>
                        <TableCell>{pub.company ?? 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
              {!loading.publicaciones && totalPagesPubs > 1 && renderPagination(pages.pubs, totalPagesPubs, (p) => setPages(prev => ({...prev, pubs: p})))}
            </Card>

            {/* ============== CONTEO SKU ============== */}
            <Card>
              <CardHeader>
                <CardTitle>Conteo de Publicaciones por SKU</CardTitle>
                <CardDescription>
                  SKUs ordenados por la cantidad de publicaciones.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right"># Publicaciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCounts.map((item, index) => (
                      <TableRow key={`${item.sku}-${index}`}>
                        <TableCell className="font-mono text-primary">
                          {item.sku}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.publicaciones}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
              {!loading.conteoSkus && totalPagesCounts > 1 && renderPagination(pages.counts, totalPagesCounts, (p) => setPages(prev => ({...prev, counts: p})))}
            </Card>

            {/* ============== SKU ↔ PRODUCTO MADRE ============== */}
            <Card>
              <CardHeader>
                <CardTitle>Mapeo SKU a Producto Madre</CardTitle>
                <CardDescription>
                  Relación entre SKUs, publicaciones y categoría madre.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>ID Publicación</TableHead>
                      <TableHead>Categoría Madre</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedMap.map((item, index) => (
                      <TableRow key={`${item.sku}-${item.item_id}-${index}`}>
                        <TableCell className="font-mono">
                          {item.sku ?? 'N/A'}
                        </TableCell>
                        <TableCell className="font-mono">
                          {item.item_id}
                        </TableCell>
                        <TableCell>
                          {item.nombre_madre ?? 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
              {!loading.mapeoSkus && totalPagesMap > 1 && renderPagination(pages.map, totalPagesMap, (p) => setPages(prev => ({...prev, map: p})))}
            </Card>

            {/* ============== CATÁLOGO MADRE ============== */}
            <Card>
              <CardHeader>
                <CardTitle>Catálogo de Productos Madre</CardTitle>
                <CardDescription>
                  Listado maestro de categorías principales.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Categoría Madre</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCatalog.map((item, index) => (
                      <TableRow key={`${item.sku}-${index}`}>
                        <TableCell className="font-mono">
                          {item.sku ?? 'N/A'}
                        </TableCell>
                        <TableCell>
                          {item.nombre_madre}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
              {!loading.catalogoMadre && totalPagesCatalog > 1 && renderPagination(pages.catalog, totalPagesCatalog, (p) => setPages(prev => ({...prev, catalog: p})))}
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
