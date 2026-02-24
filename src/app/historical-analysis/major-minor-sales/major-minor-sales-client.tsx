'use client';

import { GitCompareArrows, Filter, PieChart as PieChartIcon, BarChart3, DollarSign, Loader2, Package, Search, Warehouse, Info, MapPin, Box, Boxes, ClipboardList, Tag } from 'lucide-react';
import * as React from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DateRange } from 'react-day-picker';
import { subDays, formatDistanceToNow, startOfDay, endOfDay, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import type { Transaction } from './page';
import type { inventario_master } from '@/types/database';

const PAGE_SIZE = 15;

function ClientRelativeTime({ dateString }: { dateString: string }) {
  const [relativeTime, setRelativeTime] = React.useState('');

  React.useEffect(() => {
    if (dateString) {
      try {
        setRelativeTime(formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: es }));
      } catch (e) {
        setRelativeTime('Fecha inválida');
      }
    }
  }, [dateString]);
  
  return <>{relativeTime || '...'}</>;
}

export default function MajorMinorSalesClientPage({ 
  initialRecentTransactions,
  inventoryMaster
}: { 
  initialRecentTransactions: Transaction[],
  inventoryMaster: inventario_master[]
}) {
  const { toast } = useToast();
  
  const [saleType, setSaleType] = React.useState('Todos');
  const [customer, setCustomer] = React.useState('Todos');
  const [date, setDate] = React.useState<DateRange | undefined>();
  const [isClient, setIsClient] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  
  // Inventory state
  const [invPage, setInvPage] = React.useState(1);
  const [invSearch, setInvSearch] = React.useState('');

  React.useEffect(() => {
    setDate({
      from: subDays(new Date(), 29),
      to: new Date(),
    });
    setIsClient(true);
  }, []);

  const { displayedTransactions, allCustomers, kpis, revenueByTypeData, topWholesaleCustomersData } = React.useMemo(() => {
    const customers = ['Todos', ...Array.from(new Set(initialRecentTransactions.map(t => t.customer)))];
    
    const filtered = initialRecentTransactions.filter(t => {
      const typeMatch = saleType === 'Todos' || t.type === saleType;
      const customerMatch = customer === 'Todos' || t.customer === customer;
      if (!typeMatch || !customerMatch) return false;

      if (date?.from) {
        if (!t.date) return false;
        try {
            const transactionDate = parseISO(t.date);
            if (!isValid(transactionDate)) return false;

            const fromDate = startOfDay(date.from);
            const toDate = date.to ? endOfDay(date.to) : endOfDay(date.from);

            if (transactionDate < fromDate || transactionDate > toDate) {
                return false;
            }
        } catch (e) {
            return false;
        }
      }

      return true;
    });

    const wholesaleRevenue = filtered.filter(t => t.type === 'Mayorista').reduce((sum, t) => sum + t.amount, 0);
    const retailRevenue = filtered.filter(t => t.type === 'Minorista').reduce((sum, t) => sum + t.amount, 0);
    const wholesaleTransactions = filtered.filter(t => t.type === 'Mayorista').length;
    const retailTransactions = filtered.filter(t => t.type === 'Minorista').length;
    
    const revenueData = [
      { type: 'Mayorista', value: wholesaleRevenue, color: 'hsl(var(--chart-1))' },
      { type: 'Minorista', value: retailRevenue, color: 'hsl(var(--chart-2))' },
    ];
    
    const customerRevenue: Record<string, number> = {};
    filtered.filter(t => t.type === 'Mayorista').forEach(t => {
      customerRevenue[t.customer] = (customerRevenue[t.customer] || 0) + t.amount;
    });
    
    const topCustomers = Object.entries(customerRevenue)
      .map(([customer, revenue]) => ({ customer, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      displayedTransactions: filtered,
      allCustomers: customers,
      kpis: { wholesaleRevenue, retailRevenue, wholesaleTransactions, retailTransactions },
      revenueByTypeData: revenueData,
      topWholesaleCustomersData: topCustomers
    };
  }, [initialRecentTransactions, saleType, customer, date]);

  const filteredInventory = React.useMemo(() => {
    if (!invSearch) return inventoryMaster;
    const q = invSearch.toLowerCase();
    return inventoryMaster.filter(item => 
      (item.sku?.toLowerCase() || '').includes(q) ||
      (item.nombre_siggo?.toLowerCase() || '').includes(q) ||
      (item.cod_siggo?.toLowerCase() || '').includes(q) ||
      (item.cat_mdr?.toLowerCase() || '').includes(q) ||
      (item.sku_mdr?.toLowerCase() || '').includes(q)
    );
  }, [inventoryMaster, invSearch]);

  const handleApplyFilters = () => {
    toast({ title: 'Filtros aplicados', description: 'Los datos de ventas han sido actualizados.' });
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSaleType('Todos');
    setCustomer('Todos');
    setDate({ from: subDays(new Date(), 29), to: new Date() });
    setCurrentPage(1);
  };
  
  const totalPages = Math.ceil(displayedTransactions.length / PAGE_SIZE);
  const paginatedTransactions = displayedTransactions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const totalInvPages = Math.ceil(filteredInventory.length / PAGE_SIZE);
  const paginatedInventory = filteredInventory.slice((invPage - 1) * PAGE_SIZE, invPage * PAGE_SIZE);

  if (!isClient) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-xl font-bold tracking-tight">Consumo (ventas + Siggo)</h1>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-10 space-y-8">
        <Tabs defaultValue="consumption" className="w-full">
          <TabsList className="bg-muted/40 p-1 mb-8">
            <TabsTrigger value="consumption" className="text-xs font-bold uppercase">Análisis de Consumo</TabsTrigger>
            <TabsTrigger value="inventory" className="text-xs font-bold uppercase">Filtrado por categorías</TabsTrigger>
          </TabsList>

          <TabsContent value="consumption" className="space-y-8 animate-in fade-in duration-500">
            <Card className="border-none shadow-sm">
                <CardHeader className="flex flex-row items-center gap-4">
                    <Filter className="h-6 w-6 text-primary" />
                    <div><CardTitle>Filtros de Segmentación</CardTitle><CardDescription>Analiza por tipo de venta, cliente o periodo de tiempo.</CardDescription></div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-2 lg:col-span-2"><Label htmlFor="date-range">Periodo</Label><DateRangePicker id="date-range" date={date} onSelect={setDate} /></div>
                        <div className="space-y-2"><Label htmlFor="type-filter">Tipo de Venta</Label><Select value={saleType} onValueChange={setSaleType}><SelectTrigger id="type-filter"><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger><SelectContent>{['Todos', 'Mayorista', 'Minorista'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label htmlFor="customer-filter">Cliente</Label><Select value={customer} onValueChange={setCustomer}><SelectTrigger id="customer-filter"><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger><SelectContent>{allCustomers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                    </div>
                    <div className="mt-4 flex items-center justify-end gap-2"><Button variant="outline" onClick={handleClearFilters}>Limpiar Filtros</Button><Button onClick={handleApplyFilters}>Aplicar Filtros</Button></div>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Ingresos Mayoristas</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-black">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(kpis.wholesaleRevenue)}</div><p className="text-[10px] text-muted-foreground font-medium uppercase mt-1">{kpis.wholesaleTransactions.toLocaleString('es-MX')} transacciones</p></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Ingresos Minoristas</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-black">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(kpis.retailRevenue)}</div><p className="text-[10px] text-muted-foreground font-medium uppercase mt-1">{kpis.retailTransactions.toLocaleString('es-MX')} transacciones</p></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-widest">% Ingreso Mayorista</CardTitle><PieChartIcon className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-black text-primary">{((kpis.wholesaleRevenue / (kpis.wholesaleRevenue + kpis.retailRevenue || 1)) * 100).toFixed(1)}%</div><p className="text-[10px] text-muted-foreground font-medium uppercase mt-1">Del total de ingresos filtrados</p></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Ticket Prom. Mayorista</CardTitle><BarChart3 className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-black">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(kpis.wholesaleTransactions > 0 ? kpis.wholesaleRevenue / kpis.wholesaleTransactions : 0)}</div><p className="text-[10px] text-muted-foreground font-medium uppercase mt-1">Valor medio por transacción</p></CardContent></Card>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                <Card className="lg:col-span-2 border-none shadow-sm">
                  <CardHeader><CardTitle className="text-sm font-bold uppercase">Distribución de Ingresos</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Tooltip formatter={(value) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value as number)} />
                        <Pie 
                          data={revenueByTypeData} 
                          dataKey="value" 
                          nameKey="type" 
                          innerRadius={60} 
                          outerRadius={80} 
                          paddingAngle={5} 
                          label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        >
                          {revenueByTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Legend wrapperStyle={{fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold'}} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-3 border-none shadow-sm">
                  <CardHeader><CardTitle className="text-sm font-bold uppercase">Top 5 Clientes Mayoristas</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={topWholesaleCustomersData} layout="vertical" margin={{left: 20, right: 40}}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                        <XAxis type="number" tickFormatter={(value) => `$${(value as number / 1000)}k`} fontSize={10} />
                        <YAxis type="category" dataKey="customer" width={100} fontSize={9} fontWeight="bold" axisLine={false} tickLine={false} />
                        <Tooltip formatter={(value) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value as number)} />
                        <Bar dataKey="revenue" name="Ingresos" fill="#2D5A4C" radius={[0, 4, 4, 0]} barSize={25} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                
                <Card className="lg:col-span-5 border-none shadow-sm overflow-hidden">
                    <CardHeader className="bg-muted/10"><CardTitle className="text-sm font-bold uppercase">Transacciones Recientes</CardTitle></CardHeader>
                    <div className="table-responsive">
                        {paginatedTransactions.length > 0 ? (
                            <Table>
                                <TableHeader className="bg-muted/20">
                                    <TableRow>
                                        <TableHead className="text-[10px] font-black uppercase">ID Transacción</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase">Cliente</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase">Tipo</TableHead>
                                        <TableHead className="text-right text-[10px] font-black uppercase">Monto</TableHead>
                                        <TableHead className="text-right text-[10px] font-black uppercase">Fecha</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedTransactions.map((item) => (
                                        <TableRow key={item.id} className="h-14">
                                            <TableCell className="font-mono text-[10px] text-primary font-bold">{item.id}</TableCell>
                                            <TableCell className="font-bold text-xs uppercase">{item.customer}</TableCell>
                                            <TableCell><Badge variant={item.type === 'Mayorista' ? 'default' : 'secondary'} className="text-[9px] font-black uppercase">{item.type}</Badge></TableCell>
                                            <TableCell className="text-right font-black text-sm">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(item.amount)}</TableCell>
                                            <TableCell className="text-right text-[10px] font-bold text-muted-foreground"><ClientRelativeTime dateString={item.date} /></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="p-20 text-center space-y-4">
                                <GitCompareArrows className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Sin transacciones registradas</p>
                            </div>
                        )}
                    </div>
                    {totalPages > 1 && (
                        <CardFooter className="bg-muted/5 border-t py-4">
                            <div className="flex w-full items-center justify-between text-[10px] font-bold uppercase text-muted-foreground">
                                <div>Página {currentPage} de {totalPages}</div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</Button>
                                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Siguiente</Button>
                                </div>
                            </div>
                        </CardFooter>
                    )}
                </Card>
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="animate-in slide-in-from-bottom-4 duration-500">
            <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b bg-white">
                    <div className="flex items-center gap-4">
                        <Warehouse className="h-8 w-8 text-primary" />
                        <div>
                            <CardTitle className="text-lg font-black uppercase tracking-tight">Inventario Maestro (Siggo)</CardTitle>
                            <CardDescription className="text-xs font-bold uppercase">Auditoría global de existencias y parámetros operativos.</CardDescription>
                        </div>
                    </div>
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="BUSCAR POR SKU, NOMBRE O CATEGORÍA..." 
                            className="pl-9 h-10 font-bold text-[10px] uppercase border-slate-200" 
                            value={invSearch}
                            onChange={(e) => { setInvSearch(e.target.value); setInvPage(1); }}
                        />
                    </div>
                </CardHeader>
                <div className="table-responsive bg-white">
                    <ScrollArea className="w-full whitespace-nowrap">
                        <Table className="min-w-[3500px]">
                            <TableHeader className="bg-slate-50/50">
                                <TableRow className="h-12">
                                    <TableHead className="text-[10px] font-black uppercase tracking-wider sticky left-0 bg-slate-50 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">SKU</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-wider">Categoría Madre</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-wider">Sub Categoría</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-wider">SKU Madre</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-wider text-center">Landed ID</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-wider text-center">Pzs x SKU</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-wider text-center">Esti Time</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-wider">Emp. Master</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-wider text-center">Pz Emp. Master</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-wider">Código Siggo</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-wider">Nombre Siggo</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-wider text-center">Stock Maestro</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-wider text-center">Mínimo Stock</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-wider text-center">Máximo Stock</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-wider text-center">Días s/ Mov</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-wider text-center">Pzs Totales</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-wider text-center">Estado Siggo</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-wider">Bodega</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-wider">Bloque</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-wider text-center">Unidad</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedInventory.length > 0 ? (
                                    paginatedInventory.map((item) => (
                                        <TableRow key={item.sku} className="h-14 hover:bg-slate-50 transition-colors">
                                            <TableCell className="font-mono text-xs font-bold text-primary sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">{item.sku}</TableCell>
                                            <TableCell className="text-[10px] font-black uppercase text-slate-600">{item.cat_mdr || '-'}</TableCell>
                                            <TableCell className="text-[10px] font-bold text-slate-500">{item.sub_cat || '-'}</TableCell>
                                            <TableCell className="font-mono text-[10px] font-bold text-blue-600">{item.sku_mdr || '-'}</TableCell>
                                            <TableCell className="text-center font-mono text-[9px] text-muted-foreground">{item.landed_cost_id || '-'}</TableCell>
                                            <TableCell className="text-center font-black text-xs">{item.piezas_por_sku || '-'}</TableCell>
                                            <TableCell className="text-center font-bold text-orange-600">{item.esti_time ? `${item.esti_time}d` : '-'}</TableCell>
                                            <TableCell className="text-[10px] font-bold">{item.empaquetado_master || '-'}</TableCell>
                                            <TableCell className="text-center font-black text-xs text-slate-500">{item.pz_empaquetado_master || '-'}</TableCell>
                                            <TableCell className="text-[9px] font-mono text-muted-foreground">{item.cod_siggo}</TableCell>
                                            <TableCell>
                                                <div className="font-bold text-[11px] uppercase leading-tight truncate max-w-[250px]" title={item.nombre_siggo || ''}>{item.nombre_siggo || '-'}</div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={Number(item.stock_maestro) <= Number(item.min_stock) ? 'destructive' : 'outline'} className="font-black text-xs">
                                                    {item.stock_maestro?.toLocaleString() || '0'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center font-bold text-slate-400 text-[9px]">{item.min_stock || 0}</TableCell>
                                            <TableCell className="text-center font-bold text-slate-400 text-[9px]">{item.max_stock || 0}</TableCell>
                                            <TableCell className="text-center font-bold text-red-500">{item.dias_sin_mov_siggo || '-'}</TableCell>
                                            <TableCell className="text-center font-black text-xs text-slate-700">{item.pzs_totales?.toLocaleString() || '-'}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary" className="text-[9px] font-black uppercase px-2 py-0.5">
                                                    {item.estado_siggo || 'ACTIVO'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className="border-primary/20 text-primary font-black text-[9px] uppercase">{item.bodega || '-'}</Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className="border-slate-200 text-slate-600 font-bold text-[9px] uppercase">{item.bloque || '-'}</Badge>
                                            </TableCell>
                                            <TableCell className="text-center text-[10px] font-black uppercase text-muted-foreground">{item.unidad || 'PZA'}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={20} className="h-64 text-center">
                                            <div className="flex flex-col items-center gap-2 opacity-30">
                                                <Warehouse className="h-12 w-12" />
                                                <p className="font-black uppercase text-xs tracking-widest">No se encontraron productos en inventario</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </div>
                <CardFooter className="bg-slate-50 border-t py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500">
                        <Info className="h-3 w-3" />
                        Mostrando {paginatedInventory.length} de {filteredInventory.length} productos
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase mr-4">Página {invPage} de {totalInvPages || 1}</span>
                        <Button variant="outline" size="sm" className="h-8 text-[9px] font-black" onClick={() => setInvPage(p => Math.max(1, p - 1))} disabled={invPage === 1}>ANTERIOR</Button>
                        <Button variant="outline" size="sm" className="h-8 text-[9px] font-black" onClick={() => setInvPage(p => Math.min(totalInvPages, p + 1))} disabled={invPage >= totalInvPages}>SIGUIENTE</Button>
                    </div>
                </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
