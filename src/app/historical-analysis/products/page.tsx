'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { SkuWithProduct, publicaciones } from '@/types/database';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut, Loader2, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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

export default function ProductsPage() {
  const [skus, setSkus] = useState<SkuWithProduct[]>([]);
  const [publications, setPublications] = useState<publicaciones[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      if (!supabase) {
        setError(
          'El cliente de Supabase no está disponible. Revisa la configuración en src/lib/supabaseClient.ts'
        );
        setLoading(false);
        return;
      }

      try {
        const [skusResult, publicationsResult] = await Promise.all([
          supabase
            .from('skus')
            .select('*, productos_madre(*)')
            .order('fecha_registro', { ascending: false })
            .limit(20),

          supabase
            .from('publicaciones')
            .select('*')
            .order('item_id', { ascending: false })
            .limit(20),
        ]);

        let combinedError = '';

        if (skusResult.error) {
          combinedError += `SKUs: ${skusResult.error.message}. `;
        } else {
          setSkus(skusResult.data as SkuWithProduct[]);
        }

        if (publicationsResult.error) {
          combinedError += `Publicaciones: ${publicationsResult.error.message}.`;
        } else {
          setPublications(publicationsResult.data as publicaciones[]);
        }

        if (combinedError) setError(combinedError.trim());
      } catch (e: any) {
        let errorMessage = 'Ocurrió un error inesperado.';
        if (e instanceof TypeError && e.message.includes('Failed to fetch')) {
          errorMessage =
            'Error de red: No se pudo conectar a la base de datos. Revisa tu conexión a internet y asegúrate de que las variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY estén correctamente configuradas en tu archivo .env.';
        } else {
          errorMessage = e.message || String(e);
        }
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">
            Cargando datos de publicaciones…
          </p>
        </div>
      </div>
    );
  }

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
          <h1 className="text-xl font-bold tracking-tight">Análisis de Publicaciones</h1>
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

      <main className="flex-1 p-4 md:p-8">
        {error && (
            <div className="p-4 mb-6 text-red-800 bg-red-100 border border-red-300 rounded-lg">
            <p className="font-bold">Error al cargar datos:</p>
            <p className="text-sm mt-1 font-mono">{error}</p>
            </div>
        )}

        {/* ================= SKUS ================= */}
        <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            SKUs Recientes
            </h2>

            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Producto Madre</TableHead>
                    <TableHead>Variación</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                    <TableHead className="text-right">Prep. (min)</TableHead>
                    <TableHead className="text-center">Registrado</TableHead>
                </TableRow>
                </TableHeader>

                <TableBody>
                {skus.length > 0 ? (
                    skus.map((sku) => (
                    <TableRow key={sku.sku}>
                        <TableCell className="font-mono text-primary">
                        {sku.sku}
                        </TableCell>

                        <TableCell>
                        {sku.productos_madre?.nombre_madre ?? 'N/A'}
                        </TableCell>

                        <TableCell>
                        {sku.variacion ?? '—'}
                        </TableCell>

                        <TableCell className="text-right">
                        {new Intl.NumberFormat('es-MX', {
                            style: 'currency',
                            currency: 'MXN',
                        }).format(
                            sku.costo ??
                            sku.productos_madre?.costo ??
                            0
                        )}
                        </TableCell>

                        <TableCell className="text-right">
                        {sku.tiempo_preparacion ?? '—'}
                        </TableCell>

                        <TableCell className="text-center">
                        {format(
                            new Date(sku.fecha_registro),
                            'dd MMM yyyy',
                            { locale: es }
                        )}
                        </TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No se encontraron SKUs.
                    </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
            </div>
        </section>

        {/* ============== PUBLICACIONES ============== */}
        <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            Publicaciones Recientes
            </h2>

            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Item ID</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead>Empresa</TableHead>
                </TableRow>
                </TableHeader>

                <TableBody>
                {publications.length > 0 ? (
                    publications.map((pub) => (
                    <TableRow key={pub.item_id}>
                        <TableCell className="font-mono text-primary">
                        {pub.item_id}
                        </TableCell>

                        <TableCell className="font-mono">
                        {pub.sku}
                        </TableCell>
                        
                        <TableCell className="font-medium max-w-xs truncate" title={pub.title}>
                        {pub.title}
                        </TableCell>

                        <TableCell className="text-right font-semibold">
                        {new Intl.NumberFormat('es-MX', {
                            style: 'currency',
                            currency: 'MXN',
                        }).format(pub.price)}
                        </TableCell>

                        <TableCell className="text-center">
                        <Badge
                            variant={
                            pub.status === 'active'
                                ? 'secondary'
                                : 'outline'
                            }
                        >
                            {pub.status}
                        </Badge>
                        </TableCell>

                        <TableCell>
                        {pub.company}
                        </TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No se encontraron publicaciones.
                    </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
            </div>
        </section>
      </main>
    </div>
  );
}
