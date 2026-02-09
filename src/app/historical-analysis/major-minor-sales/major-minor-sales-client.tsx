'use client';

import { GitCompareArrows, Filter, PieChart as PieChartIcon, BarChart3, DollarSign, Loader2 } from 'lucide-react';
import * as React from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DateRange } from 'react-day-picker';
import { subDays } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { Transaction } from './page';

const PAGE_SIZE = 10;

export default function MajorMinorSalesClientPage({ initialRecentTransactions }: { initialRecentTransactions: Transaction[] }) {
  const { toast } = useToast();
  
  const [saleType, setSaleType] = React.useState('Todos');
  const [customer, setCustomer] = React.useState('Todos');
  const [date, setDate] = React.useState<DateRange | undefined>();
  const [isClient, setIsClient] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);

  React.useEffect(() => {
    setDate({
      from: subDays(new Date(), 29),
      to: new Date(),
    });
    setIsClient(true);
  }, []);

  const { displayedTransactions, allCustomers, kpis, revenueByTypeData, topWholesaleCustomersData } = React.useMemo(() => {
    const customers = ['Todos', ...Array.from(new Set(initialRecentTransactions.map(t => t.customer)))];
    
    const filtered = initialRecentTransactions.filter(t => {
      const typeMatch = saleType === 'Todos' || t.type === saleType;
      const customerMatch = customer === 'Todos' || t.customer === customer;
      // Date filtering logic would go here
      return typeMatch && customerMatch;
    });

    // Calculate KPIs from filtered data
    const wholesaleRevenue = filtered.filter(t => t.type === 'Mayorista').reduce((sum, t) => sum + t.amount, 0);
    const retailRevenue = filtered.filter(t => t.type === 'Minorista').reduce((sum, t) => sum + t.amount, 0);
    const wholesaleTransactions = filtered.filter(t => t.type === 'Mayorista').length;
    const retailTransactions = filtered.filter(t => t.type === 'Minorista').length;
    
    // Revenue by type for Pie Chart
    const revenueData = [
      { type: 'Mayorista', value: wholesaleRevenue, color: 'hsl(var(--chart-1))' },
      { type: 'Minorista', value: retailRevenue, color: 'hsl(var(--chart-2))' },
    ];
    
    // Top wholesale customers for Bar Chart
    const customerRevenue: Record<string, number> = {};
    filtered.filter(t => t.type === 'Mayorista').forEach(t => {
      customerRevenue[t.customer] = (customerRevenue[t.customer] || 0) + t.amount;
    });
    
    const topCustomers = Object.entries(customerRevenue)
      .map(([customer, revenue]) => ({ customer, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      displayedTransactions: filtered,
      allCustomers: customers,
      kpis: { wholesaleRevenue, retailRevenue, wholesaleTransactions, retailTransactions },
      revenueByTypeData: revenueData,
      topWholesaleCustomersData: topCustomers
    };
  }, [initialRecentTransactions, saleType, customer, date]);

  const handleApplyFilters = () => {
    toast({
      title: 'Filtros aplicados',
      description: 'Los datos de ventas han sido actualizados.',
    });
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    toast({
      title: 'Filtros limpiados',
      description: 'Mostrando todos los datos originales.',
    });
    setSaleType('Todos');
    setCustomer('Todos');
    setDate({ from: subDays(new Date(), 29), to: new Date() });
    setCurrentPage(1);
  };
  
  const totalPages = Math.ceil(displayedTransactions.length / PAGE_SIZE);
  const paginatedTransactions = displayedTransactions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  if (!isClient) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-xl font-bold tracking-tight">Análisis de Ventas por Mayor y Menor</h1>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center p-4 md:p-10">
        <div className="w-full max-w-7xl space-y-4 md:space-y-8">
            <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                    <Filter className="h-6 w-6 text-muted-foreground" />
                    <div><CardTitle>Filtros de Segmentación</CardTitle><CardDescription>Analiza por tipo de venta, cliente o periodo de tiempo.</CardDescription></div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-2 lg:col-span-2"><Label htmlFor="date-range">Periodo</Label><DateRangePicker id="date-range" date={date} onSelect={setDate} /></div>
                        <div className="space-y-2"><Label htmlFor="type-filter">Tipo de Venta</Label><Select value={saleType} onValueChange={setSaleType}><SelectTrigger id="type-filter"><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger><SelectContent>{['Todos', 'Mayorista', 'Minorista'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label htmlFor="customer-filter">Cliente</Label><Select value={customer} onValueChange={setCustomer}><SelectTrigger id="customer-filter"><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger><SelectContent>{allCustomers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                    </div>
                    <div className="mt-4 flex items-center justify-end gap-2"><Button variant="outline" onClick={handleClearFilters}>Limpiar Filtros</Button><Button onClick={handleApplyFilters}>Aplicar Filtros</Button></div>
                </CardContent>
            </Card>

            <div>
                <div className="mb-4"><h2 className="text-xl font-semibold">Resumen de Segmentación</h2><p className="text-muted-foreground">Comparativa de ingresos y transacciones entre ventas mayoristas y minoristas.</p></div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ingresos Mayoristas</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(kpis.wholesaleRevenue)}</div><p className="text-xs text-muted-foreground">{kpis.wholesaleTransactions.toLocaleString('es-MX')} transacciones</p></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ingresos Minoristas</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(kpis.retailRevenue)}</div><p className="text-xs text-muted-foreground">{kpis.retailTransactions.toLocaleString('es-MX')} transacciones</p></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">% Ingreso Mayorista</CardTitle><PieChartIcon className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{((kpis.wholesaleRevenue / (kpis.wholesaleRevenue + kpis.retailRevenue || 1)) * 100).toFixed(1)}%</div><p className="text-xs text-muted-foreground">Del total de ingresos del periodo.</p></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ticket Promedio Mayorista</CardTitle><BarChart3 className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(kpis.wholesaleTransactions > 0 ? kpis.wholesaleRevenue / kpis.wholesaleTransactions : 0)}</div><p className="text-xs text-muted-foreground">Valor medio por transacción.</p></CardContent></Card>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                <Card className="lg:col-span-2"><CardHeader><CardTitle>Distribución de Ingresos</CardTitle><CardDescription>Porcentaje de ingresos generado por cada segmento.</CardDescription></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><PieChart><Tooltip formatter={(value) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value as number)} /><Pie data={revenueByTypeData} dataKey="value" nameKey="type" innerRadius={60} outerRadius={80} paddingAngle={5} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>{revenueByTypeData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Pie><Legend /></PieChart></ResponsiveContainer></CardContent></Card>
                <Card className="lg:col-span-3"><CardHeader><CardTitle>Top 5 Clientes Mayoristas</CardTitle><CardDescription>Clientes que generaron los mayores ingresos en el periodo.</CardDescription></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><BarChart data={topWholesaleCustomersData} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" tickFormatter={(value) => `$${(value as number / 1000)}k`} /><YAxis type="category" dataKey="customer" width={80}/><Tooltip formatter={(value) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value as number)} /><Bar dataKey="revenue" name="Ingresos" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>
                <Card className="lg:col-span-5"><CardHeader><CardTitle>Transacciones Recientes</CardTitle><CardDescription>Listado de las últimas ventas registradas en los segmentos.</CardDescription></CardHeader><CardContent>{paginatedTransactions.length > 0 ? (<Table><TableHeader><TableRow><TableHead>ID Transacción</TableHead><TableHead>Cliente</TableHead><TableHead>Tipo de Venta</TableHead><TableHead className="text-right">Monto</TableHead><TableHead className="text-right">Hora</TableHead></TableRow></TableHeader><TableBody>{paginatedTransactions.map((item) => (<TableRow key={item.id}><TableCell className="font-mono text-xs">{item.id}</TableCell><TableCell className="font-medium">{item.customer}</TableCell><TableCell><Badge variant={item.type === 'Mayorista' ? 'default' : 'secondary'}>{item.type}</Badge></TableCell><TableCell className="text-right font-medium">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(item.amount)}</TableCell><TableCell className="text-right text-sm text-muted-foreground">{item.time}</TableCell></TableRow>))}</TableBody></Table>) : (<Alert><GitCompareArrows className="h-4 w-4" /><AlertTitle>No hay transacciones</AlertTitle><AlertDescription>No se encontraron registros para el periodo o filtros seleccionados.</AlertDescription></Alert>)}</CardContent>
                {totalPages > 1 && (<CardFooter><div className="flex w-full items-center justify-between text-xs text-muted-foreground"><div>Página {currentPage} de {totalPages}</div><div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</Button><Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Siguiente</Button></div></div></CardFooter>)}
                </Card>
            </div>
        </div>
      </main>
    </>
  );
}
