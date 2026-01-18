
'use client';

import { ArrowLeft, Zap, ListChecks, Building, Timer } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
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


// --- MOCK DATA ---

const kpiData = {
  avgPerformance: 98.5,
  labelsProcessed: 12540,
  topCompany: 'MTM',
  avgTimePerLabel: 2.5,
};

const companyConfig = {
  MTM: { label: 'MTM', color: 'hsl(var(--chart-1))' },
  TAL: { label: 'TAL', color: 'hsl(var(--chart-2))' },
  OMESKA: { label: 'OMESKA', color: 'hsl(var(--chart-3))' },
};

const performanceByCompanyData = [
  { company: 'MTM', performance: 110 },
  { company: 'TAL', performance: 95 },
  { company: 'OMESKA', performance: 88 },
];

const hourlyPerformanceData = [
  { hour: '09:00', labels: 1200 },
  { hour: '10:00', labels: 1500 },
  { hour: '11:00', labels: 1400 },
  { hour: '12:00', labels: 1800 },
  { hour: '13:00', labels: 1300 },
  { hour: '14:00', labels: 1650 },
  { hour: '15:00', labels: 1550 },
  { hour: '16:00', labels: 1100 },
];

const recentOperationsData = [
    { user: 'carlos', company: 'MTM', task: 'Etiquetado de Lote A', quantity: 150, time: 'Hace 5 min' },
    { user: 'laura', company: 'TAL', task: 'Verificación de Calidad', quantity: 200, time: 'Hace 8 min' },
    { user: 'pedro', company: 'OMESKA', task: 'Empaque de Pedido #123', quantity: 30, time: 'Hace 12 min' },
    { user: 'ana', company: 'MTM', task: 'Etiquetado de Lote B', quantity: 120, time: 'Hace 15 min' },
    { user: 'luis', company: 'TAL', task: 'Recepción de Mercancía', quantity: 500, time: 'Hace 20 min' },
];


export default function OperationsAnalysisPage() {
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
          <h1 className="text-xl font-bold tracking-tight">Rendimiento Operativo</h1>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Rendimiento Promedio (Hoy)</CardTitle>
                    <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{kpiData.avgPerformance}%</div>
                    <p className="text-xs text-muted-foreground">Eficiencia general de la operación</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Etiquetas Procesadas</CardTitle>
                    <ListChecks className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{kpiData.labelsProcessed.toLocaleString('es-MX')}</div>
                    <p className="text-xs text-muted-foreground">Etiquetas gestionadas en el día</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Empresa más Productiva</CardTitle>
                    <Building className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{kpiData.topCompany}</div>
                    <p className="text-xs text-muted-foreground">Mayor volumen de etiquetas/hora</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tiempo Promedio/Etiqueta</CardTitle>
                    <Timer className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{kpiData.avgTimePerLabel} seg</div>
                    <p className="text-xs text-muted-foreground">Tiempo medio para procesar una etiqueta</p>
                </CardContent>
            </Card>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Resumen Gráfico</TabsTrigger>
            <TabsTrigger value="details">Detalle de Operaciones</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Rendimiento por Empresa (Etiquetas/Hora)</CardTitle>
                        <CardDescription>Comparativa de productividad entre empresas.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={companyConfig} className="h-[300px] w-full">
                            <BarChart data={performanceByCompanyData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid vertical={false} />
                                <YAxis 
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    domain={[0, 'dataMax + 20']}
                                />
                                <XAxis dataKey="company" type="category" tickLine={false} axisLine={false} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="performance" radius={8}>
                                    {performanceByCompanyData.map((entry) => (
                                        <Cell key={entry.company} fill={companyConfig[entry.company as keyof typeof companyConfig].color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Actividad Operativa (Últimas 8 Horas)</CardTitle>
                        <CardDescription>Volumen de etiquetas procesadas por hora.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={{ labels: { label: 'Etiquetas', color: 'hsl(var(--primary))' } }} className="h-[300px] w-full">
                            <LineChart data={hourlyPerformanceData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid vertical={false} />
                                <YAxis />
                                <XAxis dataKey="hour" />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Line type="monotone" dataKey="labels" stroke="var(--color-labels)" strokeWidth={2} dot={true} />
                            </LineChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
          </TabsContent>
          <TabsContent value="details" className="space-y-4">
              <Card>
                  <CardHeader>
                      <CardTitle>Registro de Actividad Reciente</CardTitle>
                      <CardDescription>Últimas operaciones registradas en el sistema.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead>Usuario</TableHead>
                                  <TableHead>Empresa</TableHead>
                                  <TableHead>Tarea</TableHead>
                                  <TableHead className="text-right">Cantidad</TableHead>
                                  <TableHead className="text-right">Hora</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {recentOperationsData.map((op, index) => (
                                  <TableRow key={index}>
                                      <TableCell className="font-medium">{op.user}</TableCell>
                                      <TableCell>
                                          <Badge variant="outline" style={{ border: `1px solid ${companyConfig[op.company as keyof typeof companyConfig].color}` }}>
                                              {op.company}
                                          </Badge>
                                      </TableCell>
                                      <TableCell>{op.task}</TableCell>
                                      <TableCell className="text-right">{op.quantity}</TableCell>
                                      <TableCell className="text-right text-muted-foreground">{op.time}</TableCell>
                                  </TableRow>
                              ))}
                          </TableBody>
                      </Table>
                  </CardContent>
              </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

    