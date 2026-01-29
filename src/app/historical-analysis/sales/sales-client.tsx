'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, LogOut, Loader2, Filter } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import type { ventas as VentasType } from '@/types/database'

import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import GlobalNav from '@/components/global-nav'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function VentasPage() {
  const [ventas, setVentas] = React.useState<VentasType[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const fetchVentas = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('ventas')
        .select('*')
        .order('fecha_venta', { ascending: false })
        .limit(100)

      if (error) {
        setError(error.message)
        setVentas([])
      } else {
        setVentas(data as VentasType[])
      }
      setLoading(false)
    }

    fetchVentas()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <GlobalNav />

      <main className="p-6 space-y-6">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Historial de Ventas</h1>

          <div className="flex gap-2">
            <Link href="/historical-analysis">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>

            <Button variant="outline">
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión
            </Button>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* TABLA */}
        <div className="border rounded-lg bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Venta #</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Publicación</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Variante</TableHead>
                <TableHead className="text-center">Unidades</TableHead>
                <TableHead className="text-right">Precio Unit.</TableHead>
                <TableHead className="text-right">Ingreso Prod.</TableHead>
                <TableHead className="text-right">Impuestos</TableHead>
                <TableHead className="text-right">Ingreso Envío</TableHead>
                <TableHead className="text-right">Costo Envío</TableHead>
                <TableHead className="text-right">Dif. Peso</TableHead>
                <TableHead className="text-right">Anulaciones</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Fecha</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead>Comprador</TableHead>
                <TableHead>País</TableHead>
                <TableHead>CP</TableHead>
                <TableHead>Tags</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {ventas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={20} className="text-center py-8 text-muted-foreground">
                    No se encontraron ventas.
                  </TableCell>
                </TableRow>
              ) : (
                ventas.map((v) => (
                  <TableRow key={v.numero_venta}>
                    <TableCell>{v.numero_venta}</TableCell>
                    <TableCell>{v.sku ?? '—'}</TableCell>
                    <TableCell>{v.numero_publicacion ?? '—'}</TableCell>
                    <TableCell className="max-w-[240px] truncate">
                      {v.titulo_publicacion ?? '—'}
                    </TableCell>
                    <TableCell>{v.variante ?? '—'}</TableCell>
                    <TableCell className="text-center">{v.unidades}</TableCell>
                    <TableCell className="text-right">
                      ${v.precio_unitario.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${v.ingreso_productos.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${v.cargo_venta_impuestos.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${v.ingreso_envio.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${v.costo_envio.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${v.cargo_diferencia_peso.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${v.anulaciones_reembolsos.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${v.total.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      {new Date(v.fecha_venta).toLocaleDateString('es-MX')}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={v.estado === 'paid' ? 'secondary' : 'outline'}>
                        {v.descripcion_estado ?? v.estado ?? '—'}
                      </Badge>
                    </TableCell>
                    <TableCell>{v.comprador ?? '—'}</TableCell>
                    <TableCell>{v.pais ?? '—'}</TableCell>
                    <TableCell>{v.codigo_postal ?? '—'}</TableCell>
                    <TableCell className="flex gap-1">
                      {v.es_paquete_varios && <Badge>Paquete</Badge>}
                      {v.negocio && <Badge>Negocio</Badge>}
                      {v.reclamo_abierto && <Badge variant="destructive">Reclamo</Badge>}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </>
  )
}
