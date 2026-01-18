'use client';

import { ArrowLeft, Star, User, Building, TrendingUp, DollarSign } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

// Chart Configs
const chartConfigSalesByCompany = {
  sales: {
    label: 'Ventas',
  },
  MTM: {
    label: 'MTM',
    color: 'hsl(var(--chart-1))',
  },
  TAL: {
    label: 'TAL',
    color: 'hsl(var(--chart-2))',
  },
  OMESKA: {
    label: 'OMESKA',
    color: 'hsl(var(--chart-3))',
  },
};

const chartConfigDailyGoal = {
  achieved: { label: 'Alcanzado', color: 'hsl(var(--primary))' },
  remaining: { label: 'Restante', color: 'hsl(var(--secondary))' },
};

const chartConfigUnitsByPeriod = {
  MTM: { label: 'MTM', color: 'hsl(var(--chart-1))' },
  TAL: { label: 'TAL', color: 'hsl(var(--chart-2))' },
  OMESKA: { label: 'OMESKA', color: 'hsl(var(--chart-3))' },
};

// Data
const salesByCompanyData = [
  { company: 'MTM', sales: 44, fill: 'hsl(var(--chart-1))' },
  { company: 'TAL', sales: 13, fill: 'hsl(var(--chart-2))' },
  { company: 'OMESKA', sales: 43, fill: 'hsl(var(--chart-3))' },
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

export default function SalesAnalysisPage() {
  const dailyGoalData = React.useMemo(() => {
    return dailyGoalDataRaw.map((d) => ({
      ...d,
      remaining: Math.max(0, d.goal - d.achieved),
    }));
  }, []);

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Link href="/historical-analysis" passHref>
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Volver</span>
            </Button>
          </Link>
          <h1 className="text-xl font-bold tracking-tight">Análisis de Ventas</h1>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
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
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">dana</div>
              <p className="text-xs text-muted-foreground">0.32 min/venta</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-12 lg:col-span-3">
            <CardHeader>
              <CardTitle>Ventas por Empresa</CardTitle>
              <CardDescription>Distribución de ventas en el último mes.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <ChartContainer config={chartConfigSalesByCompany} className="mx-auto aspect-square h-[300px]">
                <PieChart>
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Pie data={salesByCompanyData} dataKey="sales" nameKey="company" innerRadius={60} strokeWidth={5} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                    {salesByCompanyData.map((entry) => (
                      <Cell key={entry.company} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="company" />} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="col-span-12 lg:col-span-4">
            <CardHeader>
              <CardTitle>Meta Diaria por Empresa</CardTitle>
              <CardDescription>Progreso de las ventas diarias contra la meta.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfigDailyGoal} className="h-[300px] w-full">
                <BarChart data={dailyGoalData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend />
                  <YAxis dataKey="company" type="category" tickLine={false} axisLine={false} width={60} />
                  <XAxis dataKey="goal" type="number" hide />
                  <Bar dataKey="achieved" name="Alcanzado" stackId="a" fill="var(--color-achieved)" radius={[4, 4, 4, 4]} />
                  <Bar dataKey="remaining" name="Restante" stackId="a" fill="var(--color-remaining)" radius={[4, 4, 4, 4]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="col-span-12">
            <CardHeader>
              <CardTitle>Unidades por Periodo (Últimos 7 días)</CardTitle>
              <CardDescription>Tendencia de ventas de las principales empresas.</CardDescription>
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
      </main>
    </div>
  );
}
