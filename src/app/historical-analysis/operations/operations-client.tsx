'use client';

import { ShoppingCart, DollarSign, Filter, Loader2, AlertTriangle, Building, Hash } from 'lucide-react';
import * as React from 'react';
import { Cell, Legend, Line, LineChart, Pie, PieChart, Tooltip, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Bar, BarChart } from 'recharts';
import { DateRange } from 'react-day-picker';
import { subDays, parseISO, format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { OperationsData, GastoDiario } from './page';

const PAGE_SIZE = 10;
const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];


export default function OperationsClient({ initialData }: { initialData: OperationsData }) {
  const { toast } = useToast();
  
  const [company, setCompany] = React.useState('Todos');
  const [date, setDate] = React.useState<DateRange | undefined>();
  const [isClient, setIsClient] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);

  React.useEffect(() => {
    setDate({ from: subDays(new Date(), 90), to: new Date() });
    setIsClient(true);
  }, []);

  const { allCompanies, filteredExpenses, kpis, charts } = React.useMemo(() => {
    const companies = ['Todos', ...Array.from(new Set(initialData.expenses.map(e => e.empresa).filter(Boolean) as string[]))];
    
    const filtered = initialData.expenses.filter(expense => {
        const companyMatch = company === 'Todos' || expense.empresa === company;
        
        let dateMatch = true;
        if (date?.from && expense.fecha) {
            try {
                const expenseDate = parseISO(expense.fecha);
                if (isValid(expenseDate)) {
                    dateMatch = expenseDate >= date.from;
                    if(date.to) {
                       dateMatch = dateMatch && expenseDate <= date.to;
                    }
                }
            } catch(e) {
                dateMatch = false;
            }
        }
        return companyMatch && dateMatch;
    });

    const totalCost = filtered.reduce((acc, item) => acc + (item.monto || 0), 0);
    const totalRecords = filtered.length;
    const companyCount = new Set(filtered.map(e => e.empresa).filter(Boolean)).size;
    const avgExpense = totalRecords > 0 ? totalCost / totalRecords : 0;

    const spendingByCompanyMap: { [key: string]: number } = {};
    filtered.forEach(item => {
        if (item.empresa && item.monto) {
            spendingByCompanyMap[item.empresa] = (spendingByCompanyMap[item.empresa] || 0) + item.monto;
        }
    });
    
    const spendingByCompany = Object.entries(spendingByCompanyMap)
        .map(([company, spending]) => ({ company, spending }))
        .sort((a, b) => b.spending - a.spending)
        .slice(0, 5); // Top 5 for the chart
    
    return {
        allCompanies: companies,
        filteredExpenses: filtered,
        kpis: { totalCost, companyCount, avgExpense, totalRecords },
        charts: { spendingByCompany }
    };

  }, [initialData.expenses, company, date]);
  
  const handleApplyFilters = () => {
    toast({
      title: 'Filtros aplicados',
      description: 'Los datos de gastos diarios han sido actualizados.',
    });
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    toast({
      title: 'Filtros limpiados',
      description: 'Mostrando todos los datos.',
    });
    setCompany('Todos');
    setDate({ from: subDays(new Date(), 90), to: new Date() });
    setCurrentPage(1);
  };

  const paginatedExpenses = filteredExpenses.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const totalPages = Math.ceil(filteredExpenses.length / PAGE_SIZE);

  if (!isClient) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-xl font-bold tracking-tight">Gastos diarios</h1>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center p-4 md:p-10">
        <div className="w-full max-w-7xl space-y-4 md:space-y-8">
            {initialData.expenses.length === 0 ? (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>No se Encontraron Datos</AlertTitle>
                    <AlertDescription>
                        No se pudieron cargar los datos de la tabla `gastos_diarios`. Asegúrate de que la tabla exista, tenga datos y la conexión a Supabase sea correcta.
                    </AlertDescription>
                </Alert>
            ) : (
            <>
                <Card>
                    <CardHeader className="flex flex-row items-center gap-4">
                        <Filter className="h-6 w-6 text-muted-foreground" />
                        <div><CardTitle>Filtros de Gastos</CardTitle><CardDescription>Analiza por empresa o periodo de tiempo.</CardDescription></div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
                            <div className='space-y-2'><Label htmlFor="date-range">Periodo</Label><DateRangePicker id="date-range" date={date} onSelect={setDate} /></div>
                            <div className='space-y-2'><Label htmlFor="company-filter">Empresa</Label><Select value={company} onValueChange={setCompany}><SelectTrigger id="company-filter"><SelectValue placeholder="Seleccionar empresa" /></SelectTrigger><SelectContent>{allCompanies.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                        <div className="mt-4 flex items-center justify-end gap-2"><Button variant="outline" onClick={handleClearFilters}>Limpiar Filtros</Button><Button onClick={handleApplyFilters}>Aplicar Filtros</Button></div>
                    </CardContent>
                </Card>

                <div>
                    <div className="mb-4"><h2 className="text-xl font-semibold">Resumen de Gastos</h2><p className="text-muted-foreground">Indicadores clave de tus gastos registrados.</p></div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Gasto Total</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(kpis.totalCost)}</div><p className="text-xs text-muted-foreground">Gasto total en el periodo filtrado.</p></CardContent></Card>
                        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Empresas</CardTitle><Building className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{kpis.companyCount}</div><p className="text-xs text-muted-foreground">Empresas con gastos registrados.</p></CardContent></Card>
                        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Gasto Promedio</CardTitle><ShoppingCart className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(kpis.avgExpense)}</div><p className="text-xs text-muted-foreground">Valor medio de cada registro.</p></CardContent></Card>
                        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total de Registros</CardTitle><Hash className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{kpis.totalRecords}</div><p className="text-xs text-muted-foreground"># de gastos en el periodo.</p></CardContent></Card>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <Card className="lg:col-span-2"><CardHeader><CardTitle>Gasto por Mes (Histórico)</CardTitle><CardDescription>Evolución del gasto mensual de todos los registros.</CardDescription></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><LineChart data={initialData.charts.costByMonth}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis tickFormatter={(value) => `$${(value as number / 1000)}k`} /><Tooltip formatter={(value) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value as number)} /><Legend /><Line type="monotone" dataKey="cost" name="Costo" stroke="hsl(var(--primary))" strokeWidth={2} /></LineChart></ResponsiveContainer></CardContent></Card>
                    <Card><CardHeader><CardTitle>Top 5 Gastos por Empresa (Filtrado)</CardTitle><CardDescription>Distribución del gasto entre las principales empresas en el periodo filtrado.</CardDescription></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><BarChart data={charts.spendingByCompany} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" tickFormatter={(value) => `$${(value as number / 1000)}k`} /><YAxis type="category" dataKey="company" width={80} /><Tooltip formatter={(value) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value as number)} /><Legend /><Bar dataKey="spending" name="Gasto" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]}/></BarChart></ResponsiveContainer></CardContent></Card>
                    <Card><CardHeader><CardTitle>Gastos Diarios Recientes</CardTitle><CardDescription>Listado de los últimos gastos registrados.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Empresa</TableHead><TableHead>Tipo de Gasto</TableHead><TableHead className="text-right">Monto</TableHead><TableHead>Capturista</TableHead></TableRow></TableHeader><TableBody>{paginatedExpenses.map((expense) => (<TableRow key={expense.id}><TableCell className="font-mono text-xs">{expense.fecha ? format(parseISO(expense.fecha), 'dd/MM/yyyy') : 'N/A'}</TableCell><TableCell className="font-medium">{expense.empresa}</TableCell><TableCell className="font-medium">{expense.tipo_gasto}</TableCell><TableCell className="text-right">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(expense.monto || 0)}</TableCell><TableCell><Badge variant='outline'>{expense.capturista}</Badge></TableCell></TableRow>))}</TableBody></Table></CardContent>
                     {totalPages > 1 && (
                        <CardFooter>
                            <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
                                <div>
                                Página {currentPage} de {totalPages}
                                </div>
                                <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    Anterior
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Siguiente
                                </Button>
                                </div>
                            </div>
                        </CardFooter>
                     )}
                    </Card>
                </div>
            </>
            )}
        </div>
      </main>
    </>
  );
}
