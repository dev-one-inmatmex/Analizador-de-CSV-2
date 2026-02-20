
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
  Info, Tag, Target, Settings, User, Bell, Shield, Database, X, Search,
  PieChart as PieChartIcon, TrendingDown, TrendingUp
} from 'lucide-react';
import { 
  Bar as RechartsBar, BarChart as RechartsBarChart, CartesianGrid, Cell, Legend, Pie, PieChart, 
  ResponsiveContainer, Tooltip, XAxis, YAxis, Cell as RechartsCell
} from 'recharts';

import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { 
    expenseFormSchema, 
    TransactionFormValues,
    EMPRESAS,
    TIPOS_TRANSACCION,
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
const COLORS = ['#2D5A4C', '#3b82f6', '#f43f5e', '#eab308', '#8b5cf6', '#06b6d4', '#f97316'];

export default function OperationsPage() {
    const [currentView, setCurrentView] = React.useState<'inicio' | 'informes' | 'presupuestos' | 'configuracion'>('inicio');
    const [transactions, setTransactions] = React.useState<GastoDiario[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingTransaction, setEditingTransaction] = React.useState<GastoDiario | null>(null);
    const [dateFilter, setDateFilter] = React.useState<'day' | 'week' | 'month' | 'year'>('month');
    const [selectedAccount, setSelectedAccount] = React.useState('Todas');
    const [currentDate, setCurrentDate] = React.useState(startOfDay(new Date()));

    const { toast } = useToast();

    const fetchAllData = React.useCallback(async () => {
        if (!supabase) return;
        setIsLoading(true);
        try {
            let start, end;
            if (dateFilter === 'day') { start = startOfDay(currentDate); end = endOfDay(currentDate); }
            else if (dateFilter === 'week') { start = startOfWeek(currentDate, { locale: es }); end = endOfWeek(currentDate, { locale: es }); }
            else if (dateFilter === 'year') { start = startOfYear(currentDate); end = endOfYear(currentDate); }
            else { start = startOfMonth(currentDate); end = endOfMonth(currentDate); }

            let q = supabase.from('gastos_diarios').select('*').gte('fecha', formatISO(start)).lte('fecha', formatISO(end));

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

    React.useEffect(() => { 
        fetchAllData(); 
    }, [fetchAllData]);

    const handleSave = async (values: TransactionFormValues) => {
        try {
            if (!supabase) return;
            let res;
            const dataToSave = { ...values, fecha: format(values.fecha, 'yyyy-MM-dd') };
            if (editingTransaction) {
                res = await supabase.from('gastos_diarios').update(dataToSave as any).eq('id', editingTransaction.id);
            } else {
                res = await supabase.from('gastos_diarios').insert(dataToSave as any);
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

    const handleDelete = React.useCallback(async (id: number) => {
        try {
            if (!supabase) return;
            const { error } = await supabase.from('gastos_diarios').delete().eq('id', id);
            if (error) throw error;
            toast({ title: "Eliminado", description: "El registro ha sido borrado." });
            fetchAllData();
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        }
    }, [fetchAllData, toast]);

    const handleOpenForm = React.useCallback((t: GastoDiario | null) => {
        setEditingTransaction(t);
        setIsFormOpen(true);
    }, []);

    return (
        <div className="flex h-screen flex-col bg-muted/20 min-w-0">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6">
                <div className="flex items-center gap-6 min-w-0">
                    <SidebarTrigger />
                    <h1 className="text-xl font-bold tracking-tight whitespace-nowrap hidden lg:block">Gastos Financieros</h1>
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
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground"><Bell className="h-4 w-4" /></Button>
                    <Button size="sm" className="bg-[#2D5A4C] hover:bg-[#24483D] font-bold h-9" onClick={() => handleOpenForm(null)}><Plus className="mr-1.5 h-4 w-4" /> Nueva</Button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 no-scrollbar">
                {currentView === 'inicio' && <InsightsView transactions={transactions} isLoading={isLoading} currentDate={currentDate} setCurrentDate={setCurrentDate} />}
                {currentView === 'informes' && <ReportsView transactions={transactions} isLoading={isLoading} onEditTransaction={handleOpenForm} onDeleteTransaction={handleDelete} />}
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
    const { totalExpense, balance, totalIncome } = React.useMemo(() => {
        let expense = 0, income = 0;
        transactions.forEach((t: any) => {
            if (t.tipo_transaccion === 'GASTO') expense += (t.monto || 0);
            else if (t.tipo_transaccion === 'INGRESO') income += (t.monto || 0);
        });
        return { totalExpense: expense, totalIncome: income, balance: income - expense };
    }, [transactions]);

    const barChartData = React.useMemo(() => {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        const steps = eachDayOfInterval({ start, end });
        return steps.map(step => {
            const dayT = transactions.filter((t: any) => isSameDay(startOfDay(new Date(t.fecha)), step));
            let expense = 0, income = 0;
            dayT.forEach((t: any) => {
                if (t.tipo_transaccion === 'GASTO') expense += (t.monto || 0);
                else if (t.tipo_transaccion === 'INGRESO') income += (t.monto || 0);
            });
            return { name: format(step, 'd'), Ingresos: income, Gastos: expense };
        });
    }, [transactions, currentDate]);

    const daysInMonth = React.useMemo(() => {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        return eachDayOfInterval({ start, end });
    }, [currentDate]);

    if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="pb-2"><CardTitle className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Balance del Periodo</CardTitle></CardHeader>
                    <CardContent className="flex items-center justify-center gap-12 py-6">
                        <div className="h-[140px] w-[140px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={[
                                            { name: 'Gastos', value: totalExpense }, 
                                            { name: 'Balance', value: Math.max(0, balance) }
                                        ]} 
                                        innerRadius={50} 
                                        outerRadius={65} 
                                        paddingAngle={4} 
                                        dataKey="value"
                                    >
                                        <RechartsCell fill="#f43f5e" />
                                        <RechartsCell fill="#3b82f6" />
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
                <Card className="border-none shadow-sm bg-white flex flex-col justify-center overflow-hidden">
                    <CardHeader className="pb-2"><CardTitle className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Estado del Presupuesto</CardTitle></CardHeader>
                    <CardContent className="space-y-6 py-6">
                        <div className="flex justify-between items-baseline">
                            <p className="text-4xl font-black">{money(totalExpense)} <span className="text-lg font-medium text-muted-foreground ml-1">gastado</span></p>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Meta: {money(50000)}</p>
                        </div>
                        <Progress value={Math.min(100, (totalExpense / 50000) * 100)} className="h-3 bg-muted" />
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-sm overflow-hidden bg-white">
                <div className="flex items-center px-2 py-4 border-b">
                    <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => setCurrentDate(add(currentDate, { months: -1 }))}><ChevronLeft className="h-5 w-5" /></Button>
                    <ScrollArea className="flex-1">
                        <div className="flex gap-2 px-2 pb-2">
                            {daysInMonth.map((day, i) => (
                                <button 
                                    key={i} 
                                    onClick={() => setCurrentDate(startOfDay(day))} 
                                    className={cn(
                                        "flex flex-col items-center justify-center min-w-[54px] h-16 rounded-xl transition-all", 
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
                    <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => setCurrentDate(add(currentDate, { months: 1 }))}><ChevronRight className="h-5 w-5" /></Button>
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
    const summaryData = React.useMemo(() => {
        const categoryMap: Record<string, number> = {};
        const areaMap: Record<string, number> = {};
        const companyMap: Record<string, number> = {};

        transactions.forEach((t: GastoDiario) => {
            if (t.tipo_transaccion === 'GASTO') {
                categoryMap[t.categoria_macro] = (categoryMap[t.categoria_macro] || 0) + (t.monto || 0);
                if (t.area_funcional) areaMap[t.area_funcional] = (areaMap[t.area_funcional] || 0) + (t.monto || 0);
                companyMap[t.empresa] = (companyMap[t.empresa] || 0) + (t.monto || 0);
            }
        });

        return {
            categories: Object.entries(categoryMap).map(([name, value]) => ({ name, value })),
            areas: Object.entries(areaMap).map(([name, value]) => ({ name: name.replace('_', ' '), value })),
            companies: Object.entries(companyMap).map(([name, value]) => ({ name, value }))
        };
    }, [transactions]);

    if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">Gasto por Categoría Macro</CardTitle></CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={summaryData.categories} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={5}>
                                    {summaryData.categories.map((_, i) => <RechartsCell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(v: number) => money(v)} />
                                <Legend iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">Distribución por Área Funcional</CardTitle></CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart data={summaryData.areas} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" fontSize={9} width={80} axisLine={false} tickLine={false} />
                                <Tooltip formatter={(v: number) => money(v)} />
                                <RechartsBar dataKey="value" fill="#2D5A4C" radius={[0, 4, 4, 0]} barSize={15} />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">Gasto por Empresa</CardTitle></CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={summaryData.companies} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={5}>
                                    {summaryData.companies.map((_, i) => <RechartsCell key={i} fill={COLORS[(i+2) % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(v: number) => money(v)} />
                                <Legend iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-sm overflow-hidden bg-white">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-bold">Historial de Movimientos</CardTitle>
                        <CardDescription>Visualización detallada de transacciones auditadas.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-widest">Filtros</Button>
                        <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-widest">Exportar CSV</Button>
                    </div>
                </CardHeader>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead className="font-bold uppercase text-[10px]">Fecha</TableHead>
                                <TableHead className="font-bold uppercase text-[10px]">Empresa</TableHead>
                                <TableHead className="font-bold uppercase text-[10px]">Categoría / Concepto</TableHead>
                                <TableHead className="font-bold uppercase text-[10px]">Área Funcional</TableHead>
                                <TableHead className="font-bold uppercase text-[10px]">Canal</TableHead>
                                <TableHead className="font-bold uppercase text-[10px]">Tipo</TableHead>
                                <TableHead className="text-right font-bold uppercase text-[10px]">Monto</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.length > 0 ? (
                                transactions.map((t: GastoDiario) => (
                                    <TableRow key={t.id} className="hover:bg-muted/5 group">
                                        <TableCell className="text-[11px] font-medium">{format(new Date(t.fecha), 'dd/MM/yyyy')}</TableCell>
                                        <TableCell><Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0">{t.empresa}</Badge></TableCell>
                                        <TableCell>
                                            <div className="font-black text-[11px] text-primary leading-tight">{t.categoria_macro}</div>
                                            <div className="text-[10px] text-muted-foreground uppercase tracking-tight">{t.subcategoria_especifica}</div>
                                        </TableCell>
                                        <TableCell className="text-[9px] font-bold text-muted-foreground uppercase">{t.area_funcional?.replace('_', ' ') || '-'}</TableCell>
                                        <TableCell className="text-[9px] font-bold text-muted-foreground uppercase">{t.canal_asociado?.replace('_', ' ')}</TableCell>
                                        <TableCell><Badge variant={t.tipo_transaccion === 'INGRESO' ? 'default' : 'secondary'} className="text-[8px] font-black uppercase px-1 py-0">{t.tipo_transaccion}</Badge></TableCell>
                                        <TableCell className={cn("text-right font-black text-sm", t.tipo_transaccion === 'GASTO' ? "text-destructive" : "text-primary")}>
                                            {t.tipo_transaccion === 'GASTO' ? '-' : ''}{money(t.monto)}
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-32">
                                                    <DropdownMenuItem onClick={() => onEditTransaction(t)}><Pencil className="mr-2 h-3.5 w-3.5" /> Editar</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => onDeleteTransaction(t.id!)} className="text-destructive"><Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <Info className="h-8 w-8 opacity-20" />
                                            <p className="text-xs font-bold uppercase tracking-widest">No hay movimientos registrados en este periodo</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <CardFooter className="bg-muted/10 p-4 border-t">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{transactions.length} registros auditados</p>
                </CardFooter>
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
                    <Card key={cat} className="border-none shadow-sm bg-white overflow-hidden transition-all hover:shadow-md">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest">{cat}</CardTitle>
                                <Badge variant={percentage > 90 ? "destructive" : "secondary"} className="text-[9px] px-1.5 py-0">{percentage.toFixed(0)}%</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <div className="flex justify-between items-end">
                                <span className="text-2xl font-black">{money(current)}</span>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">Presupuesto: {money(limit)}</span>
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
            <Card className="border-none shadow-sm bg-white overflow-hidden">
                <CardHeader>
                    <CardTitle className="text-lg font-bold">Configuración Financiera</CardTitle>
                    <CardDescription>Gestión técnica de límites y alertas operativas.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between border-b pb-4">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-bold">Alertas de Presupuesto</Label>
                            <p className="text-[11px] text-muted-foreground uppercase tracking-tight">Notificar cuando una categoría supere el 85% de su límite.</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between border-b pb-4">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-bold">Validación de Comprobantes</Label>
                            <p className="text-[11px] text-muted-foreground uppercase tracking-tight">Exigir carga de archivo para gastos mayores a $1,500.</p>
                        </div>
                        <Switch />
                    </div>
                    <div className="flex items-center justify-between border-b pb-4">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-bold">Consolidación Bancaria</Label>
                            <p className="text-[11px] text-muted-foreground uppercase tracking-tight">Sincronizar saldos de cuentas BBVA y Mercado Pago.</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                </CardContent>
                <CardFooter className="gap-3">
                    <Button variant="outline" className="flex-1 font-bold text-[10px] uppercase tracking-widest"><Database className="mr-2 h-4 w-4" /> Respaldar Datos</Button>
                    <Button className="flex-1 font-bold bg-[#2D5A4C] hover:bg-[#24483D] text-[10px] uppercase tracking-widest"><Shield className="mr-2 h-4 w-4" /> Guardar Cambios</Button>
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
            canal_asociado: 'GENERAL',
            es_fijo: false,
            es_recurrente: false,
            metodo_pago: 'TRANSFERENCIA',
            banco: 'BBVA',
            cuenta: 'OPERATIVA',
        }
    });

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-primary">
                        {transaction ? 'Editar' : 'Registrar'} Movimiento
                    </DialogTitle>
                    <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Sincronización técnica dk/tal/mtm
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField control={form.control} name="metodo_pago" render={({ field }) => (
                        <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Método Pago</Label>
                            <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-10 text-xs font-bold"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{METODOS_PAGO.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="banco" render={({ field }) => (
                        <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Banco</Label>
                            <Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger className="h-10 text-xs font-bold"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{BANCOS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="cuenta" render={({ field }) => (
                        <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tipo de Cuenta</Label>
                            <Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger className="h-10 text-xs font-bold"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{CUENTAS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
                        </FormItem>
                    )} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField control={form.control} name="empresa" render={({ field }) => (
                        <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Empresa</Label>
                            <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-10 text-xs font-bold"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{EMPRESAS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="tipo_transaccion" render={({ field }) => (
                        <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tipo Transacción</Label>
                            <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-10 text-xs font-bold"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{TIPOS_TRANSACCION.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="monto" render={({ field }) => (
                        <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Monto ($)</Label><FormControl><Input type="number" step="0.01" className="h-10 font-black text-lg" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField control={form.control} name="categoria_macro" render={({ field }) => (
                        <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Categoría Macro</Label>
                            <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-10 text-xs font-bold"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{CATEGORIAS_MACRO.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="subcategoria_especifica" render={({ field }) => (
                        <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Concepto</Label><FormControl><Input placeholder="Ej: Luz, Renta, Nómina" className="h-10 text-xs font-bold" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="canal_asociado" render={({ field }) => (
                        <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Canal</Label>
                            <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-10 text-xs font-bold"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{CANALES_ASOCIADOS.map(v => <SelectItem key={v} value={v}>{v.replace('_', ' ')}</SelectItem>)}</SelectContent></Select>
                        </FormItem>
                    )} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="descripcion" render={({ field }) => (
                        <FormItem><Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Descripción</Label><FormControl><Input placeholder="Referencia corta" className="h-10 text-xs" {...field} value={field.value ?? ''} /></FormControl></FormItem>
                    )} />
                    <div className="flex items-center gap-8 pt-6">
                        <FormField control={form.control} name="es_fijo" render={({ field }) => (<FormItem className="flex items-center gap-2 space-y-0"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><Label className="text-[9px] font-bold uppercase">Gasto Fijo</Label></FormItem>)} />
                        <FormField control={form.control} name="es_recurrente" render={({ field }) => (<FormItem className="flex items-center gap-2 space-y-0"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><Label className="text-[9px] font-bold uppercase">Recurrente</Label></FormItem>)} />
                    </div>
                </div>

                <DialogFooter className="gap-3 pt-6 border-t">
                    <Button type="button" variant="outline" onClick={onClose} className="px-6 font-bold uppercase text-[10px] tracking-widest">Cancelar</Button>
                    <Button type="submit" className="bg-[#2D5A4C] hover:bg-[#24483D] px-8 font-black uppercase text-[10px] tracking-widest">
                        {transaction ? 'Guardar Cambios' : 'Registrar Movimiento'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}
