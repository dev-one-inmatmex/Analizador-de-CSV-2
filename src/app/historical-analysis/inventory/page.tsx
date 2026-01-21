'use client';

import { ArrowLeft, Package, DollarSign, TrendingDown, Warehouse, Filter, LogOut } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { Bar, BarChart, CartesianGrid, Pie, PieChart, Cell, XAxis, YAxis, Line, LineChart } from 'recharts';
import { DateRange } from 'react-day-picker';
import { subDays } from 'date-fns';

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
const availableYears = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

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
  const [year, setYear] = React.useState(new Date().getFullYear().toString());
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

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
    setYear(new Date().getFullYear().toString());
    setDate({ from: subDays(new Date(), 29), to: new Date() });

    // Reset data to original
    setKpis(kpiData);
    setDisplayedMovement(inventoryMovementData);
    setDisplayedInventoryDetail(inventoryDetailData);
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
          <h1 className="text-xl font-bold tracking-tight">Análisis de Inventario</h1>
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
                    <CardTitle>Filtros de Inventario</CardTitle>
                    <CardDescription>Filtra por período, categoría, estado de stock o busca un producto específico.</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                        <Label htmlFor="date-range">Periodo</Label>
                        <DateRangePicker id="date-range" date={date} onSelect={setDate} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="year-filter">Año</Label>
                        <Select value={year} onValueChange={setYear}>
                            <SelectTrigger id="year-filter">
                                <SelectValue placeholder="Seleccionar año" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>
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
        </Tabs>
      </main>
    </div>
  );
}
