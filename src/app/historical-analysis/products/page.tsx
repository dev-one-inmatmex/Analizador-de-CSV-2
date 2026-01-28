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
        setError("El cliente de Supabase no está disponible. Revisa tu configuración.");
        setLoading(false);
        return;
      }

      const [skusResult, publicationsResult] = await Promise.all([
        supabase.from('skus').select('*, productos_madre(*)').order('fecha_registro', { ascending: false }).limit(20),
        supabase.from('publicaciones').select('*').order('created_at', { ascending: false }).limit(20)
      ]);

      let combinedError = '';
      if (skusResult.error) {
        console.error('Error fetching SKUs:', skusResult.error);
        combinedError += `SKUs: ${skusResult.error.message}. `;
      } else if (skusResult.data) {
        setSkus(skusResult.data as SkuWithProduct[]);
      }
      
      if (publicationsResult.error) {
        console.error('Error fetching publications:', publicationsResult.error);
        combinedError += `Publicaciones: ${publicationsResult.error.message}.`;
      } else if (publicationsResult.data) {
        setPublications(publicationsResult.data as publicaciones[]);
      }

      if(combinedError) {
        setError(combinedError.trim());
      }
      
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-muted/40">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Cargando datos de productos...</p>
            </div>
        </div>
    );
  }

  return (
    <main className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Catálogo de Productos y Publicaciones</h1>
          <div className="flex items-center gap-4">
              <Link href="/historical-analysis" passHref>
                  <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button>
              </Link>
              <Button variant="outline">
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
              </Button>
          </div>
      </div>

      {error && (
         <div className="p-8 my-4 text-center text-red-600 bg-red-100 border border-red-300 rounded-lg">
            <p className="font-bold">Ocurrió un error al cargar los datos:</p>
            <p className="text-sm mt-2 font-mono bg-red-50 p-2 rounded">{error}</p>
            <p className="text-xs mt-3 text-red-800">Asegúrate de que las políticas de seguridad (RLS) en Supabase estén habilitadas para lectura (`SELECT`) en las tablas `skus`, `productos_madre` y `publicaciones`.</p>
         </div>
      )}

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-gray-700">SKUs Recientes</h2>
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
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
              {skus.length > 0 ? skus.map((sku) => (
                <TableRow key={sku.sku}>
                  <TableCell className="font-mono font-medium text-blue-600">{sku.sku}</TableCell>
                  <TableCell>{sku.productos_madre?.nombre_madre || 'N/A'}</TableCell>
                  <TableCell>{sku.variacion || 'Sin variación'}</TableCell>
                  <TableCell className="text-right">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(sku.costo ?? sku.productos_madre?.costo ?? 0)}</TableCell>
                  <TableCell className="text-right">{sku.tiempo_preparacion ?? 'N/A'}</TableCell>
                  <TableCell className="text-center">{format(new Date(sku.fecha_registro), 'dd MMM yyyy', { locale: es })}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    No se encontraron SKUs.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-gray-700">Publicaciones Recientes</h2>
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Compañía</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="text-center">Creado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {publications.length > 0 ? publications.map((pub) => (
                <TableRow key={pub.id}>
                  <TableCell className="font-medium text-purple-600">{pub.title}</TableCell>
                  <TableCell className="font-mono">{pub.sku}</TableCell>
                  <TableCell>{pub.company || 'N/A'}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={pub.status === 'active' ? 'secondary' : 'outline'}>{pub.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(pub.price)}</TableCell>
                  <TableCell className="text-center">{format(new Date(pub.created_at), 'dd MMM yyyy', { locale: es })}</TableCell>
                </TableRow>
              )) : (
                 <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
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
