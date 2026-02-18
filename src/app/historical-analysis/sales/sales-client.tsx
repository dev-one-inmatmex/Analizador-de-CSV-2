'use client';

import * as React from 'react';
import { 
  BarChart3, DollarSign, ShoppingCart, AlertTriangle, Package, PieChart as PieChartIcon, 
  Layers, Filter, Maximize, Loader2 
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, 
  PieChart, Pie, Cell, Line, ComposedChart 
} from 'recharts';
import { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { Sale } from './page';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const PAGE_SIZE = 15;
const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function SalesDashboardClient({ 
    initialSales, 
    allCompanies,
}: { 
    initialSales: Sale[], 
    allCompanies: string[],
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
            const companyMatch = company === 'Todos' || sale.tienda === company;
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
            const key = sale.tit_pub || 'Producto Desconocido';
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
            return { name: p.name, value: p.revenue, cumulative: (cumValue / (totalRevenue || 1)) * 100 };
        });

        const companyMap: Record<string, number> = {};
        filteredSales.forEach(s => {
            const c = s.tienda || 'Otros';
            companyMap[c] = (companyMap[c] || 0) + (s.total || 0);
        });

        let fullCum = 0;
        const paretoData = sortedProducts.map(p => {
            fullCum += p.revenue;
            return {
                name: p.name, revenue: p.revenue, units: p.units,
                percentageOfTotal: (p.revenue / (totalRevenue || 1)) * 100,
                cumulativePercentage: (fullCum / (totalRevenue || 1)) * 100
            };
        });

        return {
            sales: filteredSales,
            kpis: { totalRevenue, totalSales: totalSalesCount, avgSale, topProductName: topProduct.name, topProductRevenue: topProduct.revenue },
            charts: { topProducts: topProductsChart, salesByCompany: Object.entries(companyMap).map(([name, value]) => ({ name, value })) },
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
                    <h1 className="text-xl font-bold">Ventas Consolidadas (ml_sales)</h1>
                    <Badge variant="outline" className="hidden sm:flex">Esquema Extendido</Badge>
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
                        <div className="space-y-2"><Label>Filtrar por Tienda</Label>
                            <Select value={company} onValueChange={setCompany}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{allCompanies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card><CardHeader className="pb-2 text-xs font-bold uppercase text-muted-foreground">Ingresos Netos</CardHeader><CardContent><div className="text-2xl font-black text-primary">{money(kpis.totalRevenue)}</div></CardContent></Card>
                    <Card><CardHeader className="pb-2 text-xs font-bold uppercase text-muted-foreground">Volumen Ventas</CardHeader><CardContent><div className="text-2xl font-black">{kpis.totalSales.toLocaleString()}</div></CardContent></Card>
                    <Card><CardHeader className="pb-2 text-xs font-bold uppercase text-muted-foreground">Ticket Promedio</CardHeader><CardContent><div className="text-2xl font-black">{money(kpis.avgSale)}</div></CardContent></Card>
                    <Card><CardHeader className="pb-2 text-xs font-bold uppercase text-muted-foreground">Top Publication</CardHeader><CardContent><div className="text-sm font-bold truncate" title={kpis.topProductName}>{kpis.topProductName}</div></CardContent></Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader><CardTitle>Pareto (80/20) - Análisis de Ingresos</CardTitle></CardHeader>
                        <CardContent className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={charts.topProducts} margin={{ bottom: 100 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" fontSize={9} interval={0} height={100} />
                                    <YAxis yAxisId="left" orientation="left" tickFormatter={v => `$${v/1000}k`} />
                                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                                    <Tooltip />
                                    <Bar yAxisId="left" dataKey="value" fill="hsl(var(--primary))" name="Ingresos" radius={[4, 4, 0, 0]} />
                                    <Line yAxisId="right" dataKey="cumulative" stroke="hsl(var(--destructive))" name="Acumulado %" strokeWidth={3} dot={{ r: 4 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Ventas por Tienda</CardTitle></CardHeader>
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
                        <div><CardTitle>Ciclo de Vida de Ventas (ml_sales)</CardTitle><CardDescription>Explora todas las dimensiones: Financiera, Logística y Fiscal.</CardDescription></div>
                        <Button variant="outline" size="sm" onClick={() => setIsParetoModalOpen(true)}><Maximize className="mr-2 h-4 w-4" /> Ver Análisis Pareto</Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="relative w-full overflow-auto">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow className="text-[10px] uppercase font-bold text-muted-foreground">
                                        <TableHead className="border-r min-w-[120px]">ID / Status</TableHead>
                                        <TableHead className="border-r min-w-[150px]">Producto (sku/publi)</TableHead>
                                        <TableHead className="border-r text-right min-w-[100px]">Finanzas ($)</TableHead>
                                        <TableHead className="border-r min-w-[150px]">Comprador / Fiscal</TableHead>
                                        <TableHead className="border-r min-w-[180px]">Logística Seg. 1</TableHead>
                                        <TableHead className="border-r min-w-[180px]">Logística Seg. 2</TableHead>
                                        <TableHead className="min-w-[150px]">Resultados Finales</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedSales.map((s, idx) => (
                                        <TableRow key={s.num_venta || idx} className="text-xs">
                                            <TableCell className="border-r align-top space-y-1">
                                                <div className="font-mono font-bold">#{s.num_venta}</div>
                                                <div className="text-[10px]">{s.fecha_venta ? format(parseISO(s.fecha_venta), 'dd/MM/yy HH:mm') : 'N/A'}</div>
                                                <Badge variant="outline" className="text-[9px] block text-center uppercase">{s.status}</Badge>
                                            </TableCell>
                                            <TableCell className="border-r align-top space-y-1">
                                                <div className="font-bold line-clamp-2" title={s.tit_pub || ''}>{s.tit_pub}</div>
                                                <div className="flex gap-2 text-[9px] text-muted-foreground">
                                                    <span>SKU: {s.sku}</span>
                                                    <span>Pub: {s.num_publi}</span>
                                                </div>
                                                <div className="text-[9px]"><Badge variant="secondary">{s.tienda}</Badge></div>
                                            </TableCell>
                                            <TableCell className="border-r align-top text-right space-y-1">
                                                <div className="font-black text-primary text-sm">{money(s.total)}</div>
                                                <div className="text-[9px] text-muted-foreground">Unidades: {s.unidades}</div>
                                                <div className="text-[9px] border-t pt-1">
                                                    <div>Ingreso Prod: {money(s.ing_xunidad)}</div>
                                                    <div>Costo Envío: {money(s.costo_envio)}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="border-r align-top space-y-1">
                                                <div className="font-bold truncate max-w-[140px]">{s.comprador}</div>
                                                <div className="text-[9px] italic">{s.r_fiscal}</div>
                                                <div className="text-[9px] opacity-70">CFDI: {s.cfdi}</div>
                                            </TableCell>
                                            <TableCell className="border-r align-top space-y-1">
                                                <div className="text-[10px] font-bold">{s.transportista}</div>
                                                <div className="font-mono text-[9px] text-blue-600">{s.num_seguimiento}</div>
                                                <div className="text-[9px]">Entregado: {s.f_entregado ? format(parseISO(s.f_entregado), 'dd/MM/yy') : '-'}</div>
                                            </TableCell>
                                            <TableCell className="border-r align-top space-y-1">
                                                <div className="text-[10px] font-bold">{s.transportista2}</div>
                                                <div className="font-mono text-[9px] text-green-600">{s.num_seguimiento2}</div>
                                                <div className="text-[9px]">Status: {s.status}</div>
                                            </TableCell>
                                            <TableCell className="align-top space-y-1">
                                                <div className="font-bold text-[10px]">{s.resultado || 'Pendiente'}</div>
                                                <div className="text-[9px] text-muted-foreground line-clamp-2">{s.motivo_resul}</div>
                                                {s.r_abierto && <Badge variant="destructive" className="text-[8px] h-4">RECLAMO ABIERTO</Badge>}
                                            </TableCell>
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
                                <TableHead>Publicación</TableHead>
                                <TableHead className="text-right">Ingresos</TableHead>
                                <TableHead className="text-right">Unidades</TableHead>
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
                        <div className="flex-1 text-xs text-muted-foreground">Página {paretoPage}</div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setParetoPage(p => Math.max(1, p-1))} disabled={paretoPage === 1}>Anterior</Button>
                            <Button variant="outline" size="sm" onClick={() => setParetoPage(p => p+1)}>Siguiente</Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}