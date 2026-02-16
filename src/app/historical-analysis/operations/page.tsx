'use client';

import * as React from 'react';
import { add, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths, getDaysInMonth, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  CreditCard,
  NotebookText,
  HelpCircle,
} from 'lucide-react';
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
  SheetTrigger,
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/lib/supabaseClient';


type View = 'inicio' | 'informes' | 'presupuestos' | 'configuracion';

// Mock data until category management is fully implemented
const initialCategories = ['Comida', 'Transporte', 'Insumos', 'Servicios', 'Marketing', 'Renta', 'Sueldos', 'Otro'];

const money = (v?: number | null) => v === null || v === undefined ? '$0.00' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);

// --- Main Page Component ---
export default function OperationsPage() {
  const [currentView, setCurrentView] = React.useState<View>('inicio');
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [selectedDay, setSelectedDay] = React.useState(new Date());
  const [transactions, setTransactions] = React.useState<finanzas[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingTransaction, setEditingTransaction] = React.useState<finanzas | null>(null);
  const [categories, setCategories] = React.useState(initialCategories);

  const isMobile = useIsMobile();
  const { toast } = useToast();

  // Data fetching
  React.useEffect(() => {
    const fetchTransactions = async () => {
      if (!supabase) {
        toast({ title: 'Error de Conexión', description: 'No se pudo conectar a la base de datos.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const { data, error } = await supabase
        .from('finanzas')
        .select('*')
        .gte('fecha', format(startOfMonth(currentMonth), 'yyyy-MM-dd'))
        .lte('fecha', format(endOfMonth(currentMonth), 'yyyy-MM-dd'))
        .order('fecha', { ascending: false });

      if (error) {
        toast({ title: 'Error al Cargar Datos', description: error.message, variant: 'destructive' });
      } else {
        setTransactions(data as finanzas[]);
      }
      setIsLoading(false);
    };
    fetchTransactions();
  }, [currentMonth, toast]);

  const handleMonthChange = (direction: 'next' | 'prev') => {
    setCurrentMonth(prev => subMonths(prev, direction === 'prev' ? 1 : -1));
  };
  
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
            capturista: 'WebApp User',
            subcategoria: null,
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

        // Manually update local state for immediate feedback
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const transactionDate = startOfDay(values.fecha);

        if (transactionDate >= monthStart && transactionDate <= monthEnd) {
            if (editingTransaction) {
                 setTransactions(prev => prev.map(t => t.id === editingTransaction!.id ? { ...t, ...values, fecha: values.fecha.toISOString() } as finanzas : t));
            } else {
                 // We don't have the new ID, so we fetch again
                 const { data } = await supabase.from('finanzas').select('*').gte('fecha', format(monthStart, 'yyyy-MM-dd')).lte('fecha', format(monthEnd, 'yyyy-MM-dd')).order('fecha', { ascending: false });
                 if (data) setTransactions(data as finanzas[]);
            }
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


  const { dailyTransactions, monthlyBalance } = React.useMemo(() => {
    const daily = transactions.filter(t => isSameDay(new Date(t.fecha), selectedDay));
    const income = transactions.filter(t => t.tipo_transaccion === 'ingreso').reduce((sum, t) => sum + t.monto, 0);
    const expense = transactions.filter(t => t.tipo_transaccion === 'gasto').reduce((sum, t) => sum + t.monto, 0);
    return { dailyTransactions: daily, monthlyBalance: { income, expense, total: income - expense } };
  }, [transactions, selectedDay]);

  const daysOfMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const renderContent = () => {
    switch (currentView) {
      case 'inicio':
        return <InicioView 
                    currentMonth={currentMonth} 
                    handleMonthChange={handleMonthChange}
                    monthlyBalance={monthlyBalance}
                    daysOfMonth={daysOfMonth}
                    selectedDay={selectedDay}
                    setSelectedDay={setSelectedDay}
                    dailyTransactions={dailyTransactions}
                    isLoading={isLoading}
                    onEdit={handleOpenForm}
                    onDelete={handleDeleteTransaction}
                />;
      case 'informes':
        return <PlaceholderView title="Informes y Reportes" icon={BarChart} />;
      case 'presupuestos':
        return <PlaceholderView title="Presupuestos" icon={Landmark} />;
      case 'configuracion':
        return <PlaceholderView title="Configuración" icon={Cog} />;
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
            {!isMobile && (
                <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as View)} className="w-auto">
                    <TabsList>
                        <TabsTrigger value="inicio"><Home className="mr-2 h-4 w-4" />Inicio</TabsTrigger>
                        <TabsTrigger value="informes"><BarChart className="mr-2 h-4 w-4" />Informes</TabsTrigger>
                        <TabsTrigger value="presupuestos"><Landmark className="mr-2 h-4 w-4" />Presupuestos</TabsTrigger>
                        <TabsTrigger value="configuracion"><Cog className="mr-2 h-4 w-4" />Configuración</TabsTrigger>
                    </TabsList>
                </Tabs>
            )}
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-6xl">{renderContent()}</div>
        </main>
        
        {isMobile && <BottomNav currentView={currentView} setView={setCurrentView} />}
        
        <div className="fixed bottom-20 right-4 z-40 md:bottom-8 md:right-8">
             <Dialog open={!isMobile && isFormOpen} onOpenChange={setIsFormOpen}>
                 <DialogTrigger asChild>
                    <Button size="icon" className="h-14 w-14 rounded-full shadow-lg" onClick={() => handleOpenForm(null)}>
                        <Plus className="h-6 w-6" />
                        <span className="sr-only">Añadir Transacción</span>
                    </Button>
                 </DialogTrigger>
                 <DialogContent className="max-w-md p-0 flex flex-col h-auto max-h-[90vh]">{FormComponent}</DialogContent>
             </Dialog>
        </div>
        <div className="md:hidden">
            <Sheet open={isMobile && isFormOpen} onOpenChange={setIsFormOpen}>
                 <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl">{FormComponent}</SheetContent>
            </Sheet>
        </div>
    </div>
  );
}


// --- Sub-components for OperationsPage ---

function InicioView({ currentMonth, handleMonthChange, monthlyBalance, daysOfMonth, selectedDay, setSelectedDay, dailyTransactions, isLoading, onEdit, onDelete }: any) {
    const isMobile = useIsMobile();
    return (
        <div className="space-y-6">
            <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
                <div>
                    <h2 className="text-2xl font-bold">Hola, Usuario! 👋</h2>
                    <p className="text-muted-foreground">Aquí tienes el resumen de tus finanzas.</p>
                </div>
                <div className="flex items-center gap-2 rounded-lg border bg-background p-1">
                    <Button variant="ghost" size="icon" onClick={() => handleMonthChange('prev')}><ChevronLeft className="h-5 w-5" /></Button>
                    <span className="w-32 text-center font-semibold capitalize">{format(currentMonth, 'MMMM yyyy', { locale: es })}</span>
                    <Button variant="ghost" size="icon" onClick={() => handleMonthChange('next')}><ChevronRight className="h-5 w-5" /></Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Balance Mensual</CardTitle>
                    <CardDescription>Resumen de tus ingresos y gastos para {format(currentMonth, 'MMMM', { locale: es })}.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
                     <div className="flex items-center gap-4 rounded-lg border p-4">
                        <div className="rounded-full bg-green-100 p-3 text-green-600 dark:bg-green-900/50 dark:text-green-400"><ArrowUp/></div>
                        <div><p className="text-sm text-muted-foreground">Ingresos</p><p className="text-xl font-bold">{money(monthlyBalance.income)}</p></div>
                    </div>
                     <div className="flex items-center gap-4 rounded-lg border p-4">
                        <div className="rounded-full bg-red-100 p-3 text-red-600 dark:bg-red-900/50 dark:text-red-400"><ArrowDown/></div>
                        <div><p className="text-sm text-muted-foreground">Gastos</p><p className="text-xl font-bold">{money(monthlyBalance.expense)}</p></div>
                    </div>
                     <div className="flex items-center gap-4 rounded-lg border bg-primary/5 p-4">
                        <div className="rounded-full bg-primary/10 p-3 text-primary"><Landmark/></div>
                        <div><p className="text-sm text-muted-foreground">Balance Total</p><p className="text-xl font-bold">{money(monthlyBalance.total)}</p></div>
                    </div>
                </CardContent>
            </Card>

            <div>
                <h3 className="mb-3 text-lg font-semibold">Transacciones del Día</h3>
                <div className="flex space-x-2 overflow-x-auto pb-4">
                    {daysOfMonth.map(day => (
                        <Button key={day.toString()} variant={isSameDay(day, selectedDay) ? "default" : "outline"}
                            className="flex flex-col h-16 w-14 shrink-0 rounded-xl"
                            onClick={() => setSelectedDay(day)}>
                            <span className="text-xs font-normal capitalize">{format(day, 'E', { locale: es })}</span>
                            <span className="text-xl font-bold">{format(day, 'd')}</span>
                        </Button>
                    ))}
                </div>
            </div>
            
            {isLoading ? <p className="text-center text-muted-foreground">Cargando transacciones...</p> : (
            <div className="space-y-4">
                {dailyTransactions.length === 0 ? <p className="text-center text-muted-foreground pt-4">No hay transacciones para este día.</p>
                : isMobile ? dailyTransactions.map((t: finanzas) => <TransactionCard key={t.id} transaction={t} onEdit={onEdit} onDelete={onDelete} />)
                : <TransactionTable transactions={dailyTransactions} onEdit={onEdit} onDelete={onDelete} />}
            </div>
            )}
        </div>
    );
}

function TransactionCard({ transaction, onEdit, onDelete }: { transaction: finanzas, onEdit: (t: finanzas) => void, onDelete: (id: number) => void }) {
  const isExpense = transaction.tipo_transaccion === 'gasto';
  return (
    <Card className="flex items-center p-4 gap-4">
      <div className={`rounded-full p-3 ${isExpense ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
        {isExpense ? <ArrowUp /> : <ArrowDown />}
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
                  <span className={cn("px-2 py-1 rounded-full text-xs font-semibold", t.tipo_transaccion === 'gasto' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')}>
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


function PlaceholderView({ title, icon: Icon }: { title: string; icon: React.ElementType }) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center">
      <Icon className="h-12 w-12 text-muted-foreground" />
      <h3 className="mt-4 text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">Este módulo está en construcción. ¡Vuelve pronto!</p>
    </div>
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
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      tipo_transaccion: 'gasto',
      monto: 0,
      categoria: '',
      fecha: new Date(),
      metodo_pago: undefined,
      notas: '',
    },
  });
  
  React.useEffect(() => {
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
      form.reset();
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex h-full flex-col">
          <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-6">
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
                          <ArrowUp className="mb-3 h-6 w-6 text-red-500" />Gasto</Label>
                      </FormItem>
                       <FormItem>
                        <FormControl>
                          <RadioGroupItem value="ingreso" id="ingreso" className="sr-only peer" />
                        </FormControl>
                         <Label htmlFor="ingreso" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                          <ArrowDown className="mb-3 h-6 w-6 text-green-500" />Ingreso</Label>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="monto" render={({ field }) => (
                <FormItem><FormLabel>Monto</FormLabel><FormControl><Input type="number" placeholder="$0.00" {...field} /></FormControl><FormMessage /></FormItem>
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
          <div className="border-t p-4">
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Guardando...' : transaction ? 'Guardar Cambios' : 'Guardar Transacción'}
              </Button>
          </div>
        </form>
      </Form>
  );

  return (
    <>
        <SheetHeader className="p-4 border-b">
            <SheetTitle>{transaction ? 'Editar' : 'Añadir'} Transacción</SheetTitle>
            <SheetDescription>
                {transaction ? 'Modifica los detalles de la transacción.' : 'Registra un nuevo gasto o ingreso.'}
            </SheetDescription>
        </SheetHeader>
        {Content}
    </>
  );
}
    