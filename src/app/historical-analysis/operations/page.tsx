'use client';

import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Banknote, CalendarCheck2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { addMonths, subMonths, format, setDate } from 'date-fns';
import { es } from 'date-fns/locale';
import { Label } from '@/components/ui/label';

export default function OperationsPage() {
  const [startDay, setStartDay] = useState('1');
  const [period, setPeriod] = useState({ start: '', end: '' });

  useEffect(() => {
    const day = parseInt(startDay, 10);
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

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-xl font-bold tracking-tight">Gastos diarios</h1>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CalendarIcon className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold">¡Bienvenido! Configura tu Periodo</h1>
            <p className="mt-2 text-muted-foreground">
              ¿Cuándo comienza tu período de presupuesto? Esto ayuda a rastrear tus gastos según tu ciclo de salario o preferencia.
            </p>
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="flex items-center gap-2 font-semibold"><Banknote className="h-5 w-5" /> Cuenta Predeterminada</h3>
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select defaultValue="mxn" disabled>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mxn">$ - MXN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold">Día de Inicio del Periodo</h3>
                <div className="space-y-2">
                  <Label>Selecciona el día</Label>
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
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6">
                <h3 className="flex items-center gap-2 font-semibold text-primary"><CalendarCheck2 className="h-5 w-5" /> Vista Previa del Periodo</h3>
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">Periodo Actual</p>
                  <p className="text-lg font-bold">{period.start} - {period.end}</p>
                  <p className="text-xs text-muted-foreground mt-1">Comienza inmediatamente</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Button className="w-full" size="lg">Continuar</Button>
        </div>
      </main>
    </>
  );
}
