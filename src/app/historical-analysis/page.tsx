import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { List, ListItem } from '@/components/ui/list';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart3, Package, Zap, ClipboardList } from 'lucide-react';

export default function HistoricalAnalysisPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <Link href="/" passHref>
          <Button variant="outline" size="icon" className="mr-4">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Volver</span>
          </Button>
        </Link>
        <h1 className="text-xl font-bold tracking-tight">Análisis de Históricos</h1>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
        <p className="text-muted-foreground">
          Selecciona una de las siguientes opciones para analizar datos históricos de diferentes fuentes.
        </p>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
          <Link href="/historical-analysis/sales" className="block hover:no-underline">
            <Card className="h-full transition-shadow hover:shadow-lg">
              <CardHeader>
                <BarChart3 className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>Análisis de Ventas</CardTitle>
                <CardDescription>
                  Información detallada sobre el rendimiento de las ventas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <List>
                  <ListItem>Análisis de Pareto para identificar productos clave.</ListItem>
                  <ListItem>Consumo de productos por empresa.</ListItem>
                  <ListItem>Identificación de producto estrella.</ListItem>
                </List>
              </CardContent>
            </Card>
          </Link>
          <Link href="/historical-analysis/inventory" className="block hover:no-underline">
            <Card className="h-full transition-shadow hover:shadow-lg">
              <CardHeader>
                <Package className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>Análisis de Inventario</CardTitle>
                <CardDescription>
                  Análisis de movimientos y existencias de la materia prima.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <List>
                  <ListItem>Análisis de movimientos de producto.</ListItem>
                  <ListItem>Control y visualización de existencias actuales.</ListItem>
                </List>
              </CardContent>
            </Card>
          </Link>
          <Link href="/historical-analysis/operations" className="block hover:no-underline">
            <Card className="h-full transition-shadow hover:shadow-lg">
              <CardHeader>
                <Zap className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>Rendimiento Operativo</CardTitle>
                <CardDescription>
                  Medición del rendimiento diario por empresa y usuario.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <List>
                  <ListItem>Extrae datos de la base de datos de etiquetas.</ListItem>
                  <ListItem>Mide el rendimiento del día por cada empresa.</ListItem>
                </List>
              </CardContent>
            </Card>
          </Link>
          <Link href="/historical-analysis/products" className="block hover:no-underline">
            <Card className="h-full transition-shadow hover:shadow-lg">
              <CardHeader>
                <ClipboardList className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>Análisis de Productos</CardTitle>
                <CardDescription>
                  Depuración y análisis del ciclo de vida de los productos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <List>
                  <ListItem>Visualización de stock y su duración.</ListItem>
                  <ListItem>Histórico de movimientos y consumo.</ListItem>
                  <ListItem>Análisis de fechas de elaboración.</ListItem>
                </List>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}
