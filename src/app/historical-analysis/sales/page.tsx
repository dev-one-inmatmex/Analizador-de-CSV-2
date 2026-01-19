'use client';

import { ArrowLeft, Star, Building, TrendingUp, DollarSign, Filter, Users, Calendar as CalendarIcon, LogOut } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { cn } from '@/lib/utils';


// Chart Configs
const companyConfig = {
  MTM: { label: 'MTM', color: 'hsl(var(--chart-1))' },
  TAL: { label: 'TAL', color: 'hsl(var(--chart-2))' },
  OMESKA: { label: 'OMESKA', color: 'hsl(var(--chart-3))' },
};

const chartConfigSalesByCompany = { sales: { label: 'Ventas' }, ...companyConfig };
const chartConfigDailyGoal = { ...companyConfig, remaining: { label: 'Restante', color: 'hsl(var(--secondary))' } };
const chartConfigUnitsByPeriod = { ...companyConfig };


// Data
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

const topProductsData = [
    { product: 'SKU-001', name: 'Producto A', sales: 150, percentage: 45, change: 5.2 },
    { product: 'SKU-002', name: 'Producto B', sales: 90, percentage: 27, change: -1.8 },
    { product: 'SKU-003', name: 'Producto C', sales: 50, percentage: 15, change: 2.3 },
    { product: 'SKU-004', name: 'Producto D', sales: 40, percentage: 13, change: 0.5 },
];

const userPerformanceData = [
    { user: 'dana', sales: 320, averageTime: '0.32 min/v', status: 'active' },
    { user: 'alex', sales: 280, averageTime: '0.45 min/v', status: 'active' },
    { user: 'juan', sales: 150, averageTime: '0.60 min/v', status: 'active' },
    { user: 'sara', sales: 80, averageTime: '0.75 min/v', status: 'inactive' },
];

const recentSalesData = [
    { product: 'Producto A', user: 'dana', company: 'MTM', amount: 55.00, time: 'Hace 2 minutos' },
    { product: 'Producto B', user: 'alex', company: 'TAL', amount: 30.50, time: 'Hace 5 minutos' },
    { product: 'Producto C', user: 'dana', company: 'OMESKA', amount: 20.00, time: 'Hace 8 minutos' },
    { product: 'Producto A', user: 'juan', company: 'MTM', amount: 110.00, time: 'Hace 12 minutos' },
    { product: 'Producto D', user: 'alex', company: 'TAL', amount: 15.00, time: 'Hace 15 minutos' },
];


export default function SalesAnalysisPage() {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(2023, 9, 2),
    to: new Date(2023, 9, 6),
  });
  const dailyGoalData = React.useMemo(() => {
    return dailyGoalDataRaw.map((d) => ({
      company: d.company,
      goal: d.goal,
      [d.company]: d.achieved,
      remaining: Math.max(0, d.goal - d.achieved),
    }));
  }, []);

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
        <div>
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
                    <CardDescription>
                        Usa los filtros para refinar los datos que se muestran en los gráficos y tablas.
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                        <Label htmlFor="date-range">Rango de Fechas</Label>
                         <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              id="date"
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !date && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {date?.from ? (
                                date.to ? (
                                  <>
                                    {format(date.from, "LLL dd, y", { locale: es })} -{" "}
                                    {format(date.to, "LLL dd, y", { locale: es })}
                                  </>
                                ) : (
                                  format(date.from, "LLL dd, y", { locale: es })
                                )
                              ) : (
                                <span>Seleccionar fecha</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              initialFocus
                              mode="range"
                              defaultMonth={date?.from}
                              selected={date}
                              onSelect={setDate}
                              numberOfMonths={2}
                              locale={es}
                            />
                          </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="company">Empresa</Label>
                        <Select defaultValue="all">
                            <SelectTrigger id="company" className="w-full">
                                <SelectValue placeholder="Seleccionar empresa" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las empresas</SelectItem>
                                <SelectItem value="MTM">MTM</SelectItem>
                                <SelectItem value="TAL">TAL</SelectItem>
                                <SelectItem value="OMESKA">OMESKA</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="user">Usuario</Label>
                        <Select defaultValue="all">
                            <SelectTrigger id="user" className="w-full">
                                <SelectValue placeholder="Seleccionar usuario" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los usuarios</SelectItem>
                                <SelectItem value="dana">dana</SelectItem>
                                <SelectItem value="alex">alex</SelectItem>
                                <SelectItem value="juan">juan</SelectItem>
                                <SelectItem value="sara">sara</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="col-span-1 grid grid-cols-2 items-end gap-2 sm:col-span-2 lg:col-span-3">
                        <Button className="w-full">Aplicar Filtros</Button>
                        <Button variant="outline" className="w-full">Limpiar</Button>
                    </div>
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
                  <div className="text-2xl font-bold">3</div>
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
                        <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead>Usuario</TableHead>
                                <TableHead>Empresa</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                                <TableHead className="text-right">Hora</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentSalesData.map((sale, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{sale.product}</TableCell>
                                    <TableCell>{sale.user}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-xs">{sale.company}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(sale.amount)}</TableCell>
                                    <TableCell className="text-right text-sm text-muted-foreground">{sale.time}</TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Top Productos</CardTitle>
                            <CardDescription>Productos con mayor volumen de ventas en el periodo.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Producto</TableHead>
                                        <TableHead className="text-right">Ventas</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {topProductsData.map((prod) => (
                                        <TableRow key={prod.product}>
                                            <TableCell className="font-medium">{prod.name}</TableCell>
                                            <TableCell className="text-right">{prod.sales}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Rendimiento por Usuario</CardTitle>
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
                                    {userPerformanceData.map((user) => (
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
