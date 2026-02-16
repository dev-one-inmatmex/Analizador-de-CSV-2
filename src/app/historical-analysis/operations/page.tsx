

'use client';

import * as React from 'react';
import { add, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfYear, endOfYear, eachMonthOfInterval, formatISO, parseISO } from 'date-fns';
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
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart,
  Calendar as CalendarIcon,
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
  Edit,
  Download,
  TrendingUp,
  X,
} from 'lucide-react';
import { Bar as RechartsBar, BarChart as RechartsBarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, AreaChart, Area } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
    <Card className="p-3">
        <div className="flex items-center gap-4">
        <div className="flex flex-col items-center w-12 flex-shrink-0">
            <div className={`rounded-lg p-2 ${isExpense ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
            {isExpense ? <ArrowDown className="h-5 w-5" /> : <ArrowUp className="h-5 w-5" />}
            </div>
            <span className={`text-[10px] mt-1 font-bold tracking-wider ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
            {isExpense ? 'GASTO' : 'INGRESO'}
            </span>
        </div>
        <div className="flex-1 space-y-0.5">
            <p className="font-bold leading-tight">{transaction.categoria}</p>
            <p className="text-sm text-muted-foreground">{format(new Date(transaction.fecha), 'dd MMM yyyy', { locale: es })}</p>
        </div>
        <div className="flex items-center gap-2">
            <div className="text-right">
                <p className={`font-bold text-base ${isExpense ? 'text-destructive' : 'text-green-600'}`}>
                {isExpense ? '-' : '+'} {money(transaction.monto)}
                </p>
            </div>
            <TransactionActions transaction={transaction} onEdit={onEdit} onDelete={onDelete} />
        </div>
        </div>
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

function BalanceCard({ balance, income, expense, periodLabel }: { balance: number, income: number, expense: number, periodLabel: string }) {
  return (
    <Card>
      <CardHeader className="items-center pb-4">
        <CardTitle>Balance {periodLabel}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <p className={`text-4xl font-bold ${balance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
          {money(balance)}
        </p>
        <Separator className="my-4" />
        <div className="flex w-full justify-around">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Ingresos</p>
            <p className="text-lg font-semibold text-green-600">{money(income)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Gastos</p>
            <p className="text-lg font-semibold text-red-600">{money(expense)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DailyTransactionSelector({ currentDate, setCurrentDate, setDateFilter }: { currentDate: Date, setCurrentDate: (d: Date) => void, setDateFilter: (f: DateFilter) => void }) {
  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentDate, { locale: es }),
    end: endOfWeek(currentDate, { locale: es }),
  });

  const handleDayClick = (day: Date) => {
    setCurrentDate(day);
    setDateFilter('day');
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Transacción diaria</h3>
      <div className="flex justify-between items-center space-x-1 rounded-lg bg-muted p-1">
        {weekDays.map(day => (
          <button
            key={day.toString()}
            onClick={() => handleDayClick(day)}
            className={cn(
              "flex flex-col items-center justify-center rounded-md p-2 w-full transition-colors",
              isSameDay(day, currentDate)
                ? "bg-primary text-primary-foreground shadow"
                : "hover:bg-background/50"
            )}
          >
            <span className="text-xs capitalize">{format(day, 'eee', { locale: es })}</span>
            <span className="font-bold text-lg">{format(day, 'd')}</span>
          </button>
        ))}
      </div>
    </div>
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

    const hydratedBudgets = React.useMemo(() => {
        return budgets.map(budget => {
            const spent = transactions
                .filter(t => t.tipo_transaccion === 'gasto' && t.categoria === budget.category && new Date(t.fecha) >= budget.startDate && new Date(t.fecha) <= budget.endDate)
                .reduce((sum, t) => sum + t.monto, 0);
            return { ...budget, spent };
        });
    }, [budgets, transactions]);


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
                    budgets={hydratedBudgets}
                    isLoading={isLoading}
                    dateFilter={dateFilter}
                    setDateFilter={setDateFilter}
                    currentDate={currentDate}
                    setCurrentDate={setCurrentDate}
                    onAddTransaction={() => handleOpenForm(null)}
                    onEditTransaction={handleOpenForm}
                    onDeleteTransaction={handleDeleteTransaction}
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
                {!isMobile ? (
                    <Tabs value={currentView} onValueChange={handleCurrentViewChange} className="w-auto">
                        <TabsList>
                            <TabsTrigger value="inicio"><Home className="mr-2 h-4 w-4" />Inicio</TabsTrigger>
                            <TabsTrigger value="informes"><BarChart className="mr-2 h-4 w-4" />Informes</TabsTrigger>
                            <TabsTrigger value="presupuestos"><List className="mr-2 h-4 w-4" />Presupuestos</TabsTrigger>
                            <TabsTrigger value="configuracion"><Cog className="mr-2 h-4 w-4" />Configuración</TabsTrigger>
                        </TabsList>
                    </Tabs>
                ) : (
                    <Button size="sm" onClick={() => handleOpenForm(null)}>
                        <Plus className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-7xl">{renderContent()}</div>
        </main>
        
        {isMobile && <BottomNav currentView={currentView} setView={handleCurrentViewChange} onAdd={() => handleOpenForm(null)} />}
        
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
            <span className="w-36 text-center font-semibold capitalize md:w-56">{getFormattedDate()}</span>
            <Button variant="ghost" size="icon" onClick={() => handleDateChange('next')}><ChevronRight className="h-5 w-5" /></Button>
        </div>
    </div>
  );
}


function InsightsView({ transactions, budgets, isLoading, dateFilter, setDateFilter, currentDate, setCurrentDate, onAddTransaction, onEditTransaction, onDeleteTransaction }: any) {
  const [detailModalOpen, setDetailModalOpen] = React.useState(false);
  const [detailModalContent, setDetailModalContent] = React.useState<{ title: string; transactions: finanzas[] } | null>(null);
  const isMobile = useIsMobile();

  const { totalIncome, totalExpense, potentialSaving } = React.useMemo(() => {
    const income = transactions.filter((t: finanzas) => t.tipo_transaccion === 'ingreso').reduce((sum: number, t: finanzas) => sum + t.monto, 0);
    const expense = transactions.filter((t: finanzas) => t.tipo_transaccion === 'gasto').reduce((sum: number, t: finanzas) => sum + t.monto, 0);
    const saving = income - expense;
    return { totalIncome: income, totalExpense: expense, potentialSaving: saving };
  }, [transactions]);
  
  const getPeriodLabel = () => {
    switch (dateFilter) {
      case 'day': return 'Diario';
      case 'week': return 'Semanal';
      case 'year': return 'Anual';
      case 'month':
      default: return 'Mensual';
    }
  }

  const expenseSummaryData = React.useMemo(() => {
    const dataPoints: { [key: string]: number } = {};
    let interval: Date[];
    let formatString: string;

    switch (dateFilter) {
        case 'week':
            interval = eachDayOfInterval({ start: startOfWeek(currentDate, { locale: es }), end: endOfWeek(currentDate, { locale: es }) });
            formatString = 'eee';
            break;
        case 'year':
            interval = eachMonthOfInterval({ start: startOfYear(currentDate), end: endOfYear(currentDate) });
            formatString = 'MMM';
            break;
        case 'month':
        default:
            interval = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
            formatString = 'd';
    }
    
    interval.forEach(day => {
        const dayKey = format(day, formatString, { locale: es });
        dataPoints[dayKey] = 0;
    });

    transactions.filter((t: finanzas) => t.tipo_transaccion === 'gasto').forEach((t: finanzas) => {
        try {
            const date = parseISO(t.fecha);
            const dayKey = format(date, formatString, { locale: es });
            if (dayKey in dataPoints) {
                dataPoints[dayKey] += t.monto;
            }
        } catch(e) { console.error("invalid date", t.fecha); }
    });
    
    return Object.entries(dataPoints).map(([name, Gastos]) => ({ name, Gastos }));
  }, [transactions, currentDate, dateFilter]);
  
  const dailyTransactions = React.useMemo(() => {
    return transactions.filter((t: finanzas) => {
        try {
            return isSameDay(parseISO(t.fecha), currentDate);
        } catch {
            return false;
        }
    }).sort((a,b) => b.monto - a.monto);
  }, [transactions, currentDate]);

  const handleBarClick = (data: any) => {
    if (!data || !data.activeLabel) return;
    
    const label = data.activeLabel;
    let formatString: string;
    
    switch (dateFilter) {
        case 'week': formatString = 'eee'; break;
        case 'year': formatString = 'MMM'; break;
        case 'month': default: formatString = 'd'; break;
    }

    const relevantTransactions = transactions.filter((t:finanzas) => {
        if (t.tipo_transaccion !== 'gasto') return false;
        try {
            const date = parseISO(t.fecha);
            return format(date, formatString, { locale: es }) === label;
        } catch {
            return false;
        }
    });

    if (relevantTransactions.length > 0) {
         let title = `Gastos del ${label}`;
         if (dateFilter === 'month') title = `Gastos del día ${label} de ${format(currentDate, 'MMMM', {locale: es})}`;
         else if (dateFilter === 'year') title = `Gastos de ${label} ${format(currentDate, 'yyyy')}`;
         else if (dateFilter === 'week') {
            const dayOfWeek = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'].indexOf(label);
            const start = startOfWeek(currentDate, { locale: es });
            if (dayOfWeek !== -1) {
                const clickedDate = add(start, { days: dayOfWeek });
                title = `Gastos del ${format(clickedDate, "EEEE, dd 'de' MMMM", { locale: es })}`;
            }
         }
         
         setDetailModalContent({
             title: title,
             transactions: relevantTransactions
         });
         setDetailModalOpen(true);
    }
  };

  if(isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-bold">Resumen Financiero</h2>
              <p className="text-muted-foreground">Tu resumen financiero del periodo.</p>
            </div>
            <div className="flex w-full flex-col-reverse items-center gap-4 md:w-auto md:flex-row">
              <PeriodNavigator dateFilter={dateFilter} setDateFilter={setDateFilter} currentDate={currentDate} setCurrentDate={setCurrentDate} />
               <Button onClick={onAddTransaction} className="w-full md:w-auto">
                    <Plus className="mr-2 h-4 w-4" /> Añadir Transacción
                </Button>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
                <BalanceCard 
                    balance={potentialSaving}
                    income={totalIncome}
                    expense={totalExpense}
                    periodLabel={getPeriodLabel()}
                />
                 <DailyTransactionSelector 
                    currentDate={currentDate}
                    setCurrentDate={setCurrentDate}
                    setDateFilter={setDateFilter}
                />
            </div>
            <Card className="lg:col-span-2 h-full">
                <CardHeader>
                    <CardTitle>
                        Transacciones del {format(currentDate, "dd 'de' MMMM", { locale: es })}
                    </CardTitle>
                </CardHeader>
                <CardContent className="max-h-[450px] overflow-y-auto">
                    {dailyTransactions.length > 0 ? (
                    isMobile ? (
                        <div className="space-y-4">
                        {dailyTransactions.map(t => (
                            <TransactionCard key={t.id} transaction={t} onEdit={onEditTransaction} onDelete={onDeleteTransaction} />
                        ))}
                        </div>
                    ) : (
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Categoría</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                            <TableHead><span className="sr-only">Acciones</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {dailyTransactions.map(t => (
                            <TableRow key={t.id}>
                                <TableCell className="font-medium">{t.categoria}</TableCell>
                                <TableCell>
                                <Badge variant={t.tipo_transaccion === 'gasto' ? 'destructive' : 'default'} className="capitalize">{t.tipo_transaccion}</Badge>
                                </TableCell>
                                <TableCell className={`text-right font-bold ${t.tipo_transaccion === 'gasto' ? 'text-red-600' : 'text-green-600'}`}>
                                {money(t.monto)}
                                </TableCell>
                                <TableCell>
                                <TransactionActions transaction={t} onEdit={onEditTransaction} onDelete={onDeleteTransaction} />
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    )
                    ) : (
                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8 h-full">
                        <CalendarIcon className="h-12 w-12 mb-4" />
                        <p>No hay transacciones para este día.</p>
                    </div>
                    )}
                </CardContent>
            </Card>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>Resumen de Gastos del Periodo</CardTitle>
                <CardDescription>Visualización de los gastos a lo largo del periodo seleccionado. Haz clic en una barra para ver el detalle.</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                    <RechartsBarChart data={expenseSummaryData} onClick={handleBarClick}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(value) => `$${Number(value)/1000}k`} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value: number) => money(value)} cursor={{ fill: 'hsl(var(--muted))' }}/>
                        <RechartsBar dataKey="Gastos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} cursor="pointer" />
                    </RechartsBarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>

        <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{detailModalContent?.title}</DialogTitle>
                    <DialogDescription>
                        Lista de gastos que componen el total del día/mes seleccionado.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Categoría</TableHead>
                                <TableHead>Notas</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {detailModalContent?.transactions.map(t => (
                                <TableRow key={t.id}>
                                    <TableCell className="font-medium">{t.categoria}</TableCell>
                                    <TableCell>{t.notas || '-'}</TableCell>
                                    <TableCell className="text-right font-bold text-destructive">{money(t.monto)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <DialogFooter>
                    <Button onClick={() => setDetailModalOpen(false)}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

    </div>
  )
}

function ReportsView({ transactions, dateFilter, setDateFilter, currentDate, setCurrentDate, transactionTypeFilter, setTransactionTypeFilter, onEditTransaction, onDeleteTransaction, isMobile }: { transactions: finanzas[], dateFilter: DateFilter, setDateFilter: (f: DateFilter) => void, currentDate: Date, setCurrentDate: (d: Date) => void, transactionTypeFilter: TransactionTypeFilter, setTransactionTypeFilter: (v: TransactionTypeFilter) => void, onEditTransaction: (t: finanzas) => void, onDeleteTransaction: (id: number) => void, isMobile: boolean }) {
    const { toast } = useToast();
    const [transactionPage, setTransactionPage] = React.useState(1);
    const TRANSACTION_PAGE_SIZE = 10;
    
    const filteredTransactions = React.useMemo(() => {
        return transactions.filter(t => transactionTypeFilter === 'all' || t.tipo_transaccion === transactionTypeFilter);
    }, [transactions, transactionTypeFilter]);

    const reportData = React.useMemo(() => {
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
        
        const incomesByCategory = filteredTransactions.filter(t => t.tipo_transaccion === 'ingreso').reduce((acc, t) => {
            const category = t.categoria || 'Sin Categoría';
            const existing = acc.find(item => item.name === category);
            if (existing) existing.value += t.monto; else acc.push({ name: category, value: t.monto });
            return acc;
        }, [] as { name: string, value: number }[]);
        
        const incomesByPaymentMethod = filteredTransactions.filter(t => t.tipo_transaccion === 'ingreso').reduce((acc, t) => {
            const method = t.metodo_pago || 'Otro';
            const existing = acc.find(item => item.name === method);
            if (existing) existing.value += t.monto; else acc.push({ name: method, value: t.monto });
            return acc;
        }, [] as { name: string, value: number }[]);

        let trendData: { name: string, Ingresos: number, Gastos: number }[] = [];
        if (dateFilter === 'year') {
            const months = eachMonthOfInterval({ start: startOfYear(currentDate), end: endOfYear(currentDate) });
            trendData = months.map(month => {
                const income = transactions.filter(t => t.tipo_transaccion === 'ingreso' && isSameDay(startOfMonth(new Date(t.fecha)), month)).reduce((sum, t) => sum + t.monto, 0);
                const expense = transactions.filter(t => t.tipo_transaccion === 'gasto' && isSameDay(startOfMonth(new Date(t.fecha)), month)).reduce((sum, t) => sum + t.monto, 0);
                return { name: format(month, 'MMM', { locale: es }), Ingresos: income, Gastos: expense };
            });
        } else if (dateFilter !== 'day') { // For week and month
             const days = dateFilter === 'week' 
                ? eachDayOfInterval({ start: startOfWeek(currentDate, { locale: es }), end: endOfWeek(currentDate, { locale: es }) })
                : eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
            trendData = days.map(day => {
                const income = transactions.filter(t => t.tipo_transaccion === 'ingreso' && isSameDay(new Date(t.fecha), day)).reduce((sum, t) => sum + t.monto, 0);
                const expense = transactions.filter(t => t.tipo_transaccion === 'gasto' && isSameDay(new Date(t.fecha), day)).reduce((sum, t) => sum + t.monto, 0);
                return { name: format(day, dateFilter === 'week' ? 'eee d' : 'd'), Ingresos: income, Gastos: expense };
            });
        }

        return { totalIncome, totalExpense, netBalance, expensesByCategory, expensesByPaymentMethod, trendData, incomesByCategory, incomesByPaymentMethod };
    }, [filteredTransactions, transactions, currentDate, dateFilter]);
    
    const PIE_COLORS = [
      "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
      "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(180, 50%, 50%)", "hsl(300, 50%, 50%)"
    ];

    const hasData = filteredTransactions.length > 0;

    const handleDownloadCsv = () => {
        if (!hasData) {
            toast({ title: 'No hay datos', description: 'No hay transacciones para exportar con el filtro actual.', variant: 'destructive' });
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(filteredTransactions);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Transacciones");
        XLSX.writeFile(workbook, `reporte_gastos_${new Date().toISOString().split('T')[0]}.csv`);
        
        toast({ title: 'Descarga Iniciada', description: 'Tu reporte CSV se está descargando.' });
    };

    const totalTransactionPages = Math.ceil(filteredTransactions.length / TRANSACTION_PAGE_SIZE);
    const paginatedTransactions = filteredTransactions.slice(
        (transactionPage - 1) * TRANSACTION_PAGE_SIZE,
        transactionPage * TRANSACTION_PAGE_SIZE
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
              <h2 className="text-2xl font-bold">Informes</h2>
              <Button onClick={handleDownloadCsv} variant="outline"><Download className="mr-2 h-4 w-4" /> Descargar CSV</Button>
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
                          <div className="space-y-4">
                              {paginatedTransactions.map(t => (
                                  <TransactionCard key={t.id} transaction={t} onEdit={onEditTransaction} onDelete={onDeleteTransaction} />
                              ))}
                          </div>
                      ) : (
                          <TransactionTable transactions={paginatedTransactions} onEdit={onEditTransaction} onDelete={onDeleteTransaction} />
                      )}
                  </CardContent>
                   {totalTransactionPages > 1 && (
                      <CardFooter>
                          <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
                              <div>Página {transactionPage} de {totalTransactionPages}</div>
                              <div className="flex items-center gap-2">
                                  <Button variant="outline" size="sm" onClick={() => setTransactionPage(p => Math.max(1, p - 1))} disabled={transactionPage === 1}>Anterior</Button>
                                  <Button variant="outline" size="sm" onClick={() => setTransactionPage(p => Math.min(totalTransactionPages, p + 1))} disabled={transactionPage === totalTransactionPages}>Siguiente</Button>
                              </div>
                          </div>
                      </CardFooter>
                  )}
              </Card>
            </>
            )}
        </div>
    );
}

function BudgetsView({ categories, transactions, budgets, setBudgets }: { categories: string[], transactions: finanzas[], budgets: Budget[], setBudgets: React.Dispatch<React.SetStateAction<Budget[]>> }) {
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

function ConfiguracionView({ categories, setCategories, dateFilter, setDateFilter }: { categories: Category[], setCategories: React.Dispatch<React.SetStateAction<Category[]>>, dateFilter: DateFilter, setDateFilter: React.Dispatch<React.SetStateAction<DateFilter>> }) {
    const { toast } = useToast();
    const [newCategoryName, setNewCategoryName] = React.useState('');
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = React.useState(false);
    const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
    const [deletingCategoryName, setDeletingCategoryName] = React.useState<string | null>(null);
    const [categoryInputValue, setCategoryInputValue] = React.useState('');
    
    const [newSubcategoryName, setNewSubcategoryName] = React.useState('');
    const [editingSubcategory, setEditingSubcategory] = React.useState<{ category: Category, subcategory: string } | null>(null);


    const handleAddCategory = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newCategoryName.trim();
        if (trimmed && !categories.some(c => c.name === trimmed)) {
            setCategories(prev => [...prev, { name: trimmed, subcategories: [] }].sort((a,b) => a.name.localeCompare(b.name)));
            setNewCategoryName('');
            toast({ title: 'Categoría añadida', description: `"${trimmed}" se ha añadido a la lista.` });
        } else if (!trimmed) {
            toast({ title: 'Campo vacío', description: 'El nombre de la categoría no puede estar vacío.', variant: 'destructive' });
        } else {
            toast({ title: 'Categoría duplicada', description: 'Esa categoría ya existe.', variant: 'destructive' });
        }
    };
    
    const handleOpenEditDialog = (category: Category) => {
        setEditingCategory(category);
        setCategoryInputValue(category.name);
        setNewSubcategoryName('');
        setIsCategoryDialogOpen(true);
    };

    const handleUpdateCategory = () => {
        if (!editingCategory) return;
        const trimmed = categoryInputValue.trim();
        if (trimmed && !categories.some(c => c.name === trimmed && c.name !== editingCategory.name)) {
            setCategories(prev => prev.map(c => c.name === editingCategory.name ? { ...c, name: trimmed } : c)
                                      .sort((a, b) => a.name.localeCompare(b.name)));
            toast({ title: 'Categoría actualizada' });
        } else {
             toast({ title: 'Error', description: 'El nombre no puede estar vacío o ya existe.', variant: 'destructive' });
        }
    };
    
    const handleAddSubcategory = () => {
        if (!editingCategory || !newSubcategoryName.trim()) return;
        const trimmedSub = newSubcategoryName.trim();
        if (editingCategory.subcategories.includes(trimmedSub)) {
             toast({ title: 'Subcategoría duplicada', variant: 'destructive' });
             return;
        }
        const updatedCategory = { ...editingCategory, subcategories: [...editingCategory.subcategories, trimmedSub].sort() };
        setCategories(prev => prev.map(c => c.name === editingCategory.name ? updatedCategory : c));
        setEditingCategory(updatedCategory); // update state for the open dialog
        setNewSubcategoryName('');
    }
    
    const handleDeleteSubcategory = (subcategory: string) => {
        if (!editingCategory) return;
        const updatedCategory = { ...editingCategory, subcategories: editingCategory.subcategories.filter(s => s !== subcategory) };
        setCategories(prev => prev.map(c => c.name === editingCategory.name ? updatedCategory : c));
        setEditingCategory(updatedCategory);
    }

    const handleOpenDeleteDialog = (categoryName: string) => {
        setDeletingCategoryName(categoryName);
        setIsDeleteDialogOpen(true);
    };

    const confirmDeleteCategory = () => {
        if (deletingCategoryName !== null) {
            setCategories(prev => prev.filter(c => c.name !== deletingCategoryName));
            toast({ title: 'Categoría eliminada' });
        }
        setIsDeleteDialogOpen(false);
        setDeletingCategoryName(null);
    };

    const periodLabels: Record<DateFilter, string> = { day: 'Diario', week: 'Semanal', month: 'Mensual', year: 'Anual' };

    return (
        <>
            <div className="space-y-8">
                <h2 className="text-2xl font-bold">Configuración</h2>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Gestionar Categorías y Subcategorías</CardTitle>
                        <CardDescription>Añade, edita o elimina las categorías para tus transacciones.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddCategory} className="flex items-center gap-2 mb-4">
                            <Input 
                                placeholder="Nombre de la nueva categoría" 
                                value={newCategoryName} 
                                onChange={(e) => setNewCategoryName(e.target.value)}
                            />
                            <Button type="submit"><Plus className="mr-2 h-4 w-4" />Añadir Categoría</Button>
                        </form>
                        <div className="space-y-2 rounded-md border p-2">
                            {categories.map((category) => (
                                <div key={category.name} className="flex items-center justify-between rounded-md p-2 hover:bg-muted/50">
                                    <div className="flex flex-col">
                                        <span className="font-medium">{category.name}</span>
                                        {category.subcategories.length > 0 && 
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {category.subcategories.map(sub => <Badge key={sub} variant="secondary">{sub}</Badge>)}
                                            </div>
                                        }
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEditDialog(category)}>
                                            <Pencil className="h-4 w-4" />
                                            <span className="sr-only">Editar</span>
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleOpenDeleteDialog(category.name)}>
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
                                <Badge key={method} variant="outline">{method}</Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Dialog for Editing Category */}
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Editar Categoría: {editingCategory?.name}</DialogTitle>
                        <DialogDescription>Cambia el nombre de la categoría y gestiona sus subcategorías.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="category-name">Nombre de la Categoría</Label>
                             <div className="flex gap-2">
                                <Input id="category-name" value={categoryInputValue} onChange={(e) => setCategoryInputValue(e.target.value)} className="mt-1" />
                                <Button onClick={handleUpdateCategory} variant="outline">Guardar Nombre</Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Subcategorías</Label>
                             <div className="flex items-center gap-2">
                                <Input placeholder="Nueva subcategoría" value={newSubcategoryName} onChange={(e) => setNewSubcategoryName(e.target.value)} />
                                <Button type="button" onClick={handleAddSubcategory}>Añadir</Button>
                            </div>
                             <div className="space-y-2 rounded-md border p-2 mt-2 max-h-40 overflow-y-auto">
                                {editingCategory?.subcategories.length === 0 && <p className="text-xs text-center text-muted-foreground p-2">Sin subcategorías</p>}
                                {editingCategory?.subcategories.map((sub, index) => (
                                    <div key={index} className="flex items-center justify-between rounded-md p-1.5 hover:bg-muted/50">
                                        <span className="text-sm">{sub}</span>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteSubcategory(sub)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setIsCategoryDialogOpen(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog for Deleting Category */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>¿Estás seguro de eliminar esta categoría?</DialogTitle>
                        <DialogDescription>
                            Esta acción no se puede deshacer. Se eliminará la categoría <span className="font-bold">{deletingCategoryName && `"${deletingCategoryName}"`}</span>.
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


function BottomNav({ currentView, setView, onAdd }: { currentView: View, setView: (v: View) => void, onAdd: () => void }) {
  const navItems = [
    { id: 'inicio', label: 'Inicio', icon: Home },
    { id: 'presupuestos', label: 'Presupuestos', icon: List },
    { id: 'add', label: 'Añadir', icon: Plus },
    { id: 'informes', label: 'Informes', icon: BarChart },
    { id: 'configuracion', label: 'Ajustes', icon: Cog },
  ] as const;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background shadow-t-lg md:hidden">
      <div className="grid h-20 grid-cols-5 items-center">
        {navItems.map(item => {
            if(item.id === 'add') {
                return (
                    <div key={item.id} className="flex justify-center items-center -mt-8">
                        <Button
                            size="icon"
                            className="h-16 w-16 rounded-full shadow-lg"
                            onClick={onAdd}
                        >
                            <Plus className="h-8 w-8" />
                        </Button>
                    </div>
                );
            }

            return (
              <Button
                key={item.id}
                variant="ghost"
                className={cn(
                  "flex h-full w-full flex-col items-center justify-center rounded-none gap-1 pt-2",
                  currentView === item.id ? "text-primary bg-primary/10" : "text-muted-foreground"
                )}
                onClick={() => setView(item.id as View)}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs">{item.label}</span>
              </Button>
            )
        })}
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
      subcategoria: null,
      fecha: new Date(),
      metodo_pago: undefined,
      notas: '',
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

      




