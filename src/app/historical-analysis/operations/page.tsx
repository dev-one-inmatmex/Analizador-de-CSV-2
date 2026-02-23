
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
  BarChart as BarChartIcon, ChevronLeft, ChevronRight,
  Loader2, MoreVertical, Pencil, Plus, Trash2, 
  Bell, Search, Filter, Download, Activity,
  Wallet, PieChart as PieChartIcon, Truck, Package, Info, Hammer, TrendingUp, Target,
  Settings2, Eye, Calendar as CalendarIcon, History, X, Settings as SettingsIcon,
  PlusCircle, Edit2, Save, HelpCircle, CalendarDays, FileText, User, CreditCard, Landmark, Building2, FileDown, AlertTriangle
} from 'lucide-react';
import { 
  Bar as RechartsBar, BarChart as RechartsBarChart, CartesianGrid, Legend, Pie, PieChart, 
  ResponsiveContainer, Tooltip, XAxis, YAxis, Cell as RechartsCell, ComposedChart, Line, Area, AreaChart
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel, FormDescription } from '@/components/ui/form';
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
import type { GastoDiario } from '@/types/database';
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

function TransactionForm({ transaction, onSubmit, dynamicImpacts, dynamicSubcategories, dynamicMacro }: any) {
    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(expenseFormSchema),
        defaultValues: transaction ? {
            ...transaction,
            fecha: parseISO(transaction.fecha),
            monto: Number(transaction.monto),
            empresa: EMPRESAS.includes(transaction.empresa) ? transaction.empresa : 'OTRA',
            especificar_empresa: getEnhancedValue(transaction.empresa, transaction.notes || transaction.notas, 'Empresa'),
            metodo_pago: METODOS_PAGO.includes(transaction.metodo_pago) ? transaction.metodo_pago : 'OTRO',
            especificar_metodo_pago: getEnhancedValue(transaction.metodo_pago, transaction.notes || transaction.notas, 'Método'),
            banco: BANCOS.includes(transaction.banco) ? transaction.banco : 'OTRO',
            especificar_banco: getEnhancedValue(transaction.banco, transaction.notes || transaction.notas, 'Banco'),
            cuenta: CUENTAS.includes(transaction.cuenta) ? transaction.cuenta : 'OTRO',
            especificar_cuenta: getEnhancedValue(transaction.cuenta, transaction.notes || transaction.notas, 'Cuenta'),
            descripcion: transaction.descripcion || '',
            notas: cleanNotes(transaction.notes || transaction.notas),
            es_nomina_mixta: false
        } : {
            fecha: new Date(),
            empresa: '',
            tipo_transaccion: 'GASTO',
            monto: 0,
            tipo_gasto_impacto: '',
            area_funcional: '',
            subcategoria_especifica: '',
            categoria_macro: '',
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
            comprobante_url: '',
            es_nomina_mixta: false
        }
    });

    const currentImpact = useWatch({ control: form.control, name: 'tipo_gasto_impacto' });
    const currentEmpresa = useWatch({ control: form.control, name: 'empresa' });
    const currentMetodo = useWatch({ control: form.control, name: 'metodo_pago' });
    const currentBanco = useWatch({ control: form.control, name: 'banco' });
    const currentCuenta = useWatch({ control: form.control, name: 'cuenta' });

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <DialogHeader>
                    <DialogTitle>{transaction ? 'Editar Registro' : 'Nueva Transacción'}</DialogTitle>
                    <DialogDescription>Clasifica el movimiento siguiendo las 7 fases de auditoría financiera.</DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="fecha" render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Fecha</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl><Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="empresa" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Empresa</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{EMPRESAS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    {currentEmpresa === 'OTRA' && (
                        <FormField control={form.control} name="especificar_empresa" render={({ field }) => (
                            <FormItem className="animate-in fade-in slide-in-from-top-1">
                                <FormLabel>Especificar Empresa</FormLabel>
                                <FormControl><Input {...field} value={field.value ?? ''} placeholder="Nombre de la empresa" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    )}

                    <FormField control={form.control} name="tipo_transaccion" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tipo de Transacción</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{TIPOS_TRANSACCION.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="monto" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Monto ($)</FormLabel>
                            <FormControl><Input {...field} type="number" step="0.01" placeholder="0.00" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="tipo_gasto_impacto" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Impacto (Nivel 1)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{dynamicImpacts.map((i: string) => <SelectItem key={i} value={i}>{i.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="area_funcional" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Área Funcional (Nivel 2)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{AREAS_FUNCIONALES.map(a => <SelectItem key={a} value={a}>{a.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="subcategoria_especifica" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Subcategoría (Nivel 3)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {(dynamicSubcategories[currentImpact] || []).map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    <SelectItem value="OTRA">OTRA SUB</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="categoria_macro" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Categoría Macro</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{dynamicMacro.map((m: string) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="canal_asociado" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Canal Asociado</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{CANALES_ASOCIADOS.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="clasificacion_operativa" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Clasificación Operativa</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{CLASIFICACIONES_OPERATIVAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="metodo_pago" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Método de Pago</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{METODOS_PAGO.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    {currentMetodo === 'OTRO' && (
                        <FormField control={form.control} name="especificar_metodo_pago" render={({ field }) => (
                            <FormItem className="animate-in fade-in slide-in-from-top-1">
                                <FormLabel>Especificar Método</FormLabel>
                                <FormControl><Input {...field} value={field.value ?? ''} placeholder="Nombre del método" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    )}

                    <FormField control={form.control} name="banco" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Banco</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{BANCOS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    {currentBanco === 'OTRO' && (
                        <FormField control={form.control} name="especificar_banco" render={({ field }) => (
                            <FormItem className="animate-in fade-in slide-in-from-top-1">
                                <FormLabel>Especificar Banco</FormLabel>
                                <FormControl><Input {...field} value={field.value ?? ''} placeholder="Nombre del banco" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    )}

                    <FormField control={form.control} name="cuenta" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Cuenta</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{CUENTAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    {currentCuenta === 'OTRO' && (
                        <FormField control={form.control} name="especificar_cuenta" render={({ field }) => (
                            <FormItem className="animate-in fade-in slide-in-from-top-1">
                                <FormLabel>Especificar Cuenta</FormLabel>
                                <FormControl><Input {...field} value={field.value ?? ''} placeholder="Nombre de la cuenta" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    )}

                    <FormField control={form.control} name="responsable" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Responsable</FormLabel>
                            <FormControl><Input {...field} value={field.value ?? ''} placeholder="Nombre" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="comprobante_url" render={({ field }) => (
                        <FormItem>
                            <FormLabel>URL Comprobante</FormLabel>
                            <FormControl><Input {...field} value={field.value ?? ''} placeholder="https://..." /></FormControl>
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
                    <FormField control={form.control} name="es_recurrente" render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            <FormLabel>Recurrente</FormLabel>
                        </FormItem>
                    )} />
                    {currentImpact === 'NOMINA' && (
                        <FormField control={form.control} name="es_nomina_mixta" render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                <FormLabel className="text-primary font-bold">Nómina Mixta</FormLabel>
                            </FormItem>
                        )} />
                    )}
                </div>

                <FormField control={form.control} name="descripcion" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Descripción</FormLabel>
                        <FormControl><Textarea {...field} value={field.value ?? ''} placeholder="Detalles de la transacción..." /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <FormField control={form.control} name="notas" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Notas</FormLabel>
                        <FormControl><Textarea {...field} value={field.value ?? ''} placeholder="Comentarios adicionales..." /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <DialogFooter>
                    <Button type="submit" className="w-full bg-[#2D5A4C] hover:bg-[#24483D] font-bold"><Save className="mr-2 h-4 w-4" /> Guardar Registro</Button>
                </DialogFooter>
            </form>
        </Form>
    );
}

export default function OperationsPage() {
    const [currentView, setCurrentView] = React.useState<'inicio' | 'informes' | 'presupuestos' | 'configuracion'>('inicio');
    const [transactions, setTransactions] = React.useState<GastoDiario[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingTransaction, setEditingTransaction] = React.useState<GastoDiario | null>(null);
    const [currentDate, setCurrentDate] = React.useState<Date>(new Date());
    const [isClient, setIsClient] = React.useState(false);

    const [periodType, setPeriodType] = React.useState<'day' | 'month' | 'six_months' | 'year' | 'custom'>('month');
    const [filterCompany, setFilterCompany] = React.useState<string>('TODAS');
    const [filterArea, setFilterArea] = React.useState<string>('TODAS');
    const [filterImpact, setFilterImpact] = React.useState<string>('TODOS');

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
        const supabaseClient = supabase;
        if (!supabaseClient) return;
        setIsLoading(true);
        try {
            let start, end;

            switch (periodType) {
                case 'day':
                    start = startOfDay(currentDate);
                    end = endOfDay(currentDate);
                    break;
                case 'six_months':
                    start = startOfMonth(subMonths(currentDate, 5));
                    end = endOfMonth(currentDate);
                    break;
                case 'year':
                    start = startOfYear(currentDate);
                    end = endOfYear(currentDate);
                    break;
                case 'month':
                default:
                    start = startOfMonth(currentDate);
                    end = endOfMonth(currentDate);
                    break;
            }

            const allFetched: GastoDiario[] = [];
            let from = 0;
            const step = 1000;
            let hasMore = true;

            while (hasMore) {
                let query = supabaseClient
                    .from('gastos_diarios')
                    .select('*')
                    .gte('fecha', format(start, 'yyyy-MM-dd'))
                    .lte('fecha', format(end, 'yyyy-MM-dd'));

                if (filterCompany !== 'TODAS') query = query.eq('empresa', filterCompany);
                if (filterArea !== 'TODAS') query = query.eq('area_funcional', filterArea);
                if (filterImpact !== 'TODOS') query = query.eq('tipo_gasto_impacto', filterImpact);

                const { data, error } = await query
                    .order('fecha', { ascending: false })
                    .range(from, from + step - 1);

                if (error) throw error;
                if (data && data.length > 0) {
                    allFetched.push(...(data as GastoDiario[]));
                    if (data.length < step) hasMore = false;
                    else from += step;
                } else {
                    hasMore = false;
                }
            }
            setTransactions(allFetched);
        } catch (e: any) {
            console.error('Error fetching transactions:', e);
            toast({ title: "Error", description: "No se pudieron cargar los movimientos.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [currentDate, periodType, filterCompany, filterArea, filterImpact, toast]);

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
            
            if (finalValues.tipo_gasto_impacto === 'NOMINA' && finalValues.es_nomina_mixta) {
                const distribucion = [
                    { canal: 'MERCADO_LIBRE', porcentaje: 0.60 },
                    { canal: 'MAYOREO', porcentaje: 0.30 },
                    { canal: 'FISICO', porcentaje: 0.10 }
                ];

                for (const dest of distribucion) {
                    const fraccionado = {
                        ...(finalValues as any),
                        monto: Number(finalValues.monto) * dest.porcentaje,
                        canal_asociado: dest.canal as any,
                        clasificacion_operativa: 'SEMI_DIRECTO' as any,
                        notas: `${finalValues.notas || ''} [Sueldo fraccionado ${dest.porcentaje * 100}% - Nómina Mixta]`.trim(),
                        es_nomina_mixta: false 
                    };
                    const res = await addExpenseAction(fraccionado);
                    if (res.error) throw new Error(res.error);
                }
                result = { data: "Nómina mixta registrada exitosamente." };
            } else {
                if (editingTransaction && editingTransaction.id) {
                    result = await updateExpenseAction(editingTransaction.id, finalValues as any);
                } else {
                    result = await addExpenseAction(finalValues as any);
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

            <div className="bg-white border-b px-4 py-3 sm:px-6">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <Select value={periodType} onValueChange={(v: any) => setPeriodType(v)}>
                            <SelectTrigger className="h-8 w-[160px] text-xs font-bold uppercase">
                                <SelectValue placeholder="Periodo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="day" className="text-xs font-bold uppercase">Día Seleccionado</SelectItem>
                                <SelectItem value="month" className="text-xs font-bold uppercase">Mes Actual</SelectItem>
                                <SelectItem value="six_months" className="text-xs font-bold uppercase">Últimos 6 Meses</SelectItem>
                                <SelectItem value="year" className="text-xs font-bold uppercase">Año Actual</SelectItem>
                            </SelectContent>
                        </Select>
                        
                        {periodType === 'day' && (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase border-slate-200">
                                        {format(currentDate, 'dd/MM/yyyy')}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={currentDate} onSelect={(d) => d && setCurrentDate(startOfDay(d))} initialFocus />
                                </PopoverContent>
                            </Popover>
                        )}
                    </div>

                    <div className="h-4 w-px bg-border hidden sm:block" />

                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <Select value={filterCompany} onValueChange={setFilterCompany}>
                            <SelectTrigger className="h-8 w-[130px] text-xs font-bold uppercase">
                                <SelectValue placeholder="Empresa" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="TODAS" className="text-xs font-bold uppercase">Todas las Empresas</SelectItem>
                                {EMPRESAS.map(e => <SelectItem key={e} value={e} className="text-xs font-bold uppercase">{e}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={filterArea} onValueChange={setFilterArea}>
                            <SelectTrigger className="h-8 w-[150px] text-xs font-bold uppercase">
                                <SelectValue placeholder="Área" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="TODAS" className="text-xs font-bold uppercase">Todas las Áreas</SelectItem>
                                {AREAS_FUNCIONALES.map(a => <SelectItem key={a} value={a} className="text-xs font-bold uppercase">{a.replace(/_/g, ' ')}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={filterImpact} onValueChange={setFilterImpact}>
                            <SelectTrigger className="h-8 w-[150px] text-xs font-bold uppercase">
                                <SelectValue placeholder="Impacto" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="TODOS" className="text-xs font-bold uppercase">Todos los Impactos</SelectItem>
                                {impacts.map(i => <SelectItem key={i} value={i} className="text-xs font-bold uppercase">{i.replace(/_/g, ' ')}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 no-scrollbar">
                {currentView === 'inicio' && <InsightsView transactions={transactions} isLoading={isLoading} currentDate={currentDate} setCurrentDate={setCurrentDate} periodType={periodType} />}
                {currentView === 'informes' && <ReportsView transactions={transactions} isLoading={isLoading} periodType={periodType} onEditTransaction={handleEdit} onDeleteTransaction={handleDelete} />}
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
                <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                    <TransactionForm 
                        transaction={editingTransaction} 
                        onSubmit={handleSave} 
                        dynamicImpacts={impacts}
                        dynamicSubcategories={subcategoriesMap}
                        dynamicMacro={macroCategories}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}

function InsightsView({ transactions, isLoading, currentDate, setCurrentDate, periodType }: any) {
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
            if (['GASTO', 'COMPRA'].includes(t.tipo_transaccion)) {
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
            else if (['INGRESO', 'VENTA'].includes(t.tipo_transaccion)) income += (t.monto || 0);
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
        let start, end;
        if (periodType === 'day') {
            start = startOfDay(currentDate);
            end = endOfDay(currentDate);
        } else if (periodType === 'month') {
            start = startOfMonth(currentDate);
            end = endOfMonth(currentDate);
        } else if (periodType === 'six_months') {
            start = startOfMonth(subMonths(currentDate, 5));
            end = endOfMonth(currentDate);
        } else {
            start = startOfYear(currentDate);
            end = endOfYear(currentDate);
        }

        const steps = eachDayOfInterval({ start, end });
        
        return steps.filter((_, i) => periodType === 'month' || periodType === 'day' || i % (periodType === 'six_months' ? 7 : 30) === 0).map(step => {
            const dayT = transactions.filter((t: any) => {
                try {
                    const tDate = parseISO(t.fecha);
                    if (periodType === 'month' || periodType === 'day') return isSameDay(tDate, step);
                    return tDate >= startOfDay(step) && tDate <= (periodType === 'six_months' ? endOfDay(add(step, { days: 6 })) : endOfMonth(step));
                } catch (e) { return false; }
            });
            let expense = 0, income = 0;
            dayT.forEach((t: any) => {
                if (['GASTO', 'COMPRA'].includes(t.tipo_transaccion)) expense += (t.monto || 0);
                else if (['INGRESO', 'VENTA'].includes(t.tipo_transaccion)) income += (t.monto || 0);
            });
            return { 
                name: format(step, periodType === 'month' || periodType === 'day' ? 'd' : 'MMM', { locale: es }), 
                fullDate: step,
                Ingresos: income, 
                Gastos: expense,
                records: dayT
            };
        });
    }, [transactions, currentDate, periodType]);

    const handleChartClick = (data: any) => {
        if (data && data.activePayload && data.activePayload.length > 0) {
            const dayInfo = data.activePayload[0].payload;
            setSelectedDayData({
                day: format(dayInfo.fullDate, periodType === 'month' || periodType === 'day' ? 'eeee d \'de\' MMMM' : 'MMMM yyyy', { locale: es }),
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
                            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Gasto Fijo Real</p>
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

            {(periodType === 'month' || periodType === 'day') && (
                <Card className="border-none shadow-sm overflow-hidden bg-white">
                    <div className="flex items-center justify-between px-6 py-3 border-b">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-black text-[#2D5A4C] tracking-widest">Periodo de Análisis</span>
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
            )}

            <Card className="border-none shadow-sm p-6 bg-white overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" /> Flujo de Caja Diario
                        </CardTitle>
                        <CardDescription>Comparativa de Ingresos vs Gastos en el periodo seleccionado.</CardDescription>
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
                            <History className="h-6 w-6 text-primary" /> Auditoría del Periodo: {selectedDayData?.day}
                        </DialogTitle>
                        <DialogDescription>Listado detallado de transacciones registradas.</DialogDescription>
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
                                            <TableCell><Badge variant={['INGRESO', 'VENTA'].includes(r.tipo_transaccion) ? 'default' : 'secondary'} className="text-[8px] font-bold uppercase">{r.tipo_transaccion}</Badge></TableCell>
                                            <TableCell className={cn("text-right font-bold text-xs", ['GASTO', 'COMPRA'].includes(r.tipo_transaccion) ? "text-slate-900" : "text-primary")}>{money(r.monto)}</TableCell>
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

function ReportsView({ transactions, isLoading, periodType, onEditTransaction, onDeleteTransaction }: any) {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [showFilter, setSearchShowFilter] = React.useState(false);
    const [selectedDetail, setSelectedDetail] = React.useState<GastoDiario | null>(null);

    const periodLabel = React.useMemo(() => {
        switch (periodType) {
            case 'day': return 'Diario';
            case 'six_months': return 'Semestral';
            case 'year': return 'Anual';
            default: return 'Mensual';
        }
    }, [periodType]);

    const { logisticsData, chartsData, breakevenChart } = React.useMemo(() => {
        const ingresos = transactions.filter((t: any) => ['INGRESO', 'VENTA'].includes(t.tipo_transaccion));
        const gastos = transactions.filter((t: any) => ['GASTO', 'COMPRA'].includes(t.tipo_transaccion));
        const ingresoTotal = ingresos.reduce((acc: number, curr: any) => acc + (curr.monto || 0), 0);
        const costosFijos = gastos.filter((g: any) => g.es_fijo).reduce((a: number, b: any) => a + (b.monto || 0), 0);
        
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
                total: gastosLogistica.reduce((a: number, b: any) => a + (b.monto || 0), 0),
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
            (t.empresa?.toLowerCase() || '').includes(q) ||
            (t.area_funcional?.toLowerCase() || '').includes(q) ||
            (t.banco?.toLowerCase() || '').includes(q)
        );
    }, [transactions, searchQuery]);

    const handleExport = () => {
        const ws = XLSX.utils.json_to_sheet(filteredTransactions.map((t: any) => ({
            Fecha: t.fecha,
            Empresa: getEnhancedValue(t.empresa, t.notas, 'Empresa'),
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
            'Método Pago': getEnhancedValue(t.metodo_pago, t.notas, 'Método'),
            Banco: getEnhancedValue(t.banco, t.notas, 'Banco'),
            Cuenta: getEnhancedValue(t.cuenta, t.notas, 'Cuenta'),
            Responsable: t.responsable,
            Descripción: t.descripcion,
            Notas: cleanNotes(t.notas)
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Historial Movimientos");
        XLSX.writeFile(wb, `historial_movimientos_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
    };

    const handleExportSinglePDF = (detail: GastoDiario) => {
        const doc = new jsPDF();
        const cleanNote = cleanNotes(detail.notas);
        const empresa = getEnhancedValue(detail.empresa, detail.notas, 'Empresa');
        const metodo = getEnhancedValue(detail.metodo_pago, detail.notas, 'Método');
        const banco = getEnhancedValue(detail.banco, detail.notas, 'Banco');
        const cuenta = getEnhancedValue(detail.cuenta, detail.notas, 'Cuenta');

        doc.setFillColor(45, 90, 76);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text('REPORTE DE MOVIMIENTO FINANCIERO', 20, 20);
        doc.setFontSize(10);
        doc.text(`ID REGISTRO: #${detail.id} | FECHA: ${detail.fecha}`, 20, 30);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.text('RESUMEN GENERAL', 20, 55);
        
        (doc as any).autoTable({
            startY: 60,
            head: [['Campo', 'Valor']],
            body: [
                ['Concepto', detail.subcategoria_especifica],
                ['Monto', money(detail.monto)],
                ['Tipo', detail.tipo_transaccion],
                ['Empresa', empresa],
                ['Impacto (Nivel 1)', detail.tipo_gasto_impacto?.replace(/_/g, ' ')],
                ['Área (Nivel 2)', detail.area_funcional?.replace(/_/g, ' ')],
                ['Categoría Macro', detail.categoria_macro],
                ['Canal Asociado', detail.canal_asociado?.replace(/_/g, ' ')],
                ['Atribución', detail.clasificacion_operativa || '-'],
                ['Responsable', detail.responsable || 'N/A'],
            ],
            theme: 'striped',
            headStyles: { fillColor: [45, 90, 76] }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.text('DETALLES DE PAGO', 20, finalY);

        (doc as any).autoTable({
            startY: finalY + 5,
            head: [['Método', 'Banco', 'Cuenta']],
            body: [[metodo, banco, cuenta]],
            theme: 'grid',
            headStyles: { fillColor: [45, 90, 76] }
        });

        const notesY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(12);
        doc.text('DESCRIPCIÓN Y NOTAS:', 20, notesY);
        doc.setFontSize(10);
        const splitDesc = doc.splitTextToSize(detail.descripcion || 'Sin descripción detallada.', 170);
        doc.text(splitDesc, 20, notesY + 10);
        
        if (cleanNote) {
            doc.text('Notas adicionales:', 20, notesY + 25 + (splitDesc.length * 5));
            const splitNotes = doc.splitTextToSize(cleanNote, 170);
            doc.text(splitNotes, 20, notesY + 32 + (splitDesc.length * 5));
        }

        doc.save(`reporte_movimiento_${detail.id}.pdf`);
    };

    if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="space-y-8">
            <Card className="border-none shadow-sm bg-white overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <div className="space-y-1">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" /> Punto de Equilibrio ({periodLabel})
                        </CardTitle>
                        <CardDescription>Cruce entre Ingresos y Costos Totales basado en Gasto Fijo del periodo.</CardDescription>
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
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-none shadow-sm bg-white">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                                <Truck className="h-4 w-4 text-primary" /> Eficiencia Logística ({periodLabel})
                            </CardTitle>
                            <CardDescription className="text-[10px]">Inversión operativa de movimiento en el periodo filtrado.</CardDescription>
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
                    <CardHeader><CardTitle className="text-[10px] font-bold uppercase tracking-widest">Distribución por Área ({periodLabel})</CardTitle></CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={chartsData.areas} dataKey="value" nameKey="name" innerRadius={50} outerRadius={70} paddingAngle={5}>
                                    {chartsData.areas.map((_: any, i: number) => <RechartsCell key={i} fill={COLORS[i % COLORS.length]} />)}
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
                        <CardTitle className="text-xl font-bold text-[#1e293b]">Historial de Movimientos ({periodLabel})</CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">Auditoría detallada de todos los campos registrados.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex items-center gap-2">
                            {showFilter && (
                                <div className="relative animate-in fade-in slide-in-from-right-2">
                                    <Input placeholder="Buscar..." className="h-9 w-[200px] text-xs pr-8" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus />
                                    {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>}
                                </div>
                            )}
                            <Button variant={showFilter ? "secondary" : "outline"} size="sm" className="h-9 px-4 text-xs font-medium border-slate-200" onClick={() => setSearchShowFilter(!showFilter)}><Filter className="mr-2 h-4 w-4" /> Filtrar</Button>
                        </div>
                        <Button variant="outline" size="sm" className="h-9 px-4 text-xs font-medium border-slate-200" onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Exportar Excel</Button>
                    </div>
                </CardHeader>
                <div className="table-responsive border-t">
                    <Table className="min-w-[2500px]">
                        <TableHeader className="bg-muted/10">
                            <TableRow className="h-12 border-b">
                                <TableHead className="font-bold uppercase text-[10px] text-slate-500 tracking-wider">Fecha</TableHead>
                                <TableHead className="font-bold uppercase text-[10px] text-slate-500 tracking-wider">Empresa</TableHead>
                                <TableHead className="font-bold uppercase text-[10px] text-slate-500 tracking-wider">Tipo Trans.</TableHead>
                                <TableHead className="font-bold uppercase text-[10px] text-slate-500 tracking-wider">Impacto</TableHead>
                                <TableHead className="font-bold uppercase text-[10px] text-slate-500 tracking-wider">Área</TableHead>
                                <TableHead className="font-bold uppercase text-[10px] text-slate-500 tracking-wider">Subcat</TableHead>
                                <TableHead className="font-bold uppercase text-[10px] text-slate-500 tracking-wider">Macro</TableHead>
                                <TableHead className="font-bold uppercase text-[10px] text-slate-500 tracking-wider">Canal</TableHead>
                                <TableHead className="font-bold uppercase text-[10px] text-slate-500 tracking-wider">Atribución</TableHead>
                                <TableHead className="font-bold uppercase text-[10px] text-slate-500 tracking-wider">Responsable</TableHead>
                                <TableHead className="font-bold uppercase text-[10px] text-slate-500 tracking-wider">Método Pago</TableHead>
                                <TableHead className="font-bold uppercase text-[10px] text-slate-500 tracking-wider">Banco</TableHead>
                                <TableHead className="font-bold uppercase text-[10px] text-slate-500 tracking-wider">Cuenta</TableHead>
                                <TableHead className="text-right font-bold uppercase text-[10px] text-slate-500 tracking-wider sticky right-0 bg-white shadow-[-4px_0_10px_rgba(0,0,0,0.05)] px-6">Monto</TableHead>
                                <TableHead className="w-[100px] sticky right-0 bg-white border-l text-center">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTransactions.map((t: GastoDiario) => (
                                <TableRow key={t.id} className="hover:bg-muted/5 h-14 border-b">
                                    <TableCell className="text-[11px] font-medium text-slate-600">{t.fecha}</TableCell>
                                    <TableCell><Badge variant="outline" className="text-[10px]">{getEnhancedValue(t.empresa, t.notas, 'Empresa')}</Badge></TableCell>
                                    <TableCell><Badge variant={['INGRESO', 'VENTA'].includes(t.tipo_transaccion) ? 'default' : 'secondary'} className="text-[8px] font-black">{t.tipo_transaccion}</Badge></TableCell>
                                    <TableCell className="text-[10px] uppercase">{t.tipo_gasto_impacto?.replace(/_/g, ' ')}</TableCell>
                                    <TableCell className="text-[10px] uppercase">{t.area_funcional?.replace(/_/g, ' ')}</TableCell>
                                    <TableCell className="text-[10px]">{t.subcategoria_especifica}</TableCell>
                                    <TableCell className="text-[10px] font-bold text-[#2D5A4C] uppercase">{t.categoria_macro}</TableCell>
                                    <TableCell className="text-[10px] uppercase">{t.canal_asociado?.replace(/_/g, ' ')}</TableCell>
                                    <TableCell className="text-[9px] uppercase">{t.clasificacion_operativa || '-'}</TableCell>
                                    <TableCell className="text-[10px] font-bold">{t.responsable || '-'}</TableCell>
                                    <TableCell className="text-[10px] uppercase">{getEnhancedValue(t.metodo_pago, t.notas, 'Método')}</TableCell>
                                    <TableCell className="text-[10px] uppercase">{getEnhancedValue(t.banco, t.notas, 'Banco')}</TableCell>
                                    <TableCell className="text-[10px] uppercase">{getEnhancedValue(t.cuenta, t.notas, 'Cuenta')}</TableCell>
                                    <TableCell className={cn("text-right font-bold text-sm sticky right-0 bg-white shadow-[-4px_0_10px_rgba(0,0,0,0.05)] px-6", ['GASTO', 'COMPRA'].includes(t.tipo_transaccion) ? "text-slate-900" : "text-primary")}>{money(t.monto)}</TableCell>
                                    <TableCell className="sticky right-0 bg-white border-l text-center px-2">
                                        <div className="flex items-center justify-center gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => setSelectedDetail(t)}><Eye className="h-4 w-4" /></Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-32">
                                                    <DropdownMenuItem onClick={() => onEditTransaction(t)}><Pencil className="mr-2 h-3.5 w-3.5" /> Editar</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => onDeleteTransaction(t.id!)} className="text-destructive"><Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            <Dialog open={!!selectedDetail} onOpenChange={() => setSelectedDetail(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Detalle del Movimiento</DialogTitle>
                        <DialogDescription>ID Registro: #{selectedDetail?.id}</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-6 py-4">
                        <div className="space-y-4">
                            <DetailItem label="Fecha" value={selectedDetail?.fecha} />
                            <DetailItem label="Empresa" value={getEnhancedValue(selectedDetail?.empresa || '', selectedDetail?.notas, 'Empresa')} />
                            <DetailItem label="Monto" value={money(selectedDetail?.monto)} />
                            <DetailItem label="Tipo" value={selectedDetail?.tipo_transaccion} />
                            <DetailItem label="Impacto" value={selectedDetail?.tipo_gasto_impacto?.replace(/_/g, ' ')} />
                            <DetailItem label="Área" value={selectedDetail?.area_funcional?.replace(/_/g, ' ')} />
                        </div>
                        <div className="space-y-4">
                            <DetailItem label="Subcategoría" value={selectedDetail?.subcategoria_especifica} />
                            <DetailItem label="Método" value={getEnhancedValue(selectedDetail?.metodo_pago || '', selectedDetail?.notas, 'Método')} />
                            <DetailItem label="Banco" value={getEnhancedValue(selectedDetail?.banco || '', selectedDetail?.notas, 'Banco')} />
                            <DetailItem label="Cuenta" value={getEnhancedValue(selectedDetail?.cuenta || '', selectedDetail?.notas, 'Cuenta')} />
                            <DetailItem label="Responsable" value={selectedDetail?.responsable} />
                            <div className="flex gap-2">
                                {selectedDetail?.es_fijo && <Badge>FIJO</Badge>}
                                {selectedDetail?.es_recurrente && <Badge variant="outline">RECURRENTE</Badge>}
                            </div>
                        </div>
                        <div className="col-span-2 pt-4 border-t space-y-4">
                            <div><p className="text-[10px] font-black text-slate-400 uppercase">Descripción</p><p className="text-sm">{selectedDetail?.descripcion || '-'}</p></div>
                            <div><p className="text-[10px] font-black text-slate-400 uppercase">Notas de Auditoría</p><p className="text-sm italic">{cleanNotes(selectedDetail?.notas) || '-'}</p></div>
                        </div>
                    </div>
                    <DialogFooter className="flex justify-between sm:justify-between items-center w-full border-t pt-4">
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setSelectedDetail(null)}>Cerrar</Button>
                            <Button variant="outline" onClick={() => handleExportSinglePDF(selectedDetail!)}><FileDown className="mr-2 h-4 w-4" /> PDF</Button>
                        </div>
                        <Button className="bg-[#2D5A4C] hover:bg-[#1f3e34]" onClick={() => { onEditTransaction(selectedDetail!); setSelectedDetail(null); }}>Editar Movimiento</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function BudgetsView({ transactions, categories, budgets, setBudgets, setCategories }: any) {
    const [isBudgetDialogOpen, setIsBudgetDialogOpen] = React.useState(false);
    
    const budgetStats = React.useMemo(() => {
        return categories.map((cat: string) => {
            const spent = transactions
                .filter((t: any) => t.categoria_macro === cat && ['GASTO', 'COMPRA'].includes(t.tipo_transaccion))
                .reduce((acc: number, curr: any) => acc + (curr.monto || 0), 0);
            const budget = budgets[cat] || 0;
            const percent = budget > 0 ? (spent / budget) * 100 : 0;
            return { name: cat, spent, budget, percent };
        });
    }, [transactions, categories, budgets]);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black uppercase tracking-tight">Presupuestos por Categoría</h2>
                <Button onClick={() => setIsBudgetDialogOpen(true)} className="bg-primary font-bold"><Settings2 className="mr-2 h-4 w-4" /> Ajustar Metas</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {budgetStats.map((item: any) => (
                    <Card key={item.name} className="border-none shadow-sm bg-white">
                        <CardHeader className="pb-4">
                            <div className="flex justify-between items-start">
                                <div><Badge variant="outline" className="text-primary">{item.name}</Badge><p className="text-xs text-muted-foreground mt-2">Asignado: {money(item.budget)}</p></div>
                                <div className="text-right"><p className={cn("text-2xl font-black", item.spent > item.budget ? "text-destructive" : "")}>{money(item.spent)}</p><p className="text-[9px] font-black text-slate-400 uppercase">Ejecutado</p></div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black uppercase"><span>Progreso</span><span>{item.percent.toFixed(1)}%</span></div>
                                <Progress value={item.percent} className={cn("h-2", item.percent > 90 ? "[&>div]:bg-destructive" : "")} />
                            </div>
                            {item.spent > item.budget && (
                                <div className="p-3 bg-destructive/5 rounded-lg border border-destructive/10 flex items-center gap-3 text-destructive animate-pulse">
                                    <AlertTriangle className="h-4 w-4" /><p className="text-[10px] font-bold uppercase">Excedente de {money(item.spent - item.budget)}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={isBudgetDialogOpen} onOpenChange={setIsBudgetDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Configurar Presupuestos</DialogTitle><DialogDescription>Define los techos financieros mensuales para cada categoría macro.</DialogDescription></DialogHeader>
                    <div className="space-y-4 py-4">
                        {categories.map((cat: string) => (
                            <div key={cat} className="flex items-center justify-between gap-4">
                                <span className="text-xs font-bold uppercase w-1/2">{cat}</span>
                                <Input type="number" defaultValue={budgets[cat]} onChange={(e) => setBudgets({ ...budgets, [cat]: Number(e.target.value) })} className="w-1/2" />
                            </div>
                        ))}
                    </div>
                    <DialogFooter><Button onClick={() => setIsBudgetDialogOpen(false)} className="w-full">Guardar Cambios</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function SettingsView({ impacts, setImpacts, subcategories, setSubcategories }: any) {
    const [newImpact, setNewImpact] = React.useState('');
    const [newSub, setNewSub] = React.useState('');
    const [selectedImpact, setSelectedImpact] = React.useState(impacts[0] || '');

    const addImpact = () => {
        if (!newImpact) return;
        const formatted = newImpact.toUpperCase().replace(/\s+/g, '_');
        if (!impacts.includes(formatted)) {
            setImpacts([...impacts, formatted]);
            setSubcategories({ ...subcategories, [formatted]: [] });
            setNewImpact('');
        }
    };

    const addSub = () => {
        if (!newSub || !selectedImpact) return;
        const currentSubs = subcategories[selectedImpact] || [];
        if (!currentSubs.includes(newSub)) {
            setSubcategories({ ...subcategories, [selectedImpact]: [...currentSubs, newSub] });
            setNewSub('');
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border-none shadow-sm bg-white">
                <CardHeader><CardTitle className="text-lg font-black uppercase">Estructura de Impactos</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex gap-2">
                        <Input placeholder="NUEVO IMPACTO..." value={newImpact} onChange={(e) => setNewImpact(e.target.value)} />
                        <Button onClick={addImpact}><Plus className="h-4 w-4" /></Button>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {impacts.map((i: string) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl border bg-slate-50 group">
                                <span className="text-xs font-black uppercase">{i.replace(/_/g, ' ')}</span>
                                <Button variant="ghost" size="icon" onClick={() => setImpacts(impacts.filter((imp: string) => imp !== i))} className="h-8 w-8 text-slate-300 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white">
                <CardHeader><CardTitle className="text-lg font-black uppercase">Subcategorías por Impacto</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <Select value={selectedImpact} onValueChange={setSelectedImpact}>
                            <SelectTrigger><SelectValue placeholder="SELECCIONAR IMPACTO" /></SelectTrigger>
                            <SelectContent>{impacts.map((i: string) => <SelectItem key={i} value={i} className="font-bold text-[10px] uppercase">{i.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                        </Select>
                        <div className="flex gap-2">
                            <Input placeholder="NUEVA SUBCATEGORÍA..." value={newSub} onChange={(e) => setNewSub(e.target.value)} />
                            <Button onClick={addSub}><Plus className="h-4 w-4" /></Button>
                        </div>
                    </div>
                    <div className="space-y-2 max-h-[230px] overflow-y-auto">
                        {(subcategories[selectedImpact] || []).map((s: string) => (
                            <div key={s} className="flex items-center justify-between p-3 rounded-xl border bg-slate-50 group">
                                <span className="text-xs font-bold text-slate-600">{s}</span>
                                <Button variant="ghost" size="icon" onClick={() => setSubcategories({ ...subcategories, [selectedImpact]: subcategories[selectedImpact].filter((sub: string) => sub !== s) })} className="h-8 w-8 text-slate-300 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
