

'use client';

import * as React from 'react';
import { add, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfYear, endOfYear, eachMonthOfInterval, formatISO, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as XLSX from 'xlsx';
import type { DateRange } from "react-day-picker"

import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import type { finanzas } from '@/types/database';

import { addExpenseAction, updateExpenseAction, deleteExpenseAction } from './actions';
import { expenseFormSchema, TransactionFormValues, paymentMethods } from './schemas';

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart as BarChartIcon,
  ChevronLeft,
  ChevronRight,
  Cog,
  Home,
  Landmark,
  List,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  Eye,
  CreditCard,
  Building2,
  Wallet,
  MessageSquare,
  StickyNote,
  TrendingUp,
  X,
  Wallet,
  Receipt,
  PiggyBank
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
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabaseClient';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { DateRangePicker } from '@/components/ui/date-range-picker';


type View = 'inicio' | 'informes' | 'presupuestos' | 'configuracion';
type DateFilter = 'day' | 'week' | 'month' | 'year';
type TransactionTypeFilter = 'all' | 'gasto' | 'ingreso';

const initialCategories = ['Comida', 'Transporte', 'Insumos', 'Servicios', 'Marketing', 'Renta', 'Sueldos', 'Otro'];
type Budget = { id: number; category: string; amount: number; spent: number; startDate: Date; endDate: Date; };
type Category = { name: string; subcategories: string[] };

const money = (v?: number | null) => v === null || v === undefined ? '$0.00' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);


// --- Reusable Transaction Components ---

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

function TransactionCard({ transaction, onEdit, onDelete }: { transaction: finanzas, onEdit: (t: finanzas) => void, onDelete: (id: number) => void }) {
    const isExpense = transaction.tipo_transaccion === 'gasto';
    return (
        <div className="flex items-center p-3 hover:bg-muted/50 rounded-lg">
            <div className={`mr-4 rounded-lg p-2 ${isExpense ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400' : 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400'}`}>
                {isExpense ? <ArrowDown className="h-5 w-5" /> : <ArrowUp className="h-5 w-5" />}
            </div>
            <div className="flex-1 space-y-0.5">
                <p className="font-bold leading-tight">{transaction.categoria}</p>
                <p className="text-sm text-muted-foreground">{format(new Date(transaction.fecha), 'dd MMM yyyy', { locale: es })}</p>
            </div>
            <div className="text-right ml-2">
                <p className={`font-bold ${isExpense ? 'text-destructive' : 'text-green-600'}`}>
                    {isExpense ? '-' : '+'} {money(transaction.monto)}
                </p>
            </div>
            <div className="pl-2">
                <TransactionActions transaction={transaction} onEdit={onEdit} onDelete={onDelete} />
            </div>
        </div>
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
            <TableHead>Notas</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead className="w-[50px]"><span className="sr-only">Acciones</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map(t => (
            <TableRow key={t.id}>
              <TableCell>{format(new Date(t.fecha), 'dd MMM, yyyy', {locale: es})}</TableCell>
              <TableCell className="font-medium">{t.categoria}{t.subcategoria && <span className="text-muted-foreground font-normal text-sm"> / {t.subcategoria}</span>}</TableCell>
              <TableCell>
                  <span className={cn("px-2 py-1 rounded-full text-xs font-semibold capitalize", t.tipo_transaccion === 'gasto' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')}>
                      {t.tipo_transaccion}
                  </span>
              </TableCell>
              <TableCell>{t.metodo_pago}</TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-xs truncate" title={t.notas || ''}>{t.notas || '-'}</TableCell>
              <TableCell className={cn("text-right font-bold", t.tipo_transaccion === 'gasto' ? 'text-red-600' : 'text-green-600')}>{money(t.monto)}</TableCell>
              <TableCell><TransactionActions transaction={t} onEdit={onEdit} onDelete={onDelete} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}


// --- Main Page Component ---
export default function OperationsPage() {
  const [currentView, setCurrentView] = React.useState<View>('inicio');
  const [transactions, setTransactions] = React.useState<finanzas[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingTransaction, setEditingTransaction] = React.useState<finanzas | null>(null);
  
  const [categories, setCategories] = React.useState<Category[]>([
    { name: 'Comida', subcategories: ['Restaurantes', 'Supermercado'] },
    { name: 'Transporte', subcategories: ['Gasolina', 'Uber'] },
    { name: 'Servicios', subcategories: ['Luz', 'Agua', 'Internet'] },
    { name: 'Insumos', subcategories: [] },
    { name: 'Marketing', subcategories: [] },
    { name: 'Renta', subcategories: [] },
    { name: 'Sueldos', subcategories: [] },
    { name: 'Otro', subcategories: [] },
  ]);

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

   const [budgets, setBudgets] = React.useState<Budget[]>([
        { id: 1, category: 'Comida', amount: 5000, startDate: startOfMonth(new Date()), endDate: endOfMonth(new Date()), spent: 0 },
        { id: 2, category: 'Transporte', amount: 1500, startDate: startOfMonth(new Date()), endDate: endOfMonth(new Date()), spent: 0 },
    ]);

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
      case 'day': startDate = startOfDay(currentDate); endDate = endOfDay(currentDate); break;
      case 'week': startDate = startOfWeek(currentDate, { locale: es }); endDate = endOfWeek(currentDate, { locale: es }); break;
      case 'year': startDate = startOfYear(currentDate); endDate = endOfYear(currentDate); break;
      default: startDate = startOfMonth(currentDate); endDate = endOfMonth(currentDate); break;
    }

    const isoStart = formatISO(startDate);
    const isoEnd = formatISO(endDate);

    const [resFinanzas, resFinanzas2] = await Promise.all([
      supabase.from('finanzas').select('*').gte('fecha', isoStart).lte('fecha', isoEnd),
      supabase.from('finanzas2').select('*').gte('fecha', isoStart).lte('fecha', isoEnd)
    ]);

    const egresos = (resFinanzas.data || []).map((t: any) => ({ ...t, __flowType: 'egreso' as const }));
    const ingresos = (resFinanzas2.data || []).map((t: any) => ({ ...t, __flowType: 'ingreso' as const }));

    setTransactions([...egresos, ...ingresos].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
    setIsLoading(false);
  }, [currentDate, dateFilter]);

  React.useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const filteredTransactions = React.useMemo(() => {
    return transactions.filter(t => {
        const matchesCompany = companyFilter === 'Todas' || t.empresa === companyFilter;
        const matchesAccount = accountFilter === 'Todas' || t.cuenta === accountFilter;
        return matchesCompany && matchesAccount;
    });
  }, [transactions, companyFilter, accountFilter]);

  const handleSave = async (values: TransactionFormValues) => {
    try {
        let result;
        if (editingTransaction) {
            result = await updateExpenseAction(editingTransaction.id, values);
        } else {
            result = await addExpenseAction(values);
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
        
        const newDate = new Date(values.fecha);
        if (newDate.getMonth() !== currentDate.getMonth() || newDate.getFullYear() !== currentDate.getFullYear()) {
            setCurrentDate(newDate);
        } else {
            // Trigger refetch for the same month
            setTransactions(prev => [...prev]); // This is a bit of a hack
            setCurrentDate(new Date(currentDate)); // Force re-render and effect
        }

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
        return <InsightsView 
                    transactions={transactions}
                    dailyTransactions={dailyTransactions}
                    budgets={hydratedBudgets}
                    isLoading={isLoading}
                    dateFilter={dateFilter}
                    setDateFilter={setDateFilter}
                    currentDate={currentDate}
                    setCurrentDate={setCurrentDate}
                    handleOpenForm={handleOpenForm}
                    handleDeleteTransaction={handleDeleteTransaction}
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
                  onEditTransaction={handleOpenForm}
                  onDeleteTransaction={handleDeleteTransaction}
                  isMobile={isMobile}
                />;
      case 'presupuestos':
        return <BudgetsView categories={categories.map(c => c.name)} transactions={transactions} budgets={hydratedBudgets} setBudgets={setBudgets} />;
      case 'configuracion':
        return <ConfiguracionView egresoCats={egresoCats} ingresoCats={ingresoCats} />;
      default: return null;
    }
  };

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
                            <TabsTrigger value="presupuestos"><List className="mr-2 h-4 w-4" />Presupuestos</TabsTrigger>
                            <TabsTrigger value="configuracion"><Cog className="mr-2 h-4 w-4" />Configuración</TabsTrigger>
                        </TabsList>
                    </Tabs>
                )}
                 <Button onClick={() => handleOpenForm(null)} size="sm">
                    <Plus className="mr-2 h-4 w-4"/> Añadir Transacción
                </Button>
            </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-7xl">{renderContent()}</div>
        </main>
        
        {isMobile && <BottomNav currentView={currentView} setView={handleCurrentViewChange} />}
        
        <Dialog open={!isMobile && isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className="flex h-[90vh] flex-col p-0 sm:max-w-lg">
                {FormComponent}
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

interface InsightsViewProps {
    transactions: UnifiedTransaction[];
    isLoading: boolean;
    dateFilter: DateFilter;
    setDateFilter: (filter: DateFilter) => void;
    currentDate: Date;
    setCurrentDate: (date: Date) => void;
    companyFilter: string;
    setCompanyFilter: (company: string) => void;
    accountFilter: string;
    setAccountFilter: (account: string) => void;
    onAddTransaction: () => void;
    onViewTransactions: () => void;
    budgets: Budget[];
}

function InsightsView({ transactions, isLoading, dateFilter, setDateFilter, currentDate, setCurrentDate, companyFilter, setCompanyFilter, accountFilter, setAccountFilter, onAddTransaction, onViewTransactions, budgets }: InsightsViewProps) {
  const { totalIncome, totalExpense, balance } = React.useMemo(() => {
    const income = transactions.filter((t: UnifiedTransaction) => t.__flowType === 'ingreso').reduce((sum: number, t: UnifiedTransaction) => sum + (t.monto || 0), 0);
    const expense = transactions.filter((t: UnifiedTransaction) => t.__flowType === 'egreso').reduce((sum: number, t: UnifiedTransaction) => sum + (t.monto || 0), 0);
    return { totalIncome: income, totalExpense: expense, balance: income - expense };
  }, [transactions]);

  const pieData = React.useMemo(() => [
    { name: 'Ingresos', value: totalIncome, color: '#3b82f6' },
    { name: 'Gastos', value: totalExpense, color: '#ec4899' }
  ], [totalIncome, totalExpense]);

  const barChartData = React.useMemo(() => {
    let steps: Date[] = [];
    let formatStr = 'd';

    if (dateFilter === 'year') {
        steps = eachMonthOfInterval({ start: startOfYear(currentDate), end: endOfYear(currentDate) });
        formatStr = 'MMM';
    } else if (dateFilter === 'week') {
        steps = eachDayOfInterval({ start: startOfWeek(currentDate, { locale: es }), end: endOfWeek(currentDate, { locale: es }) });
        formatStr = 'eee d';
    } else if (dateFilter === 'day') {
        steps = [currentDate];
        formatStr = 'dd MMM';
    } else { // month
        steps = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
        formatStr = 'd';
    }

    return steps.map(step => {
        const dayTransactions = transactions.filter((t: UnifiedTransaction) => isSameDay(new Date(t.fecha), step));
        const ingresos = dayTransactions.filter((t: UnifiedTransaction) => t.__flowType === 'ingreso').reduce((sum: number, t: UnifiedTransaction) => sum + (t.monto || 0), 0);
        const gastos = dayTransactions.filter((t: UnifiedTransaction) => t.__flowType === 'egreso').reduce((sum: number, t: UnifiedTransaction) => sum + (t.monto || 0), 0);
        return {
            name: format(step, formatStr, { locale: es }),
            ingresos,
            gastos
        };
    });
  }, [transactions, dateFilter, currentDate]);

  const mainBudget = budgets.find((b: Budget) => b.type === 'egreso');
  const spentInMainBudget = transactions
    .filter((t: UnifiedTransaction) => t.__flowType === 'egreso' && t.categoria === mainBudget?.category)
    .reduce((sum: number, t: UnifiedTransaction) => sum + t.monto, 0);
  const budgetProgress = mainBudget ? (spentInMainBudget / mainBudget.limit) * 100 : 0;

  if(isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-1">
                <h2 className="text-3xl font-bold tracking-tight">Gastos<br/>diarios</h2>
                <p className="text-muted-foreground text-sm">Tu resumen financiero del periodo.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
                <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                    <SelectTrigger className="w-[130px] h-11 border-none bg-muted/30"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="day">Diario</SelectItem>
                        <SelectItem value="week">Semanal</SelectItem>
                        <SelectItem value="month">Mensual</SelectItem>
                        <SelectItem value="year">Anual</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={companyFilter} onValueChange={setCompanyFilter}>
                    <SelectTrigger className="w-[130px] h-11 border-none bg-muted/30"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Todas">Todas</SelectItem>
                        {companies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                </Select>

                <div className="flex items-center gap-1 bg-muted/30 rounded-md px-2 h-11 border border-transparent">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(add(currentDate, { [dateFilter === 'day' ? 'days' : dateFilter + 's']: -1 }))}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="min-w-[120px] text-center font-semibold text-sm capitalize">
                        {format(currentDate, dateFilter === 'day' ? 'dd MMM yyyy' : (dateFilter === 'year' ? 'yyyy' : 'MMMM yyyy'), { locale: es })}
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(add(currentDate, { [dateFilter === 'day' ? 'days' : dateFilter + 's']: 1 }))}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                <Button variant="outline" className="h-11 border-none bg-muted/30 gap-2 px-4" onClick={onViewTransactions}>
                    <Eye className="h-4 w-4" /> Ver Transacciones
                </Button>

                <Button className="h-11 bg-[#2d5a4c] hover:bg-[#2d5a4c]/90 text-white gap-2 px-4" onClick={onAddTransaction}>
                    <Plus className="h-4 w-4" /> Añadir Transacción
                </Button>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-6 border-none bg-white shadow-sm rounded-xl">
                <CardHeader className="pb-0">
                    <CardTitle className="text-xl font-bold">Balance del Periodo</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="relative w-[220px] h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={pieData} 
                                    dataKey="value" 
                                    innerRadius={70} 
                                    outerRadius={95} 
                                    paddingAngle={5} 
                                    stroke="none"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-6 flex-1 w-full">
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Balance</p>
                            <p className="text-3xl font-extrabold text-[#2d5a4c]">{money(balance)}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-blue-500" />
                                <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground font-medium">Ingresos</span>
                                    <span className="font-bold text-lg">{money(totalIncome)}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-pink-500" />
                                <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground font-medium">Gastos</span>
                                    <span className="font-bold text-lg">{money(totalExpense)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="lg:col-span-6 flex flex-col gap-6">
                <Card className="border-none bg-white shadow-sm rounded-xl flex-1">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xl font-bold">Ahorro Potencial</CardTitle>
                        <CardDescription>Balance del periodo seleccionado.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="text-4xl font-extrabold text-[#2d5a4c]">{money(balance)}</div>
                    </CardContent>
                </Card>

                <Card className="border-none bg-white shadow-sm rounded-xl flex-1">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xl font-bold">Estado del Presupuesto</CardTitle>
                        <CardDescription>Progreso de tu presupuesto de {mainBudget?.category || 'Sin definir'}.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <div className="flex justify-between text-sm font-medium">
                            <span>{money(spentInMainBudget)} gastado</span>
                            <span className="text-muted-foreground">de {money(mainBudget?.limit || 0)}</span>
                        </div>
                        <Progress value={budgetProgress} className={cn("h-3", budgetProgress > 100 ? "bg-red-100 [&>div]:bg-red-500" : "bg-muted/50")} />
                    </CardContent>
                </Card>
            </div>
        </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
            <CardHeader>
                <CardTitle>Transacciones del Día</CardTitle>
                <CardDescription>
                    {format(currentDate, "eeee, dd 'de' MMMM", { locale: es })}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {dailyTransactions.length > 0 ? (
                    <div className="space-y-1">
                        {dailyTransactions.map(t => (
                            <TransactionCard key={t.id} transaction={t} onEdit={handleOpenForm} onDelete={handleDeleteTransaction} />
                        ))}
                    </div>
                ) : (
                    <div className="flex h-full min-h-48 items-center justify-center rounded-lg border-2 border-dashed p-4 text-center">
                        <p className="text-sm text-muted-foreground">No hay transacciones para este día.</p>
                    </div>
                )}
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Gastos por Categoría</CardTitle>
                 <CardDescription>Resumen del periodo actual.</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <RechartsBarChart data={expensesByCategory} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" hide />
                        <YAxis type="category" width={80} dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip formatter={(value: number) => money(value)} />
                        <RechartsBar dataKey="value" name="Gastos" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </RechartsBarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
       </div>
    </div>
  )
}

interface ReportsViewProps {
    transactions: UnifiedTransaction[];
    dateFilter: DateFilter;
    setDateFilter: (filter: DateFilter) => void;
    currentDate: Date;
    setCurrentDate: (date: Date) => void;
    companyFilter: string;
    setCompanyFilter: (company: string) => void;
    accountFilter: string;
    setAccountFilter: (account: string) => void;
    onEditTransaction: (t: UnifiedTransaction) => void;
    onDeleteTransaction: (id: number, flow: 'egreso' | 'ingreso') => void;
}

function ReportsView({ transactions, dateFilter, setDateFilter, currentDate, setCurrentDate, onEditTransaction, onDeleteTransaction, companyFilter, setCompanyFilter, accountFilter, setAccountFilter }: ReportsViewProps) {
    const { totalIncome, totalExpense, balance, expenseByCat, incomeByCat, typeComparison } = React.useMemo(() => {
        const incomeItems = transactions.filter((t: UnifiedTransaction) => t.__flowType === 'ingreso');
        const expenseItems = transactions.filter((t: UnifiedTransaction) => t.__flowType === 'egreso');

        const income = incomeItems.reduce((sum: number, t: UnifiedTransaction) => sum + (t.monto || 0), 0);
        const expense = expenseItems.reduce((sum: number, t: UnifiedTransaction) => sum + (t.monto || 0), 0);

        const expCatMap: Record<string, number> = {};
        expenseItems.forEach((t: UnifiedTransaction) => {
            expCatMap[t.categoria] = (expCatMap[t.categoria] || 0) + (t.monto || 0);
        });
        const expCatData = Object.entries(expCatMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

        const incCatMap: Record<string, number> = {};
        incomeItems.forEach((t: UnifiedTransaction) => {
            incCatMap[t.categoria] = (incCatMap[t.categoria] || 0) + (t.monto || 0);
        });
        const incCatData = Object.entries(incCatMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

        const typeMap: Record<string, number> = {
            'gasto': expenseItems.filter((t: UnifiedTransaction) => t.tipo_transaccion === 'gasto').reduce((s: number, t: UnifiedTransaction) => s + t.monto, 0),
            'compra': expenseItems.filter((t: UnifiedTransaction) => t.tipo_transaccion === 'compra').reduce((s: number, t: UnifiedTransaction) => s + t.monto, 0),
            'venta': incomeItems.filter((t: UnifiedTransaction) => t.tipo_transaccion === 'venta').reduce((s: number, t: UnifiedTransaction) => s + t.monto, 0),
            'ingreso': incomeItems.filter((t: UnifiedTransaction) => t.tipo_transaccion === 'ingreso').reduce((s: number, t: UnifiedTransaction) => s + t.monto, 0),
        };
        const typeData = Object.entries(typeMap).map(([name, value]) => ({ name, value }));

        return { 
            totalIncome: income, 
            totalExpense: expense, 
            balance: income - expense,
            expenseByCat: expCatData,
            incomeByCat: incCatData,
            typeComparison: typeData
        };
    }, [transactions]);

    return (
        <div className="space-y-10">
            <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setCurrentDate(add(currentDate, { [dateFilter === 'day' ? 'days' : dateFilter + 's']: -1 }))}><ChevronLeft /></Button>
                    <span className="min-w-[140px] text-center font-bold capitalize text-sm">
                        {format(currentDate, dateFilter === 'day' ? 'dd MMM yyyy' : (dateFilter === 'year' ? 'yyyy' : 'MMMM yyyy'), { locale: es })}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => setCurrentDate(add(currentDate, { [dateFilter === 'day' ? 'days' : dateFilter + 's']: 1 }))}><ChevronRight /></Button>
                </div>
                <Separator orientation="vertical" className="h-8 mx-2" />
                <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                    <SelectTrigger className="w-[120px] border-none bg-muted/30"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="day">Diario</SelectItem>
                        <SelectItem value="week">Semanal</SelectItem>
                        <SelectItem value="month">Mensual</SelectItem>
                        <SelectItem value="year">Anual</SelectItem>
                    </SelectContent>
                </Select>
                <div className="flex items-center gap-2 rounded-lg border bg-background p-1">
                    <Button variant="ghost" size="icon" onClick={() => handleDateChange('prev')}><ChevronLeft className="h-5 w-5" /></Button>
                    <span className="w-36 text-center font-semibold capitalize md:w-56">{getFormattedDate()}</span>
                    <Button variant="ghost" size="icon" onClick={() => handleDateChange('next')}><ChevronRight className="h-5 w-5" /></Button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
              <h2 className="text-2xl font-bold">Informes</h2>
              <div className="flex items-center gap-2">
                <Button onClick={handleDownloadCsv} variant="outline"><Download className="mr-2 h-4 w-4" /> Descargar CSV</Button>
              </div>
            </div>
            
            <PeriodNavigator dateFilter={dateFilter} setDateFilter={setDateFilter} currentDate={currentDate} setCurrentDate={setCurrentDate}/>

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

              <div className="grid gap-4 md:grid-cols-2">
                  {/* Income Charts */}
                  {transactionTypeFilter !== 'gasto' && reportData.incomesByCategory.length > 0 && (
                      <Card>
                          <CardHeader><CardTitle>Ingresos por Categoría</CardTitle></CardHeader>
                          <CardContent>
                                  <ResponsiveContainer width="100%" height={250}>
                                  <PieChart>
                                      <Tooltip formatter={(value: number) => money(value)} />
                                      <Pie data={reportData.incomesByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80}>
                                          {reportData.incomesByCategory.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                                      </Pie>
                                      <Legend />
                                  </PieChart>
                              </ResponsiveContainer>
                          </CardContent>
                      </Card>
                  )}
                  {transactionTypeFilter !== 'gasto' && reportData.incomesByPaymentMethod.length > 0 && (
                      <Card>
                          <CardHeader><CardTitle>Ingresos por Método de Pago</CardTitle></CardHeader>
                          <CardContent>
                                  <ResponsiveContainer width="100%" height={250}>
                                  <PieChart>
                                      <Tooltip formatter={(value: number) => money(value)} />
                                      <Pie data={reportData.incomesByPaymentMethod} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80}>
                                          {reportData.incomesByPaymentMethod.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                                      </Pie>
                                      <Legend />
                                  </PieChart>
                              </ResponsiveContainer>
                          </CardContent>
                      </Card>
                  )}

                  {/* Expense Charts */}
                  {transactionTypeFilter !== 'ingreso' && reportData.expensesByCategory.length > 0 && (
                      <Card>
                          <CardHeader><CardTitle>Gastos por Categoría</CardTitle></CardHeader>
                          <CardContent>
                              <ResponsiveContainer width="100%" height={250}>
                                  <PieChart>
                                      <Tooltip formatter={(value: number) => money(value)} />
                                      <Pie data={reportData.expensesByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80}>
                                          {reportData.expensesByCategory.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                                      </Pie>
                                      <Legend />
                                  </PieChart>
                              </ResponsiveContainer>
                          </CardContent>
                      </Card>
                  )}
                  {transactionTypeFilter !== 'ingreso' && reportData.expensesByPaymentMethod.length > 0 && (
                      <Card>
                          <CardHeader><CardTitle>Gastos por Método de Pago</CardTitle></CardHeader>
                          <CardContent>
                              <ResponsiveContainer width="100%" height={250}>
                                  <PieChart>
                                      <Tooltip formatter={(value: number) => money(value)} />
                                      <Pie data={reportData.expensesByPaymentMethod} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80}>
                                          {reportData.expensesByPaymentMethod.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                                      </Pie>
                                      <Legend />
                                  </PieChart>
                              </ResponsiveContainer>
                          </CardContent>
                      </Card>
                  )}
              </div>
                
              <Card>
                  <CardHeader>
                      <CardTitle>Lista de Transacciones del Periodo</CardTitle>
                      <CardDescription>Un listado detallado de todos los movimientos que coinciden con los filtros actuales.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      {isMobile ? (
                          <div className="space-y-1">
                              {paginatedTransactions.map(t => (
                                  <TransactionCard key={t.id} transaction={t} onEdit={onEditTransaction} onDelete={onDeleteTransaction} />
                              ))}
                          </div>
                      ) : (
                          <TransactionTable transactions={paginatedTransactions} onEdit={onEditTransaction} onDelete={onDeleteTransaction} />
                      )}
                  </CardContent>
              </Card>
            </>
            )}
        </div>
    );
}

interface BudgetsViewProps {
    budgets: Budget[];
    setBudgets: React.Dispatch<React.SetStateAction<Budget[]>>;
    transactions: UnifiedTransaction[];
    egresoCats: any[];
    ingresoCats: any[];
}

function BudgetsView({ budgets, setBudgets, transactions, egresoCats, ingresoCats }: BudgetsViewProps) {
    const [isCreateOpen, setIsCreateOpen] = React.useState(false);
    const [newBudgetType, setNewBudgetType] = React.useState<'egreso' | 'ingreso'>('egreso');

    const handleAddBudget = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!budgetAmount || !budgetCategory || !budgetDateRange?.from) {
             toast({ title: 'Campos Incompletos', description: 'Asegúrate de llenar el monto, categoría y al menos la fecha de inicio.', variant: 'destructive' });
             return;
        }

        const budgetData = {
            category: budgetCategory,
            amount: parseFloat(budgetAmount),
            startDate: budgetDateRange.from, 
            endDate: budgetDateRange.to || budgetDateRange.from,   
        };

        if (editingBudget) {
            setBudgets(prev => prev.map(b => b.id === editingBudget.id ? { ...editingBudget, ...budgetData } : b));
            toast({ title: 'Presupuesto Actualizado', description: 'Los cambios se han guardado.' });
        } else {
            setBudgets(prev => [...prev, { ...budgetData, id: Date.now(), spent: 0 }]);
            toast({ title: 'Presupuesto Creado', description: 'Se ha añadido el nuevo presupuesto.' });
        }
        setIsFormOpen(false);
        setEditingBudget(null);
    };

    const handleEditClick = (budget: Budget) => {
        setEditingBudget(budget);
        setBudgetAmount(String(budget.amount));
        setBudgetCategory(budget.category);
        setBudgetDateRange({ from: budget.startDate, to: budget.endDate });
        setIsFormOpen(true);
    }

    const handleOpenNewBudgetForm = () => {
        setEditingBudget(null);
        setBudgetAmount('');
        setBudgetCategory('');
        setBudgetDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
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
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Presupuestos</h2>
                    <p className="text-muted-foreground text-sm">Controla tus gastos creando presupuestos por categoría.</p>
                </div>
                <Button className="bg-[#2d5a4c] hover:bg-[#2d5a4c]/90" onClick={() => setIsCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Crear Presupuesto
                </Button>
            </div>

            {budgets.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 text-center space-y-4 border-2 border-dashed rounded-2xl bg-muted/10">
                    <Target className="h-16 w-16 text-muted-foreground/20" />
                    <h3 className="text-xl font-bold">No tienes presupuestos activos</h3>
                    <p className="text-muted-foreground max-w-md">Define límites de gasto para tus categorías de egreso y metas para tus ingresos.</p>
                    <Button variant="outline" onClick={() => setIsCreateOpen(true)}>Empezar ahora</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {budgets.map(budget => {
                        const actual = transactions
                            .filter((t: UnifiedTransaction) => t.__flowType === budget.type && t.categoria === budget.category)
                            .reduce((sum: number, t: UnifiedTransaction) => sum + t.monto, 0);
                        const progress = (actual / budget.limit) * 100;
                        const isOver = budget.type === 'egreso' && actual > budget.limit;
                        const isSuccess = budget.type === 'ingreso' && actual >= budget.limit;

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
                            <Input id="budget-amount" name="amount" type="number" placeholder="Ej: 5000" required value={budgetAmount} onChange={e => setBudgetAmount(e.target.value)}/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="budget-category">Categoría</Label>
                             <Select name="category" required value={budgetCategory} onValueChange={setBudgetCategory}>
                                <SelectTrigger id="budget-category"><SelectValue placeholder="Selecciona una categoría" /></SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat:string) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Periodo</Label>
                            <DateRangePicker date={budgetDateRange} onSelect={setBudgetDateRange} />
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

function ConfiguracionView({ egresoCats, ingresoCats }: { egresoCats: any[], ingresoCats: any[] }) {
    return (
        <div className="space-y-6">
            <Card className="border-none shadow-sm rounded-xl">
                <CardHeader><CardTitle>Gestión de Categorías</CardTitle><CardDescription>Catálogos de transacciones.</CardDescription></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h3 className="font-bold border-b pb-2 flex items-center gap-2 text-pink-600"><ArrowDown className="h-4 w-4"/> Egresos (Gasto / Compra)</h3>
                        <div className="flex flex-wrap gap-2">
                            {egresoCats.map((c: any) => <Badge key={c.name} variant="secondary" className="bg-pink-50 text-pink-700 border-pink-100">{c.name}</Badge>)}
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="font-bold border-b pb-2 flex items-center gap-2 text-blue-600"><ArrowUp className="h-4 w-4"/> Ingresos (Venta / Ingreso)</h3>
                        <div className="flex flex-wrap gap-2">
                            {ingresoCats.map((c: any) => <Badge key={c.name} variant="outline" className="bg-blue-50 text-blue-700 border-blue-100">{c.name}</Badge>)}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// --- Componentes Auxiliares ---

function TransactionTable({ transactions, onEdit, onDelete }: { transactions: UnifiedTransaction[], onEdit: (t: UnifiedTransaction) => void, onDelete: (id: number, flow: 'egreso' | 'ingreso') => void }) {
    if (transactions.length === 0) return <div className="text-center py-10 text-muted-foreground italic">No hay movimientos en este periodo.</div>;

    return (
        <Table>
            <TableHeader>
                <TableRow className="bg-muted/30">
                    <TableHead className="font-bold">Fecha</TableHead>
                    <TableHead className="font-bold">Concepto</TableHead>
                    <TableHead className="font-bold">Cuenta</TableHead>
                    <TableHead className="text-right font-bold">Monto</TableHead>
                    <TableHead className="w-10"></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {transactions.map(t => (
                    <TableRow key={`${t.__flowType}-${t.id}`} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="text-xs font-medium">{format(new Date(t.fecha), 'dd/MM/yy')}</TableCell>
                        <TableCell>
                            <div className="font-bold text-sm">{t.categoria}</div>
                            <div className="text-[10px] text-muted-foreground uppercase font-medium flex items-center gap-1">
                                <Badge variant="outline" className={cn(
                                    "px-1 py-0 text-[9px]",
                                    t.__flowType === 'egreso' ? "border-pink-200 text-pink-600" : "border-blue-200 text-blue-600"
                                )}>
                                    {t.tipo_transaccion}
                                </Badge>
                                • {t.descripcion || 'Sin desc.'}
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col gap-0.5">
                                <Badge variant="outline" className="text-[10px] font-bold w-fit bg-background">{t.cuenta || 'N/A'}</Badge>
                                <span className="text-[9px] text-muted-foreground font-medium">{t.banco || 'Sin banco'}</span>
                            </div>
                        </TableCell>
                        <TableCell className={cn("text-right font-black", t.__flowType === 'egreso' ? "text-pink-600" : "text-blue-600")}>
                            {t.__flowType === 'egreso' ? "-" : "+"} {money(t.monto)}
                        </TableCell>
                        <TableCell>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onEdit(t)}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onDelete(t.id, t.__flowType)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

interface TransactionFormProps {
    transaction: UnifiedTransaction | null;
    onSubmit: (values: TransactionFormValues) => void;
    egresoCats: any[];
    ingresoCats: any[];
    onClose: () => void;
}

function TransactionForm({ transaction, onSubmit, egresoCats, ingresoCats, onClose }: TransactionFormProps) {
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: transaction ? {
        fecha: new Date(transaction.fecha),
        empresa: (transaction.empresa as any) || null,
        monto: transaction.monto,
        categoria: transaction.categoria,
        subcategoria: transaction.subcategoria,
        descripcion: transaction.descripcion,
        notas: transaction.notas,
        flow_type: transaction.__flowType,
        tipo_transaccion: transaction.tipo_transaccion,
        metodo_pago: (transaction.metodo_pago as any),
        metodo_pago_especificar: transaction.metodo_pago_especificar,
        banco: (transaction.banco as any) || null,
        banco_especificar: transaction.banco_especificar,
        cuenta: (transaction.cuenta as any) || null,
        cuenta_especificar: transaction.cuenta_especificar,
    } : {
        fecha: new Date(),
        flow_type: 'egreso',
        tipo_transaccion: 'gasto',
        metodo_pago: 'Transferencia',
        banco: 'BBVA',
        cuenta: 'TOLEXAL',
    },
  });
  
  const selectedCategoryName = form.watch('categoria');
  const availableSubcategories = React.useMemo(() => {
      return categories.find((c:Category) => c.name === selectedCategoryName)?.subcategories || [];
  }, [selectedCategoryName, categories]);

  React.useEffect(() => {
      form.resetField('subcategoria');
  }, [selectedCategoryName, form]);

  React.useEffect(() => {
    if (isOpen) {
        if (transaction) {
          form.reset({
            tipo_transaccion: transaction.tipo_transaccion || 'gasto',
            monto: transaction.monto || 0,
            categoria: transaction.categoria || '',
            subcategoria: transaction.subcategoria || null,
            fecha: transaction.fecha ? new Date(transaction.fecha) : new Date(),
            metodo_pago: transaction.metodo_pago,
            notas: transaction.notas || '',
          });
        } else {
          form.reset({
            tipo_transaccion: 'gasto',
            monto: undefined,
            categoria: '',
            subcategoria: null,
            fecha: new Date(),
            metodo_pago: undefined,
            notas: '',
          });
        }
    }
  }, [transaction, form, isOpen]);
  
  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (trimmed && !categories.some((c:Category) => c.name === trimmed)) {
        setCategories((prev: Category[]) => [...prev, {name: trimmed, subcategories: []}]);
        form.setValue('categoria', trimmed);
        setNewCategory('');
        setIsAddingCategory(false);
        toast({ title: 'Categoría Añadida', description: `Se añadió "${trimmed}" a la lista.` });
    }
  }
  
  const Content = (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex h-full flex-1 flex-col overflow-hidden">
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
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="categoria" render={({ field }) => (
                    <FormItem><FormLabel>Categoría</FormLabel>
                        {isAddingCategory ? (
                            <div className="flex gap-2">
                                <Input placeholder="Nueva categoría" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
                                <Button type="button" onClick={handleAddCategory} size="sm">Añadir</Button>
                                <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddingCategory(false)}>X</Button>
                            </div>
                        ) : (
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecciona una categoría" /></SelectTrigger></FormControl>
                            <SelectContent>
                                {categories.map((cat:Category) => <SelectItem key={cat.name} value={cat.name}>{cat.name}</SelectItem>)}
                                <Button variant="ghost" className="w-full justify-start mt-1 h-8" onClick={(e) => { e.preventDefault(); setIsAddingCategory(true); }}><Plus className="mr-2 h-4 w-4"/>Añadir categoría</Button>
                            </SelectContent>
                        </Select>
                        )}
                    <FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="subcategoria" render={({ field }) => (
                     <FormItem><FormLabel>Subcategoría (Opcional)</FormLabel><Select onValueChange={field.onChange} value={field.value || ""} disabled={availableSubcategories.length === 0}>
                        <FormControl><SelectTrigger><SelectValue placeholder={availableSubcategories.length > 0 ? "Selecciona una subcategoría" : "Sin subcategorías"} /></SelectTrigger></FormControl>
                        <SelectContent>
                            {availableSubcategories.map((sub:string) => <SelectItem key={sub} value={sub}>{sub}</SelectItem>)}
                        </SelectContent>
                    </Select><FormMessage /></FormItem>
                )}/>
             </div>
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
                <FormItem><FormLabel>Notas (Opcional)</FormLabel><FormControl><Textarea placeholder="Añade una descripción..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )}/>
          </div>
          <div className="border-t p-4 bg-background mt-auto">
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Guardando...</>) : transaction ? 'Guardar Cambios' : 'Guardar Transacción'}
              </Button>
          </div>
        </form>
      </Form>
  );

  return Content;
}
