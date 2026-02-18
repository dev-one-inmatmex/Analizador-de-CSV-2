'use client';

import * as React from 'react';
import { add, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfYear, endOfYear, eachMonthOfInterval, formatISO, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  AlertTriangle, ArrowDown, ArrowUp, BarChart as BarChartIcon, ChevronLeft, ChevronRight, Cog, Home, 
  Landmark, List, Loader2, MoreVertical, Pencil, Plus, Trash2, Eye, CreditCard, Building2, Wallet, 
  MessageSquare, StickyNote, TrendingUp, X, Receipt, PiggyBank, Target, Download, Calendar as CalendarIcon
} from 'lucide-react';
import { 
  Bar as RechartsBar, BarChart as RechartsBarChart, CartesianGrid, Cell, Legend, Pie, PieChart, 
  ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart, Area, AreaChart 
} from 'recharts';

import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { addExpenseAction, updateExpenseAction, deleteExpenseAction } from './actions';
import { expenseFormSchema, TransactionFormValues, paymentMethods } from './schemas';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// --- Types ---
type View = 'inicio' | 'informes' | 'presupuestos' | 'configuracion';
type DateFilter = 'day' | 'week' | 'month' | 'year';

interface UnifiedTransaction {
    id: number;
    fecha: string;
    monto: number;
    categoria: string;
    subcategoria: string | null;
    empresa: string | null;
    tipo_transaccion: string;
    metodo_pago: string;
    metodo_pago_especificar: string | null;
    banco: string | null;
    banco_especificar: string | null;
    cuenta: string | null;
    cuenta_especificar: string | null;
    descripcion: string | null;
    notas: string | null;
    __flowType: 'egreso' | 'ingreso';
}

interface Budget {
    id: number;
    category: string;
    limit: number;
    type: 'egreso' | 'ingreso';
    startDate: Date;
    endDate: Date;
}

const money = (v?: number | null) => v === null || v === undefined ? '$0.00' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);

// --- Sub-components ---

function InsightsView({ 
    transactions, isLoading, dateFilter, setDateFilter, currentDate, setCurrentDate, 
    companyFilter, setCompanyFilter, accountFilter, setAccountFilter, 
    onAddTransaction, onViewTransactions, budgets, handleOpenForm, handleDeleteTransaction
}: {
    transactions: UnifiedTransaction[];
    isLoading: boolean;
    dateFilter: DateFilter;
    setDateFilter: (f: DateFilter) => void;
    currentDate: Date;
    setCurrentDate: (d: Date) => void;
    companyFilter: string;
    setCompanyFilter: (c: string) => void;
    accountFilter: string;
    setAccountFilter: (a: string) => void;
    onAddTransaction: () => void;
    onViewTransactions: () => void;
    budgets: Budget[];
    handleOpenForm: (t: UnifiedTransaction | null) => void;
    handleDeleteTransaction: (id: number, flow: 'egreso' | 'ingreso') => void;
}) {
    const { totalIncome, totalExpense, balance } = React.useMemo(() => {
        const income = transactions.filter(t => t.__flowType === 'ingreso').reduce((sum, t) => sum + t.monto, 0);
        const expense = transactions.filter(t => t.__flowType === 'egreso').reduce((sum, t) => sum + t.monto, 0);
        return { totalIncome: income, totalExpense: expense, balance: income - expense };
    }, [transactions]);

    const pieData = [{ name: 'Ingresos', value: totalIncome, color: '#3b82f6' }, { name: 'Gastos', value: totalExpense, color: '#ec4899' }];

    const dailyTransactions = transactions.filter(t => isSameDay(new Date(t.fecha), currentDate));

    const barChartData = React.useMemo(() => {
        let steps: Date[] = [];
        if (dateFilter === 'month') steps = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
        else if (dateFilter === 'week') steps = eachDayOfInterval({ start: startOfWeek(currentDate, { locale: es }), end: endOfWeek(currentDate, { locale: es }) });
        else if (dateFilter === 'year') steps = eachMonthOfInterval({ start: startOfYear(currentDate), end: endOfYear(currentDate) });
        else steps = [currentDate];

        return steps.map(step => {
            const dayT = transactions.filter(t => isSameDay(new Date(t.fecha), step));
            return {
                name: format(step, dateFilter === 'year' ? 'MMM' : 'dd', { locale: es }),
                Ingresos: dayT.filter(t => t.__flowType === 'ingreso').reduce((s, t) => s + t.monto, 0),
                Gastos: dayT.filter(t => t.__flowType === 'egreso').reduce((s, t) => s + t.monto, 0),
            };
        });
    }, [transactions, dateFilter, currentDate]);

    if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="space-y-10">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Gastos<br/>diarios</h2>
                    <p className="text-muted-foreground text-sm">Tu resumen financiero del periodo.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                        <SelectTrigger className="w-[130px] h-11 border-none bg-muted/30"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="day">Diario</SelectItem>
                            <SelectItem value="week">Semanal</SelectItem>
                            <SelectItem value="month">Mensual</SelectItem>
                            <SelectItem value="year">Anual</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex items-center gap-1 bg-muted/30 rounded-md px-2 h-11">
                        <Button variant="ghost" size="icon" onClick={() => setCurrentDate(add(currentDate, { [dateFilter === 'day' ? 'days' : dateFilter + 's']: -1 }))}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="min-w-[120px] text-center font-semibold text-sm capitalize">
                            {format(currentDate, dateFilter === 'day' ? 'dd MMM yyyy' : (dateFilter === 'year' ? 'yyyy' : 'MMMM yyyy'), { locale: es })}
                        </span>
                        <Button variant="ghost" size="icon" onClick={() => setCurrentDate(add(currentDate, { [dateFilter === 'day' ? 'days' : dateFilter + 's']: 1 }))}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    <Button variant="outline" className="h-11 border-none bg-muted/30 gap-2 px-4" onClick={onViewTransactions}>
                        <Eye className="h-4 w-4" /> Ver Transacciones
                    </Button>

                    <Button className="h-11 bg-[#2d5a4c] hover:bg-[#2d5a4c]/90 text-white gap-2 px-4" onClick={onAddTransaction}>
                        <Plus className="h-4 w-4" /> Añadir Transacción
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <Card className="lg:col-span-6 border-none bg-white shadow-sm rounded-xl">
                    <CardHeader className="pb-0"><CardTitle className="text-xl font-bold">Balance del Periodo</CardTitle></CardHeader>
                    <CardContent className="pt-6 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="relative w-[220px] h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData} dataKey="value" innerRadius={70} outerRadius={95} paddingAngle={5} stroke="none">
                                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-6 flex-1 w-full">
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground uppercase font-bold">Balance</p>
                                <p className="text-3xl font-extrabold text-[#2d5a4c]">{money(balance)}</p>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                                    <div className="flex flex-col"><span className="text-xs text-muted-foreground">Ingresos</span><span className="font-bold">{money(totalIncome)}</span></div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-pink-500" />
                                    <div className="flex flex-col"><span className="text-xs text-muted-foreground">Gastos</span><span className="font-bold">{money(totalExpense)}</span></div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="lg:col-span-6 flex flex-col gap-6">
                    <Card className="border-none bg-white shadow-sm rounded-xl flex-1">
                        <CardHeader className="pb-2"><CardTitle className="text-xl font-bold">Ahorro Potencial</CardTitle></CardHeader>
                        <CardContent className="pt-4"><div className="text-4xl font-extrabold text-[#2d5a4c]">{money(balance)}</div></CardContent>
                    </Card>
                    <Card className="border-none bg-white shadow-sm rounded-xl flex-1">
                        <CardHeader className="pb-2"><CardTitle className="text-xl font-bold">Resumen de Movimientos</CardTitle></CardHeader>
                        <CardContent className="h-40">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsBarChart data={barChartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} />
                                    <Tooltip cursor={{fill: '#f9f9f9'}} />
                                    <RechartsBar dataKey="Ingresos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    <RechartsBar dataKey="Gastos" fill="#ec4899" radius={[4, 4, 0, 0]} />
                                </RechartsBarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Card>
                <CardHeader><CardTitle>Transacciones del Día</CardTitle><CardDescription>{format(currentDate, "eeee, dd 'de' MMMM", { locale: es })}</CardDescription></CardHeader>
                <CardContent>
                    {dailyTransactions.length > 0 ? (
                        <div className="divide-y">
                            {dailyTransactions.map(t => (
                                <div key={t.id} className="flex items-center py-4">
                                    <div className={cn("p-2 rounded-full mr-4", t.__flowType === 'egreso' ? "bg-pink-100 text-pink-600" : "bg-blue-100 text-blue-600")}>
                                        {t.__flowType === 'egreso' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-sm">{t.categoria}</p>
                                        <p className="text-xs text-muted-foreground uppercase">{t.tipo_transaccion} • {t.cuenta || 'Sin cuenta'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={cn("font-bold", t.__flowType === 'egreso' ? "text-pink-600" : "text-blue-600")}>
                                            {t.__flowType === 'egreso' ? "-" : "+"} {money(t.monto)}
                                        </p>
                                        <div className="flex gap-1 justify-end mt-1">
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenForm(t)}><Pencil className="h-3 w-3" /></Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteTransaction(t.id, t.__flowType)}><Trash2 className="h-3 w-3" /></Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-muted-foreground italic">No hay movimientos este día.</div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function ReportsView({ 
    transactions, dateFilter, setDateFilter, currentDate, setCurrentDate, 
    onEditTransaction, onDeleteTransaction 
}: {
    transactions: UnifiedTransaction[];
    dateFilter: DateFilter;
    setDateFilter: (f: DateFilter) => void;
    currentDate: Date;
    setCurrentDate: (d: Date) => void;
    onEditTransaction: (t: UnifiedTransaction) => void;
    onDeleteTransaction: (id: number, flow: 'egreso' | 'ingreso') => void;
}) {
    const { totalIncome, totalExpense, balance, expenseByCat, incomeByCat } = React.useMemo(() => {
        const incomeItems = transactions.filter(t => t.__flowType === 'ingreso');
        const expenseItems = transactions.filter(t => t.__flowType === 'egreso');

        const expMap: Record<string, number> = {};
        expenseItems.forEach(t => expMap[t.categoria] = (expMap[t.categoria] || 0) + t.monto);
        const incMap: Record<string, number> = {};
        incomeItems.forEach(t => incMap[t.categoria] = (incMap[t.categoria] || 0) + t.monto);

        return {
            totalIncome: incomeItems.reduce((s, t) => s + t.monto, 0),
            totalExpense: expenseItems.reduce((s, t) => s + t.monto, 0),
            balance: incomeItems.reduce((s, t) => s + t.monto, 0) - expenseItems.reduce((s, t) => s + t.monto, 0),
            expenseByCat: Object.entries(expMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value),
            incomeByCat: Object.entries(incMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value),
        };
    }, [transactions]);

    const COLORS = ['#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#6366f1'];

    return (
        <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-pink-50/50 border-pink-100">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-pink-600 uppercase">Egresos Totales</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-black text-pink-700">{money(totalExpense)}</div></CardContent>
                </Card>
                <Card className="bg-blue-50/50 border-blue-100">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-blue-600 uppercase">Ingresos Totales</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-black text-blue-700">{money(totalIncome)}</div></CardContent>
                </Card>
                <Card className="bg-green-50/50 border-green-100">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-green-600 uppercase">Balance Neto</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-black text-green-700">{money(balance)}</div></CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle>Distribución de Egresos</CardTitle></CardHeader>
                    <CardContent className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={expenseByCat} dataKey="value" nameKey="name" outerRadius={80} label>
                                    {expenseByCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(v: number) => money(v)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Distribución de Ingresos</CardTitle></CardHeader>
                    <CardContent className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={incomeByCat} dataKey="value" nameKey="name" outerRadius={80} label>
                                    {incomeByCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(v: number) => money(v)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader><CardTitle>Historial de Movimientos</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Concepto</TableHead>
                            <TableHead>Cuenta</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                            <TableHead></TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                            {transactions.map(t => (
                                <TableRow key={`${t.__flowType}-${t.id}`}>
                                    <TableCell className="text-xs">{format(new Date(t.fecha), 'dd/MM/yy')}</TableCell>
                                    <TableCell>
                                        <div className="font-bold text-sm">{t.categoria}</div>
                                        <div className="text-[10px] text-muted-foreground uppercase flex gap-1">
                                            <Badge variant="outline" className={cn("px-1 py-0 text-[9px]", t.__flowType === 'egreso' ? "text-pink-600 border-pink-200" : "text-blue-600 border-blue-200")}>{t.tipo_transaccion}</Badge>
                                            • {t.descripcion || 'Sin desc.'}
                                        </div>
                                    </TableCell>
                                    <TableCell><Badge variant="outline" className="text-[10px]">{t.cuenta || 'N/A'}</Badge></TableCell>
                                    <TableCell className={cn("text-right font-black", t.__flowType === 'egreso' ? "text-pink-600" : "text-blue-600")}>
                                        {t.__flowType === 'egreso' ? "-" : "+"} {money(t.monto)}
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => onEditTransaction(t)}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => onDeleteTransaction(t.id, t.__flowType)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

// --- Main Page Component ---

export default function OperationsPage() {
    const [currentView, setCurrentView] = React.useState<View>('inicio');
    const [transactions, setTransactions] = React.useState<UnifiedTransaction[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingTransaction, setEditingTransaction] = React.useState<UnifiedTransaction | null>(null);
    const [dateFilter, setDateFilter] = React.useState<DateFilter>('month');
    const [currentDate, setCurrentDate] = React.useState(new Date());
    const [companyFilter, setCompanyFilter] = React.useState('Todas');
    const [accountFilter, setAccountFilter] = React.useState('Todas');

    const isMobile = useIsMobile();
    const { toast } = useToast();

    const fetchAllData = React.useCallback(async () => {
        setIsLoading(true);
        try {
            let start, end;
            if (dateFilter === 'day') { start = startOfDay(currentDate); end = endOfDay(currentDate); }
            else if (dateFilter === 'week') { start = startOfWeek(currentDate, { locale: es }); end = endOfWeek(currentDate, { locale: es }); }
            else if (dateFilter === 'year') { start = startOfYear(currentDate); end = endOfYear(currentDate); }
            else { start = startOfMonth(currentDate); end = endOfMonth(currentDate); }

            const [res1, res2] = await Promise.all([
                supabase!.from('finanzas').select('*').gte('fecha', formatISO(start)).lte('fecha', formatISO(end)),
                supabase!.from('finanzas2').select('*').gte('fecha', formatISO(start)).lte('fecha', formatISO(end))
            ]);

            const egresos = (res1.data || []).map(t => ({ ...t, __flowType: 'egreso' as const }));
            const ingresos = (res2.data || []).map(t => ({ ...t, __flowType: 'ingreso' as const }));

            const combined = [...egresos, ...ingresos].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
            setTransactions(combined);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [currentDate, dateFilter]);

    React.useEffect(() => { fetchAllData(); }, [fetchAllData]);

    const handleSave = async (values: TransactionFormValues) => {
        try {
            const flow = values.tipo_transaccion === 'gasto' || values.tipo_transaccion === 'compra' ? 'egreso' : 'ingreso';
            const table = flow === 'egreso' ? 'finanzas' : 'finanzas2';
            
            let res;
            if (editingTransaction) {
                res = await supabase!.from(table).update(values as any).eq('id', editingTransaction.id);
            } else {
                res = await supabase!.from(table).insert(values as any);
            }

            if (res.error) throw res.error;

            toast({ title: "Éxito", description: "Transacción guardada correctamente." });
            setIsFormOpen(false);
            setEditingTransaction(null);
            fetchAllData();
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        }
    };

    const handleDelete = async (id: number, flow: 'egreso' | 'ingreso') => {
        try {
            const table = flow === 'egreso' ? 'finanzas' : 'finanzas2';
            const { error } = await supabase!.from(table).delete().eq('id', id);
            if (error) throw error;
            toast({ title: "Eliminado", description: "La transacción ha sido borrada." });
            fetchAllData();
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        }
    };

    const handleOpenForm = (t: UnifiedTransaction | null) => {
        setEditingTransaction(t);
        setIsFormOpen(true);
    };

    return (
        <div className="flex h-screen flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold">Análisis Pro</h1>
                    <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as View)} className="hidden md:flex">
                        <TabsList>
                            <TabsTrigger value="inicio"><Home className="mr-2 h-4 w-4" /> Inicio</TabsTrigger>
                            <TabsTrigger value="informes"><BarChartIcon className="mr-2 h-4 w-4" /> Informes</TabsTrigger>
                            <TabsTrigger value="presupuestos"><Target className="mr-2 h-4 w-4" /> Presupuestos</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
                <Button size="sm" onClick={() => handleOpenForm(null)}><Plus className="mr-2 h-4 w-4" /> Nueva</Button>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="mx-auto max-w-7xl">
                    {currentView === 'inicio' && (
                        <InsightsView 
                            transactions={transactions} isLoading={isLoading} 
                            dateFilter={dateFilter} setDateFilter={setDateFilter} 
                            currentDate={currentDate} setCurrentDate={setCurrentDate}
                            companyFilter={companyFilter} setCompanyFilter={setCompanyFilter}
                            accountFilter={accountFilter} setAccountFilter={setAccountFilter}
                            onAddTransaction={() => handleOpenForm(null)}
                            onViewTransactions={() => setCurrentView('informes')}
                            budgets={[]} // Would load from DB
                            handleOpenForm={handleOpenForm}
                            handleDeleteTransaction={handleDelete}
                        />
                    )}
                    {currentView === 'informes' && (
                        <ReportsView 
                            transactions={transactions} 
                            dateFilter={dateFilter} setDateFilter={setDateFilter}
                            currentDate={currentDate} setCurrentDate={setCurrentDate}
                            onEditTransaction={handleOpenForm}
                            onDeleteTransaction={handleDelete}
                        />
                    )}
                </div>
            </main>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-2xl overflow-y-auto max-h-[90vh]">
                    <TransactionForm 
                        transaction={editingTransaction} 
                        onSubmit={handleSave} 
                        onClose={() => setIsFormOpen(false)} 
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}

function TransactionForm({ transaction, onSubmit, onClose }: { transaction: UnifiedTransaction | null, onSubmit: (v: TransactionFormValues) => void, onClose: () => void }) {
    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(expenseFormSchema),
        defaultValues: transaction ? {
            fecha: new Date(transaction.fecha),
            monto: transaction.monto,
            categoria: transaction.categoria,
            subcategoria: transaction.subcategoria,
            empresa: transaction.empresa as any,
            tipo_transaccion: transaction.tipo_transaccion as any,
            metodo_pago: transaction.metodo_pago as any,
            metodo_pago_especificar: transaction.metodo_pago_especificar,
            banco: transaction.banco as any,
            banco_especificar: transaction.banco_especificar,
            cuenta: transaction.cuenta as any,
            cuenta_especificar: transaction.cuenta_especificar,
            descripcion: transaction.descripcion,
            notas: transaction.notas,
        } : {
            fecha: new Date(),
            tipo_transaccion: 'gasto',
            metodo_pago: 'Transferencia',
            banco: 'BBVA',
            cuenta: 'TOLEXAL',
        }
    });

    const watchType = form.watch('tipo_transaccion');
    const watchPago = form.watch('metodo_pago');
    const watchBanco = form.watch('banco');
    const watchCuenta = form.watch('cuenta');

    React.useEffect(() => { if (watchPago !== 'Otro') form.setValue('metodo_pago_especificar', null); }, [watchPago, form]);
    React.useEffect(() => { if (watchBanco !== 'OTRO') form.setValue('banco_especificar', null); }, [watchBanco, form]);
    React.useEffect(() => { if (watchCuenta !== 'OTRO') form.setValue('cuenta_especificar', null); }, [watchCuenta, form]);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <DialogHeader>
                    <DialogTitle>{transaction ? 'Editar' : 'Registrar'} Movimiento</DialogTitle>
                    <DialogDescription>Completa los detalles financieros. Los campos "Otro" requieren especificación.</DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="tipo_transaccion" render={({ field }) => (
                        <FormItem className="col-span-2">
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-4 gap-2">
                                {['gasto', 'compra', 'venta', 'ingreso'].map(type => (
                                    <div key={type}>
                                        <RadioGroupItem value={type} id={type} className="sr-only peer" />
                                        <Label htmlFor={type} className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 capitalize">
                                            {type}
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="monto" render={({ field }) => (
                        <FormItem><FormLabel>Monto</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />

                    <FormField control={form.control} name="fecha" render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel>Fecha</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full text-left font-normal">
                                        {field.value ? format(field.value, "PPP", { locale: es }) : "Elegir fecha"}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                            </Popover>
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="categoria" render={({ field }) => (
                        <FormItem><FormLabel>Categoría</FormLabel><FormControl><Input placeholder="Ej: Publicidad" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />

                    <FormField control={form.control} name="empresa" render={({ field }) => (
                        <FormItem><FormLabel>Empresa</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || undefined}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent><SelectItem value="DK">DK</SelectItem><SelectItem value="MTM">MTM</SelectItem><SelectItem value="TAL">TAL</SelectItem><SelectItem value="Otro">Otro</SelectItem></SelectContent>
                            </Select>
                        </FormItem>
                    )} />
                </div>

                <div className="bg-muted/30 p-4 rounded-lg space-y-4">
                    <h4 className="text-sm font-bold flex items-center gap-2 text-primary"><CreditCard className="h-4 w-4"/> Pago y Liquidación</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="metodo_pago" render={({ field }) => (
                            <FormItem><FormLabel>Método</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>{['Efectivo', 'Tarjeta', 'Cash', 'Transferencia', 'Otro'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                                </Select>
                            </FormItem>
                        )} />
                        {watchPago === 'Otro' && (
                            <FormField control={form.control} name="metodo_pago_especificar" render={({ field }) => (
                                <FormItem><FormLabel>Especificar Método</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>
                            )} />
                        )}

                        <FormField control={form.control} name="banco" render={({ field }) => (
                            <FormItem><FormLabel>Banco</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || undefined}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>{['BBVA', 'BANAMEX', 'MERCADO PAGO', 'SANTANDER', 'BANORTE', 'OTRO'].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                                </Select>
                            </FormItem>
                        )} />
                        {watchBanco === 'OTRO' && (
                            <FormField control={form.control} name="banco_especificar" render={({ field }) => (
                                <FormItem><FormLabel>Especificar Banco</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>
                            )} />
                        )}

                        <FormField control={form.control} name="cuenta" render={({ field }) => (
                            <FormItem><FormLabel>Cuenta</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || undefined}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>{['TOLEXAL', 'TAL', 'MTM', 'DOMESKA', 'CAJA', 'OTRO'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                </Select>
                            </FormItem>
                        )} />
                        {watchCuenta === 'OTRO' && (
                            <FormField control={form.control} name="cuenta_especificar" render={({ field }) => (
                                <FormItem><FormLabel>Especificar Cuenta</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>
                            )} />
                        )}
                    </div>
                </div>

                <FormField control={form.control} name="descripcion" render={({ field }) => (
                    <FormItem><FormLabel>Descripción Breve</FormLabel><FormControl><Input placeholder="¿Qué se compró/vendió?" {...field} value={field.value || ''} /></FormControl></FormItem>
                )} />

                <FormField control={form.control} name="notas" render={({ field }) => (
                    <FormItem><FormLabel>Notas Adicionales</FormLabel><FormControl><Textarea placeholder="Detalles extra..." {...field} value={field.value || ''} /></FormControl></FormItem>
                )} />

                <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Guardar Registro
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}