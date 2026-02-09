'use client';

import { useState } from 'react';
import type { catalogo_madre } from '@/types/database';
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
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Database } from 'lucide-react';


const PAGE_SIZE = 10;

export default function MotherCatalogClient({ data, error }: { data: catalogo_madre[], error: string | null }) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const paginatedData = data.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-xl font-bold tracking-tight">Catálogo de Productos Madre</h1>
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
                Listado de Productos Madre
                </h2>

                <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Nombre Producto Madre</TableHead>
                        <TableHead>Compañía</TableHead>
                    </TableRow>
                    </TableHeader>

                    <TableBody>
                    {paginatedData.length > 0 ? (
                        paginatedData.map((item, index) => (
                        <TableRow key={`${item.sku}-${index}`}>
                            <TableCell className="font-mono">{item.sku}</TableCell>
                            <TableCell className="font-medium text-primary">{item.nombre_madre}</TableCell>
                            <TableCell>{item.company}</TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                            {error ? 'No se pudieron cargar los datos.' : 'No se encontraron registros en el catálogo madre.'}
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
