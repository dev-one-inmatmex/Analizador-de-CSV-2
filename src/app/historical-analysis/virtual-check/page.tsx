'use client';

import { ArrowLeft, CheckSquare, Filter, Calendar as CalendarIcon, ClipboardList, Play, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';


// --- MOCK DATA ---
const kpiData = {
    tasksCompletedToday: 45,
    tasksPending: 12,
    avgCompletionTime: 15.3, // in minutes
    totalTasks: 57,
};

const tasksData = [
  { id: 'task_001', process: 'Empaque Lote A', user: 'Laura Fernández', status: 'Completado', startTime: 'Hoy, 09:00 AM', endTime: 'Hoy, 09:15 AM', duration: '15 min' },
  { id: 'task_002', process: 'Recepción de Mercancía', user: 'Luis', status: 'En Progreso', startTime: 'Hoy, 10:30 AM', endTime: '-', duration: '-' },
  { id: 'task_003', process: 'Etiquetado Lote B', user: 'Ana García', status: 'Pendiente', startTime: '-', endTime: '-', duration: '-' },
  { id: 'task_004', process: 'Verificación de Calidad', user: 'Carlos Reyes', status: 'Completado', startTime: 'Hoy, 08:30 AM', endTime: 'Hoy, 08:55 AM', duration: '25 min' },
  { id: 'task_005', process: 'Empaque Pedido #1234', user: 'Laura Fernández', status: 'Pendiente', startTime: '-', endTime: '-', duration: '-' },
  { id: 'task_006', process: 'Inventario Cíclico', user: 'Carlos Reyes', status: 'En Progreso', startTime: 'Hoy, 10:45 AM', endTime: '-', duration: '-' },
];


export default function VirtualCheckPage() {
  const [date, setDate] = React.useState<Date | undefined>(new Date());

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Link href="/historical-analysis" passHref><Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /><span className="sr-only">Volver</span></Button></Link>
          <h1 className="text-xl font-bold tracking-tight">Check Virtual de Procesos</h1>
        </div>
        <Button><ClipboardList className="mr-2 h-4 w-4" /> Crear Nueva Tarea</Button>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
        <Card>
            <CardHeader className="flex flex-row items-center gap-4">
                <Filter className="h-6 w-6 text-muted-foreground" />
                <div><CardTitle>Filtros de Tareas</CardTitle><CardDescription>Filtra las tareas por fecha, proceso o estado.</CardDescription></div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                        <Label htmlFor="date">Fecha</Label>
                        <Popover>
                          <PopoverTrigger asChild><Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{date ? format(date, "LLL dd, y", { locale: es }) : <span>Seleccionar fecha</span>}</Button></PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={date} onSelect={(d) => setDate(d || new Date())} initialFocus /></PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2"><Label htmlFor="process">Proceso</Label><Select defaultValue="all"><SelectTrigger id="process"><SelectValue placeholder="Seleccionar proceso" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="empaque">Empaque</SelectItem><SelectItem value="etiquetado">Etiquetado</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label htmlFor="status">Estado</Label><Select defaultValue="all"><SelectTrigger id="status"><SelectValue placeholder="Seleccionar estado" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="pending">Pendiente</SelectItem><SelectItem value="in_progress">En Progreso</SelectItem><SelectItem value="completed">Completado</SelectItem></SelectContent></Select></div>
                </div>
            </CardContent>
        </Card>

        <div>
            <div className="mb-4">
                <h2 className="text-xl font-semibold">Resumen de Actividad del Día</h2>
                <p className="text-muted-foreground">Progreso de las tareas operativas para la fecha seleccionada.</p>
            </div>
            <Card className="mb-4">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                       <CardTitle>Progreso Total de Tareas</CardTitle>
                       <span className="text-lg font-semibold">{kpiData.tasksCompletedToday} / {kpiData.totalTasks}</span>
                    </div>
                    <CardDescription className="mb-2">({((kpiData.tasksCompletedToday / kpiData.totalTasks) * 100).toFixed(0)}% completado)</CardDescription>
                    <Progress value={(kpiData.tasksCompletedToday / kpiData.totalTasks) * 100} className="w-full" />
                </CardContent>
            </Card>
        </div>
        
        <Card>
          <CardHeader><CardTitle>Lista de Tareas</CardTitle><CardDescription>Listado de todas las tareas operativas programadas para hoy.</CardDescription></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Proceso</TableHead><TableHead>Asignado a</TableHead><TableHead>Estado</TableHead><TableHead>Duración</TableHead><TableHead className="text-right">Acción</TableHead></TableRow></TableHeader>
              <TableBody>
                {tasksData.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.process}</TableCell>
                    <TableCell>{task.user}</TableCell>
                    <TableCell><Badge variant={task.status === 'Completado' ? 'default' : task.status === 'En Progreso' ? 'secondary' : 'outline'} className={cn(task.status === 'Completado' && 'bg-green-600/80')}>{task.status}</Badge></TableCell>
                    <TableCell>{task.duration}</TableCell>
                    <TableCell className="text-right">
                        {task.status === 'Pendiente' && <Button variant="outline" size="sm"><Play className="mr-2 h-4 w-4"/>Iniciar Tarea</Button>}
                        {task.status === 'En Progreso' && <Button size="sm"><CheckCircle2 className="mr-2 h-4 w-4"/>Completar</Button>}
                        {task.status === 'Completado' && <Button variant="ghost" size="sm" disabled>Finalizado</Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
