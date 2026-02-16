'use client';
import { useState, useMemo, useTransition, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, BarChart2, PieChart as PieChartIcon, DollarSign, Loader2, Calendar, User, Filter, Trash2, MoreHorizontal, Edit, AlertTriangle } from 'lucide-react';
import { format, isValid, parseISO, startOfDay, endOfDay, differenceInDays, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { DateRange } from 'react-day-picker';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { gastos_diarios } from '@/types/database';
import { addExpenseAction, updateExpenseAction, deleteExpenseAction } from '../actions';
import { expenseFormSchema, expenseCategories } from '../schemas';

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];
const PAGE_SIZE = 10;

type FormData = z.infer<typeof expenseFormSchema>;

function DashboardComponent({ initialExpenses, allCompanies, allCapturistas, dbError }: { initialExpenses: gastos_diarios[], allCompanies: string[], allCapturistas: string[], dbError: string | null }) {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [filters, setFilters] = useState({
        dateRange: { from: subDays(new Date(), 30), to: new Date() } as DateRange | undefined,
        company: 'all',
        capturista: 'all'
    });
    
    const [currentPage, setCurrentPage] = useState(1);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<gastos_diarios | null>(null);
    const [deletingExpense, setDeletingExpense] = useState<gastos_diarios | null>(null);

    const filteredExpenses = useMemo(() => {
        return initialExpenses.filter(expense => {
            const expenseDate = expense.fecha ? parseISO(expense.fecha) : null;
            if (!expenseDate || !isValid(expenseDate)) return false;

            const dateMatch = filters.dateRange?.from && filters.dateRange?.to 
                ? expenseDate >= startOfDay(filters.dateRange.from) && expenseDate <= endOfDay(filters.dateRange.to)
                : true;
            
            const companyMatch = filters.company === 'all' || expense.empresa === filters.company;
            const capturistaMatch = filters.capturista === 'all' || expense.capturista === filters.capturista;

            return dateMatch && companyMatch && capturistaMatch;
        });
    }, [initialExpenses, filters]);

    const kpis = useMemo(() => {
        const total = filteredExpenses.reduce((sum, e) => sum + (e.monto || 0), 0);
        const numDays = filters.dateRange?.from && filters.dateRange?.to 
            ? differenceInDays(endOfDay(filters.dateRange.to), startOfDay(filters.dateRange.from)) + 1 
            : 1;
        const avgDaily = numDays > 0 ? total / numDays : 0;
        
        const topCategory = filteredExpenses.reduce((acc, e) => {
            if (e.tipo_gasto) {
                acc[e.tipo_gasto] = (acc[e.tipo_gasto] || 0) + (e.monto || 0);
            }
            return acc;
        }, {} as Record<string, number>);

        const topCategoryName = Object.keys(topCategory).length > 0 ? Object.entries(topCategory).sort((a, b) => b[1] - a[1])[0][0] : 'N/A';

        return { total, avgDaily, topCategoryName };
    }, [filteredExpenses, filters.dateRange]);

    const chartData = useMemo(() => {
        const byDay = filteredExpenses.reduce((acc, e) => {
            const day = format(parseISO(e.fecha!), 'yyyy-MM-dd');
            acc[day] = (acc[day] || 0) + (e.monto || 0);
            return acc;
        }, {} as Record<string, number>);

        const byCategory = filteredExpenses.reduce((acc, e) => {
            if (e.tipo_gasto) {
                acc[e.tipo_gasto] = (acc[e.tipo_gasto] || 0) + (e.monto || 0);
            }
            return acc;
        }, {} as Record<string, number>);

        return {
            daily: Object.entries(byDay).map(([name, value]) => ({ name: format(parseISO(name), 'dd MMM'), value })).sort((a,b) => a.name.localeCompare(b.name)),
            category: Object.entries(byCategory).map(([name, value]) => ({ name, value }))
        }
    }, [filteredExpenses]);

    const paginatedExpenses = useMemo(() => {
        return filteredExpenses.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    }, [filteredExpenses, currentPage]);

    const totalPages = Math.ceil(filteredExpenses.length / PAGE_SIZE);

    const form = useForm<FormData>({
        resolver: zodResolver(expenseFormSchema),
        defaultValues: { empresa: '', tipo_gasto: undefined, monto: 0, capturista: '' },
    });

    const handleOpenForm = (expense: gastos_diarios | null = null) => {
        setEditingExpense(expense);
        if (expense) {
            form.reset({
                fecha: expense.fecha ? parseISO(expense.fecha) : new Date(),
                empresa: expense.empresa || '',
                tipo_gasto: expense.tipo_gasto as any || undefined,
                monto: expense.monto || 0,
                capturista: expense.capturista || ''
            });
        } else {
            form.reset({ fecha: new Date(), empresa: '', tipo_gasto: undefined, monto: 0, capturista: '' });
        }
        setIsFormOpen(true);
    };

    const onSubmit = async (values: FormData) => {
        startTransition(async () => {
            const action = editingExpense ? updateExpenseAction(editingExpense.id, values) : addExpenseAction(values);
            const result = await action;

            if (result.error) {
                toast({ title: 'Error', description: result.error, variant: 'destructive' });
            } else {
                toast({ title: 'Éxito', description: result.data });
                setIsFormOpen(false);
            }
        });
    };
    
    const handleDelete = async () => {
        if (!deletingExpense) return;
        startTransition(async () => {
            const result = await deleteExpenseAction(deletingExpense.id);
            if (result.error) {
                toast({ title: 'Error', description: result.error, variant: 'destructive' });
            } else {
                toast({ title: 'Éxito', description: result.data });
                setDeletingExpense(null);
            }
        });
    };

    return (
        <>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
                <SidebarTrigger />
                <h1 className="text-xl font-bold tracking-tight">Dashboard de Gastos Diarios</h1>
            </div>
            <Button onClick={() => handleOpenForm()}>
                <Plus className="mr-2 h-4 w-4" /> Añadir Gasto
            </Button>
        </header>

        <main className="flex-1 space-y-6 p-4 md:p-8">
            {dbError && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error de Conexión</AlertTitle><AlertDescription>{dbError}</AlertDescription></Alert>}

            <Card>
                <CardHeader><CardTitle>Filtros</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <DateRangePicker date={filters.dateRange} onSelect={(date) => setFilters(f => ({ ...f, dateRange: date }))} />
                    <Select value={filters.company} onValueChange={(value) => setFilters(f => ({ ...f, company: value }))}>
                        <SelectTrigger><SelectValue placeholder="Filtrar por empresa..." /></SelectTrigger>
                        <SelectContent><SelectItem value="all">Todas las empresas</SelectItem>{allCompanies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={filters.capturista} onValueChange={(value) => setFilters(f => ({ ...f, capturista: value }))}>
                        <SelectTrigger><SelectValue placeholder="Filtrar por capturista..." /></SelectTrigger>
                        <SelectContent><SelectItem value="all">Todos los capturistas</SelectItem>{allCapturistas.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Gasto Total</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(kpis.total)}</div></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Gasto Promedio Diario</CardTitle><BarChart2 className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(kpis.avgDaily)}</div></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Categoría Principal</CardTitle><PieChartIcon className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{kpis.topCategoryName}</div></CardContent></Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <Card className="lg:col-span-3">
                    <CardHeader><CardTitle>Gastos por Día</CardTitle></CardHeader>
                    <CardContent className="pl-2">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData.daily}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                <Tooltip formatter={(value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)} />
                                <Bar dataKey="value" name="Gasto" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card className="lg:col-span-2">
                    <CardHeader><CardTitle>Gastos por Categoría</CardTitle></CardHeader>
                    <CardContent>
                         <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Tooltip formatter={(value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)} />
                                <Pie data={chartData.category} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                     {chartData.category.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader><CardTitle>Historial de Gastos</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Empresa</TableHead><TableHead>Categoría</TableHead><TableHead>Capturista</TableHead><TableHead className="text-right">Monto</TableHead><TableHead><span className="sr-only">Acciones</span></TableHead></TableRow></TableHeader>
                        <TableBody>
                            {paginatedExpenses.map(e => (
                                <TableRow key={e.id}>
                                    <TableCell>{format(parseISO(e.fecha!), 'dd MMM, yyyy', { locale: es })}</TableCell>
                                    <TableCell>{e.empresa}</TableCell>
                                    <TableCell>{e.tipo_gasto}</TableCell>
                                    <TableCell>{e.capturista}</TableCell>
                                    <TableCell className="text-right font-medium">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(e.monto || 0)}</TableCell>
                                    <TableCell>
                                        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleOpenForm(e)}><Edit className="mr-2 h-4 w-4"/>Editar</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setDeletingExpense(e)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Eliminar</DropdownMenuItem>
                                        </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
                 {totalPages > 1 && (
                    <CardContent className="flex justify-end items-center gap-4 text-sm">
                        <span className="text-muted-foreground">Página {currentPage} de {totalPages}</span>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</Button>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Siguiente</Button>
                    </CardContent>
                )}
            </Card>
        </main>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>{editingExpense ? 'Editar Gasto' : 'Añadir Gasto'}</DialogTitle></DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField control={form.control} name="fecha" render={({ field }) => (
                            <FormItem className="flex flex-col"><FormLabel>Fecha</FormLabel><Popover>
                                <PopoverTrigger asChild><FormControl>
                                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                        {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                                        <Calendar className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl></PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start"><CalendarComponent mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                            </Popover><FormMessage /></FormItem>
                        )} />
                         <FormField control={form.control} name="empresa" render={({ field }) => (
                            <FormItem><FormLabel>Empresa</FormLabel><FormControl><Input {...field} placeholder="Ej: Mi Empresa S.A." /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="tipo_gasto" render={({ field }) => (
                            <FormItem><FormLabel>Categoría de Gasto</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar categoría..." /></SelectTrigger></FormControl>
                                <SelectContent>{expenseCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                            </Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="monto" render={({ field }) => (
                            <FormItem><FormLabel>Monto</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="capturista" render={({ field }) => (
                           <FormItem><FormLabel>Capturista</FormLabel><FormControl><Input {...field} placeholder="Ej: Juan Pérez" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isPending}>{isPending ? <Loader2 className="animate-spin" /> : 'Guardar'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

        <Dialog open={!!deletingExpense} onOpenChange={(open) => !open && setDeletingExpense(null)}>
            <DialogContent>
                <DialogHeader><DialogTitle>Confirmar Eliminación</DialogTitle><DialogDescription>¿Estás seguro de que quieres eliminar este gasto? Esta acción no se puede deshacer.</DialogDescription></DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setDeletingExpense(null)}>Cancelar</Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={isPending}>{isPending ? <Loader2 className="animate-spin" /> : 'Eliminar'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}


export default function OperationsDashboardPageClientWrapper(props: { initialExpenses: gastos_diarios[], allCompanies: string[], allCapturistas: string[], dbError: string | null }) {
    return (
        <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <DashboardComponent {...props} />
        </Suspense>
    );
}
