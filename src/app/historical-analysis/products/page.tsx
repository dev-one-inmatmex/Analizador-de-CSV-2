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

type LoadingState = {
    publicaciones: boolean;
    conteoSkus: boolean;
    mapeoSkus: boolean;
    catalogoMadre: boolean;
};

export default function ProductsPage() {
  const [publications, setPublications] = useState<publicaciones[]>([]);
  const [skuCounts, setSkuCounts] = useState<publicaciones_por_sku[]>([]);
  const [skuMap, setSkuMap] = useState<skuxpublicaciones[]>([]);
  const [motherCatalog, setMotherCatalog] = useState<catalogo_madre[]>([]);

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
            pubs,
            counts,
            maps,
            catalog
        ] = await Promise.all([
          supabase.from('publicaciones').select('*').order('created_at', { ascending: false }).limit(20),
          supabase.from('publicaciones_por_sku').select('*').order('publicaciones', { ascending: false }),
          supabase.from('skuxpublicaciones').select('*').limit(50),
          supabase.from('catalogo_madre').select('*').order('nombre_madre', { ascending: true })
        ]);

        if (pubs.error) throw pubs.error;
        setPublications((pubs.data as publicaciones[]) || []);
        setLoading(prev => ({ ...prev, publicaciones: false }));

        if (counts.error) throw counts.error;
        setSkuCounts((counts.data as publicaciones_por_sku[]) || []);
        setLoading(prev => ({ ...prev, conteoSkus: false }));

        if (maps.error) throw maps.error;
        setSkuMap((maps.data as skuxpublicaciones[]) || []);
        setLoading(prev => ({ ...prev, mapeoSkus: false }));

        if (catalog.error) throw catalog.error;
        setMotherCatalog((catalog.data as catalogo_madre[]) || []);
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
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                            {skuMap.map((item, index) => (
                                <TableRow key={`${item.sku}-${item.publicacion_id}-${index}`}>
                                    <TableCell className="font-mono">{item.sku}</TableCell>
                                    <TableCell className="font-mono text-muted-foreground">{item.publicacion_id}</TableCell>
                                    <TableCell className="font-medium text-primary">{item.nombre_madre}</TableCell>
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
                                    <TableHead className="text-right"># de Publicaciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {skuCounts.map((item, index) => (
                                <TableRow key={`${item.sku}-${index}`}>
                                    <TableCell className="font-mono text-primary">{item.sku}</TableCell>
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
                                    <TableHead>Nombre Producto Madre</TableHead>
                                    <TableHead>Compañía</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {motherCatalog.map((item, index) => (
                                <TableRow key={`${item.sku}-${index}`}>
                                    <TableCell className="font-mono">{item.sku}</TableCell>
                                    <TableCell className="font-medium text-primary">{item.nombre_madre}</TableCell>
                                    <TableCell>{item.company}</TableCell>
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
