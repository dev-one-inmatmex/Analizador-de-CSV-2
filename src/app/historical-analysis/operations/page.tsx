'use client';

import * as React from 'react';
import { 
  add, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, 
  startOfDay, endOfDay, parseISO, isValid, subMonths, startOfYear, endOfYear
} from 'date-fns';
import { es } from 'date-fns/locale';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Loader2, MoreVertical, Pencil, Plus, Trash2, 
  Search, Filter, Activity,
  Target, TrendingUp, Save, CalendarDays, FileText,
  SlidersHorizontal, CheckCircle2, ChevronLeft, ChevronRight, Info, Eye,
  FileDown, Wrench, Settings2, Hammer, HeartPulse, AlertCircle, Download,
  BookOpen, Lightbulb, Zap, ShieldCheck
} from 'lucide-react';
import { 
  Bar as RechartsBar, BarChart as RechartsBarChart, CartesianGrid, Legend, Pie, PieChart, 
  ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, ComposedChart, Line, Area, AreaChart
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
    CLASIFICACIONES_OPERATIVAS,
    METODOS_PAGO,
    BANCOS,
    CUENTAS
} from './schemas';

import { addExpenseAction, updateExpenseAction, deleteExpenseAction } from './actions';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogTrigger } from '@/components/ui/dialog';
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
import type { gastos_diarios, cat_tipo_gasto_impacto, cat_area_funcional, cat_categoria_macro, cat_categoria, cat_subcategoria, DashboardPresupuestoV3 } from '@/types/database';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';

const money = (v?: number | null) => v === null || v === undefined ? '$0.00' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);

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
            clasificacion_operativa: transaction.clasificacion_operativa || 'DIRECTO',
            responsable: transaction.responsable || '',
            descripcion: transaction.descripcion || '',
            notas: transaction.notas || '',
            es_fijo: transaction.es_fijo || false,
            es_recurrente: transaction.es_recurrente || false,
            metodo_pago: transaction.metodo_pago || '',
            banco: transaction.banco || '',
            cuenta: transaction.cuenta || '',
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
                            <Select onValueChange={field.onChange} value={field.value?.toString()}>
                                <FormControl><SelectTrigger className="h-11 border-slate-200 rounded-xl"><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{EMPRESAS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="tipo_transaccion" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase">Tipo</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value?.toString()}>
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
                            <Select onValueChange={field.onChange} value={field.value?.toString()}>
                                <FormControl><SelectTrigger className="h-11 border-slate-200 rounded-xl"><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{CANALES_ASOCIADOS.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="clasificacion_operativa" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase">Clasificación Operativa</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value?.toString()}>
                                <FormControl><SelectTrigger className="h-11 border-slate-200 rounded-xl"><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{CLASIFICACIONES_OPERATIVAS.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
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
                            <Select onValueChange={field.onChange} value={field.value?.toString()}>
                                <FormControl><SelectTrigger className="h-11 border-slate-200 rounded-xl"><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{METODOS_PAGO.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="banco" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase">Banco</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value?.toString()}>
                                <FormControl><SelectTrigger className="h-11 border-slate-200 rounded-xl"><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{BANCOS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="cuenta" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase">Cuenta</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value?.toString()}>
                                <FormControl><SelectTrigger className="h-11 border-slate-200 rounded-xl"><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                <SelectContent>{CUENTAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>

                <div className="flex gap-6 border-y py-4 border-slate-50">
                    <FormField control={form.control} name="es_fijo" render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><Switch checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                            <FormLabel className="text-[10px] font-black uppercase tracking-tighter">Gasto Fijo</FormLabel>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="es_recurrente" render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><Switch checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                            <FormLabel className="text-[10px] font-black uppercase tracking-tighter">Gasto Recurrente</FormLabel>
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

                <div className="space-y-4">
                    <FormField control={form.control} name="descripcion" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-bold uppercase">Descripción</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} className="border-slate-200 rounded-xl" /></FormControl><FormMessage /></FormItem>
                    )} />

                    <FormField control={form.control} name="notas" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-bold uppercase">Notas Adicionales</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} className="border-slate-200 rounded-xl h-20" placeholder="Breves observaciones técnicas..." /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>

                <DialogFooter><Button type="submit" className="w-full h-12 bg-[#2D5A4C] hover:bg-[#24483D] font-black uppercase text-xs rounded-xl shadow-lg"><Save className="mr-2 h-4 w-4" /> Guardar Registro</Button></DialogFooter>
            </form>
        </Form>
    );
}

function BudgetsView({ transactions, catalogs, currentDate }: { transactions: gastos_diarios[], catalogs: any, currentDate: Date }) {
    const [budgetData, setBudgetData] = React.useState<DashboardPresupuestoV3[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    const [isAjustarOpen, setIsAjustarOpen] = React.useState(false);
    const [selectedMacroId, setSelectedMacroId] = React.useState<string>("");
    const [newAmount, setNewAmount] = React.useState<string>("");
    const { toast } = useToast();

    const loadMetas = React.useCallback(async () => {
        setIsLoading(true);
        try {
            if (!supabase) return;
            const mes = currentDate.getMonth() + 1;
            const anio = currentDate.getFullYear();
            
            const { data, error } = await supabase.rpc('obtener_dashboard_financiero_v3', {
                p_mes: mes,
                p_anio: anio
            });
            
            if (error) {
                console.error("Error leyendo BD:", error);
                return;
            }

            if (data) {
                setBudgetData(data); 
            }
        } catch (error) {
            console.error("Error cargando dashboard v3:", error);
        } finally {
            setIsLoading(false);
        }
    }, [currentDate]);

    React.useEffect(() => {
        loadMetas();
    }, [loadMetas, transactions]);

    const handleSaveBudget = async () => {
        if (!selectedMacroId || !newAmount || !supabase) return;
        setIsSaving(true);
        
        try {
            const montoLimpio = parseFloat(String(newAmount).replace(/[^0-9.-]+/g, ""));
            
            if (isNaN(montoLimpio) || montoLimpio < 0) {
                toast({ title: "Error", description: "Ingresa un monto válido", variant: "destructive" });
                setIsSaving(false);
                return;
            }

            const mesActual = currentDate.getMonth() + 1;
            const anioActual = currentDate.getFullYear();

            const { error } = await supabase.rpc('guardar_presupuesto_v3', {
                p_macro_id: Number(selectedMacroId),
                p_monto: montoLimpio,
                p_mes: mesActual,
                p_anio: anioActual
            });

            if (error) throw error;

            await loadMetas(); 
            toast({ title: "Éxito", description: "Presupuesto asignado al período correctamente." });
            
            setIsAjustarOpen(false);
            setNewAmount("");
            setSelectedMacroId("");

        } catch (e: any) {
            console.error("Error al guardar presupuesto:", e);
            toast({ title: "Error", description: "No se pudo guardar la asignación.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteBudget = async (id: number) => {
        try {
            if (!supabase) return;
            const mesActual = currentDate.getMonth() + 1;
            const anioActual = currentDate.getFullYear();

            const { error } = await supabase.rpc('guardar_presupuesto_v3', {
                p_macro_id: Number(id),
                p_monto: 0,
                p_mes: mesActual,
                p_anio: anioActual
            });

            if (error) throw error;

            await loadMetas(); 
            toast({ title: "Eliminado", description: "La asignación ha sido removida." });
        } catch (e: any) {
            console.error("Error al eliminar:", e);
            toast({ title: "Error", description: "No se pudo eliminar el presupuesto.", variant: "destructive" });
        }
    };

    const downloadBudgetPDF = () => {
        const doc = new jsPDF();
        doc.setFillColor(45, 90, 76);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('REPORTE DE SEGUIMIENTO PRESUPUESTARIO', 20, 20);
        doc.setFontSize(10);
        doc.text(`PERIODO: ${format(currentDate, 'MMMM yyyy', { locale: es }).toUpperCase()}`, 20, 30);

        const tableData = budgetData
            .filter(item => item.presupuesto > 0 || item.ejecutado > 0)
            .map(item => [
                item.nombre,
                money(item.presupuesto),
                money(item.ejecutado),
                money(item.disponible),
                `${item.progreso.toFixed(1)}%`,
                item.estado_registro === 'SIN_REGISTRO' ? '-' : `${item.estado_registro} (${item.ultima_actualizacion ? format(new Date(item.ultima_actualizacion), 'dd MMM HH:mm', { locale: es }) : '-'})`
            ]);

        autoTable(doc, {
            startY: 50,
            head: [['Categoría Macro', 'Presupuesto', 'Ejecutado', 'Disponible', 'Progreso', 'Historial']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [45, 90, 76], textColor: [255, 255, 255] },
            styles: { fontSize: 9 }
        });

        doc.save(`seguimiento_presupuesto_${format(currentDate, 'yyyy_MM')}.pdf`);
    };

    if (isLoading && budgetData.length === 0) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    const filteredBudgets = budgetData.filter(item => item.presupuesto > 0 || item.ejecutado > 0);

    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-slate-800">METAS PRESUPUESTARIAS</h2>
                    <p className="text-xs font-bold uppercase text-slate-400 mt-1">Periodo: {format(currentDate, 'MMMM yyyy', { locale: es })}</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="h-11 px-6 rounded-xl border-slate-200 font-bold" onClick={downloadBudgetPDF}>
                        <FileDown className="mr-2 h-4 w-4" /> Exportar Seguimiento
                    </Button>
                    <Dialog open={isAjustarOpen} onOpenChange={setIsAjustarOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-[#2D5A4C] hover:bg-[#24483D] font-bold h-11 px-6 rounded-xl shadow-sm" onClick={() => { setSelectedMacroId(""); setNewAmount(""); }}>
                                <Plus className="mr-2 h-4 w-4" /> Nuevo Presupuesto
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-[32px] border-none shadow-2xl">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black uppercase tracking-tighter">GESTIONAR PRESUPUESTO</DialogTitle>
                                <DialogDescription className="text-[10px] font-bold uppercase text-slate-400">Define el techo presupuestario para el mes de {format(currentDate, 'MMMM yyyy', { locale: es }).toUpperCase()}.</DialogDescription>
                            </DialogHeader>
                            <div className="py-6 space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Categoría Macro</Label>
                                    <Select value={selectedMacroId} onValueChange={setSelectedMacroId}>
                                        <SelectTrigger className="h-14 rounded-xl border-slate-100 bg-slate-50/50"><SelectValue placeholder="Seleccionar categoría..." /></SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {catalogs.macros.map((m: any) => <SelectItem key={m.id} value={m.id.toString()} className="uppercase text-xs font-bold">{m.nombre}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Monto Asignado ($)</Label>
                                    <Input 
                                        type="number" 
                                        value={newAmount} 
                                        onChange={(e) => setNewAmount(e.target.value)} 
                                        className="h-14 rounded-xl border-slate-100 bg-slate-50/50 font-black text-lg px-5" 
                                        placeholder="0.00" 
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button 
                                    onClick={handleSaveBudget} 
                                    disabled={isSaving}
                                    className="w-full h-14 bg-[#2D5A4C] hover:bg-[#24483D] font-black uppercase text-xs rounded-2xl shadow-xl transition-all active:scale-[0.98]"
                                >
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'GUARDAR EN BASE DE DATOS'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredBudgets.length > 0 ? filteredBudgets.map((item: DashboardPresupuestoV3) => (
                    <Card key={item.id} className="border-none shadow-sm bg-white overflow-hidden rounded-2xl p-6 hover:shadow-md transition-shadow relative group">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{item.nombre}</span>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className={cn("font-black text-[10px] border-none px-2 py-0.5", item.progreso > 90 ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-500")}>
                                    {item.progreso.toFixed(0)}%
                                </Badge>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full">
                                            <MoreVertical className="h-3 w-3" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-xl">
                                        <DropdownMenuItem onClick={() => { setSelectedMacroId(item.id.toString()); setNewAmount(item.presupuesto.toString()); setIsAjustarOpen(true); }} className="text-[10px] font-black uppercase cursor-pointer">
                                            <Pencil className="mr-2 h-3 w-3" /> Editar Meta
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleDeleteBudget(item.id)} className="text-[10px] font-black uppercase text-destructive cursor-pointer">
                                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                        <div className="mb-6"><h3 className="text-3xl font-black text-slate-900">{money(item.ejecutado)}</h3></div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-end text-[9px] font-black uppercase tracking-tighter">
                                <span className="text-slate-400">CONSUMO</span>
                                <span className="text-slate-500">META: {money(item.presupuesto)}</span>
                            </div>
                            <Progress value={item.progreso} className="h-2 bg-slate-100" />
                            
                            {item.estado_registro !== 'SIN_REGISTRO' && item.ultima_actualizacion && (
                                <div className="flex justify-end mt-1">
                                    <p className={cn("text-[8px] font-bold uppercase tracking-widest",
                                        item.estado_registro === 'NUEVO' ? "text-emerald-500" :
                                        item.estado_registro === 'ACTUALIZADO' ? "text-blue-500" :
                                        item.estado_registro === 'BORRADO' ? "text-rose-500" : "text-slate-400"
                                    )}>
                                        {item.estado_registro === 'NUEVO' && 'Registro Nuevo: '}
                                        {item.estado_registro === 'ACTUALIZADO' && 'Actualización: '}
                                        {item.estado_registro === 'BORRADO' && 'Se Borró: '}
                                        
                                        <span className="text-slate-400 font-medium ml-1">
                                            {format(new Date(item.ultima_actualizacion), "dd MMM, HH:mm", { locale: es })}
                                        </span>
                                    </p>
                                </div>
                            )}
                        </div>
                    </Card>
                )) : (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-100 rounded-[32px]">
                        <Info className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-sm font-bold uppercase text-slate-400">No hay metas configuradas para este periodo.</p>
                    </div>
                )}
            </div>
            
            {filteredBudgets.length > 0 && (
                <Card className="border-none shadow-sm bg-white overflow-hidden rounded-[24px]">
                    <CardHeader className="flex flex-row items-center gap-4 bg-muted/5 border-b">
                        <FileText className="h-6 w-6 text-primary" />
                        <div>
                            <CardTitle className="text-lg font-black uppercase tracking-tight">Seguimiento de Presupuestos</CardTitle>
                            <CardDescription className="text-xs font-bold uppercase">Auditoría detallada de ejecución por categoría macro.</CardDescription>
                        </div>
                    </CardHeader>
                    <div className="table-responsive">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow>
                                    <TableHead className="font-black text-[10px] uppercase px-8">Categoría</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-right">Presupuesto</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-right">Ejecutado</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-right">Disponible</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase px-10">Estado</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase px-8">Historial</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredBudgets.map((item: DashboardPresupuestoV3) => (
                                    <TableRow key={item.id} className="h-14 hover:bg-slate-50/50 transition-colors border-slate-50">
                                        <TableCell className="font-bold text-xs uppercase px-8 text-slate-700">{item.nombre}</TableCell>
                                        <TableCell className="text-right font-medium text-slate-400">{money(item.presupuesto)}</TableCell>
                                        <TableCell className="text-right font-black text-[#2D5A4C]">{money(item.ejecutado)}</TableCell>
                                        <TableCell className={cn("text-right font-black", item.disponible < 0 ? "text-red-500" : "text-slate-800")}>
                                            {money(item.disponible)}
                                        </TableCell>
                                        <TableCell className="w-[200px] px-10">
                                            <div className="flex items-center gap-3">
                                                <Progress value={item.progreso} className="h-1.5 flex-1" />
                                                <span className="text-[9px] font-black text-slate-400 w-8">{item.progreso.toFixed(0)}%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-8">
                                            {item.estado_registro !== 'SIN_REGISTRO' && item.ultima_actualizacion ? (
                                                <div className="flex flex-col">
                                                    <span className={cn(
                                                        "text-[9px] font-black uppercase tracking-tighter",
                                                        item.estado_registro === 'NUEVO' ? 'text-emerald-500' :
                                                        item.estado_registro === 'ACTUALIZADO' ? 'text-blue-500' :
                                                        item.estado_registro === 'BORRADO' ? 'text-rose-500' : 'text-slate-400'
                                                    )}>
                                                        {item.estado_registro === 'NUEVO' ? 'REGISTRO NUEVO' : item.estado_registro}
                                                    </span>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase">
                                                        {format(new Date(item.ultima_actualizacion), "dd MMM, HH:mm", { locale: es })}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[9px] font-black text-slate-200 uppercase">-</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            )}
        </div>
    );
}

function SettingsView({ catalogs, onRefresh, biConfig, setBiConfig }: { catalogs: any, onRefresh: () => void, biConfig: any, setBiConfig: (val: any) => void }) {
    const { toast } = useToast();
    const [isCatalogDialogOpen, setIsCatalogDialogOpen] = React.useState(false);
    const [isPayrollDialogOpen, setIsPayrollDialogOpen] = React.useState(false);
    const [editingCatalogItem, setEditingCatalogItem] = React.useState<any>(null);
    const [activeCatalogTab, setActiveCatalogTab] = React.useState('impactos');
    const [catalogFormData, setCatalogFormData] = React.useState({ nombre: '', parentId: '' });
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [tempPayroll, setTempPayroll] = React.useState(biConfig.payrollTemplate);

    const CATALOG_TABLES = {
        impactos: 'cat_tipo_gasto_impacto',
        areas: 'cat_area_funcional',
        macros: 'cat_categoria_macro',
        categorias: 'cat_categoria',
        subcategorias: 'cat_subcategoria'
    };

    const handleOpenCatalogDialog = (item: any = null) => {
        if (item) {
            setEditingCatalogItem(item);
            const parentIdVal = activeCatalogTab === 'categorias' ? item.categoria_macro_id : activeCatalogTab === 'subcategorias' ? item.categoria_id : '';
            setCatalogFormData({ nombre: item.nombre, parentId: parentIdVal?.toString() || '' });
        } else {
            setEditingCatalogItem(null);
            setCatalogFormData({ nombre: '', parentId: '' });
        }
        setIsCatalogDialogOpen(true);
    };

    const handleSaveCatalog = async () => {
        if (!catalogFormData.nombre || !supabase) return;
        setIsSubmitting(true);
        try {
            const tableName = CATALOG_TABLES[activeCatalogTab as keyof typeof CATALOG_TABLES];
            const payload: any = { nombre: catalogFormData.nombre, activo: true };
            
            if (activeCatalogTab === 'categorias') {
                if (!catalogFormData.parentId) throw new Error("Debe seleccionar una Macro.");
                payload.categoria_macro_id = Number(catalogFormData.parentId);
            } else if (activeCatalogTab === 'subcategorias') {
                if (!catalogFormData.parentId) throw new Error("Debe seleccionar una Categoría.");
                payload.categoria_id = Number(catalogFormData.parentId);
            }

            let error;
            if (editingCatalogItem) {
                const { error: err } = await supabase.from(tableName).update(payload).eq('id', editingCatalogItem.id);
                error = err;
            } else {
                const { error: err } = await supabase.from(tableName).insert([payload]);
                error = err;
            }

            if (error) throw error;
            toast({ title: "Éxito", description: `Registro ${editingCatalogItem ? 'actualizado' : 'creado'} correctamente.` });
            setIsCatalogDialogOpen(false);
            onRefresh();
        } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
        finally { setIsSubmitting(false); }
    };

    const handleToggleCatalogStatus = async (item: any) => {
        if (!supabase) return;
        try {
            const tableName = CATALOG_TABLES[activeCatalogTab as keyof typeof CATALOG_TABLES];
            const { error } = await supabase.from(tableName).update({ activo: !item.activo }).eq('id', item.id);
            if (error) throw error;
            toast({ title: "Éxito", description: "Estado del registro actualizado." });
            onRefresh();
        } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    };

    const handleSaveBIConfig = () => {
        toast({ title: "Éxito", description: "Configuración de parámetros BI guardada correctamente." });
    };

    const handleUpdatePayrollValue = (index: number, value: string) => {
        const val = Number(value);
        const next = [...tempPayroll];
        next[index].porcentaje = val;
        setTempPayroll(next);
    };

    const handleSavePayrollTemplate = () => {
        const total = tempPayroll.reduce((sum: number, item: any) => sum + item.porcentaje, 0);
        if (total !== 100) {
            toast({ title: "Error", description: `El total debe ser 100% (actual: ${total}%)`, variant: "destructive" });
            return;
        }
        setBiConfig({ ...biConfig, payrollTemplate: tempPayroll });
        setIsPayrollDialogOpen(false);
        toast({ title: "Éxito", description: "Plantilla de nómina actualizada correctamente." });
    };

    return (
        <div className="space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 border-none shadow-sm bg-white overflow-hidden rounded-[24px]">
                    <CardHeader className="flex flex-row items-center gap-4 border-b bg-slate-50/30 p-8">
                        <div className="h-12 w-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-[#2D5A4C]"><Settings2 className="h-6 w-6" /></div>
                        <div>
                            <CardTitle className="text-xl font-black uppercase tracking-tight">PARÁMETROS BI</CardTitle>
                            <CardDescription className="text-xs font-bold uppercase text-slate-400">Configura los valores clave para la evaluación y motor de inteligencia financiera.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-10">
                        <div className="flex items-center justify-between group">
                            <div className="space-y-1">
                                <h4 className="text-sm font-black uppercase text-slate-800 tracking-tight">MARGEN DE CONTRIBUCIÓN PROMEDIO</h4>
                                <p className="text-xs font-bold text-slate-400 uppercase">Valor utilizado para calcular el Punto de Equilibrio mensual.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Input 
                                    type="number" 
                                    className="w-20 h-14 text-center font-black text-xl rounded-2xl border-slate-100 bg-slate-50/50" 
                                    value={biConfig.contributionMargin}
                                    onChange={(e) => setBiConfig({...biConfig, contributionMargin: Number(e.target.value)})}
                                />
                                <span className="font-black text-slate-300 text-lg">%</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between group">
                            <div className="space-y-1">
                                <h4 className="text-sm font-black uppercase text-slate-800 tracking-tight">DÍAS DE HISTORIAL DE DATOS</h4>
                                <p className="text-xs font-bold text-slate-400 uppercase">Periodo de datos para el cálculo de promedios de gasto fijo.</p>
                            </div>
                            <Select defaultValue="180">
                                <SelectTrigger className="w-[160px] h-14 rounded-2xl border-slate-100 bg-slate-50/50 font-black uppercase text-[10px]">
                                    <SelectValue placeholder="Periodo" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="90" className="text-[10px] font-bold uppercase py-3">90 DÍAS</SelectItem>
                                    <SelectItem value="180" className="text-[10px] font-bold uppercase py-3">180 DÍAS</SelectItem>
                                    <SelectItem value="365" className="text-[10px] font-bold uppercase py-3">365 DÍAS</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h4 className="text-sm font-black uppercase text-slate-800 tracking-tight">UNIDAD INDEPENDIENTE MALLA SOMBRA</h4>
                                <p className="text-xs font-bold text-slate-400 uppercase">Aislar financieramente el taller de producción.</p>
                            </div>
                            <Switch defaultChecked />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h4 className="text-sm font-black uppercase text-slate-800 tracking-tight">NOTIFICACIONES DE PRESUPUESTO</h4>
                                <p className="text-xs font-bold text-slate-400 uppercase">Alertar cuando una categoría supere el 90% del límite.</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                    </CardContent>
                    <CardFooter className="px-8 pb-8 pt-0 flex justify-end">
                        <Button onClick={handleSaveBIConfig} className="h-14 px-10 bg-slate-800 hover:bg-black rounded-2xl font-black uppercase text-[10px] shadow-xl">GUARDAR CONFIGURACIÓN</Button>
                    </CardFooter>
                </Card>

                <div className="space-y-8">
                    <Card className="border-none shadow-sm bg-white overflow-hidden rounded-[24px]">
                        <CardHeader className="flex flex-row items-center gap-3 border-b bg-slate-50/10 p-6">
                            <Hammer className="h-4 w-4 text-[#2D5A4C]" />
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-500">NÓMINA MIXTA</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <p className="text-[9px] font-black uppercase text-slate-300 tracking-widest">REPARTO ACTUAL PARA LA EVALUACIÓN DE ESFUERZO:</p>
                            
                            {biConfig.payrollTemplate.map((item: any, i: number) => (
                                <div key={i} className="space-y-3">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tighter">
                                        <span className="text-slate-800">{item.label}</span>
                                        <span className="text-slate-900">{item.porcentaje}%</span>
                                    </div>
                                    <Progress value={item.porcentaje} className="h-2 bg-slate-50" />
                                </div>
                            ))}

                            <Button 
                                variant="outline" 
                                className="w-full h-14 rounded-2xl border-slate-100 bg-white font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 text-slate-600 shadow-sm transition-all active:scale-[0.98]"
                                onClick={() => {
                                    setTempPayroll([...biConfig.payrollTemplate]);
                                    setIsPayrollDialogOpen(true);
                                }}
                            >
                                EDITAR PLANTILLA
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-lg bg-[#2D5A4C] text-white overflow-hidden rounded-[24px]">
                        <CardContent className="p-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">ESTADO DE SALUD BI</p>
                                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                            </div>
                            <h3 className="text-4xl font-black leading-none">Optimizada</h3>
                            <p className="text-[11px] text-white/70 leading-relaxed font-bold uppercase tracking-wide">Tu arquitectura financiera está operando correctamente. Los cálculos de rentabilidad y supervivencia son automáticos basados en tus registros y el margen del 40%.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Card className="border-none shadow-sm bg-white overflow-hidden rounded-[24px]">
                <CardHeader className="flex flex-row items-center gap-4 border-b bg-slate-50/30 p-8">
                    <div className="h-12 w-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-[#2D5A4C]"><SlidersHorizontal className="h-6 w-6" /></div>
                    <div>
                        <CardTitle className="text-xl font-black uppercase tracking-tight">Gestión de Catálogos Relacionales</CardTitle>
                        <CardDescription className="text-xs font-bold uppercase text-slate-400">CRUD de bases maestras para la arquitectura de 5 niveles.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Tabs value={activeCatalogTab} onValueChange={setActiveCatalogTab} className="w-full">
                        <div className="px-8 pt-6 border-b bg-slate-50/50 flex justify-between items-end">
                            <TabsList className="bg-transparent h-12 gap-8">
                                {['impactos', 'areas', 'macros', 'categorias', 'subcategorias'].map(tab => (
                                    <TabsTrigger key={tab} value={tab} className="font-black uppercase text-[10px] border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-12 px-0 tracking-widest">{tab}</TabsTrigger>
                                ))}
                            </TabsList>
                            <Button onClick={() => handleOpenCatalogDialog()} className="mb-3 bg-[#2D5A4C] hover:bg-[#24483D] h-9 text-[10px] font-black uppercase rounded-xl px-5 shadow-lg"><Plus className="mr-2 h-4 w-4" /> Agregar Nuevo</Button>
                        </div>

                        {['impactos', 'areas', 'macros', 'categorias', 'subcategorias'].map(tab => (
                            <TabsContent key={tab} value={tab} className="mt-0">
                                <ScrollArea className="h-[450px]">
                                    <Table>
                                        <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b-0">
                                            <TableRow className="border-b-0">
                                                <TableHead className="font-black text-[10px] uppercase px-8 py-4 tracking-widest text-slate-400">ID</TableHead>
                                                <TableHead className="font-black text-[10px] uppercase px-8 py-4 tracking-widest text-slate-400">Nombre del Registro</TableHead>
                                                {(tab === 'categorias' || tab === 'subcategorias') && <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Relación Jerárquica</TableHead>}
                                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 text-right pr-16">Estado</TableHead>
                                                <TableHead className="w-32"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(catalogs[tab as keyof typeof catalogs] || []).map((item: any) => (
                                                <TableRow key={item.id} className={cn("h-16 hover:bg-slate-50/50 transition-colors border-slate-50", !item.activo && "opacity-50 grayscale")}>
                                                    <TableCell className="px-8 font-mono text-[10px] text-slate-400">#{item.id}</TableCell>
                                                    <TableCell className="px-8 font-bold text-xs uppercase text-slate-700">{item.nombre}</TableCell>
                                                    {tab === 'categorias' && <TableCell><Badge variant="outline" className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border-none px-3">{catalogs.macros.find((m: any) => m.id === item.categoria_macro_id)?.nombre || '-'}</Badge></TableCell>}
                                                    {tab === 'subcategorias' && <TableCell><Badge variant="outline" className="text-[9px] font-black uppercase bg-blue-50 text-blue-700 border-none px-3">{catalogs.categorias.find((c: any) => c.id === item.categoria_id)?.nombre || '-'}</Badge></TableCell>}
                                                    <TableCell className="text-right pr-16"><Badge variant={item.activo ? 'default' : 'secondary'} className={cn("text-[8px] font-black uppercase px-2 py-0.5", item.activo ? "bg-[#2D5A4C]" : "bg-slate-200")}>{item.activo ? 'Activo' : 'Inactivo'}</Badge></TableCell>
                                                    <TableCell className="pr-8">
                                                        <div className="flex justify-end gap-2">
                                                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-slate-100" onClick={() => handleOpenCatalogDialog(item)}><Pencil className="h-4 w-4" /></Button>
                                                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-red-50 text-destructive" onClick={() => handleToggleCatalogStatus(item)}><Trash2 className="h-4 w-4" /></Button>
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

            <Dialog open={isCatalogDialogOpen} onOpenChange={setIsCatalogDialogOpen}>
                <DialogContent className="max-w-md rounded-[40px] border-none shadow-2xl p-0 overflow-hidden bg-white">
                    <div className="p-10 space-y-8">
                        <DialogHeader>
                            <DialogTitle className="text-3xl font-black uppercase tracking-tighter">{editingCatalogItem ? 'Editar' : 'Añadir'} Registro</DialogTitle>
                            <DialogDescription className="text-xs font-bold uppercase text-slate-400">Actualice la base maestra para {activeCatalogTab}.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6">
                            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nombre Descriptivo</Label><Input value={catalogFormData.nombre} onChange={(e) => setCatalogFormData({...catalogFormData, nombre: e.target.value})} placeholder="Ej: Nueva Categoría" className="h-14 border-slate-100 rounded-2xl bg-slate-50 font-bold px-5" /></div>
                            
                            {activeCatalogTab === 'categorias' && (
                                <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Macro Vinculada (Obligatorio)</Label>
                                    <Select value={catalogFormData.parentId} onValueChange={(v) => setCatalogFormData({...catalogFormData, parentId: v})}>
                                        <SelectTrigger className="h-14 border-slate-100 rounded-2xl bg-slate-50 font-bold px-5"><SelectValue placeholder="Seleccionar Macro..." /></SelectTrigger>
                                        <SelectContent className="rounded-xl">{catalogs.macros.map((m: any) => <SelectItem key={m.id} value={m.id.toString()}>{m.nombre}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            )}

                            {activeCatalogTab === 'subcategorias' && (
                                <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Categoría Vinculada (Obligatorio)</Label>
                                    <Select value={catalogFormData.parentId} onValueChange={(v) => setCatalogFormData({...catalogFormData, parentId: v})}>
                                        <SelectTrigger className="h-14 border-slate-100 rounded-2xl bg-slate-50 font-bold px-5"><SelectValue placeholder="Seleccionar Categoría..." /></SelectTrigger>
                                        <SelectContent className="rounded-xl">{catalogs.categorias.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="p-8 bg-slate-50 border-t flex gap-4">
                        <Button variant="outline" onClick={() => setIsCatalogDialogOpen(false)} className="h-14 flex-1 font-black uppercase text-[10px] rounded-2xl border-slate-200">Cancelar</Button>
                        <Button onClick={handleSaveCatalog} disabled={isSubmitting || !catalogFormData.nombre || ((activeCatalogTab === 'categorias' || activeCatalogTab === 'subcategorias') && !catalogFormData.parentId)} className="h-14 flex-1 bg-slate-900 hover:bg-black rounded-2xl font-black uppercase text-[10px] shadow-xl">Confirmar</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isPayrollDialogOpen} onOpenChange={setIsPayrollDialogOpen}>
                <DialogContent className="max-w-md rounded-[40px] border-none shadow-2xl p-0 overflow-hidden bg-white">
                    <div className="p-10 space-y-8">
                        <DialogHeader>
                            <div className="flex items-center gap-3 mb-2">
                                <Hammer className="h-6 w-6 text-[#2D5A4C]" />
                                <DialogTitle className="text-2xl font-black uppercase tracking-tighter">EDITAR PLANTILLA DE NÓMINA</DialogTitle>
                            </div>
                            <DialogDescription className="text-xs font-bold uppercase text-slate-400">Ajusta el porcentaje de esfuerzo para cada canal. El total debe sumar exactamente 100%.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6">
                            {tempPayroll.map((item: any, i: number) => (
                                <div key={i} className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                    <span className="text-[10px] font-black uppercase text-slate-600 tracking-tight">{item.label}</span>
                                    <div className="flex items-center gap-2">
                                        <Input 
                                            type="number" 
                                            className="w-20 h-10 text-center font-black rounded-xl border-slate-200" 
                                            value={item.porcentaje}
                                            onChange={(e) => handleUpdatePayrollValue(i, e.target.value)}
                                        />
                                        <span className="font-bold text-slate-400">%</span>
                                    </div>
                                </div>
                            ))}
                            <div className="pt-4 border-t flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase text-slate-400">Total acumulado:</span>
                                <span className={cn("text-xl font-black", tempPayroll.reduce((s: number, i: any) => s + i.porcentaje, 0) === 100 ? "text-emerald-500" : "text-rose-500")}>
                                    {tempPayroll.reduce((s: number, i: any) => s + i.porcentaje, 0)}%
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="p-8 bg-slate-50 border-t flex gap-4">
                        <Button variant="outline" onClick={() => setIsPayrollDialogOpen(false)} className="h-14 flex-1 font-black uppercase text-[10px] rounded-2xl border-slate-200">Descartar</Button>
                        <Button onClick={handleSavePayrollTemplate} className="h-14 flex-1 bg-[#2D5A4C] hover:bg-[#24483D] rounded-2xl font-black uppercase text-[10px] shadow-xl text-white">Aplicar Cambios</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function ManualView() {
    return (
        <div className="space-y-10 animate-in fade-in duration-500 max-w-5xl mx-auto">
            <div className="text-center space-y-4">
                <div className="inline-flex h-16 w-16 items-center justify-center bg-[#2D5A4C]/10 rounded-[24px] text-[#2D5A4C] mb-4">
                    <BookOpen className="h-8 w-8" />
                </div>
                <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900">Manual de Operaciones Financieras</h2>
                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">Guía Maestra para el Control de Gastos y Presupuestos</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="border-none shadow-sm bg-white overflow-hidden rounded-[24px] p-8 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Activity className="h-5 w-5" /></div>
                        <h3 className="font-black uppercase tracking-tight text-lg">1. Panel de Inicio</h3>
                    </div>
                    <p className="text-xs font-medium text-slate-600 leading-relaxed uppercase">
                        Visualiza la salud financiera inmediata. Compara ingresos vs egresos y monitorea el **Gasto Fijo Real** contra la **Meta de Supervivencia**. 
                        Utiliza el calendario interactivo para auditar días específicos de operación.
                    </p>
                    <div className="bg-slate-50 p-4 rounded-xl space-y-2">
                        <div className="flex items-center gap-2 text-[9px] font-black text-blue-600 uppercase"><Zap className="h-3 w-3" /> Tip Técnico</div>
                        <p className="text-[10px] font-bold text-slate-400 leading-tight uppercase">Haz clic en las barras del gráfico diario para abrir el visor de auditoría instantánea.</p>
                    </div>
                </Card>

                <Card className="border-none shadow-sm bg-white overflow-hidden rounded-[24px] p-8 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><FileText className="h-5 w-5" /></div>
                        <h3 className="font-black uppercase tracking-tight text-lg">2. Informes y Auditoría</h3>
                    </div>
                    <p className="text-xs font-medium text-slate-600 leading-relaxed uppercase">
                        Gestión total de la base de datos de movimientos. Filtra por empresa, rango de fecha o responsable. 
                        Exporta toda la tabla a **CSV** o descarga comprobantes individuales en **PDF**.
                    </p>
                    <div className="bg-slate-50 p-4 rounded-xl space-y-2">
                        <div className="flex items-center gap-2 text-[9px] font-black text-emerald-600 uppercase"><ShieldCheck className="h-3 w-3" /> Auditoría</div>
                        <p className="text-[10px] font-bold text-slate-400 leading-tight uppercase">Utiliza el botón "Visualizar" para validar los 13 campos técnicos de cada registro.</p>
                    </div>
                </Card>

                <Card className="border-none shadow-sm bg-white overflow-hidden rounded-[24px] p-8 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center"><Target className="h-5 w-5" /></div>
                        <h3 className="font-black uppercase tracking-tight text-lg">3. Metas Presupuestarias</h3>
                    </div>
                    <p className="text-xs font-medium text-slate-600 leading-relaxed uppercase">
                        Define techos de gasto por Categoría Macro. El sistema utiliza **Arquitectura V3** para rastrear estados:
                        <span className="block mt-2 font-black text-emerald-500">• NUEVO: Asignación inicial.</span>
                        <span className="block font-black text-blue-500">• ACTUALIZADO: Cambio de monto.</span>
                        <span className="block font-black text-rose-500">• BORRADO: Meta restablecida.</span>
                    </p>
                </Card>

                <Card className="border-none shadow-sm bg-white overflow-hidden rounded-[24px] p-8 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center"><Settings2 className="h-5 w-5" /></div>
                        <h3 className="font-black uppercase tracking-tight text-lg">4. Configuración BI</h3>
                    </div>
                    <p className="text-xs font-medium text-slate-600 leading-relaxed uppercase">
                        El motor de inteligencia financiera. Configura el **Margen de Contribución** y la plantilla de **Nómina Mixta**. 
                        Administra los catálogos relacionales de 5 niveles para mantener la integridad de los datos.
                    </p>
                </Card>
            </div>

            <Card className="border-none shadow-lg bg-[#2D5A4C] text-white overflow-hidden rounded-[24px] p-10">
                <div className="flex flex-col md:flex-row items-center gap-10">
                    <div className="space-y-4 flex-1">
                        <h3 className="text-2xl font-black uppercase tracking-tighter leading-none">Flujo Contable Automatizado</h3>
                        <p className="text-[11px] font-bold text-white/70 leading-relaxed uppercase tracking-wider">
                            Cada que registras un gasto con el interruptor "NÓMINA MIXTA" encendido, el sistema fracciona el monto automáticamente basándose en los porcentajes de configuración, generando 3 asientos contables vinculados a sus respectivos canales de venta.
                        </p>
                    </div>
                    <div className="flex-shrink-0">
                        <div className="h-24 w-24 border-4 border-white/20 rounded-full flex items-center justify-center">
                            <Lightbulb className="h-10 w-10 text-emerald-400" />
                        </div>
                    </div>
                </div>
            </Card>
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
                    else if (['cfe', 'agua', 'internet', 'teléfono'].some((s: string) => subName.includes(s) || desc.includes(s))) rubrosFijos.servicios += monto;
                    else if (['software', 'saas', 'shopify', 'suscripción'].some((s: string) => subName.includes(s) || desc.includes(s))) rubrosFijos.software += monto;
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
                                        <Cell fill="#3b82f6" stroke="none" /><Cell fill="#f43f5e" stroke="none" />
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
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Gasto Fijo Real</p>
                            <CardTitle className="text-3xl font-black text-[#2D5A4C] tabular-nums">{money(stats.fixedCosts)}</CardTitle>
                        </div>
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
                            {eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) }).map((day, i: number) => (
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

function ReportsView({ transactions, isLoading, onEditTransaction, onDeleteTransaction, catalogs, currentDate }: any) {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [viewDetail, setViewDetail] = React.useState<any>(null);

    const trendChartData = React.useMemo(() => {
        const days = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
        let cumulativeActual = 0;
        const totalBudget = 200000;
        const dailyTarget = totalBudget / days.length;

        return days.map((day, index) => {
            const daySpending = transactions
                .filter((t: any) => isSameDay(parseISO(t.fecha), day) && ['GASTO', 'COMPRA'].includes(t.tipo_transaccion))
                .reduce((sum: number, t: any) => sum + (Number(t.monto) || 0), 0);
            cumulativeActual += daySpending;
            const cumulativeTarget = dailyTarget * (index + 1);
            return { name: format(day, 'd'), actual: cumulativeActual, target: cumulativeTarget };
        });
    }, [transactions, currentDate]);

    const barChartData = React.useMemo(() => {
        return eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) }).map(day => {
            const dayT = transactions.filter((t: any) => isSameDay(parseISO(t.fecha), day));
            let exp = 0, inc = 0;
            dayT.forEach((t: any) => {
                const m = Number(t.monto) || 0;
                if (['GASTO', 'COMPRA'].includes(t.tipo_transaccion)) exp += m; else inc += m;
            });
            return { name: format(day, 'd'), Ingresos: inc, Gastos: exp };
        });
    }, [transactions, currentDate]);

    const downloadPDF = (t: any) => {
        const doc = new jsPDF();
        const macroName = catalogs.macros.find((m: any) => m.id === t.categoria_macro)?.nombre || '-';
        const catName = catalogs.categorias.find((c: any) => c.id === t.categoria)?.nombre || '-';
        const subName = catalogs.subcategorias.find((s: any) => s.id === t.subcategoria_especifica)?.nombre || '-';
        const areaName = catalogs.areas.find((a: any) => a.id === t.area_funcional)?.nombre || '-';
        const impactName = catalogs.impactos.find((i: any) => i.id === t.tipo_gasto_impacto)?.nombre || '-';

        doc.setFillColor(45, 90, 76);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('REPORTE DE MOVIMIENTO FINANCIERO', 20, 20);
        doc.setFontSize(10);
        doc.text(`ID REGISTRO: #${t.id} | FECHA: ${t.fecha}`, 20, 30);

        autoTable(doc, {
            startY: 60,
            theme: 'striped',
            headStyles: { fillColor: [45, 90, 76] },
            body: [
                ['Concepto', subName], ['Monto', money(t.monto)], ['Tipo', t.tipo_transaccion], ['Empresa', t.empresa],
                ['Impacto', impactName], ['Área', areaName], ['Macro', macroName], ['Canal', String(t.canal_asociado || 'GENERAL').replace(/_/g, ' ')],
                ['Responsable', t.responsable || '-']
            ],
        });
        doc.save(`movimiento_${t.id}.pdf`);
    };

    const exportToCSV = () => {
        const headers = ["ID", "Fecha", "Empresa", "Tipo", "Impacto", "Area", "Macro", "Categoria", "Subcategoria", "Canal", "Monto"];
        const rows = transactions.map((t: any) => [
            t.id, t.fecha, t.empresa, t.tipo_transaccion,
            catalogs.impactos.find((i: any) => i.id === t.tipo_gasto_impacto)?.nombre || '',
            catalogs.areas.find((a: any) => a.id === t.area_funcional)?.nombre || '',
            catalogs.macros.find((m: any) => m.id === t.categoria_macro)?.nombre || '',
            catalogs.categorias.find((c: any) => c.id === t.categoria)?.nombre || '',
            catalogs.subcategorias.find((s: any) => s.id === t.subcategoria_especifica)?.nombre || '',
            t.canal_asociado, t.monto
        ]);
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `movimientos_${format(new Date(), 'yyyy_MM_dd')}.csv`;
        link.click();
    };

    if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    const filtered = transactions.filter((t: any) => {
        const sub = catalogs.subcategorias.find((s: any) => s.id === t.subcategoria_especifica)?.nombre || '';
        const macro = catalogs.macros.find((m: any) => m.id === t.categoria_macro)?.nombre || '';
        const resp = t.responsable || '';
        return [sub, macro, resp, t.id?.toString()].some(str => str?.toLowerCase().includes(searchQuery.toLowerCase()));
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden p-8">
                    <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3 mb-8">
                        <TrendingUp className="h-6 w-6 text-[#2D5A4C]" /> Tendencia de Ejecución
                    </CardTitle>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendChartData}>
                                <defs><linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" fontSize={10} axisLine={false} tick={{fill: '#94a3b8', fontWeight: 700}} />
                                <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                                <Tooltip formatter={(v: number) => money(v)} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />
                                <Area type="monotone" dataKey="target" stroke="#3b82f6" strokeWidth={3} fill="url(#colorTarget)" name="Techo" dot={false} />
                                <Line type="monotone" dataKey="actual" stroke="#f43f5e" strokeWidth={4} name="Real" dot={{ r: 4, fill: '#f43f5e' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden p-8">
                    <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3 mb-8">
                        <Activity className="h-6 w-6 text-[#2D5A4C]" /> Flujo de Caja Mensual
                    </CardTitle>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart data={barChartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" fontSize={10} axisLine={false} />
                                <YAxis fontSize={10} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                                <Tooltip formatter={(v: number) => money(v)} cursor={{fill: '#f8fafc'}} />
                                <RechartsBar dataKey="Ingresos" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={15} />
                                <RechartsBar dataKey="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={15} />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            <Card className="border-none shadow-sm bg-white overflow-hidden rounded-[24px]">
                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-8 pt-10 px-10">
                    <div>
                        <CardTitle className="text-2xl font-black uppercase tracking-tighter text-slate-800">HISTORIAL DE MOVIMIENTOS</CardTitle>
                        <CardDescription className="text-xs font-bold uppercase text-slate-400 mt-1">AUDITORÍA COMPLETA DEL PERIODO SELECCIONADO.</CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button onClick={exportToCSV} variant="outline" className="h-11 rounded-xl border-slate-200 font-bold"><Download className="mr-2 h-4 w-4" /> Exportar CSV</Button>
                        <div className="relative w-64"><Input placeholder="BUSCAR..." className="h-11 pl-5 pr-10 border-slate-100 rounded-2xl bg-slate-50 font-bold uppercase text-[10px]" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /><Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" /></div>
                    </div>
                </CardHeader>
                <div className="border-t border-slate-50">
                    <ScrollArea className="w-full">
                        <Table className="min-w-[2500px]">
                            <TableHeader className="bg-slate-50/50">
                                <TableRow className="h-14 border-b-slate-100">
                                    <TableHead className="font-black text-[10px] uppercase text-slate-400 px-6">ID</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-slate-400 px-6">FECHA</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-slate-400 px-6">EMPRESA</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-slate-400 px-6">TIPO</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-slate-400 px-6">IMPACTO (F1)</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-slate-400 px-6">ÁREA (F2)</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-slate-400 px-6">MACRO (F3)</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-slate-400 px-6">CATEGORÍA (F4)</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-slate-400 px-6">SUBCATEGORÍA (F5)</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-slate-400 px-6">CANAL (F6)</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-slate-400 px-6">RESPONSABLE</TableHead>
                                    <TableHead className="text-right font-black text-[10px] uppercase text-slate-400 px-6">MONTO FINAL</TableHead>
                                    <TableHead className="w-[100px] text-center font-black text-[10px] uppercase text-slate-400 sticky right-0 bg-white z-10">ACCIONES</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.length > 0 ? filtered.map((t: any) => (
                                    <TableRow key={t.id} className="h-20 hover:bg-slate-50/50 transition-all border-slate-50 group">
                                        <TableCell className="px-6 font-mono text-[10px] text-slate-400">#{t.id}</TableCell>
                                        <TableCell className="px-6 text-[10px] font-bold text-slate-600">{t.fecha}</TableCell>
                                        <TableCell className="px-6"><Badge variant="outline" className="text-[9px] font-black uppercase border-slate-200">{t.empresa}</Badge></TableCell>
                                        <TableCell className="px-6"><Badge variant="secondary" className="text-[9px] font-black uppercase bg-slate-100 text-slate-500 border-none">{t.tipo_transaccion}</Badge></TableCell>
                                        <TableCell className="px-6 text-[10px] font-medium text-slate-500 uppercase">{catalogs.impactos.find((i: any) => i.id === t.tipo_gasto_impacto)?.nombre || '-'}</TableCell>
                                        <TableCell className="px-6 text-[10px] font-medium text-slate-500 uppercase">{catalogs.areas.find((a: any) => a.id === t.area_funcional)?.nombre || '-'}</TableCell>
                                        <TableCell className="px-6 font-black text-[11px] uppercase text-[#2D5A4C]">{catalogs.macros.find((m: any) => m.id === t.categoria_macro)?.nombre || '-'}</TableCell>
                                        <TableCell className="px-6 font-bold text-[10px] uppercase text-slate-400">{catalogs.categorias.find((c: any) => c.id === t.categoria)?.nombre || '-'}</TableCell>
                                        <TableCell className="px-6 font-bold text-[10px] uppercase text-slate-800">{catalogs.subcategorias.find((s: any) => s.id === t.subcategoria_especifica)?.nombre || '-'}</TableCell>
                                        <TableCell className="px-6 text-[10px] font-black uppercase text-slate-400">{String(t.canal_asociado || '-').replace(/_/g, ' ')}</TableCell>
                                        <TableCell className="px-6 text-[10px] font-bold text-slate-600">{t.responsable || '-'}</TableCell>
                                        <TableCell className="px-6 text-right font-black text-sm text-[#2D5A4C]">{money(t.monto)}</TableCell>
                                        <TableCell className="text-center px-4 sticky right-0 bg-white group-hover:bg-slate-50/50">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-2xl border-slate-100 shadow-2xl p-2 w-48">
                                                    <DropdownMenuItem onClick={() => setViewDetail(t)} className="font-black text-[10px] uppercase cursor-pointer py-2.5"><Eye className="mr-2 h-3.5 w-3.5" /> Visualizar</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => downloadPDF(t)} className="font-black text-[10px] uppercase cursor-pointer py-2.5"><FileDown className="mr-2 h-3.5 w-3.5" /> Descargar PDF</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => onEditTransaction(t)} className="font-black text-[10px] uppercase cursor-pointer py-2.5"><Pencil className="mr-2 h-3.5 w-3.5" /> Editar Registro</DropdownMenuItem>
                                                    <DropdownMenuSeparator className="my-1 bg-slate-50" />
                                                    <DropdownMenuItem className="text-destructive font-black text-[10px] uppercase cursor-pointer py-2.5" onClick={() => onDeleteTransaction(t.id)}><Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={13} className="h-80 text-center opacity-20"><FileText className="h-16 w-16 mx-auto mb-4" /><p className="font-black uppercase text-[10px]">Sin movimientos registrados</p></TableCell></TableRow>}
                            </TableBody>
                        </Table>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </div>
            </Card>

            <Dialog open={!!viewDetail} onOpenChange={() => setViewDetail(null)}>
                <DialogContent className="max-w-3xl w-[95vw] rounded-[32px] border-none shadow-2xl p-0 overflow-hidden bg-white animate-in zoom-in-95 duration-300">
                    <ScrollArea className="max-h-[85vh] no-scrollbar">
                        <div className="p-10 sm:p-12 space-y-12">
                            <DialogHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <DialogTitle className="text-4xl font-black uppercase tracking-tighter text-slate-900 leading-none">DETALLE DEL MOVIMIENTO</DialogTitle>
                                        <p className="text-xs font-bold uppercase text-slate-400 tracking-widest mt-2">ID REGISTRO: #{viewDetail?.id}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        {viewDetail?.es_recurrente && <Badge className="bg-blue-600 text-white font-black text-[8px] uppercase px-3 py-1">RECURRENTE</Badge>}
                                        {viewDetail?.es_fijo && <Badge className="bg-[#2D5A4C] text-white font-black text-[8px] uppercase px-3 py-1">FIJO</Badge>}
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-16 gap-y-10">
                                <div className="space-y-1.5"><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Fecha</p><p className="text-2xl font-black text-slate-800">{viewDetail?.fecha}</p></div>
                                <div className="space-y-1.5"><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Monto</p><p className="text-4xl font-black text-[#2D5A4C]">{money(viewDetail?.monto)}</p></div>
                                
                                <div className="space-y-1.5"><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Empresa</p><p className="text-xl font-black text-slate-800 uppercase">{viewDetail?.empresa}</p></div>
                                <div className="space-y-1.5"><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tipo</p><p className="text-xl font-black text-slate-800 uppercase">{viewDetail?.tipo_transaccion}</p></div>
                                
                                <div className="space-y-1.5"><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Impacto (F1)</p><p className="text-xl font-black text-slate-800 uppercase">{catalogs.impactos.find((i: any) => i.id === viewDetail?.tipo_gasto_impacto)?.nombre || '-'}</p></div>
                                <div className="space-y-1.5"><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Área Funcional (F2)</p><p className="text-xl font-black text-slate-800 uppercase">{catalogs.areas.find((a: any) => a.id === viewDetail?.area_funcional)?.nombre || '-'}</p></div>
                                
                                <div className="space-y-1.5"><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Macro (F3)</p><p className="text-xl font-black text-slate-800 uppercase">{catalogs.macros.find((m: any) => m.id === viewDetail?.categoria_macro)?.nombre || '-'}</p></div>
                                <div className="space-y-1.5"><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Categoría (F4)</p><p className="text-xl font-black text-slate-800 uppercase">{catalogs.categorias.find((c: any) => c.id === viewDetail?.categoria)?.nombre || '-'}</p></div>
                                
                                <div className="space-y-1.5"><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Subcategoría (F5)</p><p className="text-xl font-black text-slate-800 uppercase">{catalogs.subcategorias.find((s: any) => s.id === viewDetail?.subcategoria_especifica)?.nombre || '-'}</p></div>
                                <div className="space-y-1.5"><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Canal (F6)</p><p className="text-xl font-black text-slate-800 uppercase">{String(viewDetail?.canal_asociado || '-').replace(/_/g, ' ')}</p></div>
                                
                                <div className="space-y-1.5"><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Clasificación (F7)</p><p className="text-xl font-black text-slate-800 uppercase">{String(viewDetail?.clasificacion_operativa || '-').replace(/_/g, ' ')}</p></div>
                                <div className="space-y-1.5"><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Responsable</p><p className="text-xl font-black text-slate-800 uppercase">{viewDetail?.responsable || '-'}</p></div>
                                
                                <div className="space-y-1.5"><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Método de Pago</p><p className="text-xl font-black text-slate-800 uppercase">{viewDetail?.metodo_pago?.replace(/_/g, ' ') || '-'}</p></div>
                                <div className="space-y-1.5"><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Banco</p><p className="text-xl font-black text-slate-800 uppercase">{viewDetail?.banco || '-'}</p></div>
                                
                                <div className="space-y-1.5"><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cuenta</p><p className="text-xl font-black text-slate-800 uppercase">{viewDetail?.cuenta || '-'}</p></div>
                            </div>

                            {(viewDetail?.descripcion || viewDetail?.notas) && (
                                <div className="pt-8 border-t border-slate-50 space-y-6">
                                    {viewDetail?.descripcion && (
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Descripción</p>
                                            <p className="text-sm font-medium text-slate-600 leading-relaxed">{viewDetail?.descripcion}</p>
                                        </div>
                                    )}
                                    {viewDetail?.notas && (
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Notas del Sistema</p>
                                            <p className="text-xs italic font-medium text-slate-400 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">{viewDetail?.notas}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    <div className="px-10 sm:p-12 py-10 border-t bg-slate-50 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex gap-4">
                            <Button variant="outline" onClick={() => setViewDetail(null)} className="h-14 px-10 font-black uppercase text-[10px] rounded-2xl border-slate-200 bg-white">CERRAR</Button>
                            <Button variant="outline" onClick={() => downloadPDF(viewDetail)} className="h-14 px-10 font-black uppercase text-[10px] rounded-2xl border-slate-200 bg-white flex gap-2 shadow-sm transition-all hover:bg-slate-50">
                                <FileDown className="h-4 w-4" /> DESCARGAR PDF
                            </Button>
                        </div>
                        <Button onClick={() => { setViewDetail(null); onEditTransaction(viewDetail); }} className="h-14 px-12 font-black uppercase text-[10px] rounded-2xl bg-[#2D5A4C] hover:bg-[#24483D] shadow-xl text-white transition-all active:scale-[0.98]">EDITAR MOVIMIENTO</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function OperationsPage() {
    const [isClient, setIsClient] = React.useState(false);
    const [currentView, setCurrentView] = React.useState<'inicio' | 'informes' | 'presupuestos' | 'configuracion' | 'manual'>('inicio');
    const [transactions, setTransactions] = React.useState<gastos_diarios[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingTransaction, setEditingTransaction] = React.useState<gastos_diarios | null>(null);
    const [currentDate, setCurrentDate] = React.useState<Date>(new Date());

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

    const onDeleteTransaction = async (id: number) => {
        const res = await deleteExpenseAction(id);
        if (res.data) {
            toast({ title: "Éxito", description: res.data });
            fetchAllData();
        } else {
            toast({ title: "Error", description: res.error, variant: "destructive" });
        }
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
                            <TabsTrigger value="manual" className="text-xs font-bold uppercase">Manual</TabsTrigger>
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
                                let interval: any = { months: -1 };
                                if (periodType === 'six_months') interval = { months: -6 };
                                if (periodType === 'year') interval = { years: -1 };
                                if (periodType === 'day') interval = { days: -1 };
                                setCurrentDate((prev: Date) => add(prev, interval));
                            }}><ChevronLeft className="h-4 w-4" /></Button>
                            <Button variant="outline" size="sm" className="h-8 text-[9px] font-bold uppercase border-slate-200 px-3" onClick={() => setCurrentDate(startOfDay(new Date()))}>Hoy</Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100" onClick={() => {
                                let interval: any = { months: 1 };
                                if (periodType === 'six_months') interval = { months: 6 };
                                if (periodType === 'year') interval = { years: 1 };
                                if (periodType === 'day') interval = { days: 1 };
                                setCurrentDate((prev: Date) => add(prev, interval));
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
                {currentView === 'informes' && <ReportsView transactions={transactions} isLoading={isLoading} onEditTransaction={(t: any) => { setEditingTransaction(t); setIsFormOpen(true); }} onDeleteTransaction={onDeleteTransaction} catalogs={catalogs} currentDate={currentDate} />}
                {currentView === 'presupuestos' && <BudgetsView transactions={transactions} catalogs={catalogs} currentDate={currentDate} />}
                {currentView === 'configuracion' && <SettingsView catalogs={catalogs} onRefresh={fetchCatalogs} biConfig={biConfig} setBiConfig={setBiConfig} />}
                {currentView === 'manual' && <ManualView />}
            </main>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-[32px] border-none shadow-2xl">
                    <TransactionForm transaction={editingTransaction} onSubmit={handleSave} catalogs={catalogs} />
                </DialogContent>
            </Dialog>
        </div>
    );
}
