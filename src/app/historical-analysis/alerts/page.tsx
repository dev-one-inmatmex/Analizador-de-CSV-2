'use client';

import { AlertTriangle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SidebarTrigger } from '@/components/ui/sidebar';

export default function AlertsPage() {
  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-xl font-bold tracking-tight">Alertas</h1>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center p-4 md:p-10">
        <div className="w-full max-w-2xl">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Módulo en Construcción</AlertTitle>
            <AlertDescription>
              El sistema de alertas se encuentra actualmente en desarrollo. Próximamente, aquí podrás configurar y visualizar alertas automáticas sobre tu operación.
            </AlertDescription>
          </Alert>
        </div>
      </main>
    </>
  );
}
