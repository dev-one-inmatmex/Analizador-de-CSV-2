'use client';

import * as React from 'react';
import { 
  BarChart3, DollarSign, ShoppingCart, AlertTriangle, Package, PieChart as PieChartIcon, 
  Layers, Filter, Maximize, Loader2, Info, Truck, Landmark, User, FileText
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

    const { sales, kpis, charts, paretoAnalysisData } = React.useMemo(() => {
        const filteredSales = initialSales.filter(sale => {
            const companyMatch = company === 'Todos' || sale.tienda === company;
            if (!companyMatch) return false;

            if (date?.from) {
                if (!sale.fecha_venta) return false;
                try {
                    const saleDate = parseISO(sale.fecha_venta);
                    if (!isValid(saleDate)) {
                        const fallbackDate = new Date(sale.fecha_venta);
                        if (!isValid(fallbackDate)) return false;
                        
                        const fromDate = startOfDay(date.from);
                        const toDate = date.to ? endOfDay(date.to) : endOfDay(date.from);
                        if (fallbackDate < fromDate || fallbackDate > toDate) return false;
                        return true;
                    }
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

    const money = (v?: number | null) => v === null || v === undefined ? '$0.00' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);
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
                        <div className="flex-1"><CardTitle>Filtros de Auditoría</CardTitle></div>
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
                    <Card><CardHeader className="pb-2 text-xs font-bold uppercase text-muted-foreground">Ingresos Totales</CardHeader><CardContent><div className="text-2xl font-black text-primary">{money(kpis.totalRevenue)}</div></CardContent></Card>
                    <Card><CardHeader className="pb-2 text-xs font-bold uppercase text-muted-foreground">Transacciones</CardHeader><CardContent><div className="text-2xl font-black">{kpis.totalSales.toLocaleString()}</div></CardContent></Card>
                    <Card><CardHeader className="pb-2 text-xs font-bold uppercase text-muted-foreground">Ticket Medio</CardHeader><CardContent><div className="text-2xl font-black">{money(kpis.avgSale)}</div></CardContent></Card>
                    <Card><CardHeader className="pb-2 text-xs font-bold uppercase text-muted-foreground">Producto Estrella</CardHeader><CardContent><div className="text-sm font-bold truncate" title={kpis.topProductName}>{kpis.topProductName}</div></CardContent></Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader><CardTitle>Análisis de Pareto (Ingresos)</CardTitle></CardHeader>
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
                        <CardHeader><CardTitle>Participación por Tienda</CardTitle></CardHeader>
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
                        <div>
                            <CardTitle>Historial Detallado (ml_sales)</CardTitle>
                            <CardDescription>Visualización masiva de todos los campos del ciclo de vida de la venta.</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setIsParetoModalOpen(true)}><Maximize className="mr-2 h-4 w-4" /> Resumen Pareto</Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="relative w-full overflow-x-auto border-t">
                            <Table className="min-w-[4000px]">
                                <TableHeader className="bg-muted/50">
                                    <TableRow className="text-[10px] uppercase font-bold text-muted-foreground h-12">
                                        {/* Agrupación: Identificadores */}
                                        <TableHead className="border-r bg-muted/20 text-center" colSpan={4}><div className="flex items-center justify-center gap-2"><Info className="h-3 w-3"/> Identificación</div></TableHead>
                                        {/* Agrupación: Datos de Venta */}
                                        <TableHead className="border-r bg-blue-50/20 text-center" colSpan={3}>Venta</TableHead>
                                        {/* Agrupación: Finanzas */}
                                        <TableHead className="border-r bg-green-50/20 text-center" colSpan={9}><div className="flex items-center justify-center gap-2"><DollarSign className="h-3 w-3"/> Finanzas ($)</div></TableHead>
                                        {/* Agrupación: Producto */}
                                        <TableHead className="border-r bg-orange-50/20 text-center" colSpan={7}><div className="flex items-center justify-center gap-2"><Package className="h-3 w-3"/> Publicación / Producto</div></TableHead>
                                        {/* Agrupación: Facturación */}
                                        <TableHead className="border-r bg-purple-50/20 text-center" colSpan={9}><div className="flex items-center justify-center gap-2"><Landmark className="h-3 w-3"/> Fiscal / Facturación</div></TableHead>
                                        {/* Agrupación: Ubicación */}
                                        <TableHead className="border-r bg-yellow-50/20 text-center" colSpan={7}><div className="flex items-center justify-center gap-2"><User className="h-3 w-3"/> Comprador / Ubicación</div></TableHead>
                                        {/* Agrupación: Logística 1 */}
                                        <TableHead className="border-r bg-indigo-50/20 text-center" colSpan={6}><div className="flex items-center justify-center gap-2"><Truck className="h-3 w-3"/> Logística Seg. 1</div></TableHead>
                                        {/* Agrupación: Logística 2 */}
                                        <TableHead className="border-r bg-cyan-50/20 text-center" colSpan={7}>Logística Seg. 2</TableHead>
                                        {/* Agrupación: Auditoría */}
                                        <TableHead className="bg-red-50/20 text-center" colSpan={10}><div className="flex items-center justify-center gap-2"><FileText className="h-3 w-3"/> Auditoría y Resultados</div></TableHead>
                                    </TableRow>
                                    <TableRow className="text-[9px] uppercase font-medium">
                                        {/* Identificación */}
                                        <TableHead className="border-r">ID</TableHead>
                                        <TableHead className="border-r"># Venta</TableHead>
                                        <TableHead className="border-r">Fecha</TableHead>
                                        <TableHead className="border-r">Status</TableHead>
                                        {/* Venta */}
                                        <TableHead className="border-r">Desc. Status</TableHead>
                                        <TableHead className="border-r">Pq. Varios</TableHead>
                                        <TableHead className="border-r">Kit</TableHead>
                                        {/* Finanzas */}
                                        <TableHead className="border-r">Unidades</TableHead>
                                        <TableHead className="border-r">Ing x Unid</TableHead>
                                        <TableHead className="border-r">Cargo Venta</TableHead>
                                        <TableHead className="border-r">Ing x Envío</TableHead>
                                        <TableHead className="border-r">Costo Envío</TableHead>
                                        <TableHead className="border-r">Envío MP</TableHead>
                                        <TableHead className="border-r">Cargo Dif Peso</TableHead>
                                        <TableHead className="border-r">Reembolsos</TableHead>
                                        <TableHead className="border-r font-bold">Total</TableHead>
                                        {/* Producto */}
                                        <TableHead className="border-r">Pub x Publi</TableHead>
                                        <TableHead className="border-r">SKU</TableHead>
                                        <TableHead className="border-r"># Publi</TableHead>
                                        <TableHead className="border-r">Tienda</TableHead>
                                        <TableHead className="border-r">Título</TableHead>
                                        <TableHead className="border-r">Variante</TableHead>
                                        <TableHead className="border-r">Precio Unit.</TableHead>
                                        {/* Facturación */}
                                        <TableHead className="border-r">Tipo Pub</TableHead>
                                        <TableHead className="border-r">Factura A</TableHead>
                                        <TableHead className="border-r">Datos POE</TableHead>
                                        <TableHead className="border-r">Tipo NDOC</TableHead>
                                        <TableHead className="border-r">Dirección</TableHead>
                                        <TableHead className="border-r">Contribuyente</TableHead>
                                        <TableHead className="border-r">CFDI</TableHead>
                                        <TableHead className="border-r">T. Usuario</TableHead>
                                        <TableHead className="border-r">R. Fiscal</TableHead>
                                        {/* Ubicación */}
                                        <TableHead className="border-r">Comprador</TableHead>
                                        <TableHead className="border-r">Negocio</TableHead>
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
                                        <TableHead className="border-r">Transporte</TableHead>
                                        <TableHead className="border-r">Seguimiento</TableHead>
                                        {/* Logística 2 */}
                                        <TableHead className="border-r">URL Seg.</TableHead>
                                        <TableHead className="border-r">Unid 2</TableHead>
                                        <TableHead className="border-r">F. Entrega 2</TableHead>
                                        <TableHead className="border-r">F. Camino 2</TableHead>
                                        <TableHead className="border-r">F. Entregado 2</TableHead>
                                        <TableHead className="border-r">Transporte 2</TableHead>
                                        <TableHead className="border-r">Seguimiento 2</TableHead>
                                        {/* Auditoría */}
                                        <TableHead className="border-r">URL Seg 2</TableHead>
                                        <TableHead className="border-r">XML Revisado</TableHead>
                                        <TableHead className="border-r">F. Revisión 3</TableHead>
                                        <TableHead className="border-r">Favor</TableHead>
                                        <TableHead className="border-r">Resultado</TableHead>
                                        <TableHead className="border-r">Destino</TableHead>
                                        <TableHead className="border-r">Motivo</TableHead>
                                        <TableHead className="border-r">Unid 3</TableHead>
                                        <TableHead className="border-r">R. Abierto</TableHead>
                                        <TableHead className="border-r">R. Cerrado</TableHead>
                                        <TableHead>Mediación</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedSales.map((s, idx) => (
                                        <TableRow key={s.num_venta || idx} className="text-[10px] h-10 hover:bg-muted/30">
                                            <TableCell className="border-r font-mono text-muted-foreground">{s.id || '-'}</TableCell>
                                            <TableCell className="border-r font-bold">#{s.num_venta}</TableCell>
                                            <TableCell className="border-r">{safeFormat(s.fecha_venta, 'dd/MM/yy HH:mm')}</TableCell>
                                            <TableCell className="border-r"><Badge variant="outline" className="text-[8px] uppercase px-1">{s.status}</Badge></TableCell>
                                            
                                            <TableCell className="border-r italic">{s.desc_status || '-'}</TableCell>
                                            <TableCell className="border-r text-center">{s.paquete_varios ? 'SÍ' : 'NO'}</TableCell>
                                            <TableCell className="border-r text-center">{s.pertenece_kit ? 'SÍ' : 'NO'}</TableCell>
                                            
                                            <TableCell className="border-r text-center font-bold">{s.unidades}</TableCell>
                                            <TableCell className="border-r text-right">{money(s.ing_xunidad)}</TableCell>
                                            <TableCell className="border-r text-right text-destructive">{money(s.cargo_venta)}</TableCell>
                                            <TableCell className="border-r text-right text-blue-600">{money(s.ing_xenvio)}</TableCell>
                                            <TableCell className="border-r text-right text-destructive">{money(s.costo_envio)}</TableCell>
                                            <TableCell className="border-r text-right">{money(s.costo_enviomp)}</TableCell>
                                            <TableCell className="border-r text-right">{money(s.cargo_difpeso)}</TableCell>
                                            <TableCell className="border-r text-right">{money(s.anu_reembolsos)}</TableCell>
                                            <TableCell className="border-r text-right font-black bg-muted/10">{money(s.total)}</TableCell>
                                            
                                            <TableCell className="border-r text-center">{s.venta_xpublicidad ? 'SÍ' : 'NO'}</TableCell>
                                            <TableCell className="border-r font-mono">{s.sku || '-'}</TableCell>
                                            <TableCell className="border-r font-mono">{s.num_publi || '-'}</TableCell>
                                            <TableCell className="border-r"><Badge variant="secondary" className="text-[8px]">{s.tienda}</Badge></TableCell>
                                            <TableCell className="border-r truncate max-w-[200px]" title={s.tit_pub || ''}>{s.tit_pub || '-'}</TableCell>
                                            <TableCell className="border-r">{s.variante || '-'}</TableCell>
                                            <TableCell className="border-r text-right font-bold">{money(s.price)}</TableCell>
                                            
                                            <TableCell className="border-r">{s.tip_publi || '-'}</TableCell>
                                            <TableCell className="border-r">{s.factura_a || '-'}</TableCell>
                                            <TableCell className="border-r">{s.datos_poe || '-'}</TableCell>
                                            <TableCell className="border-r">{s.tipo_ndoc || '-'}</TableCell>
                                            <TableCell className="border-r truncate max-w-[150px]">{s.direccion || '-'}</TableCell>
                                            <TableCell className="border-r">{s.t_contribuyente || '-'}</TableCell>
                                            <TableCell className="border-r font-mono">{s.cfdi || '-'}</TableCell>
                                            <TableCell className="border-r">{s.t_usuario || '-'}</TableCell>
                                            <TableCell className="border-r italic">{s.r_fiscal || '-'}</TableCell>
                                            
                                            <TableCell className="border-r font-bold">{s.comprador || '-'}</TableCell>
                                            <TableCell className="border-r text-center">{s.negocio ? 'SÍ' : 'NO'}</TableCell>
                                            <TableCell className="border-r">{s.ife || '-'}</TableCell>
                                            <TableCell className="border-r truncate max-w-[150px]">{s.domicilio || '-'}</TableCell>
                                            <TableCell className="border-r">{s.mun_alcaldia || '-'}</TableCell>
                                            <TableCell className="border-r">{s.estado || '-'}</TableCell>
                                            <TableCell className="border-r">{s.c_postal || '-'}</TableCell>
                                            
                                            <TableCell className="border-r">{s.pais || '-'}</TableCell>
                                            <TableCell className="border-r">{safeFormat(s.f_entrega)}</TableCell>
                                            <TableCell className="border-r">{safeFormat(s.f_camino)}</TableCell>
                                            <TableCell className="border-r font-bold text-green-600">{safeFormat(s.f_entregado)}</TableCell>
                                            <TableCell className="border-r">{s.transportista || '-'}</TableCell>
                                            <TableCell className="border-r font-mono text-blue-600">{s.num_seguimiento || '-'}</TableCell>
                                            
                                            <TableCell className="border-r truncate max-w-[100px] text-[8px] text-blue-500 underline">{s.url_seguimiento || '-'}</TableCell>
                                            <TableCell className="border-r text-center">{s.unidades_2 || '-'}</TableCell>
                                            <TableCell className="border-r">{safeFormat(s.f_entrega2)}</TableCell>
                                            <TableCell className="border-r">{safeFormat(s.f_camino2)}</TableCell>
                                            <TableCell className="border-r font-bold text-green-600">{safeFormat(s.f_entregado2)}</TableCell>
                                            <TableCell className="border-r">{s.transportista2 || '-'}</TableCell>
                                            <TableCell className="border-r font-mono text-green-600">{s.num_seguimiento2 || '-'}</TableCell>
                                            
                                            <TableCell className="border-r truncate max-w-[100px] text-[8px] text-green-500 underline">{s.url_seguimiento2 || '-'}</TableCell>
                                            <TableCell className="border-r">{s.revisado_xml || '-'}</TableCell>
                                            <TableCell className="border-r">{safeFormat(s.f_revision3)}</TableCell>
                                            <TableCell className="border-r">{s.d_afavor || '-'}</TableCell>
                                            <TableCell className="border-r font-bold">{s.resultado || '-'}</TableCell>
                                            <TableCell className="border-r">{s.destino || '-'}</TableCell>
                                            <TableCell className="border-r italic">{s.motivo_resul || '-'}</TableCell>
                                            <TableCell className="border-r text-center">{s.unidades_3 || '-'}</TableCell>
                                            <TableCell className="border-r text-center"><Badge variant={s.r_abierto ? "destructive" : "outline"} className="text-[8px]">{s.r_abierto ? 'ABI' : 'NO'}</Badge></TableCell>
                                            <TableCell className="border-r text-center">{s.r_cerrado === null ? '-' : (s.r_cerrado ? 'SÍ' : 'NO')}</TableCell>
                                            <TableCell className="text-center">{s.c_mediacion ? 'SÍ' : 'NO'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t p-4 bg-muted/5">
                        <div className="text-xs text-muted-foreground">Página {currentPage} de {totalPages} • Total registros: {sales.length}</div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</Button>
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages}>Siguiente</Button>
                        </div>
                    </CardFooter>
                </Card>
            </main>

            <Dialog open={isParetoModalOpen} onOpenChange={setIsParetoModalOpen}>
                <DialogContent className="max-w-5xl h-[80vh] flex flex-col">
                    <DialogHeader><DialogTitle>Auditoría Pareto Detallada</DialogTitle></DialogHeader>
                    <div className="flex-1 overflow-auto">
                        <Table>
                            <TableHeader><TableRow>
                                <TableHead>Producto / Publicación</TableHead>
                                <TableHead className="text-right">Ingresos Acum.</TableHead>
                                <TableHead className="text-right">Volumen</TableHead>
                                <TableHead className="text-right">% Acumulado</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                                {paretoAnalysisData.slice((paretoPage-1)*15, paretoPage*15).map((p, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-bold text-sm max-w-md truncate">{p.name}</TableCell>
                                        <TableCell className="text-right font-black text-primary">{money(p.revenue)}</TableCell>
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
                        <div className="flex-1 text-xs text-muted-foreground">Página Pareto {paretoPage}</div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setParetoPage(p => Math.max(1, p - 1))} disabled={paretoPage === 1}>Anterior</Button>
                            <Button variant="outline" size="sm" onClick={() => setParetoPage(p => p+1)}>Siguiente</Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
