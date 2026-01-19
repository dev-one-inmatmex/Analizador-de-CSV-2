import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { List, ListItem } from '@/components/ui/list';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart3, Package, Zap, ClipboardList, BrainCircuit, GitCompareArrows, Users } from 'lucide-react';

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
          Selecciona una de las siguientes opciones para analizar datos históricos y explorar nuevas funcionalidades.
        </p>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Link href="/historical-analysis/sales" className="block hover:no-underline">
            <Card className="h-full transition-shadow hover:shadow-lg">
              <CardHeader>
                <BarChart3 className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>Análisis de Ventas</CardTitle>
                <CardDescription>
                  Analiza patrones de ventas, identifica tus productos más importantes y entiende el comportamiento de compra de tus clientes.
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
                  Gestiona y visualiza el ciclo de vida de tu inventario, desde las entradas de materia prima hasta las existencias actuales.
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
                  Mide la eficiencia de tus operaciones diarias, monitorizando el rendimiento por equipo y por empresa en tiempo real.
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
                  Analiza el ciclo de vida de tus productos terminados, desde su elaboración hasta su consumo, para optimizar el stock.
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
          <Link href="/historical-analysis/trends-prediction" className="block hover:no-underline">
            <Card className="h-full transition-shadow hover:shadow-lg">
              <CardHeader>
                <BrainCircuit className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>Predicción de Tendencias</CardTitle>
                <CardDescription>
                  Anticipa la demanda futura y los patrones de compra estacionales utilizando modelos de inteligencia artificial.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <List>
                  <ListItem>Análisis predictivo de ventas.</ListItem>
                  <ListItem>Identificación de patrones estacionales.</ListItem>
                </List>
              </CardContent>
            </Card>
          </Link>
          <Link href="/historical-analysis/major-minor-sales" className="block hover:no-underline">
            <Card className="h-full transition-shadow hover:shadow-lg">
              <CardHeader>
                <GitCompareArrows className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>Ventas por Mayor y Menor</CardTitle>
                <CardDescription>
                  Segmenta tus ventas para identificar productos de nicho, optimizar estrategias de precios y entender la dinámica de ventas por volumen.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <List>
                  <ListItem>Identificar productos de nicho.</ListItem>
                  <ListItem>Optimizar estrategias de precios.</ListItem>
                </List>
              </CardContent>
            </Card>
          </Link>
          <Link href="/historical-analysis/access-management" className="block hover:no-underline">
            <Card className="h-full transition-shadow hover:shadow-lg">
              <CardHeader>
                <Users className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>Gestión de Accesos</CardTitle>
                <CardDescription>
                  Define y administra roles de usuario para controlar el acceso a diferentes dashboards y funcionalidades de la aplicación.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <List>
                  <ListItem>Definir roles (admin, operador, etc.).</ListItem>
                  <ListItem>Controlar acceso a dashboards y funciones.</ListItem>
                </List>
              </CardContent>
            </Card>
          </Link>
        </div>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Nota sobre el Análisis por Empresa</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              La funcionalidad de <span className="font-semibold text-foreground">Análisis por Empresa</span> ya se encuentra integrada en los dashboards de Ventas, Inventario y Operaciones. Puedes usar el filtro "Empresa" en cada una de esas páginas para segmentar los datos y obtener una vista detallada del rendimiento por cada entidad.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
