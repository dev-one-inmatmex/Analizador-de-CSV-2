
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
  Search, Filter, Activity,
  PieChart as PieChartIcon, Target, TrendingUp, Hammer, Save, CalendarDays, FileText,
  SlidersHorizontal, CheckCircle2, ChevronLeft, ChevronRight, Info, Eye, Download,
  ExternalLink,
  FileDown
} from 'lucide-react';
import { 
  Bar as RechartsBar, BarChart as RechartsBarChart, CartesianGrid, Legend, Pie, PieChart, 
  ResponsiveContainer, Tooltip, XAxis, YAxis, Cell as RechartsCell, ComposedChart, Line, Area
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { 
    expenseFormSchema, 
    TransactionFormValues,
    EMPRESAS,
    TIPOS_TRANSACCION,
    CANALES_ASOCIADOS,
    METODOS_PAGO
} from './schemas';

import { addExpenseAction, updateExpenseAction, deleteExpenseAction } from './actions';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
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

// FORMULARIO DE TRANSACCIÓN CON TRIPLE CASCADA
function TransactionForm({ transaction, onSubmit, catalogs }: any) {
    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(expenseFormSchema),
        defaultValues: transaction ? {
            ...transaction,
            fecha: parseISO(transaction.fecha),
            monto: Number(transaction.monto),
            empresa: transaction.empresa,
            tipo_transaccion: transaction.tipo_transaccion,
            tipo_gasto_impacto: transaction.tipo_gasto_impacto,
            area_funcional: transaction.area_funcional,
            categoria_macro: transaction.categoria_macro,
            categoria: transaction.categoria,
            subcategoria_especifica: transaction.subcategoria_especifica,
            canal_asociado: transaction.canal_asociado || 'GENERAL',
            responsable: transaction.responsable || '',
            descripcion: transaction.descripcion || '',
            notas: transaction.notas || '',
            es_fijo: transaction.es_fijo || false,
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
            es_fijo: false,
            es_recurrente: false,
            metodo_pago: '',
            responsable: '',
            descripcion: '',
            notas: '',
            es_nomina_mixta: false
        }
    });

    const watchedMacro = useWatch({ control: form.control, name: 'categoria_macro' });
    const watchedCat = useWatch({ control: form.control, name: 'categoria' });
    const currentImpactId = useWatch({ control: form.control, name: 'tipo_gasto_impacto' });

    const isNomina = React.useMemo(() => {
        const impact = catalogs.impactos.find((i: any) => i.id === currentImpactId);
        return impact?.nombre?.toUpperCase().includes('NOMINA');
    }, [catalogs.impactos, currentImpactId]);

    const filteredCategories = React.useMemo(() => {
        if (!watchedMacro) return [];
        return catalogs.categorias.filter((c: any) => c.categoria_macro_id === watchedMacro);
    }, [catalogs.categorias, watchedMacro]);

    const filteredSubs = React.useMemo(() => {
        if (!watchedCat) return [];
        return catalogs.subcategorias.filter((s: any) => s.categoria_id === watchedCat);
    }, [catalogs.subcategorias, watchedCat]);

    React.useEffect(() => {
        if (watchedMacro && !transaction) {
            form.setValue('categoria', undefined as any);
            form.setValue('subcategoria_especifica', undefined as any);
        }
    }, [watchedMacro, form, transaction]);

    React.useEffect(() => {
        if (watchedCat && !transaction) {
            form.setValue('subcategoria_especifica', undefined as any);
        }
    }, [watchedCat, form, transaction]);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black uppercase tracking-tighter">{transaction ? 'Editar Registro' : 'Nueva Transacción'}</DialogTitle>
                    <DialogDescription className="text-xs font-bold uppercase">Clasifica el movimiento siguiendo la arquitectura jerárquica de 5 niveles.</DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="fecha" render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel className="text-[10px] font-bold uppercase">Fecha</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl><Button variant="outline" className={cn("h-11 pl-3 text-left font-normal border-slate-200 rounded-xl", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar</span>}<CalendarDays className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="empresa" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase">Empresa</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                                <FormControl><SelectTrigger className="h-11 border-slate-200 rounded-xl"><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{EMPRESAS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="tipo_transaccion" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase">Tipo</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                                <FormControl><SelectTrigger className="h-11 border-slate-200 rounded-xl"><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{TIPOS_TRANSACCION.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="monto" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase">Monto ($)</FormLabel>
                            <FormControl><Input {...field} type="number" step="0.01" className="h-11 border-slate-200 rounded-xl font-bold" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="tipo_gasto_impacto" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase">Impacto (Fase 1)</FormLabel>
                            <Select onValueChange={v => field.onChange(Number(v))} value={field.value?.toString()}>
                                <FormControl><SelectTrigger className="h-11 border-slate-200 rounded-xl"><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{catalogs.impactos.map((i: any) => <SelectItem key={i.id} value={i.id.toString()}>{i.nombre}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="area_funcional" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase">Área Funcional (Fase 2)</FormLabel>
                            <Select onValueChange={v => field.onChange(Number(v))} value={field.value?.toString()}>
                                <FormControl><SelectTrigger className="h-11 border-slate-200 rounded-xl"><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{catalogs.areas.map((a: any) => <SelectItem key={a.id} value={a.id.toString()}>{a.nombre}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="categoria_macro" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase">Macro (Nivel 1)</FormLabel>
                            <Select onValueChange={v => field.onChange(Number(v))} value={field.value?.toString()}>
                                <FormControl><SelectTrigger className="h-11 border-slate-200 rounded-xl"><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{catalogs.macros.map((m: any) => <SelectItem key={m.id} value={m.id.toString()}>{m.nombre}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="categoria" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase">Categoría (Nivel 2)</FormLabel>
                            <Select onValueChange={v => field.onChange(Number(v))} value={field.value?.toString()} disabled={!watchedMacro}>
                                <FormControl><SelectTrigger className="h-11 border-slate-200 rounded-xl"><SelectValue placeholder={watchedMacro ? "Seleccionar" : "Elija Macro primero"} /></SelectTrigger></FormControl>
                                <SelectContent>{filteredCategories.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="subcategoria_especifica" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase">Subcategoría (Nivel 3)</FormLabel>
                            <Select onValueChange={v => field.onChange(Number(v))} value={field.value?.toString()} disabled={!watchedCat}>
                                <FormControl><SelectTrigger className="h-11 border-slate-200 rounded-xl"><SelectValue placeholder={watchedCat ? "Seleccionar" : "Elija Categoría primero"} /></SelectTrigger></FormControl>
                                <SelectContent>{filteredSubs.map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>{s.nombre}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="canal_asociado" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase">Canal Asociado</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                                <FormControl><SelectTrigger className="h-11 border-slate-200 rounded-xl"><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{CANALES_ASOCIADOS.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="responsable" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-bold uppercase">Responsable</FormLabel><FormControl><Input {...field} value={field.value ?? ''} className="h-11 border-slate-200 rounded-xl" /></FormControl><FormMessage /></FormItem>
                    )} />

                    <FormField control={form.control} name="metodo_pago" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase">Pago</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                                <FormControl><SelectTrigger className="h-11 border-slate-200 rounded-xl"><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{METODOS_PAGO.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>

                <div className="flex gap-4">
                    <FormField control={form.control} name="es_fijo" render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><Switch checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                            <FormLabel className="text-[10px] font-black uppercase">Gasto Fijo</FormLabel>
                        </FormItem>
                    )} />
                    {isNomina && !transaction && (
                        <FormField control={form.control} name="es_nomina_mixta" render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                <FormLabel className="text-primary font-black uppercase text-[10px]">Nómina Mixta BI</FormLabel>
                            </FormItem>
                        )} />
                    )}
                </div>

                <FormField control={form.control} name="descripcion" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-bold uppercase">Descripción</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} className="border-slate-200 rounded-xl" /></FormControl><FormMessage /></FormItem>
                )} />

                <DialogFooter><Button type="submit" className="w-full h-12 bg-[#2D5A4C] hover:bg-[#24483D] font-black uppercase text-xs rounded-xl shadow-lg"><Save className="mr-2 h-4 w-4" /> Guardar Registro</Button></DialogFooter>
            </form>
        </Form>
    );
}

export default function OperationsPage() {
    const [currentView, setCurrentView] = React.useState<'inicio' | 'informes' | 'presupuestos' | 'configuracion'>('inicio');
    const [transactions, setTransactions] = React.useState<gastos_diarios[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingTransaction, setEditingTransaction] = React.useState<gastos_diarios | null>(null);
    const [currentDate, setCurrentDate] = React.useState<Date>(new Date());
    const [isClient, setIsClient] = React.useState(false);

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
                supabase.from('cat_tipos_gasto_impacto').select('*').order('nombre'),
                supabase.from('cat_areas_funcionales').select('*').order('nombre'),
                supabase.from('cat_categorias_macro').select('*').order('nombre'),
                supabase.from('cat_categorias').select('*').order('nombre'),
                supabase.from('cat_subcategorias').select('*').order('nombre')
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

            if (isNominaImpact && finalValues.es_nomina_mixta && !editingTransaction) {
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
                    <Button size="sm" className="bg-[#2D5A4C] hover:bg-[#24483D] font-bold h-9 shadow-sm" onClick={() => { setEditingTransaction(null); setIsFormOpen(true); }}><Plus className="mr-1.5 h-4 w-4" /> Nueva</Button>
                </div>
            </header>

            <div className="bg-white border-b px-4 py-3 sm:px-6">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <Select value={periodType} onValueChange={(v: any) => setPeriodType(v)}>
                            <SelectTrigger className="h-8 w-[160px] text-xs font-bold uppercase border-slate-200"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="day" className="text-xs font-bold uppercase">Día Seleccionado</SelectItem>
                                <SelectItem value="month" className="text-xs font-bold uppercase">Mes Actual</SelectItem>
                                <SelectItem value="six_months" className="text-xs font-bold uppercase">Semestre (6 Meses)</SelectItem>
                                <SelectItem value="year" className="text-xs font-bold uppercase">Año Fiscal</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1 ml-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100" onClick={() => {
                                let interval = { months: -1 };
                                if (periodType === 'six_months') interval = { months: -6 };
                                if (periodType === 'year') interval = { years: -1 };
                                if (periodType === 'day') interval = { days: -1 };
                                setCurrentDate(prev => add(prev, interval));
                            }}><ChevronLeft className="h-4 w-4" /></Button>
                            <Button variant="outline" size="sm" className="h-8 text-[9px] font-bold uppercase border-slate-200 px-3" onClick={() => setCurrentDate(startOfDay(new Date()))}>Hoy</Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100" onClick={() => {
                                let interval = { months: 1 };
                                if (periodType === 'six_months') interval = { months: 6 };
                                if (periodType === 'year') interval = { years: 1 };
                                if (periodType === 'day') interval = { days: 1 };
                                setCurrentDate(prev => add(prev, interval));
                            }}><ChevronRight className="h-4 w-4" /></Button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <Select value={filterCompany} onValueChange={setFilterCompany}>
                            <SelectTrigger className="h-8 w-[130px] text-xs font-bold uppercase border-slate-200"><SelectValue placeholder="Empresa" /></SelectTrigger>
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
                <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-[32px] border-none shadow-2xl">
                    <TransactionForm transaction={editingTransaction} onSubmit={handleSave} catalogs={catalogs} />
                </DialogContent>
            </Dialog>
        </div>
    );
}

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
                    else if (['cfe', 'agua', 'internet', 'teléfono'].some(s => subName.includes(s) || desc.includes(s))) rubrosFijos.servicios += monto;
                    else if (['software', 'saas', 'shopify', 'suscripción'].some(s => subName.includes(s) || desc.includes(s))) rubrosFijos.software += monto;
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
                <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
                    <CardHeader className="pb-2"><p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Balance del Periodo</p></CardHeader>
                    <CardContent className="flex items-center justify-between pt-2">
                        <div className="h-[140px] w-[140px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={[{ name: 'Ingresos', value: stats.totalIncome }, { name: 'Gastos', value: stats.totalExpense }]} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                                        <RechartsCell fill="#3b82f6" stroke="none" /><RechartsCell fill="#f43f5e" stroke="none" />
                                    </Pie>
                                    <Tooltip formatter={(v: number) => money(v)} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="text-right space-y-1 pr-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Balance Neto</p>
                            <p className={cn("text-3xl font-black tabular-nums", stats.balance >= 0 ? "text-[#2D5A4C]" : "text-destructive")}>{money(stats.balance)}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white rounded-2xl">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <div className="space-y-1"><p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Gasto Fijo Real</p><CardTitle className="text-3xl font-black text-[#2D5A4C] tabular-nums">{money(stats.fixedCosts)}</CardTitle></div>
                        <Target className="h-6 w-6 text-[#2D5A4C] opacity-20" />
                    </CardHeader>
                    <CardContent className="pt-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100"><p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Meta Supervivencia</p><p className="text-xs font-black text-slate-700">{money(stats.meta)}</p></div>
                            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100"><p className="text-[8px] font-black uppercase text-emerald-600 tracking-widest">Ingresos Actuales</p><p className="text-xs font-black text-[#2D5A4C]">{money(stats.totalIncome)}</p></div>
                        </div>
                        <div className="mt-6 space-y-2"><div className="flex justify-between text-[10px] font-black uppercase tracking-widest"><span>Progreso de Meta</span><span className="text-[#2D5A4C]">{stats.progreso.toFixed(0)}%</span></div><Progress value={stats.progreso} className="h-2 bg-slate-100" /></div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white overflow-hidden rounded-2xl">
                    <CardHeader className="pb-2"><p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">ESTRUCTURA DEL GASTO FIJO</p></CardHeader>
                    <CardContent className="h-[180px] p-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart data={[{ name: 'Nómina', value: stats.rubrosFijos.nomina }, { name: 'Renta', value: stats.rubrosFijos.renta }, { name: 'Servicios', value: stats.rubrosFijos.servicios }, { name: 'Software', value: stats.rubrosFijos.software }]} layout="vertical" margin={{ left: 20, right: 40, top: 20, bottom: 20 }}>
                                <XAxis type="number" hide /><YAxis dataKey="name" type="category" fontSize={11} width={80} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 800}} />
                                <Tooltip formatter={(v: number) => money(v)} cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '12px', border: 'none'}} /><RechartsBar dataKey="value" fill="#2D5A4C" radius={[0, 4, 4, 0]} barSize={18} />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-sm overflow-hidden bg-white rounded-2xl">
                <div className="flex items-center justify-between px-8 py-4 border-b bg-slate-50/50"><div className="flex flex-col"><span className="text-[10px] uppercase font-black text-[#2D5A4C] tracking-widest">Calendario de Actividad</span><span className="text-lg font-black uppercase text-slate-800">{format(currentDate, 'MMMM yyyy', { locale: es })}</span></div></div>
                <div className="flex items-center px-2 py-6">
                    <ScrollArea className="flex-1" viewportRef={scrollContainerRef}>
                        <div className="flex gap-3 px-6 pb-2">
                            {eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) }).map((day, i) => (
                                <button key={i} onClick={() => setCurrentDate(day)} className={cn("flex flex-col items-center justify-center min-w-[60px] h-20 rounded-2xl transition-all duration-300", isSameDay(day, currentDate) ? "bg-[#2D5A4C] text-white shadow-xl scale-105" : "hover:bg-slate-50 text-slate-400 font-bold")}>
                                    <span className="text-[10px] uppercase font-black opacity-60 mb-1">{format(day, 'eee', { locale: es }).substring(0, 3)}</span>
                                    <span className="text-xl font-black">{format(day, 'd')}</span>
                                </button>
                            ))}
                        </div><ScrollBar orientation="horizontal" className="invisible" />
                    </ScrollArea>
                </div>
            </Card>

            <Card className="border-none shadow-sm p-8 bg-white overflow-hidden rounded-2xl">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3"><Activity className="h-6 w-6 text-[#2D5A4C]" /> Flujo de Caja Mensual</CardTitle>
                        <p className="text-xs font-bold uppercase text-slate-400 mt-1">Comparativa diaria de ingresos vs egresos operativos.</p>
                    </div>
                </div>
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={barChartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" fontSize={10} axisLine={false} tick={{fill: '#94a3b8', fontWeight: 700}} />
                            <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v/1000}k`} tick={{fill: '#94a3b8', fontWeight: 700}} />
                            <Tooltip 
                                formatter={(v: number) => money(v)} 
                                contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} 
                                cursor={{fill: '#f8fafc'}}
                            />
                            <Legend verticalAlign="top" align="right" height={40} iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em'}} />
                            <RechartsBar dataKey="Ingresos" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={22} onClick={(data) => setSelectedDayData({ day: format(data.payload.fullDate, 'eee d MMMM', { locale: es }), records: data.payload.records.filter((r: any) => ['INGRESO', 'VENTA'].includes(r.tipo_transaccion)), title: 'Ingresos' })} />
                            <RechartsBar dataKey="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={22} onClick={(data) => setSelectedDayData({ day: format(data.payload.fullDate, 'eee d MMMM', { locale: es }), records: data.payload.records.filter((r: any) => ['GASTO', 'COMPRA'].includes(r.tipo_transaccion)), title: 'Gastos' })} />
                        </RechartsBarChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <Dialog open={!!selectedDayData} onOpenChange={() => setSelectedDayData(null)}>
                <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col rounded-[40px] border-none shadow-2xl p-0 overflow-hidden bg-white">
                    <div className="px-10 py-8 border-b bg-slate-50/50">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-3 text-3xl font-black uppercase tracking-tighter">
                                <Activity className="h-8 w-8 text-[#2D5A4C]" /> Auditoría de {selectedDayData?.title}: {selectedDayData?.day}
                            </DialogTitle>
                            <DialogDescription className="text-xs font-bold uppercase text-slate-400">Listado detallado de movimientos registrados en esta jornada.</DialogDescription>
                        </DialogHeader>
                    </div>
                    <ScrollArea className="flex-1 px-6 py-4">
                        <Table>
                            <TableHeader><TableRow className="border-b border-slate-100 h-14 bg-slate-50/30">
                                <TableHead className="font-black text-[10px] uppercase px-6">Concepto Técnico</TableHead>
                                <TableHead className="font-black text-[10px] uppercase px-6">Canal / Fuente</TableHead>
                                <TableHead className="font-black text-[10px] uppercase px-6">Categoría</TableHead>
                                <TableHead className="text-right font-black text-[10px] uppercase px-6 pr-10">Monto Final</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                                {selectedDayData?.records.map((r: any) => (
                                    <TableRow key={r.id} className="h-16 hover:bg-slate-50/50 transition-colors border-slate-50">
                                        <TableCell className="px-6"><div className="font-black text-xs uppercase text-slate-800">{catalogs.subcategorias.find((s: any) => s.id === r.subcategoria_especifica)?.nombre || '-'}</div></TableCell>
                                        <TableCell className="px-6 text-[10px] font-black uppercase text-slate-400">{String(r.canal_asociado || '-').replace(/_/g, ' ')}</TableCell>
                                        <TableCell className="px-6"><Badge variant="secondary" className="text-[8px] font-black uppercase px-2 py-0.5 bg-slate-100 text-slate-500 border-none">{r.tipo_transaccion}</Badge></TableCell>
                                        <TableCell className="text-right font-black text-sm px-6 pr-10 text-[#2D5A4C]">{money(r.monto)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                    <div className="p-8 border-t bg-slate-50 flex justify-end">
                        <Button variant="outline" onClick={() => setSelectedDayData(null)} className="h-11 px-8 font-black uppercase text-[10px] rounded-xl border-slate-200">Cerrar Visor</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function ReportsView({ transactions, isLoading, onEditTransaction, onDeleteTransaction, catalogs, biConfig, periodType }: any) {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [viewDetail, setViewDetail] = React.useState<any>(null);
    const periodLabel = periodType === 'month' ? 'Mensual' : periodType === 'year' ? 'Anual' : periodType === 'six_months' ? 'Semestral' : 'Diario';

    const downloadPDF = (t: any) => {
        const doc = new jsPDF();
        const macroName = catalogs.macros.find((m: any) => m.id === t.categoria_macro)?.nombre || '-';
        const catName = catalogs.categorias.find((c: any) => c.id === t.categoria)?.nombre || '-';
        const subName = catalogs.subcategorias.find((s: any) => s.id === t.subcategoria_especifica)?.nombre || '-';
        const areaName = catalogs.areas.find((a: any) => a.id === t.area_funcional)?.nombre || '-';
        const impactName = catalogs.impactos.find((i: any) => i.id === t.tipo_gasto_impacto)?.nombre || '-';

        doc.setFontSize(20);
        doc.setTextColor(45, 90, 76);
        doc.text('COMPROBANTE DE MOVIMIENTO', 105, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generado el: ${new Date().toLocaleString()}`, 195, 10, { align: 'right' });

        doc.setDrawColor(200);
        doc.line(20, 25, 190, 25);

        autoTable(doc, {
            startY: 35,
            theme: 'striped',
            headStyles: { fillColor: [45, 90, 76], textColor: [255, 255, 255] },
            body: [
                ['ID REGISTRO', `#${t.id}`],
                ['FECHA', t.fecha],
                ['EMPRESA', t.empresa],
                ['TIPO', t.tipo_transaccion],
                ['MONTO', money(t.monto)],
                ['RESPONSABLE', t.responsable || '-'],
                ['CANAL', String(t.canal_asociado || '-').replace(/_/g, ' ')],
                ['ESTADO', t.es_fijo ? 'GASTO FIJO' : 'GASTO VARIABLE'],
            ],
        });

        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text('CLASIFICACIÓN TÉCNICA', 20, (doc as any).lastAutoTable.finalY + 15);

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 20,
            theme: 'plain',
            body: [
                ['IMPACTO (FASE 1)', impactName],
                ['ÁREA FUNCIONAL (FASE 2)', areaName],
                ['MACRO (NIVEL 1)', macroName],
                ['CATEGORÍA (NIVEL 2)', catName],
                ['SUBCATEGORÍA (NIVEL 3)', subName],
            ],
        });

        if (t.descripcion || t.notas) {
            doc.text('OBSERVACIONES', 20, (doc as any).lastAutoTable.finalY + 15);
            doc.setFontSize(10);
            doc.setTextColor(80);
            const obsText = `Descripción: ${t.descripcion || 'Sin descripción'}\nNotas: ${t.notas || 'Sin notas'}`;
            doc.text(obsText, 20, (doc as any).lastAutoTable.finalY + 22, { maxWidth: 170 });
        }

        doc.save(`movimiento_${t.id}_${t.fecha}.pdf`);
    };

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
        const macro = catalogs.macros.find((m: any) => m.id === t.categoria_macro)?.nombre || '';
        const resp = t.responsable || '';
        return [sub, macro, resp, t.id?.toString()].some(str => str?.toLowerCase().includes(searchQuery.toLowerCase()));
    });

    return (
        <div className="space-y-8">
            <Card className="border-none shadow-sm bg-white overflow-hidden rounded-2xl">
                <CardHeader><CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2"><TrendingUp className="h-6 w-6 text-[#2D5A4C]" /> Punto de Equilibrio ({periodLabel})</CardTitle></CardHeader>
                <CardContent className="pt-6">
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={breakevenChart}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" fontSize={10} axisLine={false} tick={{fill: '#94a3b8', fontWeight: 700}} />
                                <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={v => `$${Math.round(v/1000)}k`} tick={{fill: '#94a3b8', fontWeight: 700}} />
                                <Tooltip formatter={(v: number) => money(v)} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />
                                <Legend verticalAlign="top" align="right" height={40} iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 900, textTransform: 'uppercase'}} />
                                <Area type="monotone" dataKey="Ventas" fill="#3b82f6" fillOpacity={0.08} stroke="#3b82f6" strokeWidth={3} name="Ingresos" />
                                <Line type="monotone" dataKey="CostosTotales" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, fill: '#f43f5e' }} name="Costos Totales" />
                                <Line type="monotone" dataKey="CostosFijos" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Base Fija" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white overflow-hidden rounded-[24px]">
                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-8 pt-10 px-10">
                    <div>
                        <CardTitle className="text-2xl font-black uppercase tracking-tighter">Historial de Movimientos</CardTitle>
                        <CardDescription className="text-xs font-bold uppercase text-slate-400 mt-1">Auditoría completa del periodo {periodLabel}.</CardDescription>
                    </div>
                    <div className="relative w-full md:w-80 mt-4 md:mt-0">
                        <Input placeholder="BUSCAR POR CONCEPTO O ID..." className="h-12 pl-5 pr-12 border-slate-100 rounded-2xl bg-slate-50 font-bold uppercase text-[10px] focus:ring-primary/20" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    </div>
                </CardHeader>
                <div className="border-t border-slate-50">
                    <ScrollArea className="w-full">
                        <Table className="min-w-[2800px]">
                            <TableHeader className="bg-slate-50/50">
                                <TableRow className="h-14 border-b-slate-100">
                                    <TableHead className="font-black text-[10px] uppercase text-slate-400 px-6 tracking-widest">ID</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-slate-400 px-6 tracking-widest">FECHA</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-slate-400 px-6 tracking-widest">EMPRESA</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-slate-400 px-6 tracking-widest">TIPO</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-slate-400 px-6 tracking-widest">IMPACTO (F1)</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-slate-400 px-6 tracking-widest">ÁREA (F2)</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-slate-400 px-6 tracking-widest">MACRO (F3)</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-slate-400 px-6 tracking-widest">CATEGORÍA (F4)</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-slate-400 px-6 tracking-widest">SUBCATEGORÍA (F5)</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-slate-400 px-6 tracking-widest">CANAL (F6)</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-slate-400 px-6 tracking-widest">CLASIFICACIÓN (F7)</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-slate-400 px-6 tracking-widest">RESPONSABLE</TableHead>
                                    <TableHead className="text-right font-black text-[10px] uppercase text-slate-400 pr-10 tracking-widest">MONTO</TableHead>
                                    <TableHead className="w-[100px] text-center font-black text-[10px] uppercase text-slate-400 tracking-widest">ACCIONES</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.length > 0 ? filtered.map((t: any) => (
                                    <TableRow key={t.id} className="h-20 hover:bg-slate-50/50 transition-all duration-200 border-slate-50 group">
                                        <TableCell className="px-6 font-mono text-[10px] text-slate-400">#{t.id}</TableCell>
                                        <TableCell className="px-6 text-[10px] font-bold text-slate-600 whitespace-nowrap">{t.fecha}</TableCell>
                                        <TableCell className="px-6"><Badge variant="outline" className="text-[9px] font-black uppercase border-slate-200">{t.empresa}</Badge></TableCell>
                                        <TableCell className="px-6"><Badge variant="secondary" className="text-[9px] font-black uppercase bg-slate-100 text-slate-500 border-none">{t.tipo_transaccion}</Badge></TableCell>
                                        <TableCell className="px-6 text-[10px] font-medium text-slate-500">{catalogs.impactos.find((i: any) => i.id === t.tipo_gasto_impacto)?.nombre || '-'}</TableCell>
                                        <TableCell className="px-6 text-[10px] font-medium text-slate-500">{catalogs.areas.find((a: any) => a.id === t.area_funcional)?.nombre || '-'}</TableCell>
                                        <TableCell className="px-6 font-black text-[11px] uppercase text-[#2D5A4C]">
                                            {catalogs.macros.find((m: any) => m.id === t.categoria_macro)?.nombre || '-'}
                                        </TableCell>
                                        <TableCell className="px-6 font-bold text-[10px] uppercase text-slate-400">
                                            {catalogs.categorias.find((c: any) => c.id === t.categoria)?.nombre || '-'}
                                        </TableCell>
                                        <TableCell className="px-6 font-black text-[11px] uppercase text-[#2D5A4C]">
                                            {catalogs.subcategorias.find((s: any) => s.id === t.subcategoria_especifica)?.nombre || '-'}
                                        </TableCell>
                                        <TableCell className="px-6 text-[10px] font-black uppercase text-slate-400">{String(t.canal_asociado || '-').replace(/_/g, ' ')}</TableCell>
                                        <TableCell className="px-6 text-[10px] font-bold uppercase text-slate-400">{String(t.clasificacion_operativa || '-').replace(/_/g, ' ')}</TableCell>
                                        <TableCell className="px-6 font-black text-[10px] uppercase text-slate-900">{t.responsable || '-'}</TableCell>
                                        <TableCell className="text-right font-black text-base pr-10 tabular-nums text-[#2D5A4C]">{money(t.monto)}</TableCell>
                                        <TableCell className="text-center px-4">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-100 group-hover:scale-110 transition-transform"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-2xl border-slate-100 shadow-2xl p-2 w-48">
                                                    <DropdownMenuItem onClick={() => setViewDetail(t)} className="font-black text-[10px] uppercase cursor-pointer rounded-lg py-2.5"><Eye className="mr-2 h-3.5 w-3.5" /> Ver Detalle</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => downloadPDF(t)} className="font-black text-[10px] uppercase cursor-pointer rounded-lg py-2.5"><FileDown className="mr-2 h-3.5 w-3.5" /> Descargar PDF</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => onEditTransaction(t)} className="font-black text-[10px] uppercase cursor-pointer rounded-lg py-2.5"><Pencil className="mr-2 h-3.5 w-3.5" /> Editar Registro</DropdownMenuItem>
                                                    <DropdownMenuSeparator className="my-1 bg-slate-50" />
                                                    <DropdownMenuItem className="text-destructive font-black text-[10px] uppercase cursor-pointer rounded-lg py-2.5" onClick={() => onDeleteTransaction(t.id)}><Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={14} className="h-80 text-center">
                                            <div className="flex flex-col items-center gap-4 opacity-20">
                                                <FileText className="h-16 w-16" />
                                                <p className="font-black uppercase text-[10px] tracking-[0.2em]">Sin movimientos registrados en este periodo</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </div>
            </Card>

            {/* MODAL DE DETALLE - RÉPLICA DE IMAGEN */}
            <Dialog open={!!viewDetail} onOpenChange={() => setViewDetail(null)}>
                <DialogContent className="max-w-3xl rounded-[32px] border-none shadow-2xl p-0 overflow-hidden bg-white animate-in zoom-in-95 duration-300">
                    <div className="p-10 space-y-10">
                        <DialogHeader>
                            <DialogTitle className="text-3xl font-black uppercase tracking-tighter text-slate-900">Detalle del Movimiento</DialogTitle>
                            <DialogDescription className="text-sm font-bold uppercase text-slate-400 tracking-widest">ID Registro: #{viewDetail?.id}</DialogDescription>
                        </DialogHeader>

                        <div className="grid grid-cols-2 gap-x-12 gap-y-8">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Fecha</p>
                                <p className="text-lg font-black text-slate-800">{viewDetail?.fecha}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Subcategoría</p>
                                <p className="text-lg font-black text-slate-800">{catalogs.subcategorias.find((s: any) => s.id === viewDetail?.subcategoria_especifica)?.nombre || '-'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Empresa</p>
                                <p className="text-lg font-black text-slate-800">{viewDetail?.empresa}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Método</p>
                                <p className="text-lg font-black text-slate-800 uppercase">{viewDetail?.metodo_pago?.replace(/_/g, ' ') || '-'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Monto</p>
                                <p className="text-2xl font-black text-[#2D5A4C]">{money(viewDetail?.monto)}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Banco</p>
                                <p className="text-lg font-black text-slate-800 uppercase">{viewDetail?.banco || '-'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tipo</p>
                                <p className="text-lg font-black text-slate-800">{viewDetail?.tipo_transaccion}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cuenta</p>
                                <p className="text-lg font-black text-slate-800 uppercase">{viewDetail?.cuenta || '-'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Impacto</p>
                                <p className="text-lg font-black text-slate-800">{catalogs.impactos.find((i: any) => i.id === viewDetail?.tipo_gasto_impacto)?.nombre || '-'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Responsable</p>
                                <p className="text-lg font-black text-slate-800">{viewDetail?.responsable || '-'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Área</p>
                                <p className="text-lg font-black text-slate-800">{catalogs.areas.find((a: any) => a.id === viewDetail?.area_funcional)?.nombre || '-'}</p>
                            </div>
                        </div>

                        <Separator className="bg-slate-100" />

                        <div className="space-y-6">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Descripción</p>
                                <p className="text-sm font-medium text-slate-600 leading-relaxed">{viewDetail?.descripcion || '-'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Notas</p>
                                <p className="text-sm font-medium text-slate-600 leading-relaxed italic">{viewDetail?.notas || '-'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="px-10 py-8 border-t bg-slate-50 flex items-center justify-between">
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setViewDetail(null)} className="h-12 px-8 font-black uppercase text-[10px] rounded-xl border-slate-200">Cerrar</Button>
                            <Button variant="outline" onClick={() => downloadPDF(viewDetail)} className="h-12 px-8 font-black uppercase text-[10px] rounded-xl border-slate-200 flex gap-2">
                                <FileDown className="h-4 w-4" /> PDF
                            </Button>
                        </div>
                        <Button 
                            onClick={() => { setViewDetail(null); onEditTransaction(viewDetail); }} 
                            className="h-12 px-8 font-black uppercase text-[10px] rounded-xl bg-[#2D5A4C] hover:bg-[#24483D] shadow-lg shadow-emerald-900/10"
                        >
                            Editar Movimiento
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

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

function SettingsView({ catalogs, biConfig, setBiConfig, onRefresh }: any) {
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<any>(null);
    const [activeTab, setActiveTab] = React.useState('impactos');
    const [formData, setFormData] = React.useState({ nombre: '', parentId: '' });
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const TABLES = {
        impactos: 'cat_tipos_gasto_impacto',
        areas: 'cat_areas_funcionales',
        macros: 'cat_categorias_macro',
        categorias: 'cat_categorias',
        subcategorias: 'cat_subcategorias'
    };

    const handleOpenDialog = (item: any = null) => {
        if (item) {
            setEditingItem(item);
            const parentIdVal = activeTab === 'categorias' ? item.categoria_macro_id : activeTab === 'subcategorias' ? item.categoria_id : '';
            setFormData({ nombre: item.nombre, parentId: parentIdVal?.toString() || '' });
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
            const tableName = TABLES[activeTab as keyof typeof TABLES];
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
            const tableName = TABLES[activeTab as keyof typeof TABLES];
            const { error } = await supabase.from(tableName).update({ activo: !item.activo }).eq('id', item.id);
            if (error) throw error;
            toast({ title: "Éxito", description: "Estado del registro actualizado." });
            onRefresh();
        } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    };

    return (
        <div className="space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 border-none shadow-sm bg-white overflow-hidden rounded-2xl">
                    <CardHeader className="flex flex-row items-center gap-4 border-b bg-muted/5 p-8">
                        <div className="h-12 w-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-[#2D5A4C]"><SlidersHorizontal className="h-6 w-6" /></div>
                        <div><CardTitle className="text-xl font-black uppercase tracking-tight">Gestión de Catálogos Relacionales</CardTitle><CardDescription className="text-xs font-bold uppercase text-slate-400">CRUD de bases maestras para la arquitectura de 5 niveles.</CardDescription></div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <div className="px-8 pt-6 border-b bg-slate-50/50 flex justify-between items-end">
                                <TabsList className="bg-transparent h-12 gap-8">
                                    {['impactos', 'areas', 'macros', 'categorias', 'subcategorias'].map(tab => (
                                        <TabsTrigger key={tab} value={tab} className="font-black uppercase text-[10px] border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-12 px-0 tracking-widest">{tab}</TabsTrigger>
                                    ))}
                                </TabsList>
                                <Button onClick={() => handleOpenDialog()} className="mb-3 bg-[#2D5A4C] hover:bg-[#24483D] h-9 text-[10px] font-black uppercase rounded-xl px-5 shadow-lg"><Plus className="mr-2 h-4 w-4" /> Agregar Nuevo</Button>
                            </div>

                            {['impactos', 'areas', 'macros', 'categorias', 'subcategorias'].map(tab => (
                                <TabsContent key={tab} value={tab} className="mt-0">
                                    <ScrollArea className="h-[450px]">
                                        <Table>
                                            <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b-0"><TableRow className="border-b-0">
                                                <TableHead className="font-black text-[10px] uppercase px-8 py-4 tracking-widest text-slate-400">ID</TableHead>
                                                <TableHead className="font-black text-[10px] uppercase px-8 py-4 tracking-widest text-slate-400">Nombre del Registro</TableHead>
                                                {(tab === 'categorias' || tab === 'subcategorias') && <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Relación Jerárquica</TableHead>}
                                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Estado</TableHead>
                                                <TableHead className="w-32"></TableHead>
                                            </TableRow></TableHeader>
                                            <TableBody>
                                                {(catalogs[tab as keyof typeof catalogs] || []).map((item: any) => (
                                                    <TableRow key={item.id} className={cn("h-16 hover:bg-slate-50/50 transition-colors border-slate-50", !item.activo && "opacity-50 grayscale")}>
                                                        <TableCell className="px-8 font-mono text-[10px] text-slate-400">#{item.id}</TableCell>
                                                        <TableCell className="px-8 font-bold text-xs uppercase text-slate-700">{item.nombre}</TableCell>
                                                        {tab === 'categorias' && <TableCell><Badge variant="outline" className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border-none px-3">{catalogs.macros.find((m: any) => m.id === item.categoria_macro_id)?.nombre || '-'}</Badge></TableCell>}
                                                        {tab === 'subcategorias' && <TableCell><Badge variant="outline" className="text-[9px] font-black uppercase bg-blue-50 text-blue-700 border-none px-3">{catalogs.categorias.find((c: any) => c.id === item.categoria_id)?.nombre || '-'}</Badge></TableCell>}
                                                        <TableCell><Badge variant={item.activo ? 'default' : 'secondary'} className={cn("text-[8px] font-black uppercase px-2 py-0.5", item.activo ? "bg-[#2D5A4C]" : "bg-slate-200")}>{item.activo ? 'Activo' : 'Inactivo'}</Badge></TableCell>
                                                        <TableCell className="pr-8">
                                                            <div className="flex justify-end gap-2">
                                                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-slate-100" onClick={() => handleOpenDialog(item)}><Pencil className="h-4 w-4" /></Button>
                                                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-red-50 text-destructive" onClick={() => handleToggleStatus(item)}><Trash2 className="h-4 w-4" /></Button>
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
                    <Card className="border-none shadow-sm bg-white overflow-hidden rounded-2xl">
                        <CardHeader className="flex flex-row items-center gap-3 bg-[#F0FDF4]/50 border-b p-6"><Hammer className="h-4 w-4 text-[#2D5A4C]" /><CardTitle className="text-[10px] font-black uppercase tracking-widest text-[#2D5A4C]">Configuración Nómina</CardTitle></CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-5">
                                {biConfig.payrollTemplate.map((item: any) => (
                                    <div key={item.canal} className="space-y-2"><div className="flex justify-between text-[10px] font-black uppercase text-slate-500"><span>{item.label}</span><span>{item.porcentaje}%</span></div><Progress value={item.porcentaje} className="h-1.5" /></div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-lg bg-[#2D5A4C] text-white overflow-hidden rounded-2xl">
                        <CardContent className="p-10 space-y-5"><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Salud Financiera BI</p><CheckCircle2 className="h-5 w-5 text-emerald-400" /></div><h3 className="text-3xl font-black leading-tight">Arquitectura Dinámica Activa</h3><p className="text-xs text-white/70 leading-relaxed font-bold uppercase tracking-wide">Relaciones de 5 niveles sincronizadas para el análisis técnico profundo.</p></CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md rounded-[40px] border-none shadow-2xl p-0 overflow-hidden bg-white">
                    <div className="p-10 space-y-8">
                        <DialogHeader>
                            <DialogTitle className="text-3xl font-black uppercase tracking-tighter">{editingItem ? 'Editar' : 'Añadir'} Registro</DialogTitle>
                            <DialogDescription className="text-xs font-bold uppercase text-slate-400">Actualice la base maestra para {activeTab}.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6">
                            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nombre Descriptivo</Label><Input value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} placeholder="Ej: Nueva Categoría" className="h-14 border-slate-100 rounded-2xl bg-slate-50 font-bold px-5" /></div>
                            
                            {activeTab === 'categorias' && (
                                <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Macro Vinculada (Obligatorio)</Label>
                                    <Select value={formData.parentId} onValueChange={(v) => setFormData({...formData, parentId: v})}>
                                        <SelectTrigger className="h-14 border-slate-100 rounded-2xl bg-slate-50 font-bold px-5"><SelectValue placeholder="Seleccionar Macro..." /></SelectTrigger>
                                        <SelectContent className="rounded-xl">{catalogs.macros.map((m: any) => <SelectItem key={m.id} value={m.id.toString()}>{m.nombre}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            )}

                            {activeTab === 'subcategorias' && (
                                <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Categoría Vinculada (Obligatorio)</Label>
                                    <Select value={formData.parentId} onValueChange={(v) => setFormData({...formData, parentId: v})}>
                                        <SelectTrigger className="h-14 border-slate-100 rounded-2xl bg-slate-50 font-bold px-5"><SelectValue placeholder="Seleccionar Categoría..." /></SelectTrigger>
                                        <SelectContent className="rounded-xl">{catalogs.categorias.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="p-8 bg-slate-50 border-t flex gap-4">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="h-14 flex-1 font-black uppercase text-[10px] rounded-2xl border-slate-200">Cancelar</Button>
                        <Button onClick={handleSave} disabled={isSubmitting || !formData.nombre || ((activeTab === 'categorias' || activeTab === 'subcategorias') && !formData.parentId)} className="h-14 flex-1 bg-slate-900 hover:bg-black rounded-2xl font-black uppercase text-[10px] shadow-xl">Confirmar</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
