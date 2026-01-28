'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { SkuWithProduct, publicaciones } from '@/types/database';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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
        {skus.length === 0 && !error ? (
          <div className="p-8 text-center text-gray-500 bg-white rounded-lg shadow-sm">No se encontraron SKUs.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {skus.map((sku) => (
              <div key={sku.sku} className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200">
                <h3 className="text-lg font-semibold text-blue-600 font-mono">{sku.sku}</h3>
                <p className="text-sm text-gray-500">{sku.variacion || 'Sin variación'}</p>
                <div className="mt-4 border-t pt-4 space-y-2 text-sm">
                    <div>
                        <p className="text-gray-500">Producto Madre</p>
                        <p className="font-medium">{sku.productos_madre?.nombre_madre || 'N/A'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-500">Costo</p>
                        <p className="font-medium">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(sku.costo ?? sku.productos_madre?.costo ?? 0)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Prep. (min)</p>
                        <p className="font-medium">{sku.tiempo_preparacion ?? 'N/A'}</p>
                      </div>
                    </div>
                    <div>
                        <p className="text-gray-500">Registrado</p>
                        <p className="font-medium">{format(new Date(sku.fecha_registro), 'dd MMM yyyy', { locale: es })}</p>
                    </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-gray-700">Publicaciones Recientes</h2>
        {publications.length === 0 && !error ? (
          <div className="p-8 text-center text-gray-500 bg-white rounded-lg shadow-sm">No se encontraron publicaciones.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publications.map((pub) => (
              <div key={pub.id} className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200">
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-purple-600 truncate pr-4 flex-1">{pub.title}</h3>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${pub.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {pub.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 font-mono mt-1">SKU: {pub.sku}</p>
                <p className="text-sm text-gray-500 font-mono">ID: {pub.item_id}</p>

                <div className="mt-4 border-t pt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-gray-500">Compañía</p>
                        <p className="font-medium">{pub.company || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-gray-500">Precio</p>
                        <p className="font-medium">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(pub.price)}</p>
                    </div>
                      <div>
                        <p className="text-gray-500">Categoría</p>
                        <p className="font-medium">{pub.category}</p>
                    </div>
                    <div>
                        <p className="text-gray-500">Creado</p>
                        <p className="font-medium">{format(new Date(pub.created_at), 'dd MMM yyyy', { locale: es })}</p>
                    </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
