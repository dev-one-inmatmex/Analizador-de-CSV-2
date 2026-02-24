
'use client';

import * as React from 'react';
import { 
  BarChart3, Filter, Loader2, RefreshCcw, PieChart as PieIcon, ShoppingCart
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, isValid, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, 
  PieChart, Pie, Cell, Line, ComposedChart 
} from 'recharts';
import { DateRange } from 'react-day-picker';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { Sale } from './page';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';

const PAGE_SIZE = 15;
const PARETO_PAGE_SIZE = 15;
// Colores basados en la imagen proporcionada: Cian, Azul, Gris, Naranja, Lima
const PIE_COLORS = ["#00aeef", "#3b82f6", "#6b7280", "#ffa500", "#84cc16"];

export default function SalesDashboardClient({ 
    initialSales, 
    allCompanies,
}: { 
    initialSales: Sale[], 
    allCompanies: string[],
}) {
    const router = useRouter();
    const [currentPage, setCurrentPage] = React.useState(1);
    const [isClient, setIsClient] = React.useState(false);
    const [company, setCompany] = React.useState('Todos');
    const [date, setDate] = React.useState<DateRange | undefined>({
      from: subDays(new Date(), 365),
      to: new Date(),
    });
    
    const [isParetoModalOpen, setIsParetoModalOpen] = React.useState(false);
    const [paretoPage, setParetoPage] = React.useState(1);
    const [isRefreshing, setIsRefreshing] = React.useState(false);

    React.useEffect(() => { 
        setIsClient(true); 
    }, []);

    // Suscripción Realtime para actualizaciones automáticas instantáneas
    React.useEffect(() => {
        const supabaseClient = supabase;
        if (!supabaseClient) return;

        const channel = supabaseClient
            .channel('ml_sales_realtime_kpis')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'ml_sales'
                },
                () => {
                    // Refresh server data
                    router.refresh();
                }
            )
            .subscribe();

        return () => {
            supabaseClient.removeChannel(channel);
        };
    }, [router]);

    const safeFormat = (dateStr: string | null | undefined, formatStr: string = 'dd/MM/yy') => {
        if (!dateStr) return '-';
        try {
            const parsed = new Date(dateStr);
            if (isValid(parsed)) return format(parsed, formatStr, { locale: es });
            return dateStr;
        } catch (e) {
            return dateStr;
        }
    };

    const money = (v?: number | null) => v === null || v === undefined ? '$0.00' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);

    const handleResetFilters = () => {
        setCompany('Todos');
        setDate({
            from: subDays(new Date(), 365),
            to: new Date(),
        });
        setCurrentPage(1);
    };

    const handleManualRefresh = () => {
        setIsRefreshing(true);
        router.refresh();
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    const { sales, kpis, charts, paretoAnalysisData, dynamicCompanies } = React.useMemo(() => {
        const today = new Date();
        
        const filteredSales = initialSales.filter(sale => {
            const companyMatch = company === 'Todos' || sale.tienda === company;
            if (!companyMatch) return false;

            if (date?.from) {
                if (!sale.fecha_venta) return false;
                try {
                    const saleDate = new Date(sale.fecha_venta);
                    if (!isValid(saleDate)) return false;
                    
                    const fromDate = startOfDay(date.from);
                    const toDate = date.to ? endOfDay(date.to) : endOfDay(date.from);
                    
                    if (saleDate < fromDate || saleDate > toDate) return false;
                } catch (e) { return false; }
            }
            return true;
        });

        const sortedSales = [...filteredSales].sort((a, b) => {
            const dateA = a.fecha_venta ? new Date(a.fecha_venta).getTime() : 0;
            const dateB = b.fecha_venta ? new Date(b.fecha_venta).getTime() : 0;
            return dateB - dateA;
        });

        const totalRevenue = sortedSales.reduce((acc, sale) => acc + (sale.total || 0), 0);
        const totalSalesCount = sortedSales.length;
        const avgSale = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;
        
        const productStats: Record<string, { revenue: number, units: number, sku: string }> = {};
        const companyMap: Record<string, number> = {};
        const categoryMap: Record<string, number> = {};
        const statusMap: Record<string, number> = {};
        
        // Mapa para pedidos de hoy por empresa
        const todayCompanyMap: Record<string, number> = {};

        initialSales.forEach(sale => {
            if (sale.fecha_venta) {
                const saleDate = new Date(sale.fecha_venta);
                if (isSameDay(saleDate, today)) {
                    const c = sale.tienda || 'Otros';
                    todayCompanyMap[c] = (todayCompanyMap[c] || 0) + 1;
                }
            }
        });

        sortedSales.forEach(sale => {
            // Stats por producto
            const key = sale.tit_pub || sale.sku || 'N/A';
            if (key !== 'N/A') {
                if (!productStats[key]) {
                    productStats[key] = { revenue: 0, units: 0, sku: sale.sku || 'N/A' };
                }
                productStats[key].revenue += (sale.total || 0);
                productStats[key].units += (sale.unidades || 0);
            }

            // Participación por Canal (Empresa)
            const c = sale.tienda || 'Otros';
            companyMap[c] = (companyMap[c] || 0) + (sale.total || 0);

            // Distribución por Categoría
            const cat = sale.categoria || 'Sin Categoría';
            categoryMap[cat] = (categoryMap[cat] || 0) + (sale.total || 0);

            // Estado de la Venta
            const st = sale.status || 'Desconocido';
            statusMap[st] = (statusMap[st] || 0) + 1;
        });

        const sortedProducts = Object.entries(productStats)
            .map(([name, stats]) => ({ name, revenue: stats.revenue, units: stats.units, sku: stats.sku }))
            .sort((a, b) => b.revenue - a.revenue);

        let cumValue = 0;
        const paretoData = sortedProducts.map(p => {
            cumValue += p.revenue;
            const cumPercent = (cumValue / (totalRevenue || 1)) * 100;
            
            let zona = 'Impacto C';
            if (cumPercent <= 80.1) zona = 'Impacto A';
            else if (cumPercent <= 95.1) zona = 'Impacto B';

            return {
                name: p.name, 
                sku: p.sku,
                revenue: p.revenue, 
                units: p.units,
                percentageOfTotal: (p.revenue / (totalRevenue || 1)) * 100,
                cumulativePercentage: cumPercent,
                zona
            };
        });

        const topProductsChart = paretoData.slice(0, 10).map(p => ({
            name: p.name,
            value: p.revenue,
            cumulative: p.cumulativePercentage
        }));

        const detectedCompanies = Array.from(new Set(initialSales.map(s => s.tienda).filter(Boolean) as string[])).sort();

        return {
            sales: sortedSales,
            kpis: { totalRevenue, totalSales: totalSalesCount, avgSale, topProductName: sortedProducts[0]?.name || 'N/A' },
            charts: { 
                topProducts: topProductsChart, 
                salesByCompany: Object.entries(companyMap).map(([name, value]) => ({ name, value })),
                salesByCategory: Object.entries(categoryMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
                salesByStatus: Object.entries(statusMap).map(([name, value]) => ({ name, value })),
                todaySalesByCompany: Object.entries(todayCompanyMap).map(([name, value]) => ({ name, value }))
            },
            paretoAnalysisData: paretoData,
            dynamicCompanies: detectedCompanies
        };
    }, [initialSales, company, date]);

    const totalPages = Math.ceil(sales.length / PAGE_SIZE);
    const paginatedSales = sales.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    // Custom label for Pie Charts to show percentage
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
        const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

        if (percent < 0.05) return null; // No mostrar etiquetas muy pequeñas

        return (
            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-[10px] font-black">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    if (!isClient) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="flex min-h-screen flex-col bg-muted/40 min-w-0">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6">
                <div className="flex items-center gap-4">
                    <SidebarTrigger />
                    <h1 className="text-xl font-bold">Ventas</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={handleManualRefresh} disabled={isRefreshing} className="h-9 px-3 gap-2 font-bold text-muted-foreground">
                        <RefreshCcw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                        <span className="hidden sm:inline">Actualizar</span>
                    </Button>
                </div>
            </header>

            <main className="p-4 md:p-8 space-y-8 min-w-0 max-w-full">
                <Card className="min-w-0 shadow-sm border-none bg-white/50 backdrop-blur-sm rounded-xl">
                    <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <Filter className="h-6 w-6 text-primary" />
                            <div>
                                <h3 className="text-lg font-bold">Filtros Maestros</h3>
                                <p className="text-sm text-muted-foreground">Segmenta ingresos y registros por periodo y tienda.</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rango de Fecha</Label>
                                <DateRangePicker date={date} onSelect={setDate} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tienda / Empresa</Label>
                                <Select value={company} onValueChange={setCompany}>
                                    <SelectTrigger className="w-[200px] bg-white border-slate-200"><SelectValue placeholder="Todas las tiendas" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Todos">Todas las tiendas</SelectItem>
                                        {dynamicCompanies.map(c => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-5 text-xs font-bold gap-2 border-slate-200">
                                <RefreshCcw className="h-3.5 w-3.5" /> Limpiar
                            </Button>
                        </div>
                    </div>
                </Card>

                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-none shadow-sm bg-white overflow-hidden rounded-xl">
                        <div className="p-6">
                            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-2">Ingresos Netos</p>
                            <div className="text-4xl font-black text-[#2D5A4C] tabular-nums">{money(kpis.totalRevenue)}</div>
                        </div>
                    </Card>
                    <Card className="border-none shadow-sm bg-white overflow-hidden rounded-xl">
                        <div className="p-6">
                            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-2">Ventas Realizadas</p>
                            <div className="text-4xl font-black text-slate-900 tabular-nums">{kpis.totalSales.toLocaleString()}</div>
                        </div>
                    </Card>
                    <Card className="border-none shadow-sm bg-white overflow-hidden rounded-xl">
                        <div className="p-6">
                            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-2">Ticket Promedio</p>
                            <div className="text-4xl font-black text-slate-900 tabular-nums">{money(kpis.avgSale)}</div>
                        </div>
                    </Card>
                    <Card className="border-none shadow-sm bg-white overflow-hidden rounded-xl">
                        <div className="p-6">
                            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-2">Top Producto</p>
                            <div className="text-lg font-bold truncate leading-tight text-slate-900 mt-2" title={kpis.topProductName}>
                                {kpis.topProductName}
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <Card className="min-w-0 overflow-hidden border-none shadow-sm bg-white rounded-xl">
                        <div className="flex items-center justify-between p-6 border-b bg-muted/5">
                            <h3 className="text-lg font-bold">Curva Pareto (80/20)</h3>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setIsParetoModalOpen(true)} 
                              className="gap-2 font-bold bg-primary/5 border-primary/20"
                            >
                                <BarChart3 className="h-4 w-4" /> Análisis Pareto
                            </Button>
                        </div>
                        <div className="h-[400px] p-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={charts.topProducts} margin={{ bottom: 100, left: 20, right: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis 
                                        dataKey="name" 
                                        angle={-45} 
                                        textAnchor="end" 
                                        fontSize={9} 
                                        interval={0} 
                                        height={100} 
                                        tick={{fill: '#666', fontWeight: 500}} 
                                    />
                                    <YAxis 
                                        yAxisId="left" 
                                        orientation="left" 
                                        tickFormatter={v => `$${v/1000}k`} 
                                        tick={{fill: '#666'}} 
                                        axisLine={false} 
                                        tickLine={false} 
                                    />
                                    <YAxis 
                                        yAxisId="right" 
                                        orientation="right" 
                                        domain={[0, 100]} 
                                        tick={{fill: '#666'}} 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tickFormatter={v => `${v}%`}
                                    />
                                    <Tooltip 
                                        formatter={(v, name) => [
                                            name === 'Ingresos' ? money(Number(v)) : `${Number(v).toFixed(1)}%`, 
                                            name
                                        ]} 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar yAxisId="left" dataKey="value" fill="#2D5A4C" name="Ingresos" radius={[4, 4, 0, 0]} barSize={40} />
                                    <Line 
                                        yAxisId="right" 
                                        dataKey="cumulative" 
                                        stroke="#f43f5e" 
                                        name="Acumulado %" 
                                        strokeWidth={3} 
                                        dot={{ r: 4, fill: '#f43f5e', strokeWidth: 2 }} 
                                        activeDot={{ r: 6 }} 
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                    <Card className="min-w-0 overflow-hidden border-none shadow-sm bg-white rounded-xl">
                        <div className="p-6 border-b bg-muted/5 flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4 text-primary" />
                            <h3 className="text-[10px] font-bold uppercase tracking-widest">Pedidos de Hoy por Empresa</h3>
                        </div>
                        <div className="h-[350px] p-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={charts.todaySalesByCompany} 
                                        dataKey="value" 
                                        nameKey="name" 
                                        innerRadius={0} 
                                        outerRadius={100} 
                                        stroke="#fff"
                                        strokeWidth={2}
                                        labelLine={false}
                                        label={renderCustomizedLabel}
                                    >
                                        {charts.todaySalesByCompany.map((_, i) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        formatter={v => `${v} pedidos`} 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card className="min-w-0 overflow-hidden border-none shadow-sm bg-white rounded-xl">
                        <div className="p-6 border-b bg-muted/5 flex items-center gap-2">
                            <PieIcon className="h-4 w-4 text-primary" />
                            <h3 className="text-[10px] font-bold uppercase tracking-widest">Participación por Canal (Filtro)</h3>
                        </div>
                        <div className="h-[350px] p-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={charts.salesByCompany} 
                                        dataKey="value" 
                                        nameKey="name" 
                                        innerRadius={0} 
                                        outerRadius={100} 
                                        stroke="#fff"
                                        strokeWidth={2}
                                        labelLine={false}
                                        label={renderCustomizedLabel}
                                    >
                                        {charts.salesByCompany.map((_, i) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        formatter={v => money(v as number)} 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>

                <Card className="min-w-0 overflow-hidden border-none shadow-sm rounded-xl bg-white">
                    <div className="p-6 bg-muted/5">
                        <h3 className="text-xl font-black uppercase tracking-tight">Registro Maestro de Ventas</h3>
                        <p className="text-sm text-muted-foreground mt-1">Detalle original de las {sales.length.toLocaleString()} transacciones registradas.</p>
                    </div>
                    <div className="table-responsive border-t">
                        <Table className="min-w-[5000px]">
                            <TableHeader className="bg-muted/30">
                                <TableRow className="text-[10px] uppercase font-bold text-muted-foreground h-12">
                                    <TableHead className="border-r border-muted text-center bg-muted/10" colSpan={2}>Identificación</TableHead>
                                    <TableHead className="border-r border-muted text-center bg-blue-50/20" colSpan={3}>Estado Venta</TableHead>
                                    <TableHead className="border-r border-muted text-center bg-green-50/20" colSpan={9}>Finanzas ($)</TableHead>
                                    <TableHead className="border-r border-muted text-center bg-orange-50/20" colSpan={8}>Producto / Publicación</TableHead>
                                    <TableHead className="border-r border-muted text-center bg-purple-50/20" colSpan={8}>Facturación y CFDI</TableHead>
                                    <TableHead className="border-r border-muted text-center bg-yellow-50/20" colSpan={8}>Comprador</TableHead>
                                    <TableHead className="border-r border-muted text-center bg-indigo-50/20" colSpan={6}>Logística S1</TableHead>
                                    <TableHead className="border-r border-muted text-center bg-cyan-50/20" colSpan={7}>Logística S2</TableHead>
                                    <TableHead className="bg-red-50/20 text-center" colSpan={10}>Resultados Finales</TableHead>
                                </TableRow>
                                <TableRow className="text-[9px] uppercase font-medium bg-muted/10 h-10">
                                    <TableHead className="border-r"># Venta</TableHead>
                                    <TableHead className="border-r">Fecha</TableHead>
                                    <TableHead className="border-r">Status</TableHead>
                                    <TableHead className="border-r">Descripción</TableHead>
                                    <TableHead className="border-r text-center">Pq. Varios</TableHead>
                                    <TableHead className="border-r text-center">Kit</TableHead>
                                    <TableHead className="border-r text-center">Unid.</TableHead>
                                    <TableHead className="border-r text-right">Ing x Unid</TableHead>
                                    <TableHead className="border-r text-right">Cargo Venta</TableHead>
                                    <TableHead className="border-r text-right">Ing x Envío</TableHead>
                                    <TableHead className="border-r text-right">Costos Envío</TableHead>
                                    <TableHead className="border-r text-right">Envío MP</TableHead>
                                    <TableHead className="border-r text-right">Dif Peso</TableHead>
                                    <TableHead className="border-r text-right">Reembolsos</TableHead>
                                    <TableHead className="border-r text-right font-bold text-primary">Total Neto</TableHead>
                                    <TableHead className="border-r text-center">Publicidad</TableHead>
                                    <TableHead className="border-r">SKU</TableHead>
                                    <TableHead className="border-r"># Publi</TableHead>
                                    <TableHead className="border-r">Tienda</TableHead>
                                    <TableHead className="border-r">Título Publicación</TableHead>
                                    <TableHead className="border-r">Variante</TableHead>
                                    <TableHead className="border-r text-right">Precio Unit.</TableHead>
                                    <TableHead className="border-r">Tipo Pub</TableHead>
                                    <TableHead className="border-r">Factura A</TableHead>
                                    <TableHead className="border-r">POE</TableHead>
                                    <TableHead className="border-r">Tipo Doc</TableHead>
                                    <TableHead className="border-r">Dirección Fiscal</TableHead>
                                    <TableHead className="border-r">RFC/Contrib.</TableHead>
                                    <TableHead className="border-r">CFDI</TableHead>
                                    <TableHead className="border-r">Tipo Usuario</TableHead>
                                    <TableHead className="border-r">R. Fiscal</TableHead>
                                    <TableHead className="border-r">Comprador</TableHead>
                                    <TableHead className="border-r text-center">Negocio</TableHead>
                                    <TableHead className="border-r">IFE</TableHead>
                                    <TableHead className="border-r">Domicilio</TableHead>
                                    <TableHead className="border-r">Municipio/Alcaldía</TableHead>
                                    <TableHead className="border-r">Estado</TableHead>
                                    <TableHead className="border-r">Código postal</TableHead>
                                    <TableHead className="border-r">País</TableHead>
                                    <TableHead className="border-r">F. Entrega</TableHead>
                                    <TableHead className="border-r">F. Camino</TableHead>
                                    <TableHead className="border-r">F. Entregado</TableHead>
                                    <TableHead className="border-r">Transportista</TableHead>
                                    <TableHead className="border-r">Número de seguimiento</TableHead>
                                    <TableHead className="border-r">URL de seguimiento</TableHead>
                                    <TableHead className="border-r text-center">Unid 2</TableHead>
                                    <TableHead className="border-r">{safeFormat('F. Entrega 2')}</TableHead>
                                    <TableHead className="border-r">{safeFormat('F. Camino 2')}</TableHead>
                                    <TableHead className="border-r">{safeFormat('F. Entregado 2')}</TableHead>
                                    <TableHead className="border-r">Transp. 2</TableHead>
                                    <TableHead className="border-r">Seg. 2</TableHead>
                                    <TableHead className="border-r">URL Seg 2</TableHead>
                                    <TableHead className="border-r text-center">XML Rev.</TableHead>
                                    <TableHead className="border-r">F. Rev 3</TableHead>
                                    <TableHead className="border-r text-right">Favor</TableHead>
                                    <TableHead className="border-r">Resultado</TableHead>
                                    <TableHead className="border-r">Destino</TableHead>
                                    <TableHead className="border-r">Motivo</TableHead>
                                    <TableHead className="border-r text-center">Unid 3</TableHead>
                                    <TableHead className="border-r text-center">Reclamo Ab.</TableHead>
                                    <TableHead className="border-r text-center">Reclamo Cerr.</TableHead>
                                    <TableHead className="text-center">Mediación</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedSales.map((s, idx) => (
                                    <TableRow key={s.num_venta || idx} className="text-[10px] h-11 hover:bg-primary/5 transition-colors">
                                        <TableCell className="border-r font-bold text-primary">#{s.num_venta}</TableCell>
                                        <TableCell className="border-r whitespace-nowrap">{safeFormat(s.fecha_venta, 'dd/MM/yy HH:mm')}</TableCell>
                                        <TableCell className="border-r"><Badge variant="outline" className="text-[8px] uppercase font-black">{s.status}</Badge></TableCell>
                                        <TableCell className="border-r italic text-muted-foreground truncate max-w-[150px]">{s.desc_status || '-'}</TableCell>
                                        <TableCell className="border-r text-center font-bold">{s.paquete_varios ? 'SÍ' : 'NO'}</TableCell>
                                        <TableCell className="border-r text-center font-bold">{s.pertenece_kit ? 'SÍ' : 'NO'}</TableCell>
                                        <TableCell className="border-r text-center font-black bg-muted/5">{s.unidades}</TableCell>
                                        <TableCell className="border-r text-right">{money(s.ing_xunidad)}</TableCell>
                                        <TableCell className="border-r text-right text-destructive font-medium">{money(s.cargo_venta)}</TableCell>
                                        <TableCell className="border-r text-right text-blue-600 font-medium">{money(s.ing_xenvio)}</TableCell>
                                        <TableCell className="border-r text-right text-destructive">{money(s.costo_envio)}</TableCell>
                                        <TableCell className="border-r text-right">{money(s.costo_enviomp)}</TableCell>
                                        <TableCell className="border-r text-right text-amber-600">{money(s.cargo_difpeso)}</TableCell>
                                        <TableCell className="border-r text-right text-orange-600">{money(s.anu_reembolsos)}</TableCell>
                                        <TableCell className="border-r text-right font-black bg-primary/5 text-primary">{money(s.total)}</TableCell>
                                        <TableCell className="border-r text-center font-bold">{s.venta_xpublicidad ? 'SÍ' : 'NO'}</TableCell>
                                        <TableCell className="border-r font-mono font-bold text-blue-700">{s.sku || '-'}</TableCell>
                                        <TableCell className="border-r font-mono">{s.num_publi || '-'}</TableCell>
                                        <TableCell className="border-r"><Badge variant="secondary" className="text-[8px] font-bold">{s.tienda}</Badge></TableCell>
                                        <TableCell className="border-r truncate max-w-[250px] font-medium" title={s.tit_pub || ''}>{s.tit_pub || '-'}</TableCell>
                                        <TableCell className="border-r">{s.variante || '-'}</TableCell>
                                        <TableCell className="border-r text-right font-bold">{money(s.price)}</TableCell>
                                        <TableCell className="border-r">{s.tip_publi || '-'}</TableCell>
                                        <TableCell className="border-r font-bold">{s.factura_a || '-'}</TableCell>
                                        <TableCell className="border-r">{s.datos_poe || '-'}</TableCell>
                                        <TableCell className="border-r">{s.tipo_ndoc || '-'}</TableCell>
                                        <TableCell className="border-r italic truncate max-w-[150px]">{s.direccion || '-'}</TableCell>
                                        <TableCell className="border-r font-medium">{s.t_contribuyente || '-'}</TableCell>
                                        <TableCell className="border-r font-mono text-muted-foreground">{s.cfdi || '-'}</TableCell>
                                        <TableCell className="border-r text-[9px]">{s.t_usuario || '-'}</TableCell>
                                        <TableCell className="border-r text-[9px]">{s.r_fiscal || '-'}</TableCell>
                                        <TableCell className="border-r font-black text-slate-700">{s.comprador || '-'}</TableCell>
                                        <TableCell className="border-r text-center font-bold">{s.negocio ? 'SÍ' : 'NO'}</TableCell>
                                        <TableCell className="border-r font-mono text-[9px]">{s.ife || '-'}</TableCell>
                                        <TableCell className="border-r truncate max-w-[150px]">{s.domicilio || '-'}</TableCell>
                                        <TableCell className="border-r">{s.mun_alcaldia || '-'}</TableCell>
                                        <TableCell className="border-r font-bold">{s.estado || '-'}</TableCell>
                                        <TableCell className="border-r font-mono">{s.c_postal || '-'}</TableCell>
                                        <TableCell className="border-r text-center font-bold text-[9px]">{s.pais || '-'}</TableCell>
                                        <TableCell className="border-r">{safeFormat(s.f_entrega)}</TableCell>
                                        <TableCell className="border-r">{safeFormat(s.f_camino)}</TableCell>
                                        <TableCell className="border-r font-black text-green-600">{safeFormat(s.f_entregado)}</TableCell>
                                        <TableCell className="border-r font-bold">{s.transportista || '-'}</TableCell>
                                        <TableCell className="border-r font-mono text-blue-600 font-bold">{s.num_seguimiento || '-'}</TableCell>
                                        <TableCell className="border-r truncate max-w-[100px] text-[8px] text-blue-500 underline">{s.url_seguimiento || '-'}</TableCell>
                                        <TableCell className="border-r text-center font-black bg-muted/5">{s.unidades_2 || '-'}</TableCell>
                                        <TableCell className="border-r">{safeFormat(s.f_entrega2)}</TableCell>
                                        <TableCell className="border-r">{safeFormat(s.f_camino2)}</TableCell>
                                        <TableCell className="border-r font-black text-green-600">{safeFormat(s.f_entregado2)}</TableCell>
                                        <TableCell className="border-r font-bold">{s.transportista2 || '-'}</TableCell>
                                        <TableCell className="border-r font-mono text-green-600 font-bold">{s.num_seguimiento2 || '-'}</TableCell>
                                        <TableCell className="border-r truncate max-w-[100px] text-[8px] text-blue-500 underline">{s.url_seguimiento2 || '-'}</TableCell>
                                        <TableCell className="border-r text-center font-bold">{s.revisado_xml || 'NO'}</TableCell>
                                        <TableCell className="border-r">{safeFormat(s.f_revision3)}</TableCell>
                                        <TableCell className="border-r text-right font-medium">{s.d_afavor || '-'}</TableCell>
                                        <TableCell className="border-r font-black uppercase text-center">{s.resultado || '-'}</TableCell>
                                        <TableCell className="border-r">{s.destino || '-'}</TableCell>
                                        <TableCell className="border-r italic text-muted-foreground truncate max-w-[150px]">{s.motivo_resul || '-'}</TableCell>
                                        <TableCell className="border-r text-center font-black">{s.unidades_3 || '-'}</TableCell>
                                        <TableCell className="border-r text-center font-bold">{s.r_abierto ? 'SÍ' : 'NO'}</TableCell>
                                        <TableCell className="border-r text-center font-bold">{s.r_cerrado ? 'SÍ' : 'NO'}</TableCell>
                                        <TableCell className="text-center font-bold">{s.c_mediacion ? 'SÍ' : 'NO'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <CardFooter className="flex justify-between border-t p-4 bg-muted/5">
                        <div className="text-xs text-muted-foreground font-medium">Página {currentPage} de {totalPages} • <span className="text-primary font-black">{sales.length.toLocaleString()}</span> registros procesados</div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="border-slate-200">Anterior</Button>
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="border-slate-200">Siguiente</Button>
                        </div>
                    </CardFooter>
                </Card>
            </main>

            <Dialog open={isParetoModalOpen} onOpenChange={setIsParetoModalOpen}>
                <DialogContent className="max-w-5xl h-[85vh] flex flex-col border-none shadow-2xl p-0 overflow-hidden rounded-[32px]">
                    <div className="px-8 py-6 border-b bg-muted/30">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                                <BarChart3 className="h-6 w-6 text-primary" /> Análisis Pareto (Impacto 80/20)
                            </DialogTitle>
                            <DialogDescription>Listado exhaustivo de productos ordenados por impacto financiero.</DialogDescription>
                        </DialogHeader>
                    </div>
                    
                    <div className="flex-1 overflow-auto p-8">
                        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
                                <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-1">Ingreso Total Filtrado</div>
                                <div className="text-2xl font-black text-primary">{money(kpis.totalRevenue)}</div>
                            </div>
                            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                                <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-1">Productos Analizados</div>
                                <div className="text-2xl font-black">{paretoAnalysisData.length.toLocaleString()} SKU</div>
                            </div>
                            <div className="p-6 rounded-2xl bg-[#2D5A4C]/10 border border-[#2D5A4C]/20">
                                <div className="text-[10px] font-bold uppercase text-[#2D5A4C] tracking-widest mb-1">Clase A (80% Ingresos)</div>
                                <div className="text-2xl font-black text-[#2D5A4C]">{paretoAnalysisData.filter(p => p.zona === 'Impacto A').length} SKU</div>
                            </div>
                        </div>

                        <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="h-14">
                                        <TableHead className="font-bold px-6">Producto / Publicación</TableHead>
                                        <TableHead className="text-right font-bold px-6">Ingresos ($)</TableHead>
                                        <TableHead className="text-right font-bold px-6">Piezas (unid)</TableHead>
                                        <TableHead className="text-right font-bold px-6">% Acumulado</TableHead>
                                        <TableHead className="text-center font-bold px-6">Zona</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paretoAnalysisData.slice((paretoPage-1)*PARETO_PAGE_SIZE, paretoPage*PARETO_PAGE_SIZE).map((p, i) => (
                                        <TableRow key={i} className={cn("h-16 hover:bg-muted/30 transition-colors border-b border-slate-50", p.zona === 'Impacto A' ? "bg-[#2D5A4C]/5" : "")}>
                                            <TableCell className="max-w-md px-6">
                                                <div className="font-bold text-xs truncate" title={p.name}>{p.name}</div>
                                                <div className="text-[10px] text-muted-foreground font-mono mt-1">{p.sku}</div>
                                            </TableCell>
                                            <TableCell className="text-right font-black text-[#2D5A4C] px-6">{money(p.revenue)}</TableCell>
                                            <TableCell className="text-right font-medium px-6">{p.units.toLocaleString()}</TableCell>
                                            <TableCell className="text-right font-bold px-6">{p.cumulativePercentage.toFixed(1)}%</TableCell>
                                            <TableCell className="text-center px-6">
                                                <Badge 
                                                  variant={p.zona === 'Impacto A' ? 'default' : 'outline'} 
                                                  className={cn(
                                                    "px-3 py-1 rounded-full text-[9px] font-black",
                                                    p.zona === 'Impacto A' ? "bg-[#2D5A4C] hover:bg-[#24483D]" : 
                                                    p.zona === 'Impacto B' ? "border-amber-500 text-amber-600" : ""
                                                  )}
                                                >
                                                    {p.zona}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                    
                    <div className="px-8 py-6 border-t bg-muted/10 flex items-center justify-between">
                        <div className="text-xs text-muted-foreground font-medium">Página {paretoPage} de {Math.ceil(paretoAnalysisData.length / PARETO_PAGE_SIZE)}</div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setParetoPage(p => Math.max(1, p - 1))} disabled={paretoPage === 1} className="border-slate-200">Anterior</Button>
                            <Button variant="outline" size="sm" onClick={() => setParetoPage(p => p+1)} disabled={paretoPage * PARETO_PAGE_SIZE >= paretoAnalysisData.length} className="border-slate-200">Siguiente</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
