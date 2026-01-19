'use client';

import { ArrowLeft, Zap, ListChecks, Building, Timer, Filter, Calendar as CalendarIcon, LogOut } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, XAxis, YAxis } from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
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
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: addDays(new Date(), -7),
    to: new Date(),
  });

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
          <h1 className="text-xl font-bold tracking-tight">Rendimiento Operativo</h1>
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
                    <CardTitle>Filtros de Rendimiento</CardTitle>
                    <CardDescription>Analiza el rendimiento por fecha, empresa o usuario.</CardDescription>
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
                                <SelectItem value="all">Todas</SelectItem>
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
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="carlos">carlos</SelectItem>
                                <SelectItem value="laura">laura</SelectItem>
                                <SelectItem value="pedro">pedro</SelectItem>
                                <SelectItem value="ana">ana</SelectItem>
                                <SelectItem value="luis">luis</SelectItem>
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
                <h2 className="text-xl font-semibold">Resumen Operativo</h2>
                <p className="text-muted-foreground">Indicadores de rendimiento clave para el periodo seleccionado.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rendimiento Promedio</CardTitle>
                        <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpiData.avgPerformance}%</div>
                        <p className="text-xs text-muted-foreground">Eficiencia general contra el objetivo.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Etiquetas Procesadas</CardTitle>
                        <ListChecks className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpiData.labelsProcessed.toLocaleString('es-MX')}</div>
                        <p className="text-xs text-muted-foreground">Volumen total de la jornada.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Empresa más Productiva</CardTitle>
                        <Building className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpiData.topCompany}</div>
                        <p className="text-xs text-muted-foreground">Mayor volumen de etiquetas/hora.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tiempo Promedio/Etiqueta</CardTitle>
                        <Timer className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpiData.avgTimePerLabel} seg</div>
                        <p className="text-xs text-muted-foreground">Tiempo medio para procesar una etiqueta.</p>
                    </CardContent>
                </Card>
            </div>
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
                        <CardTitle>Rendimiento por Empresa</CardTitle>
                        <CardDescription>Comparativa de productividad (etiquetas/hora) entre empresas.</CardDescription>
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
                        <CardTitle>Actividad Operativa por Hora</CardTitle>
                        <CardDescription>Volumen de etiquetas procesadas por hora en el periodo seleccionado.</CardDescription>
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
                      <CardDescription>Últimas operaciones registradas en el sistema por los usuarios.</CardDescription>
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
                                          <Badge variant="outline" style={{
                                             borderColor: companyConfig[op.company as keyof typeof companyConfig]?.color,
                                             color: companyConfig[op.company as keyof typeof companyConfig]?.color,
                                          }}>
                                              {op.company}
                                          </Badge>
                                      </TableCell>
                                      <TableCell>{op.task}</TableCell>
                                      <TableCell className="text-right">{op.quantity}</TableCell>
                                      <TableCell className="text-right text-sm text-muted-foreground">{op.time}</TableCell>
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
