'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { publicaciones_por_sku } from '@/types/database';
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
import GlobalNav from '@/components/global-nav';

export default function SkuPublicationCountPage() {
  const [data, setData] = useState<publicaciones_por_sku[]>([]);
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
        const { data, error } = await supabase
            .from('publicaciones_por_sku')
            .select('*')
            .order('publicaciones', { ascending: false });

        if (error) {
          throw error;
        }
        
        setData((data as publicaciones_por_sku[]) || []);
      } catch (e: any) {
        let errorMessage = 'Ocurrió un error inesperado.';
        if (e instanceof TypeError && e.message.includes('Failed to fetch')) {
          errorMessage =
            'Error de red: No se pudo conectar a la base de datos. Revisa tu conexión a internet y la configuración de las variables de entorno.';
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
            Cargando datos…
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
          <h1 className="text-xl font-bold tracking-tight">Conteo de Publicaciones por SKU</h1>
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
        
        <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            Resumen de Publicaciones por SKU
            </h2>

            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right"># de Publicaciones</TableHead>
                </TableRow>
                </TableHeader>

                <TableBody>
                {data.length > 0 ? (
                    data.map((item, index) => (
                    <TableRow key={`${item.sku}-${index}`}>
                        <TableCell className="font-mono text-primary">{item.sku}</TableCell>
                        <TableCell className="font-medium text-right">{item.publicaciones}</TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                    <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                        No se encontraron registros.
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
