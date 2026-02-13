'use client';

import { useState } from 'react';
import type { diccionario_skus } from '@/types/database';
import { Button } from '@/components/ui/button';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Database } from 'lucide-react';

const PAGE_SIZE = 15;

export default function SkuDictionaryClient({ data, error }: { data: diccionario_skus[], error: string | null }) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const paginatedData = data.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return 'N/A';
    return num.toLocaleString('es-MX');
  }

  const formatCurrency = (num: number | null | undefined) => {
    if (num === null || num === undefined) return 'N/A';
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num);
  }

  const formatText = (text: string | null | undefined) => text || 'N/A';

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-xl font-bold tracking-tight">Diccionario SKU</h1>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center p-4 md:p-8">
        <div className="w-full max-w-7xl">
            {error && (
                <Alert variant="destructive" className="mb-6">
                    <Database className="h-4 w-4" />
                    <AlertTitle>Error al Cargar Datos</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            
            <section>
                <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                Registros del Diccionario de SKUs
                </h2>

                <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Categoría Madre</TableHead>
                        <TableHead className="text-right">Landed Cost</TableHead>
                        <TableHead>Código en Siggo</TableHead>
                        <TableHead>Nombre en Siggo</TableHead>
                        <TableHead className="text-right">Rock en Siggo</TableHead>
                        <TableHead className="text-right">Piezas Totales</TableHead>
                        <TableHead>Estado en Siggo</TableHead>
                        <TableHead>Bodega</TableHead>
                        <TableHead>Bloque</TableHead>
                    </TableRow>
                    </TableHeader>

                    <TableBody>
                    {paginatedData.length > 0 ? (
                        paginatedData.map((item, index) => (
                        <TableRow key={`${item.sku}-${index}`}>
                            <TableCell className="font-mono text-primary">{formatText(item.sku)}</TableCell>
                            <TableCell>{formatText(item.categoria_madre)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.landed_cost)}</TableCell>
                            <TableCell>{formatText(item.codigo_en_siggo)}</TableCell>
                            <TableCell>{formatText(item.nombre_en_siggo)}</TableCell>
                            <TableCell className="text-right">{formatNumber(item.rock_en_siggo)}</TableCell>
                            <TableCell className="text-right">{formatNumber(item.piezas_totales)}</TableCell>
                            <TableCell>{formatText(item.estado_en_siggo)}</TableCell>
                            <TableCell>{formatText(item.bodega)}</TableCell>
                            <TableCell>{formatText(item.bloque)}</TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                            {error ? 'No se pudieron cargar los datos.' : 'No se encontraron registros en el diccionario de SKUs.'}
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
