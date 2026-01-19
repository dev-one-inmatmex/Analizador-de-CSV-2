'use client';

import { ArrowLeft, GitCompareArrows, Filter, PieChart as PieChartIcon, BarChart3, Users, DollarSign, LogOut } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { addDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { DateRangePicker } from '@/components/ui/date-range-picker';

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

const topWholesaleCustomersData = [
    { customer: 'Cliente A', revenue: 450000 },
    { customer: 'Cliente B', revenue: 320000 },
    { customer: 'Cliente C', revenue: 210000 },
    { customer: 'Cliente D', revenue: 150000 },
    { customer: 'Cliente E', revenue: 120000 },
];

const recentTransactionsData = [
    { id: '#3456', customer: 'Cliente A', type: 'Mayorista', amount: 35000, time: 'Hace 5 min' },
    { id: '#3457', customer: 'Público General', type: 'Minorista', amount: 250.75, time: 'Hace 8 min' },
    { id: '#3458', customer: 'Cliente C', type: 'Mayorista', amount: 18200, time: 'Hace 12 min' },
    { id: '#3459', customer: 'Público General', type: 'Minorista', amount: 890.00, time: 'Hace 15 min' },
    { id: '#3460', customer: 'Cliente B', type: 'Mayorista', amount: 52300, time: 'Hace 20 min' },
    { id: '#3461', customer: 'Público General', type: 'Minorista', amount: 150.00, time: 'Hace 22 min' },
    { id: '#3462', customer: 'Cliente D', type: 'Mayorista', amount: 22000, time: 'Hace 25 min' },
];

export default function MajorMinorSalesPage() {
  const { toast } = useToast();
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [saleType, setSaleType] = React.useState('all');
  const [customer, setCustomer] = React.useState('all');
  
  const [kpis, setKpis] = React.useState(kpiData);
  const [displayedTransactions, setDisplayedTransactions] = React.useState(recentTransactionsData);
  const [displayedTopCustomers, setDisplayedTopCustomers] = React.useState(topWholesaleCustomersData);

  const handleApplyFilters = () => {
    toast({
      title: 'Filtros aplicados',
      description: 'Los datos de ventas han sido actualizados.',
    });

    const shuffle = (arr: any[]) => [...arr].sort(() => Math.random() - 0.5);
    
    let filteredTransactions = [...recentTransactionsData];
    if (saleType !== 'all') {
        filteredTransactions = filteredTransactions.filter(t => t.type.toLowerCase().startsWith(saleType));
    }
    if (customer !== 'all') {
        filteredTransactions = filteredTransactions.filter(t => t.customer === customer);
    }
    setDisplayedTransactions(shuffle(filteredTransactions));
    setDisplayedTopCustomers(shuffle(topWholesaleCustomersData));

    setKpis(prev => ({
      ...prev,
      wholesaleRevenue: prev.wholesaleRevenue * (Math.random() * 0.4 + 0.8),
      retailRevenue: prev.retailRevenue * (Math.random() * 0.4 + 0.8),
    }));
  };

  const handleClearFilters = () => {
    toast({
      title: 'Filtros limpiados',
      description: 'Mostrando todos los datos originales.',
    });
    setDate({ from: addDays(new Date(), -30), to: new Date() });
    setSaleType('all');
    setCustomer('all');

    setKpis(kpiData);
    setDisplayedTransactions(recentTransactionsData);
    setDisplayedTopCustomers(topWholesaleCustomersData);
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
          <h1 className="text-xl font-bold tracking-tight">Análisis de Ventas por Mayor y Menor</h1>
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
                    <CardTitle>Filtros de Segmentación</CardTitle>
                    <CardDescription>Analiza por tipo de venta, cliente o periodo de tiempo.</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                        <Label htmlFor="date-range">Rango de Fechas</Label>
                        <DateRangePicker id="date-range" date={date} onSelect={setDate} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="sale-type">Tipo de Venta</Label>
                        <Select value={saleType} onValueChange={setSaleType}>
                            <SelectTrigger id="sale-type"><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                <SelectItem value="mayoris">Mayorista</SelectItem>
                                <SelectItem value="minoris">Minorista</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="customer">Cliente</Label>
                        <Select value={customer} onValueChange={setCustomer}>
                            <SelectTrigger id="customer"><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="Cliente A">Cliente A</SelectItem>
                                <SelectItem value="Cliente B">Cliente B</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="col-span-1 grid grid-cols-2 items-end gap-2 sm:col-span-2 lg:col-span-3">
                        <Button className="w-full" onClick={handleApplyFilters}>Aplicar Filtros</Button>
                        <Button variant="outline" className="w-full" onClick={handleClearFilters}>Limpiar</Button>
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
                  <div className="text-2xl font-bold">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(kpis.wholesaleRevenue)}</div>
                  <p className="text-xs text-muted-foreground">{kpis.wholesaleTransactions.toLocaleString('es-MX')} transacciones</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ingresos Minoristas</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(kpis.retailRevenue)}</div>
                  <p className="text-xs text-muted-foreground">{kpis.retailTransactions.toLocaleString('es-MX')} transacciones</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">% Ingreso Mayorista</CardTitle>
                  <PieChartIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{((kpis.wholesaleRevenue / (kpis.wholesaleRevenue + kpis.retailRevenue)) * 100).toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">Del total de ingresos del periodo.</p>
                </CardContent>
              </Card>
               <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ticket Promedio Mayorista</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(kpis.wholesaleRevenue/kpis.wholesaleTransactions)}</div>
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
                    <BarChart data={displayedTopCustomers} layout="vertical">
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
                          {displayedTransactions.map((item) => (
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
