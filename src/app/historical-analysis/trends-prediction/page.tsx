'use client';

import { ArrowLeft, BrainCircuit, TrendingUp, Filter, LineChart as LineChartIcon, BarChart3, Bot, LogOut, Loader2 } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { addMonths, format, subDays } from 'date-fns';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import GlobalNav from '@/components/global-nav';

// --- MOCK DATA ---
const kpiData = {
  predictedSalesNextMonth: 450000.50,
  growthTrend: 15.2,
  seasonalPeak: 'Diciembre',
};

const generateSalesHistory = () => Array.from({ length: 12 }, (_, i) => ({
  date: format(addMonths(new Date(), -11 + i), 'MMM yy'),
  ventas: Math.floor(Math.random() * 200000) + 100000,
}));

const generateSalesPrediction = (history: {date: string, ventas: number}[]) => Array.from({ length: 6 }, (_, i) => ({
  date: format(addMonths(new Date(), i), 'MMM yy'),
  ventas: i === 0 ? history[11].ventas : undefined, // Start from last historical point
  prediccion: Math.floor(Math.random() * 150000) + (history[11].ventas * (1 + (i * 0.05))),
}));

const predictionByCategoryData = [
  { category: 'Electrónica', prediction: 120000 },
  { category: 'Ropa', prediction: 95000 },
  { category: 'Hogar', prediction: 85000 },
  { category: 'Juguetes', prediction: 60000 },
];

const detailedPredictions = [
    { product: 'Laptop Pro X', sku: 'LPX-001', prediction: 150, confidence: 'Alta (92%)', suggestion: 'Aumentar stock un 15%' },
    { product: 'Camisa Casual', sku: 'CAM-032', prediction: 300, confidence: 'Media (85%)', suggestion: 'Mantener stock actual' },
    { product: 'Sofá Moderno', sku: 'SOF-001', prediction: 50, confidence: 'Alta (95%)', suggestion: 'Aumentar stock un 10%' },
    { product: 'Celular Gen 5', sku: 'CEL-005', prediction: 80, confidence: 'Baja (70%)', suggestion: 'Revisar estacionalidad' },
];

const allCategories = ['General', 'Electrónica', 'Ropa', 'Hogar', 'Juguetes'];

export default function TrendsPredictionPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [category, setCategory] = React.useState('General');
  const [date, setDate] = React.useState<DateRange | undefined>();
  const [isClient, setIsClient] = React.useState(false);
  
  const [salesHistory, setSalesHistory] = React.useState(generateSalesHistory());
  const [salesPrediction, setSalesPrediction] = React.useState(() => generateSalesPrediction(salesHistory));

  React.useEffect(() => {
    setDate({
      from: subDays(new Date(), 365),
      to: new Date(),
    });
    setIsClient(true);
  }, []);

  const handleGeneratePrediction = () => {
      setIsLoading(true);
      toast({
          title: "Generando nueva predicción...",
          description: "La IA está analizando los datos. Esto puede tardar un momento."
      });
      setTimeout(() => {
          const newHistory = generateSalesHistory();
          setSalesHistory(newHistory);
          setSalesPrediction(generateSalesPrediction(newHistory));
          setIsLoading(false);
          toast({
              title: "¡Predicción actualizada!",
              description: "Los gráficos y datos ahora muestran la nueva proyección de la IA."
          });
      }, 1500);
  };

  const handleClearFilters = () => {
    setCategory('General');
    setDate({ from: subDays(new Date(), 365), to: new Date() });
    toast({
        title: "Filtros limpiados",
        description: "Se han restaurado los filtros a sus valores por defecto."
    });
  }

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
      {isClient ? (
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
        <Card>
            <CardHeader className="flex flex-row items-center gap-4">
                <Filter className="h-6 w-6 text-muted-foreground" />
                <div>
                    <CardTitle>Filtros de Predicción</CardTitle>
                    <CardDescription>Ajusta la categoría para refinar el análisis predictivo.</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="date-range">Periodo Histórico</Label>
                        <DateRangePicker id="date-range" date={date} onSelect={setDate} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="category-filter">Categoría</Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger id="category-filter">
                                <SelectValue placeholder="Seleccionar categoría" />
                            </SelectTrigger>
                            <SelectContent>
                                {allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="mt-4 flex items-center justify-end gap-2">
                    <Button variant="outline" onClick={handleClearFilters}>Limpiar Filtros</Button>
                    <Button onClick={handleGeneratePrediction} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                        {isLoading ? 'Generando...' : 'Generar Predicción'}
                    </Button>
                </div>
            </CardContent>
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
                        <div className="text-2xl font-bold">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(kpiData.predictedSalesNextMonth)}</div>
                        <p className="text-xs text-muted-foreground">Estimación basada en el modelo predictivo.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tendencia de Crecimiento</CardTitle>
                        <LineChartIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">+{kpiData.growthTrend}%</div>
                        <p className="text-xs text-muted-foreground">Comparado con el trimestre anterior.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pico Estacional Previsto</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpiData.seasonalPeak}</div>
                        <p className="text-xs text-muted-foreground">Mes con la mayor demanda proyectada.</p>
                    </CardContent>
                </Card>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Histórico de Ventas vs. Predicción Futura</CardTitle>
              <CardDescription>Comparativa visual entre las ventas reales pasadas y la proyección de la IA para los próximos 6 meses.</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={[...salesHistory, ...salesPrediction.slice(1)]}>
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
                                            <div key={index} className="flex flex-col">
                                                <span className="text-[0.70rem] uppercase text-muted-foreground">{item.name}</span>
                                                <span className="font-bold" style={{ color: item.color }}>
                                                    {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(item.value as number)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null
                        }/>
                        <Legend />
                        <Line type="monotone" dataKey="ventas" name="Ventas Históricas" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="prediccion" name="Predicción IA" stroke="hsl(var(--chart-2))" strokeWidth={2} strokeDasharray="5 5" />
                    </LineChart>
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
                    <BarChart data={predictionByCategoryData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" />
                        <YAxis tickFormatter={(value) => `$${(value as number / 1000)}k`}/>
                        <Tooltip />
                        <Bar dataKey="prediction" name="Venta Prevista" fill="hsl(var(--primary))" />
                    </BarChart>
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
                          {detailedPredictions.slice(0,4).map((item) => (
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
      ) : (
        <main className="flex flex-1 items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </main>
      )}
    </div>
  );
}
