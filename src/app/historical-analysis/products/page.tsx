'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { SkuWithProduct, publicaciones } from '@/types/database';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut, Loader2 } from 'lucide-react';
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
        setError('El cliente de Supabase no está disponible.');
        setLoading(false);
        return;
      }

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

      setLoading(false);
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
    <main className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Análisis de publicaciones
        </h1>

        <div className="flex gap-4">
          <Link href="/historical-analysis">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </Link>

          <Button variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-6 mb-6 text-red-700 bg-red-100 border border-red-300 rounded-lg">
          <p className="font-bold">Error al cargar datos:</p>
          <p className="text-sm mt-2 font-mono">{error}</p>
        </div>
      )}

      {/* ================= SKUS ================= */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-gray-700">
          SKUs Recientes
        </h2>

        <div className="bg-white rounded-lg shadow-md border overflow-hidden">
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
                    <TableCell className="font-mono text-blue-600">
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
                  <TableCell colSpan={6} className="text-center py-8">
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
        <h2 className="text-2xl font-bold mb-4 text-gray-700">
          Publicaciones
        </h2>

        <div className="bg-white rounded-lg shadow-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item ID</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Product #</TableHead>
                <TableHead>Variation ID</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead>Empresa</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {publications.length > 0 ? (
                publications.map((pub) => (
                  <TableRow key={pub.item_id}>
                    <TableCell className="font-mono text-blue-600">
                      {pub.item_id}
                    </TableCell>

                    <TableCell className="font-mono">
                      {pub.sku}
                    </TableCell>

                    <TableCell>
                      {pub.product_number ?? '—'}
                    </TableCell>

                    <TableCell>
                      {pub.variation_id ?? '—'}
                    </TableCell>

                    <TableCell className="font-medium">
                      {pub.title}
                    </TableCell>

                    <TableCell>
                      {pub.category}
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
                  <TableCell colSpan={9} className="text-center py-8">
                    No se encontraron publicaciones.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </main>
  );
}
