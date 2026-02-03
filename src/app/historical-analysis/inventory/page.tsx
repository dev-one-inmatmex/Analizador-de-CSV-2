// 'use client';

// import * as React from 'react';
// import Link from 'next/link';
// import { ArrowLeft, Loader2 } from 'lucide-react';

// import { Button } from '@/components/ui/button';
// import {
//   Card,
//   CardHeader,
//   CardTitle,
//   CardDescription,
//   CardContent,
// } from '@/components/ui/card';
// import {
//   Tabs,
//   TabsList,
//   TabsTrigger,
//   TabsContent,
// } from '@/components/ui/tabs';
// import {
//   Table,
//   TableHeader,
//   TableRow,
//   TableHead,
//   TableBody,
//   TableCell,
// } from '@/components/ui/table';
// import { useToast } from '@/hooks/use-toast';
// import GlobalNav from '@/components/global-nav';
// import { supabase } from '@/lib/supabaseClient';
// import type { categorias_madre, publicaciones } from '@/types/database';

// /* =======================
//    TYPES
// ======================= */

// type EnrichedCategoriaMadre = categorias_madre &
//   Partial<Pick<publicaciones, 'title'>>;

// /* =======================
//    COMPONENT
// ======================= */

// export default function InventoryAnalysisPage() {
//   const { toast } = useToast();

//   const [categoriasMadre, setCategoriasMadre] = React.useState<
//     EnrichedCategoriaMadre[]
//   >([]);
//   const [loadingCategorias, setLoadingCategorias] = React.useState(true);

//   React.useEffect(() => {
//     const fetchCategorias = async () => {
//       setLoadingCategorias(true);

//       try {
//         const { data: categorias, error: catError } = await supabase
//           .from('categorias_madre')
//           .select('*')
//           .order('sku', { ascending: true });

//         const { data: publicaciones, error: pubError } = await supabase
//           .from('publicaciones')
//           .select('sku, title');

//         if (catError) throw catError;
//         if (pubError) throw pubError;

//         const pubMap = new Map<string, string>();
//         publicaciones?.forEach((p) => {
//           if (p.sku) pubMap.set(p.sku, p.title);
//         });

//         const enriched: EnrichedCategoriaMadre[] =
//           categorias?.map((cat) => ({
//             ...cat,
//             title: pubMap.get(cat.sku) ?? undefined,
//           })) || [];

//         setCategoriasMadre(enriched);
//       } catch (err) {
//         console.error(err);
//         toast({
//           title: 'Error',
//           description: 'No se pudieron cargar las categorías madre',
//           variant: 'destructive',
//         });
//       } finally {
//         setLoadingCategorias(false);
//       }
//     };

//     fetchCategorias();
//   }, [toast]);

//   return (
//     <div className="flex min-h-screen flex-col bg-muted/40">
//       {/* ================= HEADER ================= */}
//       <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-6">
//         <div className="flex items-center gap-4">
//           <Link href="/historical-analysis">
//             <Button variant="outline" size="icon">
//               <ArrowLeft className="h-4 w-4" />
//             </Button>
//           </Link>
//           <h1 className="text-xl font-bold">Análisis de Inventario</h1>
//         </div>
//         <GlobalNav />
//       </header>

//       {/* ================= MAIN ================= */}
//       <main className="flex-1 p-6">
//         <Tabs defaultValue="categorias">
//           <TabsList>
//             <TabsTrigger value="categorias">
//               Categorías Madre
//             </TabsTrigger>
//           </TabsList>

//           <TabsContent value="categorias">
//             <Card>
//               <CardHeader>
//                 <CardTitle>Categorías Madre</CardTitle>
//                 <CardDescription>
//                   Información logística y estructural por categoría
//                 </CardDescription>
//               </CardHeader>

//               <CardContent>
//                 {loadingCategorias ? (
//                   <div className="flex justify-center py-10">
//                     <Loader2 className="h-8 w-8 animate-spin text-primary" />
//                   </div>
//                 ) : (
//                   <Table>
//                     <TableHeader>
//                       <TableRow>
//                         <TableHead>SKU</TableHead>
//                         <TableHead>Título</TableHead>
//                         <TableHead>Proveedor</TableHead>
//                         <TableHead className="text-right">
//                           Piezas / SKU
//                         </TableHead>
//                         <TableHead className="text-right">
//                           Piezas / Contenedor
//                         </TableHead>
//                         <TableHead>Bodega</TableHead>
//                         <TableHead>Bloque</TableHead>
//                         <TableHead className="text-right">
//                           Tiempo Producción
//                         </TableHead>
//                         <TableHead className="text-right">
//                           Tiempo Recompra
//                         </TableHead>
//                         <TableHead className="text-right">
//                           Costo Landed
//                         </TableHead>
//                       </TableRow>
//                     </TableHeader>

//                     <TableBody>
//                       {categoriasMadre.map((cat) => (
//                         <TableRow key={cat.sku}>
//                           <TableCell className="font-mono">
//                             {cat.sku}
//                           </TableCell>
//                           <TableCell>
//                             {cat.title || 'N/A'}
//                           </TableCell>
//                           <TableCell>
//                             {cat.proveedor || 'N/A'}
//                           </TableCell>
//                           <TableCell className="text-right">
//                             {cat.piezas_por_sku ?? '-'}
//                           </TableCell>
//                           <TableCell className="text-right">
//                             {cat.piezas_por_contenedor ?? '-'}
//                           </TableCell>
//                           <TableCell>
//                             {cat.bodega || '-'}
//                           </TableCell>
//                           <TableCell>
//                             {cat.bloque || '-'}
//                           </TableCell>
//                           <TableCell className="text-right">
//                             {cat.tiempo_preparacion}
//                           </TableCell>
//                           <TableCell className="text-right">
//                             {cat.tiempo_recompra}
//                           </TableCell>
//                           <TableCell className="text-right font-medium">
//                             {new Intl.NumberFormat('es-MX', {
//                               style: 'currency',
//                               currency: 'MXN',
//                             }).format(cat.landed_cost || 0)}
//                           </TableCell>
//                         </TableRow>
//                       ))}
//                     </TableBody>
//                   </Table>
//                 )}
//               </CardContent>
//             </Card>
//           </TabsContent>
//         </Tabs>
//       </main>
//     </div>
//   );
// }


'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import GlobalNav from '@/components/global-nav';

// ⚠️ OJO: esto NO debería ir en cliente (ver nota abajo)
import { supabase} from '@/lib/supabaseClient';

import type { categorias_madre, publicaciones } from '@/types/database';

/* =======================
   TYPES
======================= */

// Solo lo que realmente seleccionamos de publicaciones
type PublicacionMin = Pick<publicaciones, 'sku' | 'title'>;

// Categoría madre enriquecida con título
type EnrichedCategoriaMadre = categorias_madre & {
  title?: string;
};

/* =======================
   COMPONENT
======================= */

export default function InventoryAnalysisPage() {
  const { toast } = useToast();

  const [categoriasMadre, setCategoriasMadre] = React.useState<
    EnrichedCategoriaMadre[]
  >([]);
  const [loadingCategorias, setLoadingCategorias] =
    React.useState<boolean>(true);

  React.useEffect(() => {
    const fetchCategorias = async () => {
      setLoadingCategorias(true);

      try {
        /* =======================
           CATEGORÍAS MADRE
        ======================= */
        const { data: categorias, error: catError } = await supabase
          .from('categorias_madre')
          .select('*')
          .order('sku', { ascending: true });

        if (catError) throw catError;

        /* =======================
           PUBLICACIONES (MIN)
        ======================= */
        const { data: publicacionesData, error: pubError } = await supabase
          .from('publicaciones')
          .select('sku, title');

        if (pubError) throw pubError;

        /* =======================
           MAPA SKU → TÍTULO
        ======================= */
        const pubMap = new Map<string, string>();

        publicacionesData?.forEach((p: PublicacionMin) => {
          if (p.sku) {
            pubMap.set(p.sku, p.title ?? '');
          }
        });

        /* =======================
           ENRIQUECER CATEGORÍAS
        ======================= */
        const enriched: EnrichedCategoriaMadre[] =
          categorias?.map((cat: categorias_madre) => ({
            ...cat,
            title: pubMap.get(cat.sku),
          })) ?? [];

        setCategoriasMadre(enriched);
      } catch (err) {
        console.error(err);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar las categorías madre',
          variant: 'destructive',
        });
      } finally {
        setLoadingCategorias(false);
      }
    };

    fetchCategorias();
  }, [toast]);

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-6">
        <div className="flex items-center gap-4">
          <Link href="/historical-analysis">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Análisis de Inventario</h1>
        </div>
        <GlobalNav />
      </header>

      {/* ================= MAIN ================= */}
      <main className="flex-1 p-6">
        <Tabs defaultValue="categorias">
          <TabsList>
            <TabsTrigger value="categorias">
              Categorías Madre
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categorias">
            <Card>
              <CardHeader>
                <CardTitle>Categorías Madre</CardTitle>
                <CardDescription>
                  Información logística y estructural por categoría
                </CardDescription>
              </CardHeader>

              <CardContent>
                {loadingCategorias ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Título</TableHead>
                        <TableHead>Proveedor</TableHead>
                        <TableHead className="text-right">
                          Piezas / SKU
                        </TableHead>
                        <TableHead className="text-right">
                          Piezas / Contenedor
                        </TableHead>
                        <TableHead>Bodega</TableHead>
                        <TableHead>Bloque</TableHead>
                        <TableHead className="text-right">
                          Tiempo Producción
                        </TableHead>
                        <TableHead className="text-right">
                          Tiempo Recompra
                        </TableHead>
                        <TableHead className="text-right">
                          Costo Landed
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {categoriasMadre.map((cat) => (
                        <TableRow key={cat.sku}>
                          <TableCell className="font-mono">
                            {cat.sku}
                          </TableCell>
                          <TableCell>{cat.title || 'N/A'}</TableCell>
                          <TableCell>{cat.proveedor || 'N/A'}</TableCell>
                          <TableCell className="text-right">
                            {cat.piezas_por_sku ?? '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {cat.piezas_por_contenedor ?? '-'}
                          </TableCell>
                          <TableCell>{cat.bodega || '-'}</TableCell>
                          <TableCell>{cat.bloque || '-'}</TableCell>
                          <TableCell className="text-right">
                            {cat.tiempo_preparacion ?? '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {cat.tiempo_recompra ?? '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {new Intl.NumberFormat('es-MX', {
                              style: 'currency',
                              currency: 'MXN',
                            }).format(cat.landed_cost || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
