'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { List, ListItem } from '@/components/ui/list';
import Link from 'next/link';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { BarChart3, ShoppingCart, BrainCircuit, GitCompareArrows, Users, FolderArchive, Package, ClipboardList } from 'lucide-react';

export default function HistoricalAnalysisPage() {
  return (
    <>
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
            <SidebarTrigger />
            <h1 className="text-xl font-bold tracking-tight">Módulos de Análisis Histórico</h1>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center p-4 md:p-10">
        <div className="w-full max-w-7xl space-y-4 md:space-y-8">
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
                      Analiza patrones de ventas, inventario y publicaciones. Identifica productos clave, optimiza stock y gestiona tu catálogo en un solo lugar.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <List>
                    <ListItem>Dashboard de ventas con análisis Pareto.</ListItem>
                    <ListItem>Análisis de inventario y costos.</ListItem>
                    <ListItem>Gestión y rendimiento de publicaciones.</ListItem>
                    </List>
                </CardContent>
                </Card>
            </Link>
            <Link href="/historical-analysis/operations" className="block hover:no-underline">
                <Card className="h-full transition-shadow hover:shadow-lg">
                <CardHeader>
                    <ShoppingCart className="mb-2 h-8 w-8 text-primary" />
                    <CardTitle>Análisis de Adquisiciones</CardTitle>
                    <CardDescription>
                    Analiza órdenes de compra, costos y el rendimiento de proveedores para optimizar tu cadena de suministro y mejorar la rentabilidad.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <List>
                    <ListItem>Seguimiento de costos y órdenes de compra.</ListItem>
                    <ListItem>Evaluación del desempeño de proveedores.</ListItem>
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
                    Utiliza IA para mirar al futuro. Anticipa la demanda, identifica patrones estacionales y prevé qué productos serán populares en los próximos meses.
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
                    Segmenta tus ventas por volumen para diferenciar entre grandes compradores y minoristas, optimizando precios y estrategias para cada uno.
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
            <Link href="/historical-analysis/access-management" className="block hover:no-underline md:col-span-2">
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
        </div>
      </main>
    </>
  );
}
