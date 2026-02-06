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

import type { categorias_madre, publicaciones, skus_unicos } from '@/types/database';

/* =======================
   TYPES
======================= */

// Solo lo que realmente seleccionamos de publicaciones
type PublicacionMin = Pick<publicaciones, 'sku' | 'title'>;

// Categoría madre enriquecida con título
type EnrichedCategoriaMadre = categorias_madre & {
  title?: string;
};

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


  React.useEffect(() => {
    const fetchAllData = async () => {
      setLoadingCategorias(true);
      setLoadingSkusUnicos(true);

      try {
        const [
            { data: categorias, error: catError },
            { data: publicacionesData, error: pubError },
            { data: skusData, error: skuError }
        ] = await Promise.all([
            supabase.from('categorias_madre').select('*').order('sku', { ascending: true }),
            supabase.from('publicaciones').select('sku, title'),
            supabase.from('skus_unicos').select('*').order('sku', { ascending: true })
        ]);

        if (catError) throw catError;
        if (pubError) throw pubError;
        if (skuError) throw skuError;

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
      }
    };

    fetchAllData();
  }, [toast]);

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
          <TabsList>
            <TabsTrigger value="categorias">
              Categorías Madre
            </TabsTrigger>
             <TabsTrigger value="skus_unicos">
              SKUs Únicos
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
                        <TableHead>Proveedor</TableHead>
                        <TableHead className="text-right">
                          Piezas / SKU
                        </TableHead>
                        <TableHead className="text-right">
                          Piezas / Contenedor
                        </TableHead>
                        <TableHead>Bodega</TableHead>
                        <TableHead>Bloque</TableHead>
                        <TableHead className="text-right">
                          Tiempo Producción
                        </TableHead>
                        <TableHead className="text-right">
                          Tiempo Recompra
                        </TableHead>
                        <TableHead className="text-right">
                          Costo Landed
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {categoriasMadre.map((cat) => (
                        <TableRow key={cat.sku}>
                          <TableCell className="font-mono">
                            {cat.sku}
                          </TableCell>
                          <TableCell>{cat.title || 'N/A'}</TableCell>
                          <TableCell>{cat.proveedor || 'N/A'}</TableCell>
                          <TableCell className="text-right">
                            {cat.piezas_por_sku ?? '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {cat.piezas_por_contenedor ?? '-'}
                          </TableCell>
                          <TableCell>{cat.bodega || '-'}</TableCell>
                          <TableCell>{cat.bloque || '-'}</TableCell>
                          <TableCell className="text-right">
                            {cat.tiempo_preparacion ?? '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {cat.tiempo_recompra ?? '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {new Intl.NumberFormat('es-MX', {
                              style: 'currency',
                              currency: 'MXN',
                            }).format(cat.landed_cost || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
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
                                    <TableHead>Nombre Madre</TableHead>
                                    <TableHead>Proveedor</TableHead>
                                    <TableHead className="text-right">Tiempo Preparación (días)</TableHead>
                                    <TableHead className="text-right">Tiempo Recompra (días)</TableHead>
                                    <TableHead className="text-right">Piezas por SKU</TableHead>
                                    <TableHead className="text-right">Costo Landed</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {skusUnicos.map((sku) => (
                                    <TableRow key={sku.sku}>
                                        <TableCell className="font-mono">{sku.sku}</TableCell>
                                        <TableCell>{sku.nombre_madre || 'N/A'}</TableCell>
                                        <TableCell>{sku.proveedor || 'N/A'}</TableCell>
                                        <TableCell className="text-right">{sku.tiempo_de_preparacion ?? '-'}</TableCell>
                                        <TableCell className="text-right">{sku.de_recompra ?? '-'}</TableCell>
                                        <TableCell className="text-right">{sku.piezas_por_sku ?? '-'}</TableCell>
                                        <TableCell className="text-right font-medium">
                                            {new Intl.NumberFormat('es-MX', {
                                                style: 'currency',
                                                currency: 'MXN',
                                            }).format(sku.landed_cost || 0)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
