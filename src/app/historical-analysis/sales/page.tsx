'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { ventas as VentasType } from '@/types/database';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut, Loader2, AlertTriangle } from 'lucide-react';
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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import GlobalNav from '@/components/global-nav';

export default function SalesAnalysisPage() {
  const [sales, setSales] = useState<VentasType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSalesData = async () => {
      setLoading(true);
      setError(null);

      if (!supabase) {
        setError("El cliente de Supabase no está configurado. Revisa tus variables de entorno en el archivo .env.");
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('ventas')
        .select('total, fecha_venta, numero_venta, titulo_publicacion, unidades, estado, descripcion_estado, comprador')
        .order('fecha_venta', { ascending: false })
        .limit(100);

      if (fetchError) {
        console.error("Error fetching sales data:", fetchError);
        setError(fetchError.message);
      } else {
        setSales((data || []) as VentasType[]);
      }
      setLoading(false);
    };

    fetchSalesData();
  }, []);

  const safeDate = (d?: string | null) => d ? format(new Date(d), 'dd MMM yyyy', { locale: es }) : '—';
  const money = (v?: number | null) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v || 0);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando datos de ventas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Link href="/historical-analysis" passHref>
            <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /><span className="sr-only">Volver</span></Button>
          </Link>
          <h1 className="text-xl font-bold tracking-tight">Análisis de Ventas</h1>
        </div>
        <div className="flex items-center gap-4">
          <GlobalNav />
          <Button variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error al Cargar Datos</AlertTitle>
            <AlertDescription>
              No se pudieron obtener los datos de ventas. Revisa tu conexión y la configuración de Supabase.
              <p className="mt-2 font-mono text-xs bg-destructive/20 p-2 rounded">Error: {error}</p>
            </AlertDescription>
          </Alert>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Historial de Ventas Recientes</CardTitle>
            <CardDescription>Mostrando las últimas 100 ventas registradas.</CardDescription>
          </CardHeader>
          <CardContent>
            {sales.length > 0 ? (
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
                  {sales.map((v, index) => (
                    <TableRow key={v.numero_venta || index}>
                      <TableCell className="text-sm text-muted-foreground">{safeDate(v.fecha_venta)}</TableCell>
                      <TableCell className="font-medium max-w-xs truncate" title={v.titulo_publicacion || ''}>{v.titulo_publicacion || 'N/A'}</TableCell>
                      <TableCell>{v.comprador || 'N/A'}</TableCell>
                      <TableCell className="text-center">{v.unidades}</TableCell>
                      <TableCell><Badge variant={v.estado === 'delivered' ? 'secondary' : 'outline'} className="capitalize">{v.descripcion_estado || v.estado || 'N/A'}</Badge></TableCell>
                      <TableCell className="text-right font-bold">{money(v.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : !error && (
              <div className="text-center text-muted-foreground py-8">
                No se encontraron datos de ventas.
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
