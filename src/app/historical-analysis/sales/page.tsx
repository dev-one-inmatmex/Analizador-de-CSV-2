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

// This defines the order and name of all columns to display
const VENTA_COLUMNS = [
    'numero_venta', 'fecha_venta', 'estado', 'descripcion_estado', 
    'es_paquete_varios', 'pertenece_kit', 'unidades', 'ingreso_productos', 
    'cargo_venta_impuestos', 'ingreso_envio', 'costo_envio', 'costo_medidas_peso', 
    'cargo_diferencia_peso', 'anulaciones_reembolsos', 'total', 'venta_publicidad', 
    'sku', 'numero_publicacion', 'company', 'title', 'variante', 
    'price', 'tipo_publicacion', 'factura_adjunta', 'datos_personales_empresa', 
    'tipo_numero_documento', 'direccion_fiscal', 'tipo_contribuyente', 'cfdi', 
    'tipo_usuario', 'regimen_fiscal', 'comprador', 'negocio', 'ife', 'domicilio_entrega', 
    'municipio_alcaldia', 'estado_comprador', 'codigo_postal', 'pais', 
    'forma_entrega_envio', 'fecha_en_camino_envio', 'fecha_entregado_envio', 
    'transportista_envio', 'numero_seguimiento_envio', 'url_seguimiento_envio', 
    'unidades_envio', 'forma_entrega', 'fecha_en_camino', 'fecha_entregado', 
    'transportista', 'numero_seguimiento', 'url_seguimiento', 'revisado_por_ml', 
    'fecha_revision', 'dinero_a_favor', 'resultado', 'destino', 'motivo_resultado', 
    'unidades_reclamo', 'reclamo_abierto', 'reclamo_cerrado', 'con_mediacion'
] as const;

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

      const { data, error } = await supabase
        .from('ventas')
        .select('*') // Fetch all columns
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

  const renderCellContent = (item: VentasType, column: typeof VENTA_COLUMNS[number]) => {
    const value = item[column as keyof VentasType];

    if (value === null || value === undefined) {
      return <span className="text-muted-foreground">N/A</span>;
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Sí' : 'No';
    }

    if (['fecha_venta', 'fecha_en_camino_envio', 'fecha_entregado_envio', 'fecha_en_camino', 'fecha_entregado', 'fecha_revision', 'created_at'].includes(column)) {
        try {
            return format(new Date(value as string), 'dd MMM yyyy, HH:mm', { locale: es });
        } catch {
            return String(value);
        }
    }

    if (['total', 'ingreso_productos', 'cargo_venta_impuestos', 'ingreso_envio', 'costo_envio', 'costo_medidas_peso', 'cargo_diferencia_peso', 'anulaciones_reembolsos', 'precio_unitario', 'dinero_a_favor'].includes(column)) {
      return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value as number);
    }
    
    if (column === 'estado' && typeof value === 'string') {
        return <Badge variant={value === 'delivered' ? 'secondary' : 'outline'} className="capitalize">{item.descripcion_estado || String(value)}</Badge>
    }

    if (column === 'title') {
        return <span className="max-w-xs truncate" title={String(value)}>{String(value)}</span>
    }

    return String(value);
  };


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
                <CardDescription>Mostrando las últimas 50 ventas registradas con todas sus columnas.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            {VENTA_COLUMNS.map(col => <TableHead key={col} className="whitespace-nowrap capitalize">{col.replace(/_/g, ' ')}</TableHead>)}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {ventasData.length > 0 ? (
                            ventasData.map((v) => (
                            <TableRow key={v.id || v.numero_venta}>
                                {VENTA_COLUMNS.map(col => (
                                    <TableCell key={`${v.id}-${col}`} className="whitespace-nowrap">
                                        {renderCellContent(v, col)}
                                    </TableCell>
                                ))}
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={VENTA_COLUMNS.length} className="text-center py-8 text-muted-foreground">
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
