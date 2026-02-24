'use client';

import * as React from 'react';
import { differenceInDays, startOfDay, endOfDay, parseISO, isValid, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Package, Filter, Activity, Warehouse, Search, Info } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import type { Sale } from './page';
import type { inventario_master } from '@/types/database';

export default function ConsumptionClient({ 
    initialSales, 
    allCompanies,
    inventoryMaster
}: { 
    initialSales: Sale[], 
    allCompanies: string[],
    inventoryMaster: inventario_master[]
}) {
    const [company, setCompany] = React.useState('Todos');
    const [date, setDate] = React.useState<DateRange | undefined>({
      from: subDays(new Date(), 30),
      to: new Date(),
    });
    const [isClient, setIsClient] = React.useState(false);
    const [invSearch, setInvSearch] = React.useState('');
    const [invPage, setInvPage] = React.useState(1);
    const PAGE_SIZE = 15;

    React.useEffect(() => {
        setIsClient(true);
    }, []);

    // ==========================================
    // MOTOR DE CÁLCULO DE CONSUMO POR VENTAS
    // ==========================================
    const consumoData = React.useMemo(() => {
        // 1. Calcular días del periodo
        let daysInPeriod = 1;
        if (date?.from && date?.to) {
            daysInPeriod = Math.max(1, differenceInDays(endOfDay(date.to), startOfDay(date.from)) + 1);
        } else if (date?.from) {
            daysInPeriod = Math.max(1, differenceInDays(endOfDay(new Date()), startOfDay(date.from)) + 1);
        }

        // 2. Filtrar ventas por fecha y tienda
        const filteredSales = initialSales.filter(sale => {
            if (company !== 'Todos' && sale.tienda !== company) return false;
            if (date?.from) {
                try {
                    const saleDate = parseISO(sale.fecha_venta || '');
                    const finalSaleDate = isValid(saleDate) ? saleDate : new Date(sale.fecha_venta || '');
                    if (!isValid(finalSaleDate)) return false;
                    
                    const fromTime = startOfDay(date.from).getTime();
                    const toTime = date.to ? endOfDay(date.to).getTime() : endOfDay(date.from).getTime();
                    const saleTime = finalSaleDate.getTime();
                    
                    if (saleTime < fromTime || saleTime > toTime) return false;
                } catch (e) { return false; }
            }
            return true;
        });

        // 3. Agrupar por SKU y Tienda
        const consumptionMap = new Map<string, any>();

        filteredSales.forEach(sale => {
            const key = `${sale.sku || 'SIN-SKU'}-${sale.tienda || 'OTRA'}`;
            
            if (!consumptionMap.has(key)) {
                consumptionMap.set(key, {
                    sku: sale.sku || 'SIN-SKU',
                    titulo: sale.tit_pub || 'Sin título',
                    tienda: sale.tienda || 'OTRA',
                    categoria: sale.categoria || 'Sin categoría',
                    unidadesConsumidas: 0,
                });
            }

            const item = consumptionMap.get(key);
            item.unidadesConsumidas += (sale.unidades || 0);
        });

        // 4. Transformar en Array y calcular el Consumo Diario Promedio
        return Array.from(consumptionMap.values()).map(item => ({
            ...item,
            consumoDiarioPromedio: item.unidadesConsumidas / daysInPeriod,
            diasAnalizados: daysInPeriod
        })).sort((a, b) => b.consumoDiarioPromedio - a.consumoDiarioPromedio);

    }, [initialSales, company, date]);

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

    if (!isClient) return null;

    const totalInvPages = Math.ceil(filteredInventory.length / PAGE_SIZE);
    const paginatedInventory = filteredInventory.slice((invPage - 1) * PAGE_SIZE, invPage * PAGE_SIZE);

    return (
        <div className="flex min-h-screen flex-col bg-muted/40 min-w-0">
            <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6">
                <div className="flex items-center gap-4">
                    <SidebarTrigger />
                    <Activity className="h-6 w-6 text-primary" />
                    <h1 className="text-xl font-bold">Consumo por Ventas (Salidas Reales)</h1>
                </div>
            </header>

            <main className="p-4 md:p-8 space-y-8 min-w-0 max-w-full">
                <Tabs defaultValue="consumption" className="w-full">
                    <TabsList className="bg-muted/40 p-1 mb-8">
                        <TabsTrigger value="consumption" className="text-xs font-bold uppercase">Análisis de Consumo</TabsTrigger>
                        <TabsTrigger value="inventory" className="text-xs font-bold uppercase">Inventario Maestro (Siggo)</TabsTrigger>
                    </TabsList>

                    <TabsContent value="consumption" className="space-y-8 animate-in fade-in duration-500">
                        {/* FILTROS MAESTROS */}
                        <Card className="min-w-0 shadow-sm border-none bg-white/50 backdrop-blur-sm rounded-xl">
                            <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <Filter className="h-6 w-6 text-primary" />
                                    <div>
                                        <h3 className="text-lg font-bold">Filtros de Consumo</h3>
                                        <p className="text-sm text-muted-foreground">Define el periodo para calcular la velocidad de salida.</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Periodo de Análisis</Label>
                                        <DateRangePicker date={date} onSelect={setDate} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Empresa / Tienda</Label>
                                        <Select value={company} onValueChange={setCompany}>
                                            <SelectTrigger className="w-[200px] bg-white border-slate-200"><SelectValue placeholder="Todas" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Todos">Todas las tiendas</SelectItem>
                                                {allCompanies.map(c => (
                                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* TABLA DE CONSUMO */}
                        <Card className="min-w-0 overflow-hidden border-none shadow-sm rounded-xl bg-white">
                            <div className="p-6 bg-muted/5 flex items-center gap-3">
                                <Package className="h-5 w-5 text-primary" />
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight">Velocidad de Salida por Producto</h3>
                                    <p className="text-sm text-muted-foreground">Basado estrictamente en transacciones completadas (ml_sales).</p>
                                </div>
                            </div>
                            <div className="table-responsive border-t">
                                <Table>
                                    <TableHeader className="bg-muted/30">
                                        <TableRow className="text-[11px] uppercase font-bold text-muted-foreground h-12">
                                            <TableHead>Producto / SKU</TableHead>
                                            <TableHead>Categoría</TableHead>
                                            <TableHead className="text-center">Empresa</TableHead>
                                            <TableHead className="text-center">Días Analizados</TableHead>
                                            <TableHead className="text-center">Salidas (Pz)</TableHead>
                                            <TableHead className="text-right text-primary">Consumo Diario</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {consumoData.map((item, idx) => (
                                            <TableRow key={idx} className="hover:bg-muted/10">
                                                <TableCell>
                                                    <div className="font-bold text-slate-900">{item.sku}</div>
                                                    <div className="text-xs text-muted-foreground truncate max-w-[300px]" title={item.titulo}>
                                                        {item.titulo}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-xs text-muted-foreground">{item.categoria}</span>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="outline" className="font-medium bg-slate-50">{item.tienda}</Badge>
                                                </TableCell>
                                                <TableCell className="text-center text-sm font-medium text-slate-600">
                                                    {item.diasAnalizados}
                                                </TableCell>
                                                <TableCell className="text-center font-bold text-slate-800">
                                                    {item.unidadesConsumidas}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="font-black text-primary text-lg">
                                                        {item.consumoDiarioPromedio.toFixed(2)}
                                                    </div>
                                                    <div className="text-[10px] uppercase font-bold text-muted-foreground">
                                                        pz / día
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {consumoData.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                                    No hay datos de consumo para los filtros seleccionados.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>
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
