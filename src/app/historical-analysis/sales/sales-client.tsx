'use client';

import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft, BarChart3, DollarSign, Filter, LogOut, Loader2, ShoppingCart, AlertTriangle } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import GlobalNav from '@/components/global-nav';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useToast } from '@/hooks/use-toast';
import type { ventas as VentasType } from '@/types/database';

type KpiType = {
    totalRevenue: number;
    totalSales: number;
    avgSale: number;
}

// Define a specific type for the data used in this component to resolve type errors
type SaleDisplayRecord = Pick<VentasType,
  'total' |
  'fecha_venta' |
  'numero_venta' |
  'title' |
  'unidades' |
  'estado' |
  'descripcion_estado' |
  'comprador'
>;

export default function SalesAnalysisPage() {
    const { toast } = useToast();
    const [sales, setSales] = React.useState<SaleDisplayRecord[]>([]);
    const [kpis, setKpis] = React.useState<KpiType>({ totalRevenue: 0, totalSales: 0, avgSale: 0 });
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    const [date, setDate] = React.useState<DateRange | undefined>({
        from: subDays(new Date(), 29),
        to: new Date(),
    });

    React.useEffect(() => {
        const fetchSalesData = async () => {
            setLoading(true);
            setError(null);

            if (!supabase) {
                setError("El cliente de Supabase no está configurado. Revisa tus variables de entorno en el archivo .env.");
                setLoading(false);
                return;
            }

            // Corrected select to fetch 'title' instead of 'titulo_publicacion' to match VentasType
            const { data, error: fetchError } = await supabase
                .from('ventas')
                .select('total, fecha_venta, numero_venta, title, unidades, estado, descripcion_estado, comprador')
                .order('fecha_venta', { ascending: false })
                .limit(100);

            if (fetchError) {
                console.error("Error fetching sales data:", fetchError);
                setError(fetchError.message);
                setSales([]);
                setKpis({ totalRevenue: 0, totalSales: 0, avgSale: 0 });
            } else {
                // Corrected type assertion to use the specific SaleDisplayRecord type
                const fetchedSales = (data || []) as SaleDisplayRecord[];
                setSales(fetchedSales);
                
                const totalRevenue = fetchedSales.reduce((acc, sale) => acc + (sale.total || 0), 0);
                const totalSales = fetchedSales.length;
                const avgSale = totalSales > 0 ? totalRevenue / totalSales : 0;
                setKpis({ totalRevenue, totalSales, avgSale });
            }
            setLoading(false);
        };

        fetchSalesData();
    }, []);
    
    const handleApplyFilters = () => {
        toast({
            title: "Función no implementada",
            description: "La aplicación de filtros se añadirá en una futura actualización.",
        });
    };
    
    const safeDate = (d?: string | null) => d ? format(new Date(d), 'dd MMM yyyy', { locale: es }) : '—';
    const money = (v?: number | null) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v || 0);

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
                <div className="flex items-center gap-4">
                  <Link href="/historical-analysis" passHref>
                    <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /><span className="sr-only">Volver</span></Button>
                  </Link>
                  <h1 className="text-xl font-bold tracking-tight">Análisis de Ventas</h1>
                </div>
                 <div className="flex items-center gap-4">
                    <Link href="/historical-analysis" passHref>
                        <Button>
                            <BarChart3 className="mr-2 h-4 w-4" />
                            Análisis de Históricos
                        </Button>
                    </Link>
                    <GlobalNav />
                    <Button variant="outline">
                        <LogOut className="mr-2 h-4 w-4" />
                        Cerrar Sesión
                    </Button>
                </div>
            </header>

            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
                {error && (
                     <Alert variant="destructive" className="w-full">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Error al Cargar Datos de Ventas</AlertTitle>
                        <AlertDescription>
                            No se pudieron obtener los datos. Revisa tu conexión y la configuración de Supabase en el archivo <code>.env</code>.
                            <p className="mt-2 font-mono text-xs bg-destructive/20 p-2 rounded">Error: {error}</p>
                        </AlertDescription>
                    </Alert>
                )}

                <Card>
                    <CardHeader className="flex flex-row items-center gap-4">
                        <Filter className="h-6 w-6 text-muted-foreground" />
                        <div>
                            <CardTitle>Filtros</CardTitle>
                            <CardDescription>Filtra por período para refinar el análisis. (Función en desarrollo)</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <DateRangePicker date={date} onSelect={setDate} />
                        </div>
                        <div className="mt-4 flex justify-end">
                            <Button onClick={handleApplyFilters}>
                                <Filter className="mr-2 h-4 w-4" />
                                Aplicar Filtros
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{money(kpis.totalRevenue)}</div>
                          <p className="text-xs text-muted-foreground">Basado en las últimas 100 ventas.</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
                          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{kpis.totalSales}</div>
                          <p className="text-xs text-muted-foreground">Conteo de las últimas 100 transacciones.</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Venta Promedio</CardTitle>
                          <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{money(kpis.avgSale)}</div>
                          <p className="text-xs text-muted-foreground">Valor medio por transacción.</p>
                        </CardContent>
                    </Card>
                </div>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Historial de Ventas Recientes</CardTitle>
                        <CardDescription>Mostrando las últimas ventas registradas.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         {loading ? (
                            <div className="flex justify-center items-center h-40">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                         ) : sales.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Publicación</TableHead>
                                        <TableHead>Comprador</TableHead>
                                        <TableHead className="text-center">Unidades</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sales.map((v, index) => (
                                        <TableRow key={v.numero_venta || index}>
                                            <TableCell className="text-sm text-muted-foreground">{safeDate(v.fecha_venta)}</TableCell>
                                            <TableCell className="font-medium max-w-xs truncate" title={v.title || ''}>{v.title || 'N/A'}</TableCell>
                                            <TableCell>{v.comprador || 'N/A'}</TableCell>
                                            <TableCell className="text-center">{v.unidades}</TableCell>
                                            <TableCell><Badge variant={v.estado === 'delivered' ? 'secondary' : 'outline'} className="capitalize">{v.descripcion_estado || v.estado || 'N/A'}</Badge></TableCell>
                                            <TableCell className="text-right font-bold">{money(v.total)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                         ) : !error && (
                            <div className="text-center text-muted-foreground py-8">
                                No se encontraron ventas para el período seleccionado.
                            </div>
                         )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
