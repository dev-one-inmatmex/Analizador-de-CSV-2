'use client';

import * as React from 'react';
import { addMonths, endOfDay, format, isValid, parseISO, startOfDay, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Area, AreaChart, Bar, BarChart as RechartsBarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { type DateRange } from 'react-day-picker';
import { Banknote, BarChart3, Calendar as CalendarIcon, DollarSign, Edit, Loader2, MoreHorizontal, PlusCircle, Trash2, TrendingUp, AlertTriangle, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { addExpenseAction, deleteExpenseAction, updateExpenseAction } from './actions';
import { expenseCategories, expenseFormSchema } from './schemas';
import type { gastos_diarios } from '@/types/database';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabaseClient';


type FormData = z.infer<typeof expenseFormSchema>;

const PAGE_SIZE = 10;
const CHART_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];
const money = (v?: number | null) => v === null || v === undefined ? '$0.00' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);

export default function OperationsPage() {
    const { toast } = useToast();
    const [isClient, setIsClient] = React.useState(false);
    const [initialExpenses, setInitialExpenses] = React.useState<gastos_diarios[]>([]);
    const [allCompanies, setAllCompanies] = React.useState<string[]>([]);
    const [allReporters, setAllReporters] = React.useState<string[]>([]);
    const [dbError, setDbError] = React.useState<string | null>(null);
    const [isLoadingData, setIsLoadingData] = React.useState(true);
    
    // Dialog states
    const [formDialogOpen, setFormDialogOpen] = React.useState(false);
    const [expenseToEdit, setExpenseToEdit] = React.useState<gastos_diarios | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
    const [expenseToDelete, setExpenseToDelete] = React.useState<gastos_diarios | null>(null);

    // Filter states
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>({ from: subDays(new Date(), 29), to: new Date() });
    const [companyFilter, setCompanyFilter] = React.useState('all');
    const [reporterFilter, setReporterFilter] = React.useState('all');
    const [currentPage, setCurrentPage] = React.useState(1);

    const fetchData = React.useCallback(async () => {
        setIsLoadingData(true);
        if (!supabase) {
            setDbError('El cliente de Supabase no está disponible.');
            setIsLoadingData(false);
            return;
        }
        const { data, error } = await supabase
            .from('gastos_diarios')
            .select('*')
            .order('fecha', { ascending: false });

        if (error) {
            console.error("Error fetching expenses", error);
            setDbError(error.message);
        } else {
            const expenses = (data as gastos_diarios[]) || [];
            setInitialExpenses(expenses);
            setAllCompanies([...new Set(expenses.map(e => e.empresa).filter(Boolean) as string[])]);
            setAllReporters([...new Set(expenses.map(e => e.capturista).filter(Boolean) as string[])]);
            setDbError(null);
        }
        setIsLoadingData(false);
    }, []);

    React.useEffect(() => {
        setIsClient(true);
        fetchData();
    }, [fetchData]);

    const { filteredExpenses, totalAmount, avgDaily, topCategory, dailyChartData, categoryChartData } = React.useMemo(() => {
        const filtered = initialExpenses.filter(expense => {
            const expenseDate = expense.fecha ? parseISO(expense.fecha) : null;
            if (!expenseDate || !isValid(expenseDate)) return false;

            const dateMatch = dateRange?.from && dateRange.to ?
                (expenseDate >= startOfDay(dateRange.from) && expenseDate <= endOfDay(dateRange.to)) : true;
            
            const companyMatch = companyFilter === 'all' || expense.empresa === companyFilter;
            const reporterMatch = reporterFilter === 'all' || expense.capturista === reporterFilter;

            return dateMatch && companyMatch && reporterMatch;
        });

        const total = filtered.reduce((sum, item) => sum + (item.monto || 0), 0);
        
        const expensesByDay: Record<string, number> = {};
        const expensesByCategory: Record<string, number> = {};
        
        filtered.forEach(item => {
            if (item.fecha && item.monto) {
                const day = format(parseISO(item.fecha), 'yyyy-MM-dd');
                expensesByDay[day] = (expensesByDay[day] || 0) + item.monto;
            }
            if (item.tipo_gasto && item.monto) {
                expensesByCategory[item.tipo_gasto] = (expensesByCategory[item.tipo_gasto] || 0) + item.monto;
            }
        });

        const dailyData = Object.entries(expensesByDay)
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        const numDays = Object.keys(expensesByDay).length || 1;
        const average = total / numDays;
        
        const categoryData = Object.entries(expensesByCategory).map(([name, value]) => ({ name, value }));
        const topCat = categoryData.sort((a,b) => b.value - a.value)[0]?.name || 'N/A';
        
        return { 
            filteredExpenses: filtered, 
            totalAmount: total,
            avgDaily: average,
            topCategory: topCat,
            dailyChartData: dailyData,
            categoryChartData: categoryData,
        };
    }, [initialExpenses, dateRange, companyFilter, reporterFilter]);

    const form = useForm<FormData>({
        resolver: zodResolver(expenseFormSchema),
        defaultValues: {
            fecha: new Date(),
            empresa: '',
            tipo_gasto: undefined,
            monto: 0,
            capturista: '',
        },
    });

    React.useEffect(() => {
        if (expenseToEdit) {
            form.reset({
                ...expenseToEdit,
                fecha: expenseToEdit.fecha ? parseISO(expenseToEdit.fecha) : new Date(),
                monto: expenseToEdit.monto || 0,
            });
        } else {
            form.reset();
        }
    }, [expenseToEdit, form]);

    const handleOpenFormDialog = (expense: gastos_diarios | null) => {
        setExpenseToEdit(expense);
        setFormDialogOpen(true);
    };

    const handleOpenDeleteDialog = (expense: gastos_diarios) => {
        setExpenseToDelete(expense);
        setDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!expenseToDelete) return;
        const result = await deleteExpenseAction(expenseToDelete.id);
        if (result.error) {
            toast({ title: "Error", description: result.error, variant: 'destructive' });
        } else {
            toast({ title: "Éxito", description: "Gasto eliminado correctamente." });
            fetchData();
        }
        setDeleteDialogOpen(false);
        setExpenseToDelete(null);
    };

    const onSubmit = async (data: FormData) => {
        const result = expenseToEdit
            ? await updateExpenseAction(expenseToEdit.id, data)
            : await addExpenseAction(data);

        if (result.error) {
            toast({ title: "Error", description: result.error, variant: 'destructive' });
        } else {
            toast({ title: "Éxito", description: result.data });
            setFormDialogOpen(false);
            fetchData();
        }
    };
    
    const paginatedExpenses = filteredExpenses.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const totalPages = Math.ceil(filteredExpenses.length / PAGE_SIZE);

    if (!isClient || isLoadingData) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        )
    }
    
    return (
        <>
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
                <div className="flex items-center gap-4">
                    <SidebarTrigger />
                    <h1 className="text-xl font-bold tracking-tight">Gastos Diarios</h1>
                </div>
                <Button onClick={() => handleOpenFormDialog(null)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir Gasto
                </Button>
            </header>

            <main className="flex-1 space-y-4 p-4 md:space-y-8 md:p-8">
                {dbError && (
                    <Alert variant="destructive">
                        <Database className="h-4 w-4" />
                        <AlertTitle>Error de Conexión</AlertTitle>
                        <AlertDescription>{dbError}</AlertDescription>
                    </Alert>
                )}
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Gastos del Periodo</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{money(totalAmount)}</div><p className="text-xs text-muted-foreground">Total de gastos en el rango seleccionado</p></CardContent></Card>
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Gasto Promedio Diario</CardTitle><BarChart3 className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{money(avgDaily)}</div><p className="text-xs text-muted-foreground">Promedio por día con gastos</p></CardContent></Card>
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Categoría Principal</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{topCategory}</div><p className="text-xs text-muted-foreground">Categoría con el mayor gasto</p></CardContent></Card>
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total de Registros</CardTitle><Banknote className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{filteredExpenses.length}</div><p className="text-xs text-muted-foreground">Transacciones en el periodo</p></CardContent></Card>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                    <Card className="xl:col-span-2">
                        <CardHeader><CardTitle>Gastos a lo Largo del Tiempo</CardTitle><CardDescription>Evolución de los gastos diarios en el periodo seleccionado.</CardDescription></CardHeader>
                        <CardContent>
                             <ResponsiveContainer width="100%" height={300}>
                                <RechartsBarChart data={dailyChartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" tickFormatter={(str) => format(parseISO(str), "dd MMM", { locale: es })} />
                                    <YAxis tickFormatter={(val) => `$${(val as number / 1000)}k`} />
                                    <Tooltip formatter={(val) => money(val as number)} />
                                    <Bar dataKey="amount" name="Gastos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                </RechartsBarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Gastos por Categoría</CardTitle><CardDescription>Distribución de los gastos por tipo.</CardDescription></CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Tooltip formatter={(val) => money(val as number)} />
                                    <Pie data={categoryChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                        {categoryChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                                    </Pie>
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Historial de Gastos</CardTitle>
                        <CardDescription>Consulta y gestiona todos los gastos registrados.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Categoría</TableHead>
                                    <TableHead>Empresa</TableHead>
                                    <TableHead>Capturista</TableHead>
                                    <TableHead className="text-right">Monto</TableHead>
                                    <TableHead className="w-[50px]"><span className="sr-only">Acciones</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedExpenses.length > 0 ? (
                                    paginatedExpenses.map(expense => (
                                        <TableRow key={expense.id}>
                                            <TableCell>{format(parseISO(expense.fecha!), 'dd MMM, yyyy', {locale: es})}</TableCell>
                                            <TableCell>{expense.tipo_gasto}</TableCell>
                                            <TableCell>{expense.empresa}</TableCell>
                                            <TableCell>{expense.capturista}</TableCell>
                                            <TableCell className="text-right font-medium">{money(expense.monto)}</TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem onSelect={() => handleOpenFormDialog(expense)}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => handleOpenDeleteDialog(expense)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No se encontraron gastos para los filtros seleccionados.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
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

            </main>
            
            <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{expenseToEdit ? 'Editar Gasto' : 'Añadir Nuevo Gasto'}</DialogTitle>
                        <DialogDescription>Completa la información para registrar el gasto.</DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                            <FormField control={form.control} name="fecha" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Fecha del Gasto</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4 opacity-50" />{field.value ? format(field.value, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="monto" render={({ field }) => (
                                <FormItem><FormLabel>Monto</FormLabel><FormControl><Input type="number" placeholder="0.00" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="tipo_gasto" render={({ field }) => (
                                <FormItem><FormLabel>Tipo de Gasto</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona una categoría" /></SelectTrigger></FormControl><SelectContent>{expenseCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="empresa" render={({ field }) => (
                                <FormItem><FormLabel>Empresa</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona una empresa" /></SelectTrigger></FormControl><SelectContent>{allCompanies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="capturista" render={({ field }) => (
                                <FormItem><FormLabel>Capturista</FormLabel><FormControl><Input placeholder="Nombre de quien registra" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <DialogFooter>
                                <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                                <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : 'Guardar Gasto'}</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>Esta acción no se puede deshacer. Se eliminará permanentemente el gasto de {money(expenseToDelete?.monto)} del día {expenseToDelete?.fecha ? format(parseISO(expenseToDelete.fecha), 'PPP', {locale: es}) : ''}.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}