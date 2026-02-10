'use client';

import { ShoppingCart, DollarSign, Filter, Loader2, AlertTriangle, Building, Hash, PlusCircle, Calendar as CalendarIcon, MoreHorizontal, CheckCircle, Edit, ShieldCheck, ListChecks } from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { OperationsData, GastoDiario } from './page';
import { addExpenseAction, updateExpenseAction, reviewExpenseAction } from './actions';
import { expenseFormSchema } from './schemas';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { List, ListItem } from '@/components/ui/list';


const PAGE_SIZE = 10;
const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export default function OperationsClient({ initialData }: { initialData: OperationsData }) {
  const { toast } = useToast();
  
  const [company, setCompany] = React.useState('Todos');
  const [date, setDate] = React.useState<DateRange | undefined>();
  const [isClient, setIsClient] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);

  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editingExpense, setEditingExpense] = React.useState<GastoDiario | null>(null);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
        empresa: '',
        tipo_gasto: '',
        monto: undefined,
        capturista: 'Usuario Actual'
    }
  });

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  React.useEffect(() => {
    if (editingExpense) {
      form.reset({
        fecha: editingExpense.fecha ? parseISO(editingExpense.fecha) : new Date(),
        empresa: editingExpense.empresa || '',
        tipo_gasto: editingExpense.tipo_gasto || '',
        monto: editingExpense.monto || undefined,
        capturista: editingExpense.capturista || 'Usuario Actual',
      });
    } else {
      form.reset({
        fecha: new Date(),
        empresa: '',
        tipo_gasto: '',
        monto: undefined,
        capturista: 'Usuario Actual'
      });
    }
  }, [editingExpense, form]);

  const { allCompanies, filteredExpenses, kpis, charts } = React.useMemo(() => {
    const allUniqueCompanies = ['Todos', ...Array.from(new Set(initialData.expenses.map(e => e.empresa).filter(Boolean) as string[]))].sort();
    
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
        allCompanies: allUniqueCompanies,
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
    setDate(undefined);
    setCurrentPage(1);
  };

  async function onSubmit(values: ExpenseFormValues) {
    let result;
    if (editingExpense) {
      result = await updateExpenseAction(editingExpense.id, values);
    } else {
      result = await addExpenseAction(values);
    }

    if (result.error) {
        toast({ title: 'Error al guardar', description: result.error, variant: 'destructive' });
    } else {
        toast({ title: 'Éxito', description: result.data });
        setIsAddDialogOpen(false);
        setIsEditDialogOpen(false);
        setEditingExpense(null);
    }
  }

  async function onReview(id: number) {
      const result = await reviewExpenseAction(id);
      if (result.error) {
          toast({ title: 'Error al revisar', description: result.error, variant: 'destructive' });
      } else {
          toast({ title: 'Éxito', description: result.data });
      }
  }

  const paginatedExpenses = filteredExpenses.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const totalPages = Math.ceil(filteredExpenses.length / PAGE_SIZE);

  if (!isClient) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const FormContent = ({ isSubmitting }: { isSubmitting: boolean }) => (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormField
            control={form.control}
            name="fecha"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Fecha del Gasto</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                                <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="empresa"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Empresa</FormLabel>
                    <FormControl><Input placeholder="Ej: Mi Empresa" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="tipo_gasto"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Tipo de Gasto</FormLabel>
                    <FormControl><Input placeholder="Ej: Publicidad" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="monto"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Monto</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="0.00" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="capturista"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Capturista</FormLabel>
                    <FormControl><Input placeholder="Nombre del capturista" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
        <DialogFooter className="pt-4">
            <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
            </Button>
        </DialogFooter>
    </form>
  );

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-xl font-bold tracking-tight">Gastos diarios</h1>
        </div>
        <div className="flex items-center gap-4">
            <Button onClick={() => { setEditingExpense(null); setIsAddDialogOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Gasto
            </Button>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center p-4 md:p-10">
        <div className="w-full max-w-7xl space-y-4 md:space-y-8">
            {initialData.expenses.length === 0 && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>No se Encontraron Datos</AlertTitle>
                    <AlertDescription>
                        No se pudieron cargar los datos de la tabla `gastos_diarios`. Asegúrate de que la tabla exista, tenga datos y la conexión a Supabase sea correcta.
                    </AlertDescription>
                </Alert>
            )}

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

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Gasto por Mes (Histórico)</CardTitle>
                    <CardDescription>Evolución del gasto mensual de todos los registros.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {initialData.charts.costByMonth.length === 0 ? (
                      <div className="flex h-[300px] items-center justify-center text-center text-muted-foreground">No hay suficientes datos históricos para mostrar la tendencia mensual.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}><LineChart data={initialData.charts.costByMonth}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis tickFormatter={(value) => `$${(value as number / 1000)}k`} /><Tooltip formatter={(value) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value as number)} /><Legend /><Line type="monotone" dataKey="cost" name="Costo" stroke="hsl(var(--primary))" strokeWidth={2} /></LineChart></ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
                <Card><CardHeader><CardTitle>Top 5 Gastos por Empresa (Filtrado)</CardTitle><CardDescription>Distribución del gasto entre las principales empresas en el periodo filtrado.</CardDescription></CardHeader>
                  <CardContent>
                    {charts.spendingByCompany.length === 0 ? (
                      <div className="flex h-[300px] items-center justify-center text-center text-muted-foreground">No hay gastos en el periodo seleccionado.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}><BarChart data={charts.spendingByCompany} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" tickFormatter={(value) => `$${(value as number / 1000)}k`} /><YAxis type="category" dataKey="company" width={80} /><Tooltip formatter={(value) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value as number)} /><Legend /><Bar dataKey="spending" name="Gasto" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]}/></BarChart></ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ListChecks /> Cómo se validan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <List>
                            <ListItem>Validación automática al capturar</ListItem>
                            <ListItem>Revisión diaria o semanal por un usuario designado</ListItem>
                            <ListItem>Correcciones solo por Admin</ListItem>
                            <ListItem>Auditoría automática</ListItem>
                        </List>
                    </CardContent>
                </Card>
                <Card className="lg:col-span-3"><CardHeader><CardTitle>Gastos Diarios Registrados</CardTitle><CardDescription>Listado de los gastos registrados con su estado de validación.</CardDescription></CardHeader>
                  <CardContent>
                    {paginatedExpenses.length === 0 ? (
                      <div className="flex h-[150px] items-center justify-center text-center text-muted-foreground">No se encontraron gastos para los filtros seleccionados.</div>
                    ) : (
                      <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Empresa</TableHead>
                                <TableHead>Tipo de Gasto</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                                <TableHead>Capturista</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedExpenses.map((expense) => (
                                <TableRow key={expense.id}>
                                    <TableCell className="font-mono text-xs">{expense.fecha ? format(parseISO(expense.fecha), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                    <TableCell className="font-medium">{expense.empresa}</TableCell>
                                    <TableCell className="font-medium">{expense.tipo_gasto}</TableCell>
                                    <TableCell className="text-right">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(expense.monto || 0)}</TableCell>
                                    <TableCell><Badge variant='outline'>{expense.capturista}</Badge></TableCell>
                                    <TableCell>
                                        <Badge variant={expense.status === 'Revisado' ? 'secondary' : 'default'}>
                                            {expense.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Abrir menú</span><MoreHorizontal className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => onReview(expense.id)} disabled={expense.status === 'Revisado'}>
                                                    <CheckCircle className="mr-2 h-4 w-4" />
                                                    <span>Revisar</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => { setEditingExpense(expense); setIsEditDialogOpen(true); }}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    <span>Editar</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                  {totalPages > 1 && (
                    <CardFooter>
                        <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
                            <div>Página {currentPage} de {totalPages}</div>
                            <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</Button>
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Siguiente</Button>
                            </div>
                        </div>
                    </CardFooter>
                  )}
                </Card>
            </div>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Añadir Nuevo Gasto</DialogTitle>
                    <DialogDescription>Completa el formulario para registrar un nuevo gasto diario.</DialogDescription>
                </DialogHeader>
                <Form {...form}><FormContent isSubmitting={form.formState.isSubmitting} /></Form>
            </DialogContent>
        </Dialog>
        
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => { if(!open) setEditingExpense(null); setIsEditDialogOpen(open); }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar Gasto</DialogTitle>
                    <DialogDescription>Modifica los detalles del gasto. Esto requerirá una nueva revisión.</DialogDescription>
                </DialogHeader>
                <Form {...form}><FormContent isSubmitting={form.formState.isSubmitting} /></Form>
            </DialogContent>
        </Dialog>
      </main>
    </>
  );
}
