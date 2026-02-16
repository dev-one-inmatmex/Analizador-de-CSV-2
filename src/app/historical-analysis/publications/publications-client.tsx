'use client';

import * as React from 'react';
import { DollarSign, AlertTriangle, Layers, Tag, ClipboardList, Loader2, Link2, ScanBarcode } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart, CartesianGrid, Tooltip, XAxis, YAxis, Bar, ResponsiveContainer } from 'recharts';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { EnrichedMotherCatalog, EnrichedPublicationCount, EnrichedSkuMap } from './page';
import type { publi_xsku, publi_tienda } from '@/types/database';

type ProductsData = {
    publications: any[];
    skuCounts: EnrichedPublicationCount[];
    skuMap: EnrichedSkuMap[];
    motherCatalog: EnrichedMotherCatalog[];
    error: string | null;
}

const PAGE_SIZE = 10;

export default function PublicationsClient({ productsData }: { productsData: ProductsData }) {
    const [isClient, setIsClient] = React.useState(false);
    React.useEffect(() => {
        setIsClient(true);
    }, []);

    const { publications, skuCounts, skuMap, motherCatalog } = productsData;
    const [productPages, setProductPages] = React.useState({ pubs: 1, counts: 1, map: 1, catalog: 1 });

    const { productsKpis, statusChartData } = React.useMemo(() => {
        const prices = publications.map(p => p.price).filter((p): p is number => p !== null && p !== undefined);
        const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
        
        const statusCounts: Record<string, number> = {};
        publications.forEach(pub => {
            const status = pub.status || 'desconocido';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        const chartData = Object.entries(statusCounts).map(([name, count]) => ({ name, count }));

        return {
            productsKpis: {
                totalPublications: publications.length,
                totalSkuWithPublications: skuCounts.length,
                totalMotherCatalogs: motherCatalog.length,
                averagePrice: avgPrice,
            },
            statusChartData: chartData
        };
    }, [publications, skuCounts, motherCatalog]);
    
    const renderProductsPagination = (currentPage: number, totalPages: number, setPage: (page: number) => void) => (
        <CardFooter>
            <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
                <div>Página {currentPage} de {totalPages}</div>
                <div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>Anterior</Button><Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>Siguiente</Button></div>
            </div>
        </CardFooter>
    );

    const paginatedPubs = publications.slice((productPages.pubs - 1) * PAGE_SIZE, productPages.pubs * PAGE_SIZE);
    const totalPagesPubs = Math.ceil(publications.length / PAGE_SIZE);

    const paginatedCounts = skuCounts.slice((productPages.counts - 1) * PAGE_SIZE, productPages.counts * PAGE_SIZE);
    const totalPagesCounts = Math.ceil(skuCounts.length / PAGE_SIZE);

    const paginatedMap = skuMap.slice((productPages.map - 1) * PAGE_SIZE, productPages.map * PAGE_SIZE);
    const totalPagesMap = Math.ceil(skuMap.length / PAGE_SIZE);

    const paginatedCatalog = motherCatalog.slice((productPages.catalog - 1) * PAGE_SIZE, productPages.catalog * PAGE_SIZE);
    const totalPagesCatalog = Math.ceil(motherCatalog.length / PAGE_SIZE);

    if (!isClient) {
        return (
          <div className="flex h-full flex-1 items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        );
    }
    
    return (
        <>
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
                <div className="flex flex-wrap items-center gap-4">
                  <SidebarTrigger />
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold tracking-tight">Análisis de Publicaciones</h1>
                  </div>
                </div>
            </header>

            <main className="flex flex-1 flex-col items-center p-4 md:p-10">
                <div className="w-full max-w-7xl space-y-8">
                    {productsData.error ? (
                        <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error al cargar datos de publicaciones</AlertTitle><AlertDescription>{productsData.error}</AlertDescription></Alert>
                    ) : (
                    <>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Publicaciones</CardTitle><ClipboardList className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{productsKpis.totalPublications}</div></CardContent></Card>
                            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">SKUs con Publicación</CardTitle><Layers className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{productsKpis.totalSkuWithPublications}</div></CardContent></Card>
                            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Categorías Madre</CardTitle><Tag className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{productsKpis.totalMotherCatalogs}</div></CardContent></Card>
                            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Precio Promedio</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(productsKpis.averagePrice)}</div></CardContent></Card>
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
                                <TableHead className="text-right"># Publicaciones</TableHead>
                            </TableRow></TableHeader><TableBody>{skuCounts.slice(0, 10).map((item: EnrichedPublicationCount, index: number) => (<TableRow key={`${item.sku}-${index}`}><TableCell className="font-mono text-primary">{item.sku}</TableCell><TableCell className="text-right font-medium">{item.num_publicaciones}</TableCell></TableRow>))}</TableBody></Table></CardContent>
                            </Card>
                        </div>

                        <div className="space-y-8">
                        <Card>
                            <CardHeader><CardTitle>Publicaciones Recientes</CardTitle><CardDescription>Últimas publicaciones añadidas.</CardDescription></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead># de publicación</TableHead>
                                            <TableHead>SKU</TableHead>
                                            <TableHead># de producto</TableHead>
                                            <TableHead>Título</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead>Categoría</TableHead>
                                            <TableHead className="text-right">Precio</TableHead>
                                            <TableHead>Compañía</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedPubs.map(pub => (
                                            <TableRow key={pub.num_publi}>
                                                <TableCell className="font-mono">{pub.num_publi}</TableCell>
                                                <TableCell className="font-mono">{pub.sku ?? 'N/A'}</TableCell>
                                                <TableCell className="font-mono text-xs">{pub.num_producto ?? 'N/A'}</TableCell>
                                                <TableCell className="max-w-sm truncate" title={pub.titulo ?? ''}>{pub.title}</TableCell>
                                                <TableCell><Badge variant={pub.status === 'active' ? 'secondary' : 'outline'}>{pub.status}</Badge></TableCell>
                                                <TableCell>{pub.cat_mdr ?? 'N/A'}</TableCell>
                                                <TableCell className="text-right font-semibold">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(pub.costo ?? 0)}</TableCell>
                                                <TableCell>{pub.tienda ?? 'N/A'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                            {totalPagesPubs > 1 && renderProductsPagination(productPages.pubs, totalPagesPubs, (p) => setProductPages(prev => ({...prev, pubs: p})))}
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Mapeo SKU a Producto Madre</CardTitle><CardDescription>Relación entre SKUs, publicaciones y categoría madre.</CardDescription></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>SKU</TableHead>
                                            <TableHead>ID Publicación</TableHead>
                                            <TableHead>Categoría Madre</TableHead>
                                            <TableHead>Compañía</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedMap.map((item: EnrichedSkuMap, index: number) => (
                                            <TableRow key={`${item.sku}-${item.item_id}-${index}`}>
                                                <TableCell className="font-mono">{item.sku ?? 'N/A'}</TableCell>
                                                <TableCell className="font-mono">{item.item_id}</TableCell>
                                                <TableCell>{item.nombre_madre ?? 'N/A'}</TableCell>
                                                <TableCell>{item.company ?? 'N/A'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                            {totalPagesMap > 1 && renderProductsPagination(productPages.map, totalPagesMap, (p) => setProductPages(prev => ({...prev, map: p})))}
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Catálogo de Productos Madre</CardTitle><CardDescription>Listado maestro de categorías principales.</CardDescription></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>SKU</TableHead>
                                            <TableHead>Categoría Madre</TableHead>
                                            <TableHead>Título Publicación</TableHead>
                                            <TableHead className="text-right">Precio</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedCatalog.map((item: EnrichedMotherCatalog, index: number) => (
                                            <TableRow key={`${item.sku}-${index}`}>
                                                <TableCell className="font-mono">{item.sku ?? 'N/A'}</TableCell>
                                                <TableCell>{item.nombre_madre}</TableCell>
                                                <TableCell className="max-w-sm truncate" title={item.publication_title ?? ''}>{item.publication_title ?? 'N/A'}</TableCell>
                                                <TableCell className="text-right font-semibold">{item.price ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(item.price) : 'N/A'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                            {totalPagesCatalog > 1 && renderProductsPagination(productPages.catalog, totalPagesCatalog, (p) => setProductPages(prev => ({...prev, catalog: p})))}
                        </Card>
                        </div>
                    </>
                    )}
                </div>
            </main>
        </>
    );
}
