'use client';

import { ArrowLeft, GitCompareArrows, Filter, Calendar as CalendarIcon, PieChart as PieChartIcon, BarChart3, Users, DollarSign } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// --- MOCK DATA ---
const kpiData = {
  wholesaleRevenue: 1250000,
  retailRevenue: 450000,
  wholesaleTransactions: 150,
  retailTransactions: 2340,
};

const revenueByTypeData = [
  { type: 'Mayorista', value: kpiData.wholesaleRevenue, color: 'hsl(var(--chart-1))' },
  { type: 'Minorista', value: kpiData.retailRevenue, color: 'hsl(var(--chart-2))' },
];

const topWholesaleCustomers = [
    { customer: 'Cliente A', revenue: 450000 },
    { customer: 'Cliente B', revenue: 320000 },
    { customer: 'Cliente C', revenue: 210000 },
    { customer: 'Cliente D', revenue: 150000 },
    { customer: 'Cliente E', revenue: 120000 },
];

const recentTransactions = [
    { id: '#3456', customer: 'Cliente A', type: 'Mayorista', amount: 35000, time: 'Hace 5 min' },
    { id: '#3457', customer: 'Público General', type: 'Minorista', amount: 250.75, time: 'Hace 8 min' },
    { id: '#3458', customer: 'Cliente C', type: 'Mayorista', amount: 18200, time: 'Hace 12 min' },
    { id: '#3459', customer: 'Público General', type: 'Minorista', amount: 890.00, time: 'Hace 15 min' },
    { id: '#3460', customer: 'Cliente B', type: 'Mayorista', amount: 52300, time: 'Hace 20 min' },
];

export default function MajorMinorSalesPage() {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

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
          <h1 className="text-xl font-bold tracking-tight">Análisis de Ventas por Mayor y Menor</h1>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
        <Card>
            <CardHeader className="flex flex-row items-center gap-4">
                <Filter className="h-6 w-6 text-muted-foreground" />
                <div>
                    <CardTitle>Filtros de Segmentación</CardTitle>
                    <CardDescription>Analiza por tipo de venta, cliente o periodo de tiempo.</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                        <Label htmlFor="date-range">Rango de Fechas</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button id="date-range" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {date?.from ? (date.to ? `${format(date.from, "LLL dd, y", { locale: es })} - ${format(date.to, "LLL dd, y", { locale: es })}` : format(date.from, "LLL dd, y", { locale: es })) : <span>Seleccionar fecha</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2} locale={es} />
                          </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="sale-type">Tipo de Venta</Label>
                        <Select defaultValue="all">
                            <SelectTrigger id="sale-type"><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                <SelectItem value="wholesale">Mayorista</SelectItem>
                                <SelectItem value="retail">Minorista</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="customer">Cliente</Label>
                        <Select defaultValue="all">
                            <SelectTrigger id="customer"><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="cliente-a">Cliente A</SelectItem>
                                <SelectItem value="cliente-b">Cliente B</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardContent>
        </Card>

        <div>
            <div className="mb-4">
                <h2 className="text-xl font-semibold">Resumen de Segmentación</h2>
                <p className="text-muted-foreground">Comparativa de ingresos y transacciones entre ventas mayoristas y minoristas.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ingresos Mayoristas</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(kpiData.wholesaleRevenue)}</div>
                  <p className="text-xs text-muted-foreground">{kpiData.wholesaleTransactions.toLocaleString('es-MX')} transacciones</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ingresos Minoristas</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(kpiData.retailRevenue)}</div>
                  <p className="text-xs text-muted-foreground">{kpiData.retailTransactions.toLocaleString('es-MX')} transacciones</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">% Ingreso Mayorista</CardTitle>
                  <PieChartIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{((kpiData.wholesaleRevenue / (kpiData.wholesaleRevenue + kpiData.retailRevenue)) * 100).toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">Del total de ingresos del periodo.</p>
                </CardContent>
              </Card>
               <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ticket Promedio Mayorista</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(kpiData.wholesaleRevenue/kpiData.wholesaleTransactions)}</div>
                  <p className="text-xs text-muted-foreground">Valor medio por transacción mayorista.</p>
                </CardContent>
              </Card>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Distribución de Ingresos por Tipo de Venta</CardTitle>
                  <CardDescription>Porcentaje de ingresos generado por cada segmento.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Tooltip formatter={(value) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value as number)} />
                      <Pie data={revenueByTypeData} dataKey="value" nameKey="type" innerRadius={60} outerRadius={80} paddingAngle={5} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                        {revenueByTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle>Top 5 Clientes Mayoristas</CardTitle>
                  <CardDescription>Clientes que generaron los mayores ingresos en el periodo seleccionado.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topWholesaleCustomers} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(value) => `$${(value as number / 1000)}k`} />
                      <YAxis type="category" dataKey="customer" width={80}/>
                      <Tooltip formatter={(value) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value as number)} />
                      <Bar dataKey="revenue" name="Ingresos" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card className="lg:col-span-5">
              <CardHeader>
                  <CardTitle>Transacciones Recientes</CardTitle>
                  <CardDescription>Listado de las últimas ventas registradas en ambos segmentos.</CardDescription>
              </CardHeader>
              <CardContent>
                 <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>ID Transacción</TableHead>
                              <TableHead>Cliente</TableHead>
                              <TableHead>Tipo de Venta</TableHead>
                              <TableHead className="text-right">Monto</TableHead>
                              <TableHead className="text-right">Hora</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {recentTransactions.map((item) => (
                              <TableRow key={item.id}>
                                  <TableCell className="font-mono text-xs">{item.id}</TableCell>
                                  <TableCell className="font-medium">{item.customer}</TableCell>
                                  <TableCell>
                                      <Badge variant={item.type === 'Mayorista' ? 'default' : 'secondary'}>{item.type}</Badge>
                                  </TableCell>
                                  <TableCell className="text-right font-medium">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(item.amount)}</TableCell>
                                  <TableCell className="text-right text-sm text-muted-foreground">{item.time}</TableCell>
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
