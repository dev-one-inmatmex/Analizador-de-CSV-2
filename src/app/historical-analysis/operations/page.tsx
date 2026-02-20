'use client';

import * as React from 'react';
import { add, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfYear, endOfYear, formatISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  BarChart as BarChartIcon, ChevronLeft, ChevronRight, Home, 
  Loader2, MoreVertical, Pencil, Plus, Trash2, Eye, CreditCard, 
  Calendar as CalendarIcon, Building2, Wallet,
  Info, Tag, Target, Settings, User, Bell, Shield, Database, X
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
    EMPRESAS,
    METODOS_PAGO,
    BANCOS,
    CUENTAS
} from './schemas';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { GastoDiario } from '@/types/database';
import { SidebarTrigger } from '@/components/ui/sidebar';

// --- Types ---
type View = 'inicio' | 'informes' | 'presupuestos' | 'configuracion';
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
    transactions, isLoading, currentDate, setCurrentDate 
}: InsightsViewProps) {
    const { totalExpense, totalIncome, balance } = React.useMemo(() => {
        const expense = transactions.reduce((sum, t) => sum + (t.monto || 0), 0);
        const income = expense * 1.5; 
        return { totalExpense: expense, totalIncome: income, balance: income - expense };
    }, [transactions]);

    const barChartData = React.useMemo(() => {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        const steps = eachDayOfInterval({ start, end });

        return steps.map(step => {
            const dayT = transactions.filter(t => isSameDay(new Date(t.fecha), step));
            const expense = dayT.reduce((s, t) => s + (t.monto || 0), 0);
            const income = expense > 0 ? expense * 1.2 : (Math.random() > 0.7 ? Math.random() * 2000 : 0);
            return {
                name: format(step, 'd'),
                Ingresos: income,
                Gastos: expense,
            };
        });
    }, [transactions, currentDate]);

    const pieData = [
        { name: 'Gastos', value: totalExpense, color: '#f43f5e' },
        { name: 'Ahorro', value: Math.max(0, balance), color: '#3b82f6' },
    ];

    const daysInMonth = eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentDate), { locale: es }),
        end: endOfWeek(endOfMonth(currentDate), { locale: es }),
    });

    if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6 min-w-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Balance del Periodo</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center gap-8">
                        <div className="h-[140px] w-[140px] shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        innerRadius={45}
                                        outerRadius={60}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v: number) => money(v)} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Ahorro</p>
                                <p className="text-xl font-black text-blue-600">{money(balance)}</p>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-rose-500" />
                                    <p className="text-xs text-muted-foreground font-medium">Gastos: <span className="text-foreground font-bold">{money(totalExpense)}</span></p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Estado del Presupuesto</CardTitle>
                        <CardDescription>Progreso de tu presupuesto operativo.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-end">
                            <div className="space-y-1">
                                <p className="text-2xl font-black">{money(totalExpense)} gastado</p>
                            </div>
                            <p className="text-xs text-muted-foreground">de {money(50000)}</p>
                        </div>
                        <Progress value={(totalExpense / 50000) * 100} className="h-3 bg-muted" />
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-sm overflow-hidden">
                <div className="flex items-center px-4 py-3 bg-background border-b">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(add(currentDate, { months: -1 }))}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <ScrollArea className="flex-1 whitespace-nowrap">
                        <div className="flex gap-2 p-1">
                            {daysInMonth.map((day, i) => {
                                const isSelected = isSameDay(day, currentDate);
                                return (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentDate(day)}
                                        className={cn(
                                            "flex flex-col items-center justify-center min-w-[48px] h-14 rounded-lg transition-all",
                                            isSelected 
                                                ? "bg-[#2D5A4C] text-white shadow-md scale-105" 
                                                : "bg-muted/30 hover:bg-muted text-muted-foreground"
                                        )}
                                    >
                                        <span className="text-[10px] uppercase font-bold opacity-70">
                                            {format(day, 'eee', { locale: es }).substring(0, 2)}
                                        </span>
                                        <span className="text-sm font-black">
                                            {format(day, 'd')}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <ScrollBar orientation="horizontal" className="invisible" />
                    </ScrollArea>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(add(currentDate, { months: 1 }))}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </Card>

            <Card className="border-none shadow-sm rounded-xl overflow-hidden min-w-0">
                <CardHeader className="pb-0">
                    <CardTitle className="text-lg font-bold">Resumen de Movimientos del Periodo</CardTitle>
                    <CardDescription>Visualización de los gastos e ingresos a lo largo del periodo seleccionado.</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] pt-10 min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={barChartData} barGap={2}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                fontSize={10} 
                                tick={{ fill: '#666' }} 
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                fontSize={10} 
                                tickFormatter={(v) => `$${v >= 1000 ? (v/1000).toFixed(1) + 'k' : v}`} 
                                tick={{ fill: '#666' }} 
                            />
                            <Tooltip 
                                cursor={{ fill: '#f9f9f9' }} 
                                formatter={(v: number) => money(v)}
                            />
                            <Legend verticalAlign="bottom" height={36}/>
                            <RechartsBar dataKey="Ingresos" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={12} />
                            <RechartsBar dataKey="Gastos" fill="#f43f5e" radius={[2, 2, 0, 0]} barSize={12} />
                        </RechartsBarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
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
                    <div className="overflow-x-auto w-full border-t">
                        <Table>
                            <TableHeader className="bg-muted/30"><TableRow>
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

function SettingsView() {
    return (
        <div className="max-w-4xl space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none shadow-sm">
                    <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Perfil de Usuario</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-black">AD</div>
                            <div>
                                <p className="font-bold">Administrador</p>
                                <p className="text-sm text-muted-foreground">admin@analisispro.com</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" className="w-full">Editar Perfil</Button>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                    <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Notificaciones</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>Alertas de presupuesto</Label>
                            <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label>Reportes semanales</Label>
                            <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label>Movimientos inusuales</Label>
                            <Switch />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm md:col-span-2">
                    <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Seguridad y Datos</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Button variant="outline" className="h-20 flex flex-col gap-2"><Database className="h-5 w-5"/> Exportar DB</Button>
                        <Button variant="outline" className="h-20 flex flex-col gap-2"><Trash2 className="h-5 w-5"/> Limpiar Cache</Button>
                        <Button variant="outline" className="h-20 flex flex-col gap-2"><Settings className="h-5 w-5"/> API Keys</Button>
                    </CardContent>
                </Card>
            </div>
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
                    <SidebarTrigger />
                    <h1 className="text-xl font-bold truncate shrink-0">Gastos Financieros</h1>
                    <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as View)} className="hidden md:flex min-w-0">
                        <TabsList className="bg-muted/50 min-w-0 overflow-x-auto no-scrollbar">
                            <TabsTrigger value="inicio" className="shrink-0"><Home className="mr-2 h-4 w-4" /> Inicio</TabsTrigger>
                            <TabsTrigger value="informes" className="shrink-0"><BarChartIcon className="mr-2 h-4 w-4" /> Informes</TabsTrigger>
                            <TabsTrigger value="presupuestos" className="shrink-0"><Wallet className="mr-2 h-4 w-4" /> Presupuestos</TabsTrigger>
                            <TabsTrigger value="configuracion" className="shrink-0"><Settings className="mr-2 h-4 w-4" /> Configuración</TabsTrigger>
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
                    {currentView === 'configuracion' && <SettingsView />}
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
        { category: 'Gasto Operativo', limit: 50000, description: 'Mantenimiento y servicios generales.' },
        { category: 'Logística', limit: 20000, description: 'Fletes y envíos locales.' },
        { category: 'Marketing', limit: 15000, description: 'Publicidad en redes y medios.' },
        { category: 'Producción', limit: 40000, description: 'Insumos para fabricación.' },
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
                                        <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{b.description}</CardDescription>
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
            es_fijo: false,
            es_recurrente: false,
            metodo_pago: 'Transferencia',
            banco: 'BBVA',
            cuenta: 'FISCAL',
        }
    });

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter">
                            {transaction ? 'Actualizar' : 'Registrar'} Movimiento
                        </DialogTitle>
                        <Button type="button" variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4"/></Button>
                    </div>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                    <FormField control={form.control} name="metodo_pago" render={({ field }) => (
                        <FormItem><FormLabel>Método de Pago</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger className="h-11"><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>{METODOS_PAGO.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                            </Select>
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="banco" render={({ field }) => (
                        <FormItem><FormLabel>Banco</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || undefined}>
                                <FormControl><SelectTrigger className="h-11"><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>{BANCOS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                            </Select>
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="cuenta" render={({ field }) => (
                        <FormItem><FormLabel>Tipo de Cuenta</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || undefined}>
                                <FormControl><SelectTrigger className="h-11"><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>{CUENTAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                            </Select>
                        </FormItem>
                    )} />

                    <div className="md:col-span-2 border-t pt-10">
                        <FormField control={form.control} name="categoria_especifica" render={({ field }) => (
                            <FormItem><FormLabel>Categoría Específica</FormLabel><FormControl><Input placeholder="-" className="h-11 bg-slate-50/50" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>

                    <div className="md:col-span-2">
                        <FormField control={form.control} name="descripcion" render={({ field }) => (
                            <FormItem><FormLabel>Descripción Adicional</FormLabel><FormControl><Input placeholder="Detalles rápidos..." className="h-11 bg-slate-50/50" {...field} value={field.value ?? ''} /></FormControl></FormItem>
                        )} />
                    </div>

                    <div className="md:col-span-2">
                        <FormField control={form.control} name="notas" render={({ field }) => (
                            <FormItem><FormLabel>Observaciones (Máx 280 car.)</FormLabel><FormControl><Textarea className="min-h-[120px] resize-none bg-slate-50/50" {...field} value={field.value ?? ''} /></FormControl></FormItem>
                        )} />
                    </div>
                </div>

                <DialogFooter className="gap-3 pt-6 border-t">
                    <Button type="button" variant="outline" className="flex-1 h-12 text-slate-600" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" className="flex-[2] h-12 text-lg font-bold bg-[#2D5A4C] hover:bg-[#24483D]" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin"/>}
                        {transaction ? 'Guardar Cambios' : 'Registrar Movimiento'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}

function FormLabel({ children, className }: { children: React.ReactNode, className?: string }) {
    return <Label className={cn("text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block", className)}>{children}</Label>;
}
