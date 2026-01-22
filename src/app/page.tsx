'use client';
import CsvUploader from '@/components/csv-uploader';
import CsvClassifier from '@/components/csv-classifier';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogOut, BarChart3, SlidersHorizontal, FileSearch } from 'lucide-react';
import GlobalNav from '@/components/global-nav';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function Home() {
  return (
    <div className="relative flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <h1 className="text-xl font-bold tracking-tight">Herramientas CSV</h1>
        <div className="flex items-center gap-4">
            <Link href="/historical-analysis" passHref>
                <Button>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Análisis de Históricos
                </Button>
            </Link>
            <GlobalNav />
            <Button variant="outline">
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
            </Button>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-start bg-background p-4 sm:p-6 lg:p-8">
        <Tabs defaultValue="classifier" className="w-full max-w-7xl">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold tracking-tight text-primary">Clasificador y Analizador de Datos CSV</h2>
                <p className="mt-2 text-lg text-muted-foreground">Carga, mapea, extrae y analiza datos de tus archivos CSV.</p>
            </div>
          <TabsList className="grid w-full grid-cols-2 max-w-lg mx-auto">
            <TabsTrigger value="classifier">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Clasificador por Mapeo
            </TabsTrigger>
            <TabsTrigger value="analyzer">
                <FileSearch className="mr-2 h-4 w-4" />
                Analizador Interactivo
            </TabsTrigger>
          </TabsList>
          <TabsContent value="classifier" className="mt-6">
            <CsvClassifier />
          </TabsContent>
          <TabsContent value="analyzer" className="mt-6">
            <CsvUploader />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
