'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Package, Layers, FileCode, DollarSign } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import GlobalNav from '@/components/global-nav';
import { supabase } from '@/lib/supabaseClient';
import type { categorias_madre, publicaciones, skus_unicos, skuxpublicaciones } from '@/types/database';

type PublicacionMin = Pick<publicaciones, 'sku' | 'title'>;
type EnrichedCategoriaMadre = categorias_madre & { title?: string };

const PAGE_SIZE = 10;

type ProveedorCount = {
  name: string;
  count: number;
};

export default function InventoryAnalysisPage() {
  const { toast } = useToast();

  const [categoriasMadre, setCategoriasMadre] = React.useState<EnrichedCategoriaMadre[]>([]);
  const [loadingCategorias, setLoadingCategorias] = React.useState<boolean>(true);
    
  const [skusUnicos, setSkusUnicos] = React.useState<skus_unicos[]>([]);
  const [loadingSkusUnicos, setLoadingSkusUnicos] = React.useState<boolean>(true);

  const [skuPublicaciones, setSkuPublicaciones] = React.useState<skuxpublicaciones[]>([]);
  const [loadingSkuPublicaciones, setLoadingSkuPublicaciones] = React.useState<boolean>(true);

  const [pageCategorias, setPageCategorias] = React.useState(1);
  const [pageSkus, setPageSkus] = React.useState(1);
  const [pageSkuPub, setPageSkuPub] = React.useState(1);

  React.useEffect(() => {
    const fetchAllData = async () => {
      setLoadingCategorias(true);
      setLoadingSkusUnicos(true);
      setLoadingSkuPublicaciones(true);

      try {
        const [
            { data: categorias, error: catError },
            { data: publicacionesData, error: pubError },
            { data: skusData, error: skuError },
            { data: skuPubData, error: skuPubError }
        ] = await Promise.all([
            supabase.from('categorias_madre').select('*').order('sku', { ascending: true }),
            supabase.from('publicaciones').select('sku, title'),
            supabase.from('skus_unicos').select('*').order('sku', { ascending: true }),
            supabase.from('skuxpublicaciones').select('*').limit(100).order('sku', { ascending: true })
        ]);

        if (catError) throw catError;
        if (pubError) throw pubError;
        if (skuError) throw skuError;
        if (skuPubError) throw skuPubError;

        const pubMap = new Map<string, string>();
        publicacionesData?.forEach((p: PublicacionMin) => {
          if (p.sku) pubMap.set(p.sku, p.title ?? '');
        });
        const enriched: EnrichedCategoriaMadre[] = categorias?.map((cat: categorias_madre) => ({ ...cat, title: pubMap.get(cat.sku) })) ?? [];

        setCategoriasMadre(enriched);
        setSkusUnicos(skusData || []);
        setSkuPublicaciones(skuPubData || []);

      } catch (err) {
        console.error(err);
        toast({ title: 'Error', description: 'No se pudieron cargar los datos de inventario', variant: 'destructive' });
      } finally {
        setLoadingCategorias(false);
        setLoadingSkusUnicos(false);
        setLoadingSkuPublicaciones(false);
      }
    };

    fetchAllData();
  }, [toast]);

  const { kpis, topProveedores } = React.useMemo(() => {
    const totalCategorias = categoriasMadre.length;
    const totalSkus = skusUnicos.length;
    const totalMapeos = skuPublicaciones.length;
    const landedCosts = categoriasMadre.map(c => c.landed_cost).filter(Boolean);
    const avgLandedCost = landedCosts.length > 0 ? landedCosts.reduce((a, b) => a + b, 0) / landedCosts.length : 0;
    
    const proveedorCounts: Record<string, number> = {};
    categoriasMadre.forEach(cat => {
        if (cat.proveedor) {
            proveedorCounts[cat.proveedor] = (proveedorCounts[cat.proveedor] || 0) + 1;
        }
    });

    const topProveedoresData = Object.entries(proveedorCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    return {
        kpis: { totalCategorias, totalSkus, totalMapeos, avgLandedCost },
        topProveedores: topProveedoresData
    };
  }, [categoriasMadre, skusUnicos, skuPublicaciones]);

  const totalPagesCategorias = Math.ceil(categoriasMadre.length / PAGE_SIZE);
  const paginatedCategorias = categoriasMadre.slice((pageCategorias - 1) * PAGE_SIZE, pageCategorias * PAGE_SIZE);

  const totalPagesSkus = Math.ceil(skusUnicos.length / PAGE_SIZE);
  const paginatedSkus = skusUnicos.slice((pageSkus - 1) * PAGE_SIZE, pageSkus * PAGE_SIZE);

  const totalPagesSkuPub = Math.ceil(skuPublicaciones.length / PAGE_SIZE);
  const paginatedSkuPub = skuPublicaciones.slice((pageSkuPub - 1) * PAGE_SIZE, pageSkuPub * PAGE_SIZE);

  const renderPagination = (currentPage: number, totalPages: number, setPage: (page: number) => void) => (
    <CardFooter>
      <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
        <div>Página {currentPage} de {totalPages}</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>Anterior</Button>
          <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>Siguiente</Button>
        </div>
      </div>
    </CardFooter>
  );

  const isLoading = loadingCategorias || loadingSkusUnicos || loadingSkuPublicaciones;

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-6">
        <div className="flex items-center gap-4">
          <Link href="/historical-analysis"><Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-xl font-bold">Análisis de Inventario</h1>
        </div>
        <GlobalNav />
      </header>

      <main className="flex-1 p-6 space-y-6">
        {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Categorías Madre</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpis.totalCategorias}</div>
                  <p className="text-xs text-muted-foreground">Total de categorías principales</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">SKUs Únicos</CardTitle>
                  <Layers className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpis.totalSkus}</div>
                  <p className="text-xs text-muted-foreground">Total de SKUs únicos registrados</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Mapeos SKU-Publicación</CardTitle>
                  <FileCode className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpis.totalMapeos}</div>
                  <p className="text-xs text-muted-foreground">Relaciones entre SKU y publicación</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Costo de Aterrizaje Promedio</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(kpis.avgLandedCost)}</div>
                  <p className="text-xs text-muted-foreground">Costo promedio por categoría madre</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top 5 Proveedores por # de SKUs</CardTitle>
                    <CardDescription>Proveedores con la mayor cantidad de SKUs asociados en "Categorías Madre".</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={topProveedores} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={100} />
                        <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
                        <Legend />
                        <Bar dataKey="count" name="# de SKUs" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                
                <Tabs defaultValue="categorias" className="lg:col-span-1 w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="categorias">Categorías Madre</TabsTrigger>
                    <TabsTrigger value="skus_unicos">SKUs Únicos</TabsTrigger>
                    <TabsTrigger value="skuxpublicaciones">Mapeo SKU-Pub</TabsTrigger>
                  </TabsList>
                  <TabsContent value="categorias">
                    <Card>
                      <CardHeader><CardTitle>Categorías Madre</CardTitle><CardDescription>Información logística por categoría.</CardDescription></CardHeader>
                      <CardContent><Table><TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Título</TableHead><TableHead className="text-right">Landed Cost</TableHead></TableRow></TableHeader><TableBody>{paginatedCategorias.map((cat) => (<TableRow key={cat.sku}><TableCell className="font-mono">{cat.sku}</TableCell><TableCell>{cat.title || 'N/A'}</TableCell><TableCell className="text-right font-medium">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cat.landed_cost || 0)}</TableCell></TableRow>))}</TableBody></Table></CardContent>
                      {!loadingCategorias && totalPagesCategorias > 1 && renderPagination(pageCategorias, totalPagesCategorias, setPageCategorias)}
                    </Card>
                  </TabsContent>
                  <TabsContent value="skus_unicos">
                    <Card>
                        <CardHeader><CardTitle>SKUs Únicos</CardTitle><CardDescription>Información detallada de cada SKU.</CardDescription></CardHeader>
                        <CardContent><Table><TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Categoría</TableHead><TableHead className="text-right">Landed Cost</TableHead></TableRow></TableHeader><TableBody>{paginatedSkus.map((sku) => (<TableRow key={sku.sku}><TableCell className="font-mono">{sku.sku}</TableCell><TableCell>{sku.nombre_madre || 'N/A'}</TableCell><TableCell className="text-right font-medium">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(sku.landed_cost || 0)}</TableCell></TableRow>))}</TableBody></Table></CardContent>
                        {!loadingSkusUnicos && totalPagesSkus > 1 && renderPagination(pageSkus, totalPagesSkus, setPageSkus)}
                    </Card>
                  </TabsContent>
                  <TabsContent value="skuxpublicaciones">
                    <Card>
                        <CardHeader><CardTitle>SKUxPublicaciones</CardTitle><CardDescription>Relación entre SKUs y publicaciones.</CardDescription></CardHeader>
                        <CardContent><Table><TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>ID de Publicación</TableHead><TableHead>Categoría Madre</TableHead></TableRow></TableHeader><TableBody>{paginatedSkuPub.map((item, index) => (<TableRow key={`${item.sku}-${item.item_id}-${index}`}><TableCell className="font-mono">{item.sku}</TableCell><TableCell className="font-mono text-muted-foreground">{item.item_id}</TableCell><TableCell className="font-medium">{item.nombre_madre}</TableCell></TableRow>))}</TableBody></Table></CardContent>
                        {!loadingSkuPublicaciones && totalPagesSkuPub > 1 && renderPagination(pageSkuPub, totalPagesSkuPub, setPageSkuPub)}
                    </Card>
                  </TabsContent>
                </Tabs>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

    