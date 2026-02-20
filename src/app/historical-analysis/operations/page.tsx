
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
  Info, Tag, Target, Settings, User, Bell, Shield, Database, X, Search
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
    EMPRESAS,
    TIPOS_TRANSACCION,
    IMPACTOS_FINANCIEROS,
    AREAS_FUNCIONALES,
    CANALES_ASOCIADOS,
    CATEGORIAS_MACRO,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

const money = (v?: number | null) => v === null || v === undefined ? '$0.00' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);

export default function OperationsPage() {
    const [currentView, setCurrentView] = React.useState<'inicio' | 'informes' | 'presupuestos' | 'configuracion'>('inicio');
    const [transactions, setTransactions] = React.useState<GastoDiario[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingTransaction, setEditingTransaction] = React.useState<GastoDiario | null>(null);
    const [dateFilter, setDateFilter] = React.useState<'day' | 'week' | 'month' | 'year'>('month');
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
            const dataToSave = { ...values, fecha: format(values.fecha, 'yyyy-MM-dd') };
            if (editingTransaction) {
                res = await supabase!.from('gastos_diarios').update(dataToSave as any).eq('id', editingTransaction.id);
            } else {
                res = await supabase!.from('gastos_diarios').insert(dataToSave as any);
            }

            if (res.error) throw res.error;

            toast({ title: "Éxito", description: "Movimiento registrado correctamente." });
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
        <div className="flex h-screen flex-col bg-muted/20 min-w-0">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6">
                <div className="flex items-center gap-6 min-w-0">
                    <SidebarTrigger />
                    <h1 className="text-xl font-bold tracking-tight">Gastos Financieros</h1>
                    <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as any)} className="min-w-0">
                        <TabsList className="bg-muted/40 h-9 p-1 border">
                            <TabsTrigger value="inicio" className="text-xs data-[state=active]:bg-background"><Home className="mr-2 h-3.5 w-3.5" /> Inicio</TabsTrigger>
                            <TabsTrigger value="informes" className="text-xs data-[state=active]:bg-background"><BarChartIcon className="mr-2 h-3.5 w-3.5" /> Informes</TabsTrigger>
                            <TabsTrigger value="presupuestos" className="text-xs data-[state=active]:bg-background"><Wallet className="mr-2 h-3.5 w-3.5" /> Presupuestos</TabsTrigger>
                            <TabsTrigger value="configuracion" className="text-xs data-[state=active]:bg-background"><Settings className="mr-2 h-3.5 w-3.5" /> Configuración</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground"><Search className="h-4 w-4" /></Button>
                    <Button size="sm" className="bg-[#2D5A4C] hover:bg-[#24483D] font-bold h-9" onClick={() => handleOpenForm(null)}><Plus className="mr-1.5 h-4 w-4" /> Nueva</Button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
                {currentView === 'inicio' && <InsightsView transactions={transactions} isLoading={isLoading} currentDate={currentDate} setCurrentDate={setCurrentDate} />}
                {currentView === 'informes' && <ReportsView transactions={transactions} onEditTransaction={handleOpenForm} onDeleteTransaction={handleDelete} />}
                {currentView === 'presupuestos' && <BudgetsView transactions={transactions} />}
                {currentView === 'configuracion' && <SettingsView />}
            </main>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                    <TransactionForm transaction={editingTransaction} onSubmit={handleSave} onClose={() => setIsFormOpen(false)} />
                </DialogContent>
            </Dialog>
        </div>
    );
}

function InsightsView({ transactions, isLoading, currentDate, setCurrentDate }: any) {
    const { totalExpense, balance } = React.useMemo(() => {
        const expense = transactions.filter((t: any) => t.tipo_transaccion === 'GASTO').reduce((sum: number, t: any) => sum + (t.monto || 0), 0);
        const income = transactions.filter((t: any) => t.tipo_transaccion === 'INGRESO').reduce((sum: number, t: any) => sum + (t.monto || 0), 0);
        return { totalExpense: expense, totalIncome: income, balance: income - expense };
    }, [transactions]);

    const barChartData = React.useMemo(() => {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        const steps = eachDayOfInterval({ start, end });
        return steps.map(step => {
            const dayT = transactions.filter((t: any) => isSameDay(new Date(t.fecha), step));
            const expense = dayT.filter((t: any) => t.tipo_transaccion === 'GASTO').reduce((s: number, t: any) => s + (t.monto || 0), 0);
            const income = dayT.filter((t: any) => t.tipo_transaccion === 'INGRESO').reduce((s: number, t: any) => s + (t.monto || 0), 0);
            return { name: format(step, 'd'), Ingresos: income, Gastos: expense };
        });
    }, [transactions, currentDate]);

    const daysInMonth = eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentDate), { locale: es }),
        end: endOfWeek(endOfMonth(currentDate), { locale: es }),
    });

    if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none shadow-sm bg-white">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Balance del Periodo</CardTitle></CardHeader>
                    <CardContent className="flex items-center justify-center gap-12 py-6">
                        <div className="h-[140px] w-[140px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={[{ name: 'Gastos', value: totalExpense, color: '#f43f5e' }, { name: 'Balance', value: Math.max(0, balance), color: '#3b82f6' }]} innerRadius={50} outerRadius={65} paddingAngle={4} dataKey="value">
                                        {[{ name: 'Gastos', value: totalExpense, color: '#f43f5e' }, { name: 'Balance', value: Math.max(0, balance), color: '#3b82f6' }].map((entry, index) => <Cell key={index} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip formatter={(v: number) => money(v)} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-1 text-center">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Balance Neto</p>
                            <p className="text-3xl font-black text-blue-600">{money(balance)}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-white flex flex-col justify-center">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Estado del Presupuesto</CardTitle></CardHeader>
                    <CardContent className="space-y-6 py-6">
                        <div className="flex justify-between items-baseline">
                            <p className="text-4xl font-black">{money(totalExpense)} <span className="text-lg font-medium text-muted-foreground ml-1">gastado</span></p>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Meta: {money(50000)}</p>
                        </div>
                        <Progress value={(totalExpense / 50000) * 100} className="h-3 bg-muted" />
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-sm overflow-hidden bg-white">
                <div className="flex items-center px-2 py-4 border-b">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(add(currentDate, { months: -1 }))}><ChevronLeft className="h-4 w-4" /></Button>
                    <ScrollArea className="flex-1">
                        <div className="flex gap-1.5 px-2">
                            {daysInMonth.map((day, i) => (
                                <button 
                                    key={i} 
                                    onClick={() => setCurrentDate(day)} 
                                    className={cn(
                                        "flex flex-col items-center justify-center min-w-[48px] h-16 rounded-xl transition-all", 
                                        isSameDay(day, currentDate) 
                                            ? "bg-[#2D5A4C] text-white shadow-lg scale-105" 
                                            : "hover:bg-muted/50 text-muted-foreground"
                                    )}
                                >
                                    <span className="text-[10px] uppercase font-bold tracking-tighter opacity-80">{format(day, 'eee', { locale: es }).substring(0, 2)}</span>
                                    <span className="text-lg font-black">{format(day, 'd')}</span>
                                </button>
                            ))}
                        </div>
                        <ScrollBar orientation="horizontal" className="invisible" />
                    </ScrollArea>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(add(currentDate, { months: 1 }))}><ChevronRight className="h-4 w-4" /></Button>
                </div>
            </Card>

            <Card className="border-none shadow-sm p-6 bg-white">
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

function ReportsView({ transactions, onEditTransaction, onDeleteTransaction }: any) {
    return (
        <Card className="border-none shadow-sm overflow-hidden bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-lg font-bold">Historial de Movimientos</CardTitle>
                    <CardDescription>Visualización de todas las transacciones del periodo.</CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm">Filtrar</Button>
                    <Button variant="outline" size="sm">Exportar</Button>
                </div>
            </CardHeader>
            <Table>
                <TableHeader className="bg-muted/30">
                    <TableRow>
                        <TableHead className="font-bold uppercase text-[10px]">Fecha</TableHead>
                        <TableHead className="font-bold uppercase text-[10px]">Empresa</TableHead>
                        <TableHead className="font-bold uppercase text-[10px]">Categoría / Subcategoría</TableHead>
                        <TableHead className="font-bold uppercase text-[10px]">Canal</TableHead>
                        <TableHead className="font-bold uppercase text-[10px]">Tipo</TableHead>
                        <TableHead className="text-right font-bold uppercase text-[10px]">Monto</TableHead>
                        <TableHead></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transactions.map((t: GastoDiario) => (
                        <TableRow key={t.id} className="hover:bg-muted/10">
                            <TableCell className="text-xs font-medium">{format(new Date(t.fecha), 'dd/MM/yyyy')}</TableCell>
                            <TableCell><Badge variant="outline" className="text-[10px] font-bold">{t.empresa}</Badge></TableCell>
                            <TableCell>
                                <div className="font-bold text-sm text-primary">{t.categoria_macro}</div>
                                <div className="text-[10px] text-muted-foreground uppercase tracking-tight">{t.subcategoria_especifica}</div>
                            </TableCell>
                            <TableCell className="text-[10px] font-bold text-muted-foreground uppercase">{t.canal_asociado?.replace('_', ' ')}</TableCell>
                            <TableCell><Badge variant={t.tipo_transaccion === 'INGRESO' ? 'default' : 'secondary'} className="text-[9px] font-black uppercase">{t.tipo_transaccion}</Badge></TableCell>
                            <TableCell className={cn("text-right font-black", t.tipo_transaccion === 'GASTO' ? "text-destructive" : "text-primary")}>
                                {t.tipo_transaccion === 'GASTO' ? '-' : ''}{money(t.monto)}
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-32">
                                        <DropdownMenuItem onClick={() => onEditTransaction(t)}><Pencil className="mr-2 h-3.5 w-3.5" /> Editar</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onDeleteTransaction(t.id!)} className="text-destructive"><Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <CardFooter className="bg-muted/10 p-4 border-t">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{transactions.length} registros encontrados</p>
            </CardFooter>
        </Card>
    );
}

function BudgetsView({ transactions }: any) {
    const categories: any[] = ['OPERATIVO', 'COMERCIAL', 'ADMINISTRATIVO', 'FINANCIERO', 'NOMINA'];
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat: string) => {
                const current = transactions.filter((t: any) => t.categoria_macro === cat && t.tipo_transaccion === 'GASTO').reduce((s: number, t: any) => s + (t.monto || 0), 0);
                const limit = 20000;
                const percentage = (current / limit) * 100;
                return (
                    <Card key={cat} className="border-none shadow-sm bg-white overflow-hidden">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-sm font-black uppercase tracking-widest">{cat}</CardTitle>
                                <Badge variant={percentage > 90 ? "destructive" : "secondary"} className="text-[10px]">{percentage.toFixed(0)}%</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <div className="flex justify-between items-end">
                                <span className="text-2xl font-black">{money(current)}</span>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">Meta: {money(limit)}</span>
                            </div>
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
        <div className="max-w-4xl mx-auto space-y-6">
            <Card className="border-none shadow-sm bg-white">
                <CardHeader>
                    <CardTitle className="text-lg font-bold">Configuración de Seguridad</CardTitle>
                    <CardDescription>Gestione los accesos y niveles de auditoría del sistema financiero.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between border-b pb-4">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-bold">Notificaciones de Presupuesto</Label>
                            <p className="text-xs text-muted-foreground">Recibir alertas cuando se alcance el 90% de una categoría.</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between border-b pb-4">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-bold">Modo Auditoría Estricta</Label>
                            <p className="text-xs text-muted-foreground">Requiere cargar comprobante para gastos superiores a $5,000.</p>
                        </div>
                        <Switch />
                    </div>
                    <div className="flex items-center justify-between border-b pb-4">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-bold">Exportación Automática</Label>
                            <p className="text-xs text-muted-foreground">Enviar reporte mensual PDF a administración.</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                </CardContent>
                <CardFooter className="gap-3">
                    <Button variant="outline" className="flex-1 font-bold"><Database className="mr-2 h-4 w-4" /> Respaldar Base</Button>
                    <Button className="flex-1 font-bold bg-[#2D5A4C] hover:bg-[#24483D]"><Shield className="mr-2 h-4 w-4" /> Guardar Cambios</Button>
                </CardFooter>
            </Card>
        </div>
    );
}

function TransactionForm({ transaction, onSubmit, onClose }: any) {
    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(expenseFormSchema),
        defaultValues: transaction ? {
            ...transaction,
            fecha: new Date(transaction.fecha),
        } : {
            fecha: new Date(),
            empresa: 'DK',
            tipo_transaccion: 'GASTO',
            categoria_macro: 'OPERATIVO',
            canal_asociado: 'MERCADO_LIBRE',
            es_fijo: false,
            es_recurrente: false,
            metodo_pago: 'TRANSFERENCIA',
            banco: 'BBVA',
            cuenta: 'FISCAL',
        }
    });

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-primary">
                        {transaction ? 'Editar' : 'Registrar'} Movimiento Financiero
                    </DialogTitle>
                    <DialogDescription className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                        Gestión técnica de ingresos y egresos dk/tal/mtm
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-8">
                    {/* Sección 1: Datos Financieros Base */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <FormField control={form.control} name="metodo_pago" render={({ field }) => (
                            <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Método Pago</Label>
                                <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-11 shadow-sm"><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>{METODOS_PAGO.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="banco" render={({ field }) => (
                            <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Banco</Label>
                                <Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger className="h-11 shadow-sm"><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>{BANCOS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="cuenta" render={({ field }) => (
                            <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tipo de Cuenta</Label>
                                <Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger className="h-11 shadow-sm"><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>{CUENTAS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
                            </FormItem>
                        )} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <FormField control={form.control} name="empresa" render={({ field }) => (
                            <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Empresa</Label>
                                <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-11 shadow-sm"><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>{EMPRESAS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="tipo_transaccion" render={({ field }) => (
                            <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tipo Transacción</Label>
                                <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-11 shadow-sm"><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>{TIPOS_TRANSACCION.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
                        </FormItem>
                        )} />
                        <FormField control={form.control} name="monto" render={({ field }) => (
                            <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Monto Total ($)</Label><FormControl><Input type="number" step="0.01" className="h-11 font-black text-xl border-2 focus:border-primary" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <FormField control={form.control} name="categoria_macro" render={({ field }) => (
                            <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Categoría Macro</Label>
                                <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-11 shadow-sm"><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>{CATEGORIAS_MACRO.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="subcategoria_especifica" render={({ field }) => (
                            <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Concepto / Subcategoría</Label><FormControl><Input placeholder="Ej: Energía Eléctrica" className="h-11 shadow-sm" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="canal_asociado" render={({ field }) => (
                            <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Canal Asociado</Label>
                                <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-11 shadow-sm"><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>{CANALES_ASOCIADOS.map(v => <SelectItem key={v} value={v}>{v.replace('_', ' ')}</SelectItem>)}</SelectContent></Select>
                            </FormItem>
                        )} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <FormField control={form.control} name="descripcion" render={({ field }) => (
                            <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Breve Descripción</Label><FormControl><Input placeholder="Referencia o detalle corto" className="h-11 shadow-sm" {...field} value={field.value ?? ''} /></FormControl></FormItem>
                        )} />
                        <div className="flex items-center gap-10 pt-6">
                            <FormField control={form.control} name="es_fijo" render={({ field }) => (<FormItem className="flex items-center gap-3 space-y-0"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><Label className="text-xs font-bold uppercase tracking-wider">Gasto Fijo</Label></FormItem>)} />
                            <FormField control={form.control} name="es_recurrente" render={({ field }) => (<FormItem className="flex items-center gap-3 space-y-0"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><Label className="text-xs font-bold uppercase tracking-wider">Recurrente</Label></FormItem>)} />
                        </div>
                    </div>

                    <FormField control={form.control} name="notas" render={({ field }) => (
                        <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Observaciones Técnicas</Label><FormControl><Textarea className="min-h-[120px] shadow-sm resize-none" placeholder="Detalles adicionales del movimiento..." {...field} value={field.value ?? ''} /></FormControl></FormItem>
                    )} />
                </div>

                <DialogFooter className="gap-3 pt-6 border-t">
                    <Button type="button" variant="outline" onClick={onClose} className="px-6 font-bold uppercase text-[10px] tracking-widest">Cancelar</Button>
                    <Button type="submit" className="bg-[#2D5A4C] hover:bg-[#24483D] px-10 font-black uppercase text-[11px] tracking-[0.2em] shadow-lg">
                        {transaction ? 'Guardar Cambios' : 'Registrar Movimiento'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}

