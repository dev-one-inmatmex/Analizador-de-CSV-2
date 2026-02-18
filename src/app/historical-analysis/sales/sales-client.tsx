
'use client';

import * as React from 'react';
import { 
  BarChart3, DollarSign, ShoppingCart, AlertTriangle, Package, PieChart as PieChartIcon, 
  Layers, Filter, Maximize, Loader2, Info, Truck, Landmark, User, FileText, CheckCircle2, AlertCircle
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, parseISO, isValid } from 'date-fns';
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
import { cn } from '@/lib/utils';

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

    // Helper para formateo seguro de fechas
    const safeFormat = (dateStr: string | null | undefined, formatStr: string = 'dd/MM/yy') => {
        if (!dateStr) return '-';
        try {
            const parsed = parseISO(dateStr);
            if (isValid(parsed)) return format(parsed, formatStr);
            
            const fallback = new Date(dateStr);
            if (isValid(fallback)) return format(fallback, formatStr);
            
            return dateStr;
        } catch (e) {
            return dateStr;
        }
    };

    const money = (v?: number | null) => v === null || v === undefined ? '$0.00' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);

    const { sales, kpis, charts, paretoAnalysisData } = React.useMemo(() => {
        const filteredSales = initialSales.filter(sale => {
            const companyMatch = company === 'Todos' || sale.tienda === company;
            if (!companyMatch) return false;

            if (date?.from) {
                if (!sale.fecha_venta) return false;
                try {
                    const saleDate = parseISO(sale.fecha_venta);
                    const finalDate = isValid(saleDate) ? saleDate : new Date(sale.fecha_venta);
                    
                    if (!isValid(finalDate)) return false;

                    const fromDate = startOfDay(date.from);
                    const toDate = date.to ? endOfDay(date.to) : endOfDay(date.from);
                    if (finalDate < fromDate || finalDate > toDate) return false;
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

    const totalPages = Math.ceil(sales.length / PAGE_SIZE);
    const paginatedSales = sales.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    if (!isClient) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="flex min-h-screen flex-col bg-muted/40 min-w-0">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6">
                <div className="flex items-center gap-4">
                    <SidebarTrigger />
                    <h1 className="text-xl font-bold">Ventas Consolidadas</h1>
                    <Badge variant="outline" className="hidden sm:flex">Tabla ml_sales</Badge>
                </div>
            </header>

            <main className="p-4 md:p-8 space-y-8 min-w-0 max-w-full overflow-hidden">
                <Card className="min-w-0 shadow-sm border-none">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <Filter className="h-6 w-6 text-primary" />
                        <div className="flex-1">
                            <CardTitle>Filtros de Análisis</CardTitle>
                            <CardDescription>Segmenta los datos por periodo y tienda.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Periodo</Label>
                            <DateRangePicker date={date} onSelect={setDate} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tienda / Canal</Label>
                            <Select value={company} onValueChange={setCompany}>
                                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                <SelectContent>{allCompanies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-none shadow-sm"><CardHeader className="pb-2 text-xs font-bold uppercase text-muted-foreground tracking-tighter">Ingresos Netos</CardHeader><CardContent><div className="text-3xl font-black text-primary">{money(kpis.totalRevenue)}</div></CardContent></Card>
                    <Card className="border-none shadow-sm"><CardHeader className="pb-2 text-xs font-bold uppercase text-muted-foreground tracking-tighter">Ventas Realizadas</CardHeader><CardContent><div className="text-3xl font-black">{kpis.totalSales.toLocaleString()}</div></CardContent></Card>
                    <Card className="border-none shadow-sm"><CardHeader className="pb-2 text-xs font-bold uppercase text-muted-foreground tracking-tighter">Ticket Promedio</CardHeader><CardContent><div className="text-3xl font-black">{money(kpis.avgSale)}</div></CardContent></Card>
                    <Card className="border-none shadow-sm"><CardHeader className="pb-2 text-xs font-bold uppercase text-muted-foreground tracking-tighter">Best Seller</CardHeader><CardContent><div className="text-sm font-bold truncate leading-tight" title={kpis.topProductName}>{kpis.topProductName}</div></CardContent></Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
                    <Card className="min-w-0 overflow-hidden border-none shadow-sm">
                        <CardHeader><CardTitle className="text-lg font-bold">Distribución Pareto</CardTitle></CardHeader>
                        <CardContent className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={charts.topProducts} margin={{ bottom: 100 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" fontSize={9} interval={0} height={100} tick={{fill: '#666'}} />
                                    <YAxis yAxisId="left" orientation="left" tickFormatter={v => `$${v/1000}k`} tick={{fill: '#666'}} />
                                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{fill: '#666'}} />
                                    <Tooltip />
                                    <Bar yAxisId="left" dataKey="value" fill="hsl(var(--primary))" name="Ingresos" radius={[4, 4, 0, 0]} />
                                    <Line yAxisId="right" dataKey="cumulative" stroke="hsl(var(--destructive))" name="Acumulado %" strokeWidth={3} dot={{ r: 4, fill: 'hsl(var(--destructive))' }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                    <Card className="min-w-0 overflow-hidden border-none shadow-sm">
                        <CardHeader><CardTitle className="text-lg font-bold">Participación por Canal</CardTitle></CardHeader>
                        <CardContent className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={charts.salesByCompany} dataKey="value" nameKey="name" innerRadius={80} outerRadius={120} paddingAngle={5} label={({percent}) => `${(percent * 100).toFixed(0)}%`}>
                                        {charts.salesByCompany.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                                    </Pie>
                                    <Tooltip formatter={v => money(v as number)} />
                                    <Legend iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                <Card className="min-w-0 overflow-hidden border-none shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-black uppercase tracking-tight">Historial Maestro de Ventas</CardTitle>
                            <CardDescription>Ciclo de vida completo desde venta hasta auditoría fiscal.</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setIsParetoModalOpen(true)} className="gap-2 font-bold"><Maximize className="h-4 w-4" /> Pareto Analítico</Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="relative w-full overflow-x-auto border-t">
                            <Table className="min-w-[5000px]">
                                <TableHeader className="bg-muted/30">
                                    <TableRow className="text-[10px] uppercase font-bold text-muted-foreground h-12">
                                        <TableHead className="border-r border-muted text-center bg-muted/10" colSpan={4}><div className="flex items-center justify-center gap-2"><Info className="h-3 w-3"/> Identificación</div></TableHead>
                                        <TableHead className="border-r border-muted text-center bg-blue-50/20" colSpan={3}>Estado Venta</TableHead>
                                        <TableHead className="border-r border-muted text-center bg-green-50/20" colSpan={9}><div className="flex items-center justify-center gap-2"><DollarSign className="h-3 w-3"/> Finanzas ($)</div></TableHead>
                                        <TableHead className="border-r border-muted text-center bg-orange-50/20" colSpan={7}><div className="flex items-center justify-center gap-2"><Package className="h-3 w-3"/> Producto / Publicación</div></TableHead>
                                        <TableHead className="border-r border-muted text-center bg-purple-50/20" colSpan={9}><div className="flex items-center justify-center gap-2"><Landmark className="h-3 w-3"/> Datos Fiscales</div></TableHead>
                                        <TableHead className="border-r border-muted text-center bg-yellow-50/20" colSpan={7}><div className="flex items-center justify-center gap-2"><User className="h-3 w-3"/> Comprador / Ubicación</div></TableHead>
                                        <TableHead className="border-r border-muted text-center bg-indigo-50/20" colSpan={6}><div className="flex items-center justify-center gap-2"><Truck className="h-3 w-3"/> Logística Seg. 1</div></TableHead>
                                        <TableHead className="border-r border-muted text-center bg-cyan-50/20" colSpan={7}>Logística Seg. 2</TableHead>
                                        <TableHead className="bg-red-50/20 text-center" colSpan={10}><div className="flex items-center justify-center gap-2"><FileText className="h-3 w-3"/> Auditoría Final</div></TableHead>
                                    </TableRow>
                                    <TableRow className="text-[9px] uppercase font-medium bg-muted/10 h-10">
                                        {/* Identificación */}
                                        <TableHead className="border-r">ID</TableHead>
                                        <TableHead className="border-r"># Venta</TableHead>
                                        <TableHead className="border-r">Fecha</TableHead>
                                        <TableHead className="border-r">Status</TableHead>
                                        {/* Estado Venta */}
                                        <TableHead className="border-r">Descripción Status</TableHead>
                                        <TableHead className="border-r text-center">Pq. Varios</TableHead>
                                        <TableHead className="border-r text-center">Kit</TableHead>
                                        {/* Finanzas */}
                                        <TableHead className="border-r text-center">Unid.</TableHead>
                                        <TableHead className="border-r text-right">Ing x Unid</TableHead>
                                        <TableHead className="border-r text-right">Cargo Venta</TableHead>
                                        <TableHead className="border-r text-right">Ing x Envío</TableHead>
                                        <TableHead className="border-r text-right">Costo Envío</TableHead>
                                        <TableHead className="border-r text-right">Envío MP</TableHead>
                                        <TableHead className="border-r text-right">Dif Peso</TableHead>
                                        <TableHead className="border-r text-right">Reembolsos</TableHead>
                                        <TableHead className="border-r text-right font-bold text-primary">Total Neto</TableHead>
                                        {/* Producto */}
                                        <TableHead className="border-r text-center">Publicidad</TableHead>
                                        <TableHead className="border-r">SKU</TableHead>
                                        <TableHead className="border-r"># Publi</TableHead>
                                        <TableHead className="border-r">Tienda</TableHead>
                                        <TableHead className="border-r">Título Publicación</TableHead>
                                        <TableHead className="border-r">Variante</TableHead>
                                        <TableHead className="border-r text-right">Precio Unit.</TableHead>
                                        {/* Datos Fiscales */}
                                        <TableHead className="border-r">Tipo Pub</TableHead>
                                        <TableHead className="border-r">Factura A</TableHead>
                                        <TableHead className="border-r">POE</TableHead>
                                        <TableHead className="border-r">Tipo Doc</TableHead>
                                        <TableHead className="border-r">Dirección Fiscal</TableHead>
                                        <TableHead className="border-r">RFC/Contrib.</TableHead>
                                        <TableHead className="border-r">CFDI</TableHead>
                                        <TableHead className="border-r">Tipo Usuario</TableHead>
                                        <TableHead className="border-r">R. Fiscal</TableHead>
                                        {/* Comprador */}
                                        <TableHead className="border-r">Comprador</TableHead>
                                        <TableHead className="border-r text-center">Negocio</TableHead>
                                        <TableHead className="border-r">IFE</TableHead>
                                        <TableHead className="border-r">Domicilio</TableHead>
                                        <TableHead className="border-r">Alcaldía</TableHead>
                                        <TableHead className="border-r">Estado</TableHead>
                                        <TableHead className="border-r">CP</TableHead>
                                        {/* Logística 1 */}
                                        <TableHead className="border-r">País</TableHead>
                                        <TableHead className="border-r">F. Entrega</TableHead>
                                        <TableHead className="border-r">F. Camino</TableHead>
                                        <TableHead className="border-r">F. Entregado</TableHead>
                                        <TableHead className="border-r">Transportista</TableHead>
                                        <TableHead className="border-r">Seguimiento</TableHead>
                                        {/* Logística 2 */}
                                        <TableHead className="border-r">URL Seg.</TableHead>
                                        <TableHead className="border-r text-center">Unid 2</TableHead>
                                        <TableHead className="border-r">F. Entrega 2</TableHead>
                                        <TableHead className="border-r">F. Camino 2</TableHead>
                                        <TableHead className="border-r">F. Entregado 2</TableHead>
                                        <TableHead className="border-r">Transp. 2</TableHead>
                                        <TableHead className="border-r">Seg. 2</TableHead>
                                        {/* Auditoría Final */}
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
                                            {/* Identificación */}
                                            <TableCell className="border-r font-mono text-muted-foreground whitespace-nowrap">{s.id || '-'}</TableCell>
                                            <TableCell className="border-r font-bold text-primary">#{s.num_venta}</TableCell>
                                            <TableCell className="border-r whitespace-nowrap">{safeFormat(s.fecha_venta, 'dd/MM/yy HH:mm')}</TableCell>
                                            <TableCell className="border-r"><Badge variant="outline" className="text-[8px] uppercase font-black">{s.status}</Badge></TableCell>
                                            
                                            {/* Estado Venta */}
                                            <TableCell className="border-r italic text-muted-foreground whitespace-nowrap truncate max-w-[150px]">{s.desc_status || '-'}</TableCell>
                                            <TableCell className="border-r text-center font-bold">{s.paquete_varios ? 'SÍ' : 'NO'}</TableCell>
                                            <TableCell className="border-r text-center font-bold">{s.pertenece_kit ? 'SÍ' : 'NO'}</TableCell>
                                            
                                            {/* Finanzas */}
                                            <TableCell className="border-r text-center font-black bg-muted/5">{s.unidades}</TableCell>
                                            <TableCell className="border-r text-right">{money(s.ing_xunidad)}</TableCell>
                                            <TableCell className="border-r text-right text-destructive font-medium">{money(s.cargo_venta)}</TableCell>
                                            <TableCell className="border-r text-right text-blue-600 font-medium">{money(s.ing_xenvio)}</TableCell>
                                            <TableCell className="border-r text-right text-destructive">{money(s.costo_envio)}</TableCell>
                                            <TableCell className="border-r text-right">{money(s.costo_enviomp)}</TableCell>
                                            <TableCell className="border-r text-right text-amber-600">{money(s.cargo_difpeso)}</TableCell>
                                            <TableCell className="border-r text-right text-orange-600">{money(s.anu_reembolsos)}</TableCell>
                                            <TableCell className="border-r text-right font-black bg-primary/5 text-primary">{money(s.total)}</TableCell>
                                            
                                            {/* Producto */}
                                            <TableCell className="border-r text-center">{s.venta_xpublicidad ? <CheckCircle2 className="h-3 w-3 mx-auto text-green-500" /> : <AlertCircle className="h-3 w-3 mx-auto text-muted-foreground" />}</TableCell>
                                            <TableCell className="border-r font-mono font-bold text-blue-700 whitespace-nowrap">{s.sku || '-'}</TableCell>
                                            <TableCell className="border-r font-mono whitespace-nowrap">{s.num_publi || '-'}</TableCell>
                                            <TableCell className="border-r"><Badge variant="secondary" className="text-[8px] font-bold">{s.tienda}</Badge></TableCell>
                                            <TableCell className="border-r truncate max-w-[250px] font-medium" title={s.tit_pub || ''}>{s.tit_pub || '-'}</TableCell>
                                            <TableCell className="border-r whitespace-nowrap">{s.variante || '-'}</TableCell>
                                            <TableCell className="border-r text-right font-bold">{money(s.price)}</TableCell>
                                            
                                            {/* Datos Fiscales */}
                                            <TableCell className="border-r whitespace-nowrap">{s.tip_publi || '-'}</TableCell>
                                            <TableCell className="border-r font-bold">{s.factura_a || '-'}</TableCell>
                                            <TableCell className="border-r whitespace-nowrap">{s.datos_poe || '-'}</TableCell>
                                            <TableCell className="border-r whitespace-nowrap">{s.tipo_ndoc || '-'}</TableCell>
                                            <TableCell className="border-r truncate max-w-[150px] italic">{s.direccion || '-'}</TableCell>
                                            <TableCell className="border-r font-medium">{s.t_contribuyente || '-'}</TableCell>
                                            <TableCell className="border-r font-mono text-muted-foreground uppercase">{s.cfdi || '-'}</TableCell>
                                            <TableCell className="border-r text-[9px]">{s.t_usuario || '-'}</TableCell>
                                            <TableCell className="border-r text-[9px] italic text-muted-foreground">{s.r_fiscal || '-'}</TableCell>
                                            
                                            {/* Comprador */}
                                            <TableCell className="border-r font-black text-slate-700 whitespace-nowrap">{s.comprador || '-'}</TableCell>
                                            <TableCell className="border-r text-center">{s.negocio ? 'SÍ' : 'NO'}</TableCell>
                                            <TableCell className="border-r font-mono text-[9px]">{s.ife || '-'}</TableCell>
                                            <TableCell className="border-r truncate max-w-[150px]">{s.domicilio || '-'}</TableCell>
                                            <TableCell className="border-r whitespace-nowrap">{s.mun_alcaldia || '-'}</TableCell>
                                            <TableCell className="border-r font-bold whitespace-nowrap">{s.estado || '-'}</TableCell>
                                            <TableCell className="border-r font-mono">{s.c_postal || '-'}</TableCell>
                                            
                                            {/* Logística 1 */}
                                            <TableCell className="border-r text-center font-bold text-[9px]">{s.pais || '-'}</TableCell>
                                            <TableCell className="border-r whitespace-nowrap">{safeFormat(s.f_entrega)}</TableCell>
                                            <TableCell className="border-r whitespace-nowrap">{safeFormat(s.f_camino)}</TableCell>
                                            <TableCell className="border-r font-black text-green-600 whitespace-nowrap">{safeFormat(s.f_entregado)}</TableCell>
                                            <TableCell className="border-r font-bold whitespace-nowrap">{s.transportista || '-'}</TableCell>
                                            <TableCell className="border-r font-mono text-blue-600 font-bold whitespace-nowrap">{s.num_seguimiento || '-'}</TableCell>
                                            
                                            {/* Logística 2 */}
                                            <TableCell className="border-r truncate max-w-[100px] text-[8px] text-blue-500 underline whitespace-nowrap cursor-pointer">{s.url_seguimiento || '-'}</TableCell>
                                            <TableCell className="border-r text-center font-black bg-muted/5">{s.unidades_2 || '-'}</TableCell>
                                            <TableCell className="border-r whitespace-nowrap">{safeFormat(s.f_entrega2)}</TableCell>
                                            <TableCell className="border-r whitespace-nowrap">{safeFormat(s.f_camino2)}</TableCell>
                                            <TableCell className="border-r font-black text-green-600 whitespace-nowrap">{safeFormat(s.f_entregado2)}</TableCell>
                                            <TableCell className="border-r font-bold whitespace-nowrap">{s.transportista2 || '-'}</TableCell>
                                            <TableCell className="border-r font-mono text-green-600 font-bold whitespace-nowrap">{s.num_seguimiento2 || '-'}</TableCell>
                                            
                                            {/* Auditoría Final */}
                                            <TableCell className="border-r truncate max-w-[100px] text-[8px] text-blue-500 underline whitespace-nowrap cursor-pointer">{s.url_seguimiento2 || '-'}</TableCell>
                                            <TableCell className="border-r text-center font-bold">{s.revisado_xml || '-'}</TableCell>
                                            <TableCell className="border-r whitespace-nowrap">{safeFormat(s.f_revision3)}</TableCell>
                                            <TableCell className="border-r text-right font-medium">{s.d_afavor || '-'}</TableCell>
                                            <TableCell className="border-r font-black uppercase text-center">{s.resultado || '-'}</TableCell>
                                            <TableCell className="border-r whitespace-nowrap">{s.destino || '-'}</TableCell>
                                            <TableCell className="border-r italic text-muted-foreground truncate max-w-[150px]">{s.motivo_resul || '-'}</TableCell>
                                            <TableCell className="border-r text-center font-black">{s.unidades_3 || '-'}</TableCell>
                                            <TableCell className="border-r text-center">
                                                {s.r_abierto ? <Badge variant="destructive" className="text-[8px] font-black">ABI</Badge> : <span className="text-muted-foreground opacity-30">NO</span>}
                                            </TableCell>
                                            <TableCell className="border-r text-center">
                                                {s.r_cerrado === null ? '-' : (s.r_cerrado ? <span className="text-green-600 font-bold">SÍ</span> : <span className="text-muted-foreground">NO</span>)}
                                            </TableCell>
                                            <TableCell className="text-center font-bold">
                                                {s.c_mediacion ? <Badge className="bg-amber-500 hover:bg-amber-600 text-[8px] font-black">MED</Badge> : '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t p-4 bg-muted/5">
                        <div className="text-xs text-muted-foreground font-medium">Página {currentPage} de {totalPages} • <span className="text-primary font-black">{sales.length}</span> registros auditados</div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8">Anterior</Button>
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="h-8">Siguiente</Button>
                        </div>
                    </CardFooter>
                </Card>
            </main>

            <Dialog open={isParetoModalOpen} onOpenChange={setIsParetoModalOpen}>
                <DialogContent className="max-w-5xl h-[80vh] flex flex-col border-none shadow-2xl">
                    <DialogHeader className="pb-4 border-b">
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                            <BarChart3 className="h-6 w-6 text-primary" /> Auditoría Pareto (Impacto 80/20)
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto py-4">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="font-bold">Producto / Publicación</TableHead>
                                    <TableHead className="text-right font-bold">Ingresos Acum.</TableHead>
                                    <TableHead className="text-right font-bold">Volumen</TableHead>
                                    <TableHead className="text-right font-bold">% Acumulado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paretoAnalysisData.slice((paretoPage-1)*15, paretoPage*15).map((p, i) => (
                                    <TableRow key={i} className="h-12 hover:bg-muted/30">
                                        <TableCell className="font-bold text-xs max-w-md truncate">{p.name}</TableCell>
                                        <TableCell className="text-right font-black text-primary">{money(p.revenue)}</TableCell>
                                        <TableCell className="text-right font-medium">{p.units.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={p.cumulativePercentage <= 80 ? 'default' : 'secondary'} className="font-black">
                                                {p.cumulativePercentage.toFixed(1)}%
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <DialogFooter className="border-t pt-4 flex items-center justify-between">
                        <div className="flex-1 text-xs text-muted-foreground font-medium">Página Pareto {paretoPage} de {Math.ceil(paretoAnalysisData.length / 15)}</div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setParetoPage(p => Math.max(1, p - 1))} disabled={paretoPage === 1}>Anterior</Button>
                            <Button variant="outline" size="sm" onClick={() => setParetoPage(p => p+1)} disabled={paretoPage * 15 >= paretoAnalysisData.length}>Siguiente</Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
