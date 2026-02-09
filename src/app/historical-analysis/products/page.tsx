'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { publicaciones, publicaciones_por_sku, skuxpublicaciones, catalogo_madre } from '@/types/database';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Loader2, ClipboardList, Layers, Tag, DollarSign } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { SidebarTrigger } from '@/components/ui/sidebar';

type EnrichedPublicationCount = publicaciones_por_sku & { publication_title?: string };
type EnrichedSkuMap = skuxpublicaciones & { company?: string; nombre_madre?: string };
type EnrichedMotherCatalog = catalogo_madre & { publication_title?: string; price?: number; nombre_madre?: string };
type LoadingState = { publicaciones: boolean; conteoSkus: boolean; mapeoSkus: boolean; catalogoMadre: boolean };

const PAGE_SIZE = 10;

export default function ProductsPage() {
  const [publications, setPublications] = useState<publicaciones[]>([]);
  const [skuCounts, setSkuCounts] = useState<EnrichedPublicationCount[]>([]);
  const [skuMap, setSkuMap] = useState<EnrichedSkuMap[]>([]);
  const [motherCatalog, setMotherCatalog] = useState<EnrichedMotherCatalog[]>([]);

  const [loading, setLoading] = useState<LoadingState>({ publicaciones: true, conteoSkus: true, mapeoSkus: true, catalogoMadre: true });
  const [error, setError] = useState<string | null>(null);

  const [pages, setPages] = useState({ pubs: 1, counts: 1, map: 1, catalog: 1 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pubsRes, countsRes, mapsRes, catalogRes] = await Promise.all([
          supabase.from('publicaciones').select('*'),
          supabase.from('publicaciones_por_sku').select('*').order('publicaciones', { ascending: false }),
          supabase.from('skuxpublicaciones').select('*').limit(100),
          supabase.from('catalogo_madre').select('*').order('nombre_madre', { ascending: true }),
        ]);

        if (pubsRes.error) throw pubsRes.error;
        if (countsRes.error) throw countsRes.error;
        if (mapsRes.error) throw mapsRes.error;
        if (catalogRes.error) throw catalogRes.error;

        const allPublications = (pubsRes.data as publicaciones[]) ?? [];
        setPublications(allPublications.sort((a, b) => new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime()));
        setLoading(p => ({ ...p, publicaciones: false }));

        const pubsMap = new Map<string, publicaciones>();
        for (const pub of allPublications) {
          if (pub.sku && !pubsMap.has(pub.sku)) pubsMap.set(pub.sku, pub);
        }

        const rawSkuCounts = (countsRes.data as publicaciones_por_sku[]) ?? [];
        setSkuCounts(rawSkuCounts.map(item => ({ ...item, publication_title: pubsMap.get(item.sku ?? '')?.title ?? 'N/A' })));
        setLoading(p => ({ ...p, conteoSkus: false }));

        const rawSkuMap = (mapsRes.data as skuxpublicaciones[]) ?? [];
        setSkuMap(rawSkuMap.map(item => ({ ...item, company: pubsMap.get(item.sku ?? '')?.company ?? 'N/A', nombre_madre: pubsMap.get(item.sku ?? '')?.nombre_madre ?? 'N/A' })));
        setLoading(p => ({ ...p, mapeoSkus: false }));

        const rawCatalog = (catalogRes.data as catalogo_madre[]) ?? [];
        setMotherCatalog(rawCatalog.map(item => {
            const pub = pubsMap.get(item.sku ?? '');
            return { ...item, nombre_madre: pub?.nombre_madre ?? item.nombre_madre, price: pub?.price, publication_title: pub?.title };
        }));
        setLoading(p => ({ ...p, catalogoMadre: false }));
      } catch (err: any) {
        setError(err.message ?? 'Error inesperado');
        setLoading({ publicaciones: false, conteoSkus: false, mapeoSkus: false, catalogoMadre: false });
      }
    };
    fetchData();
  }, []);
  
  const { kpis, statusChartData } = useMemo(() => {
    const prices = publications.map(p => p.price).filter((p): p is number => p !== null && p !== undefined);
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    
    const statusCounts: Record<string, number> = {};
    publications.forEach(pub => {
      const status = pub.status || 'desconocido';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const chartData = Object.entries(statusCounts).map(([name, count]) => ({ name, count }));

    return {
      kpis: {
        totalPublications: publications.length,
        totalSkuWithPublications: skuCounts.length,
        totalMotherCatalogs: motherCatalog.length,
        averagePrice: avgPrice,
      },
      statusChartData: chartData
    };
  }, [publications, skuCounts, motherCatalog]);

  const isLoading = Object.values(loading).some(Boolean);
  
  const renderPagination = (currentPage: number, totalPages: number, setPage: (page: number) => void) => (
    <CardFooter>
      <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
        <div>Página {currentPage} de {totalPages}</div>
        <div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>Anterior</Button><Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>Siguiente</Button></div>
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

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-xl font-bold">Análisis de Publicaciones y Catálogo</h1>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center p-6">
        <div className="w-full max-w-7xl space-y-8">
            {error && (<div className="rounded border border-red-300 bg-red-100 p-4 text-red-800">{error}</div>)}
            {isLoading ? (<div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>) : (
            <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Publicaciones</CardTitle><ClipboardList className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{kpis.totalPublications}</div></CardContent></Card>
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">SKUs con Publicación</CardTitle><Layers className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{kpis.totalSkuWithPublications}</div></CardContent></Card>
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Categorías Madre</CardTitle><Tag className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{kpis.totalMotherCatalogs}</div></CardContent></Card>
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Precio Promedio</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(kpis.averagePrice)}</div></CardContent></Card>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                    <CardHeader><CardTitle>Publicaciones por Estado</CardTitle><CardDescription>Distribución de las publicaciones según su estado actual.</CardDescription></CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={statusChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis allowDecimals={false} />
                            <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
                            <Bar dataKey="count" name="# de Publicaciones" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                    </Card>
                    <Card>
                    <CardHeader><CardTitle>Conteo de Publicaciones por SKU</CardTitle><CardDescription>SKUs con mayor cantidad de publicaciones. (Top 10)</CardDescription></CardHeader>
                    <CardContent><Table><TableHeader><TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Título de Ejemplo</TableHead>
                        <TableHead className="text-right"># Publicaciones</TableHead>
                    </TableRow></TableHeader><TableBody>{skuCounts.slice(0, 10).map((item, index) => (<TableRow key={`${item.sku}-${index}`}><TableCell className="font-mono text-primary">{item.sku}</TableCell><TableCell className="max-w-xs truncate">{item.publication_title}</TableCell><TableCell className="text-right font-medium">{item.publicaciones}</TableCell></TableRow>))}</TableBody></Table></CardContent>
                    </Card>
                </div>

                <div className="space-y-8">
                <Card><CardHeader><CardTitle>Publicaciones Recientes</CardTitle><CardDescription>Últimas publicaciones añadidas.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>ITEM_ID</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Compañía</TableHead>
                    <TableHead>Categoría Madre</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead>Fecha Creación</TableHead>
                </TableRow></TableHeader><TableBody>{paginatedPubs.map(pub => (<TableRow key={pub.item_id}>
                    <TableCell className="font-mono">{pub.sku ?? 'N/A'}</TableCell>
                    <TableCell className="font-mono">{pub.item_id}</TableCell>
                    <TableCell className="max-w-sm truncate" title={pub.title ?? ''}>{pub.title}</TableCell>
                    <TableCell>{pub.company ?? 'N/A'}</TableCell>
                    <TableCell>{pub.nombre_madre ?? 'N/A'}</TableCell>
                    <TableCell><Badge variant={pub.status === 'active' ? 'secondary' : 'outline'}>{pub.status}</Badge></TableCell>
                    <TableCell className="text-right font-semibold">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(pub.price ?? 0)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{pub.created_at ? format(new Date(pub.created_at), 'dd MMM yyyy', { locale: es }) : 'N/A'}</TableCell>
                </TableRow>))}</TableBody></Table></CardContent>{!loading.publicaciones && totalPagesPubs > 1 && renderPagination(pages.pubs, totalPagesPubs, (p) => setPages(prev => ({...prev, pubs: p})))}</Card>
                <Card><CardHeader><CardTitle>Mapeo SKU a Producto Madre</CardTitle><CardDescription>Relación entre SKUs, publicaciones y categoría madre.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>ID Publicación</TableHead><TableHead>Categoría Madre</TableHead></TableRow></TableHeader><TableBody>{paginatedMap.map((item, index) => (<TableRow key={`${item.sku}-${item.item_id}-${index}`}><TableCell className="font-mono">{item.sku ?? 'N/A'}</TableCell><TableCell className="font-mono">{item.item_id}</TableCell><TableCell>{item.nombre_madre ?? 'N/A'}</TableCell></TableRow>))}</TableBody></Table></CardContent>{!loading.mapeoSkus && totalPagesMap > 1 && renderPagination(pages.map, totalPagesMap, (p) => setPages(prev => ({...prev, map: p})))}</Card>
                <Card><CardHeader><CardTitle>Catálogo de Productos Madre</CardTitle><CardDescription>Listado maestro de categorías principales.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Categoría Madre</TableHead></TableRow></TableHeader><TableBody>{paginatedCatalog.map((item, index) => (<TableRow key={`${item.sku}-${index}`}><TableCell className="font-mono">{item.sku ?? 'N/A'}</TableCell><TableCell>{item.nombre_madre}</TableCell></TableRow>))}</TableBody></Table></CardContent>{!loading.catalogoMadre && totalPagesCatalog > 1 && renderPagination(pages.catalog, totalPagesCatalog, (p) => setPages(prev => ({...prev, catalog: p})))}</Card>
                </div>
            </>
            )}
        </div>
      </main>
    </>
  );
}
