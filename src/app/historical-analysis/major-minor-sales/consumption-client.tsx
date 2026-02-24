'use client';

import * as React from 'react';
import { differenceInDays, startOfDay, endOfDay, parseISO, isValid, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
    Package, Filter, Activity, TrendingUp, Hash, 
    PieChart as PieIcon, BarChart3, Search, Info, Boxes, Eye, ClipboardList
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, CartesianGrid 
} from 'recharts';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Sale } from './page';

const COLORS = ['#2D5A4C', '#3b82f6', '#f43f5e', '#eab308', '#8b5cf6', '#06b6d4', '#f97316'];
const PAGE_SIZE = 20;

export default function ConsumptionClient({ 
    initialSales, 
    allCompanies
}: { 
    initialSales: Sale[], 
    allCompanies: string[]
}) {
    const [company, setCompany] = React.useState('Todos');
    const [date, setDate] = React.useState<DateRange | undefined>({
      from: subDays(new Date(), 30),
      to: new Date(),
    });
    const [isClient, setIsClient] = React.useState(false);
    const [consPage, setConsPage] = React.useState(1);
    const [isTop10ModalOpen, setIsTop10ModalOpen] = React.useState(false);
    const [isSkuPieModalOpen, setIsSkuPieModalOpen] = React.useState(false);

    React.useEffect(() => {
        setIsClient(true);
    }, []);

    // Reiniciar páginas al cambiar filtros
    React.useEffect(() => {
        setConsPage(1);
    }, [company, date]);

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
        const arrayData = Array.from(consumptionMap.values()).map(item => ({
            ...item,
            consumoDiarioPromedio: item.unidadesConsumidas / daysInPeriod,
            diasAnalizados: daysInPeriod
        })).sort((a, b) => b.consumoDiarioPromedio - a.consumoDiarioPromedio);

        // 5. CÁLCULO PARETO (80/20)
        const totalUnidades = arrayData.reduce((sum, item) => sum + item.unidadesConsumidas, 0);
        const limite80 = totalUnidades * 0.8;
        let sumaAcumulada = 0;

        return arrayData.map(item => {
            sumaAcumulada += item.unidadesConsumidas;
            return {
                ...item,
                isTop8020: sumaAcumulada <= limite80
            };
        });

    }, [initialSales, company, date]);

    // 6. DATOS PARA DASHBOARD
    const kpis = React.useMemo(() => {
        return {
            totalSalidas: consumoData.reduce((sum, item) => sum + item.unidadesConsumidas, 0),
            velocidadGlobal: consumoData.reduce((sum, item) => sum + item.consumoDiarioPromedio, 0),
            skusActivos: consumoData.length
        };
    }, [consumoData]);

    const top10Data = React.useMemo(() => consumoData.slice(0, 10), [consumoData]);

    const categoryData = React.useMemo(() => {
        const catMap = new Map<string, number>();
        consumoData.forEach(item => {
            const current = catMap.get(item.categoria) || 0;
            catMap.set(item.categoria, current + item.unidadesConsumidas);
        });
        return Array.from(catMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 7);
    }, [consumoData]);

    const skuPieData = React.useMemo(() => {
        const skuMap = new Map<string, number>();
        consumoData.forEach(item => {
            const current = skuMap.get(item.sku) || 0;
            skuMap.set(item.sku, current + item.unidadesConsumidas);
        });
        
        const sorted = Array.from(skuMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
            
        const top5 = sorted.slice(0, 5);
        const othersValue = sorted.slice(5).reduce((sum, item) => sum + item.value, 0);
        
        if (othersValue > 0) {
            top5.push({ name: 'OTROS SKUS', value: othersValue });
        }
        
        return top5;
    }, [consumoData]);

    if (!isClient) return null;

    const totalConsPages = Math.ceil(consumoData.length / PAGE_SIZE);
    const paginatedConsumo = consumoData.slice((consPage - 1) * PAGE_SIZE, consPage * PAGE_SIZE);

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

                {/* KPIs DASHBOARD */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="shadow-sm border-none bg-white rounded-xl overflow-hidden">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Package className="h-6 w-6" /></div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total Salidas (Pz)</p>
                                <h3 className="text-3xl font-black text-slate-900">{kpis.totalSalidas.toLocaleString()}</h3>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm border-none bg-white rounded-xl overflow-hidden">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="p-3 bg-green-50 text-green-600 rounded-xl"><TrendingUp className="h-6 w-6" /></div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Velocidad Global</p>
                                <h3 className="text-3xl font-black text-slate-900">{kpis.velocidadGlobal.toFixed(2)} <span className="text-xs font-bold text-muted-foreground uppercase">pz/día</span></h3>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm border-none bg-white rounded-xl overflow-hidden">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Hash className="h-6 w-6" /></div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">SKUs Activos</p>
                                <h3 className="text-3xl font-black text-slate-900">{kpis.skusActivos.toLocaleString()}</h3>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* GRÁFICOS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="shadow-sm border-none bg-white rounded-xl overflow-hidden">
                        <CardHeader className="bg-muted/5 border-b flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-tight">
                                <BarChart3 className="h-4 w-4 text-primary"/> Top 10 Velocidad (Pz/Día)
                            </CardTitle>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 gap-1 font-bold bg-primary/5 border-primary/20 text-[9px] uppercase"
                                onClick={() => setIsTop10ModalOpen(true)}
                            >
                                <Eye className="h-3 w-3" /> Ver Detalle
                            </Button>
                        </CardHeader>
                        <CardContent className="h-[450px] pt-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={top10Data} layout="vertical" margin={{ left: 20, right: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                    <XAxis type="number" fontSize={10} axisLine={false} tickLine={false} />
                                    <YAxis dataKey="sku" type="category" width={100} fontSize={9} fontWeight="black" axisLine={false} tickLine={false} />
                                    <Tooltip 
                                        cursor={{fill: '#f8fafc'}} 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="consumoDiarioPromedio" radius={[0, 4, 4, 0]} barSize={20}>
                                        {top10Data.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-none bg-white rounded-xl overflow-hidden">
                        <CardHeader className="bg-muted/5 border-b">
                            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-tight">
                                <PieIcon className="h-4 w-4 text-primary"/> Salidas por Categoría
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[450px] pt-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={categoryData} 
                                        cx="50%" cy="50%" 
                                        innerRadius={0} outerRadius={100} 
                                        paddingAngle={0} dataKey="value"
                                        stroke="#fff" strokeWidth={2}
                                    >
                                        {categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                    <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', paddingTop: '20px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-none bg-white rounded-xl overflow-hidden">
                        <CardHeader className="bg-muted/5 border-b flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-tight">
                                <Boxes className="h-4 w-4 text-primary"/> Salidas por SKU
                            </CardTitle>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 gap-1 font-bold bg-primary/5 border-primary/20 text-[9px] uppercase"
                                onClick={() => setIsSkuPieModalOpen(true)}
                            >
                                <Eye className="h-3 w-3" /> Ver Detalle
                            </Button>
                        </CardHeader>
                        <CardContent className="h-[450px] pt-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={skuPieData} 
                                        cx="50%" cy="50%" 
                                        innerRadius={0} outerRadius={100} 
                                        paddingAngle={0} dataKey="value"
                                        stroke="#fff" strokeWidth={2}
                                    >
                                        {skuPieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                    <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', paddingTop: '20px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* TABLA DE CONSUMO */}
                <Card className="min-w-0 overflow-hidden border-none shadow-sm rounded-xl bg-white">
                    <div className="p-6 bg-muted/5 flex items-center gap-3">
                        <Package className="h-5 w-5 text-primary" />
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight">Velocidad de Salida por Producto</h3>
                            <p className="text-sm text-muted-foreground">Análisis de rotación real con identificación Pareto 80/20.</p>
                        </div>
                    </div>
                    <div className="table-responsive border-t">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow className="text-[11px] uppercase font-bold text-muted-foreground h-12">
                                    <TableHead>Producto / SKU</TableHead>
                                    <TableHead className="text-center">Empresa</TableHead>
                                    <TableHead className="text-center">Días Analizados</TableHead>
                                    <TableHead className="text-center">Salidas (Pz)</TableHead>
                                    <TableHead className="text-right text-primary">Consumo Diario</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedConsumo.map((item, idx) => (
                                    <TableRow key={idx} className="hover:bg-muted/10 h-20">
                                        <TableCell>
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="font-black text-slate-900 uppercase tracking-tight">{item.sku}</div>
                                                {item.isTop8020 && (
                                                    <Badge className="bg-amber-500 hover:bg-amber-600 text-[9px] px-1.5 py-0 h-4 font-black">TOP 20%</Badge>
                                                )}
                                            </div>
                                            <div className="text-xs text-muted-foreground truncate max-w-[400px]" title={item.titulo}>
                                                {item.titulo}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className="font-bold text-[10px] uppercase bg-slate-50 border-slate-200">{item.tienda}</Badge>
                                        </TableCell>
                                        <TableCell className="text-center text-sm font-medium text-slate-400">
                                            {item.diasAnalizados}
                                        </TableCell>
                                        <TableCell className="text-center font-black text-slate-800">
                                            {item.unidadesConsumidas}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="font-black text-[#2D5A4C] text-xl leading-none">
                                                {item.consumoDiarioPromedio.toFixed(2)}
                                            </div>
                                            <div className="text-[9px] uppercase font-bold text-muted-foreground mt-1">
                                                pz / día
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {paginatedConsumo.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                            No hay datos de consumo para los filtros seleccionados.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <CardFooter className="bg-slate-50 border-t py-4 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500">
                            <Info className="h-3 w-3" />
                            Mostrando {paginatedConsumo.length} de {consumoData.length} productos
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase mr-4">Página {consPage} de {totalConsPages || 1}</span>
                            <Button variant="outline" size="sm" className="h-8 text-[9px] font-black border-slate-200" onClick={() => setConsPage(p => Math.max(1, p - 1))} disabled={consPage === 1}>ANTERIOR</Button>
                            <Button variant="outline" size="sm" className="h-8 text-[9px] font-black border-slate-200" onClick={() => setConsPage(p => Math.min(totalConsPages, p + 1))} disabled={consPage >= totalConsPages}>SIGUIENTE</Button>
                        </div>
                    </CardFooter>
                </Card>
            </main>

            {/* Modal de Top 10 Velocidad */}
            <Dialog open={isTop10ModalOpen} onOpenChange={setIsTop10ModalOpen}>
                <DialogContent className="max-w-4xl h-[80vh] flex flex-col border-none shadow-2xl p-0 overflow-hidden rounded-[32px]">
                    <div className="px-8 py-6 border-b bg-muted/30">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                                <BarChart3 className="h-6 w-6 text-primary" /> Top 10 Productos con Mayor Velocidad
                            </DialogTitle>
                            <DialogDescription>Listado detallado de los productos que rotan más rápido en el almacén.</DialogDescription>
                        </DialogHeader>
                    </div>
                    
                    <div className="flex-1 overflow-auto p-8">
                        <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-white">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="h-14">
                                        <TableHead className="font-bold px-6 text-[10px] uppercase">Producto / SKU</TableHead>
                                        <TableHead className="font-bold px-6 text-[10px] uppercase text-center">Tienda</TableHead>
                                        <TableHead className="text-center font-bold px-6 text-[10px] uppercase">Salidas</TableHead>
                                        <TableHead className="text-right font-bold px-6 text-[10px] uppercase text-primary">Velocidad (Pz/Día)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {top10Data.length > 0 ? (
                                        top10Data.map((item, i) => (
                                            <TableRow key={i} className="h-16 hover:bg-muted/30 transition-colors border-b border-slate-50">
                                                <TableCell className="px-6">
                                                    <div className="font-bold text-xs text-slate-900">{item.sku}</div>
                                                    <div className="text-[10px] text-muted-foreground truncate max-w-[300px]">{item.titulo}</div>
                                                </TableCell>
                                                <TableCell className="px-6 text-center">
                                                    <Badge variant="outline" className="text-[8px] font-black uppercase bg-slate-50">{item.tienda}</Badge>
                                                </TableCell>
                                                <TableCell className="px-6 text-center font-bold text-slate-800">{item.unidadesConsumidas}</TableCell>
                                                <TableCell className="px-6 text-right font-black text-primary text-lg">
                                                    {item.consumoDiarioPromedio.toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-64 text-center">
                                                <div className="flex flex-col items-center gap-3 opacity-30">
                                                    <ClipboardList className="h-12 w-12" />
                                                    <p className="font-black uppercase text-xs tracking-widest text-slate-500">Sin datos registrados</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                    
                    <div className="px-8 py-6 border-t bg-muted/10 flex items-center justify-end">
                        <Button variant="outline" onClick={() => setIsTop10ModalOpen(false)} className="rounded-xl font-bold uppercase text-[10px] px-6 h-10 border-slate-200">Cerrar Visor</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal de Salidas por SKU */}
            <Dialog open={isSkuPieModalOpen} onOpenChange={setIsSkuPieModalOpen}>
                <DialogContent className="max-w-4xl h-[80vh] flex flex-col border-none shadow-2xl p-0 overflow-hidden rounded-[32px]">
                    <div className="px-8 py-6 border-b bg-muted/30">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                                <Boxes className="h-6 w-6 text-primary" /> Detalle de Salidas por SKU
                            </DialogTitle>
                            <DialogDescription>Desglose del volumen de unidades consumidas por cada producto clave.</DialogDescription>
                        </DialogHeader>
                    </div>
                    
                    <div className="flex-1 overflow-auto p-8">
                        <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-white">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="h-14">
                                        <TableHead className="font-bold px-6 text-[10px] uppercase">Producto / SKU</TableHead>
                                        <TableHead className="text-right font-bold px-6 text-[10px] uppercase">Unidades Salientes (Pz)</TableHead>
                                        <TableHead className="text-right font-bold px-6 text-[10px] uppercase">% Participación</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {skuPieData.length > 0 ? (
                                        skuPieData.map((item, i) => {
                                            const total = skuPieData.reduce((sum, s) => sum + s.value, 0);
                                            const percent = (item.value / (total || 1)) * 100;
                                            return (
                                                <TableRow key={i} className="h-16 hover:bg-muted/30 transition-colors border-b border-slate-50">
                                                    <TableCell className="px-6">
                                                        <div className="font-bold text-xs text-slate-900 uppercase">{item.name}</div>
                                                    </TableCell>
                                                    <TableCell className="px-6 text-right font-black text-slate-800">
                                                        {item.value.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="px-6 text-right font-bold text-primary">
                                                        {percent.toFixed(1)}%
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-64 text-center">
                                                <div className="flex flex-col items-center gap-3 opacity-30">
                                                    <ClipboardList className="h-12 w-12" />
                                                    <p className="font-black uppercase text-xs tracking-widest text-slate-500">Sin datos registrados</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                    
                    <div className="px-8 py-6 border-t bg-muted/10 flex items-center justify-end">
                        <Button variant="outline" onClick={() => setIsSkuPieModalOpen(false)} className="rounded-xl font-bold uppercase text-[10px] px-6 h-10 border-slate-200">Cerrar Visor</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
