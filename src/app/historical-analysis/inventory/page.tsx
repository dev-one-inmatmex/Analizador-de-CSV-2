'use client';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { MoveLeft } from "lucide-react";
import Link from "next/link";

export default function DeprecatedInventoryPage() {
  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-xl font-bold tracking-tight">Página Movida</h1>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center p-4 md:p-10">
        <Alert className="max-w-xl">
            <MoveLeft className="h-4 w-4" />
            <AlertTitle>Esta sección ha sido movida.</AlertTitle>
            <AlertDescription>
                El contenido de &quot;Análisis de Inventario&quot; ahora se encuentra dentro de la sección de <Link href="/historical-analysis/sales" className="font-bold underline">Análisis de Ventas</Link>, en la pestaña de &quot;Inventario&quot;.
            </AlertDescription>
        </Alert>
      </main>
    </>
  );
}
