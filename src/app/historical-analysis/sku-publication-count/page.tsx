'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { publicaciones_por_sku } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { CardFooter } from '@/components/ui/card';

const PAGE_SIZE = 10;

export default function SkuPublicationCountPage() {
  const [data, setData] = useState<publicaciones_por_sku[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

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

  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const paginatedData = data.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
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
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-xl font-bold tracking-tight">Conteo de Publicaciones por SKU</h1>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center p-4 md:p-8">
        <div className="w-full max-w-7xl">
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
                    {paginatedData.length > 0 ? (
                        paginatedData.map((item, index) => (
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
                {totalPages > 1 && (
                    <CardFooter>
                    <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
                        <div>
                        Página {currentPage} de {totalPages}
                        </div>
                        <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            Anterior
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Siguiente
                        </Button>
                        </div>
                    </div>
                    </CardFooter>
                )}
                </div>
            </section>
        </div>
      </main>
    </>
  );
}
