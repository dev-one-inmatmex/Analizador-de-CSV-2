'use client';

import { ArrowLeft, Package, TrendingUp, Filter, Clock, Gauge, BarChartHorizontal, LogOut } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

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


// --- MOCK DATA ---

const kpiData = {
  currentStock: 850,
  avgConsumption: 55, // Daily
  estimatedDuration: 15, // Days
  maxConsumption: 90, // Daily
};

const chartConfigMovement = {
  stock: { label: 'Stock', color: 'hsl(var(--chart-1))' },
  entradas: { label: 'Entradas', color: 'hsl(var(--chart-2))' },
  salidas: { label: 'Salidas (Consumo)', color: 'hsl(var(--chart-3))' },
};

const stockMovementData = [
  { date: 'Hace 7d', stock: 1200, entradas: 100, salidas: 50 },
  { date: 'Hace 6d', stock: 1250, entradas: 150, salidas: 80 },
  { date: 'Hace 5d', stock: 1320, entradas: 50, salidas: 120 },
  { date: 'Hace 4d', stock: 1250, entradas: 80, salidas: 90 },
  { date: 'Hace 3d', stock: 1240, entradas: 200, salidas: 70 },
  { date: 'Hace 2d', stock: 1370, entradas: 0, salidas: 150 },
  { date: 'Ayer', stock: 1220, entradas: 10, salidas: 110 },
  { date: 'Hoy', stock: 850, entradas: 0, salidas: 260 },
];

const topConsumersData = [
  { product: 'Producto A', consumption: 120 },
  { product: 'Producto C', consumption: 95 },
  { product: 'Producto B', consumption: 80 },
  { product: 'Producto E', consumption: 60 },
  { product: 'Producto D', consumption: 45 },
];

const productDetailData = [
  { sku: 'PROD-A-001', product: 'Producto A', stock: 250, avgConsumption: 18, lastProduced: '2024-05-10' },
  { sku: 'PROD-B-002', product: 'Producto B', stock: 150, avgConsumption: 12, lastProduced: '2024-05-12' },
  { sku: 'PROD-C-003', product: 'Producto C', stock: 300, avgConsumption: 25, lastProduced: '2024-05-08' },
  { sku: 'PROD-D-004', product: 'Producto D', stock: 50, avgConsumption: 5, lastProduced: '2024-04-20' },
  { sku: 'PROD-E-005', product: 'Producto E', stock: 100, avgConsumption: 8, lastProduced: '2024-05-15' },
];


export default function ProductsAnalysisPage() {
  const { toast } = useToast();
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: addDays(new Date(), -7),
    to: new Date(),
  });
  const [product, setProduct] = React.useState('all');

  const [kpis, setKpis] = React.useState(kpiData);
  const [displayedMovement, setDisplayedMovement] = React.useState(stockMovementData);
  const [displayedDetails, setDisplayedDetails] = React.useState(productDetailData);

  const handleApplyFilters = () => {
    toast({
        title: "Filtros aplicados",
        description: "Los datos de productos han sido actualizados."
    });

    let filteredDetails = [...productDetailData];
    if (product !== 'all') {
        filteredDetails = filteredDetails.filter(p => p.sku === product);
    }
    setDisplayedDetails(filteredDetails.sort(() => Math.random() - 0.5));

    setKpis(prev => ({
        ...prev,
        currentStock: Math.floor(prev.currentStock * (Math.random() * 0.4 + 0.8)),
        avgConsumption: Math.floor(prev.avgConsumption * (Math.random() * 0.2 + 0.9)),
    }));
    
    setDisplayedMovement(prev => prev.map(m => ({
        ...m,
        stock: Math.floor(m.stock * (Math.random() * 0.3 + 0.8)),
        entradas: Math.floor(m.entradas * (Math.random() * 0.5 + 0.7)),
        salidas: Math.floor(m.salidas * (Math.random() * 0.5 + 0.7)),
    })));
  };

  const handleClearFilters = () => {
    toast({
        title: "Filtros limpiados",
        description: "Mostrando todos los datos originales."
    });
    setDate({ from: addDays(new Date(), -7), to: new Date() });
    setProduct('all');

    setKpis(kpiData);
    setDisplayedMovement(stockMovementData);
    setDisplayedDetails(productDetailData);
  };

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
          <h1 className="text-xl font-bold tracking-tight">Análisis de Productos</h1>
        </div>
        <div>
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
                    <CardTitle>Filtros de Análisis</CardTitle>
                    <CardDescription>Filtra por producto o rango de fechas para refinar el análisis.</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
                <div className="space-y-2">
                    <Label htmlFor="date-range">Rango de Fechas</Label>
                    <DateRangePicker id="date-range" date={date} onSelect={setDate} />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="product">Producto</Label>
                        <Select value={product} onValueChange={setProduct}>
                            <SelectTrigger id="product" className="w-full">
                                <SelectValue placeholder="Seleccionar producto" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los productos</SelectItem>
                                <SelectItem value="PROD-A-001">Producto A</SelectItem>
                                <SelectItem value="PROD-B-002">Producto B</SelectItem>
                                <SelectItem value="PROD-C-003">Producto C</SelectItem>
                                <SelectItem value="PROD-D-004">Producto D</SelectItem>
                                <SelectItem value="PROD-E-005">Producto E</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" onClick={handleClearFilters}>Limpiar Filtros</Button>
                    <Button onClick={handleApplyFilters}>Aplicar Filtros</Button>
                </div>
            </CardContent>
        </Card>

        <div>
            <div className="mb-4">
                <h2 className="text-xl font-semibold">Resumen del Ciclo de Producto</h2>
                <p className="text-muted-foreground">Indicadores clave sobre el stock, consumo y duración.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Stock Actual Total</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpis.currentStock.toLocaleString('es-MX')} Unidades</div>
                  <p className="text-xs text-muted-foreground">Cantidad total de productos disponibles.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Consumo Promedio (Diario)</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpis.avgConsumption.toLocaleString('es-MX')} Unidades</div>
                  <p className="text-xs text-muted-foreground">Media de unidades consumidas por día.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Duración Estimada de Stock</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpis.estimatedDuration} días</div>
                  <p className="text-xs text-muted-foreground">Tiempo hasta agotar el stock actual.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Consumo Máximo (Diario)</CardTitle>
                  <Gauge className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpis.maxConsumption.toLocaleString('es-MX')} Unidades</div>
                  <p className="text-xs text-muted-foreground">Pico de consumo registrado en un día.</p>
                </CardContent>
              </Card>
            </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Resumen Gráfico</TabsTrigger>
            <TabsTrigger value="details">Detalle de Productos</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Histórico de Movimiento de Stock</CardTitle>
                  <CardDescription>Evolución del stock, entradas y salidas en el periodo seleccionado.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfigMovement} className="h-[350px] w-full">
                    <LineChart data={displayedMovement} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                      <CartesianGrid vertical={false} />
                      <YAxis />
                      <XAxis dataKey="date" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend />
                      <Line type="monotone" dataKey="stock" stroke="var(--color-stock)" strokeWidth={3} dot={false} />
                      <Line type="monotone" dataKey="entradas" stroke="var(--color-entradas)" strokeWidth={2} dot={true} />
                      <Line type="monotone" dataKey="salidas" stroke="var(--color-salidas)" strokeWidth={2} dot={true} />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Productos con Mayor Consumo</CardTitle>
                  <CardDescription>Top 5 productos más consumidos en el periodo.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="h-[350px] w-full">
                    <BarChart data={topConsumersData} layout="vertical" margin={{ left: 30 }}>
                        <CartesianGrid horizontal={false} />
                        <YAxis dataKey="product" type="category" tickLine={false} axisLine={false} width={100} />
                        <XAxis type="number" hide />
                        <ChartTooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent hideLabel />} />
                        <Bar dataKey="consumption" fill="hsl(var(--primary))" radius={4} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                  <CardTitle>Detalle de Productos</CardTitle>
                  <CardDescription>Información detallada de cada producto, incluyendo stock y consumo.</CardDescription>
              </CardHeader>
              <CardContent>
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>SKU</TableHead>
                              <TableHead>Producto</TableHead>
                              <TableHead className="text-right">Stock Actual</TableHead>
                              <TableHead className="text-right">Consumo Promedio (Diario)</TableHead>
                              <TableHead className="text-center">Fecha Última Elaboración</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {displayedDetails.map((item) => (
                              <TableRow key={item.sku}>
                                  <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                                  <TableCell className="font-medium">{item.product}</TableCell>
                                  <TableCell className="text-right">{item.stock.toLocaleString('es-MX')}</TableCell>
                                  <TableCell className="text-right">{item.avgConsumption.toLocaleString('es-MX')}</TableCell>
                                  <TableCell className="text-center">{format(new Date(item.lastProduced), "dd MMM, yyyy", { locale: es })}</TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
