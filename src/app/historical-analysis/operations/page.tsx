'use client';

import * as React from 'react';
import { 
  add, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, 
  startOfDay, endOfDay, parseISO, isValid, isToday
} from 'date-fns';
import { es } from 'date-fns/locale';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  BarChart as BarChartIcon, ChevronLeft, ChevronRight,
  Loader2, MoreVertical, Pencil, Plus, Trash2, 
  Bell, Search, Filter, Download, Activity,
  Wallet, PieChart as PieChartIcon, Truck, Package, Info, Hammer, TrendingUp, Target,
  Settings2, Eye, Calendar as CalendarIcon, History, X, Settings as SettingsIcon,
  PlusCircle, Edit2, Save, HelpCircle
} from 'lucide-react';
import { 
  Bar as RechartsBar, BarChart as RechartsBarChart, CartesianGrid, Legend, Pie, PieChart, 
  ResponsiveContainer, Tooltip, XAxis, YAxis, Cell as RechartsCell, ComposedChart, Line, Area, AreaChart
} from 'recharts';
import * as XLSX from 'xlsx';

import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { 
    expenseFormSchema, 
    TransactionFormValues,
    EMPRESAS,
    TIPOS_TRANSACCION,
    CANALES_ASOCIADOS,
    CATEGORIAS_MACRO,
    METODOS_PAGO,
    BANCOS,
    CUENTAS,
    TIPO_GASTO_IMPACTO_LIST,
    AREAS_FUNCIONALES,
    CLASIFICACIONES_OPERATIVAS,
    SUBCATEGORIAS_NIVEL_3_DEFAULT
} from './schemas';

import { addExpenseAction, updateExpenseAction, deleteExpenseAction } from './actions';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel, FormDescription } from '@/components/ui/form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { GastoDiario } from '@/types/database';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Label } from '@/components/ui/label';

const money = (v?: number | null) => v === null || v === undefined ? '$0.00' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);
const COLORS = ['#2D5A4C', '#3b82f6', '#f43f5e', '#eab308', '#8b5cf6', '#06b6d4', '#f97316'];

export default function OperationsPage() {
    const [currentView, setCurrentView] = React.useState<'inicio' | 'informes' | 'presupuestos' | 'configuracion'>('inicio');
    const [transactions, setTransactions] = React.useState<GastoDiario[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingTransaction, setEditingTransaction] = React.useState<GastoDiario | null>(null);
    const [currentDate, setCurrentDate] = React.useState<Date>(new Date());
    const [isClient, setIsClient] = React.useState(false);

    React.useEffect(() => {
        setIsClient(true);
        setCurrentDate(startOfDay(new Date()));
    }, []);

    const [macroCategories, setMacroCategories] = React.useState<string[]>(CATEGORIAS_MACRO);
    const [impacts, setImpacts] = React.useState<string[]>(TIPO_GASTO_IMPACTO_LIST);
    const [subcategoriesMap, setSubcategoriesMap] = React.useState<Record<string, string[]>>(SUBCATEGORIAS_NIVEL_3_DEFAULT);
    const [budgetsMap, setBudgetsMap] = React.useState<Record<string, number>>({
        'OPERATIVO': 45000,
        'NOMINA': 120000,
        'ADMINISTRATIVO': 30000,
        'COMERCIAL': 25000,
        'FINANCIERO': 15000
    });

    const { toast } = useToast();

    const fetchAllData = React.useCallback(async () => {
        if (!supabase) return;
        setIsLoading(true);
        try {
            const start = startOfMonth(currentDate);
            const end = endOfMonth(currentDate);

            const { data, error } = await supabase
                .from('gastos_diarios')
                .select('*')
                .gte('fecha', format(start, 'yyyy-MM-dd'))
                .lte('fecha', format(end, 'yyyy-MM-dd'))
                .order('fecha', { ascending: false });

            if (error) throw error;
            setTransactions(data || []);
        } catch (e: any) {
            console.error('Error fetching transactions:', e);
            toast({ title: "Error", description: "No se pudieron cargar los movimientos.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [currentDate, toast]);

    React.useEffect(() => { 
        if (isClient) fetchAllData(); 
    }, [fetchAllData, isClient]);

    const handleSave = async (values: TransactionFormValues) => {
        try {
            let result;
            
            if (values.tipo_gasto_impacto === 'NOMINA' && values.es_nomina_mixta) {
                const distribucion = [
                    { canal: 'MERCADO_LIBRE', porcentaje: 0.60 },
                    { canal: 'MAYOREO', porcentaje: 0.30 },
                    { canal: 'FISICO', porcentaje: 0.10 }
                ];

                for (const dest of distribucion) {
                    const fraccionado = {
                        ...values,
                        monto: Number(values.monto) * dest.porcentaje,
                        canal_asociado: dest.canal as any,
                        clasificacion_operativa: 'SEMI_DIRECTO' as any,
                        notas: `${values.notas || ''} [Sueldo fraccionado ${dest.porcentaje * 100}% - Nómina Mixta]`.trim(),
                        es_nomina_mixta: false 
                    };
                    const res = await addExpenseAction(fraccionado);
                    if (res.error) throw new Error(res.error);
                }
                result = { data: "Nómina mixta registrada exitosamente." };
            } else {
                if (editingTransaction && editingTransaction.id) {
                    result = await updateExpenseAction(editingTransaction.id, values);
                } else {
                    result = await addExpenseAction(values);
                }
            }

            if (result.error) throw new Error(result.error);

            toast({ title: "Éxito", description: result.data || "Movimiento registrado correctamente." });
            setIsFormOpen(false);
            setEditingTransaction(null);
            fetchAllData();
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        }
    };

    const handleDelete = React.useCallback(async (id: number) => {
        try {
            const result = await deleteExpenseAction(id);
            if (result.error) throw new Error(result.error);
            toast({ title: "Eliminado", description: "Registro borrado correctamente." });
            fetchAllData();
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        }
    }, [fetchAllData, toast]);

    const handleEdit = React.useCallback((t: GastoDiario) => {
        setEditingTransaction(t);
        setIsFormOpen(true);
    }, []);

    if (!isClient) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col bg-muted/20 min-w-0">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6">
                <div className="flex items-center gap-4 min-w-0">
                    <SidebarTrigger />
                    <h1 className="text-xl font-bold tracking-tight whitespace-nowrap">Gastos Financieros</h1>
                    <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as any)} className="ml-4 hidden md:block">
                        <TabsList className="bg-muted/40 h-9 p-1 border">
                            <TabsTrigger value="inicio" className="text-xs font-bold uppercase tracking-tighter">Inicio</TabsTrigger>
                            <TabsTrigger value="informes" className="text-xs font-bold uppercase tracking-tighter">Informes</TabsTrigger>
                            <TabsTrigger value="presupuestos" className="text-xs font-bold uppercase tracking-tighter">Presupuestos</TabsTrigger>
                            <TabsTrigger value="configuracion" className="text-xs font-bold uppercase tracking-tighter">Configuración</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground"><Search className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground"><Bell className="h-4 w-4" /></Button>
                    <Button size="sm" className="bg-[#2D5A4C] hover:bg-[#24483D] font-bold h-9" onClick={() => { setEditingTransaction(null); setIsFormOpen(true); }}><Plus className="mr-1.5 h-4 w-4" /> Nueva</Button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 no-scrollbar">
                {currentView === 'inicio' && <InsightsView transactions={transactions} isLoading={isLoading} currentDate={currentDate} setCurrentDate={setCurrentDate} />}
                {currentView === 'informes' && <ReportsView transactions={transactions} isLoading={isLoading} onEditTransaction={handleEdit} onDeleteTransaction={handleDelete} />}
                {currentView === 'presupuestos' && (
                    <BudgetsView 
                        transactions={transactions} 
                        categories={macroCategories} 
                        budgets={budgetsMap} 
                        setBudgets={setBudgetsMap} 
                        setCategories={setMacroCategories}
                    />
                )}
                {currentView === 'configuracion' && (
                    <SettingsView 
                        impacts={impacts} 
                        setImpacts={setImpacts}
                        subcategories={subcategoriesMap}
                        setSubcategories={setSubcategoriesMap}
                    />
                )}
            </main>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-y-auto p-0 border-none shadow-2xl">
                    <TransactionForm 
                        transaction={editingTransaction} 
                        onSubmit={handleSave} 
                        onClose={() => setIsFormOpen(false)}
                        dynamicImpacts={impacts}
                        dynamicSubcategories={subcategoriesMap}
                        dynamicMacro={macroCategories}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}

function InsightsView({ transactions, isLoading, currentDate, setCurrentDate }: any) {
    const [selectedDayData, setSelectedDayData] = React.useState<{ day: string, records: any[] } | null>(null);
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (scrollContainerRef.current) {
                const selectedElement = scrollContainerRef.current.querySelector('[data-selected="true"]');
                if (selectedElement) {
                    selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }
            }
        }, 100);
        return () => clearTimeout(timeoutId);
    }, [currentDate]);

    const stats = React.useMemo(() => {
        let expense = 0, income = 0, fixedCosts = 0;
        let rubrosFijos = { nomina: 0, renta: 0, servicios: 0, software: 0 };

        transactions.forEach((t: any) => {
            if (t.tipo_transaccion === 'GASTO') {
                expense += (t.monto || 0);
                if (t.es_fijo) {
                    fixedCosts += (t.monto || 0);
                    const sub = (t.subcategoria_especifica || '').toLowerCase();
                    if (sub.includes('renta')) rubrosFijos.renta += t.monto;
                    else if (t.tipo_gasto_impacto === 'NOMINA') rubrosFijos.nomina += t.monto;
                    else if (['cfe', 'agua', 'internet'].some(s => sub.includes(s))) rubrosFijos.servicios += t.monto;
                    else if (sub.includes('software')) rubrosFijos.software += t.monto;
                }
            }
            else if (t.tipo_transaccion === 'INGRESO') income += (t.monto || 0);
        });
        
        const margenPromedio = 0.40; 
        const metaSupervivencia = fixedCosts / (margenPromedio || 1);
        
        return { 
            totalExpense: expense, 
            totalIncome: income, 
            balance: income - expense,
            fixedCosts,
            metaSupervivencia,
            progresoSupervivencia: Math.min(100, (income / (metaSupervivencia || 1)) * 100),
            rubrosFijos
        };
    }, [transactions]);

    const pieData = React.useMemo(() => [
        { name: 'Ingresos', value: stats.totalIncome, color: '#3b82f6' },
        { name: 'Gastos', value: stats.totalExpense, color: '#f43f5e' }
    ], [stats]);

    const barChartData = React.useMemo(() => {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        const steps = eachDayOfInterval({ start, end });
        return steps.map(step => {
            const dayT = transactions.filter((t: any) => {
                try {
                    return isSameDay(parseISO(t.fecha), step);
                } catch (e) { return false; }
            });
            let expense = 0, income = 0;
            dayT.forEach((t: any) => {
                if (t.tipo_transaccion === 'GASTO') expense += (t.monto || 0);
                else if (t.tipo_transaccion === 'INGRESO') income += (t.monto || 0);
            });
            return { 
                name: format(step, 'd'), 
                fullDate: step,
                Ingresos: income, 
                Gastos: expense,
                records: dayT
            };
        });
    }, [transactions, currentDate]);

    const handleChartClick = (data: any) => {
        if (data && data.activePayload && data.activePayload.length > 0) {
            const dayInfo = data.activePayload[0].payload;
            setSelectedDayData({
                day: format(dayInfo.fullDate, 'eeee d \'de\' MMMM', { locale: es }),
                records: dayInfo.records
            });
        }
    };

    if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="border-none shadow-sm bg-white">
                    <CardHeader className="pb-2">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Balance del Periodo</p>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between pt-2">
                        <div className="h-[120px] w-[120px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData} innerRadius={35} outerRadius={50} paddingAngle={5} dataKey="value">
                                        {pieData.map((entry, index) => <RechartsCell key={`cell-${index}`} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip formatter={(v: number) => money(v)} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="text-right space-y-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Balance Neto</p>
                            <p className={cn("text-2xl font-black", stats.balance >= 0 ? "text-primary" : "text-destructive")}>{money(stats.balance)}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Gasto Fijo Real (Fase 7)</p>
                            <CardTitle className="text-2xl font-black text-[#2D5A4C]">{money(stats.fixedCosts)}</CardTitle>
                        </div>
                        <Target className="h-5 w-5 text-muted-foreground opacity-50" />
                    </CardHeader>
                    <CardContent className="pt-2">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="p-2 bg-muted/5 rounded-lg border border-border/50">
                                <p className="text-[8px] font-bold uppercase text-muted-foreground">Meta Supervivencia</p>
                                <p className="text-xs font-black">{money(stats.metaSupervivencia)}</p>
                            </div>
                            <div className="p-2 bg-primary/5 rounded-lg border border-primary/10">
                                <p className="text-[8px] font-bold uppercase text-primary">Ingresos Actuales</p>
                                <p className="text-xs font-black text-primary">{money(stats.totalIncome)}</p>
                            </div>
                        </div>
                        <div className="mt-4 space-y-1.5">
                            <div className="flex justify-between items-center text-[9px] font-bold uppercase">
                                <span>Progreso Punto Equilibrio</span>
                                <span>{stats.progresoSupervivencia.toFixed(0)}%</span>
                            </div>
                            <Progress value={stats.progresoSupervivencia} className="h-1.5 bg-muted" />
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="pb-2"><p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Estructura del Gasto Fijo</p></CardHeader>
                    <CardContent className="h-[150px] p-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart data={[
                                { name: 'Nómina', value: stats.rubrosFijos.nomina },
                                { name: 'Renta', value: stats.rubrosFijos.renta },
                                { name: 'Servicios', value: stats.rubrosFijos.servicios },
                                { name: 'Software', value: stats.rubrosFijos.software }
                            ]} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" fontSize={9} width={60} axisLine={false} tickLine={false} />
                                <Tooltip formatter={(v: number) => money(v)} cursor={{fill: 'transparent'}} />
                                <RechartsBar dataKey="value" fill="#2D5A4C" radius={[0, 4, 4, 0]} barSize={12} />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-sm overflow-hidden bg-white">
                <div className="flex items-center justify-between px-6 py-3 border-b">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-black text-[#2D5A4C] tracking-widest">Periodo de Auditoría</span>
                        <span className="text-sm font-black uppercase">{format(currentDate, 'MMMM yyyy', { locale: es })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-8 text-[9px] font-bold uppercase border-slate-200" onClick={() => setCurrentDate(startOfDay(new Date()))}>Hoy</Button>
                        <div className="flex items-center">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(add(currentDate, { months: -1 }))}><ChevronLeft className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(add(currentDate, { months: 1 }))}><ChevronRight className="h-4 w-4" /></Button>
                        </div>
                    </div>
                </div>
                <div className="flex items-center px-2 py-4">
                    <ScrollArea className="flex-1" viewportRef={scrollContainerRef}>
                        <div className="flex gap-2 px-4 pb-2">
                            {eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) }).map((day, i) => {
                                const isSelected = isSameDay(day, currentDate);
                                const isDayToday = isToday(day);
                                return (
                                    <button 
                                        key={i} 
                                        onClick={() => setCurrentDate(day)} 
                                        data-selected={isSelected}
                                        className={cn(
                                            "flex flex-col items-center justify-center min-w-[54px] h-16 rounded-xl transition-all duration-300 relative", 
                                            isSelected ? "bg-[#2D5A4C] text-white shadow-lg scale-105" : "hover:bg-muted text-muted-foreground"
                                        )}
                                    >
                                        <span className={cn("text-[10px] uppercase font-bold tracking-tighter opacity-80", isSelected ? "text-white/80" : "text-slate-400")}>
                                            {format(day, 'eee', { locale: es }).substring(0, 2)}
                                        </span>
                                        <span className="text-lg font-black">{format(day, 'd')}</span>
                                        {isDayToday && !isSelected && (
                                            <div className="absolute bottom-2 h-1 w-1 rounded-full bg-primary" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <ScrollBar orientation="horizontal" className="invisible" />
                    </ScrollArea>
                </div>
            </Card>

            <Card className="border-none shadow-sm p-6 bg-white overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" /> Flujo de Caja Diario (Ingresos vs Gastos)
                        </CardTitle>
                        <CardDescription>Visualiza ingresos y gastos día a día. Haz clic en una barra para ver el detalle.</CardDescription>
                    </div>
                </div>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={barChartData} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                            <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                            <Tooltip cursor={{fill: '#f8fafc'}} formatter={(v: number) => money(v)} />
                            <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
                            <RechartsBar dataKey="Ingresos" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                            <RechartsBar dataKey="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} />
                        </RechartsBarChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <Dialog open={!!selectedDayData} onOpenChange={(open) => !open && setSelectedDayData(null)}>
                <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-2xl font-black uppercase tracking-tighter">
                            <History className="h-6 w-6 text-primary" /> Movimientos del {selectedDayData?.day}
                        </DialogTitle>
                        <DialogDescription>Listado detallado de transacciones registradas para esta fecha.</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="flex-1 mt-4">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="font-bold text-[10px] uppercase">Categoría</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase">Canal</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase">Tipo</TableHead>
                                    <TableHead className="text-right font-bold text-[10px] uppercase">Monto</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedDayData?.records.length ? (
                                    selectedDayData.records.map((r: any) => (
                                        <TableRow key={r.id}>
                                            <TableCell>
                                                <div className="font-bold text-xs">{r.tipo_gasto_impacto?.replace(/_/g, ' ')}</div>
                                                <div className="text-[10px] text-muted-foreground">{r.subcategoria_especifica}</div>
                                            </TableCell>
                                            <TableCell className="text-[10px] font-medium uppercase">{r.canal_asociado?.replace(/_/g, ' ')}</TableCell>
                                            <TableCell><Badge variant={r.tipo_transaccion === 'INGRESO' ? 'default' : 'secondary'} className="text-[8px] font-bold uppercase">{r.tipo_transaccion}</Badge></TableCell>
                                            <TableCell className={cn("text-right font-bold text-xs", r.tipo_transaccion === 'GASTO' ? "text-slate-900" : "text-primary")}>{money(r.monto)}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">Sin registros este día.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function ReportsView({ transactions, isLoading, onEditTransaction, onDeleteTransaction }: any) {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [showFilter, setShowFilter] = React.useState(false);

    const { logisticsData, chartsData, breakevenChart } = React.useMemo(() => {
        const ingresos = transactions.filter((t: any) => t.tipo_transaccion === 'INGRESO');
        const gastos = transactions.filter((t: any) => t.tipo_transaccion === 'GASTO');
        const ingresoTotal = ingresos.reduce((acc: number, curr: any) => acc + (curr.monto || 0), 0);
        const costosFijos = gastos.filter((g: any) => g.es_fijo).reduce((a, b) => a + (b.monto || 0), 0);
        
        const gastosLogistica = gastos.filter((g: any) => 
            g.area_funcional === 'LOGISTICA' || g.tipo_gasto_impacto === 'GASTO_LOGISTICO'
        );
        
        const maxSales = Math.max(ingresoTotal * 1.5, 200000);
        const chartBEP = Array.from({ length: 11 }, (_, i) => {
            const sales = (maxSales / 10) * i;
            const margin = 0.40;
            const varCosts = sales * (1 - margin);
            return {
                name: `$${Math.round(sales/1000)}k`,
                Ventas: sales,
                CostosTotales: costosFijos + varCosts,
                CostosFijos: costosFijos
            };
        });

        return {
            logisticsData: {
                total: gastosLogistica.reduce((a, b) => a + (b.monto || 0), 0),
                breakdown: Object.entries(gastosLogistica.reduce((acc: any, g: any) => { const cat = g.subcategoria_especifica || 'Otros'; acc[cat] = (acc[cat] || 0) + (g.monto || 0); return acc; }, {})).map(([name, value]) => ({ name, value }))
            },
            chartsData: {
                areas: Object.entries(gastos.reduce((acc: any, t: any) => { acc[t.area_funcional] = (acc[t.area_funcional] || 0) + (t.monto || 0); return acc; }, {})).map(([name, value]) => ({ name: (name as string).replace(/_/g, ' '), value })),
            },
            breakevenChart: chartBEP
        };
    }, [transactions]);

    const filteredTransactions = React.useMemo(() => {
        if (!searchQuery) return transactions;
        const q = searchQuery.toLowerCase();
        return transactions.filter((t: any) => 
            (t.responsable?.toLowerCase() || '').includes(q) ||
            (t.notas?.toLowerCase() || '').includes(q) ||
            (t.subcategoria_especifica?.toLowerCase() || '').includes(q) ||
            (t.canal_asociado?.toLowerCase() || '').includes(q) ||
            (t.empresa?.toLowerCase() || '').includes(q)
        );
    }, [transactions, searchQuery]);

    const handleExport = () => {
        const ws = XLSX.utils.json_to_sheet(filteredTransactions.map((t: any) => ({
            Fecha: t.fecha,
            Empresa: t.empresa,
            'Tipo Transacción': t.tipo_transaccion,
            Monto: t.monto,
            'Tipo Gasto': t.tipo_gasto_impacto,
            'Área Funcional': t.area_funcional,
            'Subcategoría': t.subcategoria_especifica,
            'Categoría Macro': t.categoria_macro,
            'Canal': t.canal_asociado,
            'Atribución': t.clasificacion_operativa,
            Fijo: t.es_fijo ? 'SÍ' : 'NO',
            Recurrente: t.es_recurrente ? 'SÍ' : 'NO',
            Responsable: t.responsable,
            Notas: t.notas
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Historial Movimientos");
        XLSX.writeFile(wb, `historial_movimientos_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
    };

    if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="space-y-8">
            <Card className="border-none shadow-sm bg-white overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <div className="space-y-1">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" /> Punto de Equilibrio (Fase 7)
                        </CardTitle>
                        <CardDescription>Cruce entre Ingresos y Costos Totales basado en Gasto Fijo Actual.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={breakevenChart}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" fontSize={9} axisLine={false} tickLine={false} />
                                <YAxis fontSize={9} axisLine={false} tickLine={false} tickFormatter={v => `$${v/1000}k`} />
                                <Tooltip formatter={(v: number) => money(v)} />
                                <Legend verticalAlign="top" align="right" height={36} iconType="line" />
                                <Area type="monotone" dataKey="Ventas" fill="#3b82f6" fillOpacity={0.1} stroke="#3b82f6" strokeWidth={2} name="Ingresos" />
                                <Line type="monotone" dataKey="CostosTotales" stroke="#f43f5e" strokeWidth={3} dot={false} name="Costos Totales" />
                                <Line type="monotone" dataKey="CostosFijos" stroke="#94a3b8" strokeDasharray="5 5" dot={false} name="Base Fija" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow className="h-10">
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest w-1/4">Concepto</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Significado Estratégico (Fase 1-7)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow className="h-12">
                                    <TableCell className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-[#94a3b8]" />
                                        <span className="text-[10px] font-bold uppercase">Base Fija</span>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">Representa el <strong>Costo de Supervivencia</strong>: Renta, Nómina base, Servicios y Software. Lo que pagas aunque no vendas nada.</TableCell>
                                </TableRow>
                                <TableRow className="h-12">
                                    <TableCell className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-[#f43f5e]" />
                                        <span className="text-[10px] font-bold uppercase">Costos Totales</span>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">La suma de la Base Fija más los <strong>Costos Variables</strong> (Materiales, Comisiones, Logística). Sube conforme aumenta el volumen de operación.</TableCell>
                                </TableRow>
                                <TableRow className="h-12">
                                    <TableCell className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-[#3b82f6]" />
                                        <span className="text-[10px] font-bold uppercase">Ingresos</span>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">El flujo bruto de dinero que entra a la empresa por todos los canales de venta auditados.</TableCell>
                                </TableRow>
                                <TableRow className="h-12 bg-primary/5">
                                    <TableCell className="flex items-center gap-2">
                                        <HelpCircle className="h-3 w-3 text-primary" />
                                        <span className="text-[10px] font-black uppercase text-primary">Punto de Equilibrio</span>
                                    </TableCell>
                                    <TableCell className="text-xs font-medium text-primary">El momento exacto donde la línea azul cruza la roja. A partir de este punto, cada peso adicional es <strong>Utilidad Neta</strong>.</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-none shadow-sm bg-white">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                                <Truck className="h-4 w-4 text-primary" /> Eficiencia Logística (Fase 5)
                            </CardTitle>
                            <CardDescription className="text-[10px]">Inversión operativa de movimiento mensual.</CardDescription>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-black text-primary">{money(logisticsData.total)}</p>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart data={logisticsData.breakdown} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" fontSize={9} width={90} axisLine={false} tickLine={false} />
                                <Tooltip formatter={(v: number) => money(v)} />
                                <RechartsBar dataKey="value" fill="#2D5A4C" radius={[0, 4, 4, 0]} barSize={15} />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white">
                    <CardHeader><CardTitle className="text-[10px] font-bold uppercase tracking-widest">Distribución por Área</CardTitle></CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={chartsData.areas} dataKey="value" nameKey="name" innerRadius={50} outerRadius={70} paddingAngle={5}>
                                    {chartsData.areas.map((_, i) => <RechartsCell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(v: number) => money(v)} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '9px'}} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-sm overflow-hidden bg-white">
                <CardHeader className="flex flex-row items-center justify-between pb-8">
                    <div className="space-y-1">
                        <CardTitle className="text-xl font-bold text-[#1e293b]">Historial de Movimientos</CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">Auditoría completa de ingresos y gastos del periodo.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex items-center gap-2">
                            {showFilter && (
                                <div className="relative animate-in fade-in slide-in-from-right-2">
                                    <Input 
                                        placeholder="Buscar..." 
                                        className="h-9 w-[200px] text-xs pr-8" 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        autoFocus
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            )}
                            <Button 
                                variant={showFilter ? "secondary" : "outline"} 
                                size="sm" 
                                className="h-9 px-4 text-xs font-medium border-slate-200"
                                onClick={() => setShowFilter(!showFilter)}
                            >
                                <Filter className="mr-2 h-4 w-4" /> Filtrar
                            </Button>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-9 px-4 text-xs font-medium border-slate-200"
                            onClick={handleExport}
                        >
                            <Download className="mr-2 h-4 w-4" /> Exportar
                        </Button>
                    </div>
                </CardHeader>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/10 border-t">
                            <TableRow className="h-10 border-b-0">
                                <TableHead className="font-bold uppercase text-[10px] text-slate-500 tracking-wider">Fecha</TableHead>
                                <TableHead className="font-bold uppercase text-[10px] text-slate-500 tracking-wider">Empresa</TableHead>
                                <TableHead className="font-bold uppercase text-[10px] text-slate-500 tracking-wider">Categoría / Subcategoría</TableHead>
                                <TableHead className="font-bold uppercase text-[10px] text-slate-500 tracking-wider">Canal</TableHead>
                                <TableHead className="font-bold uppercase text-[10px] text-slate-500 tracking-wider">Atribución</TableHead>
                                <TableHead className="text-right font-bold uppercase text-[10px] text-slate-500 tracking-wider">Monto</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTransactions.length > 0 ? (
                                filteredTransactions.map((t: GastoDiario) => (
                                    <TableRow key={t.id} className="hover:bg-muted/5 h-14">
                                        <TableCell className="text-[11px] font-medium text-slate-600">{t.fecha}</TableCell>
                                        <TableCell><Badge variant="outline" className="text-[10px] font-semibold text-slate-600 border-slate-200">{t.empresa}</Badge></TableCell>
                                        <TableCell>
                                            <div className="font-bold text-[11px] text-[#1e293b]">{t.tipo_gasto_impacto?.replace(/_/g, ' ')}</div>
                                            <div className="text-[10px] text-slate-400 font-medium">{t.subcategoria_especifica}</div>
                                        </TableCell>
                                        <TableCell className="text-[10px] font-semibold text-slate-500 uppercase">{t.canal_asociado?.replace(/_/g, ' ')}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <Badge variant={t.tipo_transaccion === 'INGRESO' ? 'default' : 'secondary'} className="text-[8px] font-bold uppercase w-fit">{t.tipo_transaccion}</Badge>
                                                {t.clasificacion_operativa && <span className="text-[8px] font-black text-muted-foreground uppercase">{t.clasificacion_operativa}</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell className={cn("text-right font-bold text-sm", t.tipo_transaccion === 'GASTO' ? "text-slate-900" : "text-primary")}>{money(t.monto)}</TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-32">
                                                    <DropdownMenuItem onClick={() => onEditTransaction(t)}><Pencil className="mr-2 h-3.5 w-3.5" /> Editar</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => onDeleteTransaction(t.id!)} className="text-destructive"><Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={7} className="text-center py-16 text-[11px] font-bold uppercase tracking-widest text-slate-400">0 Registros</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}

function BudgetsView({ transactions, categories, budgets, setBudgets, setCategories }: any) {
    const [editingCat, setEditingCat] = React.useState<string | null>(null);
    const [isNewBudgetOpen, setIsNewBudgetOpen] = React.useState(false);

    const budgetAnalysis = React.useMemo(() => {
        return categories.map((cat: string) => {
            const current = transactions
                .filter((t: any) => t.categoria_macro === cat && t.tipo_transaccion === 'GASTO')
                .reduce((s: number, t: any) => s + (t.monto || 0), 0);
            
            return { cat, current, limit: budgets[cat] || 0 }; 
        });
    }, [transactions, categories, budgets]);

    const handleUpdateLimit = (cat: string, limit: number) => {
        setBudgets({ ...budgets, [cat]: limit });
        setEditingCat(null);
    };

    const handleAddBudget = (name: string, limit: number) => {
        const upperName = name.toUpperCase().replace(/\s/g, '_');
        if (!categories.includes(upperName)) {
            setCategories([...categories, upperName]);
        }
        setBudgets({ ...budgets, [upperName]: limit });
        setIsNewBudgetOpen(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold uppercase tracking-tight">Metas Presupuestarias</h2>
                <Button size="sm" className="bg-[#2D5A4C] font-bold" onClick={() => setIsNewBudgetOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Presupuesto
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {budgetAnalysis.map((item: any) => {
                    const percentage = item.limit > 0 ? Math.min(100, (item.current / item.limit) * 100) : 0;
                    const isOver = percentage >= 90;
                    return (
                        <Card key={item.cat} className="border-none shadow-sm bg-white hover:shadow-md transition-all relative group">
                            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.cat}</CardTitle>
                                    <div className="text-2xl font-black">{money(item.current)}</div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <Badge variant={isOver ? "destructive" : "secondary"} className="text-[9px] font-black">
                                        {percentage.toFixed(0)}%
                                    </Badge>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setEditingCat(item.cat)}>
                                        <Edit2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-2">
                                <div className="flex justify-between items-end text-[10px] font-bold text-muted-foreground uppercase">
                                    <span>Consumo</span>
                                    <span>Meta: {money(item.limit)}</span>
                                </div>
                                <Progress value={percentage} className={cn("h-2.5", isOver ? "bg-red-100 [&>div]:bg-destructive" : "bg-muted [&>div]:bg-[#2D5A4C]")} />
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
            
            <Card className="border-none shadow-sm bg-white overflow-hidden">
                <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-primary" /> Auditoría de Presupuestos
                    </CardTitle>
                    <CardDescription>Resumen de metas mensuales por categoría macro financiera.</CardDescription>
                </CardHeader>
                <div className="p-0 border-t">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead className="font-bold uppercase text-[10px]">Categoría</TableHead>
                                <TableHead className="font-bold uppercase text-[10px] text-right">Presupuesto</TableHead>
                                <TableHead className="font-bold uppercase text-[10px] text-right">Ejecutado</TableHead>
                                <TableHead className="font-bold uppercase text-[10px] text-right">Disponible</TableHead>
                                <TableHead className="font-bold uppercase text-[10px] text-center">Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {budgetAnalysis.map(item => (
                                <TableRow key={item.cat}>
                                    <TableCell className="font-bold text-xs">{item.cat}</TableCell>
                                    <TableCell className="text-right font-medium">{money(item.limit)}</TableCell>
                                    <TableCell className="text-right font-black">{money(item.current)}</TableCell>
                                    <TableCell className={cn("text-right font-bold", (item.limit - item.current) < 0 ? "text-destructive" : "text-primary")}>
                                        {money(item.limit - item.current)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={item.current > item.limit ? "destructive" : "outline"} className="text-[8px] uppercase">
                                            {item.current > item.limit ? "Excedido" : "En Meta"}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            <Dialog open={!!editingCat} onOpenChange={() => setEditingCat(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Editar Meta: {editingCat}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nuevo Límite Mensual ($)</Label>
                            <Input 
                                type="number" 
                                defaultValue={editingCat ? budgets[editingCat] : 0}
                                id="edit-limit-input"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingCat(null)}>Cancelar</Button>
                        <Button onClick={() => {
                            const val = (document.getElementById('edit-limit-input') as HTMLInputElement).value;
                            handleUpdateLimit(editingCat!, Number(val));
                        }}>Guardar Cambios</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isNewBudgetOpen} onOpenChange={setIsNewBudgetOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Nuevo Presupuesto Macro</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nombre de Categoría</Label>
                            <Input placeholder="Ej: MARKETING_DIGITAL" id="new-cat-name" />
                        </div>
                        <div className="space-y-2">
                            <Label>Límite Inicial ($)</Label>
                            <Input type="number" placeholder="0.00" id="new-cat-limit" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsNewBudgetOpen(false)}>Cancelar</Button>
                        <Button onClick={() => {
                            const name = (document.getElementById('new-cat-name') as HTMLInputElement).value;
                            const limit = (document.getElementById('new-cat-limit') as HTMLInputElement).value;
                            handleAddBudget(name, Number(limit));
                        }}>Crear Categoría</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function SettingsView({ impacts, setImpacts, subcategories, setSubcategories }: any) {
    const [newImpact, setNewImpact] = React.useState('');
    const [selectedImpactForSubs, setSelectedImpactForSubs] = React.useState(impacts[0]);
    const [newSub, setNewSub] = React.useState('');

    const handleAddImpact = () => {
        if (!newImpact) return;
        const upper = newImpact.toUpperCase().replace(/\s/g, '_');
        if (!impacts.includes(upper)) {
            setImpacts([...impacts, upper]);
            setSubcategories({ ...subcategories, [upper]: [] });
        }
        setNewImpact('');
    };

    const handleAddSub = () => {
        if (!newSub || !selectedImpactForSubs) return;
        const currentSubs = subcategories[selectedImpactForSubs] || [];
        if (!currentSubs.includes(newSub)) {
            setSubcategories({
                ...subcategories,
                [selectedImpactForSubs]: [...currentSubs, newSub]
            });
        }
        setNewSub('');
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card className="md:col-span-2 border-none shadow-sm bg-white">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Settings2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold">Parámetros BI (Fases 1-7)</CardTitle>
                            <CardDescription>Configura los valores clave para el motor de inteligencia financiera.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-4">
                        <div className="flex items-center justify-between border-b pb-4">
                            <div className="space-y-1">
                                <Label className="text-sm font-bold">Margen de Contribución Promedio (Fase 7)</Label>
                                <p className="text-xs text-muted-foreground">Valor utilizado para calcular el Punto de Equilibrio mensual.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Input type="number" defaultValue="40" className="w-20 font-black h-9 text-right" />
                                <span className="font-bold text-sm">%</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between border-b pb-4">
                            <div className="space-y-1">
                                <Label className="text-sm font-bold">Días de Auditoría Histórica</Label>
                                <p className="text-xs text-muted-foreground">Periodo de datos para el cálculo de promedios de gasto fijo.</p>
                            </div>
                            <Select defaultValue="180">
                                <SelectTrigger className="w-32 h-9 font-bold"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="90">90 Días</SelectItem>
                                    <SelectItem value="180">180 Días</SelectItem>
                                    <SelectItem value="365">1 Año</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center justify-between border-b pb-4">
                            <div className="space-y-1">
                                <Label className="text-sm font-bold">Unidad Independiente Malla Sombra (Fase 6)</Label>
                                <p className="text-xs text-muted-foreground">Aislar financieramente el taller de producción.</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <Label className="text-sm font-bold">Notificaciones de Presupuesto</Label>
                                <p className="text-xs text-muted-foreground">Alertar cuando una categoría supere el 90% del límite.</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end border-t bg-muted/5 py-3">
                        <Button className="bg-[#2D5A4C] hover:bg-[#1f3e34] font-bold">Guardar Configuración</Button>
                    </CardFooter>
                </Card>

                <div className="space-y-6">
                    <Card className="border-none shadow-sm bg-white overflow-hidden">
                        <CardHeader className="bg-primary/5 pb-4">
                            <div className="flex items-center gap-2">
                                <Hammer className="h-4 w-4 text-primary" />
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest">Nómina Mixta (Fase 4)</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <p className="text-[10px] text-muted-foreground font-medium uppercase">Reparto Actual de Esfuerzo:</p>
                            <div className="space-y-3">
                                {[
                                    { name: 'Mercado Libre', val: 60, color: '#2D5A4C' },
                                    { name: 'Mayoreo', val: 30, color: '#3b82f6' },
                                    { name: 'Físico', val: 10, color: '#f43f5e' }
                                ].map(i => (
                                    <div key={i.name} className="space-y-1">
                                        <div className="flex justify-between text-[10px] font-bold uppercase">
                                            <span>{i.name}</span>
                                            <span>{i.val}%</span>
                                        </div>
                                        <Progress value={i.val} className="h-1 bg-muted [&>div]:bg-current" style={{ color: i.color }} />
                                    </div>
                                ))}
                            </div>
                            <Button variant="outline" size="sm" className="w-full text-[10px] font-bold h-8 border-slate-200">Editar Plantilla</Button>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-[#2D5A4C] text-primary-foreground">
                        <CardHeader className="pb-2">
                            <p className="text-[10px] font-bold uppercase opacity-80 tracking-widest">Estado de Salud BI</p>
                            <CardTitle className="text-xl font-black">Optimizada</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-[10px] leading-relaxed opacity-90">
                                Tu arquitectura financiera está operando en Fase 7. Los cálculos de rentabilidad y supervivencia son 100% automáticos basados en tus registros.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Card className="border-none shadow-sm bg-white">
                <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <SettingsIcon className="h-5 w-5 text-primary" /> Gestión de Categorías e Impactos (Nivel 1 y 3)
                    </CardTitle>
                    <CardDescription>Añade o modifica la estructura de clasificación de tus gastos.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <Label className="text-[10px] font-bold uppercase tracking-widest">Impacto (Nivel 1)</Label>
                        <div className="flex gap-2">
                            <Input placeholder="Nuevo Impacto..." value={newImpact} onChange={e => setNewImpact(e.target.value)} className="h-9 text-xs" />
                            <Button size="sm" onClick={handleAddImpact}><Plus className="h-4 w-4" /></Button>
                        </div>
                        <ScrollArea className="h-[200px] border rounded-md p-2 bg-muted/5">
                            <div className="space-y-1">
                                {impacts.map((imp: string) => (
                                    <div key={imp} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md group">
                                        <span className="text-[10px] font-bold text-slate-600">{imp.replace(/_/g, ' ')}</span>
                                        <Badge variant="outline" className="text-[8px] opacity-0 group-hover:opacity-100">Activo</Badge>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest">Subcategorías para:</Label>
                            <Select value={selectedImpactForSubs} onValueChange={setSelectedImpactForSubs}>
                                <SelectTrigger className="h-9 text-xs font-bold"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {impacts.map((imp: string) => <SelectItem key={imp} value={imp}>{imp.replace(/_/g, ' ')}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-2">
                            <Input placeholder="Nueva Subcategoría..." value={newSub} onChange={e => setNewSub(e.target.value)} className="h-9 text-xs" />
                            <Button size="sm" onClick={handleAddSub}><Plus className="h-4 w-4" /></Button>
                        </div>
                        <ScrollArea className="h-[155px] border rounded-md p-2 bg-muted/5">
                            <div className="space-y-1">
                                {(subcategories[selectedImpactForSubs] || []).map((sub: string) => (
                                    <div key={sub} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md">
                                        <span className="text-[10px] font-medium text-slate-500">{sub}</span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6"><Trash2 className="h-3 w-3 text-destructive" /></Button>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function TransactionForm({ transaction, onSubmit, onClose, dynamicImpacts, dynamicSubcategories, dynamicMacro }: any) {
    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(expenseFormSchema),
        defaultValues: transaction ? { ...transaction, fecha: parseISO(transaction.fecha) } : {
            fecha: new Date(), 
            empresa: 'MTM', 
            tipo_transaccion: 'GASTO', 
            categoria_macro: 'OPERATIVO', 
            canal_asociado: 'GENERAL', 
            clasificacion_operativa: 'COMPARTIDO',
            es_fijo: false, 
            es_recurrente: false, 
            metodo_pago: 'TRANSFERENCIA', 
            banco: 'BBVA', 
            cuenta: 'OPERATIVA',
            responsable: '',
            es_nomina_mixta: false
        }
    });

    const watchedImpact = useWatch({ control: form.control, name: 'tipo_gasto_impacto' });
    const watchedChannel = useWatch({ control: form.control, name: 'canal_asociado' });
    const watchedIsNominaMixta = useWatch({ control: form.control, name: 'es_nomina_mixta' });

    React.useEffect(() => {
        if (watchedChannel === 'GENERAL') {
            form.setValue('clasificacion_operativa', 'COMPARTIDO');
        } else if (watchedIsNominaMixta) {
            form.setValue('clasificacion_operativa', 'SEMI_DIRECTO');
        }
    }, [watchedChannel, watchedIsNominaMixta, form]);

    const subcategorias = watchedImpact ? (dynamicSubcategories[watchedImpact] || []) : [];

    return (
        <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 p-8 bg-white rounded-lg">
            <div className="flex items-center justify-between mb-2">
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-[#2D5A4C]">{transaction ? 'Editar' : 'Registrar'} Movimiento</DialogTitle>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField control={form.control} name="metodo_pago" render={({ field }) => (
                    <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Método Pago</Label>
                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-10 text-xs font-bold border-slate-200"><SelectValue /></SelectTrigger></FormControl><SelectContent>{METODOS_PAGO.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
                    </FormItem>
                )} />
                <FormField control={form.control} name="banco" render={({ field }) => (
                    <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Banco</Label>
                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-10 text-xs font-bold border-slate-200"><SelectValue /></SelectTrigger></FormControl><SelectContent>{BANCOS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
                    </FormItem>
                )} />
                <FormField control={form.control} name="cuenta" render={({ field }) => (
                    <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tipo de Cuenta</Label>
                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-10 text-xs font-bold border-slate-200"><SelectValue /></SelectTrigger></FormControl><SelectContent>{CUENTAS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
                    </FormItem>
                )} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <FormField control={form.control} name="empresa" render={({ field }) => (
                    <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Empresa</Label>
                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-10 text-xs font-bold border-slate-200"><SelectValue /></SelectTrigger></FormControl><SelectContent>{EMPRESAS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
                    </FormItem>
                )} />
                <FormField control={form.control} name="tipo_transaccion" render={({ field }) => (
                    <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tipo</Label>
                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-10 text-xs font-bold border-slate-200"><SelectValue /></SelectTrigger></FormControl><SelectContent>{TIPOS_TRANSACCION.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
                    </FormItem>
                )} />
                <FormField control={form.control} name="monto" render={({ field }) => (
                    <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Monto ($)</Label><FormControl><Input type="number" step="0.01" className="h-10 font-bold border-slate-200" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="responsable" render={({ field }) => (
                    <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Responsable</Label><FormControl><Input className="h-10 text-xs font-bold border-slate-200" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                )} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField control={form.control} name="tipo_gasto_impacto" render={({ field }) => (
                    <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Impacto (Nivel 1)</Label>
                        <Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger className="h-10 text-xs font-bold border-slate-200"><SelectValue /></SelectTrigger></FormControl><SelectContent>{dynamicImpacts.map((v: string) => <SelectItem key={v} value={v}>{v.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select>
                    </FormItem>
                )} />
                <FormField control={form.control} name="area_funcional" render={({ field }) => (
                    <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Área (Nivel 2)</Label>
                        <Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger className="h-10 text-xs font-bold border-slate-200"><SelectValue /></SelectTrigger></FormControl><SelectContent>{AREAS_FUNCIONALES.map(v => <SelectItem key={v} value={v}>{v.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select>
                    </FormItem>
                )} />
                <FormField control={form.control} name="subcategoria_especifica" render={({ field }) => (
                    <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Subcategoría (Nivel 3)</Label>
                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-10 text-xs font-bold border-slate-200"><SelectValue placeholder="Primero elija Nivel 1" /></SelectTrigger></FormControl><SelectContent>{subcategorias.map((v: string) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
                    </FormItem>
                )} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField control={form.control} name="categoria_macro" render={({ field }) => (
                    <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Categoría Macro</Label>
                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-10 text-xs font-bold border-slate-200"><SelectValue /></SelectTrigger></FormControl><SelectContent>{dynamicMacro.map((v: string) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
                    </FormItem>
                )} />
                <FormField control={form.control} name="canal_asociado" render={({ field }) => (
                    <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Canal Asociado</Label>
                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-10 text-xs font-bold border-slate-200"><SelectValue /></SelectTrigger></FormControl><SelectContent>{CANALES_ASOCIADOS.map(v => <SelectItem key={v} value={v}>{v.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select>
                    </FormItem>
                )} />
                <FormField control={form.control} name="clasificacion_operativa" render={({ field }) => (
                    <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Atribución Rentabilidad</Label>
                        <Select onValueChange={field.onChange} value={field.value || ''} disabled={watchedChannel === 'GENERAL' || watchedIsNominaMixta}><FormControl><SelectTrigger className="h-10 text-xs font-bold border-slate-200"><SelectValue /></SelectTrigger></FormControl><SelectContent>{CLASIFICACIONES_OPERATIVAS.map(v => <SelectItem key={v} value={v}>{v.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select>
                    </FormItem>
                )} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                <FormField control={form.control} name="es_fijo" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/5">
                        <div className="space-y-0.5"><FormLabel className="text-[10px] font-black uppercase tracking-widest">Gasto Fijo (Fase 7)</FormLabel><FormDescription className="text-[8px]">Esencial para operar el mes</FormDescription></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                )} />
                <FormField control={form.control} name="es_recurrente" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/5">
                        <div className="space-y-0.5"><FormLabel className="text-[10px] font-black uppercase tracking-widest">Recurrente</FormLabel><FormDescription className="text-[8px]">Se repite mensualmente</FormDescription></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                )} />
            </div>

            {watchedImpact === 'NOMINA' && (
                <div className="pt-4">
                    <FormField control={form.control} name="es_nomina_mixta" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-primary/20 p-4 bg-primary/5">
                            <div className="space-y-0.5"><FormLabel className="text-[10px] font-black uppercase tracking-widest text-[#2D5A4C]">Nómina Mixta (Fase 4)</FormLabel><FormDescription className="text-[8px]">Repartir 60/30/10 entre canales</FormDescription></div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )} />
                </div>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t">
                <Button type="button" variant="outline" onClick={onClose} className="font-bold uppercase text-[10px] border-slate-200">Cancelar</Button>
                <Button type="submit" className="bg-[#2D5A4C] hover:bg-[#1f3e34] font-black uppercase text-[10px] px-12 h-11">Registrar Movimiento</Button>
            </div>
        </form></Form>
    );
}