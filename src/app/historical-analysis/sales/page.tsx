'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { ventas as VentasType } from '@/types/database';
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
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function SalesAnalysisPage() {
  const [ventasData, setVentasData] = useState<VentasType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVentas = async () => {
      setLoading(true);
      setError(null);

      if (!supabase) {
        setError("El cliente de Supabase no está disponible. Revisa tus variables de entorno.");
        setLoading(false);
        return;
      }

      // Fetch a curated list of columns instead of '*'
      const { data, error } = await supabase
        .from('ventas')
        .select('id, numero_venta, fecha_venta, titulo_publicacion, unidades, descripcion_estado, estado, comprador, total')
        .order('fecha_venta', { ascending: false, nullsFirst: false })
        .limit(50);

      if (error) {
        setError(error.message);
        setVentasData([]);
      } else {
        setVentasData((data ?? []) as VentasType[]);
      }

      setLoading(false);
    };

    fetchVentas();
  }, []);

  const safeDate = (d?: string | null) => d ? format(new Date(d), 'dd MMM yyyy', { locale: es }) : '—';
  const money = (v?: number | null) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v || 0);

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-muted/40">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando historial de ventas...</p>
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
          <h1 className="text-xl font-bold tracking-tight">Análisis de Ventas</h1>
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
        
        <Card>
            <CardHeader>
                <CardTitle>Historial de Ventas Recientes</CardTitle>
                <CardDescription>Mostrando las últimas 50 ventas registradas.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Publicación</TableHead>
                            <TableHead>Comprador</TableHead>
                            <TableHead className="text-center">Unidades</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {ventasData.length > 0 ? (
                            ventasData.map((v) => (
                            <TableRow key={v.id || v.numero_venta}>
                                <TableCell className="text-sm text-muted-foreground">{safeDate(v.fecha_venta)}</TableCell>
                                <TableCell className="font-medium max-w-sm truncate" title={v.titulo_publicacion || ''}>{v.titulo_publicacion || 'N/A'}</TableCell>
                                <TableCell>{v.comprador || 'N/A'}</TableCell>
                                <TableCell className="text-center">{v.unidades}</TableCell>
                                <TableCell><Badge variant={v.estado === 'delivered' ? 'secondary' : 'outline'} className="capitalize">{v.descripcion_estado || v.estado || 'N/A'}</Badge></TableCell>
                                <TableCell className="text-right font-bold">{money(v.total)}</TableCell>
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    No se encontraron ventas.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </main>
    </div>
  );
}