'use client';

import { Landmark } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SidebarTrigger } from '@/components/ui/sidebar';

export default function FinancialClosePage() {
  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-xl font-bold tracking-tight">Cierre Financiero</h1>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center p-4 md:p-10">
        <div className="w-full max-w-2xl">
          <Alert>
            <Landmark className="h-4 w-4" />
            <AlertTitle>Módulo en Construcción</AlertTitle>
            <AlertDescription>
              La funcionalidad para el cierre financiero se encuentra actualmente en desarrollo. Próximamente, aquí encontrarás las herramientas para consolidar y cerrar tus períodos contables.
            </AlertDescription>
          </Alert>
        </div>
      </main>
    </>
  );
}
