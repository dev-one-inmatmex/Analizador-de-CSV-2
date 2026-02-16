'use client';

import { useState, useEffect } from 'react';
import { CalendarCheck2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { addMonths, subMonths, format, setDate } from 'date-fns';
import { es } from 'date-fns/locale';

export default function OperationsClient() {
  const [startDay, setStartDay] = useState('1');
  const [period, setPeriod] = useState({ start: '', end: '' });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  useEffect(() => {
    const day = parseInt(startDay, 10);
    if (isNaN(day)) return;

    const today = new Date();
    let effectiveDate = new Date(today.getFullYear(), today.getMonth(), day);

    let startDate;
    if (today.getDate() < day) {
      // If today is before the start day of this month, the current period started last month
      startDate = subMonths(effectiveDate, 1);
    } else {
      // Otherwise, the current period started this month
      startDate = effectiveDate;
    }

    const endDate = setDate(addMonths(startDate, 1), day - 1);
    
    setPeriod({
      start: format(startDate, 'd MMMM, yyyy', { locale: es }),
      end: format(endDate, 'd MMMM, yyyy', { locale: es }),
    });
  }, [startDay]);

  if (!isClient) {
    return (
        <>
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
                <div className="flex items-center gap-4">
                <SidebarTrigger />
                <h1 className="text-xl font-bold tracking-tight">Gastos diarios</h1>
                </div>
            </header>
            <main className="flex flex-1 items-center justify-center p-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </main>
        </>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-xl font-bold tracking-tight">Gastos diarios</h1>
        </div>
      </header>
      <main className="flex flex-1 justify-center p-4 pt-8 bg-background">
        <div className="w-full max-w-md space-y-6">

          <Select defaultValue="mxn" disabled>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mxn">$ - MXN</SelectItem>
            </SelectContent>
          </Select>

          <Card>
            <CardHeader>
                <CardTitle>Día de Inicio del Periodo</CardTitle>
                <CardDescription>Selecciona el día</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={startDay} onValueChange={setStartDay}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar día" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      Día {i + 1} de cada mes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          
          <Card className="bg-muted/40">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><CalendarCheck2 className="h-5 w-5 text-muted-foreground" /> Vista Previa del Periodo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Periodo Actual</p>
              <p className="text-xl font-bold text-foreground">{period.start} - {period.end}</p>
              <p className="text-xs text-muted-foreground mt-1">Comienza inmediatamente</p>
            </CardContent>
          </Card>
          
          <Button className="w-full" size="lg">Continuar</Button>
        </div>
      </main>
    </>
  );
}
