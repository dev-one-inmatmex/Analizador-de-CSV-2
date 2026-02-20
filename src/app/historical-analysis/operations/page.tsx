
'use client';

import * as React from 'react';
import { 
  add, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, 
  startOfDay, endOfDay, parseISO, isValid
} from 'date-fns';
import { es } from 'date-fns/locale';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  BarChart as BarChartIcon, ChevronLeft, ChevronRight,
  Loader2, MoreVertical, Pencil, Plus, Trash2, 
  Bell, Search, Filter, Download, Activity,
  Wallet, PieChart as PieChartIcon, Truck, Package, Info, Hammer, TrendingUp, Target
} from 'lucide-react';
import { 
  Bar as RechartsBar, BarChart as RechartsBarChart, CartesianGrid, Legend, Pie, PieChart, 
  ResponsiveContainer, Tooltip, XAxis, YAxis, Cell as RechartsCell, ComposedChart, Line, Area, AreaChart
} from 'recharts';

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
    SUBCATEGORIAS_NIVEL_3
} from './schemas';

import { addExpenseAction, updateExpenseAction, deleteExpenseAction } from './actions';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
    const [currentDate, setCurrentDate] = React.useState(startOfDay(new Date()));

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
        fetchAllData(); 
    }, [fetchAllData]);

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

    return (
        <div className="flex h-screen flex-col bg-muted/20 min-w-0">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6">
                <div className="flex items-center gap-4 min-w-0">
                    <SidebarTrigger />
                    <h1 className="text-xl font-bold tracking-tight whitespace-nowrap">Gastos Financieros</h1>
                    <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as any)} className="ml-4">
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
                {currentView === 'presupuestos' && <BudgetsView transactions={transactions} />}
                {currentView === 'configuracion' && <SettingsView />}
            </main>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-y-auto p-0 border-none shadow-2xl">
                    <TransactionForm transaction={editingTransaction} onSubmit={handleSave} onClose={() => setIsFormOpen(false)} />
                </DialogContent>
            </Dialog>
        </div>
    );
}

function InsightsView({ transactions, isLoading, currentDate, setCurrentDate }: any) {
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
            return { name: format(step, 'd'), Ingresos: income, Gastos: expense };
        });
    }, [transactions, currentDate]);

    const daysInMonth = React.useMemo(() => {
        return eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
    }, [currentDate]);

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
                                <p className="text-[8px] font-bold uppercase text-muted-foreground">Supervivencia</p>
                                <p className="text-xs font-black">{money(stats.metaSupervivencia)}</p>
                            </div>
                            <div className="p-2 bg-primary/5 rounded-lg border border-primary/10">
                                <p className="text-[8px] font-bold uppercase text-primary">Ingresos</p>
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
                <div className="flex items-center px-2 py-4 border-b">
                    <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setCurrentDate(add(currentDate, { months: -1 }))}><ChevronLeft className="h-5 w-5" /></Button>
                    <ScrollArea className="flex-1">
                        <div className="flex gap-2 px-2 pb-2">
                            {daysInMonth.map((day, i) => (
                                <button key={i} onClick={() => setCurrentDate(day)} className={cn("flex flex-col items-center justify-center min-w-[54px] h-16 rounded-xl transition-all", isSameDay(day, currentDate) ? "bg-[#2D5A4C] text-white shadow-lg" : "hover:bg-muted text-muted-foreground")}>
                                    <span className="text-[10px] uppercase font-bold tracking-tighter opacity-80">{format(day, 'eee', { locale: es }).substring(0, 2)}</span>
                                    <span className="text-lg font-black">{format(day, 'd')}</span>
                                </button>
                            ))}
                        </div>
                        <ScrollBar orientation="horizontal" className="invisible" />
                    </ScrollArea>
                    <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setCurrentDate(add(currentDate, { months: 1 }))}><ChevronRight className="h-5 w-5" /></Button>
                </div>
            </Card>

            <Card className="border-none shadow-sm p-6 bg-white overflow-hidden">
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={barChartData}>
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
        </div>
    );
}

function ReportsView({ transactions, isLoading, onEditTransaction, onDeleteTransaction }: any) {
    const { rentabilidadData, logisticsData, productionData, chartsData, breakevenChart } = React.useMemo(() => {
        const ingresos = transactions.filter((t: any) => t.tipo_transaccion === 'INGRESO');
        const gastos = transactions.filter((t: any) => t.tipo_transaccion === 'GASTO');
        const ingresoTotal = ingresos.reduce((acc: number, curr: any) => acc + (curr.monto || 0), 0);
        const costosFijos = gastos.filter((g: any) => g.es_fijo).reduce((a, b) => a + (b.monto || 0), 0);
        
        const ingresosPorCanal: Record<string, number> = {};
        ingresos.forEach((ing: any) => {
            const canal = ing.canal_asociado || 'GENERAL';
            ingresosPorCanal[canal] = (ingresosPorCanal[canal] || 0) + (ing.monto || 0);
        });

        const gastosLogistica = gastos.filter((g: any) => 
            g.area_funcional === 'LOGISTICA' || g.tipo_gasto_impacto === 'GASTO_LOGISTICO'
        );
        
        const bolsaLogisticaCompartida = gastosLogistica
            .filter((g: any) => g.canal_asociado === 'GENERAL' || g.clasificacion_operativa === 'COMPARTIDO')
            .reduce((acc: number, curr: any) => acc + (curr.monto || 0), 0);

        const gastosProduccion = gastos.filter((g: any) => g.canal_asociado === 'PRODUCCION_MALLA_SOMBRA');
        const ingresosProduccion = ingresos.filter((i: any) => i.canal_asociado === 'PRODUCCION_MALLA_SOMBRA').reduce((a, b) => a + (b.monto || 0), 0);
        
        const prodPayroll = gastosProduccion.filter(g => g.tipo_gasto_impacto === 'NOMINA').reduce((a, b) => a + (b.monto || 0), 0);
        const prodMaterials = gastosProduccion.filter(g => g.tipo_gasto_impacto === 'COSTO_MERCANCIA_COGS').reduce((a, b) => a + (b.monto || 0), 0);
        
        const gastosCompartidosNoLogistica = gastos
            .filter((g: any) => 
                g.clasificacion_operativa === 'COMPARTIDO' && 
                g.area_funcional !== 'LOGISTICA' && 
                g.tipo_gasto_impacto !== 'GASTO_LOGISTICO'
            )
            .reduce((acc: number, curr: any) => acc + (curr.monto || 0), 0);

        const rentabilidad = Object.keys(ingresosPorCanal).map(canal => {
            const ingresoCanal = ingresosPorCanal[canal];
            const pesoCanal = ingresoTotal > 0 ? (ingresoCanal / ingresoTotal) : 0;
            const gastosDirectosCanal = gastos.filter((g: any) => g.canal_asociado === canal && (g.clasificacion_operativa === 'DIRECTO' || g.clasificacion_operativa === 'SEMI_DIRECTO')).reduce((acc: number, curr: any) => acc + (curr.monto || 0), 0);
            const costoAsignadoNoLog = gastosCompartidosNoLogistica * pesoCanal;
            const costoLogAsignado = bolsaLogisticaCompartida * pesoCanal;
            const utilidadReal = ingresoCanal - gastosDirectosCanal - costoAsignadoNoLog - costoLogAsignado;

            return { canal: canal.replace(/_/g, ' '), ingresos: ingresoCanal, peso: (pesoCanal * 100).toFixed(1), logistica: costoLogAsignado, asignados: costoAsignadoNoLog, utilidad: utilidadReal, margen: ingresoCanal > 0 ? ((utilidadReal / ingresoCanal) * 100).toFixed(1) : '0' };
        });

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
            rentabilidadData: rentabilidad,
            logisticsData: {
                total: gastosLogistica.reduce((a, b) => a + (b.monto || 0), 0),
                breakdown: Object.entries(gastosLogistica.reduce((acc: any, g: any) => { const cat = g.subcategoria_especifica || 'Otros'; acc[cat] = (acc[cat] || 0) + (g.monto || 0); return acc; }, {})).map(([name, value]) => ({ name, value }))
            },
            productionData: { ingresos: ingresosProduccion, nomina: prodPayroll, materiales: prodMaterials, utilidad: ingresosProduccion - (prodPayroll + prodMaterials) },
            chartsData: {
                categories: Object.entries(gastos.reduce((acc: any, t: any) => { acc[t.categoria_macro] = (acc[t.categoria_macro] || 0) + (t.monto || 0); return acc; }, {})).map(([name, value]) => ({ name, value })),
                areas: Object.entries(gastos.reduce((acc: any, t: any) => { acc[t.area_funcional] = (acc[t.area_funcional] || 0) + (t.monto || 0); return acc; }, {})).map(([name, value]) => ({ name: (name as string).replace(/_/g, ' '), value })),
            },
            breakevenChart: chartBEP
        };
    }, [transactions]);

    if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="space-y-8">
            <Card className="border-none shadow-sm bg-white overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <div className="space-y-1">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" /> Análisis de Supervivencia (Fase 7)
                        </CardTitle>
                        <CardDescription>Gráfico de Punto de Equilibrio: Intersección entre Ventas y Costos Totales.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={breakevenChart}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="name" fontSize={9} axisLine={false} tickLine={false} />
                            <YAxis fontSize={9} axisLine={false} tickLine={false} tickFormatter={v => `$${v/1000}k`} />
                            <Tooltip formatter={(v: number) => money(v)} />
                            <Legend verticalAlign="top" align="right" height={36} iconType="line" />
                            <Area type="monotone" dataKey="Ventas" fill="#3b82f6" fillOpacity={0.1} stroke="#3b82f6" strokeWidth={2} name="Línea de Ingresos" />
                            <Line type="monotone" dataKey="CostosTotales" stroke="#f43f5e" strokeWidth={3} dot={false} name="Costos Totales (Fijos + Var)" />
                            <Line type="monotone" dataKey="CostosFijos" stroke="#94a3b8" strokeDasharray="5 5" dot={false} name="Base de Gasto Fijo" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-none shadow-sm bg-white">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                                <Truck className="h-4 w-4 text-primary" /> Eficiencia Logística (Fase 5)
                            </CardTitle>
                            <CardDescription className="text-[10px]">Desglose de la "Bolsa de Logística" mensual.</CardDescription>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Inversión Logística</p>
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
                    <CardHeader><CardTitle className="text-[10px] font-bold uppercase tracking-widest">Gastos por Área Funcional</CardTitle></CardHeader>
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
                    <div>
                        <CardTitle className="text-xl font-bold text-[#1e293b]">Historial de Movimientos</CardTitle>
                        <CardDescription className="text-sm text-muted-foreground mt-1">Auditoría completa de ingresos y gastos del periodo.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-9 px-4 text-xs font-medium border-slate-200"><Filter className="mr-2 h-4 w-4" /> Filtrar</Button>
                        <Button variant="outline" size="sm" className="h-9 px-4 text-xs font-medium border-slate-200"><Download className="mr-2 h-4 w-4" /> Exportar</Button>
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
                            {transactions.length > 0 ? (
                                transactions.map((t: GastoDiario) => (
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

function BudgetsView({ transactions }: any) {
    const fixedAnalysis = React.useMemo(() => {
        const fixed = transactions.filter((t: any) => t.es_fijo && t.tipo_transaccion === 'GASTO');
        const categories = [...new Set(fixed.map((t: any) => t.categoria_macro))];
        return categories.map((cat: any) => {
            const current = fixed.filter((t: any) => t.categoria_macro === cat).reduce((s: number, t: any) => s + (t.monto || 0), 0);
            return { cat, current, limit: 25000 }; 
        });
    }, [transactions]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fixedAnalysis.map((item: any) => {
                const percentage = Math.min(100, (item.current / item.limit) * 100);
                return (
                    <Card key={item.cat} className="border-none shadow-sm bg-white hover:shadow-md transition-all">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest">{item.cat}</CardTitle>
                            <Badge variant={percentage > 90 ? "destructive" : "secondary"} className="text-[9px]">{percentage.toFixed(0)}%</Badge>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-end"><span className="text-2xl font-black">{money(item.current)}</span><span className="text-[10px] font-bold text-muted-foreground uppercase">Promedio: {money(item.limit)}</span></div>
                            <Progress value={percentage} className={cn("h-2", percentage > 90 ? "bg-red-100" : "bg-muted")} />
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}

function SettingsView() {
    return (
        <div className="max-w-4xl mx-auto"><Card className="border-none shadow-sm bg-white">
            <CardHeader><CardTitle className="text-lg font-bold">Configuración BI (Fases 1-7)</CardTitle><CardDescription>Gestión de prorrateos, logística, nómina y punto de equilibrio.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4"><div className="space-y-1"><Label className="text-sm font-bold">Margen de Contribución Promedio</Label><p className="text-xs text-muted-foreground">Valor actual: 40% (Utilizado para Punto de Equilibrio de la Fase 7).</p></div><Button variant="outline" size="sm">Ajustar</Button></div>
                <div className="flex items-center justify-between border-b pb-4"><div className="space-y-1"><Label className="text-sm font-bold">Auditoría 6 Meses (Fase 7)</Label><p className="text-xs text-muted-foreground">Estado: Recopilando datos históricos para promedio real de Renta/Servicios.</p></div><Button variant="outline" size="sm">Ver Histórico</Button></div>
                <div className="flex items-center justify-between border-b pb-4"><div className="space-y-1"><Label className="text-sm font-bold">Plantilla Nómina Mixta (Fase 4)</Label><p className="text-xs text-muted-foreground">Reparto: 60% ML, 30% Mayoreo, 10% Físico.</p></div><Button variant="outline" size="sm">Editar Plantilla</Button></div>
                <div className="flex items-center justify-between border-b pb-4"><div className="space-y-1"><Label className="text-sm font-bold">Unidad Independiente Malla Sombra (Fase 6)</Label><p className="text-xs text-muted-foreground">Estado: Activa. Monitoreando rentabilidad de fabricación separada.</p></div><Button variant="outline" size="sm">Configurar Taller</Button></div>
            </CardContent></Card>
        </div>
    );
}

function TransactionForm({ transaction, onSubmit, onClose }: any) {
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

    const subcategorias = watchedImpact ? (SUBCATEGORIAS_NIVEL_3[watchedImpact] || []) : [];

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
                        <Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger className="h-10 text-xs font-bold border-slate-200"><SelectValue /></SelectTrigger></FormControl><SelectContent>{TIPO_GASTO_IMPACTO_LIST.map(v => <SelectItem key={v} value={v}>{v.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select>
                    </FormItem>
                )} />
                <FormField control={form.control} name="area_funcional" render={({ field }) => (
                    <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Área (Nivel 2)</Label>
                        <Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger className="h-10 text-xs font-bold border-slate-200"><SelectValue /></SelectTrigger></FormControl><SelectContent>{AREAS_FUNCIONALES.map(v => <SelectItem key={v} value={v}>{v.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select>
                    </FormItem>
                )} />
                <FormField control={form.control} name="subcategoria_especifica" render={({ field }) => (
                    <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Subcategoría (Nivel 3)</Label>
                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-10 text-xs font-bold border-slate-200"><SelectValue placeholder="Primero elija Nivel 1" /></SelectTrigger></FormControl><SelectContent>{subcategorias.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
                    </FormItem>
                )} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField control={form.control} name="categoria_macro" render={({ field }) => (
                    <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Categoría Macro</Label>
                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-10 text-xs font-bold border-slate-200"><SelectValue /></SelectTrigger></FormControl><SelectContent>{CATEGORIAS_MACRO.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
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
