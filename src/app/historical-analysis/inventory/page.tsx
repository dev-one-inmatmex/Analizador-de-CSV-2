/* 'use client';

import { ArrowLeft, Package, DollarSign, TrendingDown, Warehouse, Filter, LogOut, Loader2, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { Bar, BarChart, CartesianGrid, Pie, PieChart, Cell, XAxis, YAxis, Line, LineChart } from 'recharts';
import { DateRange } from 'react-day-picker';
import { subDays, format } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import GlobalNav from '@/components/global-nav';
import { supabase } from '@/lib/supabaseClient';
import type { skus_unicos, publicaciones, categorias_madre } from '@/types/database';

// --- MOCK DATA ---

const kpiData = {
  inventoryValue: 125430.50,
  activeSKUs: 345,
  lowStockItems: 18,
  turnoverRate: 4.2,
};

const stockByCategoryData = [
  { category: 'Electrónica', value: 45000, color: 'hsl(var(--chart-1))' },
  { category: 'Ropa', value: 32000, color: 'hsl(var(--chart-2))' },
  { category: 'Hogar', value: 28000, color: 'hsl(var(--chart-3))' },
  { category: 'Juguetes', value: 15430.50, color: 'hsl(var(--chart-4))' },
  { category: 'Otros', value: 5000, color: 'hsl(var(--chart-5))' },
];

const topProductsByStockData = [
  { name: 'Laptop Pro X', stock: 150 },
  { name: 'Camisa Casual', stock: 300 },
  { name: 'Sofá Moderno', stock: 50 },
  { name: 'Figura de Acción', stock: 500 },
  { name: 'Taza de Café', stock: 800 },
];

const inventoryMovementData = [
  { date: 'Hace 7d', entradas: 400, salidas: 240 },
  { date: 'Hace 6d', entradas: 300, salidas: 139 },
  { date: 'Hace 5d', entradas: 200, salidas: 380 },
  { date: 'Hace 4d', entradas: 278, salidas: 190 },
  { date: 'Hace 3d', entradas: 189, salidas: 480 },
  { date: 'Hace 2d', entradas: 239, salidas: 380 },
  { date: 'Ayer', entradas: 349, salidas: 430 },
];

const inventoryDetailData = [
  { sku: 'LPX-001', product: 'Laptop Pro X', category: 'Electrónica', stock: 150, unitValue: 800, status: 'En Stock' },
  { sku: 'CAM-032', product: 'Camisa Casual', category: 'Ropa', stock: 300, unitValue: 25, status: 'En Stock' },
  { sku: 'SOF-001', product: 'Sofá Moderno', category: 'Hogar', stock: 50, unitValue: 400, status: 'En Stock' },
  { sku: 'JUG-015', product: 'Figura de Acción', category: 'Juguetes', stock: 500, unitValue: 15, status: 'En Stock' },
  { sku: 'TAZ-001', product: 'Taza de Café', category: 'Otros', stock: 800, unitValue: 5, status: 'En Stock' },
  { sku: 'CEL-005', product: 'Celular Gen 5', category: 'Electrónica', stock: 8, unitValue: 600, status: 'Bajo Stock' },
  { sku: 'PAN-007', product: 'Pantalón de Mezclilla', category: 'Ropa', stock: 12, unitValue: 40, status: 'Bajo Stock' },
];

const allCategories = ['Todas', 'Electrónica', 'Ropa', 'Hogar', 'Juguetes', 'Otros'];
const allStatuses = ['Todos', 'En Stock', 'Bajo Stock'];

type EnrichedSku = skus_unicos & Partial<Pick<publicaciones, 'title' | 'price' | 'company'>>;
type EnrichedCategoriaMadre = categorias_madre & Partial<Pick<publicaciones, 'title'>>;


const chartConfigCategory = {
  value: { label: 'Valor' },
  ...Object.fromEntries(stockByCategoryData.map(d => [d.category, { label: d.category, color: d.color }]))
};

const chartConfigMovement = {
  entradas: { label: 'Entradas', color: 'hsl(var(--chart-2))' },
  salidas: { label: 'Salidas', color: 'hsl(var(--chart-1))' },
};


export default function InventoryAnalysisPage() {
  const { toast } = useToast();
  
  const [category, setCategory] = React.useState('Todas');
  const [status, setStatus] = React.useState('Todos');
  const [date, setDate] = React.useState<DateRange | undefined>();
  const [isClient, setIsClient] = React.useState(false);
  
  const [skusUnicos, setSkusUnicos] = React.useState<EnrichedSku[]>([]);
  const [loadingSkus, setLoadingSkus] = React.useState(true);
  
  const [categoriasMadre, setCategoriasMadre] = React.useState<EnrichedCategoriaMadre[]>([]);
  const [loadingCategorias, setLoadingCategorias] = React.useState(true);


  React.useEffect(() => {
    setDate({
      from: subDays(new Date(), 29),
      to: new Date(),
    });
    setIsClient(true);

    const fetchData = async () => {
        if (!supabase) return;
        setLoadingSkus(true);
        setLoadingCategorias(true);
        try {
            const [skusRes, pubsRes, categoriasRes] = await Promise.all([
                supabase.from('skus_unicos').select('*').order('sku', { ascending: true }),
                supabase.from('publicaciones').select('*'),
                supabase.from('categorias_madre').select('*').order('sku', { ascending: true }),
            ]);

            if (skusRes.error) throw skusRes.error;
            if (pubsRes.error) throw pubsRes.error;
            if (categoriasRes.error) throw categoriasRes.error;


            const pubsData = (pubsRes.data as publicaciones[]) || [];
            const pubsMap = new Map<string, publicaciones>();
            for (const pub of pubsData) {
                if (pub.sku && !pubsMap.has(pub.sku)) {
                    pubsMap.set(pub.sku, pub);
                }
            }

            // Enrich SKUs Unicos
            const skusData = (skusRes.data as skus_unicos[]) || [];
            const enrichedSkus: EnrichedSku[] = skusData.map(sku => {
                const matchingPub = sku.sku ? pubsMap.get(sku.sku) : undefined;
                return {
                    ...sku,
                    title: matchingPub?.title,
                    price: matchingPub?.price,
                    company: matchingPub?.company,
                };
            });
            setSkusUnicos(enrichedSkus);
            
            // Enrich Categorias Madre
            const categoriasData = (categoriasRes.data as categorias_madre[]) || [];
            const enrichedCategorias: EnrichedCategoriaMadre[] = categoriasData.map(cat => {
                const matchingPub = cat.sku ? pubsMap.get(cat.sku) : undefined;
                return {
                    ...cat,
                    title: matchingPub?.title,
                };
            });
            setCategoriasMadre(enrichedCategorias);


        } catch (error: any) {
             console.error('Error fetching inventory data:', error);
             toast({ title: 'Error', description: 'No se pudieron cargar los datos de inventario.', variant: 'destructive'});
        } finally {
            setLoadingSkus(false);
            setLoadingCategorias(false);
        }
    };

    fetchData();
  }, [toast]);

  const [kpis, setKpis] = React.useState(kpiData);
  const [displayedInventoryDetail, setDisplayedInventoryDetail] = React.useState(inventoryDetailData);
  const [displayedMovement, setDisplayedMovement] = React.useState(inventoryMovementData);

  const handleApplyFilters = () => {
    toast({
      title: 'Filtros aplicados',
      description: 'Los datos del dashboard han sido actualizados con tu selección.',
    });

    // Simulate filtering by shuffling and slicing data
    const shuffle = (arr: any[]) => [...arr].sort(() => Math.random() - 0.5);

    setDisplayedInventoryDetail(shuffle(inventoryDetailData));
    
    setKpis(prev => ({
        ...prev,
        inventoryValue: prev.inventoryValue * (Math.random() * 0.4 + 0.8), // Fluctuate by +/- 20%
        activeSKUs: Math.floor(prev.activeSKUs * (Math.random() * 0.4 + 0.8)),
        lowStockItems: Math.floor(prev.lowStockItems * (Math.random() * 0.4 + 0.8)),
    }));

    setDisplayedMovement(prev => prev.map(d => ({ ...d, entradas: Math.floor(d.entradas * (Math.random() * 0.4 + 0.8)), salidas: Math.floor(d.salidas * (Math.random() * 0.4 + 0.8)) })))
  };

  const handleClearFilters = () => {
    toast({
      title: 'Filtros limpiados',
      description: 'Mostrando todos los datos originales.',
    });
    setCategory('Todas');
    setStatus('Todos');
    setDate({ from: subDays(new Date(), 29), to: new Date() });

    // Reset data to original
    setKpis(kpiData);
    setDisplayedMovement(inventoryMovementData);
    setDisplayedInventoryDetail(inventoryDetailData);
  };

  if (!isClient) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-muted/40">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
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
          <h1 className="text-xl font-bold tracking-tight">Análisis de Inventario</h1>
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

      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
        <Card>
            <CardHeader className="flex flex-row items-center gap-4">
                <Filter className="h-6 w-6 text-muted-foreground" />
                <div>
                    <CardTitle>Filtros de Inventario</CardTitle>
                    <CardDescription>Filtra por período, categoría, estado de stock o busca un producto específico.</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2 lg:col-span-2">
                        <Label htmlFor="date-range">Periodo</Label>
                        <DateRangePicker id="date-range" date={date} onSelect={setDate} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="category-filter">Categoría</Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger id="category-filter">
                                <SelectValue placeholder="Seleccionar categoría" />
                            </SelectTrigger>
                            <SelectContent>
                                {allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="status-filter">Estado de Stock</Label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger id="status-filter">
                                <SelectValue placeholder="Seleccionar estado" />
                            </SelectTrigger>
                            <SelectContent>
                                {allStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="mt-4 flex items-center justify-end gap-2">
                    <Button variant="outline" onClick={handleClearFilters}>Limpiar Filtros</Button>
                    <Button onClick={handleApplyFilters}>Aplicar Filtros</Button>
                </div>
            </CardContent>
        </Card>

        <div>
            <div className="mb-4">
                <h2 className="text-xl font-semibold">Resumen de Inventario</h2>
                <p className="text-muted-foreground">Indicadores clave sobre la salud actual de tu inventario.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Valor Total del Inventario</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(kpis.inventoryValue)}</div>
                  <p className="text-xs text-muted-foreground">Valor actual de todas las existencias.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">SKUs Activos</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpis.activeSKUs}</div>
                  <p className="text-xs text-muted-foreground">Número de productos únicos gestionados.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Items con Bajo Stock</CardTitle>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpis.lowStockItems}</div>
                  <p className="text-xs text-muted-foreground">Productos que necesitan reabastecimiento.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Rotación de Inventario</CardTitle>
                  <Warehouse className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpis.turnoverRate}</div>
                  <p className="text-xs text-muted-foreground">Eficiencia de renovación (mensual).</p>
                </CardContent>
              </Card>
            </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Resumen Gráfico</TabsTrigger>
            <TabsTrigger value="details">Detalle de Inventario</TabsTrigger>
            <TabsTrigger value="skus">SKUs Únicos</TabsTrigger>
            <TabsTrigger value="categorias">Categorías Madre</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Valor por Categoría</CardTitle>
                  <CardDescription>Distribución del valor monetario de las existencias por categoría.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <ChartContainer config={chartConfigCategory} className="mx-auto aspect-square h-[300px]">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent nameKey="value" hideLabel />} />
                      <Pie data={stockByCategoryData} dataKey="value" nameKey="category" innerRadius={60}>
                         {stockByCategoryData.map((entry) => (
                          <Cell key={`cell-${entry.category}`} fill={entry.color} />
                        ))}
                      </Pie>
                       <ChartLegend content={<ChartLegendContent nameKey="category" />} />
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top 5 Productos con más Stock</CardTitle>
                  <CardDescription>Productos con la mayor cantidad de unidades disponibles actualmente.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="h-[300px] w-full">
                    <BarChart data={topProductsByStockData} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid horizontal={false} />
                        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={100} />
                        <XAxis type="number" hide />
                        <ChartTooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent hideLabel />} />
                        <Bar dataKey="stock" fill="hsl(var(--primary))" radius={4} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Movimiento de Inventario (Últimos 7 días)</CardTitle>
                  <CardDescription>Comparativa de unidades entrantes y salientes.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfigMovement} className="h-[300px] w-full">
                    <LineChart data={displayedMovement} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                      <CartesianGrid vertical={false} />
                      <YAxis />
                      <XAxis dataKey="date" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend />
                      <Line type="monotone" dataKey="entradas" stroke="var(--color-entradas)" strokeWidth={2} dot={true} />
                      <Line type="monotone" dataKey="salidas" stroke="var(--color-salidas)" strokeWidth={2} dot={true} />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                  <CardTitle>Detalle Completo del Inventario</CardTitle>
                  <CardDescription>Lista de todos los productos en existencia, con su valor y estado actual.</CardDescription>
              </CardHeader>
              <CardContent>
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>SKU</TableHead>
                              <TableHead>Producto</TableHead>
                              <TableHead>Categoría</TableHead>
                              <TableHead className="text-right">Existencias</TableHead>
                              <TableHead className="text-right">Valor Unitario</TableHead>
                              <TableHead className="text-right">Valor Total</TableHead>
                              <TableHead className="text-center">Estado</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {displayedInventoryDetail.map((item) => (
                              <TableRow key={item.sku}>
                                  <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                                  <TableCell className="font-medium">{item.product}</TableCell>
                                  <TableCell>{item.category}</TableCell>
                                  <TableCell className="text-right">{item.stock}</TableCell>
                                  <TableCell className="text-right">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(item.unitValue)}</TableCell>
                                  <TableCell className="text-right font-medium">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(item.stock * item.unitValue)}</TableCell>
                                  <TableCell className="text-center">
                                      <Badge variant={item.status === 'Bajo Stock' ? 'destructive' : 'secondary'}>{item.status}</Badge>
                                  </TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="skus" className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Datos de SKUs Únicos</CardTitle>
                    <CardDescription>Información detallada de costos y producción para cada SKU maestro.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingSkus ? (
                         <div className="flex items-center justify-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                         </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Título (Publicación)</TableHead>
                                    <TableHead>Compañía</TableHead>
                                    <TableHead>Categoría</TableHead>
                                    <TableHead className="text-right">Tiempo Producción (días)</TableHead>
                                    <TableHead className="text-right">Costo (Landed)</TableHead>
                                    <TableHead className="text-right">Precio Venta (Ej.)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {skusUnicos.map((sku) => (
                                    <TableRow key={sku.sku}>
                                        <TableCell className="font-mono">{sku.sku}</TableCell>
                                        <TableCell className="font-medium">{sku.title || sku.nombre_madre || 'N/A'}</TableCell>
                                        <TableCell>{sku.company || 'N/A'}</TableCell>
                                        <TableCell>{sku.category}</TableCell>
                                        <TableCell className="text-right">{sku.tiempo_produccion}</TableCell>
                                        <TableCell className="text-right font-medium">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(sku.landed_cost || 0)}</TableCell>
                                        <TableCell className="text-right font-medium">{sku.price ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(sku.price) : 'N/A'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="categorias" className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Datos de Categorías Madre</CardTitle>
                    <CardDescription>Información de costos, producción y proveedores por categoría de producto madre.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingCategorias ? (
                         <div className="flex items-center justify-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                         </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Título (Publicación)</TableHead>
                                    <TableHead>Proveedor</TableHead>
                                    <TableHead className="text-right">Tiempo Producción (días)</TableHead>
                                    <TableHead className="text-right">Tiempo Recompra (días)</TableHead>
                                    <TableHead className="text-right">Costo (Landed)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {categoriasMadre.map((cat) => (
                                    <TableRow key={cat.sku}>
                                        <TableCell className="font-mono">{cat.sku}</TableCell>
                                        <TableCell className="font-medium">{cat.title || 'N/A'}</TableCell>
                                        <TableCell>{cat.proveedor || 'N/A'}</TableCell>
                                        <TableCell className="text-right">{cat.tiempo_produccion}</TableCell>
                                        <TableCell className="text-right">{cat.tiempo_recompra}</TableCell>
                                        <TableCell className="text-right font-medium">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cat.landed_cost || 0)}</TableCell>
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
 */

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
import { supabase } from '@/lib/supabaseClient';
import type { categorias_madre, publicaciones } from '@/types/database';

/* =======================
   TYPES
======================= */

type EnrichedCategoriaMadre = categorias_madre &
  Partial<Pick<publicaciones, 'title'>>;

/* =======================
   COMPONENT
======================= */

export default function InventoryAnalysisPage() {
  const { toast } = useToast();

  const [categoriasMadre, setCategoriasMadre] = React.useState<
    EnrichedCategoriaMadre[]
  >([]);
  const [loadingCategorias, setLoadingCategorias] = React.useState(true);

  React.useEffect(() => {
    const fetchCategorias = async () => {
      setLoadingCategorias(true);

      try {
        const { data: categorias, error: catError } = await supabase
          .from('categorias_madre')
          .select('*')
          .order('sku', { ascending: true });

        const { data: publicaciones, error: pubError } = await supabase
          .from('publicaciones')
          .select('sku, title');

        if (catError) throw catError;
        if (pubError) throw pubError;

        const pubMap = new Map<string, string>();
        publicaciones?.forEach((p) => {
          if (p.sku) pubMap.set(p.sku, p.title);
        });

        const enriched: EnrichedCategoriaMadre[] =
          categorias?.map((cat) => ({
            ...cat,
            title: pubMap.get(cat.sku) ?? undefined,
          })) || [];

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
                          <TableCell>
                            {cat.title || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {cat.proveedor || 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">
                            {cat.piezas_por_sku ?? '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {cat.piezas_por_contenedor ?? '-'}
                          </TableCell>
                          <TableCell>
                            {cat.bodega || '-'}
                          </TableCell>
                          <TableCell>
                            {cat.bloque || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {cat.tiempo_preparacion}
                          </TableCell>
                          <TableCell className="text-right">
                            {cat.tiempo_recompra}
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
