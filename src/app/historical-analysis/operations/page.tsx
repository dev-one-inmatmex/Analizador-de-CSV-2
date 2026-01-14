import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function OperationsAnalysisPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Link href="/historical-analysis" passHref>
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Volver</span>
            </Button>
          </Link>
          <h1 className="text-xl font-bold tracking-tight">Rendimiento Operativo</h1>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center p-4 text-center">
        <div className="space-y-4">
            <h2 className="text-2xl font-bold">Página en Construcción</h2>
            <p className="text-muted-foreground">
                Esta sección medirá el rendimiento operativo diario por empresa:
            </p>
            <ul className="list-disc list-inside text-left mx-auto max-w-md">
                <li>Extraerá datos de la base de datos de etiquetas.</li>
                <li>Medirá el rendimiento del día por cada empresa.</li>
            </ul>
        </div>
      </main>
    </div>
  );
}
