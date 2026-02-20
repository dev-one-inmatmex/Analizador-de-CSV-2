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
    EMPRESAS,
    TIPOS_TRANSACCION,
    IMPACTOS_FINANCIEROS,
    AREAS_FUNCIONALES,
    CANALES_ASOCIADOS,
    CLASIFICACIONES_OPERATIVAS,
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
            if (editingTransaction) {
                res = await supabase!.from('gastos_diarios').update(values as any).eq('id', editingTransaction.id);
            } else {
                res = await supabase!.from('gastos_diarios').insert(values as any);
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
        <div className="flex h-screen flex-col bg-muted/40 min-w-0">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6">
                <div className="flex items-center gap-4 min-w-0">
                    <SidebarTrigger />
                    <h1 className="text-xl font-bold truncate">Gastos Financieros</h1>
                    <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as any)} className="hidden md:flex min-w-0">
                        <TabsList className="bg-muted/50">
                            <TabsTrigger value="inicio"><Home className="mr-2 h-4 w-4" /> Inicio</TabsTrigger>
                            <TabsTrigger value="informes"><BarChartIcon className="mr-2 h-4 w-4" /> Informes</TabsTrigger>
                            <TabsTrigger value="presupuestos"><Wallet className="mr-2 h-4 w-4" /> Presupuestos</TabsTrigger>
                            <TabsTrigger value="configuracion"><Settings className="mr-2 h-4 w-4" /> Configuración</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" className="bg-[#2D5A4C] hover:bg-[#24483D]" onClick={() => handleOpenForm(null)}><Plus className="mr-2 h-4 w-4" /> Nueva</Button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-8">
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
                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Balance del Periodo</CardTitle></CardHeader>
                    <CardContent className="flex items-center gap-8">
                        <div className="h-[140px] w-[140px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={[{ name: 'Gastos', value: totalExpense, color: '#f43f5e' }, { name: 'Ahorro', value: Math.max(0, balance), color: '#3b82f6' }]} innerRadius={45} outerRadius={60} paddingAngle={5} dataKey="value">
                                        {[{ name: 'Gastos', value: totalExpense, color: '#f43f5e' }, { name: 'Ahorro', value: Math.max(0, balance), color: '#3b82f6' }].map((entry, index) => <Cell key={index} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip formatter={(v: number) => money(v)} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-3">
                            <div><p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Balance Neto</p><p className="text-xl font-black text-blue-600">{money(balance)}</p></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Estado del Presupuesto</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-end"><p className="text-2xl font-black">{money(totalExpense)} gastado</p><p className="text-xs text-muted-foreground">Meta: {money(50000)}</p></div>
                        <Progress value={(totalExpense / 50000) * 100} className="h-3" />
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-sm overflow-hidden">
                <div className="flex items-center px-4 py-3 bg-background border-b">
                    <Button variant="ghost" size="icon" onClick={() => setCurrentDate(add(currentDate, { months: -1 }))}><ChevronLeft /></Button>
                    <ScrollArea className="flex-1"><div className="flex gap-2 p-1">{daysInMonth.map((day, i) => (<button key={i} onClick={() => setCurrentDate(day)} className={cn("flex flex-col items-center justify-center min-w-[48px] h-14 rounded-lg", isSameDay(day, currentDate) ? "bg-[#2D5A4C] text-white shadow-md" : "bg-muted/30 text-muted-foreground")}>
                        <span className="text-[10px] uppercase font-bold">{format(day, 'eee', { locale: es }).substring(0, 2)}</span>
                        <span className="text-sm font-black">{format(day, 'd')}</span>
                    </button>))}</div><ScrollBar orientation="horizontal" className="invisible" /></ScrollArea>
                    <Button variant="ghost" size="icon" onClick={() => setCurrentDate(add(currentDate, { months: 1 }))}><ChevronRight /></Button>
                </div>
            </Card>

            <Card className="border-none shadow-sm p-6"><ResponsiveContainer width="100%" height={300}><RechartsBarChart data={barChartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={10} /><YAxis fontSize={10} tickFormatter={(v) => `$${v/1000}k`} /><Tooltip formatter={(v: number) => money(v)} /><Legend /><RechartsBar dataKey="Ingresos" fill="#3b82f6" radius={[2, 2, 0, 0]} /><RechartsBar dataKey="Gastos" fill="#f43f5e" radius={[2, 2, 0, 0]} /></RechartsBarChart></ResponsiveContainer></Card>
        </div>
    );
}

function ReportsView({ transactions, onEditTransaction, onDeleteTransaction }: any) {
    return (
        <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader><CardTitle>Historial de Movimientos</CardTitle></CardHeader>
            <Table>
                <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Empresa</TableHead><TableHead>Categoría / Subcategoría</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">Monto</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                    {transactions.map((t: GastoDiario) => (
                        <TableRow key={t.id}>
                            <TableCell className="text-xs">{format(new Date(t.fecha), 'dd/MM/yyyy')}</TableCell>
                            <TableCell><Badge variant="outline">{t.empresa}</Badge></TableCell>
                            <TableCell>
                                <div className="font-bold text-sm">{t.categoria_macro}</div>
                                <div className="text-[10px] text-muted-foreground uppercase">{t.subcategoria_especifica}</div>
                            </TableCell>
                            <TableCell><Badge variant={t.tipo_transaccion === 'INGRESO' ? 'default' : 'secondary'}>{t.tipo_transaccion}</Badge></TableCell>
                            <TableCell className={cn("text-right font-black", t.tipo_transaccion === 'GASTO' ? "text-destructive" : "text-primary")}>
                                {t.tipo_transaccion === 'GASTO' ? '-' : ''}{money(t.monto)}
                            </TableCell>
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => onEditTransaction(t)}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onDeleteTransaction(t.id!)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
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
                return (
                    <Card key={cat} className="border-none shadow-sm">
                        <CardHeader><CardTitle className="text-lg font-bold">{cat}</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between font-black"><span>{money(current)}</span><span className="text-xs text-muted-foreground">de {money(limit)}</span></div>
                            <Progress value={(current / limit) * 100} />
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}

function SettingsView() {
    return (
        <div className="max-w-4xl space-y-6">
            <Card className="border-none shadow-sm"><CardHeader><CardTitle>Configuración del Sistema</CardTitle></CardHeader><CardContent className="space-y-4">
                <div className="flex items-center justify-between"><Label>Notificaciones de Presupuesto</Label><Switch defaultChecked /></div>
                <div className="flex items-center justify-between"><Label>Modo Auditoría Estricta</Label><Switch /></div>
                <Button variant="outline" className="w-full">Exportar Base de Datos</Button>
            </CardContent></Card>
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <DialogHeader><DialogTitle className="text-2xl font-black uppercase tracking-tighter">{transaction ? 'Editar' : 'Nuevo'} Movimiento Financiero</DialogTitle></DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField control={form.control} name="empresa" render={({ field }) => (
                        <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Empresa</Label>
                            <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-11"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{EMPRESAS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="tipo_transaccion" render={({ field }) => (
                        <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tipo Transacción</Label>
                            <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-11"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{TIPOS_TRANSACCION.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="monto" render={({ field }) => (
                        <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Monto ($)</Label><FormControl><Input type="number" step="0.01" className="h-11 font-black text-lg" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />

                    <FormField control={form.control} name="categoria_macro" render={({ field }) => (
                        <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Categoría Macro</Label>
                            <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-11"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{CATEGORIAS_MACRO.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="subcategoria_especifica" render={({ field }) => (
                        <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Subcategoría / Concepto</Label><FormControl><Input placeholder="Ej: Pago de Luz" className="h-11" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="canal_asociado" render={({ field }) => (
                        <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Canal Asociado</Label>
                            <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-11"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{CANALES_ASOCIADOS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="metodo_pago" render={({ field }) => (
                        <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Método Pago</Label>
                            <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-11"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{METODOS_PAGO.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="banco" render={({ field }) => (
                        <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Banco</Label>
                            <Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger className="h-11"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{BANCOS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="cuenta" render={({ field }) => (
                        <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cuenta</Label>
                            <Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger className="h-11"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{CUENTAS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
                        </FormItem>
                    )} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="descripcion" render={({ field }) => (
                        <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Descripción Corta</Label><FormControl><Input placeholder="-" className="h-11" {...field} value={field.value ?? ''} /></FormControl></FormItem>
                    )} />
                    <div className="flex items-center gap-6 pt-6">
                        <FormField control={form.control} name="es_fijo" render={({ field }) => (<FormItem className="flex items-center gap-2 space-y-0"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><Label>Gasto Fijo</Label></FormItem>)} />
                        <FormField control={form.control} name="es_recurrente" render={({ field }) => (<FormItem className="flex items-center gap-2 space-y-0"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><Label>Recurrente</Label></FormItem>)} />
                    </div>
                </div>
                <FormField control={form.control} name="notas" render={({ field }) => (
                    <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Observaciones / Notas</Label><FormControl><Textarea className="min-h-[100px]" {...field} value={field.value ?? ''} /></FormControl></FormItem>
                )} />
                <DialogFooter className="gap-2 pt-4"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" className="bg-[#2D5A4C] hover:bg-[#24483D] px-8">{transaction ? 'Guardar Cambios' : 'Registrar Movimiento'}</Button></DialogFooter>
            </form>
        </Form>
    );
}
