/* 'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { ventas as VentasType } from '@/types/database';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function VentasPage() {
  const [ventasData, setVentasData] = useState<VentasType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVentas = async () => {
      setLoading(true);
      setError(null);
      
      if (!supabase) {
        setError("El cliente de Supabase no está disponible. Revisa tu configuración.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('ventas')
        .select('*')
        .order('fecha_venta', { ascending: false })
        .limit(50); 

      if (error) {
        console.error('Error fetching ventas:', error);
        setError(error.message);
        setVentasData([]);
      } else if (data) {
        setVentasData(data as VentasType[]);
      }
      
      setLoading(false);
    };

    fetchVentas();
  }, []);

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
    <main className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Historial de Ventas</h1>
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
            <p className="text-xs mt-3 text-red-800">Asegúrate de que las políticas de seguridad (RLS) en Supabase estén habilitadas para lectura (`SELECT`) en la tabla `ventas`.</p>
         </div>
      )}

      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Venta #</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Comprador</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead className="text-center">Unidades</TableHead>
                <TableHead className="text-right">Precio Unit.</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Fecha</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead>Tags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ventasData.length > 0 ? ventasData.map((venta) => (
                <TableRow key={venta.numero_venta}>
                  <TableCell className="font-mono font-medium text-blue-600">#{venta.numero_venta}</TableCell>
                  <TableCell>
                    <div className="font-medium">{venta.titulo_publicacion || 'Producto sin título'}</div>
                    <div className="text-xs text-muted-foreground">SKU: {venta.sku ?? 'N/A'}</div>
                  </TableCell>
                  <TableCell>{venta.comprador ?? 'No especificado'}</TableCell>
                  <TableCell>{venta.tienda_oficial ?? 'N/A'}</TableCell>
                  <TableCell className="text-center">{venta.unidades}</TableCell>
                  <TableCell className="text-right">${venta.precio_unitario.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    ${venta.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-center">
                    {new Date(venta.fecha_venta).toLocaleDateString('es-MX')}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={venta.estado === 'completada' ? 'secondary' : 'outline'}>{venta.estado ?? 'Sin estado'}</Badge>
                  </TableCell>
                   <TableCell>
                    <div className="flex flex-wrap gap-1 items-center justify-start">
                      {venta.es_paquete_varios && <Badge variant="secondary">Paquete</Badge>}
                      {venta.venta_publicidad && <Badge variant="secondary">Publicidad</Badge>}
                      {venta.negocio && <Badge variant="secondary">Negocio</Badge>}
                      {venta.reclamo_abierto && <Badge variant="destructive">Reclamo</Badge>}
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-gray-500 py-8">
                    No se encontraron ventas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
    </main>
  );
}
 */

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { ventas as VentasType } from '@/types/database';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function VentasPage() {
  const [ventasData, setVentasData] = useState<VentasType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVentas = async () => {
      setLoading(true);
      setError(null);

      if (!supabase) {
        setError('El cliente de Supabase no está disponible.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('ventas')
        .select('*')
        .order('fecha_venta', { ascending: false })
        .limit(50);

      if (error) {
        console.error(error);
        setError(error.message);
        setVentasData([]);
      } else {
        setVentasData(data as VentasType[]);
      }

      setLoading(false);
    };

    fetchVentas();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando historial de ventas…</p>
        </div>
      </div>
    );
  }

  return (
    <main className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Historial de Ventas
        </h1>

        <div className="flex gap-4">
          <Link href="/historical-analysis">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </Link>

          <Button variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-6 mb-6 text-red-700 bg-red-100 border border-red-300 rounded-lg">
          <p className="font-bold">Error al cargar datos:</p>
          <p className="text-sm mt-2 font-mono">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <Table>
          {/* ================= HEADER ================= */}
          <TableHeader>
            <TableRow>
              <TableHead>Venta #</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Comprador</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead className="text-center">Unidades</TableHead>
              <TableHead className="text-right">Precio Unit.</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Fecha</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead>Tags</TableHead>
            </TableRow>
          </TableHeader>

          {/* ================= BODY ================= */}
          <TableBody>
            {ventasData.length > 0 ? (
              ventasData.map((venta) => (
                <TableRow key={venta.numero_venta}>
                  <TableCell className="font-mono font-medium text-blue-600">
                    #{venta.numero_venta}
                  </TableCell>

                  <TableCell>
                    <div className="font-medium">
                      {venta.titulo_publicacion || 'Producto sin título'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      SKU: {venta.sku ?? 'N/A'}
                    </div>
                  </TableCell>

                  <TableCell>
                    {venta.comprador ?? 'No especificado'}
                  </TableCell>

                  <TableCell>
                    {venta.tienda_oficial ?? 'N/A'}
                  </TableCell>

                  <TableCell className="text-center">
                    {venta.unidades}
                  </TableCell>

                  <TableCell className="text-right">
                    ${venta.precio_unitario.toFixed(2)}
                  </TableCell>

                  <TableCell className="text-right font-semibold">
                    ${venta.total.toLocaleString('es-MX', {
                      minimumFractionDigits: 2,
                    })}
                  </TableCell>

                  <TableCell className="text-center">
                    {new Date(venta.fecha_venta).toLocaleDateString('es-MX')}
                  </TableCell>

                  <TableCell className="text-center">
                    <Badge
                      variant={
                        venta.estado === 'completada'
                          ? 'secondary'
                          : venta.estado === 'cancelada'
                          ? 'destructive'
                          : 'outline'
                      }
                    >
                      {venta.descripcion_estado ??
                        venta.estado ??
                        'Sin estado'}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {venta.es_paquete_varios && (
                        <Badge variant="secondary">Paquete</Badge>
                      )}
                      {venta.venta_publicidad && (
                        <Badge variant="secondary">Publicidad</Badge>
                      )}
                      {venta.negocio && (
                        <Badge variant="secondary">Negocio</Badge>
                      )}
                      {venta.reclamo_abierto && (
                        <Badge variant="destructive">Reclamo</Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="text-center text-gray-500 py-8"
                >
                  No se encontraron ventas.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
