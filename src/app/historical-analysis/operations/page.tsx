'use client';

import * as React from 'react';
import { add, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfYear, endOfYear, eachMonthOfInterval, formatISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  BarChart as BarChartIcon, ChevronLeft, ChevronRight, Home, 
  Loader2, MoreVertical, Pencil, Plus, Trash2, Eye, CreditCard, 
  Calendar as CalendarIcon, ArrowDown, ArrowUp, Building2, Wallet
} from 'lucide-react';
import { 
  Bar as RechartsBar, BarChart as RechartsBarChart, CartesianGrid, Cell, Legend, Pie, PieChart, 
  ResponsiveContainer, Tooltip, XAxis, YAxis 
} from 'recharts';

import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { expenseFormSchema, TransactionFormValues } from './schemas';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// --- Types ---
type View = 'inicio' | 'informes' | 'presupuestos';
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

const money = (v?: number | null) => v === null || v === undefined ? '$0.00' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);

// --- Interfaces for Sub-components ---
interface InsightsViewProps {
    transactions: UnifiedTransaction[];
    isLoading: boolean;
    dateFilter: DateFilter;
    setDateFilter: (f: DateFilter) => void;
    currentDate: Date;
    setCurrentDate: (d: Date) => void;
    onAddTransaction: () => void;
    onViewTransactions: () => void;
    handleOpenForm: (t: UnifiedTransaction | null) => void;
    handleDeleteTransaction: (id: number, flow: 'egreso' | 'ingreso') => void;
    selectedAccount: string;
    setSelectedAccount: (v: string) => void;
}

interface ReportsViewProps {
    transactions: UnifiedTransaction[];
    onEditTransaction: (t: UnifiedTransaction) => void;
    onDeleteTransaction: (id: number, flow: 'egreso' | 'ingreso') => void;
}

// --- Sub-components ---

function InsightsView({ 
    transactions, isLoading, dateFilter, setDateFilter, currentDate, setCurrentDate, 
    onAddTransaction, onViewTransactions, handleOpenForm, handleDeleteTransaction,
    selectedAccount, setSelectedAccount
}: InsightsViewProps) {
    const { totalIncome, totalExpense, balance } = React.useMemo(() => {
        const income = transactions.filter(t => t.__flowType === 'ingreso').reduce((sum, t) => sum + t.monto, 0);
        const expense = transactions.filter(t => t.__flowType === 'egreso').reduce((sum, t) => sum + t.monto, 0);
        return { totalIncome: income, totalExpense: expense, balance: income - expense };
    }, [transactions]);

    const pieData = [
        { name: 'Ingresos', value: totalIncome, color: 'hsl(var(--chart-1))' }, 
        { name: 'Gastos', value: totalExpense, color: 'hsl(var(--destructive))' }
    ];

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
            {/* Header section matching screenshot */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Gastos<br/>diarios</h2>
                    <p className="text-muted-foreground text-sm">Tu resumen financiero del periodo.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                        <SelectTrigger className="w-[130px] h-11 bg-white border border-input rounded-md shadow-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="day">Diario</SelectItem>
                            <SelectItem value="week">Semanal</SelectItem>
                            <SelectItem value="month">Mensual</SelectItem>
                            <SelectItem value="year">Anual</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                        <SelectTrigger className="w-[130px] h-11 bg-white border border-primary/20 rounded-md shadow-sm text-primary font-medium"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Todas">Todas</SelectItem>
                            <SelectItem value="TOLEXAL">TOLEXAL</SelectItem>
                            <SelectItem value="TAL">TAL</SelectItem>
                            <SelectItem value="MTM">MTM</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex items-center gap-1 bg-white border border-input rounded-md px-2 h-11 shadow-sm">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(add(currentDate, { [dateFilter === 'day' ? 'days' : dateFilter + 's']: -1 }))}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="min-w-[120px] text-center font-semibold text-sm capitalize">
                            {format(currentDate, dateFilter === 'day' ? "dd 'de' MMMM" : (dateFilter === 'year' ? 'yyyy' : 'MMMM yyyy'), { locale: es })}
                        </span>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(add(currentDate, { [dateFilter === 'day' ? 'days' : dateFilter + 's']: 1 }))}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    <Button variant="outline" className="h-11 border border-input bg-white gap-2 px-4 shadow-sm" onClick={onViewTransactions}>
                        <Eye className="h-4 w-4" /> Ver Transacciones
                    </Button>

                    <Button className="h-11 bg-[#2D5A4C] hover:bg-[#24483D] text-white gap-2 px-4 shadow-md" onClick={onAddTransaction}>
                        <Plus className="h-4 w-4" /> Añadir Transacción
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <Card className="lg:col-span-6 border-none shadow-sm rounded-xl">
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
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Balance</p>
                                <p className={cn("text-3xl font-extrabold", balance >= 0 ? "text-green-600" : "text-destructive")}>{money(balance)}</p>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-[hsl(var(--chart-1))]" />
                                    <div className="flex flex-col"><span className="text-xs text-muted-foreground">Ingresos</span><span className="font-bold">{money(totalIncome)}</span></div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-[hsl(var(--destructive))]" />
                                    <div className="flex flex-col"><span className="text-xs text-muted-foreground">Gastos</span><span className="font-bold">{money(totalExpense)}</span></div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="lg:col-span-6 flex flex-col gap-6">
                    <Card className="border-none shadow-sm rounded-xl flex-1 bg-green-50/50">
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-bold uppercase tracking-wider text-green-800">Ahorro Potencial</CardTitle></CardHeader>
                        <CardContent className="pt-4"><div className="text-4xl font-extrabold text-green-600">{money(balance)}</div></CardContent>
                    </Card>
                    <Card className="border-none shadow-sm rounded-xl flex-1">
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-bold uppercase tracking-wider">Estado del Presupuesto</CardTitle></CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div className="flex justify-between items-center text-sm font-medium">
                                <span>Comida</span>
                                <span className="text-destructive font-bold">{money(totalExpense)} / $5,000</span>
                            </div>
                            <Progress value={Math.min((totalExpense / 5000) * 100, 100)} className="h-3" />
                            <p className="text-[10px] text-muted-foreground text-center font-medium">HAS ALCANZADO EL 100% DE TU PRESUPUESTO</p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Card className="border-none shadow-sm rounded-xl overflow-hidden">
                <CardHeader><CardTitle className="text-xl font-bold">Resumen de Movimientos del Periodo</CardTitle></CardHeader>
                <CardContent className="h-[350px] pt-6">
                    <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} tick={{ fill: '#666' }} />
                            <YAxis axisLine={false} tickLine={false} fontSize={12} tickFormatter={(v) => `$${v/1000}k`} tick={{ fill: '#666' }} />
                            <Tooltip cursor={{ fill: '#f9f9f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                            <Legend verticalAlign="bottom" height={36} />
                            <RechartsBar dataKey="Ingresos" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} barSize={20} />
                            <RechartsBar dataKey="Gastos" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} barSize={20} />
                        </RechartsBarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}

function ReportsView({ 
    transactions, onEditTransaction, onDeleteTransaction 
}: ReportsViewProps) {
    const { expenseByCat, incomeByCat, totalIncome, totalExpense } = React.useMemo(() => {
        const incomeItems = transactions.filter(t => t.__flowType === 'ingreso');
        const expenseItems = transactions.filter(t => t.__flowType === 'egreso');

        const expMap: Record<string, number> = {};
        expenseItems.forEach(t => expMap[t.categoria] = (expMap[t.categoria] || 0) + t.monto);
        const incMap: Record<string, number> = {};
        incomeItems.forEach(t => incMap[t.categoria] = (incMap[t.categoria] || 0) + t.monto);

        return {
            totalIncome: incomeItems.reduce((s, t) => s + t.monto, 0),
            totalExpense: expenseItems.reduce((s, t) => s + t.monto, 0),
            expenseByCat: Object.entries(expMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value),
            incomeByCat: Object.entries(incMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value),
        };
    }, [transactions]);

    const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

    return (
        <div className="space-y-8">
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
                                    <TableCell className="text-xs font-medium">{format(new Date(t.fecha), 'dd/MM/yy')}</TableCell>
                                    <TableCell>
                                        <div className="font-bold text-sm">{t.categoria}</div>
                                        <div className="text-[10px] text-muted-foreground uppercase flex gap-1">
                                            <Badge variant="outline" className="px-1 py-0 text-[9px] h-4">{t.tipo_transaccion}</Badge>
                                            • {t.descripcion || 'Sin desc.'}
                                        </div>
                                    </TableCell>
                                    <TableCell><Badge variant="secondary" className="text-[10px] font-mono">{t.cuenta || 'N/A'}</Badge></TableCell>
                                    <TableCell className={cn("text-right font-black", t.__flowType === 'egreso' ? "text-destructive" : "text-primary")}>
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
    const [selectedAccount, setSelectedAccount] = React.useState('Todas');
    const [currentDate, setCurrentDate] = React.useState(new Date());

    const { toast } = useToast();

    const fetchAllData = React.useCallback(async () => {
        setIsLoading(true);
        try {
            let start, end;
            if (dateFilter === 'day') { start = startOfDay(currentDate); end = endOfDay(currentDate); }
            else if (dateFilter === 'week') { start = startOfWeek(currentDate, { locale: es }); end = endOfWeek(currentDate, { locale: es }); }
            else if (dateFilter === 'year') { start = startOfYear(currentDate); end = endOfYear(currentDate); }
            else { start = startOfMonth(currentDate); end = endOfMonth(currentDate); }

            let q1 = supabase!.from('finanzas').select('*').gte('fecha', formatISO(start)).lte('fecha', formatISO(end));
            let q2 = supabase!.from('finanzas2').select('*').gte('fecha', formatISO(start)).lte('fecha', formatISO(end));

            if (selectedAccount !== 'Todas') {
                q1 = q1.eq('cuenta', selectedAccount);
                q2 = q2.eq('cuenta', selectedAccount);
            }

            const [res1, res2] = await Promise.all([q1, q2]);

            const egresos = (res1.data || []).map(t => ({ ...t, __flowType: 'egreso' as const }));
            const ingresos = (res2.data || []).map(t => ({ ...t, __flowType: 'ingreso' as const }));

            const combined = [...egresos, ...ingresos].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
            setTransactions(combined);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [currentDate, dateFilter, selectedAccount]);

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
                        <TabsList className="bg-muted/50">
                            <TabsTrigger value="inicio"><Home className="mr-2 h-4 w-4" /> Inicio</TabsTrigger>
                            <TabsTrigger value="informes"><BarChartIcon className="mr-2 h-4 w-4" /> Informes</TabsTrigger>
                            <TabsTrigger value="presupuestos"><Wallet className="mr-2 h-4 w-4" /> Presupuestos</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setCurrentView('informes')}><Eye className="mr-2 h-4 w-4" /> Resumen</Button>
                    <Button size="sm" className="bg-primary text-white" onClick={() => handleOpenForm(null)}><Plus className="mr-2 h-4 w-4" /> Nueva</Button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="mx-auto max-w-7xl">
                    {currentView === 'inicio' && (
                        <InsightsView 
                            transactions={transactions} isLoading={isLoading} 
                            dateFilter={dateFilter} setDateFilter={setDateFilter} 
                            currentDate={currentDate} setCurrentDate={setCurrentDate}
                            onAddTransaction={() => handleOpenForm(null)}
                            onViewTransactions={() => setCurrentView('informes')}
                            handleOpenForm={handleOpenForm}
                            handleDeleteTransaction={handleDelete}
                            selectedAccount={selectedAccount}
                            setSelectedAccount={setSelectedAccount}
                        />
                    )}
                    {currentView === 'informes' && (
                        <ReportsView 
                            transactions={transactions} 
                            onEditTransaction={handleOpenForm}
                            onDeleteTransaction={handleDelete}
                        />
                    )}
                    {currentView === 'presupuestos' && <BudgetsView transactions={transactions} />}
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

function BudgetsView({ transactions }: { transactions: UnifiedTransaction[] }) {
    const budgets = [
        { category: 'Comida', limit: 5000, type: 'egreso' },
        { category: 'Transporte', limit: 2000, type: 'egreso' },
        { category: 'Ventas Retail', limit: 15000, type: 'ingreso' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">Presupuestos del Mes</h2>
                <Button variant="outline"><Plus className="mr-2 h-4 w-4" /> Crear Meta</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {budgets.map((b, i) => {
                    const current = transactions
                        .filter(t => t.categoria === b.category && t.__flowType === b.type)
                        .reduce((s, t) => s + t.monto, 0);
                    const percent = Math.min((current / b.limit) * 100, 100);
                    
                    return (
                        <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg font-bold">{b.category}</CardTitle>
                                        <CardDescription>Vigencia: {format(new Date(), 'MMMM yyyy', { locale: es })}</CardDescription>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4"/></Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <div className="text-2xl font-black">{money(current)}</div>
                                    <div className="text-sm text-muted-foreground">de {money(b.limit)}</div>
                                </div>
                                <Progress value={percent} className={cn("h-2.5", percent > 90 ? "bg-red-100" : "bg-muted")} />
                                <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                                    <span>{percent.toFixed(0)}% Utilizado</span>
                                    <span>Quedan {money(Math.max(b.limit - current, 0))}</span>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
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
                    <DialogTitle className="text-2xl font-bold">{transaction ? 'Editar' : 'Registrar'} Movimiento Financiero</DialogTitle>
                    <DialogDescription>Asegúrate de completar todos los detalles para un seguimiento preciso.</DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="tipo_transaccion" render={({ field }) => (
                        <FormItem className="col-span-2">
                            <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tipo de Movimiento</FormLabel>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                                {[
                                    { id: 'gasto', color: 'peer-data-[state=checked]:border-destructive peer-data-[state=checked]:bg-destructive/5' },
                                    { id: 'compra', color: 'peer-data-[state=checked]:border-orange-500 peer-data-[state=checked]:bg-orange-50' },
                                    { id: 'venta', color: 'peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5' },
                                    { id: 'ingreso', color: 'peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50' }
                                ].map(type => (
                                    <div key={type.id}>
                                        <RadioGroupItem value={type.id} id={type.id} className="sr-only peer" />
                                        <Label htmlFor={type.id} className={cn("flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-3 hover:bg-accent cursor-pointer transition-all", type.color)}>
                                            <span className="text-xs font-bold uppercase tracking-tighter">{type.id}</span>
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="monto" render={({ field }) => (
                        <FormItem><FormLabel className="font-bold">Monto ($)</FormLabel><FormControl><Input type="number" step="0.01" className="text-lg font-black h-12" placeholder="0.00" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />

                    <FormField control={form.control} name="fecha" render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel className="font-bold h-5">Fecha del Movimiento</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full text-left font-normal h-12">
                                        {field.value ? format(field.value, "PPP", { locale: es }) : "Elegir fecha"}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                            </Popover>
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="categoria" render={({ field }) => (
                        <FormItem><FormLabel className="font-bold">Categoría</FormLabel><FormControl><Input placeholder="Ej: Publicidad, Logística..." className="h-12" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />

                    <FormField control={form.control} name="empresa" render={({ field }) => (
                        <FormItem><FormLabel className="font-bold">Empresa / Entidad</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || undefined}>
                                <FormControl><SelectTrigger className="h-12"><SelectValue placeholder="Seleccionar Entidad" /></SelectTrigger></FormControl>
                                <SelectContent><SelectItem value="DK">Domeska (DK)</SelectItem><SelectItem value="MTM">MTM</SelectItem><SelectItem value="TAL">Tolexal (TAL)</SelectItem><SelectItem value="Otro">Otro</SelectItem></SelectContent>
                            </Select>
                        </FormItem>
                    )} />
                </div>

                <div className="bg-muted/30 p-6 rounded-2xl space-y-6 border border-muted-foreground/10">
                    <h4 className="text-sm font-black flex items-center gap-2 text-primary uppercase tracking-widest"><CreditCard className="h-4 w-4"/> Detalles de Liquidación</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="metodo_pago" render={({ field }) => (
                            <FormItem><FormLabel className="flex items-center gap-2"><Wallet className="h-3 w-3" /> Método de Pago</FormLabel>
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
                            <FormItem><FormLabel className="flex items-center gap-2"><Building2 className="h-3 w-3" /> Institución Bancaria</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || undefined}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar Banco" /></SelectTrigger></FormControl>
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
                            <FormItem className="md:col-span-2"><FormLabel className="font-bold">Cuenta de Origen / Destino</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || undefined}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar Cuenta" /></SelectTrigger></FormControl>
                                    <SelectContent>{['TOLEXAL', 'TAL', 'MTM', 'DOMESKA', 'CAJA', 'OTRO'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                </Select>
                            </FormItem>
                        )} />
                        {watchCuenta === 'OTRO' && (
                            <FormField control={form.control} name="cuenta_especificar" render={({ field }) => (
                                <FormItem className="md:col-span-2"><FormLabel>Especificar Cuenta</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>
                            )} />
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <FormField control={form.control} name="descripcion" render={({ field }) => (
                        <FormItem><FormLabel className="font-bold">Descripción Corta</FormLabel><FormControl><Input placeholder="Resumen rápido del movimiento..." {...field} value={field.value || ''} /></FormControl></FormItem>
                    )} />

                    <FormField control={form.control} name="notas" render={({ field }) => (
                        <FormItem><FormLabel className="font-bold">Notas y Detalles Adicionales</FormLabel><FormControl><Textarea placeholder="Escribe aquí cualquier observación relevante..." className="min-h-[100px] resize-none" {...field} value={field.value || ''} /></FormControl></FormItem>
                    )} />
                </div>

                <DialogFooter className="gap-3 pt-4">
                    <Button type="button" variant="outline" className="flex-1 h-12" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" className="flex-[2] h-12 text-lg font-bold" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin"/>}
                        Guardar Movimiento
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}