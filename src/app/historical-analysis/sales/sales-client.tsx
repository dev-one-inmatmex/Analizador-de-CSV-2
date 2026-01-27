'use client';

import { ArrowLeft, Star, Building, TrendingUp, DollarSign, Filter, Users, LogOut, Loader2, BarChart3, Terminal } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { DateRange } from 'react-day-picker';
import { subDays, format } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import GlobalNav from '@/components/global-nav';
import type { ventas } from '@/types/database';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


// Chart Configs
const companyConfig = {
  MTM: { label: 'MTM', color: 'hsl(var(--chart-1))' },
  TAL: { label: 'TAL', color: 'hsl(var(--chart-2))' },
  OMESKA: { label: 'OMESKA', color: 'hsl(var(--chart-3))' },
};

const chartConfigSalesByCompany = { sales: { label: 'Ventas' }, ...companyConfig };
const chartConfigDailyGoal = { ...companyConfig, remaining: { label: 'Restante', color: 'hsl(var(--secondary))' } };
const chartConfigUnitsByPeriod = { ...companyConfig };


// Mock Data (will be partially replaced by props)
const allCompanies = ['MTM', 'TAL', 'OMESKA'];
const allUsers = ['dana', 'alex', 'juan', 'sara'];

const salesByCompanyData = [
  { company: 'MTM', sales: 44 },
  { company: 'TAL', sales: 13 },
  { company: 'OMESKA', sales: 43 },
];

const dailyGoalDataRaw = [
  { company: 'MTM', goal: 40, achieved: 35 },
  { company: 'TAL', goal: 20, achieved: 18 },
  { company: 'OMESKA', goal: 50, achieved: 48 },
];

const unitsByPeriodData = [
  { date: '02-oct', MTM: 45, TAL: 90, OMESKA: 15 },
  { date: '03-oct', MTM: 60, TAL: 100, OMESKA: 30 },
  { date: '04-oct', MTM: 75, TAL: 80, OMESKA: 95 },
  { date: '05-oct', MTM: 90, TAL: 70, OMESKA: 120 },
  { date: '06-oct', MTM: 170, TAL: 60, OMESKA: 40 },
];

const userPerformanceData = [
    { user: 'dana', sales: 320, averageTime: '0.32 min/v', status: 'active' },
    { user: 'alex', sales: 280, averageTime: '0.45 min/v', status: 'active' },
    { user: 'juan', sales: 150, averageTime: '0.60 min/v', status: 'active' },
    { user: 'sara', sales: 80, averageTime: '0.75 min/v', status: 'inactive' },
];

type TopProduct = {
  name: string;
  product: string; // sku
  sales: number;
}

export default function SalesAnalysisClientPage({ initialRecentSales, initialTopProducts }: { initialRecentSales: ventas[], initialTopProducts: TopProduct[] }) {
  const { toast } = useToast();
  
  const [company, setCompany] = React.useState('all');
  const [user, setUser] = React.useState('all');
  const [date, setDate] = React.useState<DateRange | undefined>();
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setDate({
      from: subDays(new Date(), 29),
      to: new Date(),
    });
    setIsClient(true);
  }, []);

  const [displayedRecentSales, setDisplayedRecentSales] = React.useState(initialRecentSales);
  const [displayedUserPerformance, setDisplayedUserPerformance] = React.useState(userPerformanceData);

  const handleApplyFilters = () => {
    toast({
        title: "Filtros aplicados",
        description: "Los datos de ventas han sido actualizados."
    });
    
    let filteredSales = initialRecentSales;

    if(company !== 'all') {
        filteredSales = filteredSales.filter(sale => sale.tienda_oficial === company);
    }
    // NOTE: User filter is not applied as there is no user field in the 'ventas' table.
    
    setDisplayedRecentSales(filteredSales);
    setDisplayedUserPerformance([...userPerformanceData].sort(() => Math.random() - 0.5));
  };

  const handleClearFilters = () => {
      toast({
          title: "Filtros limpiados",
          description: "Mostrando todos los datos originales."
      });
      setCompany('all');
      setUser('all');
      setDate({ from: subDays(new Date(), 29), to: new Date() });
      setDisplayedRecentSales(initialRecentSales);
      setDisplayedUserPerformance(userPerformanceData);
  };


  const dailyGoalData = React.useMemo(() => {
    return dailyGoalDataRaw.map((d) => ({
      company: d.company,
      goal: d.goal,
      [d.company]: d.achieved,
      remaining: Math.max(0, d.goal - d.achieved),
    }));
  }, []);

  if (!isClient) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-muted/40">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
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
        <Card>
            <CardHeader className="flex flex-row items-center gap-4">
                <Filter className="h-6 w-6 text-muted-foreground" />
                <div>
                    <CardTitle>Filtros de Análisis</CardTitle>
                    <CardDescription>Analiza el rendimiento por empresa o usuario.</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                        <Label htmlFor="date-range">Periodo</Label>
                        <DateRangePicker id="date-range" date={date} onSelect={setDate} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="company-filter">Empresa</Label>
                        <Select value={company} onValueChange={setCompany}>
                            <SelectTrigger id="company-filter">
                                <SelectValue placeholder="Seleccionar empresa" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las empresas</SelectItem>
                                {allCompanies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="user-filter">Usuario (Ejemplo)</Label>
                        <Select value={user} onValueChange={setUser}>
                            <SelectTrigger id="user-filter">
                                <SelectValue placeholder="Seleccionar usuario" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los usuarios</SelectItem>
                                {allUsers.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="mt-4 flex items-center justify-end gap-2">
                    <Button variant="outline" onClick={handleClearFilters}>Limpiar Filtros</Button>
                    <Button onClick={handleApplyFilters}>Aplicar Filtros</Button>
                </div>
            </CardContent>
        </Card>

        <div>
            <div className="mb-4">
                <h2 className="text-xl font-semibold">Resumen General</h2>
                <p className="text-muted-foreground">Indicadores clave de rendimiento para el periodo seleccionado.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ventas del Mes</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">887</div>
                  <p className="text-xs text-muted-foreground">+20.1% desde el mes pasado</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Productos Estrella</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{initialTopProducts.length > 0 ? initialTopProducts.length : 'N/A'}</div>
                  <p className="text-xs text-muted-foreground">Top productos más vendidos</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ventas (Hoy)</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">25</div>
                  <p className="text-xs text-muted-foreground">Unidades vendidas hoy</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Empresa Principal</CardTitle>
                  <Building className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">MTM</div>
                  <p className="text-xs text-muted-foreground">Mayor volumen de ventas</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Usuario más Activo</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">dana</div>
                  <p className="text-xs text-muted-foreground">0.32 min/venta</p>
                </CardContent>
              </Card>
            </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Resumen Gráfico</TabsTrigger>
            <TabsTrigger value="details">Análisis Detallado</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                    <CardTitle>Ventas por Empresa</CardTitle>
                    <CardDescription>Distribución porcentual de las ventas totales entre empresas.</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                    <ChartContainer config={chartConfigSalesByCompany} className="mx-auto aspect-square h-[300px]">
                        <PieChart>
                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                        <Pie data={salesByCompanyData} dataKey="sales" nameKey="company" innerRadius={60} strokeWidth={5} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                            {salesByCompanyData.map((entry) => (
                                <Cell key={entry.company} fill={`var(--color-${entry.company})`} />
                            ))}
                        </Pie>
                        <ChartLegend content={<ChartLegendContent nameKey="company" />} />
                        </PieChart>
                    </ChartContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                    <CardTitle>Meta Diaria por Empresa</CardTitle>
                    <CardDescription>Progreso de las ventas diarias contra la meta establecida para cada empresa.</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <ChartContainer config={chartConfigDailyGoal} className="h-[300px] w-full">
                        <BarChart data={dailyGoalData} layout="vertical" margin={{ left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend />
                        <YAxis dataKey="company" type="category" tickLine={false} axisLine={false} width={60} />
                        <XAxis dataKey="goal" type="number" hide />
                        <Bar dataKey="MTM" name="MTM" stackId="a" fill="var(--color-MTM)" radius={[4, 4, 4, 4]} />
                        <Bar dataKey="TAL" name="TAL" stackId="a" fill="var(--color-TAL)" radius={[4, 4, 4, 4]} />
                        <Bar dataKey="OMESKA" name="OMESKA" stackId="a" fill="var(--color-OMESKA)" radius={[4, 4, 4, 4]} />
                        <Bar dataKey="remaining" name="Restante" stackId="a" fill="var(--color-remaining)" radius={[4, 4, 4, 4]} />
                        </BarChart>
                    </ChartContainer>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader>
                    <CardTitle>Unidades por Periodo</CardTitle>
                    <CardDescription>Tendencia de ventas de las principales empresas en los últimos días del periodo.</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <ChartContainer config={chartConfigUnitsByPeriod} className="h-[300px] w-full">
                        <LineChart data={unitsByPeriodData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid vertical={false} />
                        <YAxis />
                        <XAxis dataKey="date" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend />
                        <Line type="monotone" dataKey="MTM" stroke="var(--color-MTM)" strokeWidth={2} dot={true} />
                        <Line type="monotone" dataKey="TAL" stroke="var(--color-TAL)" strokeWidth={2} dot={true} />
                        <Line type="monotone" dataKey="OMESKA" stroke="var(--color-OMESKA)" strokeWidth={2} dot={true} />
                        </LineChart>
                    </ChartContainer>
                    </CardContent>
                </Card>
            </div>
          </TabsContent>
          <TabsContent value="details" className="space-y-4">
             <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Ventas Recientes</CardTitle>
                        <CardDescription>Últimas transacciones registradas en el sistema según los filtros aplicados.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {displayedRecentSales.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Comprador</TableHead>
                                    <TableHead>Empresa</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="text-right">Fecha</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {displayedRecentSales.map((sale) => (
                                    <TableRow key={sale.id}>
                                        <TableCell className="font-medium">{sale.titulo_publicacion}</TableCell>
                                        <TableCell>{sale.comprador}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-xs">{sale.tienda_oficial}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(sale.total)}</TableCell>
                                        <TableCell className="text-right text-sm text-muted-foreground">{format(new Date(sale.fecha_venta), 'dd MMM yyyy')}</TableCell>
                                    </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <Alert variant="destructive">
                                <Terminal className="h-4 w-4" />
                                <AlertTitle>No se pudieron cargar los datos de ventas</AlertTitle>
                                <AlertDescription>
                                Verifica la configuración de Supabase y las políticas de seguridad (RLS) para la tabla `ventas`.
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Top Productos</CardTitle>
                            <CardDescription>Productos con mayor volumen de ventas en el periodo.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {initialTopProducts.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Producto</TableHead>
                                            <TableHead className="text-right">Ventas (unidades)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {initialTopProducts.map((prod) => (
                                            <TableRow key={prod.product}>
                                                <TableCell className="font-medium">{prod.name}</TableCell>
                                                <TableCell className="text-right">{prod.sales}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No hay datos de productos.</p>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Rendimiento por Usuario (Ejemplo)</CardTitle>
                            <CardDescription>Eficiencia y volumen de ventas de cada miembro del equipo.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                <TableRow>
                                    <TableHead>Usuario</TableHead>
                                    <TableHead className="text-right">Ventas</TableHead>
                                </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {displayedUserPerformance.map((user) => (
                                        <TableRow key={user.user}>
                                            <TableCell className="font-medium">{user.user}</TableCell>
                                            <TableCell className="text-right">{user.sales}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
