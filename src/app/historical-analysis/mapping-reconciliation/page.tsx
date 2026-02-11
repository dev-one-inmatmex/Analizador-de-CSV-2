'use client';

import { Puzzle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SidebarTrigger } from '@/components/ui/sidebar';

export default function MappingReconciliationPage() {
  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-xl font-bold tracking-tight">Mapeo y Conciliación</h1>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center p-4 md:p-10">
        <div className="w-full max-w-2xl">
          <Alert>
            <Puzzle className="h-4 w-4" />
            <AlertTitle>Módulo en Construcción</AlertTitle>
            <AlertDescription>
              Esta sección para mapeo y conciliación de datos está en desarrollo. Próximamente aquí podrás unificar y validar tus catálogos.
            </AlertDescription>
          </Alert>
        </div>
      </main>
    </>
  );
}
