'use client';

import { ArrowLeft, Construction } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function MajorMinorSalesPage() {
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
          <h1 className="text-xl font-bold tracking-tight">Análisis de Ventas por Mayor y Menor</h1>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:gap-8 md:p-10">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Construction className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="mt-4">Página en Construcción</CardTitle>
            <CardDescription>
              Esta sección para el análisis detallado de ventas por volumen está en desarrollo. ¡Vuelve pronto para ver los avances!
            </CardDescription>
          </CardHeader>
          <CardContent>
              <Link href="/historical-analysis" passHref>
                <Button>Volver al Análisis Histórico</Button>
              </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
