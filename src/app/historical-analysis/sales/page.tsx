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
        setError('El cliente de Supabase no está disponible. Revisa la configuración en .env.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('ventas')
        .select('*')
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const money = (v?: number | null) => `$${(v ?? 0).toFixed(2)}`;

  const safeDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('es-MX') : '—';

  return (
    <main className="p-4 md:p-8 bg-gray-50 min-h-screen">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Historial de Ventas</h1>

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

      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-x-auto">
        <Table>
          {/* HEADER COMPLETO */}
          <TableHeader>
            <TableRow>
              <TableHead># Venta</TableHead>
              <TableHead>Fecha de venta</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Descripción del estado</TableHead>
              <TableHead>Paquete de varios productos</TableHead>
              <TableHead>Pertenece a un kit</TableHead>
              <TableHead>Unidades</TableHead>
              <TableHead>Ingresos por productos (MXN)</TableHead>
              <TableHead>Cargo por venta e impuestos (MXN)</TableHead>
              <TableHead>Ingresos por envío (MXN)</TableHead>
              <TableHead>Costos de envío (MXN)</TableHead>
              <TableHead>Costo de envío basado en medidas y peso declarados</TableHead>
              <TableHead>Cargo por diferencias en medidas y peso del paquete</TableHead>
              <TableHead>Anulaciones y reembolsos (MXN)</TableHead>
              <TableHead>Total (MXN)</TableHead>
              <TableHead>Venta por publicidad</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead># de publicación</TableHead>
              <TableHead>Tienda oficial</TableHead>
              <TableHead>Título de la publicación</TableHead>
              <TableHead>Variante</TableHead>
              <TableHead>Precio unitario de venta de la publicación (MXN)</TableHead>
              <TableHead>Tipo de publicación</TableHead>
              <TableHead>Factura adjunta</TableHead>
              <TableHead>Datos personales o de empresa</TableHead>
              <TableHead>Tipo y número de documento</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead>Tipo de contribuyente</TableHead>
              <TableHead>CFDI</TableHead>
              <TableHead>Tipo Usuario</TableHead>
              <TableHead>Régimen Fiscal</TableHead>
              <TableHead>Comprador</TableHead>
              <TableHead>Negocio</TableHead>
              <TableHead>IFE</TableHead>
              <TableHead>Domicilio</TableHead>
              <TableHead>Municipio/Alcaldía</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Código Postal</TableHead>
              <TableHead>País</TableHead>
              <TableHead>Forma Envío</TableHead>
              <TableHead>Fecha en camino</TableHead>
              <TableHead>Fecha entregado</TableHead>
              <TableHead>Transportista</TableHead>
              <TableHead>Número de seguimiento</TableHead>
              <TableHead>URL de seguimiento</TableHead>
              <TableHead>Unidades</TableHead>
              <TableHead>Forma de entrega</TableHead>
              <TableHead>Fecha en camino</TableHead>
              <TableHead>Fecha entregado</TableHead>
              <TableHead>Transportista</TableHead>
              <TableHead>Número de seguimiento</TableHead>
              <TableHead>URL de seguimiento</TableHead>
              <TableHead>Revisado por Mercado Libre</TableHead>
              <TableHead>Fecha de revisión</TableHead>
              <TableHead>Dinero a favor</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Motivo del resultado</TableHead>
              <TableHead>Unidades</TableHead>
              <TableHead>Reclamo abierto</TableHead>
              <TableHead>Reclamo cerrado</TableHead>
              <TableHead>Con ediación</TableHead>
            </TableRow>
          </TableHeader>

          {/* BODY (parcial, lo importante es header completo) */}
          <TableBody>
            {ventasData.map((v) => (
              <TableRow key={v.numero_venta}>
                <TableCell>{v.numero_venta}</TableCell>
                <TableCell>{safeDate(v.fecha_venta)}</TableCell>
                <TableCell>{v.estado ?? '—'}</TableCell>
                <TableCell>{v.descripcion_estado ?? '—'}</TableCell>
                <TableCell>{v.es_paquete_varios ? 'Sí' : 'No'}</TableCell>
                <TableCell>{v.pertenece_kit ? 'Sí' : 'No'}</TableCell>
                <TableCell>{v.unidades ?? '—'}</TableCell>
                <TableCell>{money(v.ingreso_productos)}</TableCell>
                <TableCell>{money(v.cargo_venta_impuestos)}</TableCell>
                <TableCell>{money(v.ingreso_envio)}</TableCell>
                <TableCell>{money(v.costo_envio)}</TableCell>
                <TableCell>{money(v.costo_medidas_peso)}</TableCell>
                <TableCell>{money(v.cargo_diferencia_peso)}</TableCell>
                <TableCell>{money(v.anulaciones_reembolsos)}</TableCell>
                <TableCell>{money(v.total)}</TableCell>
                <TableCell>{v.venta_publicidad ? 'Sí' : 'No'}</TableCell>
                <TableCell>{v.sku ?? '—'}</TableCell>
                <TableCell>{v.numero_publicacion ?? '—'}</TableCell>
                <TableCell>{v.tienda_oficial ?? '—'}</TableCell>
                <TableCell>{v.titulo_publicacion ?? '—'}</TableCell>
                <TableCell>{v.variante ?? '—'}</TableCell>
                <TableCell>{money(v.precio_unitario)}</TableCell>
                <TableCell>{v.tipo_publicacion ?? '—'}</TableCell>
                <TableCell>{v.factura_adjunta ?? '—'}</TableCell>
                <TableCell>{v.datos_personales_empresa ?? '—'}</TableCell>
                <TableCell>{v.tipo_numero_documento ?? '—'}</TableCell>
                <TableCell>{v.direccion_fiscal ?? '—'}</TableCell>
                <TableCell>{v.tipo_contribuyente ?? '—'}</TableCell>
                <TableCell>{v.cfdi ?? '—'}</TableCell>
                <TableCell>{v.tipo_usuario ?? '—'}</TableCell>
                <TableCell>{v.regimen_fiscal ?? '—'}</TableCell>
                <TableCell>{v.comprador ?? '—'}</TableCell>
                <TableCell>{v.negocio ? 'Sí' : 'No'}</TableCell>
                <TableCell>{v.ife ?? '—'}</TableCell>
                <TableCell>{v.domicilio_entrega ?? '—'}</TableCell>
                <TableCell>{v.municipio_alcaldia ?? '—'}</TableCell>
                <TableCell>{v.estado_comprador ?? '—'}</TableCell>
                <TableCell>{v.codigo_postal ?? '—'}</TableCell>
                <TableCell>{v.pais ?? '—'}</TableCell>
                <TableCell>{v.forma_entrega_envio ?? '—'}</TableCell>
                <TableCell>{safeDate(v.fecha_en_camino_envio)}</TableCell>
                <TableCell>{safeDate(v.fecha_entregado_envio)}</TableCell>
                <TableCell>{v.transportista_envio ?? '—'}</TableCell>
                <TableCell>{v.numero_seguimiento_envio ?? '—'}</TableCell>
                <TableCell>{v.url_seguimiento_envio ?? '—'}</TableCell>
                <TableCell>{v.unidades_envio ?? '—'}</TableCell>
                <TableCell>{v.forma_entrega ?? '—'}</TableCell>
                <TableCell>{safeDate(v.fecha_en_camino)}</TableCell>
                <TableCell>{safeDate(v.fecha_entregado)}</TableCell>
                <TableCell>{v.transportista ?? '—'}</TableCell>
                <TableCell>{v.numero_seguimiento ?? '—'}</TableCell>
                <TableCell>{v.url_seguimiento ?? '—'}</TableCell>
                <TableCell>{v.revisado_por_ml ? 'Sí' : 'No'}</TableCell>
                <TableCell>{safeDate(v.fecha_revision)}</TableCell>
                <TableCell>{money(v.dinero_a_favor)}</TableCell>
                <TableCell>{v.resultado ?? '—'}</TableCell>
                <TableCell>{v.destino ?? '—'}</TableCell>
                <TableCell>{v.motivo_resultado ?? '—'}</TableCell>
                <TableCell>{v.unidades_reclamo ?? '—'}</TableCell>
                <TableCell>{v.reclamo_abierto ? 'Sí' : 'No'}</TableCell>
                <TableCell>{v.reclamo_cerrado ? 'Sí' : 'No'}</TableCell>
                <TableCell>{v.con_mediacion ? 'Sí' : 'No'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
