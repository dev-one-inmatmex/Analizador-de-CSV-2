'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut, Loader2, BarChart3, Archive, Hash } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import GlobalNav from '@/components/global-nav';
import type { PublicationWithMadre } from './page';
import type { publicaciones_por_sku } from '@/types/database';

interface ProductsClientPageProps {
  initialPublications: PublicationWithMadre[];
  skuPublicationCount: publicaciones_por_sku[];
  error: string | null;
}

export default function ProductsClientPage({
  initialPublications,
  skuPublicationCount,
  error,
}: ProductsClientPageProps) {
  const [publications] = useState<PublicationWithMadre[]>(initialPublications);
  const [loading] = useState(false); // No longer fetching client-side

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

      <main className="flex-1 p-4 md:p-8 grid gap-6 md:grid-cols-3">
        {error && (
            <div className="p-4 mb-6 text-red-800 bg-red-100 border border-red-300 rounded-lg md:col-span-3">
            <p className="font-bold">Error al cargar datos:</p>
            <p className="text-sm mt-1 font-mono">{error}</p>
            </div>
        )}
        
        <div className="md:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Publicaciones Recientes</CardTitle>
                    <CardDescription>Listado de las últimas publicaciones creadas.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Item ID</TableHead>
                            <TableHead>Producto Madre</TableHead>
                            <TableHead>Título</TableHead>
                            <TableHead className="text-right">Precio</TableHead>
                            <TableHead className="text-center">Estado</TableHead>
                        </TableRow>
                        </TableHeader>

                        <TableBody>
                        {publications.length > 0 ? (
                            publications.map((pub) => (
                            <TableRow key={pub.item_id}>
                                <TableCell className="font-mono text-primary text-xs">
                                {pub.item_id}
                                </TableCell>

                                <TableCell className="font-medium text-sm">
                                  {pub.nombre_madre || <span className="text-muted-foreground italic">N/A</span>}
                                </TableCell>
                                
                                <TableCell className="font-medium max-w-xs truncate text-sm" title={pub.title}>
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
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                No se encontraron publicaciones.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="md:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>SKUs por Número de Publicaciones</CardTitle>
                    <CardDescription>Top SKUs con más publicaciones activas.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead><Archive className="h-4 w-4 inline-block mr-1"/>SKU</TableHead>
                                <TableHead className="text-right"><Hash className="h-4 w-4 inline-block mr-1"/>Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {skuPublicationCount.length > 0 ? (
                                skuPublicationCount.map((item) => (
                                <TableRow key={item.sku}>
                                    <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                                    <TableCell className="text-right font-bold text-primary">{item.publicaciones}</TableCell>
                                </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                                        No hay datos de conteo.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
