'use client';

import { ArrowLeft, BrainCircuit, TrendingUp, Filter, LineChart as LineChartIcon, Bot, LogOut, Loader2, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { Area, AreaChart, Bar, BarChart as RechartsBarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, Line } from 'recharts';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import GlobalNav from '@/components/global-nav';
import type { SalesPredictionOutput } from '@/ai/schemas/sales-prediction-schemas';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type TrendsPredictionClientProps = {
  salesHistory: { date: string, ventas: number }[];
  predictionResult: SalesPredictionOutput | null;
};

export default function TrendsPredictionClient({ salesHistory, predictionResult }: TrendsPredictionClientProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleGeneratePrediction = () => {
    setIsRefreshing(true);
    router.refresh();
  };
  
  React.useEffect(() => {
    // This effect will run when navigation is complete,
    // which happens after router.refresh() finishes fetching new server props.
    setIsRefreshing(false);
  }, [salesHistory, predictionResult]); // Depend on the props that change

  const chartData = React.useMemo(() => {
    if (!predictionResult) return salesHistory;

    const historyWithSalesKey = salesHistory.map(h => ({ date: h.date, ventas: h.ventas, prediccion: undefined as number | undefined }));

    const lastHistoryPoint = historyWithSalesKey[historyWithSalesKey.length - 1];

    // Create a junction point so the prediction line connects to the history line
    const predictionWithJunction = [
        { date: lastHistoryPoint.date, prediction: lastHistoryPoint.ventas },
        ...predictionResult.salesPrediction
    ];
    
    const predictionPoints = predictionWithJunction.map(p => ({ date: p.date, prediccion: p.prediction, ventas: undefined as number | undefined }));

    // Merge history and prediction points
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

  if (!predictionResult) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <Link href="/historical-analysis" passHref>
                <Button variant="outline" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="sr-only">Volver</span>
                </Button>
              </Link>
              <h1 className="text-xl font-bold tracking-tight">Predicción de Tendencias</h1>
            </div>
            <div className="flex items-center gap-4">
               <GlobalNav />
               <Button variant="outline">
                 <LogOut className="mr-2 h-4 w-4" />
                 Cerrar Sesión
               </Button>
            </div>
        </header>
        <main className="flex flex-1 items-center justify-center p-4">
            <Alert variant="destructive" className="max-w-lg">
                <BrainCircuit className="h-4 w-4" />
                <AlertTitle>Error al Generar la Predicción</AlertTitle>
                <AlertDescription>
                    No se pudo obtener una predicción de la IA. Esto puede deberse a datos insuficientes o un problema temporal. Por favor, inténtalo de nuevo más tarde.
                </AlertDescription>
            </Alert>
        </main>
      </div>
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
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Link href="/historical-analysis" passHref>
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Volver</span>
            </Button>
          </Link>
          <h1 className="text-xl font-bold tracking-tight">Predicción de Tendencias</h1>
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

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Proyección de Tendencia de Ventas</CardTitle>
              <CardDescription>Comparativa visual entre las ventas reales pasadas y la proyección de la IA para los próximos 6 meses.</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorPrediction" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.4}/>
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
                                                <span className="font-bold" style={{ color: item.color || item.stroke }}>
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
                        <Line type="monotone" dataKey="ventas" name="Ventas Históricas" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} connectNulls />
                        <Area type="monotone" dataKey="prediccion" name="Predicción IA" stroke="hsl(var(--chart-2))" strokeWidth={2} fillOpacity={1} fill="url(#colorPrediction)" />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
          </Card>
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
                  <CardTitle>Sugerencias del Asistente de IA</CardTitle>
                  <CardDescription>Acciones recomendadas por la IA para optimizar el inventario basado en las predicciones.</CardDescription>
              </CardHeader>
              <CardContent>
                 <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Producto</TableHead>
                              <TableHead>Confianza</TableHead>
                              <TableHead>Sugerencia</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {detailedPredictions.map((item) => (
                              <TableRow key={item.sku}>
                                  <TableCell className="font-medium">{item.product}</TableCell>
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
        </div>
      </main>
    </div>
  );
}
