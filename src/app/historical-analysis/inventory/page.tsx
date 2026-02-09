'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';

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

// ⚠️ OJO: esto NO debería ir en cliente (ver nota abajo)
import { supabase} from '@/lib/supabaseClient';

import type { categorias_madre, publicaciones, skus_unicos, skuxpublicaciones } from '@/types/database';

/* =======================
   TYPES
======================= */

// Solo lo que realmente seleccionamos de publicaciones
type PublicacionMin = Pick<publicaciones, 'sku' | 'title'>;

// Categoría madre enriquecida con título
type EnrichedCategoriaMadre = categorias_madre & {
  title?: string;
};

const PAGE_SIZE = 10;

/* =======================
   COMPONENT
======================= */

export default function InventoryAnalysisPage() {
  const { toast } = useToast();

  const [categoriasMadre, setCategoriasMadre] = React.useState<
    EnrichedCategoriaMadre[]
  >([]);
  const [loadingCategorias, setLoadingCategorias] =
    React.useState<boolean>(true);
    
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
            supabase.from('catalogo_madre').select('*').order('sku', { ascending: true }),
            supabase.from('publicaciones').select('sku, title'),
            supabase.from('skus_unicos').select('*').order('sku', { ascending: true }),
            supabase.from('skuxpublicaciones').select('*').limit(100).order('sku', { ascending: true })
        ]);

        if (catError) throw catError;
        if (pubError) throw pubError;
        if (skuError) throw skuError;
        if (skuPubError) throw skuPubError;

        /* =======================
           ENRIQUECER CATEGORÍAS
        ======================= */
        const pubMap = new Map<string, string>();
        publicacionesData?.forEach((p: PublicacionMin) => {
          if (p.sku) {
            pubMap.set(p.sku, p.title ?? '');
          }
        });
        const enriched: EnrichedCategoriaMadre[] =
          categorias?.map((cat: categorias_madre) => ({
            ...cat,
            title: pubMap.get(cat.sku),
          })) ?? [];

        setCategoriasMadre(enriched);
        setSkusUnicos(skusData || []);
        setSkuPublicaciones(skuPubData || []);

      } catch (err) {
        console.error(err);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los datos de inventario',
          variant: 'destructive',
        });
      } finally {
        setLoadingCategorias(false);
        setLoadingSkusUnicos(false);
        setLoadingSkuPublicaciones(false);
      }
    };

    fetchAllData();
  }, [toast]);

  // Pagination logic for Categorias Madre
  const totalPagesCategorias = Math.ceil(categoriasMadre.length / PAGE_SIZE);
  const paginatedCategorias = categoriasMadre.slice((pageCategorias - 1) * PAGE_SIZE, pageCategorias * PAGE_SIZE);

  // Pagination logic for SKUs Unicos
  const totalPagesSkus = Math.ceil(skusUnicos.length / PAGE_SIZE);
  const paginatedSkus = skusUnicos.slice((pageSkus - 1) * PAGE_SIZE, pageSkus * PAGE_SIZE);

  // Pagination logic for SKUxPublicaciones
  const totalPagesSkuPub = Math.ceil(skuPublicaciones.length / PAGE_SIZE);
  const paginatedSkuPub = skuPublicaciones.slice((pageSkuPub - 1) * PAGE_SIZE, pageSkuPub * PAGE_SIZE);

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

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-6">
        <div className="flex items-center gap-4">
          <Link href="/historical-analysis">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Análisis de Inventario</h1>
        </div>
        <GlobalNav />
      </header>

      {/* ================= MAIN ================= */}
      <main className="flex-1 p-6">
        <Tabs defaultValue="categorias">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="categorias">
              Categorías Madre
            </TabsTrigger>
             <TabsTrigger value="skus_unicos">
              SKUs Únicos
            </TabsTrigger>
            <TabsTrigger value="skuxpublicaciones">
              Mapeo SKU a Publicación
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categorias">
            <Card>
              <CardHeader>
                <CardTitle>Categorías Madre</CardTitle>
                <CardDescription>
                  Información logística y estructural por categoría
                </CardDescription>
              </CardHeader>

              <CardContent>
                {loadingCategorias ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Título</TableHead>
                        <TableHead className="text-right">
                          Landed Cost
                        </TableHead>
                        <TableHead className="text-right">
                          Tiempo de preparación
                        </TableHead>
                        <TableHead className="text-right">
                          Tiempo de recompra
                        </TableHead>
                        <TableHead>Proveedor</TableHead>
                        <TableHead className="text-right">
                          Piezas / SKU
                        </TableHead>
                        <TableHead className="text-right">
                          Piezas / Contenedor
                        </TableHead>
                        <TableHead>Bodega</TableHead>
                        <TableHead>Bloque</TableHead>
                        
            
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {paginatedCategorias.map((cat) => (
                        <TableRow key={cat.sku}>
                          <TableCell className="font-mono">
                            {cat.sku}
                          </TableCell>
                          <TableCell>{cat.title || 'N/A'}</TableCell>
                          <TableCell className="text-right font-medium">
                            {new Intl.NumberFormat('es-MX', {
                              style: 'currency',
                              currency: 'MXN',
                            }).format(cat.landed_cost || 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            {cat.tiempo_preparacion ?? '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {cat.tiempo_recompra ?? '-'}
                          </TableCell>
                          <TableCell>{cat.proveedor || 'N/A'}</TableCell>
                          <TableCell className="text-right">
                            {cat.piezas_por_sku ?? '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {cat.piezas_por_contenedor ?? '-'}
                          </TableCell>
                          <TableCell>{cat.bodega || '-'}</TableCell>
                          <TableCell>{cat.bloque || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
              {!loadingCategorias && totalPagesCategorias > 1 && renderPagination(pageCategorias, totalPagesCategorias, setPageCategorias)}
            </Card>
          </TabsContent>
          <TabsContent value="skus_unicos">
            <Card>
                <CardHeader>
                    <CardTitle>SKUs Únicos</CardTitle>
                    <CardDescription>
                        Información detallada sobre cada SKU único en el inventario.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingSkusUnicos ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Categoría</TableHead>
                                    <TableHead className="text-right">Tiempo de preparación</TableHead>
                                    <TableHead className="text-right">Landed Cost</TableHead>
                                    <TableHead className="text-right">Tiempo de preparación</TableHead>
                                    <TableHead className="text-right">Tiempo de recompra</TableHead>
                                    <TableHead className="text-right">Proveedor</TableHead>                                    
                                    <TableHead className="text-right">Piezas por contenedor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedSkus.map((sku) => (
                                    <TableRow key={sku.sku}>
                                        <TableCell className="font-mono">{sku.sku}</TableCell>
                                        <TableCell>{sku.nombre_madre || 'N/A'}</TableCell>
                                        <TableCell className="text-right">{sku.tiempo_de_preparacion ?? '-'}</TableCell>
                                        <TableCell className="text-right font-medium">
                                            {new Intl.NumberFormat('es-MX', {
                                                style: 'currency',
                                                currency: 'MXN',
                                            }).format(sku.landed_cost || 0)}
                                        </TableCell>
                                        <TableCell className="text-right">{sku.de_recompra ?? '-'}</TableCell>
                                        <TableCell className="text-right">{sku.proveedor ?? '-'}</TableCell>
                                        <TableCell className="text-right">{sku.piezas_por_contenedor ?? '-'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
                {!loadingSkusUnicos && totalPagesSkus > 1 && renderPagination(pageSkus, totalPagesSkus, setPageSkus)}
            </Card>
        </TabsContent>
        <TabsContent value="skuxpublicaciones">
            <Card>
                <CardHeader>
                    <CardTitle>SKUxPublicaciones</CardTitle>
                    <CardDescription>
                        Relación entre SKUs, sus publicaciones y su categoría madre.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingSkuPublicaciones ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>ID de Publicación</TableHead>
                                    <TableHead>Categoría Madre</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedSkuPub.map((item, index) => (
                                    <TableRow key={`${item.sku}-${item.item_id}-${index}`}>
                                        <TableCell className="font-mono">{item.sku}</TableCell>
                                        <TableCell className="font-mono text-muted-foreground">{item.item_id}</TableCell>
                                        <TableCell className="font-medium">{item.nombre_madre}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
                {!loadingSkuPublicaciones && totalPagesSkuPub > 1 && renderPagination(pageSkuPub, totalPagesSkuPub, setPageSkuPub)}
            </Card>
        </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
