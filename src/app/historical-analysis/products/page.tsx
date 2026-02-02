'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { publicaciones, base_madre_productos } from '@/types/database';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut, Loader2, BarChart3 } from 'lucide-react';
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
import GlobalNav from '@/components/global-nav';

export default function ProductsPage() {
  const [publications, setPublications] = useState<publicaciones[]>([]);
  const [baseMadre, setBaseMadre] = useState<base_madre_productos[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const [baseMadreResult, publicationsResult] = await Promise.all([
          supabase
            .from('base_madre_productos')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20),
          supabase
            .from('publicaciones')
            .select('*')
            .order('item_id', { ascending: false })
            .limit(20),
        ]);

        let combinedError = '';

        // Process Publications
        const publicationsData = (publicationsResult.data as publicaciones[]) || [];
        if (publicationsResult.error) {
          combinedError += `Publicaciones: ${publicationsResult.error.message}. `;
        }
        setPublications(publicationsData);

        // Process Base Madre, augment it, and add default if needed
        if (baseMadreResult.error) {
            combinedError += `Productos Madre: ${baseMadreResult.error.message}. `;
            setBaseMadre([]);
        } else {
            let processedBaseMadre = (baseMadreResult.data as base_madre_productos[]) || [];

            // Augment with publication info
            if (processedBaseMadre.length > 0 && publicationsData.length > 0) {
                const publicationsMap = new Map<string, publicaciones>();
                publicationsData.forEach(p => {
                    if (p.sku) publicationsMap.set(p.sku, p);
                });

                processedBaseMadre = processedBaseMadre.map(bmp => {
                    if (bmp.sku && publicationsMap.has(bmp.sku)) {
                        const pub = publicationsMap.get(bmp.sku)!;
                        return {
                            ...bmp,
                            category: pub.category || bmp.category,
                            company: pub.company || bmp.company,
                        };
                    }
                    return bmp;
                });
            }
            
            // Add a default/example record if the list is empty
            if (processedBaseMadre.length === 0) {
                const defaultPubInfo = publicationsData.find(p => p.sku) ?? { sku: 'SKU-EJEMPLO', category: 'Categoría Ejemplo', company: 'Empresa Ejemplo'};
                processedBaseMadre.push({
                    id: 0,
                    tiempo_produccion: 15,
                    landed_cost: 123.45,
                    piezas_por_sku: 100,
                    sbm: 'SBM-123',
                    created_at: new Date().toISOString(),
                    sku: defaultPubInfo.sku,
                    category: defaultPubInfo.category,
                    company: defaultPubInfo.company,
                });
            }
            setBaseMadre(processedBaseMadre);
        }

        if (combinedError) setError(combinedError.trim());
      } catch (e: any) {
        let errorMessage = 'Ocurrió un error inesperado.';
        if (e instanceof TypeError && e.message.includes('Failed to fetch')) {
          errorMessage =
            'Error de red: No se pudo conectar a la base de datos. Revisa tu conexión a internet y asegúrate de que las variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY estén correctamente configuradas en tu archivo .env.';
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

      <main className="flex-1 p-4 md:p-8">
        {error && (
            <div className="p-4 mb-6 text-red-800 bg-red-100 border border-red-300 rounded-lg">
            <p className="font-bold">Error al cargar datos:</p>
            <p className="text-sm mt-1 font-mono">{error}</p>
            </div>
        )}
        
        {/* ================= BASE MADRE PRODUCTOS ================= */}
        <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            Productos Madre Base
            </h2>
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Compañía</TableHead>
                    <TableHead className="text-right">Landed Cost</TableHead>
                    <TableHead className="text-right">Tiempo Prod.</TableHead>
                    <TableHead className="text-right">Piezas/SKU</TableHead>
                    <TableHead>SBM</TableHead>
                    <TableHead className="text-center">Fecha Creación</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {baseMadre.length > 0 ? (
                    baseMadre.map((p) => (
                    <TableRow key={p.id}>
                        <TableCell className="font-mono text-primary">{p.sku ?? 'N/A'}</TableCell>
                        <TableCell>{p.category ?? '—'}</TableCell>
                        <TableCell>{p.company ?? '—'}</TableCell>
                        <TableCell className="text-right">
                        {new Intl.NumberFormat('es-MX', {
                            style: 'currency',
                            currency: 'MXN',
                        }).format(p.landed_cost ?? 0)}
                        </TableCell>
                        <TableCell className="text-right">{p.tiempo_produccion ?? '—'}</TableCell>
                        <TableCell className="text-right">{p.piezas_por_sku ?? '—'}</TableCell>
                        <TableCell>{p.sbm ?? '—'}</TableCell>
                        <TableCell className="text-center">
                        {format(new Date(p.created_at), 'dd MMM yyyy', { locale: es })}
                        </TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No se encontraron productos madre base.
                    </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
            </div>
        </section>

        {/* ============== PUBLICACIONES ============== */}
        <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            Publicaciones Recientes
            </h2>

            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Item ID</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead>Empresa</TableHead>
                </TableRow>
                </TableHeader>

                <TableBody>
                {publications.length > 0 ? (
                    publications.map((pub) => (
                    <TableRow key={pub.item_id}>
                        <TableCell className="font-mono text-primary">
                        {pub.item_id}
                        </TableCell>

                        <TableCell className="font-mono">
                        {pub.sku}
                        </TableCell>
                        
                        <TableCell className="font-medium max-w-xs truncate" title={pub.title}>
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

                        <TableCell>
                        {pub.company}
                        </TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No se encontraron publicaciones.
                    </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
            </div>
        </section>
      </main>
    </div>
  );
}
