'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, DollarSign, Filter, LogOut, Loader2, ShoppingCart, AlertTriangle, TrendingUp, Package, Users } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import GlobalNav from '@/components/global-nav';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useToast } from '@/hooks/use-toast';
import type { Sale, ChartData } from './page';

type KpiType = {
    totalRevenue?: number;
    totalSales?: number;
    avgSale?: number;
    topProductName?: string;
    topProductRevenue?: number;
}

type ChartDataType = {
    topProducts?: ChartData[];
    salesByCompany?: ChartData[];
    salesTrend?: ChartData[];
}

const PAGE_SIZE = 10;
const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function SalesDashboardClient({ sales, kpis, charts }: { sales: Sale[], kpis: KpiType, charts: ChartDataType }) {
    const { toast } = useToast();
    const [currentPage, setCurrentPage] = React.useState(1);
    const [date, setDate] = React.useState<DateRange | undefined>(undefined);
    
    React.useEffect(() => {
        if (sales.length > 0) {
            const dates = sales.map(s => new Date(s.fecha_venta)).filter(d => !isNaN(d.getTime()));
            if (dates.length > 0) {
                const maxDate = new Date(Math.max.apply(null, dates as any));
                const minDate = new Date(Math.min.apply(null, dates as any));
                setDate({ from: minDate, to: maxDate });
            }
        }
    }, [sales]);
    
    const handleApplyFilters = () => {
        toast({
            title: "Función no implementada",
            description: "El filtrado dinámico se añadirá en una futura actualización.",
        });
        setCurrentPage(1);
    };
    
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
        return String(b); // Return original string if not a clear boolean
    }
    const formatText = (t: string | null | undefined) => t || 'N/A';

    const totalPages = Math.ceil(sales.length / PAGE_SIZE);
    const paginatedSales = sales.slice(
      (currentPage - 1) * PAGE_SIZE,
      currentPage * PAGE_SIZE
    );

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
                <div className="flex items-center gap-4">
                  <Link href="/historical-analysis" passHref><Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /><span className="sr-only">Volver</span></Button></Link>
                  <h1 className="text-xl font-bold tracking-tight">Dashboard de Ventas</h1>
                </div>
                 <div className="flex items-center gap-4">
                    <Link href="/historical-analysis" passHref><Button><BarChart3 className="mr-2 h-4 w-4" />Análisis de Históricos</Button></Link>
                    <GlobalNav />
                    <Button variant="outline"><LogOut className="mr-2 h-4 w-4" />Cerrar Sesión</Button>
                </div>
            </header>

            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
                {!sales || sales.length === 0 ? (
                     <Alert variant="destructive" className="w-full">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>No se Encontraron Datos de Ventas</AlertTitle>
                        <AlertDescription>No se pudieron obtener datos de la tabla 'ventas'. Revisa la conexión con Supabase y asegúrate de que la tabla contenga registros.</AlertDescription>
                    </Alert>
                ) : (
                    <>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{money(kpis.totalRevenue)}</div><p className="text-xs text-muted-foreground">Últimos 12 meses</p></CardContent></Card>
                            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ventas Totales</CardTitle><ShoppingCart className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{kpis.totalSales?.toLocaleString('es-MX')}</div><p className="text-xs text-muted-foreground"># de transacciones</p></CardContent></Card>
                            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Venta Promedio</CardTitle><BarChart3 className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{money(kpis.avgSale)}</div><p className="text-xs text-muted-foreground">Valor medio por transacción</p></CardContent></Card>
                            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Producto Estrella</CardTitle><Package className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold truncate" title={kpis.topProductName}>{kpis.topProductName}</div><p className="text-xs text-muted-foreground">Ingresos: {money(kpis.topProductRevenue)}</p></CardContent></Card>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader><CardTitle>Tendencia de Ventas Mensuales</CardTitle><CardDescription>Ingresos generados mes a mes en el último año.</CardDescription></CardHeader>
                                <CardContent><ResponsiveContainer width="100%" height={300}><LineChart data={charts.salesTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis tickFormatter={(value) => `$${(value as number / 1000)}k`} /><Tooltip formatter={(value: number) => money(value)} /><Line type="monotone" dataKey="value" name="Ingresos" stroke="hsl(var(--primary))" /></LineChart></ResponsiveContainer></CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle>Ingresos por Compañía</CardTitle><CardDescription>Distribución de los ingresos entre las diferentes compañías.</CardDescription></CardHeader>
                                <CardContent><ResponsiveContainer width="100%" height={300}><PieChart><Tooltip formatter={(value: number) => money(value)} /><Pie data={charts.salesByCompany} dataKey="value" nameKey="name" innerRadius={60} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>{charts.salesByCompany?.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Legend/></PieChart></ResponsiveContainer></CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader><CardTitle>Top 10 Productos por Ingresos (Pareto)</CardTitle><CardDescription>Los productos que generan la mayor parte de tus ingresos.</CardDescription></CardHeader>
                            <CardContent><ResponsiveContainer width="100%" height={400}><BarChart data={charts.topProducts} layout="vertical" margin={{ left: 100 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" tickFormatter={(value) => `$${(value as number / 1000)}k`} /><YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} /><Tooltip formatter={(value: number) => money(value)} /><Bar dataKey="value" name="Ingresos" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}/></BarChart></ResponsiveContainer></CardContent>
                        </Card>

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
                                        <TableHead>ID</TableHead>
                                        <TableHead>Created At</TableHead>
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
                                              <TableCell>{v.id}</TableCell>
                                              <TableCell className="whitespace-nowrap">{formatDate(v.created_at)}</TableCell>
                                          </TableRow>
                                      ))}
                                  </TableBody>
                                </Table>
                            </CardContent>
                            {totalPages > 1 && (<CardFooter><div className="flex w-full items-center justify-between text-xs text-muted-foreground"><div>Página {currentPage} de {totalPages}</div><div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</Button><Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Siguiente</Button></div></div></CardFooter>)}
                        </Card>
                    </>
                )}
            </main>
        </div>
    );
}
