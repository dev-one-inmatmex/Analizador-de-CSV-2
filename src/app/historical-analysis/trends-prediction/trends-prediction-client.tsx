'use client';

import { BrainCircuit, TrendingUp, Filter, LineChart as LineChartIcon, Bot, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { Area, AreaChart, Bar, BarChart as RechartsBarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, Pie, PieChart, Cell } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { SalesPredictionOutput } from '@/ai/schemas/sales-prediction-schemas';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { ChartData, RecentSale } from './page';

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];
const SALES_PAGE_SIZE = 10;

type TrendsPredictionClientProps = {
  salesHistory: { date: string, ventas: number }[];
  predictionResult: SalesPredictionOutput | null;
  salesByCompany: ChartData[];
  recentSales: RecentSale[];
};

export default function TrendsPredictionClient({ salesHistory, predictionResult, salesByCompany, recentSales }: TrendsPredictionClientProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [salesPage, setSalesPage] = React.useState(1);

  const handleGeneratePrediction = () => {
    setIsRefreshing(true);
    router.refresh();
  };
  
  React.useEffect(() => {
    setIsRefreshing(false);
  }, [salesHistory, predictionResult, salesByCompany, recentSales]);

  const chartData = React.useMemo(() => {
    if (!predictionResult) return salesHistory.map(h => ({ ...h, prediccion: undefined }));

    const historyWithSalesKey = salesHistory.map(h => ({ date: h.date, ventas: h.ventas, prediccion: undefined as number | undefined }));
    const lastHistoryPoint = historyWithSalesKey[historyWithSalesKey.length - 1];

    const predictionWithJunction = [
        ...(lastHistoryPoint ? [{ date: lastHistoryPoint.date, prediction: lastHistoryPoint.ventas }] : []),
        ...predictionResult.salesPrediction
    ];
    
    const predictionPoints = predictionWithJunction.map(p => ({ date: p.date, prediccion: p.prediction, ventas: undefined as number | undefined }));

    const mergedData = [...historyWithSalesKey];
    predictionPoints.forEach(pPoint => {
        const existingIndex = mergedData.findIndex(hPoint => hPoint.date === pPoint.date);
        if (existingIndex > -1) {
            mergedData[existingIndex].prediccion = pPoint.prediccion;
        } else {
            mergedData.push(pPoint);
        }
    });
    return mergedData;
  }, [salesHistory, predictionResult]);

  const paginatedSales = recentSales.slice((salesPage - 1) * SALES_PAGE_SIZE, salesPage * SALES_PAGE_SIZE);
  const totalSalesPages = Math.ceil(recentSales.length / SALES_PAGE_SIZE);

  if (!predictionResult) {
    return (
      <>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <h1 className="text-xl font-bold tracking-tight">Predicción de Tendencias</h1>
            </div>
        </header>
        <main className="flex flex-1 items-center justify-center p-4">
            <Alert variant="destructive" className="max-w-lg">
                <BrainCircuit className="h-4 w-4" />
                <AlertTitle>Error al Generar la Predicción</AlertTitle>
                <AlertDescription>
                    No se pudo obtener una predicción de la IA. Esto puede deberse a datos de ventas insuficientes en el último año o un problema temporal. Por favor, asegúrate de tener datos y vuelve a intentarlo.
                </AlertDescription>
            </Alert>
        </main>
      </>
    )
  }

  const {
    predictedSalesNextMonth,
    growthTrend,
    seasonalPeak,
    categoryPrediction,
    detailedPredictions,
  } = predictionResult;


  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-xl font-bold tracking-tight">Predicción de Tendencias</h1>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                    <Filter className="h-6 w-6 text-muted-foreground" />
                    <div>
                        <CardTitle>Generar Nueva Predicción</CardTitle>
                        <CardDescription>Usa los datos más recientes para generar una nueva proyección de la IA.</CardDescription>
                    </div>
                </div>
                <Button onClick={handleGeneratePrediction} disabled={isRefreshing}>
                    {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                    {isRefreshing ? 'Generando...' : 'Generar Nueva Predicción'}
                </Button>
            </CardHeader>
        </Card>

        <div>
            <div className="mb-4">
                <h2 className="text-xl font-semibold">Resumen Predictivo</h2>
                <p className="text-muted-foreground">Perspectivas clave generadas por IA para los próximos meses.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ventas Previstas (Próx. Mes)</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(predictedSalesNextMonth)}</div>
                        <p className="text-xs text-muted-foreground">Estimación basada en el modelo predictivo.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tendencia de Crecimiento</CardTitle>
                        <LineChartIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${growthTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>{growthTrend >= 0 ? '+' : ''}{growthTrend.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground">Proyección para el próximo trimestre.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pico Estacional Previsto</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{seasonalPeak}</div>
                        <p className="text-xs text-muted-foreground">Mes con la mayor demanda proyectada.</p>
                    </CardContent>
                </Card>
            </div>
        </div>

        <Card>
            <CardHeader>
              <CardTitle>Proyección de Tendencia de Ventas</CardTitle>
              <CardDescription>Comparativa visual entre las ventas reales pasadas y la proyección de la IA para los próximos 6 meses.</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorPrediction" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis tickFormatter={(value) => `$${(value as number / 1000)}k`} />
                        <Tooltip content={({ active, payload, label }) =>
                            active && payload && payload.length ? (
                                <div className="rounded-lg border bg-background p-2 shadow-sm">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex flex-col">
                                            <span className="text-[0.70rem] uppercase text-muted-foreground">Mes</span>
                                            <span className="font-bold text-muted-foreground">{label}</span>
                                        </div>
                                        {payload.map((item, index) => (
                                            item.value ? (
                                            <div key={index} className="flex flex-col">
                                                <span className="text-[0.70rem] uppercase text-muted-foreground">{item.name}</span>
                                                <span className="font-bold" style={{ color: item.stroke }}>
                                                    {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(item.value as number)}
                                                </span>
                                            </div>
                                            ) : null
                                        ))}
                                    </div>
                                </div>
                            ) : null
                        }/>
                        <Legend />
                        <Area type="monotone" dataKey="ventas" name="Ventas Históricas" stroke="hsl(var(--primary))" fill="url(#colorSales)" />
                        <Area type="monotone" dataKey="prediccion" name="Predicción IA" stroke="hsl(var(--chart-2))" fill="url(#colorPrediction)" />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Predicción por Categoría (Próx. Trimestre)</CardTitle>
              <CardDescription>Desglose de la demanda esperada por categoría de producto.</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <RechartsBarChart data={categoryPrediction}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" />
                        <YAxis tickFormatter={(value) => `$${(value as number / 1000)}k`}/>
                        <Tooltip formatter={(value) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value as number)} />
                        <Bar dataKey="prediction" name="Venta Prevista" fill="hsl(var(--primary))" />
                    </RechartsBarChart>
                </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
                <CardTitle>Ingresos por Compañía (Histórico)</CardTitle>
                <CardDescription>Distribución de ingresos en el último año.</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Tooltip formatter={(value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)} />
                        <Pie data={salesByCompany} dataKey="value" nameKey="name" innerRadius={60} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {salesByCompany.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
              <CardHeader>
                  <CardTitle>Sugerencias del Asistente de IA</CardTitle>
                  <CardDescription>Acciones recomendadas por la IA para optimizar el inventario basado en las predicciones.</CardDescription>
              </CardHeader>
              <CardContent>
                 <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Producto</TableHead>
                              <TableHead>SKU</TableHead>
                              <TableHead className="text-center">Predicción (unidades)</TableHead>
                              <TableHead>Confianza</TableHead>
                              <TableHead>Sugerencia</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {detailedPredictions.map((item) => (
                              <TableRow key={item.sku}>
                                  <TableCell className="font-medium max-w-xs truncate" title={item.product}>{item.product}</TableCell>
                                  <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                                  <TableCell className="text-center font-bold">{item.prediction}</TableCell>
                                  <TableCell>
                                      <Badge variant={item.confidence.startsWith('Alta') ? 'default' : item.confidence.startsWith('Media') ? 'secondary' : 'destructive'}>{item.confidence}</Badge>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">{item.suggestion}</TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Historial de Ventas Recientes</CardTitle>
                <CardDescription>Datos históricos utilizados como base para la predicción. Mostrando hasta 500 registros.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Producto</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Compañía</TableHead>
                            <TableHead className="text-center">Unidades</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedSales.map((sale, index) => (
                            <TableRow key={index}>
                                <TableCell className="text-sm text-muted-foreground">{format(new Date(sale.fecha_venta), "dd MMM yyyy", { locale: es })}</TableCell>
                                <TableCell className="font-medium max-w-xs truncate" title={sale.title}>{sale.title}</TableCell>
                                <TableCell className="font-mono text-xs">{sale.sku}</TableCell>
                                <TableCell>{sale.company}</TableCell>
                                <TableCell className="text-center">{sale.unidades}</TableCell>
                                <TableCell className="text-right font-bold">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(sale.total)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
            {totalSalesPages > 1 && (
                <CardFooter>
                    <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
                        <div>Página {salesPage} de {totalSalesPages}</div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setSalesPage(p => Math.max(1, p - 1))} disabled={salesPage === 1}>Anterior</Button>
                            <Button variant="outline" size="sm" onClick={() => setSalesPage(p => Math.min(totalSalesPages, p + 1))} disabled={salesPage === totalSalesPages}>Siguiente</Button>
                        </div>
                    </div>
                </CardFooter>
            )}
        </Card>
      </main>
    </>
  );
}
