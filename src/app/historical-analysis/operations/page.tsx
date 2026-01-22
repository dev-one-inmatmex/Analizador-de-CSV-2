'use client';

import { ArrowLeft, ShoppingCart, Truck, DollarSign, Timer, Filter, LogOut, Loader2, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, Tooltip, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { DateRange } from 'react-day-picker';
import { subDays, format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useToast } from '@/hooks/use-toast';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import GlobalNav from '@/components/global-nav';

// --- MOCK DATA ---
const kpiData = {
  totalCost: 285450.75,
  supplierCount: 12,
  avgOrderCost: 11418.03,
  avgLeadTime: 5.2, // in days
};

const costByMonthData = [
  { month: 'Ene', cost: 35000 },
  { month: 'Feb', cost: 42000 },
  { month: 'Mar', cost: 38000 },
  { month: 'Abr', cost: 55000 },
  { month: 'May', cost: 62000 },
  { month: 'Jun', cost: 53450.75 },
];

const spendingBySupplierData = [
  { supplier: 'Proveedor A', spending: 95000, color: 'hsl(var(--chart-1))' },
  { supplier: 'Proveedor B', spending: 72000, color: 'hsl(var(--chart-2))' },
  { supplier: 'Proveedor C', spending: 58000, color: 'hsl(var(--chart-3))' },
  { supplier: 'Otros', spending: 60450.75, color: 'hsl(var(--chart-4))' },
];

const recentOrdersData = [
    { id: 'OC-0534', supplier: 'Proveedor A', category: 'Materia Prima', amount: 25000, date: '2024-06-15', status: 'Recibido' },
    { id: 'OC-0535', supplier: 'Proveedor B', category: 'Empaques', amount: 8500, date: '2024-06-18', status: 'Recibido' },
    { id: 'OC-0536', supplier: 'Proveedor C', category: 'Insumos Oficina', amount: 3200, date: '2024-06-20', status: 'Pendiente' },
    { id: 'OC-0537', supplier: 'Proveedor A', category: 'Materia Prima', amount: 32000, date: '2024-06-21', status: 'En Tránsito' },
    { id: 'OC-0538', supplier: 'Proveedor D', category: 'Mantenimiento', amount: 15000, date: '2024-06-22', status: 'Pendiente' },
];

const allSuppliers = ['Todos', 'Proveedor A', 'Proveedor B', 'Proveedor C', 'Proveedor D'];
const allStatus = ['Todos', 'Recibido', 'Pendiente', 'En Tránsito', 'Cancelado'];

export default function AcquisitionsAnalysisPage() {
  const { toast } = useToast();
  
  const [supplier, setSupplier] = React.useState('Todos');
  const [status, setStatus] = React.useState('Todos');
  const [date, setDate] = React.useState<DateRange | undefined>();
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setDate({
      from: subDays(new Date(), 90),
      to: new Date(),
    });
    setIsClient(true);
  }, []);
  
  const handleApplyFilters = () => {
    toast({
      title: 'Filtros aplicados',
      description: 'Los datos de adquisiciones han sido actualizados.',
    });
  };

  const handleClearFilters = () => {
    toast({
      title: 'Filtros limpiados',
      description: 'Mostrando todos los datos originales.',
    });
    setSupplier('Todos');
    setStatus('Todos');
    setDate({ from: subDays(new Date(), 90), to: new Date() });
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
          <h1 className="text-xl font-bold tracking-tight">Análisis de Adquisiciones</h1>
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
                    <CardTitle>Filtros de Adquisiciones</CardTitle>
                    <CardDescription>Analiza por proveedor, estado de orden o periodo de tiempo.</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className='space-y-2'>
                        <Label htmlFor="date-range">Periodo</Label>
                        <DateRangePicker id="date-range" date={date} onSelect={setDate} />
                    </div>
                    <div className='space-y-2'>
                        <Label htmlFor="supplier-filter">Proveedor</Label>
                        <Select value={supplier} onValueChange={setSupplier}>
                            <SelectTrigger id="supplier-filter">
                                <SelectValue placeholder="Seleccionar proveedor" />
                            </SelectTrigger>
                            <SelectContent>
                                {allSuppliers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className='space-y-2'>
                        <Label htmlFor="status-filter">Estado de Orden</Label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger id="status-filter">
                                <SelectValue placeholder="Seleccionar estado" />
                            </SelectTrigger>
                            <SelectContent>
                                {allStatus.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
                <h2 className="text-xl font-semibold">Resumen de Adquisiciones</h2>
                <p className="text-muted-foreground">Indicadores clave de tus compras y proveedores.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Costo Total de Adquisiciones</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(kpiData.totalCost)}</div>
                        <p className="text-xs text-muted-foreground">Gasto total en el periodo seleccionado.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Proveedores Activos</CardTitle>
                        <Truck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpiData.supplierCount}</div>
                        <p className="text-xs text-muted-foreground">Proveedores con órdenes en el periodo.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Costo Promedio por Orden</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(kpiData.avgOrderCost)}</div>
                        <p className="text-xs text-muted-foreground">Valor medio de cada orden de compra.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tiempo de Entrega Promedio</CardTitle>
                        <Timer className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpiData.avgLeadTime} días</div>
                        <p className="text-xs text-muted-foreground">Desde la orden hasta la recepción.</p>
                    </CardContent>
                </Card>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Costo de Adquisiciones por Mes</CardTitle>
                    <CardDescription>Evolución del gasto mensual en compras.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={costByMonthData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `$${(value as number / 1000)}k`} />
                      <Tooltip formatter={(value) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value as number)} />
                      <Legend />
                      <Line type="monotone" dataKey="cost" name="Costo" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Gasto por Proveedor</CardTitle>
                    <CardDescription>Distribución del gasto entre los principales proveedores.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Tooltip formatter={(value) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value as number)} />
                            <Pie data={spendingBySupplierData} dataKey="spending" nameKey="supplier" innerRadius={60} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                                {spendingBySupplierData.map((entry) => (
                                    <Cell key={entry.supplier} fill={entry.color} />
                                ))}
                            </Pie>
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card>
              <CardHeader>
                  <CardTitle>Órdenes de Compra Recientes</CardTitle>
                  <CardDescription>Listado de las últimas adquisiciones registradas.</CardDescription>
              </CardHeader>
              <CardContent>
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Orden #</TableHead>
                              <TableHead>Proveedor</TableHead>
                              <TableHead className="text-right">Monto</TableHead>
                              <TableHead>Estado</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {recentOrdersData.map((order) => (
                              <TableRow key={order.id}>
                                  <TableCell className="font-mono text-xs">{order.id}</TableCell>
                                  <TableCell className="font-medium">{order.supplier}</TableCell>
                                  <TableCell className="text-right">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(order.amount)}</TableCell>
                                  <TableCell>
                                    <Badge variant={order.status === 'Recibido' ? 'secondary' : order.status === 'En Tránsito' ? 'default' : 'outline'}>
                                        {order.status}
                                    </Badge>
                                  </TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
