'use client';
import CsvUploader from '@/components/csv-uploader';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export default function Home() {
  return (
    <div className="relative flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <h1 className="text-xl font-bold tracking-tight">Analizador de CSV</h1>
        <div className="flex items-center gap-4">
            <Link href="/historical-analysis" passHref>
              <Button variant="outline">Análisis Histórico</Button>
            </Link>
            <Button variant="outline">
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
            </Button>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-start bg-background p-4 sm:p-6 lg:p-8">
        <CsvUploader />
      </main>
    </div>
  );
}
