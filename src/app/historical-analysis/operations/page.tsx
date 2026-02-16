
'use client';

import * as React from 'react';
import { add, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths, getDaysInMonth, startOfDay, startOfWeek, endOfWeek, startOfYear, endOfYear, eachMonthOfInterval, eachWeekOfInterval, formatISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as XLSX from 'xlsx';

import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import type { finanzas } from '@/types/database';

import { addExpenseAction, updateExpenseAction, deleteExpenseAction } from './actions';
import { expenseFormSchema, paymentMethods, TransactionFormValues } from './schemas';

import {
  ArrowDown,
  ArrowUp,
  BarChart,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Cog,
  Home,
  Landmark,
  Plus,
  Trash2,
  Edit,
  MoreVertical,
  Download,
  Settings,
  List,
  Pencil,
} from 'lucide-react';
import { Bar as RechartsBar, BarChart as RechartsBarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabaseClient';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


type View = 'inicio' | 'informes' | 'presupuestos' | 'configuracion';
type DateFilter = 'day' | 'week' | 'month' | 'year';
type TransactionTypeFilter = 'all' | 'gasto' | 'ingreso';

const initialCategories = ['Comida', 'Transporte', 'Insumos', 'Servicios', 'Marketing', 'Renta', 'Sueldos', 'Otro'];
type Budget = { id: number; category: string; amount: number; spent: number; startDate: Date; endDate: Date; };

const money = (v?: number | null) => v === null || v === undefined ? '$0.00' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);

// --- Main Page Component ---
export default function OperationsPage() {
  const [currentView, setCurrentView] = React.useState<View>('inicio');
  const [transactions, setTransactions] = React.useState<finanzas[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingTransaction, setEditingTransaction] = React.useState<finanzas | null>(null);
  const [categories, setCategories] = React.useState(initialCategories);

  const [dateFilter, setDateFilter] = React.useState<DateFilter>(() => {
    if (typeof window !== 'undefined') {
        return (localStorage.getItem('operationsDateFilter') as DateFilter) || 'month';
    }
    return 'month';
  });
  
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [transactionTypeFilter, setTransactionTypeFilter] = React.useState<TransactionTypeFilter>('all');

  const isMobile = useIsMobile();
  const { toast } = useToast();

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('operationsDateFilter', dateFilter);
    }
  }, [dateFilter]);

  React.useEffect(() => {
    const fetchTransactions = async () => {
      if (!supabase) {
        toast({ title: 'Error de Conexión', description: 'No se pudo conectar a la base de datos.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      setIsLoading(true);

      let startDate, endDate;
      switch(dateFilter) {
        case 'day':
          startDate = startOfDay(currentDate);
          endDate = endOfDay(currentDate);
          break;
        case 'week':
          startDate = startOfWeek(currentDate, { locale: es });
          endDate = endOfWeek(currentDate, { locale: es });
          break;
        case 'year':
          startDate = startOfYear(currentDate);
          endDate = endOfYear(currentDate);
          break;
        case 'month':
        default:
          startDate = startOfMonth(currentDate);
          endDate = endOfMonth(currentDate);
          break;
      }

      const { data, error } = await supabase
        .from('finanzas')
        .select('*')
        .gte('fecha', formatISO(startDate))
        .lte('fecha', formatISO(endDate))
        .order('fecha', { ascending: false });

      if (error) {
        toast({ title: 'Error al Cargar Datos', description: error.message, variant: 'destructive' });
      } else {
        setTransactions(data as finanzas[]);
      }
      setIsLoading(false);
    };
    fetchTransactions();
  }, [currentDate, dateFilter, toast]);

  const handleOpenForm = (transaction: finanzas | null = null) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  };
  
  const handleFormSubmit = async (values: TransactionFormValues) => {
    try {
        let result;
        const mappedValues = {
            ...values,
            empresa: 'Mi Empresa',
            subcategoria: null,
            capturista: null,
        };

        if (editingTransaction) {
            result = await updateExpenseAction(editingTransaction.id, mappedValues);
        } else {
            result = await addExpenseAction(mappedValues);
        }

        if (result.error) {
            throw new Error(result.error);
        }

        toast({
            title: `Transacción ${editingTransaction ? 'actualizada' : 'añadida'}`,
            description: 'El registro se ha guardado exitosamente.',
        });

        setIsFormOpen(false);
        setEditingTransaction(null);
        
        // Refetch data by resetting the date, which triggers the useEffect
        setCurrentDate(new Date(values.fecha));

    } catch (e: any) {
        toast({
            title: 'Error al Guardar',
            description: e.message || 'Ocurrió un error inesperado.',
            variant: 'destructive',
        });
    }
  };
  
  const handleDeleteTransaction = async (id: number) => {
      try {
          const result = await deleteExpenseAction(id);
          if (result.error) throw new Error(result.error);
          toast({ title: 'Transacción Eliminada', description: 'El registro ha sido eliminado exitosamente.' });
          setTransactions(prev => prev.filter(t => t.id !== id));
      } catch (e: any) {
           toast({ title: 'Error al Eliminar', description: e.message, variant: 'destructive' });
      }
  };

  const handleCurrentViewChange = (view: string) => {
    setCurrentView(view as View);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'inicio':
        return <InicioView 
                    transactions={transactions}
                    isLoading={isLoading}
                    dateFilter={dateFilter}
                    setDateFilter={setDateFilter}
                    currentDate={currentDate}
                    setCurrentDate={setCurrentDate}
                    onEdit={handleOpenForm}
                    onDelete={handleDeleteTransaction}
                    transactionTypeFilter={transactionTypeFilter}
                    setTransactionTypeFilter={setTransactionTypeFilter}
                    onAddTransaction={() => handleOpenForm(null)}
                />;
      case 'informes':
        return <ReportsView 
                  transactions={transactions} 
                  dateFilter={dateFilter}
                  setDateFilter={setDateFilter}
                  currentDate={currentDate}
                  setCurrentDate={setCurrentDate}
                  transactionTypeFilter={transactionTypeFilter}
                  setTransactionTypeFilter={setTransactionTypeFilter}
                />;
      case 'presupuestos':
        return <BudgetsView categories={categories} transactions={transactions} />;
      case 'configuracion':
        return <ConfiguracionView 
                  categories={categories} 
                  setCategories={setCategories}
                  dateFilter={dateFilter}
                  setDateFilter={setDateFilter}
               />;
      default:
        return null;
    }
  };

  const FormComponent = (
    <TransactionForm
      isOpen={isFormOpen}
      setIsOpen={setIsFormOpen}
      onSubmit={handleFormSubmit}
      transaction={editingTransaction}
      categories={categories}
      setCategories={setCategories}
    />
  );
  
  return (
    <div className="flex h-screen w-full flex-col bg-muted/40">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
                <SidebarTrigger />
                <h1 className="text-xl font-bold tracking-tight">Gastos Diarios</h1>
            </div>
            <div className="flex items-center gap-4">
                {!isMobile && (
                    <Tabs value={currentView} onValueChange={handleCurrentViewChange} className="w-auto">
                        <TabsList>
                            <TabsTrigger value="inicio"><Home className="mr-2 h-4 w-4" />Inicio</TabsTrigger>
                            <TabsTrigger value="informes"><BarChart className="mr-2 h-4 w-4" />Informes</TabsTrigger>
                            <TabsTrigger value="presupuestos"><Landmark className="mr-2 h-4 w-4" />Presupuestos</TabsTrigger>
                            <TabsTrigger value="configuracion"><Cog className="mr-2 h-4 w-4" />Configuración</TabsTrigger>
                        </TabsList>
                    </Tabs>
                )}
                 {isMobile && (
                    <Button onClick={() => handleOpenForm(null)} size="icon">
                        <Plus />
                        <span className="sr-only">Añadir Transacción</span>
                    </Button>
                 )}
            </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-6xl">{renderContent()}</div>
        </main>
        
        {isMobile && <BottomNav currentView={currentView} setView={handleCurrentViewChange} />}
        
        <Dialog open={!isMobile && isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className="flex max-h-[90vh] flex-col p-0 sm:max-w-md">
              <div className="flex-1 overflow-hidden">
                {FormComponent}
              </div>
            </DialogContent>
        </Dialog>
        <Sheet open={isMobile && isFormOpen} onOpenChange={setIsFormOpen}>
            <SheetContent side="bottom" className="flex h-[90vh] flex-col rounded-t-2xl p-0">
              {FormComponent}
            </SheetContent>
        </Sheet>
    </div>
  );
}


// --- Sub-components for OperationsPage ---

function PeriodNavigator({ dateFilter, setDateFilter, currentDate, setCurrentDate }: any) {
  const handleDateChange = (direction: 'next' | 'prev') => {
    const amount = direction === 'prev' ? -1 : 1;
    let newDate;
    switch(dateFilter) {
      case 'day': newDate = add(currentDate, { days: amount }); break;
      case 'week': newDate = add(currentDate, { weeks: amount }); break;
      case 'year': newDate = add(currentDate, { years: amount }); break;
      case 'month':
      default: newDate = add(currentDate, { months: amount }); break;
    }
    setCurrentDate(newDate);
  };
  
  const getFormattedDate = () => {
    switch(dateFilter) {
      case 'day': return format(currentDate, "eeee, dd 'de' MMMM 'de' yyyy", { locale: es });
      case 'week': 
        const start = startOfWeek(currentDate, { locale: es });
        const end = endOfWeek(currentDate, { locale: es });
        return `Semana del ${format(start, 'dd/MM')} al ${format(end, 'dd/MM/yyyy')}`;
      case 'year': return format(currentDate, "yyyy");
      case 'month':
      default: return format(currentDate, "MMMM yyyy", { locale: es });
    }
  };

  return (
    <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
        <Select value={dateFilter} onValueChange={(val) => setDateFilter(val as DateFilter)}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Seleccionar periodo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Diario</SelectItem>
            <SelectItem value="week">Semanal</SelectItem>
            <SelectItem value="month">Mensual</SelectItem>
            <SelectItem value="year">Anual</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 rounded-lg border bg-background p-1">
            <Button variant="ghost" size="icon" onClick={() => handleDateChange('prev')}><ChevronLeft className="h-5 w-5" /></Button>
            <span className="w-32 text-center font-semibold capitalize md:w-56">{getFormattedDate()}</span>
            <Button variant="ghost" size="icon" onClick={() => handleDateChange('next')}><ChevronRight className="h-5 w-5" /></Button>
        </div>
    </div>
  );
}

function InicioView({ transactions, isLoading, dateFilter, setDateFilter, currentDate, setCurrentDate, onEdit, onDelete, transactionTypeFilter, setTransactionTypeFilter, onAddTransaction }: any) {
    const isMobile = useIsMobile();
    const [selectedDay, setSelectedDay] = React.useState(new Date());

    React.useEffect(() => {
        setSelectedDay(currentDate);
    }, [currentDate]);
    
    const { periodBalance, dailyTransactions, daysOfPeriod } = React.useMemo(() => {
        const income = transactions.filter((t: finanzas) => t.tipo_transaccion === 'ingreso').reduce((sum: number, t: finanzas) => sum + t.monto, 0);
        const expense = transactions.filter((t: finanzas) => t.tipo_transaccion === 'gasto').reduce((sum: number, t: finanzas) => sum + t.monto, 0);
        
        let days: Date[] = [];
        if (dateFilter === 'month') {
          days = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
        }

        const dailyForPeriod = dateFilter === 'month' ? transactions.filter((t: finanzas) => isSameDay(new Date(t.fecha), selectedDay)) : transactions;

        const filteredDaily = dailyForPeriod.filter((t: finanzas) => transactionTypeFilter === 'all' || t.tipo_transaccion === transactionTypeFilter);

        return { 
            periodBalance: { income, expense, total: income - expense },
            dailyTransactions: filteredDaily,
            daysOfPeriod: days
        };
    }, [transactions, selectedDay, dateFilter, currentDate, transactionTypeFilter]);

    return (
        <div className="space-y-6">
             <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                <div>
                    <h2 className="text-2xl font-bold">Hola, Usuario! 👋</h2>
                    <p className="text-muted-foreground">Aquí tienes el resumen de tus finanzas.</p>
                </div>
                {!isMobile && (
                  <Button onClick={onAddTransaction}>
                      <Plus className="mr-2 h-4 w-4" />
                      Añadir Transacción
                  </Button>
                )}
            </div>

            <PeriodNavigator 
                dateFilter={dateFilter}
                setDateFilter={setDateFilter}
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
            />

            <Card>
                <CardHeader>
                    <CardTitle>Balance del Periodo</CardTitle>
                    <CardDescription>Resumen de tus ingresos y gastos para el periodo seleccionado.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-3">
                     <div className="flex items-center gap-4 bg-background p-4">
                        <div className="rounded-full bg-green-100 p-3 text-green-600 dark:bg-green-900/50 dark:text-green-400"><ArrowUp/></div>
                        <div><p className="text-sm text-muted-foreground">Ingresos</p><p className="text-xl font-bold">{money(periodBalance.income)}</p></div>
                    </div>
                     <div className="flex items-center gap-4 bg-background p-4">
                        <div className="rounded-full bg-red-100 p-3 text-red-600 dark:bg-red-900/50 dark:text-red-400"><ArrowDown/></div>
                        <div><p className="text-sm text-muted-foreground">Gastos</p><p className="text-xl font-bold">{money(periodBalance.expense)}</p></div>
                    </div>
                     <div className="flex items-center gap-4 bg-background p-4">
                        <div className="rounded-full bg-primary/10 p-3 text-primary"><Landmark/></div>
                        <div><p className="text-sm text-muted-foreground">Balance Total</p><p className="text-xl font-bold">{money(periodBalance.total)}</p></div>
                    </div>
                </CardContent>
            </Card>

            {dateFilter === 'month' && (
                <div>
                    <h3 className="mb-3 text-lg font-semibold">Transacciones del Día</h3>
                    <div className="flex space-x-2 overflow-x-auto pb-4">
                        {daysOfPeriod.map(day => (
                            <Button key={day.toString()} variant={isSameDay(day, selectedDay) ? "default" : "outline"}
                                className="flex flex-col h-16 w-14 shrink-0 rounded-xl"
                                onClick={() => setSelectedDay(day)}>
                                <span className="text-xs font-normal capitalize">{format(day, 'E', { locale: es })}</span>
                                <span className="text-xl font-bold">{format(day, 'd')}</span>
                            </Button>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="flex items-center justify-start gap-4">
              <Label>Filtrar por tipo:</Label>
              <Tabs value={transactionTypeFilter} onValueChange={(v) => setTransactionTypeFilter(v as any)} className="w-auto">
                  <TabsList>
                      <TabsTrigger value="all">Todas</TabsTrigger>
                      <TabsTrigger value="ingreso">Ingresos</TabsTrigger>
                      <TabsTrigger value="gasto">Gastos</TabsTrigger>
                  </TabsList>
              </Tabs>
            </div>

            {isLoading ? <p className="text-center text-muted-foreground pt-4">Cargando transacciones...</p> : (
            <div className="space-y-4">
                {dailyTransactions.length === 0 ? <p className="text-center text-muted-foreground pt-4">No hay transacciones para esta selección.</p>
                : isMobile ? dailyTransactions.map((t: finanzas) => <TransactionCard key={t.id} transaction={t} onEdit={onEdit} onDelete={onDelete} />)
                : <TransactionTable transactions={dailyTransactions} onEdit={onEdit} onDelete={onDelete} />}
            </div>
            )}
        </div>
    );
}

function ReportsView({ transactions, dateFilter, setDateFilter, currentDate, setCurrentDate, transactionTypeFilter, setTransactionTypeFilter }: { transactions: finanzas[], dateFilter: DateFilter, setDateFilter: (f: DateFilter) => void, currentDate: Date, setCurrentDate: (d: Date) => void, transactionTypeFilter: TransactionTypeFilter, setTransactionTypeFilter: (v: TransactionTypeFilter) => void }) {
    const { toast } = useToast();
    const reportData = React.useMemo(() => {
        if (!transactions) return {
            totalIncome: 0, totalExpense: 0, netBalance: 0, expensesByCategory: [],
            expensesByPaymentMethod: [], trendData: [],
        };
        
        const filteredTransactions = transactions.filter(t => transactionTypeFilter === 'all' || t.tipo_transaccion === transactionTypeFilter);

        const totalIncome = filteredTransactions.filter(t => t.tipo_transaccion === 'ingreso').reduce((sum, t) => sum + t.monto, 0);
        const totalExpense = filteredTransactions.filter(t => t.tipo_transaccion === 'gasto').reduce((sum, t) => sum + t.monto, 0);
        const netBalance = totalIncome - totalExpense;

        const expensesByCategory = filteredTransactions.filter(t => t.tipo_transaccion === 'gasto').reduce((acc, t) => {
            const category = t.categoria || 'Sin Categoría';
            const existing = acc.find(item => item.name === category);
            if (existing) existing.value += t.monto; else acc.push({ name: category, value: t.monto });
            return acc;
        }, [] as { name: string, value: number }[]);
        
        const expensesByPaymentMethod = filteredTransactions.filter(t => t.tipo_transaccion === 'gasto').reduce((acc, t) => {
            const method = t.metodo_pago || 'Otro';
            const existing = acc.find(item => item.name === method);
            if (existing) existing.value += t.monto; else acc.push({ name: method, value: t.monto });
            return acc;
        }, [] as { name: string, value: number }[]);
        
        let trendData: { name: string, Ingresos: number, Gastos: number }[] = [];
        if (dateFilter === 'year') {
            const months = eachMonthOfInterval({ start: startOfYear(currentDate), end: endOfYear(currentDate) });
            trendData = months.map(month => {
                const income = filteredTransactions.filter(t => t.tipo_transaccion === 'ingreso' && isSameDay(startOfMonth(new Date(t.fecha)), month)).reduce((sum, t) => sum + t.monto, 0);
                const expense = filteredTransactions.filter(t => t.tipo_transaccion === 'gasto' && isSameDay(startOfMonth(new Date(t.fecha)), month)).reduce((sum, t) => sum + t.monto, 0);
                return { name: format(month, 'MMM', { locale: es }), Ingresos: income, Gastos: expense };
            });
        } else if (dateFilter !== 'day') { // For week and month
            const days = dateFilter === 'week' 
                ? eachDayOfInterval({ start: startOfWeek(currentDate, { locale: es }), end: endOfWeek(currentDate, { locale: es }) })
                : eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
            trendData = days.map(day => {
                const income = filteredTransactions.filter(t => t.tipo_transaccion === 'ingreso' && isSameDay(new Date(t.fecha), day)).reduce((sum, t) => sum + t.monto, 0);
                const expense = filteredTransactions.filter(t => t.tipo_transaccion === 'gasto' && isSameDay(new Date(t.fecha), day)).reduce((sum, t) => sum + t.monto, 0);
                return { name: format(day, 'dd/MM'), Ingresos: income, Gastos: expense };
            });
        }

        return { totalIncome, totalExpense, netBalance, expensesByCategory, expensesByPaymentMethod, trendData };
    }, [transactions, currentDate, dateFilter, transactionTypeFilter]);
    
    const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

    const hasData = transactions.filter(t => transactionTypeFilter === 'all' || t.tipo_transaccion === transactionTypeFilter).length > 0;

    const handleDownloadCsv = () => {
        if (!transactions || transactions.length === 0) {
            toast({ title: 'No hay datos', description: 'No hay transacciones para exportar.', variant: 'destructive' });
            return;
        }
        const filteredTransactions = transactions.filter(t => transactionTypeFilter === 'all' || t.tipo_transaccion === transactionTypeFilter);
        
        if (filteredTransactions.length === 0) {
            toast({ title: 'No hay datos', description: 'No hay transacciones para exportar con el filtro actual.', variant: 'destructive' });
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(filteredTransactions);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Transacciones");
        XLSX.writeFile(workbook, `reporte_gastos_${new Date().toISOString().split('T')[0]}.csv`);
        
        toast({ title: 'Descarga Iniciada', description: 'Tu reporte CSV se está descargando.' });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
              <h2 className="text-2xl font-bold">Informes</h2>
              <Button onClick={handleDownloadCsv}><Download className="mr-2 h-4 w-4" /> Descargar CSV</Button>
            </div>
            
            <PeriodNavigator dateFilter={dateFilter} setDateFilter={setDateFilter} currentDate={currentDate} setCurrentDate={setCurrentDate} />

            <div className="flex justify-center">
              <Tabs value={transactionTypeFilter} onValueChange={(v) => setTransactionTypeFilter(v as TransactionTypeFilter)}>
                <TabsList>
                  <TabsTrigger value="all">Ver Todo</TabsTrigger>
                  <TabsTrigger value="ingreso">Solo Ingresos</TabsTrigger>
                  <TabsTrigger value="gasto">Solo Gastos</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {!hasData ? (
                <div className="flex h-full flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center mt-8">
                    <BarChart className="h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-xl font-semibold">No hay datos para mostrar</h3>
                    <p className="mt-2 text-sm text-muted-foreground">No hay transacciones para esta selección. Prueba con otro periodo o filtro.</p>
                </div>
            ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle></CardHeader>
                      <CardContent><div className="text-2xl font-bold text-green-600">{money(reportData.totalIncome)}</div></CardContent>
                  </Card>
                  <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Gastos Totales</CardTitle></CardHeader>
                      <CardContent><div className="text-2xl font-bold text-red-600">{money(reportData.totalExpense)}</div></CardContent>
                  </Card>
                  <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Balance Neto</CardTitle></CardHeader>
                      <CardContent><div className={`text-2xl font-bold ${reportData.netBalance >= 0 ? 'text-primary' : 'text-destructive'}`}>{money(reportData.netBalance)}</div></CardContent>
                  </Card>
              </div>

              {dateFilter !== 'day' &&
                  <Card>
                      <CardHeader>
                          <CardTitle>Tendencia del Periodo (Ingresos vs Gastos)</CardTitle>
                      </CardHeader>
                      <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                              <RechartsBarChart data={reportData.trendData}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${Number(value)/1000}k`}/>
                                  <Tooltip formatter={(value: number) => money(value)} />
                                  <Legend />
                                  {transactionTypeFilter !== 'gasto' && <RechartsBar dataKey="Ingresos" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />}
                                  {transactionTypeFilter !== 'ingreso' && <RechartsBar dataKey="Gastos" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />}
                              </RechartsBarChart>
                          </ResponsiveContainer>
                      </CardContent>
                  </Card>
              }

              {transactionTypeFilter !== 'ingreso' && (
              <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                      <CardHeader><CardTitle>Gastos por Categoría</CardTitle></CardHeader>
                      <CardContent>
                           <ResponsiveContainer width="100%" height={250}>
                              <PieChart>
                                  <Tooltip formatter={(value: number) => money(value)} />
                                  <Pie data={reportData.expensesByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                      {reportData.expensesByCategory.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                  </Pie>
                                  <Legend />
                              </PieChart>
                          </ResponsiveContainer>
                      </CardContent>
                  </Card>
                   <Card>
                      <CardHeader><CardTitle>Gastos por Método de Pago</CardTitle></CardHeader>
                      <CardContent>
                           <ResponsiveContainer width="100%" height={250}>
                              <PieChart>
                                  <Tooltip formatter={(value: number) => money(value)} />
                                  <Pie data={reportData.expensesByPaymentMethod} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                      {reportData.expensesByPaymentMethod.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                  </Pie>
                                  <Legend />
                              </PieChart>
                          </ResponsiveContainer>
                      </CardContent>
                  </Card>
              </div>
              )}
            </>
            )}
        </div>
    );
}

function BudgetsView({ categories, transactions }: { categories: string[], transactions: finanzas[] }) {
    const [budgets, setBudgets] = React.useState<Budget[]>([
        { id: 1, category: 'Comida', amount: 5000, startDate: startOfMonth(new Date()), endDate: endOfMonth(new Date()), spent: 0 },
        { id: 2, category: 'Transporte', amount: 1500, startDate: startOfMonth(new Date()), endDate: endOfMonth(new Date()), spent: 0 },
    ]);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingBudget, setEditingBudget] = React.useState<Budget | null>(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);
    const [deletingBudgetId, setDeletingBudgetId] = React.useState<number | null>(null);

    const hydratedBudgets = React.useMemo(() => {
        return budgets.map(budget => {
            const spent = transactions
                .filter(t => t.tipo_transaccion === 'gasto' && t.categoria === budget.category && new Date(t.fecha) >= budget.startDate && new Date(t.fecha) <= budget.endDate)
                .reduce((sum, t) => sum + t.monto, 0);
            return { ...budget, spent };
        });
    }, [budgets, transactions]);
    
    const handleAddOrEditBudget = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const budgetData = {
            category: formData.get('category') as string,
            amount: parseFloat(formData.get('amount') as string),
            // Date logic to be implemented
            startDate: new Date(), 
            endDate: new Date(),   
        };

        if (editingBudget) {
            setBudgets(prev => prev.map(b => b.id === editingBudget.id ? { ...b, ...budgetData } : b));
        } else {
            setBudgets(prev => [...prev, { ...budgetData, id: Date.now(), spent: 0 }]);
        }
        setIsFormOpen(false);
        setEditingBudget(null);
    };

    const handleEditClick = (budget: Budget) => {
        setEditingBudget(budget);
        setIsFormOpen(true);
    }
    
    const handleDeleteClick = (id: number) => {
        setDeletingBudgetId(id);
        setIsDeleteConfirmOpen(true);
    }

    const confirmDelete = () => {
        if (deletingBudgetId !== null) {
            setBudgets(budgets.filter(b => b.id !== deletingBudgetId));
        }
        setIsDeleteConfirmOpen(false);
        setDeletingBudgetId(null);
    }

    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-col items-start gap-4 md:flex-row md:justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">Presupuestos</h2>
                        <p className="text-muted-foreground">Controla tus gastos creando presupuestos por categoría.</p>
                    </div>
                    <Button onClick={() => { setEditingBudget(null); setIsFormOpen(true); }}>
                        <Plus className="mr-2 h-4 w-4" /> Crear Presupuesto
                    </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {hydratedBudgets.map(budget => {
                        const progress = (budget.spent / budget.amount) * 100;
                        return (
                        <Card key={budget.id}>
                            <CardHeader>
                                <CardTitle className="flex justify-between items-center">
                                    {budget.category}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6"><MoreVertical className="h-4 w-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleEditClick(budget)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleDeleteClick(budget.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </CardTitle>
                                <CardDescription>{format(budget.startDate, 'dd MMM')} - {format(budget.endDate, 'dd MMM, yyyy', { locale: es })}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Progress value={progress} className={progress > 100 ? '[&>div]:bg-destructive' : ''} />
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium">{money(budget.spent)} gastado</span>
                                    <span className="text-muted-foreground">de {money(budget.amount)}</span>
                                </div>
                            </CardContent>
                        </Card>
                    )})}
                </div>
                {budgets.length === 0 && <p className="text-center text-muted-foreground pt-4">No has creado ningún presupuesto.</p>}
            </div>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingBudget ? 'Editar' : 'Crear Nuevo'} Presupuesto</DialogTitle>
                        <DialogDescription>Define un límite de gasto para una categoría en un periodo específico.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddOrEditBudget} className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="budget-amount">Monto Máximo</Label>
                            <Input id="budget-amount" name="amount" type="number" placeholder="Ej: 5000" required defaultValue={editingBudget?.amount}/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="budget-category">Categoría</Label>
                             <Select name="category" required defaultValue={editingBudget?.category}>
                                <SelectTrigger id="budget-category"><SelectValue placeholder="Selecciona una categoría" /></SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat:string) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Periodo</Label>
                            <p className="text-xs text-muted-foreground p-2 bg-muted rounded-md">La selección de fechas para presupuestos se habilitará pronto.</p>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="outline" type="button">Cancelar</Button></DialogClose>
                            <Button type="submit">{editingBudget ? 'Guardar Cambios' : 'Crear Presupuesto'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>¿Estás seguro?</DialogTitle>
                        <DialogDescription>Esta acción eliminará el presupuesto permanentemente y no se puede deshacer.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                        <Button variant="destructive" onClick={confirmDelete}>Sí, eliminar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function ConfiguracionView({ categories, setCategories, dateFilter, setDateFilter }: { categories: string[], setCategories: React.Dispatch<React.SetStateAction<string[]>>, dateFilter: DateFilter, setDateFilter: React.Dispatch<React.SetStateAction<DateFilter>> }) {
    const { toast } = useToast();
    const [newCategory, setNewCategory] = React.useState('');
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = React.useState(false);
    const [editingCategory, setEditingCategory] = React.useState<{ index: number; name: string } | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
    const [deletingCategoryIndex, setDeletingCategoryIndex] = React.useState<number | null>(null);
    const [categoryInputValue, setCategoryInputValue] = React.useState('');

    const handleAddCategory = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newCategory.trim();
        if (trimmed && !categories.includes(trimmed)) {
            setCategories(prev => [...prev, trimmed].sort());
            setNewCategory('');
            toast({ title: 'Categoría añadida', description: `"${trimmed}" se ha añadido a la lista.` });
        } else if (!trimmed) {
            toast({ title: 'Campo vacío', description: 'El nombre de la categoría no puede estar vacío.', variant: 'destructive' });
        } else {
            toast({ title: 'Categoría duplicada', description: 'Esa categoría ya existe.', variant: 'destructive' });
        }
    };
    
    const handleOpenEditDialog = (index: number) => {
        setEditingCategory({ index, name: categories[index] });
        setCategoryInputValue(categories[index]);
        setIsCategoryDialogOpen(true);
    };

    const handleUpdateCategory = () => {
        if (editingCategory === null) return;
        const trimmed = categoryInputValue.trim();
        if (trimmed && !categories.some((cat, i) => cat === trimmed && i !== editingCategory.index)) {
            const updatedCategories = [...categories];
            updatedCategories[editingCategory.index] = trimmed;
            setCategories(updatedCategories.sort());
            toast({ title: 'Categoría actualizada' });
        } else {
             toast({ title: 'Error', description: 'El nombre de la categoría no puede estar vacío o ya existe.', variant: 'destructive' });
        }
        setIsCategoryDialogOpen(false);
        setEditingCategory(null);
    };

    const handleOpenDeleteDialog = (index: number) => {
        setDeletingCategoryIndex(index);
        setIsDeleteDialogOpen(true);
    };

    const confirmDeleteCategory = () => {
        if (deletingCategoryIndex !== null) {
            setCategories(prev => prev.filter((_, i) => i !== deletingCategoryIndex));
            toast({ title: 'Categoría eliminada' });
        }
        setIsDeleteDialogOpen(false);
        setDeletingCategoryIndex(null);
    };

    const periodLabels: Record<DateFilter, string> = { day: 'Diario', week: 'Semanal', month: 'Mensual', year: 'Anual' };

    return (
        <>
            <div className="space-y-8">
                <h2 className="text-2xl font-bold">Configuración</h2>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Gestionar Categorías</CardTitle>
                        <CardDescription>Añade, edita o elimina las categorías para tus transacciones.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddCategory} className="flex items-center gap-2 mb-4">
                            <Input 
                                placeholder="Nombre de la nueva categoría" 
                                value={newCategory} 
                                onChange={(e) => setNewCategory(e.target.value)}
                            />
                            <Button type="submit"><Plus className="mr-2 h-4 w-4" />Añadir</Button>
                        </form>
                        <div className="space-y-2 rounded-md border p-2">
                            {categories.map((category, index) => (
                                <div key={index} className="flex items-center justify-between rounded-md p-2 hover:bg-muted/50">
                                    <span className="font-medium">{category}</span>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEditDialog(index)}>
                                            <Pencil className="h-4 w-4" />
                                            <span className="sr-only">Editar</span>
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleOpenDeleteDialog(index)}>
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">Eliminar</span>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Preferencias de Vista</CardTitle>
                        <CardDescription>Elige la vista por defecto para el período de tiempo.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="w-full md:w-1/2">
                            <Label htmlFor="default-period">Período por Defecto</Label>
                            <Select value={dateFilter} onValueChange={(val) => setDateFilter(val as DateFilter)}>
                                <SelectTrigger id="default-period" className="mt-2">
                                    <SelectValue placeholder="Seleccionar periodo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(periodLabels).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Métodos de Pago</CardTitle>
                        <CardDescription>Estos son los métodos de pago disponibles en el sistema.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {paymentMethods.map(method => (
                                <Badge key={method} variant="secondary">{method}</Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Dialog for Editing Category */}
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Categoría</DialogTitle>
                        <DialogDescription>Cambia el nombre de la categoría.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="category-name">Nombre de la Categoría</Label>
                        <Input 
                            id="category-name" 
                            value={categoryInputValue} 
                            onChange={(e) => setCategoryInputValue(e.target.value)} 
                            className="mt-2"
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                        <Button onClick={handleUpdateCategory}>Guardar Cambios</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog for Deleting Category */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>¿Estás seguro de eliminar esta categoría?</DialogTitle>
                        <DialogDescription>
                            Esta acción no se puede deshacer. Se eliminará la categoría <span className="font-bold">{deletingCategoryIndex !== null && `"${categories[deletingCategoryIndex]}"`}</span>.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                        <Button variant="destructive" onClick={confirmDeleteCategory}>Sí, eliminar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function TransactionCard({ transaction, onEdit, onDelete }: { transaction: finanzas, onEdit: (t: finanzas) => void, onDelete: (id: number) => void }) {
  const isExpense = transaction.tipo_transaccion === 'gasto';
  return (
    <Card className="flex items-center p-4 gap-4">
      <div className={`rounded-full p-3 ${isExpense ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
        {isExpense ? <ArrowDown /> : <ArrowUp />}
      </div>
      <div className="flex-1">
        <p className="font-bold">{transaction.categoria}</p>
        <p className="text-sm text-muted-foreground">{transaction.notas || 'Sin descripción'}</p>
      </div>
      <div className="text-right">
        <p className={`font-bold text-lg ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
          {isExpense ? '-' : '+'} {money(transaction.monto)}
        </p>
        <p className="text-xs text-muted-foreground">{transaction.metodo_pago}</p>
      </div>
      <TransactionActions transaction={transaction} onEdit={onEdit} onDelete={onDelete} />
    </Card>
  );
}

function TransactionTable({ transactions, onEdit, onDelete }: { transactions: finanzas[], onEdit: (t: finanzas) => void, onDelete: (id: number) => void }) {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Método de Pago</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead className="w-[50px]"><span className="sr-only">Acciones</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map(t => (
            <TableRow key={t.id}>
              <TableCell>{format(new Date(t.fecha), 'dd MMM, yyyy', {locale: es})}</TableCell>
              <TableCell className="font-medium">{t.categoria}</TableCell>
              <TableCell>
                  <span className={cn("px-2 py-1 rounded-full text-xs font-semibold capitalize", t.tipo_transaccion === 'gasto' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')}>
                      {t.tipo_transaccion}
                  </span>
              </TableCell>
              <TableCell>{t.metodo_pago}</TableCell>
              <TableCell className={cn("text-right font-bold", t.tipo_transaccion === 'gasto' ? 'text-red-600' : 'text-green-600')}>{money(t.monto)}</TableCell>
              <TableCell><TransactionActions transaction={t} onEdit={onEdit} onDelete={onDelete} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function TransactionActions({ transaction, onEdit, onDelete }: { transaction: finanzas, onEdit: (t: finanzas) => void, onDelete: (id: number) => void }) {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(transaction)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
             <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>¿Estás seguro?</DialogTitle>
                        <DialogDescription>Esta acción no se puede deshacer. Se eliminará permanentemente la transacción de {money(transaction.monto)}.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                        <Button variant="destructive" onClick={() => { onDelete(transaction.id); setIsDeleteDialogOpen(false); }}>Sí, eliminar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function BottomNav({ currentView, setView }: { currentView: View, setView: (v: View) => void }) {
  const navItems = [
    { id: 'inicio', label: 'Inicio', icon: Home },
    { id: 'informes', label: 'Informes', icon: BarChart },
    { id: 'presupuestos', label: 'Presupuestos', icon: Landmark },
    { id: 'configuracion', label: 'Ajustes', icon: Cog },
  ] as const;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background shadow-t-lg md:hidden">
      <div className="grid h-16 grid-cols-4">
        {navItems.map(item => (
          <Button
            key={item.id}
            variant="ghost"
            className={cn(
              "flex h-full flex-col items-center justify-center rounded-none gap-1",
              currentView === item.id ? "text-primary bg-primary/10" : "text-muted-foreground"
            )}
            onClick={() => setView(item.id)}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs">{item.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

// --- Transaction Form Component ---

function TransactionForm({ isOpen, setIsOpen, onSubmit, transaction, categories, setCategories }: any) {
  const [isAddingCategory, setIsAddingCategory] = React.useState(false);
  const [newCategory, setNewCategory] = React.useState('');
  const { toast } = useToast();

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      tipo_transaccion: 'gasto',
      monto: undefined,
      categoria: '',
      fecha: new Date(),
      metodo_pago: undefined,
      notas: '',
    },
  });
  
  React.useEffect(() => {
    if (isOpen) {
        if (transaction) {
          form.reset({
            tipo_transaccion: transaction.tipo_transaccion || 'gasto',
            monto: transaction.monto || 0,
            categoria: transaction.categoria || '',
            fecha: transaction.fecha ? new Date(transaction.fecha) : new Date(),
            metodo_pago: transaction.metodo_pago,
            notas: transaction.notas || '',
          });
        } else {
          form.reset({
            tipo_transaccion: 'gasto',
            monto: undefined,
            categoria: '',
            fecha: new Date(),
            metodo_pago: undefined,
            notas: '',
          });
        }
    }
  }, [transaction, form, isOpen]);
  
  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
        const updatedCategories = [...categories, newCategory.trim()];
        setCategories(updatedCategories);
        form.setValue('categoria', newCategory.trim());
        setNewCategory('');
        setIsAddingCategory(false);
        toast({ title: 'Categoría Añadida', description: `Se añadió "${newCategory.trim()}" a la lista.` });
    }
  }
  
  const Content = (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <SheetHeader className="p-4 border-b sm:hidden">
              <SheetTitle>{transaction ? 'Editar' : 'Añadir'} Transacción</SheetTitle>
              <SheetDescription>
                  {transaction ? 'Modifica los detalles de la transacción.' : 'Registra un nuevo gasto o ingreso.'}
              </SheetDescription>
          </SheetHeader>
          <DialogHeader className="p-6 pb-0 hidden sm:flex">
               <DialogTitle>{transaction ? 'Editar' : 'Añadir'} Transacción</DialogTitle>
              <DialogDescription>
                  {transaction ? 'Modifica los detalles de la transacción.' : 'Registra un nuevo gasto o ingreso.'}
              </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-6 sm:p-6">
            <FormField
              control={form.control}
              name="tipo_transaccion"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-2 gap-4"
                    >
                      <FormItem>
                        <FormControl>
                          <RadioGroupItem value="gasto" id="gasto" className="sr-only peer" />
                        </FormControl>
                        <Label htmlFor="gasto" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                          <ArrowDown className="mb-3 h-6 w-6 text-red-500" />Gasto</Label>
                      </FormItem>
                       <FormItem>
                        <FormControl>
                          <RadioGroupItem value="ingreso" id="ingreso" className="sr-only peer" />
                        </FormControl>
                         <Label htmlFor="ingreso" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                          <ArrowUp className="mb-3 h-6 w-6 text-green-500" />Ingreso</Label>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="monto" render={({ field }) => (
                <FormItem><FormLabel>Monto</FormLabel><FormControl><Input type="number" placeholder="$0.00" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )}/>
             <FormField control={form.control} name="categoria" render={({ field }) => (
                <FormItem><FormLabel>Categoría</FormLabel>
                    {isAddingCategory ? (
                        <div className="flex gap-2">
                            <Input placeholder="Nueva categoría" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
                            <Button type="button" onClick={handleAddCategory}>Añadir</Button>
                            <Button type="button" variant="ghost" onClick={() => setIsAddingCategory(false)}>Cancelar</Button>
                        </div>
                    ) : (
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecciona una categoría" /></SelectTrigger></FormControl>
                        <SelectContent>
                            {categories.map((cat:string) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                            <Button variant="ghost" className="w-full justify-start mt-1" onClick={(e) => { e.preventDefault(); setIsAddingCategory(true); }}><Plus className="mr-2 h-4 w-4"/>Añadir categoría</Button>
                        </SelectContent>
                    </Select>
                    )}
                <FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="fecha" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Fecha</FormLabel>
                <Popover>
                    <PopoverTrigger asChild>
                    <FormControl>
                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? (format(field.value, "PPP", { locale: es })) : (<span>Elige una fecha</span>)}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                </Popover>
                <FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="metodo_pago" render={({ field }) => (
                <FormItem><FormLabel>Método de Pago</FormLabel><Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un método" /></SelectTrigger></FormControl>
                    <SelectContent>
                        {paymentMethods.map(method => <SelectItem key={method} value={method}>{method}</SelectItem>)}
                    </SelectContent>
                </Select><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="notas" render={({ field }) => (
                <FormItem><FormLabel>Notas (Opcional)</FormLabel><FormControl><Textarea placeholder="Añade una descripción..." {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
          </div>
          <div className="border-t p-4 bg-background">
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Guardando...' : transaction ? 'Guardar Cambios' : 'Guardar Transacción'}
              </Button>
          </div>
        </form>
      </Form>
  );

  return Content;
}
