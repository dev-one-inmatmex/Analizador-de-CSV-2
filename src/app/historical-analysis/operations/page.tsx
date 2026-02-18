'use client';

import * as React from 'react';
import { add, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfYear, endOfYear, eachMonthOfInterval, formatISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  BarChart as BarChartIcon, ChevronLeft, ChevronRight, Home, 
  Loader2, MoreVertical, Pencil, Plus, Trash2, Eye, CreditCard, 
  Calendar as CalendarIcon, ArrowDown, ArrowUp, Building2, Wallet,
  Info, Tag, Target, CheckCircle2, History
} from 'lucide-react';
import { 
  Bar as RechartsBar, BarChart as RechartsBarChart, CartesianGrid, Cell, Legend, Pie, PieChart, 
  ResponsiveContainer, Tooltip, XAxis, YAxis 
} from 'recharts';

import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { 
    expenseFormSchema, 
    TransactionFormValues,
    IMPACTO_FINANCIERO,
    AREA_FUNCIONAL,
    CANAL_VENTA,
    CLASIFICACION_OPERATIVA,
    EMPRESAS,
    METODOS_PAGO,
    BANCOS,
    CUENTAS
} from './schemas';

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
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { GastoDiario } from '@/types/database';

// --- Types ---
type View = 'inicio' | 'informes' | 'presupuestos';
type DateFilter = 'day' | 'week' | 'month' | 'year';

const money = (v?: number | null) => v === null || v === undefined ? '$0.00' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);

// --- Sub-components ---

interface InsightsViewProps {
    transactions: GastoDiario[];
    isLoading: boolean;
    dateFilter: DateFilter;
    setDateFilter: (f: DateFilter) => void;
    currentDate: Date;
    setCurrentDate: (d: Date) => void;
    onAddTransaction: () => void;
    onViewTransactions: () => void;
    selectedAccount: string;
    setSelectedAccount: (v: string) => void;
}

function InsightsView({ 
    transactions, isLoading, dateFilter, setDateFilter, currentDate, setCurrentDate, 
    onAddTransaction, onViewTransactions, selectedAccount, setSelectedAccount
}: InsightsViewProps) {
    const { totalExpense } = React.useMemo(() => {
        const expense = transactions.reduce((sum, t) => sum + (t.monto || 0), 0);
        return { totalExpense: expense };
    }, [transactions]);

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
                Gastos: dayT.reduce((s, t) => s + (t.monto || 0), 0),
            };
        });
    }, [transactions, dateFilter, currentDate]);

    if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="space-y-10 min-w-0">
            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6 min-w-0">
                <div className="space-y-1 shrink-0">
                    <h2 className="text-3xl font-bold tracking-tight">Gastos<br/>diarios</h2>
                    <p className="text-muted-foreground text-sm">Control unificado de egresos operativos.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 min-w-0">
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
                            <SelectItem value="Todas">Todas las Cuentas</SelectItem>
                            <SelectItem value="FISCAL">Fiscal</SelectItem>
                            <SelectItem value="NO FISCAL">No Fiscal</SelectItem>
                            <SelectItem value="CAJA CHICA">Caja Chica</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex items-center gap-1 bg-white border border-input rounded-md px-2 h-11 shadow-sm shrink-0">
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
                        <History className="h-4 w-4" /> Ver Historial
                    </Button>

                    <Button className="h-11 bg-[#2D5A4C] hover:bg-[#24483D] text-white gap-2 px-4 shadow-md" onClick={onAddTransaction}>
                        <Plus className="h-4 w-4" /> Registrar Gasto
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0">
                <Card className="lg:col-span-4 border-none shadow-sm rounded-xl min-w-0">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-bold uppercase text-muted-foreground tracking-widest">Total Egresos</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-destructive">{money(totalExpense)}</div>
                        <p className="text-[10px] text-muted-foreground mt-2 uppercase font-medium">Periodo: {format(currentDate, 'MMMM yyyy', { locale: es })}</p>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-8 border-none shadow-sm rounded-xl overflow-hidden min-w-0">
                    <CardHeader className="pb-0"><CardTitle className="text-lg font-bold">Distribución de Movimientos</CardTitle></CardHeader>
                    <CardContent className="h-[250px] pt-6 min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart data={barChartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} tick={{ fill: '#666' }} />
                                <YAxis axisLine={false} tickLine={false} fontSize={12} tickFormatter={(v) => `$${v/1000}k`} tick={{ fill: '#666' }} />
                                <Tooltip cursor={{ fill: '#f9f9f9' }} />
                                <RechartsBar dataKey="Gastos" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} barSize={30} />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

interface ReportsViewProps {
    transactions: GastoDiario[];
    onEditTransaction: (t: GastoDiario) => void;
    onDeleteTransaction: (id: number) => void;
}

function ReportsView({ 
    transactions, onEditTransaction, onDeleteTransaction 
}: ReportsViewProps) {
    const { expenseByImpact, expenseByArea } = React.useMemo(() => {
        const impactMap: Record<string, number> = {};
        const areaMap: Record<string, number> = {};

        transactions.forEach(t => {
            impactMap[t.tipo_gasto] = (impactMap[t.tipo_gasto] || 0) + (t.monto || 0);
            areaMap[t.area_funcional] = (areaMap[t.area_funcional] || 0) + (t.monto || 0);
        });

        return {
            expenseByImpact: Object.entries(impactMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value),
            expenseByArea: Object.entries(areaMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value),
        };
    }, [transactions]);

    const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

    return (
        <div className="space-y-8 min-w-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-w-0">
                <Card className="min-w-0 overflow-hidden">
                    <CardHeader><CardTitle>Impacto Financiero</CardTitle></CardHeader>
                    <CardContent className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={expenseByImpact} dataKey="value" nameKey="name" outerRadius={80} label>
                                    {expenseByImpact.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(v: number) => money(v)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card className="min-w-0 overflow-hidden">
                    <CardHeader><CardTitle>Gasto por Área Funcional</CardTitle></CardHeader>
                    <CardContent className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={expenseByArea} dataKey="value" nameKey="name" outerRadius={80} label>
                                    {expenseByArea.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(v: number) => money(v)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <Card className="min-w-0 overflow-hidden">
                <CardHeader><CardTitle>Historial Unificado de Gastos</CardTitle></CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto w-full">
                        <Table>
                            <TableHeader><TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Impacto / Área</TableHead>
                                <TableHead>Empresa / Cuenta</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                                <TableHead></TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                                {transactions.map(t => (
                                    <TableRow key={t.id}>
                                        <TableCell className="text-xs font-medium">{format(new Date(t.fecha), 'dd/MM/yy')}</TableCell>
                                        <TableCell>
                                            <div className="font-bold text-sm truncate max-w-[180px]">{t.tipo_gasto}</div>
                                            <div className="text-[10px] text-muted-foreground uppercase flex gap-1 items-center">
                                                <Badge variant="outline" className="px-1 py-0 text-[9px] h-4">{t.area_funcional}</Badge>
                                                <span>• {t.categoria_especifica}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <Badge variant="secondary" className="text-[9px] w-fit font-bold">{t.empresa || 'N/A'}</Badge>
                                                <span className="text-[9px] font-mono text-muted-foreground">{t.cuenta || 'N/A'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-black whitespace-nowrap text-destructive">
                                            - {money(t.monto)}
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => onEditTransaction(t)}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => onDeleteTransaction(t.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// --- Main Page Component ---

export default function OperationsPage() {
    const [currentView, setCurrentView] = React.useState<View>('inicio');
    const [transactions, setTransactions] = React.useState<GastoDiario[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingTransaction, setEditingTransaction] = React.useState<GastoDiario | null>(null);
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

            let q = supabase!.from('gastos_diarios').select('*').gte('fecha', formatISO(start)).lte('fecha', formatISO(end));

            if (selectedAccount !== 'Todas') {
                q = q.eq('cuenta', selectedAccount);
            }

            const { data, error } = await q.order('fecha', { ascending: false });
            if (error) throw error;
            setTransactions(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [currentDate, dateFilter, selectedAccount]);

    React.useEffect(() => { fetchAllData(); }, [fetchAllData]);

    const handleSave = async (values: TransactionFormValues) => {
        try {
            let res;
            if (editingTransaction) {
                res = await supabase!.from('gastos_diarios').update(values as any).eq('id', editingTransaction.id);
            } else {
                res = await supabase!.from('gastos_diarios').insert(values as any);
            }

            if (res.error) throw res.error;

            toast({ title: "Éxito", description: "Gasto registrado correctamente." });
            setIsFormOpen(false);
            setEditingTransaction(null);
            fetchAllData();
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        }
    };

    const handleDelete = async (id: number) => {
        try {
            const { error } = await supabase!.from('gastos_diarios').delete().eq('id', id);
            if (error) throw error;
            toast({ title: "Eliminado", description: "El registro ha sido borrado." });
            fetchAllData();
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        }
    };

    const handleOpenForm = (t: GastoDiario | null) => {
        setEditingTransaction(t);
        setIsFormOpen(true);
    };

    return (
        <div className="flex h-screen flex-col bg-muted/40 min-w-0">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6">
                <div className="flex items-center gap-4 min-w-0">
                    <h1 className="text-xl font-bold truncate shrink-0">Análisis Financiero</h1>
                    <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as View)} className="hidden md:flex min-w-0">
                        <TabsList className="bg-muted/50 min-w-0 overflow-x-auto no-scrollbar">
                            <TabsTrigger value="inicio" className="shrink-0"><Home className="mr-2 h-4 w-4" /> Inicio</TabsTrigger>
                            <TabsTrigger value="informes" className="shrink-0"><BarChartIcon className="mr-2 h-4 w-4" /> Informes</TabsTrigger>
                            <TabsTrigger value="presupuestos" className="shrink-0"><Wallet className="mr-2 h-4 w-4" /> Presupuestos</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => setCurrentView('informes')} className="hidden sm:flex"><Eye className="mr-2 h-4 w-4" /> Resumen</Button>
                    <Button size="sm" className="bg-[#2D5A4C] hover:bg-[#24483D] text-white" onClick={() => handleOpenForm(null)}><Plus className="mr-2 h-4 w-4" /> Nueva</Button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-8 min-w-0">
                <div className="mx-auto max-w-7xl w-full min-w-0">
                    {currentView === 'inicio' && (
                        <InsightsView 
                            transactions={transactions} isLoading={isLoading} 
                            dateFilter={dateFilter} setDateFilter={setDateFilter} 
                            currentDate={currentDate} setCurrentDate={setCurrentDate}
                            onAddTransaction={() => handleOpenForm(null)}
                            onViewTransactions={() => setCurrentView('informes')}
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
                <DialogContent className="sm:max-w-3xl overflow-y-auto max-h-[90vh]">
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

function BudgetsView({ transactions }: { transactions: GastoDiario[] }) {
    const budgets = [
        { category: 'Gasto Operativo', limit: 50000 },
        { category: 'Logística', limit: 20000 },
        { category: 'Marketing', limit: 15000 },
    ];

    return (
        <div className="space-y-6 min-w-0">
            <div className="flex justify-between items-center gap-4">
                <h2 className="text-2xl font-bold tracking-tight">Presupuestos por Área</h2>
                <Button variant="outline" size="sm" className="shrink-0"><Plus className="mr-2 h-4 w-4" /> Crear Meta</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-w-0">
                {budgets.map((b, i) => {
                    const current = transactions
                        .filter(t => t.tipo_gasto === b.category || t.area_funcional === b.category)
                        .reduce((s, t) => s + (t.monto || 0), 0);
                    const percent = Math.min((current / b.limit) * 100, 100);
                    
                    return (
                        <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow min-w-0">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start gap-2">
                                    <div className="min-w-0">
                                        <CardTitle className="text-lg font-bold truncate">{b.category}</CardTitle>
                                        <CardDescription className="text-[10px]">Vigencia: {format(new Date(), 'MMMM yyyy', { locale: es })}</CardDescription>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreVertical className="h-4 w-4"/></Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-end gap-2">
                                    <div className="text-2xl font-black truncate">{money(current)}</div>
                                    <div className="text-[10px] text-muted-foreground whitespace-nowrap">de {money(b.limit)}</div>
                                </div>
                                <Progress value={percent} className={cn("h-2.5", percent > 90 ? "bg-red-100" : "bg-muted")} />
                                <div className="flex justify-between text-[9px] uppercase font-bold tracking-widest text-muted-foreground gap-2">
                                    <span className="truncate">{percent.toFixed(0)}% Utilizado</span>
                                    <span className="shrink-0">Quedan {money(Math.max(b.limit - current, 0))}</span>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

function TransactionForm({ transaction, onSubmit, onClose }: { transaction: GastoDiario | null, onSubmit: (v: TransactionFormValues) => void, onClose: () => void }) {
    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(expenseFormSchema),
        defaultValues: transaction ? {
            fecha: new Date(transaction.fecha),
            empresa: transaction.empresa as any,
            tipo_gasto: transaction.tipo_gasto as any,
            area_funcional: transaction.area_funcional as any,
            categoria_especifica: transaction.categoria_especifica,
            canal_asociado: transaction.canal_asociado as any,
            clasificacion_operativa: transaction.clasificacion_operativa as any,
            es_fijo: transaction.es_fijo,
            es_recurrente: transaction.es_recurrente,
            monto: transaction.monto,
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
            empresa: 'DK',
            tipo_gasto: 'Gasto Operativo',
            area_funcional: 'Logística',
            canal_asociado: 'Mercado Libre',
            clasificacion_operativa: 'Directo',
            es_fijo: false,
            es_recurrente: false,
            metodo_pago: 'Transferencia',
            banco: 'BBVA',
            cuenta: 'FISCAL',
        }
    });

    const watchPago = form.watch('metodo_pago');
    const watchBanco = form.watch('banco');
    const watchCuenta = form.watch('cuenta');

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black uppercase tracking-tighter">
                        {transaction ? 'Actualizar' : 'Registrar'} Gasto Financiero
                    </DialogTitle>
                    <DialogDescription>Completa la información bajo el esquema de integridad unificado.</DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField control={form.control} name="fecha" render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel className="font-bold">Fecha</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild><Button variant="outline" className="w-full text-left font-normal h-11"><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP", { locale: es }) : "Elegir fecha"}</Button></PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                            </Popover>
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="monto" render={({ field }) => (
                        <FormItem><FormLabel className="font-bold text-destructive">Monto ($)</FormLabel><FormControl><Input type="number" step="0.01" className="text-lg font-black h-11 border-destructive/20" placeholder="0.00" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />

                    <FormField control={form.control} name="empresa" render={({ field }) => (
                        <FormItem><FormLabel className="font-bold">Empresa</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger className="h-11"><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>{EMPRESAS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                            </Select>
                        </FormItem>
                    )} />
                </div>

                <div className="bg-primary/5 p-6 rounded-2xl space-y-6 border border-primary/10">
                    <h4 className="text-sm font-black flex items-center gap-2 text-primary uppercase tracking-widest"><Target className="h-4 w-4"/> Clasificación Estratégica</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="tipo_gasto" render={({ field }) => (
                            <FormItem><FormLabel className="flex items-center gap-2"><Tag className="h-3 w-3" /> Impacto Financiero</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>{IMPACTO_FINANCIERO.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                                </Select>
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="area_funcional" render={({ field }) => (
                            <FormItem><FormLabel className="flex items-center gap-2"><Building2 className="h-3 w-3" /> Área Funcional</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>{AREA_FUNCIONAL.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                                </Select>
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="canal_asociado" render={({ field }) => (
                            <FormItem><FormLabel className="flex items-center gap-2"><Target className="h-3 w-3" /> Canal Asociado</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>{CANAL_VENTA.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                </Select>
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="clasificacion_operativa" render={({ field }) => (
                            <FormItem><FormLabel className="flex items-center gap-2"><Info className="h-3 w-3" /> Clasificación Operativa</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>{CLASIFICACION_OPERATIVA.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                </Select>
                            </FormItem>
                        )} />
                    </div>

                    <div className="grid grid-cols-2 gap-6 pt-2">
                        <FormField control={form.control} name="es_fijo" render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-lg border p-3 bg-white">
                                <div className="space-y-0.5"><FormLabel className="text-xs font-bold uppercase">Gasto Fijo</FormLabel></div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="es_recurrente" render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-lg border p-3 bg-white">
                                <div className="space-y-0.5"><FormLabel className="text-xs font-bold uppercase">Recurrente</FormLabel></div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )} />
                    </div>
                </div>

                <div className="bg-muted/30 p-6 rounded-2xl space-y-6 border border-muted-foreground/10">
                    <h4 className="text-sm font-black flex items-center gap-2 text-primary uppercase tracking-widest"><CreditCard className="h-4 w-4"/> Liquidación y Cuenta</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="metodo_pago" render={({ field }) => (
                            <FormItem><FormLabel>Método de Pago</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>{METODOS_PAGO.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                                </Select>
                            </FormItem>
                        )} />
                        {watchPago === 'OTRO' && (
                            <FormField control={form.control} name="metodo_pago_especificar" render={({ field }) => (
                                <FormItem><FormLabel>Especificar Método</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>
                            )} />
                        )}

                        <FormField control={form.control} name="banco" render={({ field }) => (
                            <FormItem><FormLabel>Banco</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || undefined}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>{BANCOS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                                </Select>
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="cuenta" render={({ field }) => (
                            <FormItem><FormLabel>Tipo de Cuenta</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || undefined}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>{CUENTAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                </Select>
                            </FormItem>
                        )} />
                    </div>
                </div>

                <div className="space-y-4">
                    <FormField control={form.control} name="categoria_especifica" render={({ field }) => (
                        <FormItem><FormLabel className="font-bold">Categoría Específica</FormLabel><FormControl><Input placeholder="Ej: Pago de luz, Mantenimiento montacargas..." className="h-11" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />

                    <FormField control={form.control} name="descripcion" render={({ field }) => (
                        <FormItem><FormLabel className="font-bold">Descripción Adicional</FormLabel><FormControl><Input placeholder="Detalles rápidos..." {...field} value={field.value || ''} /></FormControl></FormItem>
                    )} />

                    <FormField control={form.control} name="notas" render={({ field }) => (
                        <FormItem><FormLabel className="font-bold">Observaciones (Máx 280 car.)</FormLabel><FormControl><Textarea className="min-h-[100px] resize-none" {...field} value={field.value || ''} /></FormControl></FormItem>
                    )} />
                </div>

                <DialogFooter className="gap-3 pt-4 border-t">
                    <Button type="button" variant="outline" className="flex-1 h-12" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" className="flex-[2] h-12 text-lg font-bold bg-[#2D5A4C] hover:bg-[#24483D]" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin"/>}
                        {transaction ? 'Guardar Cambios' : 'Registrar Movimiento'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}
