'use client';

import { Receipt } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SidebarTrigger } from '@/components/ui/sidebar';

export default function OperationsPage() {
  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-xl font-bold tracking-tight">Gastos diarios</h1>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center p-4 md:p-10">
        <div className="w-full max-w-2xl">
          <Alert>
            <Receipt className="h-4 w-4" />
            <AlertTitle>Módulo en Construcción</AlertTitle>
            <AlertDescription>
              La funcionalidad para la gestión de gastos diarios se encuentra en desarrollo.
            </AlertDescription>
          </Alert>
        </div>
      </main>
    </>
  );
}
