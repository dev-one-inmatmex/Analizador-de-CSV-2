'use client';

import * as React from 'react';
import { 
  BarChart3, DollarSign, ShoppingCart, AlertTriangle, Package, PieChart as PieChartIcon, 
  Layers, FileCode, Tag, ClipboardList, Loader2, Filter, Map as MapIcon, Maximize, Repeat 
} from 'lucide-react';
import { format, isValid, subDays, startOfDay, endOfDay, startOfMonth, subMonths, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ComposedChart 
} from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { Sale, ChartData, EnrichedCategoriaMadre } from './page';
import type { skus_unicos, skuxpublicaciones } from '@/types/database';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type InventoryData = {
    categoriasMadre: EnrichedCategoriaMadre[];
    skusUnicos: skus_unicos[];
    skuPublicaciones: skuxpublicaciones[];
    error: string | null;
}

type ParetoProduct = {
    name: string;
    revenue: number;
    units: number;
    percentageOfTotal: number;
    cumulativePercentage: number;
};

const PAGE_SIZE = 15;
const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function SalesDashboardClient({ 
    initialSales, 
    allCompanies,
    inventoryData,
}: { 
    initialSales: Sale[], 
    allCompanies: string[],
    inventoryData: InventoryData,
}) {
    const [currentPage, setCurrentPage] = React.useState(1);
    const [isClient, setIsClient] = React.useState(false);
    const [company, setCompany] = React.useState('Todos');
    const [date, setDate] = React.useState<DateRange | undefined>({
      from: subDays(new Date(), 365),
      to: new Date(),
    });
    
    const [isParetoModalOpen, setIsParetoModalOpen] = React.useState(false);
    const [paretoPage, setParetoPage] = React.useState(1);

    React.useEffect(() => { setIsClient(true); }, []);

    const { sales, kpis, charts, paretoAnalysisData } = React.useMemo(() => {
        const filteredSales = initialSales.filter(sale => {
            const companyMatch = company === 'Todos' || sale.company === company;
            if (!companyMatch) return false;

            if (date?.from) {
                if (!sale.fecha_venta) return false;
                try {
                    const saleDate = parseISO(sale.fecha_venta);
                    const fromDate = startOfDay(date.from);
                    const toDate = date.to ? endOfDay(date.to) : endOfDay(date.from);
                    if (saleDate < fromDate || saleDate > toDate) return false;
                } catch (e) { return false; }
            }
            return true;
        });

        const totalRevenue = filteredSales.reduce((acc, sale) => acc + (sale.total || 0), 0);
        const totalSalesCount = filteredSales.length;
        const avgSale = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;
        
        const productRevenue: Record<string, number> = {};
        const productUnits: Record<string, number> = {};
        filteredSales.forEach(sale => {
            const key = sale.title || 'Producto Desconocido';
            productRevenue[key] = (productRevenue[key] || 0) + (sale.total || 0);
            productUnits[key] = (productUnits[key] || 0) + (sale.unidades || 0);
        });

        const sortedProducts = Object.entries(productRevenue)
            .map(([name, revenue]) => ({ name, revenue, units: productUnits[name] || 0 }))
            .sort((a, b) => b.revenue - a.revenue);

        const topProduct = sortedProducts[0] || { name: 'N/A', revenue: 0 };

        let cumValue = 0;
        const topProductsChart = sortedProducts.slice(0, 10).map(p => {
            cumValue += p.revenue;
            return { name: p.name, value: p.revenue, cumulative: (cumValue / totalRevenue) * 100 };
        });

        const salesTrend: Record<string, number> = {};
        filteredSales.forEach(s => {
            if (s.fecha_venta) {
                const m = format(parseISO(s.fecha_venta), 'MMM yy', { locale: es });
                salesTrend[m] = (salesTrend[m] || 0) + (s.total || 0);
            }
        });

        const companyMap: Record<string, number> = {};
        filteredSales.forEach(s => {
            const c = s.company || 'Otros';
            companyMap[c] = (companyMap[c] || 0) + (s.total || 0);
        });

        let fullCum = 0;
        const paretoData = sortedProducts.map(p => {
            fullCum += p.revenue;
            return {
                name: p.name, revenue: p.revenue, units: p.units,
                percentageOfTotal: (p.revenue / totalRevenue) * 100,
                cumulativePercentage: (fullCum / totalRevenue) * 100
            };
        });

        return {
            sales: filteredSales,
            kpis: { totalRevenue, totalSales: totalSalesCount, avgSale, topProductName: topProduct.name, topProductRevenue: topProduct.revenue },
            charts: { topProducts: topProductsChart, salesTrend: Object.entries(salesTrend).map(([name, value]) => ({ name, value })), salesByCompany: Object.entries(companyMap).map(([name, value]) => ({ name, value })) },
            paretoAnalysisData: paretoData
        };
    }, [initialSales, company, date]);

    const money = (v?: number | null) => v === null || v === undefined ? 'N/A' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);
    const totalPages = Math.ceil(sales.length / PAGE_SIZE);
    const paginatedSales = sales.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    if (!isClient) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="flex min-h-screen flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6">
                <div className="flex items-center gap-4">
                    <SidebarTrigger />
                    <h1 className="text-xl font-bold">Ventas Consolidadas</h1>
                    <Badge variant="outline">ml_sales Sync</Badge>
                </div>
            </header>

            <main className="p-4 md:p-8 space-y-8">
                <Card>
                    <CardHeader className="flex flex-row items-center gap-4">
                        <Filter className="h-6 w-6 text-muted-foreground" />
                        <div className="flex-1"><CardTitle>Filtros Avanzados</CardTitle></div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Periodo de Análisis</Label><DateRangePicker date={date} onSelect={setDate} /></div>
                        <div className="space-y-2"><Label>Filtrar por Tienda/Empresa</Label>
                            <Select value={company} onValueChange={setCompany}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{allCompanies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{money(kpis.totalRevenue)}</div></CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Ventas Totales</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{kpis.totalSales.toLocaleString()}</div></CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{money(kpis.avgSale)}</div></CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Top Product</CardTitle></CardHeader><CardContent><div className="text-md font-bold truncate">{kpis.topProductName}</div></CardContent></Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader><CardTitle>Pareto (80/20) - Top 10 Productos</CardTitle></CardHeader>
                        <CardContent className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={charts.topProducts} margin={{ bottom: 100 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" fontSize={10} interval={0} height={100} />
                                    <YAxis yAxisId="left" orientation="left" tickFormatter={v => `$${v/1000}k`} />
                                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                                    <Tooltip />
                                    <Bar yAxisId="left" dataKey="value" fill="hsl(var(--primary))" name="Ingresos" />
                                    <Line yAxisId="right" dataKey="cumulative" stroke="hsl(var(--destructive))" name="Acumulado %" />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Distribución por Empresa</CardTitle></CardHeader>
                        <CardContent className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={charts.salesByCompany} dataKey="value" nameKey="name" outerRadius={120} label>
                                        {charts.salesByCompany.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={v => money(v as number)} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div><CardTitle>Historial Detallado (ml_sales Sync)</CardTitle><CardDescription>Mostrando todas las columnas del esquema oficial.</CardDescription></div>
                        <Button variant="outline" size="sm" onClick={() => setIsParetoModalOpen(true)}><Maximize className="mr-2 h-4 w-4" /> Pareto Completo</Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="relative w-full overflow-auto">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="font-bold border-r"># Venta</TableHead>
                                        <TableHead className="font-bold border-r">Fecha</TableHead>
                                        <TableHead className="font-bold border-r">Tienda</TableHead>
                                        <TableHead className="font-bold border-r">SKU</TableHead>
                                        <TableHead className="font-bold border-r text-right">Total Neto</TableHead>
                                        <TableHead className="font-bold border-r">Comprador</TableHead>
                                        <TableHead className="font-bold border-r">Transportista</TableHead>
                                        <TableHead className="font-bold border-r">Seguimiento</TableHead>
                                        <TableHead className="font-bold border-r">Estado</TableHead>
                                        <TableHead className="font-bold border-r">CFDI</TableHead>
                                        <TableHead className="font-bold border-r">Régimen</TableHead>
                                        <TableHead className="font-bold">Dirección</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedSales.map((s) => (
                                        <TableRow key={s.id}>
                                            <TableCell className="font-mono text-xs border-r">{s.numero_venta}</TableCell>
                                            <TableCell className="whitespace-nowrap border-r">{s.fecha_venta ? format(parseISO(s.fecha_venta), 'dd/MM/yy HH:mm') : 'N/A'}</TableCell>
                                            <TableCell className="border-r"><Badge variant="outline">{s.company}</Badge></TableCell>
                                            <TableCell className="font-mono text-xs border-r">{s.sku}</TableCell>
                                            <TableCell className="text-right font-black text-primary border-r">{money(s.total)}</TableCell>
                                            <TableCell className="max-w-[150px] truncate border-r" title={s.comprador || ''}>{s.comprador}</TableCell>
                                            <TableCell className="border-r text-xs">{s.transportista_envio || s.transportista || 'N/A'}</TableCell>
                                            <TableCell className="font-mono text-[10px] border-r">{s.numero_seguimiento_envio || 'N/A'}</TableCell>
                                            <TableCell className="border-r"><Badge variant="secondary" className="text-[10px] uppercase">{s.estado}</Badge></TableCell>
                                            <TableCell className="border-r text-xs">{s.cfdi || 'N/A'}</TableCell>
                                            <TableCell className="border-r text-xs">{s.regimen_fiscal || 'N/A'}</TableCell>
                                            <TableCell className="max-w-[200px] truncate text-xs" title={s.domicilio_entrega || ''}>{s.domicilio_entrega}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t p-4">
                        <div className="text-xs text-muted-foreground">Página {currentPage} de {totalPages}</div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1}>Anterior</Button>
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages}>Siguiente</Button>
                        </div>
                    </CardFooter>
                </Card>
            </main>

            <Dialog open={isParetoModalOpen} onOpenChange={setIsParetoModalOpen}>
                <DialogContent className="max-w-5xl h-[80vh] flex flex-col">
                    <DialogHeader><DialogTitle>Análisis Pareto Detallado</DialogTitle></DialogHeader>
                    <div className="flex-1 overflow-auto">
                        <Table>
                            <TableHeader><TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead className="text-right">Ingresos</TableHead>
                                <TableHead className="text-right">Piezas</TableHead>
                                <TableHead className="text-right">% Acumulado</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                                {paretoAnalysisData.slice((paretoPage-1)*15, paretoPage*15).map((p, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-bold text-sm">{p.name}</TableCell>
                                        <TableCell className="text-right">{money(p.revenue)}</TableCell>
                                        <TableCell className="text-right">{p.units}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={p.cumulativePercentage <= 80 ? 'default' : 'secondary'}>
                                                {p.cumulativePercentage.toFixed(1)}%
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <DialogFooter className="border-t pt-4">
                        <Button variant="outline" onClick={() => setParetoPage(p => Math.max(1, p-1))} disabled={paretoPage === 1}>Anterior</Button>
                        <Button variant="outline" onClick={() => setParetoPage(p => p+1)}>Siguiente</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}