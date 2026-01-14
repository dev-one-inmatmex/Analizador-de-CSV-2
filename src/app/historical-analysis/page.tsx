import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { List, ListItem } from '@/components/ui/list';

export default function HistoricalAnalysisPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
       <header className="sticky top-0 z-10 flex h-16 items-center border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <h1 className="text-xl font-bold tracking-tight">Análisis de Históricos</h1>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
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
                <ListItem>Porcentaje de participación por empresa y SKU en el mercado.</ListItem>
              </List>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Análisis de Inventario</CardTitle>
              <CardDescription>
                Basado en el Excel de Siggo para análisis de movimientos y existencias.
              </CardDescription>
            </CardHeader>
            <CardContent>
               <List>
                <ListItem>Análisis de movimientos de producto.</ListItem>
                <ListItem>Control y visualización de existencias actuales.</ListItem>
              </List>
            </CardContent>
          </Card>
           <Card>
            <CardHeader>
              <CardTitle>Rendimiento Operativo</CardTitle>
              <CardDescription>
                Medición del rendimiento diario por empresa.
              </CardDescription>
            </CardHeader>
            <CardContent>
               <List>
                <ListItem>Extrae datos de la base de datos de etiquetas.</ListItem>
                <ListItem>Mide el rendimiento del día por cada empresa.</ListItem>
              </List>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
