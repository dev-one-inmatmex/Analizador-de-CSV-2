'use client';
import CsvUploader from '@/components/csv-uploader';
import { SidebarTrigger } from '@/components/ui/sidebar';

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-xl font-bold tracking-tight">Analizador de Datos CSV</h1>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-start bg-background p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-7xl">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold tracking-tight text-primary">Analizador de Datos CSV</h2>
                <p className="mt-2 text-lg text-muted-foreground">Carga, selecciona, mapea y analiza datos de tus archivos CSV de forma interactiva.</p>
            </div>
            <CsvUploader />
        </div>
      </main>
    </>
  );
}
