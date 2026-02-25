'use client';

import * as React from 'react';
import { 
  add, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, 
  startOfDay, endOfDay, parseISO, isValid, isToday, subMonths, startOfYear, endOfYear
} from 'date-fns';
import { es } from 'date-fns/locale';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Loader2, MoreVertical, Pencil, Plus, Trash2, 
  Bell, Search, Filter, Download, Activity,
  PieChart as PieChartIcon, Truck, History, X,
  Save, CalendarDays, FileText, FileDown,
  SlidersHorizontal, CheckCircle2, ChevronLeft, ChevronRight, Target, TrendingUp, Hammer, Info, Eye, AlertTriangle
} from 'lucide-react';
import { 
  Bar as RechartsBar, BarChart as RechartsBarChart, CartesianGrid, Legend, Pie, PieChart, 
  ResponsiveContainer, Tooltip, XAxis, YAxis, Cell as RechartsCell, ComposedChart, Line, Area
} from 'recharts';

import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { 
    expenseFormSchema, 
    TransactionFormValues,
    EMPRESAS,
    TIPOS_TRANSACCION,
    CANALES_ASOCIADOS,
    METODOS_PAGO,
    BANCOS,
    CUENTAS,
    CLASIFICACIONES_OPERATIVAS
} from './schemas';

import { addExpenseAction, updateExpenseAction, deleteExpenseAction } from './actions';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { gastos_diarios, cat_tipo_gasto_impacto, cat_area_funcional, cat_categoria_macro, cat_categoria, cat_subcategoria } from '@/types/database';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';

const money = (v?: number | null) => v === null || v === undefined ? '$0.00' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);
const COLORS = ['#2D5A4C', '#3b82f6', '#f43f5e', '#eab308', '#8b5cf6', '#06b6d4', '#f97316'];

function getEnhancedValue(baseValue: string, notes: string | null | undefined, prefix: string): string {
    if (!notes) return baseValue;
    const match = notes.match(new RegExp(`\\[${prefix}: (.*?)\\]`));
    return (match && match[1]) ? match[1] : baseValue;
}

function cleanNotes(notes: string | null | undefined): string {
    if (!notes) return '';
    return notes.replace(/\[(Empresa|Método|Banco|Cuenta):.*?\]\s*/g, '').trim();
}

// FORMULARIO DE TRANSACCIÓN CON TRIPLE CASCADA
function TransactionForm({ transaction, onSubmit, catalogs }: any) {
    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(expenseFormSchema),
        defaultValues: transaction ? {
            ...transaction,
            fecha: parseISO(transaction.fecha),
            monto: Number(transaction.monto),
            empresa: EMPRESAS.includes(transaction.empresa) ? transaction.empresa : 'OTRA',
            especificar_empresa: getEnhancedValue(transaction.empresa, transaction.notas, 'Empresa'),
            metodo_pago: METODOS_PAGO.includes(transaction.metodo_pago) ? transaction.metodo_pago : 'OTRO',
            especificar_metodo_pago: getEnhancedValue(transaction.metodo_pago, transaction.notas, 'Método'),
            banco: BANCOS.includes(transaction.banco) ? transaction.banco : 'OTRO',
            especificar_banco: getEnhancedValue(transaction.banco, transaction.notas, 'Banco'),
            cuenta: CUENTAS.includes(transaction.cuenta) ? transaction.cuenta : 'OTRO',
            especificar_cuenta: getEnhancedValue(transaction.cuenta, transaction.notas, 'Cuenta'),
            descripcion: transaction.descripcion || '',
            notas: cleanNotes(transaction.notas),
            es_nomina_mixta: false
        } : {
            fecha: new Date(),
            empresa: '',
            tipo_transaccion: 'GASTO',
            monto: 0,
            tipo_gasto_impacto: undefined,
            area_funcional: undefined,
            categoria_macro: undefined,
            categoria: undefined,
            subcategoria_especifica: undefined,
            canal_asociado: 'GENERAL',
            clasificacion_operativa: 'DIRECTO',
            es_fijo: false,
            es_recurrente: false,
            metodo_pago: '',
            banco: '',
            cuenta: '',
            responsable: '',
            descripcion: '',
            notas: '',
            es_nomina_mixta: false
        }
    });

    const watchedMacro = useWatch({ control: form.control, name: 'categoria_macro' });
    const watchedCat = useWatch({ control: form.control, name: 'categoria' });
    const currentEmpresa = useWatch({ control: form.control, name: 'empresa' });
    const currentMetodo = useWatch({ control: form.control, name: 'metodo_pago' });
    const currentBanco = useWatch({ control: form.control, name: 'banco' });
    const currentCuenta = useWatch({ control: form.control, name: 'cuenta' });
    const currentImpactId = useWatch({ control: form.control, name: 'tipo_gasto_impacto' });

    // Lógica de Nómina
    const isNomina = React.useMemo(() => {
        const impact = catalogs.impactos.find((i: any) => i.id === currentImpactId);
        return impact?.nombre?.toUpperCase().includes('NOMINA');
    }, [catalogs.impactos, currentImpactId]);

    // FILTRADO EN CASCADA
    const filteredCategories = React.useMemo(() => {
        if (!watchedMacro) return [];
        return catalogs.categorias.filter((c: any) => c.categoria_macro_id === watchedMacro);
    }, [catalogs.categorias, watchedMacro]);

    const filteredSubs = React.useMemo(() => {
        if (!watchedCat) return [];
        return catalogs.subcategorias.filter((s: any) => s.categoria_id === watchedCat);
    }, [catalogs.subcategorias, watchedCat]);

    // RESETER AL CAMBIAR PADRES
    React.useEffect(() => {
        if (watchedMacro) {
            form.setValue('categoria', undefined as any);
            form.setValue('subcategoria_especifica', undefined as any);
        }
    }, [watchedMacro, form]);

    React.useEffect(() => {
        if (watchedCat) {
            form.setValue('subcategoria_especifica', undefined as any);
        }
    }, [watchedCat, form]);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <DialogHeader>
                    <DialogTitle>{transaction ? 'Editar Registro' : 'Nueva Transacción'}</DialogTitle>
                    <DialogDescription>Clasifica el movimiento siguiendo la arquitectura jerárquica de 5 niveles.</DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="fecha" render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Fecha</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl><Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar</span>}<CalendarDays className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="empresa" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Empresa</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{EMPRESAS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="tipo_transaccion" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tipo</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{TIPOS_TRANSACCION.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="monto" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Monto ($)</FormLabel>
                            <FormControl><Input {...field} type="number" step="0.01" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="tipo_gasto_impacto" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Impacto (Fase 1)</FormLabel>
                            <Select onValueChange={v => field.onChange(Number(v))} value={field.value?.toString()}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{catalogs.impactos.map((i: any) => <SelectItem key={i.id} value={i.id.toString()}>{i.nombre}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="area_funcional" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Área Funcional (Fase 2)</FormLabel>
                            <Select onValueChange={v => field.onChange(Number(v))} value={field.value?.toString()}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{catalogs.areas.map((a: any) => <SelectItem key={a.id} value={a.id.toString()}>{a.nombre}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    {/* TRIPLE CASCADA */}
                    <FormField control={form.control} name="categoria_macro" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Macro (Nivel 1)</FormLabel>
                            <Select onValueChange={v => field.onChange(Number(v))} value={field.value?.toString()}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{catalogs.macros.map((m: any) => <SelectItem key={m.id} value={m.id.toString()}>{m.nombre}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="categoria" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Categoría (Nivel 2)</FormLabel>
                            <Select onValueChange={v => field.onChange(Number(v))} value={field.value?.toString()} disabled={!watchedMacro}>
                                <FormControl><SelectTrigger><SelectValue placeholder={watchedMacro ? "Seleccionar" : "Elija Macro primero"} /></SelectTrigger></FormControl>
                                <SelectContent>{filteredCategories.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="subcategoria_especifica" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Subcategoría (Nivel 3)</FormLabel>
                            <Select onValueChange={v => field.onChange(Number(v))} value={field.value?.toString()} disabled={!watchedCat}>
                                <FormControl><SelectTrigger><SelectValue placeholder={watchedCat ? "Seleccionar" : "Elija Categoría primero"} /></SelectTrigger></FormControl>
                                <SelectContent>{filteredSubs.map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>{s.nombre}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="canal_asociado" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Canal Asociado</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{CANALES_ASOCIADOS.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="responsable" render={({ field }) => (
                        <FormItem><FormLabel>Responsable</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                    )} />

                    <FormField control={form.control} name="metodo_pago" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Pago</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{METODOS_PAGO.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>

                <div className="flex gap-4">
                    <FormField control={form.control} name="es_fijo" render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            <FormLabel>Gasto Fijo</FormLabel>
                        </FormItem>
                    )} />
                    {isNomina && (
                        <FormField control={form.control} name="es_nomina_mixta" render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                <FormLabel className="text-primary font-bold">Nómina Mixta BI</FormLabel>
                            </FormItem>
                        )} />
                    )}
                </div>

                <FormField control={form.control} name="descripcion" render={({ field }) => (
                    <FormItem><FormLabel>Descripción</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                )} />

                <DialogFooter><Button type="submit" className="w-full bg-[#2D5A4C] font-bold"><Save className="mr-2 h-4 w-4" /> Guardar Registro</Button></DialogFooter>
            </form>
        </Form>
    );
}

// COMPONENTE PRINCIPAL
export default function OperationsPage() {
    const [currentView, setCurrentView] = React.useState<'inicio' | 'informes' | 'presupuestos' | 'configuracion'>('inicio');
    const [transactions, setTransactions] = React.useState<gastos_diarios[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingTransaction, setEditingTransaction] = React.useState<gastos_diarios | null>(null);
    const [currentDate, setCurrentDate] = React.useState<Date>(new Date());
    const [isClient, setIsClient] = React.useState(false);

    // CATÁLOGOS DINÁMICOS (5 TABLAS)
    const [catalogs, setCatalogs] = React.useState({
        impactos: [] as cat_tipo_gasto_impacto[],
        areas: [] as cat_area_funcional[],
        macros: [] as cat_categoria_macro[],
        categorias: [] as cat_categoria[],
        subcategorias: [] as cat_subcategoria[]
    });

    const [periodType, setPeriodType] = React.useState<'day' | 'month' | 'six_months' | 'year' | 'custom'>('month');
    const [filterCompany, setFilterCompany] = React.useState<string>('TODAS');

    const [biConfig, setBiConfig] = React.useState({
        contributionMargin: 40,
        payrollTemplate: [
            { label: 'Mercado Libre', canal: 'MERCADO_LIBRE', porcentaje: 60 },
            { label: 'Mayoreo', canal: 'MAYOREO', porcentaje: 30 },
            { label: 'Físico', canal: 'FISICO', porcentaje: 10 }
        ]
    });

    const { toast } = useToast();

    const fetchCatalogs = React.useCallback(async () => {
        if (!supabase) return;
        try {
            const [imp, ar, mac, cat, sub] = await Promise.all([
                supabase.from('cat_tipo_gasto_impacto').select('*').order('nombre'),
                supabase.from('cat_area_funcional').select('*').order('nombre'),
                supabase.from('cat_categoria_macro').select('*').order('nombre'),
                supabase.from('cat_categoria').select('*').order('nombre'),
                supabase.from('cat_subcategoria').select('*').order('nombre')
            ]);
            setCatalogs({
                impactos: imp.data || [],
                areas: ar.data || [],
                macros: mac.data || [],
                categorias: cat.data || [],
                subcategorias: sub.data || []
            });
        } catch (e) { console.error('Error fetching catalogs:', e); }
    }, []);

    const fetchAllData = React.useCallback(async () => {
        if (!supabase) return;
        setIsLoading(true);
        try {
            let start, end;
            switch (periodType) {
                case 'day': start = startOfDay(currentDate); end = endOfDay(currentDate); break;
                case 'six_months': start = startOfMonth(subMonths(currentDate, 5)); end = endOfMonth(currentDate); break;
                case 'year': start = startOfYear(currentDate); end = endOfYear(currentDate); break;
                default: start = startOfMonth(currentDate); end = endOfMonth(currentDate); break;
            }

            let query = supabase.from('gastos_diarios').select('*').gte('fecha', format(start, 'yyyy-MM-dd')).lte('fecha', format(end, 'yyyy-MM-dd'));
            if (filterCompany !== 'TODAS') query = query.eq('empresa', filterCompany);
            const { data, error } = await query.order('fecha', { ascending: false });
            if (error) throw error;
            setTransactions(data || []);
        } catch (e: any) { toast({ title: "Error", description: "No se pudieron cargar los movimientos.", variant: "destructive" }); }
        finally { setIsLoading(false); }
    }, [currentDate, periodType, filterCompany, toast]);

    React.useEffect(() => { setIsClient(true); fetchCatalogs(); }, [fetchCatalogs]);
    React.useEffect(() => { if (isClient) fetchAllData(); }, [fetchAllData, isClient]);

    const handleSave = async (values: TransactionFormValues) => {
        try {
            const finalValues = { ...values };
            const impact = catalogs.impactos.find(i => i.id === finalValues.tipo_gasto_impacto);
            const isNominaImpact = impact?.nombre?.toUpperCase().includes('NOMINA');

            if (isNominaImpact && finalValues.es_nomina_mixta) {
                for (const dest of biConfig.payrollTemplate) {
                    if (dest.porcentaje <= 0) continue;
                    const fraccionado = {
                        ...finalValues,
                        monto: Number(finalValues.monto) * (dest.porcentaje / 100),
                        canal_asociado: dest.canal as any,
                        clasificacion_operativa: 'SEMI_DIRECTO' as any,
                        notas: `${finalValues.notas || ''} [Sueldo fraccionado ${dest.porcentaje}% - Nómina Mixta BI]`.trim(),
                        es_nomina_mixta: false 
                    };
                    const res = await addExpenseAction(fraccionado as any);
                    if (res.error) throw new Error(res.error);
                }
            } else {
                let result;
                if (editingTransaction?.id) result = await updateExpenseAction(editingTransaction.id, finalValues as any);
                else result = await addExpenseAction(finalValues as any);
                if (result.error) throw new Error(result.error);
            }

            toast({ title: "Éxito", description: "Registro guardado correctamente." });
            setIsFormOpen(false); setEditingTransaction(null); fetchAllData();
        } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    };

    if (!isClient) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="flex h-screen flex-col bg-muted/20 min-w-0">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6">
                <div className="flex items-center gap-4 min-w-0">
                    <SidebarTrigger />
                    <h1 className="text-xl font-bold tracking-tight">Gastos financieros</h1>
                    <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as any)} className="ml-4 hidden md:block">
                        <TabsList className="bg-muted/40 h-9 p-1 border">
                            <TabsTrigger value="inicio" className="text-xs font-bold uppercase">Inicio</TabsTrigger>
                            <TabsTrigger value="informes" className="text-xs font-bold uppercase">Informes</TabsTrigger>
                            <TabsTrigger value="presupuestos" className="text-xs font-bold uppercase">Presupuestos</TabsTrigger>
                            <TabsTrigger value="configuracion" className="text-xs font-bold uppercase">Configuración</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
                <div className="flex items-center gap-3">
                    <Button size="sm" className="bg-[#2D5A4C] hover:bg-[#24483D] font-bold h-9" onClick={() => { setEditingTransaction(null); setIsFormOpen(true); }}><Plus className="mr-1.5 h-4 w-4" /> Nueva</Button>
                </div>
            </header>

            <div className="bg-white border-b px-4 py-3 sm:px-6">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <Select value={periodType} onValueChange={(v: any) => setPeriodType(v)}>
                            <SelectTrigger className="h-8 w-[160px] text-xs font-bold uppercase"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="day" className="text-xs font-bold uppercase">Día Seleccionado</SelectItem>
                                <SelectItem value="month" className="text-xs font-bold uppercase">Mes Actual</SelectItem>
                                <SelectItem value="six_months" className="text-xs font-bold uppercase">Semestre (6 Meses)</SelectItem>
                                <SelectItem value="year" className="text-xs font-bold uppercase">Año Fiscal</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1 ml-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(prev => add(prev, { months: -1 }))}><ChevronLeft className="h-4 w-4" /></Button>
                            <Button variant="outline" size="sm" className="h-8 text-[9px] font-bold uppercase border-slate-200" onClick={() => setCurrentDate(startOfDay(new Date()))}>Hoy</Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(prev => add(prev, { months: 1 }))}><ChevronRight className="h-4 w-4" /></Button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <Select value={filterCompany} onValueChange={setFilterCompany}>
                            <SelectTrigger className="h-8 w-[130px] text-xs font-bold uppercase"><SelectValue placeholder="Empresa" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="TODAS" className="text-xs font-bold uppercase">Todas</SelectItem>
                                {EMPRESAS.map(e => <SelectItem key={e} value={e} className="text-xs font-bold uppercase">{e}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 no-scrollbar">
                {currentView === 'inicio' && <InsightsView transactions={transactions} isLoading={isLoading} currentDate={currentDate} setCurrentDate={setCurrentDate} catalogs={catalogs} biConfig={biConfig} />}
                {currentView === 'informes' && <ReportsView transactions={transactions} isLoading={isLoading} onEditTransaction={(t: any) => { setEditingTransaction(t); setIsFormOpen(true); }} onDeleteTransaction={deleteExpenseAction} catalogs={catalogs} biConfig={biConfig} periodType={periodType} />}
                {currentView === 'presupuestos' && <BudgetsView transactions={transactions} catalogs={catalogs} />}
                {currentView === 'configuracion' && <SettingsView catalogs={catalogs} biConfig={biConfig} setBiConfig={setBiConfig} onRefresh={fetchCatalogs} />}
            </main>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                    <TransactionForm transaction={editingTransaction} onSubmit={handleSave} catalogs={catalogs} />
                </DialogContent>
            </Dialog>
        </div>
    );
}

// VISTA DE INSIGHTS (INICIO) - RESOLUCIÓN DE IDs
function InsightsView({ transactions, isLoading, currentDate, setCurrentDate, catalogs, biConfig }: any) {
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const [selectedDayData, setSelectedDayData] = React.useState<any>(null);

    const stats = React.useMemo(() => {
        let expense = 0, income = 0, fixedCosts = 0;
        let rubrosFijos = { nomina: 0, renta: 0, servicios: 0, software: 0 };

        transactions.forEach((t: any) => {
            const monto = Number(t.monto) || 0;
            const impactName = catalogs.impactos.find((i: any) => i.id === t.tipo_gasto_impacto)?.nombre?.toUpperCase() || '';
            const subName = catalogs.subcategorias.find((s: any) => s.id === t.subcategoria_especifica)?.nombre?.toLowerCase() || '';
            const desc = (t.descripcion || '').toLowerCase();

            if (['GASTO', 'COMPRA'].includes(t.tipo_transaccion)) {
                expense += monto;
                if (t.es_fijo) {
                    fixedCosts += monto;
                    if (impactName.includes('NOMINA') || subName.includes('sueldo')) rubrosFijos.nomina += monto;
                    else if (subName.includes('renta') || desc.includes('arrendamiento')) rubrosFijos.renta += monto;
                    else if (['cfe', 'agua', 'internet'].some(s => subName.includes(s) || desc.includes(s))) rubrosFijos.servicios += monto;
                    else if (subName.includes('software') || subName.includes('saas')) rubrosFijos.software += monto;
                }
            } else if (['INGRESO', 'VENTA'].includes(t.tipo_transaccion)) income += monto;
        });
        
        const meta = fixedCosts / ((biConfig.contributionMargin || 40) / 100);
        return { balance: income - expense, totalExpense: expense, totalIncome: income, fixedCosts, meta, progreso: Math.min(100, (income / (meta || 1)) * 100), rubrosFijos };
    }, [transactions, catalogs, biConfig]);

    if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    const barChartData = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) }).map(day => {
        const dayT = transactions.filter((t: any) => isSameDay(parseISO(t.fecha), day));
        let exp = 0, inc = 0;
        dayT.forEach((t: any) => {
            const m = Number(t.monto) || 0;
            if (['GASTO', 'COMPRA'].includes(t.tipo_transaccion)) exp += m; else inc += m;
        });
        return { name: format(day, 'd'), fullDate: day, Ingresos: inc, Gastos: exp, records: dayT };
    });

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="border-none shadow-sm bg-white">
                    <CardHeader className="pb-2"><p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Balance del Periodo</p></CardHeader>
                    <CardContent className="flex items-center justify-between pt-2">
                        <div className="h-[120px] w-[120px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={[{ name: 'Ingresos', value: stats.totalIncome }, { name: 'Gastos', value: stats.totalExpense }]} innerRadius={35} outerRadius={50} paddingAngle={5} dataKey="value">
                                        <RechartsCell fill="#3b82f6" /><RechartsCell fill="#f43f5e" />
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
                        <div className="space-y-1"><p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Gasto Fijo Real</p><CardTitle className="text-2xl font-black text-[#2D5A4C]">{money(stats.fixedCosts)}</CardTitle></div>
                        <Target className="h-5 w-5 text-muted-foreground opacity-50" />
                    </CardHeader>
                    <CardContent className="pt-2">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="p-2 bg-muted/5 rounded-lg border border-border/50"><p className="text-[8px] font-bold uppercase text-muted-foreground">Meta Supervivencia</p><p className="text-xs font-black">{money(stats.meta)}</p></div>
                            <div className="p-2 bg-primary/5 rounded-lg border border-primary/10"><p className="text-[8px] font-bold uppercase text-primary">Ingresos Actuales</p><p className="text-xs font-black text-primary">{money(stats.totalIncome)}</p></div>
                        </div>
                        <div className="mt-4 space-y-1.5"><div className="flex justify-between text-[9px] font-bold uppercase"><span>Progreso</span><span>{stats.progreso.toFixed(0)}%</span></div><Progress value={stats.progreso} className="h-1.5 bg-muted" /></div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="pb-2"><p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">ESTRUCTURA DEL GASTO FIJO</p></CardHeader>
                    <CardContent className="h-[180px] p-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart data={[{ name: 'Nómina', value: stats.rubrosFijos.nomina }, { name: 'Renta', value: stats.rubrosFijos.renta }, { name: 'Servicios', value: stats.rubrosFijos.servicios }, { name: 'Software', value: stats.rubrosFijos.software }]} layout="vertical" margin={{ left: 20, right: 40, top: 20, bottom: 20 }}>
                                <XAxis type="number" hide /><YAxis dataKey="name" type="category" fontSize={11} width={80} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 600}} />
                                <Tooltip formatter={(v: number) => money(v)} cursor={{fill: 'transparent'}} /><RechartsBar dataKey="value" fill="#2D5A4C" radius={[0, 4, 4, 0]} barSize={16} />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-sm overflow-hidden bg-white">
                <div className="flex items-center justify-between px-6 py-3 border-b"><div className="flex flex-col"><span className="text-[10px] uppercase font-black text-[#2D5A4C] tracking-widest">Línea de Tiempo</span><span className="text-sm font-black uppercase">{format(currentDate, 'MMMM yyyy', { locale: es })}</span></div></div>
                <div className="flex items-center px-2 py-4">
                    <ScrollArea className="flex-1" viewportRef={scrollContainerRef}>
                        <div className="flex gap-2 px-4 pb-2">
                            {eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) }).map((day, i) => (
                                <button key={i} onClick={() => setCurrentDate(day)} className={cn("flex flex-col items-center justify-center min-w-[54px] h-16 rounded-xl transition-all", isSameDay(day, currentDate) ? "bg-[#2D5A4C] text-white shadow-lg" : "hover:bg-muted text-muted-foreground")}>
                                    <span className="text-[10px] uppercase font-bold opacity-80">{format(day, 'eee', { locale: es }).substring(0, 2)}</span>
                                    <span className="text-lg font-black">{format(day, 'd')}</span>
                                </button>
                            ))}
                        </div><ScrollBar orientation="horizontal" className="invisible" />
                    </ScrollArea>
                </div>
            </Card>

            <Card className="border-none shadow-sm p-6 bg-white overflow-hidden">
                <div className="mb-6"><CardTitle className="text-lg font-bold flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Flujo de Caja Diario</CardTitle></div>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={barChartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" /><XAxis dataKey="name" fontSize={10} axisLine={false} /><YAxis fontSize={10} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                            <Tooltip formatter={(v: number) => money(v)} /><Legend verticalAlign="top" align="right" height={36} iconType="circle" />
                            <RechartsBar dataKey="Ingresos" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} onClick={(data) => setSelectedDayData({ day: format(data.payload.fullDate, 'eee d MMMM', { locale: es }), records: data.payload.records.filter((r: any) => ['INGRESO', 'VENTA'].includes(r.tipo_transaccion)), title: 'Ingresos' })} />
                            <RechartsBar dataKey="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} onClick={(data) => setSelectedDayData({ day: format(data.payload.fullDate, 'eee d MMMM', { locale: es }), records: data.payload.records.filter((r: any) => ['GASTO', 'COMPRA'].includes(r.tipo_transaccion)), title: 'Gastos' })} />
                        </RechartsBarChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <Dialog open={!!selectedDayData} onOpenChange={() => setSelectedDayData(null)}>
                <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                    <DialogHeader><DialogTitle className="flex items-center gap-2 text-2xl font-black uppercase tracking-tighter">Auditoría de {selectedDayData?.title}: {selectedDayData?.day}</DialogTitle></DialogHeader>
                    <ScrollArea className="flex-1 mt-4">
                        <Table>
                            <TableHeader><TableRow className="bg-muted/50"><TableHead className="font-bold text-[10px] uppercase">Concepto</TableHead><TableHead className="font-bold text-[10px] uppercase">Canal</TableHead><TableHead className="font-bold text-[10px] uppercase">Tipo</TableHead><TableHead className="text-right font-bold text-[10px] uppercase">Monto</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {selectedDayData?.records.map((r: any) => (
                                    <TableRow key={r.id}>
                                        <TableCell><div className="font-bold text-xs">{catalogs.subcategorias.find((s: any) => s.id === r.subcategoria_especifica)?.nombre || '-'}</div></TableCell>
                                        <TableCell className="text-[10px] font-medium uppercase">{String(r.canal_asociado || '-').replace(/_/g, ' ')}</TableCell>
                                        <TableCell><Badge variant="outline" className="text-[8px] font-bold uppercase">{r.tipo_transaccion}</Badge></TableCell>
                                        <TableCell className="text-right font-bold text-xs">{money(r.monto)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// VISTA DE INFORMES - RESOLUCIÓN DE IDs
function ReportsView({ transactions, isLoading, onEditTransaction, onDeleteTransaction, catalogs, biConfig, periodType }: any) {
    const [searchQuery, setSearchQuery] = React.useState('');
    const periodLabel = periodType === 'month' ? 'Mensual' : periodType === 'year' ? 'Anual' : periodType === 'six_months' ? 'Semestral' : 'Diario';

    const { breakevenChart } = React.useMemo(() => {
        const ingresos = transactions.filter((t: any) => ['INGRESO', 'VENTA'].includes(t.tipo_transaccion)).reduce((a: number, b: any) => a + (Number(b.monto) || 0), 0);
        const fijos = transactions.filter((t: any) => t.es_fijo && ['GASTO', 'COMPRA'].includes(t.tipo_transaccion)).reduce((a: number, b: any) => a + (Number(b.monto) || 0), 0);
        const max = Math.max(ingresos * 1.5, 200000);
        const bep = Array.from({ length: 11 }, (_, i) => {
            const sales = (max / 10) * i;
            const varCosts = sales * (1 - (biConfig.contributionMargin / 100));
            return { name: `$${Math.round(sales/1000)}k`, Ventas: sales, CostosTotales: fijos + varCosts, CostosFijos: fijos };
        });
        return { breakevenChart: bep };
    }, [transactions, biConfig]);

    if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    const filtered = transactions.filter((t: any) => {
        const sub = catalogs.subcategorias.find((s: any) => s.id === t.subcategoria_especifica)?.nombre || '';
        return sub.toLowerCase().includes(searchQuery.toLowerCase()) || (t.responsable || '').toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div className="space-y-8">
            <Card className="border-none shadow-sm bg-white overflow-hidden">
                <CardHeader><CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2"><TrendingUp className="h-6 w-6 text-primary" /> Punto de Equilibrio ({periodLabel})</CardTitle></CardHeader>
                <CardContent className="pt-6">
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={breakevenChart}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" fontSize={10} axisLine={false} /><YAxis fontSize={10} axisLine={false} tickFormatter={v => `$${Math.round(v/1000)}k`} />
                                <Tooltip formatter={(v: number) => money(v)} /><Legend verticalAlign="top" align="right" height={40} iconType="circle" />
                                <Area type="monotone" dataKey="Ventas" fill="#3b82f6" fillOpacity={0.08} stroke="#3b82f6" strokeWidth={3} name="Ingresos" />
                                <Line type="monotone" dataKey="CostosTotales" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, fill: '#f43f5e' }} name="Costos Totales" />
                                <Line type="monotone" dataKey="CostosFijos" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Base Fija" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div><CardTitle className="text-xl font-bold">Historial de Movimientos ({periodLabel})</CardTitle></div>
                    <div className="flex gap-2">
                        <div className="relative"><Input placeholder="Buscar..." className="h-9 w-[200px]" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /><Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /></div>
                    </div>
                </CardHeader>
                <div className="table-responsive border-t">
                    <Table className="min-w-[2000px]">
                        <TableHeader className="bg-muted/10"><TableRow className="h-12">
                            <TableHead className="font-bold uppercase text-[10px]">Fecha</TableHead>
                            <TableHead className="font-bold uppercase text-[10px]">Empresa</TableHead>
                            <TableHead className="font-bold uppercase text-[10px]">Impacto</TableHead>
                            <TableHead className="font-bold uppercase text-[10px]">Área</TableHead>
                            <TableHead className="font-bold uppercase text-[10px]">Macro</TableHead>
                            <TableHead className="font-bold uppercase text-[10px]">Categoría</TableHead>
                            <TableHead className="font-bold uppercase text-[10px]">Subcategoría</TableHead>
                            <TableHead className="font-bold uppercase text-[10px]">Responsable</TableHead>
                            <TableHead className="text-right font-bold uppercase text-[10px] px-6">Monto</TableHead>
                            <TableHead className="w-[100px] text-center">Acciones</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                            {filtered.map((t: any) => (
                                <TableRow key={t.id} className="h-14">
                                    <TableCell className="text-[11px]">{t.fecha}</TableCell>
                                    <TableCell><Badge variant="outline" className="text-[10px]">{t.empresa}</Badge></TableCell>
                                    <TableCell className="text-[10px] uppercase">{catalogs.impactos.find((i: any) => i.id === t.tipo_gasto_impacto)?.nombre || '-'}</TableCell>
                                    <TableCell className="text-[10px] uppercase">{catalogs.areas.find((a: any) => a.id === t.area_funcional)?.nombre || '-'}</TableCell>
                                    <TableCell className="text-[10px] uppercase">{catalogs.macros.find((m: any) => m.id === t.categoria_macro)?.nombre || '-'}</TableCell>
                                    <TableCell className="text-[10px] uppercase">{catalogs.categorias.find((c: any) => c.id === t.categoria)?.nombre || '-'}</TableCell>
                                    <TableCell className="text-[10px] font-bold text-[#2D5A4C] uppercase">{catalogs.subcategorias.find((s: any) => s.id === t.subcategoria_especifica)?.nombre || '-'}</TableCell>
                                    <TableCell className="text-[10px] font-bold">{t.responsable}</TableCell>
                                    <TableCell className="text-right font-bold text-sm px-6">{money(t.monto)}</TableCell>
                                    <TableCell className="text-center px-2">
                                        <div className="flex items-center justify-center gap-1">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => onEditTransaction(t)}>Editar</DropdownMenuItem><DropdownMenuItem className="text-destructive" onClick={() => onDeleteTransaction(t.id)}>Eliminar</DropdownMenuItem></DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}

// VISTA DE PRESUPUESTOS
function BudgetsView({ transactions, catalogs }: any) {
    const budgetStats = React.useMemo(() => {
        return catalogs.macros.map((cat: any) => {
            const spent = transactions
                .filter((t: any) => t.categoria_macro === cat.id && ['GASTO', 'COMPRA'].includes(t.tipo_transaccion))
                .reduce((acc: number, curr: any) => acc + (Number(curr.monto) || 0), 0);
            return { name: cat.nombre, spent, budget: 0, available: 0 };
        });
    }, [transactions, catalogs]);

    return (
        <div className="space-y-10">
            <div className="flex items-center justify-between"><h2 className="text-2xl font-black uppercase tracking-tight text-slate-800">METAS PRESUPUESTARIAS</h2><Button className="bg-[#2D5A4C] font-bold h-11 px-6 rounded-xl shadow-sm"><Plus className="mr-2 h-4 w-4" /> Nuevo Presupuesto</Button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {budgetStats.map((item: any) => (
                    <Card key={item.name} className="border-none shadow-sm bg-white overflow-hidden rounded-2xl p-6">
                        <div className="flex justify-between items-center mb-4"><span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{item.name}</span><Badge variant="secondary" className="bg-slate-50 text-slate-500 font-black text-[10px]">0%</Badge></div>
                        <div className="mb-6"><h3 className="text-3xl font-black text-slate-900">{money(item.spent)}</h3></div>
                        <div className="space-y-3"><div className="flex justify-between items-end text-[9px] font-black uppercase tracking-tighter"><span className="text-slate-400">CONSUMO</span><span className="text-slate-500">META: $0.00</span></div><Progress value={0} className="h-2 bg-slate-100" /></div>
                    </Card>
                ))}
            </div>
            
            <Card className="border-none shadow-sm bg-white overflow-hidden rounded-[24px]">
                <CardHeader className="flex flex-row items-center gap-4 bg-muted/5 border-b"><FileText className="h-6 w-6 text-primary" /><div><CardTitle className="text-lg font-black uppercase tracking-tight">Seguimiento de Presupuestos</CardTitle><CardDescription className="text-xs font-bold uppercase">Auditoría detallada de ejecución por categoría macro.</CardDescription></div></CardHeader>
                <div className="table-responsive"><Table><TableHeader className="bg-slate-50/50"><TableRow><TableHead className="font-black text-[10px] uppercase">Categoría</TableHead><TableHead className="font-black text-[10px] uppercase text-right">Presupuesto</TableHead><TableHead className="font-black text-[10px] uppercase text-right">Ejecutado</TableHead><TableHead className="font-black text-[10px] uppercase text-right">Disponible</TableHead><TableHead className="font-black text-[10px] uppercase">Estado</TableHead></TableRow></TableHeader><TableBody>{budgetStats.map((item: any) => (<TableRow key={item.name} className="h-14"><TableCell className="font-bold text-xs uppercase">{item.name}</TableCell><TableCell className="text-right font-medium text-slate-400">$0.00</TableCell><TableCell className="text-right font-black text-[#2D5A4C]">{money(item.spent)}</TableCell><TableCell className="text-right font-black">$0.00</TableCell><TableCell className="w-[150px]"><Progress value={0} className="h-1.5" /></TableCell></TableRow>))}</TableBody></Table></div>
            </Card>
        </div>
    );
}

// PANTALLA 1: MÓDULO DE CONFIGURACIÓN DE CATÁLOGOS (CRUD COMPLETO)
function SettingsView({ catalogs, biConfig, setBiConfig, onRefresh }: any) {
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<any>(null);
    const [activeTab, setActiveTab] = React.useState('impactos');
    const [formData, setFormData] = React.useState({ nombre: '', parentId: '' });
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const tablesMap: Record<string, string> = {
        impactos: 'cat_tipo_gasto_impacto',
        areas: 'cat_area_funcional',
        macros: 'cat_categoria_macro',
        categorias: 'cat_categoria',
        subcategorias: 'cat_subcategoria'
    };

    const handleOpenDialog = (item: any = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({ 
                nombre: item.nombre, 
                parentId: (activeTab === 'categorias' ? item.categoria_macro_id : item.categoria_id)?.toString() || '' 
            });
        } else {
            setEditingItem(null);
            setFormData({ nombre: '', parentId: '' });
        }
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.nombre || !supabase) return;
        setIsSubmitting(true);
        try {
            const tableName = tablesMap[activeTab];
            const payload: any = { nombre: formData.nombre, activo: true };
            
            if (activeTab === 'categorias') {
                if (!formData.parentId) throw new Error("Debe seleccionar una Macro.");
                payload.categoria_macro_id = Number(formData.parentId);
            } else if (activeTab === 'subcategorias') {
                if (!formData.parentId) throw new Error("Debe seleccionar una Categoría.");
                payload.categoria_id = Number(formData.parentId);
            }

            let error;
            if (editingItem) {
                const { error: err } = await supabase.from(tableName).update(payload).eq('id', editingItem.id);
                error = err;
            } else {
                const { error: err } = await supabase.from(tableName).insert([payload]);
                error = err;
            }

            if (error) throw error;
            toast({ title: "Éxito", description: `Registro ${editingItem ? 'actualizado' : 'creado'} correctamente.` });
            setIsDialogOpen(false);
            onRefresh();
        } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
        finally { setIsSubmitting(false); }
    };

    const handleToggleStatus = async (item: any) => {
        if (!supabase) return;
        try {
            const { error } = await supabase.from(tablesMap[activeTab]).update({ activo: !item.activo }).eq('id', item.id);
            if (error) throw error;
            toast({ title: "Éxito", description: "Estado actualizado." });
            onRefresh();
        } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    };

    const currentList = catalogs[activeTab] || [];

    return (
        <div className="space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="flex flex-row items-center gap-4 border-b bg-muted/5">
                        <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500"><SlidersHorizontal className="h-5 w-5" /></div>
                        <div><CardTitle className="text-lg font-black uppercase tracking-tight">Gestión de Catálogos Relacionales</CardTitle><CardDescription>CRUD de bases maestras para la auditoría técnica.</CardDescription></div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <div className="px-8 pt-6 border-b bg-slate-50/50 flex justify-between items-end">
                                <TabsList className="bg-transparent h-12 gap-6">
                                    {['impactos', 'areas', 'macros', 'categorias', 'subcategorias'].map(tab => (
                                        <TabsTrigger key={tab} value={tab} className="font-black uppercase text-[10px] border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-12">{tab}</TabsTrigger>
                                    ))}
                                </TabsList>
                                <Button onClick={() => handleOpenDialog()} className="mb-3 bg-[#2D5A4C] h-9 text-[10px] font-black uppercase"><Plus className="mr-2 h-4 w-4" /> Agregar Nuevo</Button>
                            </div>

                            {['impactos', 'areas', 'macros', 'categorias', 'subcategorias'].map(tab => (
                                <TabsContent key={tab} value={tab} className="mt-0">
                                    <ScrollArea className="h-[400px]">
                                        <Table>
                                            <TableHeader className="bg-slate-50 sticky top-0 z-10"><TableRow><TableHead className="font-black text-[10px] uppercase px-8">ID</TableHead><TableHead className="font-black text-[10px] uppercase">Nombre</TableHead>{(tab === 'categorias' || tab === 'subcategorias') && <TableHead className="font-black text-[10px] uppercase">Relación</TableHead>}<TableHead className="font-black text-[10px] uppercase">Estado</TableHead><TableHead className="w-20"></TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {(catalogs[tab] || []).map((item: any) => (
                                                    <TableRow key={item.id} className={cn("h-14", !item.activo && "opacity-50")}>
                                                        <TableCell className="px-8 font-mono text-xs text-slate-400">#{item.id}</TableCell>
                                                        <TableCell className="font-bold text-xs uppercase">{item.nombre}</TableCell>
                                                        {tab === 'categorias' && <TableCell><Badge variant="outline" className="text-[9px] uppercase">{catalogs.macros.find((m: any) => m.id === item.categoria_macro_id)?.nombre || '-'}</Badge></TableCell>}
                                                        {tab === 'subcategorias' && <TableCell><Badge variant="outline" className="text-[9px] uppercase">{catalogs.categorias.find((c: any) => c.id === item.categoria_id)?.nombre || '-'}</Badge></TableCell>}
                                                        <TableCell><Badge variant={item.activo ? 'default' : 'secondary'} className="text-[8px] uppercase">{item.activo ? 'Activo' : 'Inactivo'}</Badge></TableCell>
                                                        <TableCell>
                                                            <div className="flex gap-1">
                                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleToggleStatus(item)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                </TabsContent>
                            ))}
                        </Tabs>
                    </CardContent>
                </Card>

                <div className="space-y-8">
                    <Card className="border-none shadow-sm bg-white overflow-hidden">
                        <CardHeader className="flex flex-row items-center gap-3 bg-[#F0FDF4]/50 border-b"><Hammer className="h-4 w-4 text-[#2D5A4C]" /><CardTitle className="text-[10px] font-black uppercase tracking-widest text-[#2D5A4C]">Nómina Mixta</CardTitle></CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-4">
                                {biConfig.payrollTemplate.map((item: any) => (
                                    <div key={item.canal} className="space-y-1.5"><div className="flex justify-between text-[10px] font-black uppercase"><span>{item.label}</span><span>{item.porcentaje}%</span></div><Progress value={item.porcentaje} className="h-1.5" /></div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-lg bg-[#24483D] text-white overflow-hidden">
                        <CardContent className="p-8 space-y-4"><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-widest text-white/60">Salud BI</p><CheckCircle2 className="h-4 w-4 text-emerald-400" /></div><h3 className="text-3xl font-black">Arquitectura Activa</h3><p className="text-xs text-white/70 leading-relaxed font-medium">Relaciones de 5 niveles optimizadas para el análisis técnico profundo.</p></CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md rounded-[32px]">
                    <DialogHeader><DialogTitle className="text-2xl font-black uppercase tracking-tighter">{editingItem ? 'Editar' : 'Añadir'} Registro</DialogTitle><DialogDescription>Gestione la base maestra para {activeTab}.</DialogDescription></DialogHeader>
                    <div className="py-6 space-y-6">
                        <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Nombre</Label><Input value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} placeholder="Ej: Nueva Categoría" className="h-12 border-slate-100 rounded-xl" /></div>
                        
                        {activeTab === 'categorias' && (
                            <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Macro Vinculada (Obligatorio)</Label>
                                <Select value={formData.parentId} onValueChange={(v) => setFormData({...formData, parentId: v})}>
                                    <SelectTrigger className="h-12 border-slate-100 rounded-xl"><SelectValue placeholder="Seleccionar Macro..." /></SelectTrigger>
                                    <SelectContent>{catalogs.macros.map((m: any) => <SelectItem key={m.id} value={m.id.toString()}>{m.nombre}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        )}

                        {activeTab === 'subcategorias' && (
                            <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Categoría Vinculada (Obligatorio)</Label>
                                <Select value={formData.parentId} onValueChange={(v) => setFormData({...formData, parentId: v})}>
                                    <SelectTrigger className="h-12 border-slate-100 rounded-xl"><SelectValue placeholder="Seleccionar Categoría..." /></SelectTrigger>
                                    <SelectContent>{catalogs.categorias.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter><Button onClick={handleSave} disabled={isSubmitting || !formData.nombre || ((activeTab === 'categorias' || activeTab === 'subcategorias') && !formData.parentId)} className="w-full h-12 bg-slate-900 rounded-xl font-black uppercase text-xs">Confirmar Operación</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}