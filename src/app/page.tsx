'use client';
import CsvUploader from '@/components/csv-uploader';
import { SidebarTrigger } from '@/components/ui/sidebar';

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-xl font-bold tracking-tight">Analizador de datos CSV</h1>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-start bg-background p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-7xl">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold tracking-tight text-primary">Analizador Interactivo de Datos CSV</h2>
                <p className="mt-2 text-lg text-muted-foreground">Carga, mapea, analiza y sincroniza tus archivos CSV con la base de datos.</p>
            </div>
            <CsvUploader />
        </div>
      </main>
    </>
  );
}