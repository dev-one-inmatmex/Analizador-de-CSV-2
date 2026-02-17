'use client';

import * as React from 'react';
import { DollarSign, AlertTriangle, Layers, ClipboardList, Loader2 } from 'lucide-react';
import { BarChart, CartesianGrid, Tooltip, XAxis, YAxis, Bar, ResponsiveContainer } from 'recharts';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { EnrichedPublicationCount } from './page';
import type { publi_tienda } from '@/types/database';

type ProductsData = {
    publications: publi_tienda[];
    skuCounts: EnrichedPublicationCount[];
    error: string | null;
}

const PAGE_SIZE = 10;

export default function PublicationsClient({ productsData }: { productsData: ProductsData }) {
    const [isClient, setIsClient] = React.useState(false);
    React.useEffect(() => {
        setIsClient(true);
    }, []);

    const { publications, skuCounts } = productsData;
    const [productPages, setProductPages] = React.useState({ pubs: 1, counts: 1 });

    const { productsKpis, statusChartData } = React.useMemo(() => {
        if (!publications || !skuCounts) {
            return {
                productsKpis: {
                    totalPublications: 0,
                    totalSkuWithPublications: 0,
                    averagePrice: 0,
                },
                statusChartData: []
            };
        }
        const prices = publications.map(p => p.costo).filter((p): p is number => p !== null && p !== undefined);
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
                averagePrice: avgPrice,
            },
            statusChartData: chartData
        };
    }, [publications, skuCounts]);
    
    const renderProductsPagination = (currentPage: number, totalPages: number, setPage: (page: number) => void) => (
        <CardFooter>
            <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
                <div>Página {currentPage} de {totalPages}</div>
                <div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>Anterior</Button><Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>Siguiente</Button></div>
            </div>
        </CardFooter>
    );

    const paginatedPubs = publications ? publications.slice((productPages.pubs - 1) * PAGE_SIZE, productPages.pubs * PAGE_SIZE) : [];
    const totalPagesPubs = publications ? Math.ceil(publications.length / PAGE_SIZE) : 0;

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
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Publicaciones</CardTitle><ClipboardList className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{productsKpis.totalPublications}</div></CardContent></Card>
                            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">SKUs con Publicación</CardTitle><Layers className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{productsKpis.totalSkuWithPublications}</div></CardContent></Card>
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
                            </TableRow></TableHeader><TableBody>{skuCounts && skuCounts.slice(0, 10).map((item: EnrichedPublicationCount, index: number) => (<TableRow key={`${item.sku}-${index}`}><TableCell className="font-mono text-primary">{item.sku}</TableCell><TableCell className="text-right font-medium">{item.num_publicaciones}</TableCell></TableRow>))}</TableBody></Table></CardContent>
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
                                                <TableCell className="max-w-sm truncate" title={pub.titulo ?? ''}>{pub.titulo}</TableCell>
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
                        </div>
                    </>
                    )}
                </div>
            </main>
        </>
    );
}
