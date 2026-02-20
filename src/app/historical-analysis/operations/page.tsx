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
  Wallet, PieChart as PieChartIcon
} from 'lucide-react';
import { 
  Bar as RechartsBar, BarChart as RechartsBarChart, CartesianGrid, Legend, Pie, PieChart, 
  ResponsiveContainer, Tooltip, XAxis, YAxis, Cell as RechartsCell
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
            if (!supabase) return;
            const dataToSave = { 
                ...values, 
                fecha: format(values.fecha, 'yyyy-MM-dd'),
                monto: Number(values.monto)
            };
            
            // --- FASE 4: Lógica de Nómina Mixta (Fragmentación Automática) ---
            if (values.tipo_gasto_impacto === 'NOMINA' && values.es_nomina_mixta) {
                const distribucion = [
                    { canal: 'MERCADO_LIBRE', porcentaje: 0.60 },
                    { canal: 'MAYOREO', porcentaje: 0.30 },
                    { canal: 'FISICO', porcentaje: 0.10 }
                ];

                const inserts = distribucion.map(dest => ({
                    ...dataToSave,
                    monto: Number(values.monto) * dest.porcentaje,
                    canal_asociado: dest.canal,
                    clasificacion_operativa: 'SEMI_DIRECTO',
                    notas: `${values.notas || ''} [Sueldo fraccionado ${dest.porcentaje * 100}% - Nómina Mixta]`.trim(),
                    es_nomina_mixta: false // Se guarda como registro final
                }));

                const { error } = await supabase.from('gastos_diarios').insert(inserts as any);
                if (error) throw error;
            } else {
                let res;
                if (editingTransaction) {
                    res = await supabase.from('gastos_diarios').update(dataToSave as any).eq('id', editingTransaction.id);
                } else {
                    res = await supabase.from('gastos_diarios').insert([dataToSave] as any);
                }
                if (res.error) throw res.error;
            }

            toast({ title: "Éxito", description: "Movimiento registrado correctamente." });
            setIsFormOpen(false);
            setEditingTransaction(null);
            fetchAllData();
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        }
    };

    const handleDelete = React.useCallback(async (id: number) => {
        try {
            if (!supabase) return;
            const { error } = await supabase.from('gastos_diarios').delete().eq('id', id);
            if (error) throw error;
            toast({ title: "Eliminado", description: "Registro borrado." });
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
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl">
                    <TransactionForm transaction={editingTransaction} onSubmit={handleSave} onClose={() => setIsFormOpen(false)} />
                </DialogContent>
            </Dialog>
        </div>
    );
}

function InsightsView({ transactions, isLoading, currentDate, setCurrentDate }: any) {
    const stats = React.useMemo(() => {
        let expense = 0, income = 0, fixedCosts = 0;
        transactions.forEach((t: any) => {
            if (t.tipo_transaccion === 'GASTO') {
                expense += (t.monto || 0);
                if (t.es_fijo) fixedCosts += (t.monto || 0);
            }
            else if (t.tipo_transaccion === 'INGRESO') income += (t.monto || 0);
        });
        
        const margenPromedio = 0.40; // Margen de contribución estimado
        const metaSupervivencia = fixedCosts / (margenPromedio || 1);
        
        return { 
            totalExpense: expense, 
            totalIncome: income, 
            balance: income - expense,
            metaSupervivencia,
            progresoSupervivencia: Math.min(100, (income / (metaSupervivencia || 1)) * 100)
        };
    }, [transactions]);

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none shadow-sm bg-white">
                    <CardHeader className="pb-2 text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Balance del Periodo</CardHeader>
                    <CardContent className="flex items-center justify-center gap-12 py-4">
                        <div className="h-[140px] w-[140px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={[{ name: 'Gastos', value: stats.totalExpense }, { name: 'Balance', value: Math.max(0, stats.balance) }]} innerRadius={50} outerRadius={65} paddingAngle={4} dataKey="value">
                                        <RechartsCell fill="#f43f5e" /><RechartsCell fill="#3b82f6" />
                                    </Pie>
                                    <Tooltip formatter={(v: number) => money(v)} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Balance Neto</p>
                            <p className="text-3xl font-black text-blue-600">{money(stats.balance)}</p>
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="border-none shadow-sm bg-white">
                    <CardHeader className="pb-2 text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Barra de Supervivencia (BI)</CardHeader>
                    <CardContent className="space-y-6 py-6">
                        <div className="flex justify-between items-baseline">
                            <p className="text-4xl font-black">{money(stats.totalIncome)} <span className="text-lg font-medium text-muted-foreground ml-1">ingresados</span></p>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Punto de Equilibrio</p>
                                <p className="text-sm font-bold">{money(stats.metaSupervivencia)}</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Progress value={stats.progresoSupervivencia} className={cn("h-3 bg-muted")} />
                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
                                <span className={stats.progresoSupervivencia < 100 ? "text-red-500" : "text-green-600"}>
                                    {stats.progresoSupervivencia < 100 ? "Falta cubrir costos fijos" : "¡Punto de equilibrio superado!"}
                                </span>
                                <span>{stats.progresoSupervivencia.toFixed(0)}%</span>
                            </div>
                        </div>
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
    const { rentabilidadData, chartsData } = React.useMemo(() => {
        // --- FASE 3: Lógica de Rentabilidad Limpia por Canal ---
        const ingresos = transactions.filter((t: any) => t.tipo_transaccion === 'INGRESO');
        const gastos = transactions.filter((t: any) => t.tipo_transaccion === 'GASTO');
        const ingresoTotal = ingresos.reduce((acc: number, curr: any) => acc + (curr.monto || 0), 0);
        
        const ingresosPorCanal: Record<string, number> = {};
        ingresos.forEach((ing: any) => {
            const canal = ing.canal_asociado || 'GENERAL';
            ingresosPorCanal[canal] = (ingresosPorCanal[canal] || 0) + (ing.monto || 0);
        });

        const gastosCompartidos = gastos
            .filter((g: any) => g.clasificacion_operativa === 'COMPARTIDO')
            .reduce((acc: number, curr: any) => acc + (curr.monto || 0), 0);

        const rentabilidad = Object.keys(ingresosPorCanal).map(canal => {
            const ingresoCanal = ingresosPorCanal[canal];
            const pesoCanal = ingresoTotal > 0 ? (ingresoCanal / ingresoTotal) : 0;
            
            const gastosDirectosCanal = gastos
                .filter((g: any) => 
                    g.canal_asociado === canal && 
                    (g.clasificacion_operativa === 'DIRECTO' || g.clasificacion_operativa === 'SEMI_DIRECTO')
                )
                .reduce((acc: number, curr: any) => acc + (curr.monto || 0), 0);

            const costoAsignado = gastosCompartidos * pesoCanal;
            const utilidadReal = ingresoCanal - gastosDirectosCanal - costoAsignado;

            return {
                canal: canal.replace('_', ' '),
                ingresos: ingresoCanal,
                peso: (pesoCanal * 100).toFixed(1),
                directos: gastosDirectosCanal,
                asignados: costoAsignado,
                utilidad: utilidadReal,
                margen: ingresoCanal > 0 ? ((utilidadReal / ingresoCanal) * 100).toFixed(1) : '0'
            };
        });

        // Charts desglosados
        const catMap: Record<string, number> = {};
        const areaMap: Record<string, number> = {};
        const companyMap: Record<string, number> = {};

        gastos.forEach((t: GastoDiario) => {
            catMap[t.categoria_macro] = (catMap[t.categoria_macro] || 0) + (t.monto || 0);
            companyMap[t.empresa] = (companyMap[t.empresa] || 0) + (t.monto || 0);
            if (t.area_funcional) areaMap[t.area_funcional] = (areaMap[t.area_funcional] || 0) + (t.monto || 0);
        });

        return {
            rentabilidadData: rentabilidad,
            chartsData: {
                categories: Object.entries(catMap).map(([name, value]) => ({ name, value })),
                areas: Object.entries(areaMap).map(([name, value]) => ({ name: name.replace('_', ' '), value })),
                companies: Object.entries(companyMap).map(([name, value]) => ({ name, value }))
            }
        };
    }, [transactions]);

    if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="space-y-8">
            <Card className="border-none shadow-sm bg-white overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <div className="space-y-1">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" /> Rentabilidad por Canal (BI Fase 3 & 4)
                        </CardTitle>
                        <CardDescription>Cálculo Exacto: Ingresos - (Directos + Nómina Mixta) - Prorrateo Compartido.</CardDescription>
                    </div>
                </CardHeader>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/10">
                            <TableRow className="h-10">
                                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Canal</TableHead>
                                <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest">Ingresos</TableHead>
                                <TableHead className="text-center text-[10px] font-bold uppercase tracking-widest">Peso %</TableHead>
                                <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest">C. Directos</TableHead>
                                <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest">C. Asignado</TableHead>
                                <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest bg-primary/5 text-primary">Utilidad Real</TableHead>
                                <TableHead className="text-center text-[10px] font-bold uppercase tracking-widest">Margen</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rentabilidadData.length > 0 ? rentabilidadData.map((r, i) => (
                                <TableRow key={i} className="hover:bg-muted/5">
                                    <TableCell className="font-bold text-xs">{r.canal}</TableCell>
                                    <TableCell className="text-right text-xs font-medium">{money(r.ingresos)}</TableCell>
                                    <TableCell className="text-center text-[10px] font-black text-muted-foreground">{r.peso}%</TableCell>
                                    <TableCell className="text-right text-xs text-destructive">{money(r.directos)}</TableCell>
                                    <TableCell className="text-right text-xs text-amber-600">{money(r.asignados)}</TableCell>
                                    <TableCell className="text-right text-xs font-black bg-primary/5 text-primary">{money(r.utilidad)}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={Number(r.margen) > 20 ? "default" : "secondary"} className="text-[9px] font-bold">{r.margen}%</Badge>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground italic text-xs">Sin datos para rentabilidad.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="border-none shadow-sm bg-white">
                    <CardHeader><CardTitle className="text-[10px] font-bold uppercase tracking-widest">Gastos por Categoría</CardTitle></CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={chartsData.categories} dataKey="value" nameKey="name" innerRadius={50} outerRadius={70} paddingAngle={5}>
                                    {chartsData.categories.map((_, i) => <RechartsCell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(v: number) => money(v)} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '9px'}} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-white">
                    <CardHeader><CardTitle className="text-[10px] font-bold uppercase tracking-widest">Gastos por Área Funcional</CardTitle></CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart data={chartsData.areas} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" fontSize={8} width={80} axisLine={false} tickLine={false} />
                                <Tooltip formatter={(v: number) => money(v)} />
                                <RechartsBar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={15} />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-white">
                    <CardHeader><CardTitle className="text-[10px] font-bold uppercase tracking-widest">Gasto por Empresa</CardTitle></CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={chartsData.companies} dataKey="value" nameKey="name" innerRadius={50} outerRadius={70} paddingAngle={5}>
                                    {chartsData.companies.map((_, i) => <RechartsCell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
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
                        <CardDescription className="text-sm text-muted-foreground mt-1">Auditoría completa de ingresos y gastos.</CardDescription>
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
                                            <div className="font-bold text-[11px] text-[#1e293b]">{t.categoria_macro}</div>
                                            <div className="text-[10px] text-slate-400 font-medium">{t.subcategoria_especifica}</div>
                                        </TableCell>
                                        <TableCell className="text-[10px] font-semibold text-slate-500 uppercase">{t.canal_asociado?.replace('_', ' ')}</TableCell>
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
                                                    <DropdownMenuItem onClick={() => handleEdit(t)}><Pencil className="mr-2 h-3.5 w-3.5" /> Editar</DropdownMenuItem>
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
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CATEGORIAS_MACRO.map((cat: string) => {
                const current = transactions.filter((t: any) => t.categoria_macro === cat && t.tipo_transaccion === 'GASTO').reduce((s: number, t: any) => s + (t.monto || 0), 0);
                const limit = 20000;
                const percentage = Math.min(100, (current / limit) * 100);
                return (
                    <Card key={cat} className="border-none shadow-sm bg-white hover:shadow-md transition-all">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest">{cat}</CardTitle>
                            <Badge variant={percentage > 90 ? "destructive" : "secondary"} className="text-[9px]">{percentage.toFixed(0)}%</Badge>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-end"><span className="text-2xl font-black">{money(current)}</span><span className="text-[10px] font-bold text-muted-foreground uppercase">Meta: {money(limit)}</span></div>
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
            <CardHeader><CardTitle className="text-lg font-bold">Configuración BI (Fase 2, 3 & 4)</CardTitle><CardDescription>Gestión de prorrateos y plantillas de nómina mixta.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4"><div className="space-y-1"><Label className="text-sm font-bold">Margen de Contribución Promedio</Label><p className="text-xs text-muted-foreground">Valor actual: 40% (Utilizado para Punto de Equilibrio).</p></div><Button variant="outline" size="sm">Ajustar</Button></div>
                <div className="flex items-center justify-between border-b pb-4"><div className="space-y-1"><Label className="text-sm font-bold">Plantilla Nómina Mixta</Label><p className="text-xs text-muted-foreground">Reparto: 60% ML, 30% Mayoreo, 10% Físico.</p></div><Button variant="outline" size="sm">Editar Plantilla</Button></div>
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
            <DialogHeader><DialogTitle className="text-2xl font-black uppercase tracking-tighter text-[#2D5A4C]">{transaction ? 'Editar' : 'Registrar'} Movimiento</DialogTitle></DialogHeader>
            
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
                    <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Monto ($)</Label><FormControl><Input type="number" step="0.01" className="h-10 font-black text-lg border-slate-200" {...field} /></FormControl><FormMessage /></FormItem>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t">
                <FormField control={form.control} name="es_fijo" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-muted/5">
                        <div className="space-y-0.5"><FormLabel className="text-[10px] font-black uppercase tracking-widest">Gasto Fijo</FormLabel><FormDescription className="text-[8px]">Esencial para operar</FormDescription></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                )} />
                <FormField control={form.control} name="es_recurrente" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-muted/5">
                        <div className="space-y-0.5"><FormLabel className="text-[10px] font-black uppercase tracking-widest">Recurrente</FormLabel><FormDescription className="text-[8px]">Se repite mensualmente</FormDescription></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                )} />
                {watchedImpact === 'NOMINA' && (
                    <FormField control={form.control} name="es_nomina_mixta" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-primary/20 p-3 bg-primary/5">
                            <div className="space-y-0.5"><FormLabel className="text-[10px] font-black uppercase tracking-widest text-[#2D5A4C]">Nómina Mixta (Fase 4)</FormLabel><FormDescription className="text-[8px]">Repartir 60/30/10 entre canales</FormDescription></div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )} />
                )}
            </div>

            <DialogFooter className="gap-3 pt-6 border-t"><Button type="button" variant="outline" onClick={onClose} className="font-bold uppercase text-[10px] border-slate-200">Cancelar</Button><Button type="submit" className="bg-[#2D5A4C] hover:bg-[#1f3e34] font-black uppercase text-[10px] px-12 h-11">{transaction ? 'Guardar Cambios' : 'Registrar Movimiento'}</Button></DialogFooter>
        </form></Form>
    );
}
