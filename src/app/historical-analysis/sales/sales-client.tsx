'use client';

import * as React from 'react';
import { BarChart3, DollarSign, ShoppingCart, AlertTriangle, Package, PieChart as PieChartIcon, Layers, FileCode, Tag, ClipboardList } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ComposedChart } from 'recharts';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { Sale, ChartData, EnrichedCategoriaMadre, EnrichedMotherCatalog, EnrichedPublicationCount, EnrichedSkuMap, KpiType, ChartDataType } from './page';
import type { skus_unicos, skuxpublicaciones } from '@/types/database';

type InventoryData = {
    categoriasMadre: EnrichedCategoriaMadre[];
    skusUnicos: skus_unicos[];
    skuPublicaciones: skuxpublicaciones[];
    error: string | null;
}

type ProductsData = {
    publications: any[];
    skuCounts: EnrichedPublicationCount[];
    skuMap: EnrichedSkuMap[];
    motherCatalog: EnrichedMotherCatalog[];
    error: string | null;
}

const PAGE_SIZE = 10;
const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function SalesDashboardClient({ 
    sales, 
    kpis, 
    charts,
    inventoryData,
    productsData 
}: { 
    sales: Sale[], 
    kpis: KpiType, 
    charts: ChartDataType,
    inventoryData: InventoryData,
    productsData: ProductsData
}) {
    // === SALES-CLIENT STATE AND LOGIC ===
    const [currentPage, setCurrentPage] = React.useState(1);
    
    const money = (v?: number | null) => v === null || v === undefined ? 'N/A' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);
    const formatDate = (d: string | null) => {
        if (!d) return 'N/A';
        const date = new Date(d);
        return isValid(date) ? format(date, 'dd MMM yyyy, HH:mm', { locale: es }) : 'Fecha inválida';
    }
    const formatBoolean = (b: boolean | string | null | undefined) => {
        if (b === null || b === undefined) return 'N/A';
        if (typeof b === 'boolean') return b ? 'Sí' : 'No';
        const s = String(b).toLowerCase();
        if (s === 'true' || s === 'si' || s === 'sí' || s === '1') return 'Sí';
        if (s === 'false' || s === 'no' || s === '0') return 'No';
        return String(b);
    }
    const formatText = (t: string | null | undefined) => t || 'N/A';

    const totalPages = Math.ceil(sales.length / PAGE_SIZE);
    const paginatedSales = sales.slice(
      (currentPage - 1) * PAGE_SIZE,
      currentPage * PAGE_SIZE
    );

    // === INVENTORY-CLIENT STATE AND LOGIC ===
    const { toast } = useToast();
    const { categoriasMadre, skusUnicos, skuPublicaciones } = inventoryData;
    
    const [pageCategorias, setPageCategorias] = React.useState(1);
    const [pageSkus, setPageSkus] = React.useState(1);
    const [pageSkuPub, setPageSkuPub] = React.useState(1);

    const { inventoryKpis, topProveedores } = React.useMemo(() => {
        const totalCategorias = categoriasMadre.length;
        const totalSkus = skusUnicos.length;
        const totalMapeos = skuPublicaciones.length;
        const landedCosts = categoriasMadre.map(c => c.landed_cost).filter(Boolean);
        const avgLandedCost = landedCosts.length > 0 ? landedCosts.reduce((a, b) => a + b, 0) / landedCosts.length : 0;
        
        const proveedorCounts: Record<string, number> = {};
        categoriasMadre.forEach(cat => {
            if (cat.proveedor) {
                proveedorCounts[cat.proveedor] = (proveedorCounts[cat.proveedor] || 0) + 1;
            }
        });

        const topProveedoresData = Object.entries(proveedorCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return {
            inventoryKpis: { totalCategorias, totalSkus, totalMapeos, avgLandedCost },
            topProveedores: topProveedoresData
        };
    }, [categoriasMadre, skusUnicos, skuPublicaciones]);

    const totalPagesCategorias = Math.ceil(categoriasMadre.length / PAGE_SIZE);
    const paginatedCategorias = categoriasMadre.slice((pageCategorias - 1) * PAGE_SIZE, pageCategorias * PAGE_SIZE);

    const totalPagesSkus = Math.ceil(skusUnicos.length / PAGE_SIZE);
    const paginatedSkus = skusUnicos.slice((pageSkus - 1) * PAGE_SIZE, pageSkus * PAGE_SIZE);

    const totalPagesSkuPub = Math.ceil(skuPublicaciones.length / PAGE_SIZE);
    const paginatedSkuPub = skuPublicaciones.slice((pageSkuPub - 1) * PAGE_SIZE, pageSkuPub * PAGE_SIZE);

    const renderInventoryPagination = (currentPage: number, totalPages: number, setPage: (page: number) => void) => (
        <CardFooter>
        <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
            <div>Página {currentPage} de {totalPages}</div>
            <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>Anterior</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>Siguiente</Button>
            </div>
        </div>
        </CardFooter>
    );

    // === PRODUCTS-CLIENT STATE AND LOGIC ===
    const { publications, skuCounts, skuMap, motherCatalog } = productsData;
    const [productPages, setProductPages] = React.useState({ pubs: 1, counts: 1, map: 1, catalog: 1 });

    const { productsKpis, statusChartData } = React.useMemo(() => {
        const prices = publications.map(p => p.price).filter((p): p is number => p !== null && p !== undefined);
        const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
        
        const statusCounts: Record<string, number> = {};
        publications.forEach(pub => {
        const status = pub.status || 'desconocido';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        const chartData = Object.entries(statusCounts).map(([name, count]) => ({ name, count }));

        return {
        productsKpis: {
            totalPublications: publications.length,
            totalSkuWithPublications: skuCounts.length,
            totalMotherCatalogs: motherCatalog.length,
            averagePrice: avgPrice,
        },
        statusChartData: chartData
        };
    }, [publications, skuCounts, motherCatalog]);
    
    const renderProductsPagination = (currentPage: number, totalPages: number, setPage: (page: number) => void) => (
        <CardFooter>
        <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
            <div>Página {currentPage} de {totalPages}</div>
            <div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>Anterior</Button><Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>Siguiente</Button></div>
        </div>
        </CardFooter>
    );

    const paginatedPubs = publications.slice((productPages.pubs - 1) * PAGE_SIZE, productPages.pubs * PAGE_SIZE);
    const totalPagesPubs = Math.ceil(publications.length / PAGE_SIZE);

    const paginatedCounts = skuCounts.slice((productPages.counts - 1) * PAGE_SIZE, productPages.counts * PAGE_SIZE);
    const totalPagesCounts = Math.ceil(skuCounts.length / PAGE_SIZE);

    const paginatedMap = skuMap.slice((productPages.map - 1) * PAGE_SIZE, productPages.map * PAGE_SIZE);
    const totalPagesMap = Math.ceil(skuMap.length / PAGE_SIZE);

    const paginatedCatalog = motherCatalog.slice((productPages.catalog - 1) * PAGE_SIZE, productPages.catalog * PAGE_SIZE);
    const totalPagesCatalog = Math.ceil(motherCatalog.length / PAGE_SIZE);

    return (
        <>
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
                <div className="flex items-center gap-4">
                  <SidebarTrigger />
                  <h1 className="text-xl font-bold tracking-tight">Ventas</h1>
                </div>
            </header>

            <main className="flex flex-1 flex-col items-center p-4 md:p-10">
                <div className="w-full max-w-7xl space-y-4 md:space-y-8">
                <Tabs defaultValue="dashboard">
                    <TabsList className="grid w-full grid-cols-3 max-w-2xl mx-auto">
                        <TabsTrigger value="dashboard">Dashboard de Ventas</TabsTrigger>
                        <TabsTrigger value="inventory">Análisis de Inventario</TabsTrigger>
                        <TabsTrigger value="products">Análisis de Publicaciones</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="dashboard" className="mt-6">
                        {!sales || sales.length === 0 ? (
                            <Alert variant="destructive" className="w-full">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>No se Encontraron Datos de Ventas</AlertTitle>
                                <AlertDescription>No se pudieron obtener datos de la tabla 'ventas'. Revisa la conexión con Supabase y asegúrate de que la tabla contenga registros.</AlertDescription>
                            </Alert>
                        ) : (
                            <div className="space-y-4 md:space-y-8">
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{money(kpis.totalRevenue)}</div><p className="text-xs text-muted-foreground">Últimos 12 meses</p></CardContent></Card>
                                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ventas Totales</CardTitle><ShoppingCart className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{kpis.totalSales?.toLocaleString('es-MX')}</div><p className="text-xs text-muted-foreground"># de transacciones</p></CardContent></Card>
                                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Venta Promedio</CardTitle><BarChart3 className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{money(kpis.avgSale)}</div><p className="text-xs text-muted-foreground">Valor medio por transacción</p></CardContent></Card>
                                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Producto Estrella</CardTitle><Package className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold truncate" title={kpis.topProductName}>{kpis.topProductName}</div><p className="text-xs text-muted-foreground">Ingresos: {money(kpis.topProductRevenue)}</p></CardContent></Card>
                                </div>
                                
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <Card>
                                        <CardHeader><CardTitle>Tendencia de Ventas Mensuales</CardTitle><CardDescription>Ingresos generados mes a mes en el último año.</CardDescription></CardHeader>
                                        <CardContent><ResponsiveContainer width="100%" height={300}><LineChart data={charts.salesTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis tickFormatter={(value) => `$${(value as number / 1000)}k`} /><Tooltip formatter={(value: number) => money(value)} /><Line type="monotone" dataKey="value" name="Ingresos" stroke="hsl(var(--primary))" /></LineChart></ResponsiveContainer></CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader><CardTitle>Ventas por Día (Últimos 90 días)</CardTitle><CardDescription>Ingresos generados día a día.</CardDescription></CardHeader>
                                        <CardContent>
                                            <ResponsiveContainer width="100%" height={300}>
                                                <AreaChart data={charts.salesByDay}>
                                                    <defs>
                                                        <linearGradient id="colorSalesDay" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
                                                            <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                                    <YAxis tickFormatter={(value) => `$${(value as number / 1000)}k`} fontSize={12} tickLine={false} axisLine={false} />
                                                    <Tooltip formatter={(value: number) => money(value)} />
                                                    <Area type="monotone" dataKey="value" name="Ingresos" stroke="hsl(var(--chart-2))" fillOpacity={1} fill="url(#colorSalesDay)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader><CardTitle>Ingresos por Compañía (Histórico)</CardTitle><CardDescription>Distribución de los ingresos entre las diferentes compañías.</CardDescription></CardHeader>
                                        <CardContent>
                                            <ResponsiveContainer width="100%" height={300}>
                                                <PieChart>
                                                    <Tooltip formatter={(value: number) => money(value)} />
                                                    <Pie data={charts.salesByCompany} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label>
                                                        {charts.salesByCompany?.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                                    </Pie>
                                                    <Legend />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader><CardTitle>Pedidos del Día por Compañía</CardTitle><CardDescription>Distribución de transacciones de hoy por compañía.</CardDescription></CardHeader>
                                        <CardContent>
                                            {charts.ordersByCompanyToday && charts.ordersByCompanyToday.length > 0 ? (
                                                <ResponsiveContainer width="100%" height={300}>
                                                    <PieChart>
                                                        <Tooltip formatter={(value: number) => `${value} pedidos`} />
                                                        <Pie data={charts.ordersByCompanyToday} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label>
                                                            {charts.ordersByCompanyToday.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                                        </Pie>
                                                        <Legend/>
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="flex h-[300px] items-center justify-center text-center text-muted-foreground">
                                                    <div className="space-y-2">
                                                        <PieChartIcon className="mx-auto h-10 w-10" />
                                                        <p>No hay datos de pedidos para el día de hoy.</p>
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                    <Card className="md:col-span-2">
                                        <CardHeader>
                                            <CardTitle>Análisis Pareto (80/20) - Productos Más Vendidos</CardTitle>
                                            <CardDescription>Los 10 productos con más ingresos y su contribución acumulada al total.</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <ResponsiveContainer width="100%" height={400}>
                                                <ComposedChart
                                                    data={charts.topProducts}
                                                    margin={{ top: 5, right: 30, bottom: 120, left: 30 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="name" angle={-60} textAnchor="end" height={130} interval={0} tick={{ fontSize: 12 }} />
                                                    <YAxis yAxisId="left" orientation="left" tickFormatter={(value) => `$${(value as number / 1000)}k`} />
                                                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(value) => `${Math.round(value as number)}%`} />
                                                    <Tooltip formatter={(value: number, name: string) => {
                                                        if (name === 'Ingresos') return money(value);
                                                        if (name === 'Acumulado') return `${(value as number).toFixed(1)}%`;
                                                        return value;
                                                    }} />
                                                    <Legend verticalAlign="top" />
                                                    <Bar dataKey="value" name="Ingresos" yAxisId="left" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                                    <Line type="monotone" dataKey="cumulative" name="Acumulado" yAxisId="right" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                                </ComposedChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                </div>

                                <Card>
                                    <CardHeader><CardTitle>Historial de Ventas Detallado</CardTitle><CardDescription>Mostrando las últimas ventas registradas con toda la información disponible.</CardDescription></CardHeader>
                                    <CardContent>
                                        <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead># Venta</TableHead>
                                                <TableHead>Fecha Venta</TableHead>
                                                <TableHead>Total</TableHead>
                                                <TableHead>Estado</TableHead>
                                                <TableHead>Desc. Estado</TableHead>
                                                <TableHead>Título</TableHead>
                                                <TableHead>SKU</TableHead>
                                                <TableHead>Item ID</TableHead>
                                                <TableHead>Compañía</TableHead>
                                                <TableHead>Comprador</TableHead>
                                                <TableHead>Unidades</TableHead>
                                                <TableHead>Precio</TableHead>
                                                <TableHead>Ingreso Productos</TableHead>
                                                <TableHead>Impuestos</TableHead>
                                                <TableHead>Ingreso Envío</TableHead>
                                                <TableHead>Costo Envío</TableHead>
                                                <TableHead>Costo Medidas Peso</TableHead>
                                                <TableHead>Cargo Diferencia Peso</TableHead>
                                                <TableHead>Anulaciones/Reembolsos</TableHead>
                                                <TableHead>Venta Publicidad</TableHead>
                                                <TableHead>Es Paquete Varios</TableHead>
                                                <TableHead>Pertenece a Kit</TableHead>
                                                <TableHead>Variante</TableHead>
                                                <TableHead>Tipo Publicación</TableHead>
                                                <TableHead>Factura Adjunta</TableHead>
                                                <TableHead>Datos Empresa</TableHead>
                                                <TableHead>Tipo Núm. Doc.</TableHead>
                                                <TableHead>Dirección Fiscal</TableHead>
                                                <TableHead>Tipo Contribuyente</TableHead>
                                                <TableHead>CFDI</TableHead>
                                                <TableHead>Tipo Usuario</TableHead>
                                                <TableHead>Régimen Fiscal</TableHead>
                                                <TableHead>Negocio</TableHead>
                                                <TableHead>IFE</TableHead>
                                                <TableHead>Domicilio Entrega</TableHead>
                                                <TableHead>Municipio/Alcaldía</TableHead>
                                                <TableHead>Estado Comprador</TableHead>
                                                <TableHead>Código Postal</TableHead>
                                                <TableHead>País</TableHead>
                                                <TableHead>Forma Entrega Envío</TableHead>
                                                <TableHead>Fecha en Camino Envío</TableHead>
                                                <TableHead>Fecha Entregado Envío</TableHead>
                                                <TableHead>Transportista Envío</TableHead>
                                                <TableHead># Seguimiento Envío</TableHead>
                                                <TableHead>URL Seguimiento Envío</TableHead>
                                                <TableHead>Unidades Envío</TableHead>
                                                <TableHead>Forma Entrega</TableHead>
                                                <TableHead>Fecha en Camino</TableHead>
                                                <TableHead>Fecha Entregado</TableHead>
                                                <TableHead>Transportista</TableHead>
                                                <TableHead># Seguimiento</TableHead>
                                                <TableHead>URL Seguimiento</TableHead>
                                                <TableHead>Revisado por ML</TableHead>
                                                <TableHead>Fecha Revisión</TableHead>
                                                <TableHead>Dinero a Favor</TableHead>
                                                <TableHead>Resultado</TableHead>
                                                <TableHead>Destino</TableHead>
                                                <TableHead>Motivo Resultado</TableHead>
                                                <TableHead>Unidades Reclamo</TableHead>
                                                <TableHead>Reclamo Abierto</TableHead>
                                                <TableHead>Reclamo Cerrado</TableHead>
                                                <TableHead>Con Mediación</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedSales.map((v) => (
                                                <TableRow key={v.id}>
                                                    <TableCell className="font-mono text-xs whitespace-nowrap">{formatText(v.numero_venta)}</TableCell>
                                                    <TableCell className="whitespace-nowrap">{formatDate(v.fecha_venta)}</TableCell>
                                                    <TableCell className="text-right font-bold whitespace-nowrap">{money(v.total)}</TableCell>
                                                    <TableCell><Badge variant={v.estado === 'delivered' ? 'secondary' : 'outline'} className="capitalize whitespace-nowrap">{formatText(v.estado)}</Badge></TableCell>
                                                    <TableCell className="max-w-[200px] truncate whitespace-nowrap">{formatText(v.descripcion_estado)}</TableCell>
                                                    <TableCell className="max-w-[200px] truncate whitespace-nowrap" title={formatText(v.title)}>{formatText(v.title)}</TableCell>
                                                    <TableCell className="font-mono text-xs whitespace-nowrap">{formatText(v.sku)}</TableCell>
                                                    <TableCell className="font-mono text-xs whitespace-nowrap">{formatText(v.item_id)}</TableCell>
                                                    <TableCell className="whitespace-nowrap">{formatText(v.company)}</TableCell>
                                                    <TableCell className="whitespace-nowrap">{formatText(v.comprador)}</TableCell>
                                                    <TableCell className="text-center">{v.unidades}</TableCell>
                                                    <TableCell className="text-right whitespace-nowrap">{money(v.price)}</TableCell>
                                                    <TableCell className="text-right whitespace-nowrap">{money(v.ingreso_productos)}</TableCell>
                                                    <TableCell className="text-right whitespace-nowrap">{money(v.cargo_venta_impuestos)}</TableCell>
                                                    <TableCell className="text-right whitespace-nowrap">{money(v.ingreso_envio)}</TableCell>
                                                    <TableCell className="text-right whitespace-nowrap">{money(v.costo_envio)}</TableCell>
                                                    <TableCell className="text-right whitespace-nowrap">{money(v.costo_medidas_peso)}</TableCell>
                                                    <TableCell className="text-right whitespace-nowrap">{money(v.cargo_diferencia_peso)}</TableCell>
                                                    <TableCell className="text-right whitespace-nowrap">{money(v.anulaciones_reembolsos)}</TableCell>
                                                    <TableCell>{formatBoolean(v.venta_publicidad)}</TableCell>
                                                    <TableCell>{formatText(v.es_paquete_varios)}</TableCell>
                                                    <TableCell>{formatText(v.pertenece_kit)}</TableCell>
                                                    <TableCell className="whitespace-nowrap">{formatText(v.variante)}</TableCell>
                                                    <TableCell className="whitespace-nowrap">{formatText(v.tipo_publicacion)}</TableCell>
                                                    <TableCell>{formatText(v.factura_adjunta)}</TableCell>
                                                    <TableCell>{formatText(v.datos_personales_empresa)}</TableCell>
                                                    <TableCell>{formatText(v.tipo_numero_documento)}</TableCell>
                                                    <TableCell className="max-w-[200px] truncate whitespace-nowrap">{formatText(v.direccion_fiscal)}</TableCell>
                                                    <TableCell>{formatText(v.tipo_contribuyente)}</TableCell>
                                                    <TableCell>{formatText(v.cfdi)}</TableCell>
                                                    <TableCell>{formatText(v.tipo_usuario)}</TableCell>
                                                    <TableCell>{formatText(v.regimen_fiscal)}</TableCell>
                                                    <TableCell>{formatText(v.negocio)}</TableCell>
                                                    <TableCell>{formatText(v.ife)}</TableCell>
                                                    <TableCell className="max-w-[200px] truncate whitespace-nowrap">{formatText(v.domicilio_entrega)}</TableCell>
                                                    <TableCell>{formatText(v.municipio_alcaldia)}</TableCell>
                                                    <TableCell>{formatText(v.estado_comprador)}</TableCell>
                                                    <TableCell>{formatText(v.codigo_postal)}</TableCell>
                                                    <TableCell>{formatText(v.pais)}</TableCell>
                                                    <TableCell>{formatText(v.forma_entrega_envio)}</TableCell>
                                                    <TableCell className="whitespace-nowrap">{formatDate(v.fecha_en_camino_envio)}</TableCell>
                                                    <TableCell className="whitespace-nowrap">{formatDate(v.fecha_entregado_envio)}</TableCell>
                                                    <TableCell>{formatText(v.transportista_envio)}</TableCell>
                                                    <TableCell>{formatText(v.numero_seguimiento_envio)}</TableCell>
                                                    <TableCell className="max-w-[150px] truncate whitespace-nowrap">{formatText(v.url_seguimiento_envio)}</TableCell>
                                                    <TableCell className="text-center">{v.unidades_envio}</TableCell>
                                                    <TableCell>{formatText(v.forma_entrega)}</TableCell>
                                                    <TableCell className="whitespace-nowrap">{formatDate(v.fecha_en_camino)}</TableCell>
                                                    <TableCell className="whitespace-nowrap">{formatDate(v.fecha_entregado)}</TableCell>
                                                    <TableCell>{formatText(v.transportista)}</TableCell>
                                                    <TableCell>{formatText(v.numero_seguimiento)}</TableCell>
                                                    <TableCell className="max-w-[150px] truncate whitespace-nowrap">{formatText(v.url_seguimiento)}</TableCell>
                                                    <TableCell>{formatBoolean(v.revisado_por_ml)}</TableCell>
                                                    <TableCell className="whitespace-nowrap">{formatDate(v.fecha_revision)}</TableCell>
                                                    <TableCell className="text-right whitespace-nowrap">{money(v.dinero_a_favor)}</TableCell>
                                                    <TableCell>{formatText(v.resultado)}</TableCell>
                                                    <TableCell>{formatText(v.destino)}</TableCell>
                                                    <TableCell>{formatText(v.motivo_resultado)}</TableCell>
                                                    <TableCell className="text-center">{v.unidades_reclamo}</TableCell>
                                                    <TableCell>{formatText(v.reclamo_abierto)}</TableCell>
                                                    <TableCell>{formatText(v.reclamo_cerrado)}</TableCell>
                                                    <TableCell>{formatText(v.con_mediacion)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                        </Table>
                                    </CardContent>
                                    {totalPages > 1 && (<CardFooter><div className="flex w-full items-center justify-between text-xs text-muted-foreground"><div>Página {currentPage} de {totalPages}</div><div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</Button><Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Siguiente</Button></div></div></CardFooter>)}
                                </Card>
                            </div>
                        )}
                    </TabsContent>
                    
                    <TabsContent value="inventory" className="mt-6">
                         <div className="w-full space-y-6">
                            {inventoryData.error ? (
                                <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error al cargar datos de inventario</AlertTitle><AlertDescription>{inventoryData.error}</AlertDescription></Alert>
                            ) : (
                            <>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Categorías Madre</CardTitle>
                                    <Package className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                    <div className="text-2xl font-bold">{inventoryKpis.totalCategorias}</div>
                                    <p className="text-xs text-muted-foreground">Total de categorías principales</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">SKUs Únicos</CardTitle>
                                    <Layers className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                    <div className="text-2xl font-bold">{inventoryKpis.totalSkus}</div>
                                    <p className="text-xs text-muted-foreground">Total de SKUs únicos registrados</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Mapeos SKU-Publicación</CardTitle>
                                    <FileCode className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                    <div className="text-2xl font-bold">{inventoryKpis.totalMapeos}</div>
                                    <p className="text-xs text-muted-foreground">Relaciones entre SKU y publicación</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Costo de Aterrizaje Promedio</CardTitle>
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                    <div className="text-2xl font-bold">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(inventoryKpis.avgLandedCost)}</div>
                                    <p className="text-xs text-muted-foreground">Costo promedio por categoría madre</p>
                                    </CardContent>
                                </Card>
                                </div>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <Card>
                                    <CardHeader>
                                        <CardTitle>Top 5 Proveedores por # de SKUs</CardTitle>
                                        <CardDescription>Proveedores con la mayor cantidad de SKUs asociados en &quot;Categorías Madre&quot;.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={topProveedores} layout="vertical" margin={{ left: 100, right: 30 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" allowDecimals={false} />
                                            <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} />
                                            <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
                                            <Legend />
                                            <Bar dataKey="count" name="# de SKUs" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                    </Card>
                                    
                                    <Tabs defaultValue="categorias" className="lg:col-span-1 w-full">
                                    <TabsList className="grid w-full grid-cols-3">
                                        <TabsTrigger value="categorias">Categorías Madre</TabsTrigger>
                                        <TabsTrigger value="skus_unicos">SKUs Únicos</TabsTrigger>
                                        <TabsTrigger value="skuxpublicaciones">Mapeo SKU-Pub</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="categorias">
                                        <Card>
                                        <CardHeader><CardTitle>Categorías Madre</CardTitle><CardDescription>Información logística por categoría.</CardDescription></CardHeader>
                                        <CardContent><Table><TableHeader><TableRow>
                                            <TableHead>SKU</TableHead>
                                            <TableHead>Título</TableHead>
                                            <TableHead>Proveedor</TableHead>
                                            <TableHead className="text-right">Landed Cost</TableHead>
                                            <TableHead className="text-center">T. Prep (días)</TableHead>
                                            <TableHead className="text-center">T. Recompra (días)</TableHead>
                                            <TableHead className="text-center">Pzs/SKU</TableHead>
                                            <TableHead className="text-center">Pzs/Cont.</TableHead>
                                            <TableHead>Bodega</TableHead>
                                            <TableHead>Bloque</TableHead>
                                        </TableRow></TableHeader><TableBody>{paginatedCategorias.map((cat) => (<TableRow key={cat.sku}><TableCell className="font-mono">{cat.sku}</TableCell><TableCell className="max-w-[200px] truncate" title={cat.title}>{cat.title || 'N/A'}</TableCell><TableCell>{cat.proveedor || 'N/A'}</TableCell><TableCell className="text-right font-medium">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cat.landed_cost || 0)}</TableCell><TableCell className="text-center">{cat.tiempo_preparacion ?? 'N/A'}</TableCell><TableCell className="text-center">{cat.tiempo_recompra ?? 'N/A'}</TableCell><TableCell className="text-center">{cat.piezas_por_sku ?? 'N/A'}</TableCell><TableCell className="text-center">{cat.piezas_por_contenedor ?? 'N/A'}</TableCell><TableCell>{cat.bodega || 'N/A'}</TableCell><TableCell>{cat.bloque || 'N/A'}</TableCell></TableRow>))}</TableBody></Table></CardContent>
                                        {totalPagesCategorias > 1 && renderInventoryPagination(pageCategorias, totalPagesCategorias, setPageCategorias)}
                                        </Card>
                                    </TabsContent>
                                    <TabsContent value="skus_unicos">
                                        <Card>
                                            <CardHeader><CardTitle>SKUs Únicos</CardTitle><CardDescription>Información detallada de cada SKU.</CardDescription></CardHeader>
                                            <CardContent><Table><TableHeader><TableRow>
                                            <TableHead>SKU</TableHead>
                                            <TableHead>Categoría</TableHead>
                                            <TableHead>Proveedor</TableHead>
                                            <TableHead className="text-right">Landed Cost</TableHead>
                                            <TableHead className="text-center">T. Prep (días)</TableHead>
                                            <TableHead className="text-center">T. Recompra (días)</TableHead>
                                            <TableHead className="text-center">Pzs/Cont.</TableHead>
                                            </TableRow></TableHeader><TableBody>{paginatedSkus.map((sku) => (<TableRow key={sku.sku}><TableCell className="font-mono">{sku.sku}</TableCell><TableCell>{sku.nombre_madre || 'N/A'}</TableCell><TableCell>{sku.proveedor || 'N/A'}</TableCell><TableCell className="text-right font-medium">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(sku.landed_cost || 0)}</TableCell><TableCell className="text-center">{sku.tiempo_de_preparacion ?? 'N/A'}</TableCell><TableCell className="text-center">{sku.de_recompra ?? 'N/A'}</TableCell><TableCell className="text-center">{sku.piezas_por_contenedor ?? 'N/A'}</TableCell></TableRow>))}</TableBody></Table></CardContent>
                                            {totalPagesSkus > 1 && renderInventoryPagination(pageSkus, totalPagesSkus, setPageSkus)}
                                        </Card>
                                    </TabsContent>
                                    <TabsContent value="skuxpublicaciones">
                                        <Card>
                                            <CardHeader><CardTitle>SKUxPublicaciones</CardTitle><CardDescription>Relación entre SKUs y publicaciones.</CardDescription></CardHeader>
                                            <CardContent><Table><TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>ID de Publicación</TableHead><TableHead>Categoría Madre</TableHead></TableRow></TableHeader><TableBody>{paginatedSkuPub.map((item, index) => (<TableRow key={`${item.sku}-${item.item_id}-${index}`}><TableCell className="font-mono">{item.sku}</TableCell><TableCell className="font-mono text-muted-foreground">{item.item_id}</TableCell><TableCell className="font-medium">{item.nombre_madre}</TableCell></TableRow>))}</TableBody></Table></CardContent>
                                            {totalPagesSkuPub > 1 && renderInventoryPagination(pageSkuPub, totalPagesSkuPub, setPageSkuPub)}
                                        </Card>
                                    </TabsContent>
                                    </Tabs>
                                </div>
                            </>
                            )}
                        </div>
                    </TabsContent>
                    
                    <TabsContent value="products" className="mt-6">
                        <div className="w-full space-y-8">
                            {productsData.error ? (
                                <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error al cargar datos de publicaciones</AlertTitle><AlertDescription>{productsData.error}</AlertDescription></Alert>
                            ) : (
                            <>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Publicaciones</CardTitle><ClipboardList className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{productsKpis.totalPublications}</div></CardContent></Card>
                                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">SKUs con Publicación</CardTitle><Layers className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{productsKpis.totalSkuWithPublications}</div></CardContent></Card>
                                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Categorías Madre</CardTitle><Tag className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{productsKpis.totalMotherCatalogs}</div></CardContent></Card>
                                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Precio Promedio</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(productsKpis.averagePrice)}</div></CardContent></Card>
                                </div>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <Card>
                                    <CardHeader><CardTitle>Publicaciones por Estado</CardTitle><CardDescription>Distribución de las publicaciones según su estado actual.</CardDescription></CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={statusChartData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" />
                                            <YAxis allowDecimals={false} />
                                            <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
                                            <Bar dataKey="count" name="# de Publicaciones" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                    </Card>
                                    <Card>
                                    <CardHeader><CardTitle>Conteo de Publicaciones por SKU</CardTitle><CardDescription>SKUs con mayor cantidad de publicaciones. (Top 10)</CardDescription></CardHeader>
                                    <CardContent><Table><TableHeader><TableRow>
                                        <TableHead>SKU</TableHead>
                                        <TableHead>Título de Ejemplo</TableHead>
                                        <TableHead className="text-right"># Publicaciones</TableHead>
                                    </TableRow></TableHeader><TableBody>{skuCounts.slice(0, 10).map((item, index) => (<TableRow key={`${item.sku}-${index}`}><TableCell className="font-mono text-primary">{item.sku}</TableCell><TableCell className="max-w-xs truncate">{item.publication_title}</TableCell><TableCell className="text-right font-medium">{item.publicaciones}</TableCell></TableRow>))}</TableBody></Table></CardContent>
                                    </Card>
                                </div>

                                <div className="space-y-8">
                                <Card><CardHeader><CardTitle>Publicaciones Recientes</CardTitle><CardDescription>Últimas publicaciones añadidas.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>ITEM_ID</TableHead>
                                    <TableHead>Título</TableHead>
                                    <TableHead>Compañía</TableHead>
                                    <TableHead>Categoría Madre</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Precio</TableHead>
                                    <TableHead>Fecha Creación</TableHead>
                                </TableRow></TableHeader><TableBody>{paginatedPubs.map(pub => (<TableRow key={pub.item_id}>
                                    <TableCell className="font-mono">{pub.sku ?? 'N/A'}</TableCell>
                                    <TableCell className="font-mono">{pub.item_id}</TableCell>
                                    <TableCell className="max-w-sm truncate" title={pub.title ?? ''}>{pub.title}</TableCell>
                                    <TableCell>{pub.company ?? 'N/A'}</TableCell>
                                    <TableCell>{pub.nombre_madre ?? 'N/A'}</TableCell>
                                    <TableCell><Badge variant={pub.status === 'active' ? 'secondary' : 'outline'}>{pub.status}</Badge></TableCell>
                                    <TableCell className="text-right font-semibold">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(pub.price ?? 0)}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{pub.created_at ? format(new Date(pub.created_at), 'dd MMM yyyy', { locale: es }) : 'N/A'}</TableCell>
                                </TableRow>))}</TableBody></Table></CardContent>{totalPagesPubs > 1 && renderProductsPagination(productPages.pubs, totalPagesPubs, (p) => setProductPages(prev => ({...prev, pubs: p})))}</Card>
                                <Card><CardHeader><CardTitle>Mapeo SKU a Producto Madre</CardTitle><CardDescription>Relación entre SKUs, publicaciones y categoría madre.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>ID Publicación</TableHead><TableHead>Categoría Madre</TableHead></TableRow></TableHeader><TableBody>{paginatedMap.map((item, index) => (<TableRow key={`${item.sku}-${item.item_id}-${index}`}><TableCell className="font-mono">{item.sku ?? 'N/A'}</TableCell><TableCell className="font-mono">{item.item_id}</TableCell><TableCell>{item.nombre_madre ?? 'N/A'}</TableCell></TableRow>))}</TableBody></Table></CardContent>{totalPagesMap > 1 && renderProductsPagination(productPages.map, totalPagesMap, (p) => setProductPages(prev => ({...prev, map: p})))}</Card>
                                <Card><CardHeader><CardTitle>Catálogo de Productos Madre</CardTitle><CardDescription>Listado maestro de categorías principales.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Categoría Madre</TableHead></TableRow></TableHeader><TableBody>{paginatedCatalog.map((item, index) => (<TableRow key={`${item.sku}-${index}`}><TableCell className="font-mono">{item.sku ?? 'N/A'}</TableCell><TableCell>{item.nombre_madre}</TableCell></TableRow>))}</TableBody></Table></CardContent>{totalPagesCatalog > 1 && renderProductsPagination(productPages.catalog, totalPagesCatalog, (p) => setProductPages(prev => ({...prev, catalog: p})))}</Card>
                                </div>
                            </>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
                </div>
            </main>
        </>
    );
}
