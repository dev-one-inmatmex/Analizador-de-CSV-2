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
  SlidersHorizontal, CheckCircle2, ChevronLeft, ChevronRight, Target, TrendingUp, Hammer, Info, Eye
} from 'lucide-react';
import { 
  Bar as RechartsBar, BarChart as RechartsBarChart, CartesianGrid, Legend, Pie, PieChart, 
  ResponsiveContainer, Tooltip, XAxis, YAxis, Cell as RechartsCell, ComposedChart, Line, Area
} from 'recharts';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

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
import type { gastos_diarios, cat_tipo_gasto_impacto, cat_area_funcional, cat_categoria_macro, cat_subcategoria } from '@/types/database';
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

function DetailItem({ label, value }: { label: string, value: any }) {
    return (
        <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
            <p className="text-xs font-bold text-slate-700 truncate">{value || '-'}</p>
        </div>
    );
}

// FORMULARIO DE TRANSACCIÓN ACTUALIZADO CON CATÁLOGOS DINÁMICOS Y CASCADA
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
    const currentEmpresa = useWatch({ control: form.control, name: 'empresa' });
    const currentMetodo = useWatch({ control: form.control, name: 'metodo_pago' });
    const currentBanco = useWatch({ control: form.control, name: 'banco' });
    const currentCuenta = useWatch({ control: form.control, name: 'cuenta' });
    const currentImpactId = useWatch({ control: form.control, name: 'tipo_gasto_impacto' });

    // Determinar si es nómina basándose en el nombre del catálogo
    const isNomina = React.useMemo(() => {
        const impact = catalogs.impactos.find((i: any) => i.id === currentImpactId);
        return impact?.nombre?.toUpperCase().includes('NOMINA');
    }, [catalogs.impactos, currentImpactId]);

    // Filtrar subcategorías en cascada
    const filteredSubs = React.useMemo(() => {
        if (!watchedMacro) return [];
        return catalogs.subcategorias.filter((s: any) => s.categoria_macro_id === watchedMacro);
    }, [catalogs.subcategorias, watchedMacro]);

    // Reset de subcategoría al cambiar macro
    React.useEffect(() => {
        if (watchedMacro) {
            const currentSub = form.getValues('subcategoria_especifica');
            const belongs = catalogs.subcategorias.some((s: any) => s.id === currentSub && s.categoria_macro_id === watchedMacro);
            if (!belongs) form.setValue('subcategoria_especifica', undefined as any);
        }
    }, [watchedMacro, catalogs.subcategorias, form]);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <DialogHeader>
                    <DialogTitle>{transaction ? 'Editar Registro' : 'Nueva Transacción'}</DialogTitle>
                    <DialogDescription>Clasifica el movimiento siguiendo la arquitectura de 7 fases.</DialogDescription>
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

                    {currentEmpresa === 'OTRA' && (
                        <FormField control={form.control} name="especificar_empresa" render={({ field }) => (
                            <FormItem><FormLabel>Especificar Empresa</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                        )} />
                    )}

                    <FormField control={form.control} name="tipo_transaccion" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tipo de Transacción</FormLabel>
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

                    <FormField control={form.control} name="categoria_macro" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Categoría Macro (Fase 3)</FormLabel>
                            <Select onValueChange={v => field.onChange(Number(v))} value={field.value?.toString()}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{catalogs.macros.map((m: any) => <SelectItem key={m.id} value={m.id.toString()}>{m.nombre}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="subcategoria_especifica" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Subcategoría (Fase 4)</FormLabel>
                            <Select onValueChange={v => field.onChange(Number(v))} value={field.value?.toString()} disabled={!watchedMacro}>
                                <FormControl><SelectTrigger><SelectValue placeholder={watchedMacro ? "Seleccionar" : "Elija Macro primero"} /></SelectTrigger></FormControl>
                                <SelectContent>{filteredSubs.map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>{s.nombre}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="canal_asociado" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Canal Asociado (Fase 6)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{CANALES_ASOCIADOS.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="clasificacion_operativa" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Atribución (Fase 7)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value ? String(field.value) : undefined}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{CLASIFICACIONES_OPERATIVAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="metodo_pago" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Método de Pago</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{METODOS_PAGO.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    {currentMetodo === 'OTRO' && (
                        <FormField control={form.control} name="especificar_metodo_pago" render={({ field }) => (
                            <FormItem><FormLabel>Especificar Método</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                        )} />
                    )}

                    <FormField control={form.control} name="banco" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Banco</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{BANCOS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    {currentBanco === 'OTRO' && (
                        <FormField control={form.control} name="especificar_banco" render={({ field }) => (
                            <FormItem><FormLabel>Especificar Banco</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                        )} />
                    )}

                    <FormField control={form.control} name="cuenta" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Cuenta</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{CUENTAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    {currentCuenta === 'OTRO' && (
                        <FormField control={form.control} name="especificar_cuenta" render={({ field }) => (
                            <FormItem><FormLabel>Especificar Cuenta</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                        )} />
                    )}

                    <FormField control={form.control} name="responsable" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Responsable</FormLabel>
                            <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>

                <div className="flex gap-4">
                    <FormField control={form.control} name="es_fijo" render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            <FormLabel>Gasto Fijo (Fase 5)</FormLabel>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="es_recurrente" render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            <FormLabel>Recurrente</FormLabel>
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

                <FormField control={form.control} name="notas" render={({ field }) => (
                    <FormItem><FormLabel>Notas</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
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

    // ESTADO PARA CATÁLOGOS DINÁMICOS
    const [catalogs, setCatalogs] = React.useState({
        impactos: [] as cat_tipo_gasto_impacto[],
        areas: [] as cat_area_funcional[],
        macros: [] as cat_categoria_macro[],
        subcategorias: [] as cat_subcategoria[]
    });

    const [periodType, setPeriodType] = React.useState<'day' | 'month' | 'six_months' | 'year' | 'custom'>('month');
    const [filterCompany, setFilterCompany] = React.useState<string>('TODAS');
    const [filterArea, setFilterArea] = React.useState<string>('TODAS');
    const [filterImpact, setFilterImpact] = React.useState<string>('TODOS');

    const [biConfig, setBiConfig] = React.useState({
        contributionMargin: 40,
        historyDays: 180,
        independentUnit: true,
        budgetNotifications: true,
        payrollTemplate: [
            { label: 'Mercado Libre', canal: 'MERCADO_LIBRE', porcentaje: 60, color: '#2D5A4C' },
            { label: 'Mayoreo', canal: 'MAYOREO', porcentaje: 30, color: '#3b82f6' },
            { label: 'Físico', canal: 'FISICO', porcentaje: 10, color: '#f43f5e' }
        ]
    });

    const { toast } = useToast();

    // FETCH DE CATÁLOGOS AL CARGAR
    const fetchCatalogs = React.useCallback(async () => {
        if (!supabase) return;
        try {
            const [imp, ar, mac, sub] = await Promise.all([
                supabase.from('cat_tipo_gasto_impacto').select('*').eq('activo', true).order('nombre'),
                supabase.from('cat_area_funcional').select('*').eq('activo', true).order('nombre'),
                supabase.from('cat_categoria_macro').select('*').eq('activo', true).order('nombre'),
                supabase.from('cat_subcategoria').select('*').eq('activo', true).order('nombre')
            ]);
            setCatalogs({
                impactos: imp.data || [],
                areas: ar.data || [],
                macros: mac.data || [],
                subcategorias: sub.data || []
            });
        } catch (e) {
            console.error('Error fetching catalogs:', e);
        }
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
                case 'month':
                default: start = startOfMonth(currentDate); end = endOfMonth(currentDate); break;
            }

            const allFetched: gastos_diarios[] = [];
            let from = 0;
            const step = 1000;
            let hasMore = true;

            while (hasMore) {
                let query = supabase
                    .from('gastos_diarios')
                    .select('*')
                    .gte('fecha', format(start, 'yyyy-MM-dd'))
                    .lte('fecha', format(end, 'yyyy-MM-dd'));

                if (filterCompany !== 'TODAS') query = query.eq('empresa', filterCompany);
                // Si el filtro no es 'TODAS', necesitamos buscar por ID si se migró también el filtro, 
                // pero por ahora asumimos que los filtros de UI son compatibles con el esquema.
                
                const { data, error } = await query.order('fecha', { ascending: false }).range(from, from + step - 1);
                if (error) throw error;
                if (data && data.length > 0) {
                    allFetched.push(...(data as gastos_diarios[]));
                    if (data.length < step) hasMore = false; else from += step;
                } else hasMore = false;
            }
            setTransactions(allFetched);
        } catch (e: any) {
            toast({ title: "Error", description: "No se pudieron cargar los movimientos.", variant: "destructive" });
        } finally { setIsLoading(false); }
    }, [currentDate, periodType, filterCompany, toast]);

    React.useEffect(() => {
        setIsClient(true);
        fetchCatalogs();
    }, [fetchCatalogs]);

    React.useEffect(() => { 
        if (isClient) fetchAllData(); 
    }, [fetchAllData, isClient]);

    const handleSave = async (values: TransactionFormValues) => {
        try {
            const finalValues = { ...values };
            if (values.empresa === 'OTRA' && values.especificar_empresa) finalValues.empresa = values.especificar_empresa as any;
            if (values.metodo_pago === 'OTRO' && values.especificar_metodo_pago) finalValues.metodo_pago = values.especificar_metodo_pago as any;
            if (values.banco === 'OTRO' && values.especificar_banco) finalValues.banco = values.especificar_banco as any;
            if (values.cuenta === 'OTRO' && values.especificar_cuenta) finalValues.cuenta = values.especificar_cuenta as any;

            let result;
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
                result = { data: "Nómina mixta registrada exitosamente." };
            } else {
                if (editingTransaction && editingTransaction.id) result = await updateExpenseAction(editingTransaction.id, finalValues as any);
                else result = await addExpenseAction(finalValues as any);
            }

            if (result.error) throw new Error(result.error);
            toast({ title: "Éxito", description: result.data || "Guardado correctamente." });
            setIsFormOpen(false); setEditingTransaction(null); fetchAllData();
        } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    };

    if (!isClient) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

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
                            <SelectTrigger className="h-8 w-[160px] text-xs font-bold uppercase"><SelectValue placeholder="Periodo" /></SelectTrigger>
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
                {currentView === 'inicio' && <InsightsView transactions={transactions} isLoading={isLoading} currentDate={currentDate} setCurrentDate={setCurrentDate} catalogs={catalogs} biConfig={biConfig} periodType={periodType} />}
                {currentView === 'informes' && <ReportsView transactions={transactions} isLoading={isLoading} onEditTransaction={(t: any) => { setEditingTransaction(t); setIsFormOpen(true); }} onDeleteTransaction={deleteExpenseAction} catalogs={catalogs} biConfig={biConfig} periodType={periodType} />}
                {currentView === 'presupuestos' && <BudgetsView transactions={transactions} catalogs={catalogs} budgets={{}} setBudgets={() => {}} />}
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

// VISTA DE INSIGHTS (INICIO) CON RESOLUCIÓN DE NOMBRES
function InsightsView({ transactions, isLoading, currentDate, setCurrentDate, catalogs, biConfig, periodType }: any) {
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
        return { 
            balance: income - expense, totalExpense: expense, totalIncome: income, 
            fixedCosts, meta, progreso: Math.min(100, (income / (meta || 1)) * 100), rubrosFijos 
        };
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
                                    <Pie data={[{ name: 'Ingresos', value: stats.totalIncome, color: '#3b82f6' }, { name: 'Gastos', value: stats.totalExpense, color: '#f43f5e' }]} innerRadius={35} outerRadius={50} paddingAngle={5} dataKey="value">
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
                <div className="mb-6"><CardTitle className="text-lg font-bold flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Flujo de Caja Diario</CardTitle><CardDescription>Comparativa diaria de ingresos y gastos.</CardDescription></div>
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
                    <DialogHeader><DialogTitle className="flex items-center gap-2 text-2xl font-black uppercase tracking-tighter"><History className="h-6 w-6 text-primary" /> Auditoría de {selectedDayData?.title}: {selectedDayData?.day}</DialogTitle></DialogHeader>
                    <ScrollArea className="flex-1 mt-4">
                        <Table>
                            <TableHeader><TableRow className="bg-muted/50"><TableHead className="font-bold text-[10px] uppercase">Concepto</TableHead><TableHead className="font-bold text-[10px] uppercase">Canal</TableHead><TableHead className="font-bold text-[10px] uppercase">Tipo</TableHead><TableHead className="text-right font-bold text-[10px] uppercase">Monto</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {selectedDayData?.records.map((r: any) => (
                                    <TableRow key={r.id}>
                                        <TableCell><div className="font-bold text-xs">{catalogs.subcategorias.find((s: any) => s.id === r.subcategoria_especifica)?.nombre || '-'}</div></TableCell>
                                        <TableCell className="text-[10px] font-medium uppercase">{r.canal_asociado?.replace(/_/g, ' ')}</TableCell>
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

// VISTA DE INFORMES CON RESOLUCIÓN DE NOMBRES
function ReportsView({ transactions, isLoading, onEditTransaction, onDeleteTransaction, catalogs, biConfig, periodType }: any) {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedDetail, setSelectedDetail] = React.useState<any>(null);

    const periodLabel = periodType === 'month' ? 'Mensual' : periodType === 'year' ? 'Anual' : periodType === 'six_months' ? 'Semestral' : 'Diario';

    const { logisticsData, breakevenChart } = React.useMemo(() => {
        const ingresos = transactions.filter((t: any) => ['INGRESO', 'VENTA'].includes(t.tipo_transaccion)).reduce((a: number, b: any) => a + (Number(b.monto) || 0), 0);
        const fijos = transactions.filter((t: any) => t.es_fijo && ['GASTO', 'COMPRA'].includes(t.tipo_transaccion)).reduce((a: number, b: any) => a + (Number(b.monto) || 0), 0);
        
        const log = transactions.filter((t: any) => {
            const area = catalogs.areas.find((a: any) => a.id === t.area_funcional)?.nombre?.toUpperCase() || '';
            return area.includes('LOGISTICA');
        });

        const max = Math.max(ingresos * 1.5, 200000);
        const bep = Array.from({ length: 11 }, (_, i) => {
            const sales = (max / 10) * i;
            const varCosts = sales * (1 - (biConfig.contributionMargin / 100));
            return { name: `$${Math.round(sales/1000)}k`, Ventas: sales, CostosTotales: fijos + varCosts, CostosFijos: fijos };
        });

        return { 
            logisticsData: { total: log.reduce((a: number, b: any) => a + (Number(b.monto) || 0), 0), breakdown: [] }, 
            breakevenChart: bep 
        };
    }, [transactions, catalogs, biConfig]);

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
                            <ComposedChart data={breakevenChart} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" fontSize={10} axisLine={false} /><YAxis fontSize={10} axisLine={false} tickFormatter={v => `$${Math.round(v/1000)}k`} />
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
                    <div><CardTitle className="text-xl font-bold">Historial de Movimientos</CardTitle><CardDescription>Auditoría de las 7 fases operativas.</CardDescription></div>
                    <div className="flex gap-2">
                        <div className="relative"><Input placeholder="Buscar..." className="h-9 w-[200px]" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /><Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /></div>
                        <Button variant="outline" size="sm" onClick={() => {}} className="h-9 border-slate-200"><Download className="mr-2 h-4 w-4" /> Excel</Button>
                    </div>
                </CardHeader>
                <div className="table-responsive border-t">
                    <Table className="min-w-[2000px]">
                        <TableHeader className="bg-muted/10"><TableRow className="h-12 border-b">
                            <TableHead className="font-bold uppercase text-[10px] text-slate-500">Fecha</TableHead>
                            <TableHead className="font-bold uppercase text-[10px] text-slate-500">Empresa</TableHead>
                            <TableHead className="font-bold uppercase text-[10px] text-slate-500">Impacto</TableHead>
                            <TableHead className="font-bold uppercase text-[10px] text-slate-500">Área</TableHead>
                            <TableHead className="font-bold uppercase text-[10px] text-slate-500">Subcat</TableHead>
                            <TableHead className="font-bold uppercase text-[10px] text-slate-500">Macro</TableHead>
                            <TableHead className="font-bold uppercase text-[10px] text-slate-500">Canal</TableHead>
                            <TableHead className="font-bold uppercase text-[10px] text-slate-500">Responsable</TableHead>
                            <TableHead className="text-right font-bold uppercase text-[10px] text-slate-500 px-6">Monto</TableHead>
                            <TableHead className="w-[100px] text-center">Acciones</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                            {filtered.map((t: any) => (
                                <TableRow key={t.id} className="h-14 border-b">
                                    <TableCell className="text-[11px]">{t.fecha}</TableCell>
                                    <TableCell><Badge variant="outline" className="text-[10px]">{t.empresa}</Badge></TableCell>
                                    <TableCell className="text-[10px] uppercase">{catalogs.impactos.find((i: any) => i.id === t.tipo_gasto_impacto)?.nombre || '-'}</TableCell>
                                    <TableCell className="text-[10px] uppercase">{catalogs.areas.find((a: any) => a.id === t.area_funcional)?.nombre || '-'}</TableCell>
                                    <TableCell className="text-[10px]">{catalogs.subcategorias.find((s: any) => s.id === t.subcategoria_especifica)?.nombre || '-'}</TableCell>
                                    <TableCell className="text-[10px] font-bold text-[#2D5A4C] uppercase">{catalogs.macros.find((m: any) => m.id === t.categoria_macro)?.nombre || '-'}</TableCell>
                                    <TableCell className="text-[10px] uppercase">{t.canal_asociado?.replace(/_/g, ' ')}</TableCell>
                                    <TableCell className="text-[10px] font-bold">{t.responsable}</TableCell>
                                    <TableCell className="text-right font-bold text-sm px-6">{money(t.monto)}</TableCell>
                                    <TableCell className="text-center px-2">
                                        <div className="flex items-center justify-center gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => setSelectedDetail(t)}><Eye className="h-4 w-4" /></Button>
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
function BudgetsView({ transactions, catalogs, budgets, setBudgets }: any) {
    const budgetStats = React.useMemo(() => {
        return catalogs.macros.map((cat: any) => {
            const spent = transactions
                .filter((t: any) => t.categoria_macro === cat.id && ['GASTO', 'COMPRA'].includes(t.tipo_transaccion))
                .reduce((acc: number, curr: any) => acc + (Number(curr.monto) || 0), 0);
            return { name: cat.nombre, spent, budget: 0, percent: 0, available: 0 };
        });
    }, [transactions, catalogs]);

    return (
        <div className="space-y-10">
            <div className="flex items-center justify-between"><h2 className="text-2xl font-black uppercase tracking-tight text-slate-800">METAS PRESUPUESTARIAS</h2><Button className="bg-[#2D5A4C] hover:bg-[#24483D] font-bold h-11 px-6 rounded-xl shadow-sm"><Plus className="mr-2 h-4 w-4" /> Nuevo Presupuesto</Button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {budgetStats.map((item: any) => (
                    <Card key={item.name} className="border-none shadow-sm bg-white overflow-hidden rounded-2xl p-6">
                        <div className="flex justify-between items-center mb-4"><span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{item.name}</span><Badge variant="secondary" className="bg-slate-50 text-slate-500 font-black text-[10px]">0%</Badge></div>
                        <div className="mb-6"><h3 className="text-3xl font-black text-slate-900">{money(item.spent)}</h3></div>
                        <div className="space-y-3"><div className="flex justify-between items-end text-[9px] font-black uppercase tracking-tighter"><span className="text-slate-400">CONSUMO</span><span className="text-slate-500">META: $0.00</span></div><Progress value={0} className="h-2 bg-slate-100" /></div>
                    </Card>
                ))}
            </div>
        </div>
    );
}

// PANTALLA 1: MÓDULO DE CONFIGURACIÓN DE CATÁLOGOS
function SettingsView({ catalogs, biConfig, setBiConfig, onRefresh }: any) {
    const { toast } = useToast();
    const [isAddOpen, setIsAddOpen] = React.useState(false);
    const [newName, setNewName] = React.useState('');
    const [activeTab, setActiveTab] = React.useState('impactos');
    const [selectedMacroId, setSelectedMacroId] = React.useState<string>('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleAdd = async () => {
        if (!newName || !supabase) return;
        setIsSubmitting(true);
        try {
            const table = activeTab === 'impactos' ? 'cat_tipo_gasto_impacto' : 
                          activeTab === 'areas' ? 'cat_area_funcional' : 
                          activeTab === 'macros' ? 'cat_categoria_macro' : 'cat_subcategoria';
            
            const payload: any = { nombre: newName, activo: true };
            if (activeTab === 'subcategorias') {
                if (!selectedMacroId) throw new Error("Debe seleccionar una Categoría Macro.");
                payload.categoria_macro_id = Number(selectedMacroId);
            }

            const { error } = await supabase.from(table).insert([payload]);
            if (error) throw error;

            toast({ title: "Éxito", description: "Nueva categoría añadida correctamente." });
            setNewName(''); setSelectedMacroId(''); setIsAddOpen(false);
            onRefresh();
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally { setIsSubmitting(false); }
    };

    return (
        <div className="space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="flex flex-row items-center gap-4 border-b bg-muted/5">
                        <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500"><SlidersHorizontal className="h-5 w-5" /></div>
                        <div><CardTitle className="text-lg font-black uppercase tracking-tight">Gestión de Catálogos Relacionales</CardTitle><CardDescription>Administre las bases maestras para la auditoría técnica.</CardDescription></div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <div className="px-8 pt-6 border-b bg-slate-50/50 flex justify-between items-end">
                                <TabsList className="bg-transparent h-12 gap-8">
                                    <TabsTrigger value="impactos" className="font-black uppercase text-[10px] border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-12">Impactos (F1)</TabsTrigger>
                                    <TabsTrigger value="areas" className="font-black uppercase text-[10px] border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-12">Áreas (F2)</TabsTrigger>
                                    <TabsTrigger value="macros" className="font-black uppercase text-[10px] border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-12">Macros (F3)</TabsTrigger>
                                    <TabsTrigger value="subcategorias" className="font-black uppercase text-[10px] border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-12">Subs (F4)</TabsTrigger>
                                </TabsList>
                                <Button onClick={() => setIsAddOpen(true)} className="mb-3 bg-[#2D5A4C] h-9 text-[10px] font-black uppercase"><Plus className="mr-2 h-4 w-4" /> Agregar Nuevo</Button>
                            </div>

                            {['impactos', 'areas', 'macros', 'subcategorias'].map(tab => (
                                <TabsContent key={tab} value={tab} className="mt-0">
                                    <ScrollArea className="h-[400px]">
                                        <Table>
                                            <TableHeader className="bg-slate-50 sticky top-0"><TableRow><TableHead className="font-black text-[10px] uppercase px-8">ID</TableHead><TableHead className="font-black text-[10px] uppercase">Nombre</TableHead>{tab === 'subcategorias' && <TableHead className="font-black text-[10px] uppercase">Macro Vinculada</TableHead>}<TableHead className="font-black text-[10px] uppercase">Estado</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {(catalogs[tab === 'subcategorias' ? 'subcategorias' : tab === 'macros' ? 'macros' : tab === 'areas' ? 'areas' : 'impactos'] || []).map((item: any) => (
                                                    <TableRow key={item.id} className="h-14"><TableCell className="px-8 font-mono text-xs text-slate-400">#{item.id}</TableCell><TableCell className="font-bold text-xs uppercase">{item.nombre}</TableCell>{tab === 'subcategorias' && <TableCell><Badge variant="secondary" className="text-[9px] uppercase">{catalogs.macros.find((m: any) => m.id === item.categoria_macro_id)?.nombre || '-'}</Badge></TableCell>}<TableCell><Badge variant={item.activo ? 'default' : 'outline'} className="text-[8px] uppercase">{item.activo ? 'Activo' : 'Inactivo'}</Badge></TableCell></TableRow>
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
                            </div><Button variant="outline" className="w-full h-10 border-slate-200 font-black uppercase text-[10px] rounded-xl">Editar Plantilla</Button>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-lg bg-[#24483D] text-white overflow-hidden">
                        <CardContent className="p-8 space-y-4"><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-widest text-white/60">Salud BI</p><CheckCircle2 className="h-4 w-4 text-emerald-400" /></div><h3 className="text-3xl font-black">Optimizada</h3><p className="text-xs text-white/70 leading-relaxed font-medium">Arquitectura relacional activa. Los cálculos son automáticos basados en los catálogos vinculados.</p></CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="max-w-md rounded-[32px]">
                    <DialogHeader><DialogTitle className="text-2xl font-black uppercase tracking-tighter">Añadir Categoría</DialogTitle><DialogDescription>Ingrese el nombre de la nueva entrada para el catálogo {activeTab}.</DialogDescription></DialogHeader>
                    <div className="py-6 space-y-6">
                        <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Nombre de Categoría</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ej: Nueva Subdivisión" className="h-12 border-slate-100 rounded-xl" /></div>
                        {activeTab === 'subcategorias' && (
                            <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Categoría Macro (Relación Obligatoria)</Label><Select value={selectedMacroId} onValueChange={setSelectedMacroId}><SelectTrigger className="h-12 border-slate-100 rounded-xl"><SelectValue placeholder="Seleccionar Macro..." /></SelectTrigger><SelectContent>{catalogs.macros.map((m: any) => <SelectItem key={m.id} value={m.id.toString()}>{m.nombre}</SelectItem>)}</SelectContent></Select></div>
                        )}
                    </div>
                    <DialogFooter><Button onClick={handleAdd} disabled={isSubmitting || !newName || (activeTab === 'subcategorias' && !selectedMacroId)} className="w-full h-12 bg-slate-900 rounded-xl font-black uppercase text-xs">Confirmar Inserción</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
