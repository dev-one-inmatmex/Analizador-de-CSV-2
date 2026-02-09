'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SidebarTrigger } from '@/components/ui/sidebar';

export default function HistoricalAnalysisPage() {
  return (
    <>
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
            <SidebarTrigger />
            <h1 className="text-xl font-bold tracking-tight">Resumen de Módulos</h1>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center p-4 md:p-10">
        <div className="w-full max-w-4xl space-y-4 md:space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Bienvenido a Análisis Pro</CardTitle>
              <CardDescription>
                Esta es tu plataforma centralizada para el análisis de datos y la gestión empresarial.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Utiliza el menú de navegación a la izquierda para explorar los diferentes módulos disponibles. Cada sección está diseñada para ofrecerte una visión detallada y accionable de las distintas áreas de tu negocio.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
