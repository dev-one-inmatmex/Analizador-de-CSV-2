'use client';

import * as React from 'react';
import { Package, Layers, DollarSign, ArrowRightLeft, AlertTriangle, Loader2, Plus, Calendar, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { addSkuM, addSkuCosto, addSkuAlterno } from './actions';
import type { InventoryData } from './page';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const PAGE_SIZE = 10;

export default function InventoryAnalysisClient({ 
    inventoryData,
}: { 
    inventoryData: InventoryData,
}) {
    const { toast } = useToast();
    const [isClient, setIsClient] = React.useState(false);
    const [pageSkuM, setPageSkuM] = React.useState(1);
    const [pageCostos, setPageCostos] = React.useState(1);
    const [pageAlternos, setPageAlternos] = React.useState(1);
    
    // Form states
    const [isSkuMDialogOpen, setIsSkuMDialogOpen] = React.useState(false);
    const [isCostoDialogOpen, setIsCostoDialogOpen] = React.useState(false);
    const [isAlternoDialogOpen, setIsAlternoDialogOpen] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    React.useEffect(() => {
        setIsClient(true);
    }, []);

    const { skuM, skuCostos, skusAlternos } = inventoryData;

    const { inventoryKpis } = React.useMemo(() => {
        const totalSkuM = skuM.length;
        const totalSkus = skuM.filter(s => s.sku).length;
        const totalAlternos = skusAlternos.length;
        const landedCosts = skuCostos.map(c => c.landed_cost).filter((c): c is number => c !== null && c !== undefined);
        const avgLandedCost = landedCosts.length > 0 ? landedCosts.reduce((a, b) => a + b, 0) / landedCosts.length : 0;
        return { inventoryKpis: { totalSkuM, totalSkus, totalAlternos, avgLandedCost } };
    }, [skuM, skuCostos, skusAlternos]);

    const totalPagesSkuM = Math.ceil(skuM.length / PAGE_SIZE);
    const paginatedSkuM = skuM.slice((pageSkuM - 1) * PAGE_SIZE, pageSkuM * PAGE_SIZE);

    const totalPagesCostos = Math.ceil(skuCostos.length / PAGE_SIZE);
    const paginatedCostos = skuCostos.slice((pageCostos - 1) * PAGE_SIZE, pageCostos * PAGE_SIZE);

    const totalPagesAlternos = Math.ceil(skusAlternos.length / PAGE_SIZE);
    const paginatedAlternos = skusAlternos.slice((pageAlternos - 1) * PAGE_SIZE, pageAlternos * PAGE_SIZE);

    const renderInventoryPagination = (currentPage: number, totalPages: number, setPage: (page: number) => void) => (
        <CardFooter>
            <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
                <div>Página {currentPage} de {totalPages}</div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>Anterior</Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>Siguiente</Button>
                </div>
            </div>
        </CardFooter>
    );

    const handleSkuMSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const data = {
            sku_mdr: formData.get('sku_mdr') as string,
            cat_mdr: formData.get('cat_mdr') as string || null,
            esti_time: formData.get('esti_time') ? Number(formData.get('esti_time')) : null,
            piezas_por_sku: formData.get('piezas_por_sku') ? Number(formData.get('piezas_por_sku')) : null,
            sku: formData.get('sku') as string || null,
            piezas_xcontenedor: formData.get('piezas_xcontenedor') ? Number(formData.get('piezas_xcontenedor')) : null,
            bodega: formData.get('bodega') as string || null,
            bloque: formData.get('bloque') ? Number(formData.get('bloque')) : null,
            landed_cost: formData.get('landed_cost') ? Number(formData.get('landed_cost')) : 0,
        };

        const result = await addSkuM(data);
        setIsSubmitting(false);
        if (result.error) {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        } else {
            toast({ title: 'Éxito', description: 'SKU Maestro añadido correctamente.' });
            setIsSkuMDialogOpen(false);
        }
    };

    const handleCostoSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const data = {
            sku_mdr: formData.get('sku_mdr') as string,
            landed_cost: Number(formData.get('landed_cost')),
            fecha_desde: formData.get('fecha_desde') as string,
            proveedor: formData.get('proveedor') as string || null,
            piezas_xcontenedor: formData.get('piezas_xcontenedor') ? Number(formData.get('piezas_xcontenedor')) : null,
            sku: formData.get('sku') as string || null,
            esti_time: formData.get('esti_time') ? Number(formData.get('esti_time')) : null,
        };

        const result = await addSkuCosto(data);
        setIsSubmitting(false);
        if (result.error) {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        } else {
            toast({ title: 'Éxito', description: 'Registro de costo añadido correctamente.' });
            setIsCostoDialogOpen(false);
        }
    };

    const handleAlternoSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const data = {
            sku: formData.get('sku') as string,
            sku_mdr: formData.get('sku_mdr') as string || null,
        };

        const result = await addSkuAlterno(data);
        setIsSubmitting(false);
        if (result.error) {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        } else {
            toast({ title: 'Éxito', description: 'Relación alterna añadida correctamente.' });
            setIsAlternoDialogOpen(false);
        }
    };

    if (!isClient) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
                <div className="flex items-center gap-4">
                    <SidebarTrigger />
                    <h1 className="text-xl font-bold tracking-tight">Gestión de SKUs</h1>
                </div>
            </header>

            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    {inventoryData.error ? (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Error al cargar datos de inventario</AlertTitle>
                            <AlertDescription>{inventoryData.error}</AlertDescription>
                        </Alert>
                    ) : (
                        <>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Categorías (SKU M)</CardTitle>
                                        <Package className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{inventoryKpis.totalSkuM}</div>
                                        <p className="text-xs text-muted-foreground">Categorías principales</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">SKUs Vinculados</CardTitle>
                                        <Layers className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{inventoryKpis.totalSkus}</div>
                                        <p className="text-xs text-muted-foreground">Con SKU</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">SKUs Alternos</CardTitle>
                                        <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{inventoryKpis.totalAlternos}</div>
                                        <p className="text-xs text-muted-foreground">Variaciones ligadas</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Costo Promedio</CardTitle>
                                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(inventoryKpis.avgLandedCost)}</div>
                                        <p className="text-xs text-muted-foreground">Histórico general</p>
                                    </CardContent>
                                </Card>
                            </div>

                            <Tabs defaultValue="categorias" className="w-full">
                                <TabsList className="grid w-full grid-cols-3 max-w-2xl mx-auto">
                                    <TabsTrigger value="categorias">Catálogo Maestro</TabsTrigger>
                                    <TabsTrigger value="costos">Historial de Costos</TabsTrigger>
                                    <TabsTrigger value="alternos">SKUs Alternos</TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="categorias" className="mt-6 space-y-4">
                                    <div className="flex justify-end">
                                        <Dialog open={isSkuMDialogOpen} onOpenChange={setIsSkuMDialogOpen}>
                                            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nueva categoría madre</Button></DialogTrigger>
                                            <DialogContent className="sm:max-w-2xl">
                                                <DialogHeader><DialogTitle>Nuevo SKU Maestro</DialogTitle><DialogDescription>Añade un producto al catálogo central (tabla sku_m).</DialogDescription></DialogHeader>
                                                <form onSubmit={handleSkuMSubmit} className="space-y-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2"><Label htmlFor="sku_mdr">SKU Madre (PK)</Label><Input id="sku_mdr" name="sku_mdr" required /></div>
                                                        <div className="space-y-2"><Label htmlFor="cat_mdr">Categoría Madre</Label><Input id="cat_mdr" name="cat_mdr" /></div>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-4">
                                                        <div className="space-y-2"><Label htmlFor="sku">SKU Siggo</Label><Input id="sku" name="sku" /></div>
                                                        <div className="space-y-2"><Label htmlFor="piezas_por_sku">Pzs x SKU</Label><Input id="piezas_por_sku" name="piezas_por_sku" type="number" /></div>
                                                        <div className="space-y-2"><Label htmlFor="landed_cost_m">Landed Cost</Label><Input id="landed_cost_m" name="landed_cost" type="number" step="0.01" required /></div>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-4">
                                                        <div className="space-y-2"><Label htmlFor="piezas_xcontenedor_m">Pzs x Contenedor</Label><Input id="piezas_xcontenedor_m" name="piezas_xcontenedor" type="number" /></div>
                                                        <div className="space-y-2"><Label htmlFor="bodega">Bodega</Label><Input id="bodega" name="bodega" /></div>
                                                        <div className="space-y-2"><Label htmlFor="bloque">Bloque</Label><Input id="bloque" name="bloque" type="number" /></div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2"><Label htmlFor="esti_time_m">Tiempo Prep. (min)</Label><Input id="esti_time_m" name="esti_time" type="number" /></div>
                                                    </div>
                                                    <DialogFooter><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar SKU Maestro'}</Button></DialogFooter>
                                                </form>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Categorías Madre</CardTitle>
                                            <CardDescription>Catálogo centralizado de productos y logística.</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>SKU Madre</TableHead>
                                                        <TableHead>Categoría</TableHead>
                                                        <TableHead className="text-right">Costo (Landed)</TableHead>
                                                        <TableHead className="text-right">Pzs x SKU</TableHead>
                                                        <TableHead>SKU Siggo</TableHead>
                                                        <TableHead className="text-right">Pzs/Cont.</TableHead>
                                                        <TableHead>Bodega</TableHead>
                                                        <TableHead className="text-right">Bloque</TableHead>
                                                        <TableHead className="text-right">T. Prep</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {paginatedSkuM.map((item) => (
                                                        <TableRow key={item.sku_mdr}>
                                                            <TableCell className="font-mono font-medium text-primary">{item.sku_mdr}</TableCell>
                                                            <TableCell>{item.cat_mdr || 'N/A'}</TableCell>
                                                            <TableCell className="text-right font-semibold text-green-600">
                                                                {item.landed_cost ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(item.landed_cost) : '-'}
                                                            </TableCell>
                                                            <TableCell className="text-right">{item.piezas_por_sku ?? '-'}</TableCell>
                                                            <TableCell className="font-mono text-muted-foreground">{item.sku || '-'}</TableCell>
                                                            <TableCell className="text-right">{item.piezas_xcontenedor ?? '-'}</TableCell>
                                                            <TableCell>{item.bodega || '-'}</TableCell>
                                                            <TableCell className="text-right">{item.bloque ?? '-'}</TableCell>                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                        {totalPagesSkuM > 1 && renderInventoryPagination(pageSkuM, totalPagesSkuM, setPageSkuM)}
                                    </Card>
                                </TabsContent>

                                <TabsContent value="costos" className="mt-6 space-y-4">
                                    <div className="flex justify-end">
                                        <Dialog open={isCostoDialogOpen} onOpenChange={setIsCostoDialogOpen}>
                                            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nuevo Registro de Costo</Button></DialogTrigger>
                                            <DialogContent className="sm:max-w-xl">
                                                <DialogHeader><DialogTitle>Añadir Historial de Costo</DialogTitle><DialogDescription>Registra un nuevo landed cost para un SKU Madre (tabla sku_costos).</DialogDescription></DialogHeader>
                                                <form onSubmit={handleCostoSubmit} className="space-y-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2"><Label htmlFor="sku_mdr_c">SKU Madre</Label><Input id="sku_mdr_c" name="sku_mdr" required /></div>
                                                        <div className="space-y-2"><Label htmlFor="landed_cost">Landed Cost</Label><Input id="landed_cost" name="landed_cost" type="number" step="0.01" required /></div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2"><Label htmlFor="fecha_desde">Fecha Desde</Label><Input id="fecha_desde" name="fecha_desde" type="date" required defaultValue={format(new Date(), 'yyyy-MM-dd')} /></div>
                                                        <div className="space-y-2"><Label htmlFor="proveedor">Proveedor</Label><Input id="proveedor" name="proveedor" /></div>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-4">
                                                        <div className="space-y-2"><Label htmlFor="piezas_xcontenedor">Pzs x Cont.</Label><Input id="piezas_xcontenedor" name="piezas_xcontenedor" type="number" /></div>
                                                        <div className="space-y-2"><Label htmlFor="sku_c">SKU</Label><Input id="sku_c" name="sku" /></div>
                                                        <div className="space-y-2"><Label htmlFor="esti_time_c">T. Prep (min)</Label><Input id="esti_time_c" name="esti_time" type="number" /></div>
                                                    </div>
                                                    <DialogFooter><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Registrar Costo'}</Button></DialogFooter>
                                                </form>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Historial de Costos (Tabla sku_costos)</CardTitle>
                                            <CardDescription>Detalle de landed costs, proveedores y logística por fecha.</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>ID</TableHead>
                                                        <TableHead>SKU Madre</TableHead>
                                                        <TableHead className="text-right">Landed Cost</TableHead>
                                                        <TableHead>Fecha Desde</TableHead>
                                                        <TableHead>Proveedor</TableHead>
                                                        <TableHead className="text-right">Pzs x Cont.</TableHead>
                                                        <TableHead>SKU</TableHead>
                                                        <TableHead className="text-right">T. Prep</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {paginatedCostos.map((costo) => (
                                                        <TableRow key={costo.id}>
                                                            <TableCell className="text-xs text-muted-foreground">#{costo.id}</TableCell>
                                                            <TableCell className="font-mono font-medium">{costo.sku_mdr}</TableCell>
                                                            <TableCell className="text-right font-bold text-green-600">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(costo.landed_cost || 0)}</TableCell>
                                                            <TableCell className="text-xs">{costo.fecha_desde ? format(new Date(costo.fecha_desde), 'dd/MM/yyyy', { locale: es }) : '-'}</TableCell>
                                                            <TableCell>{costo.proveedor || '-'}</TableCell>
                                                            <TableCell className="text-right">{costo.piezas_xcontenedor ?? '-'}</TableCell>
                                                            <TableCell className="font-mono text-xs">{costo.sku || '-'}</TableCell>
                                                            <TableCell className="text-right">{costo.esti_time ?? '-'}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                        {totalPagesCostos > 1 && renderInventoryPagination(pageCostos, totalPagesCostos, setPageCostos)}
                                    </Card>
                                </TabsContent>

                                <TabsContent value="alternos" className="mt-6 space-y-4">
                                    <div className="flex justify-end">
                                        <Dialog open={isAlternoDialogOpen} onOpenChange={setIsAlternoDialogOpen}>
                                            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nueva Relación Alterna</Button></DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader><DialogTitle>Nueva Relación de SKU</DialogTitle><DialogDescription>Asocia un SKU adicional a un SKU Madre (tabla sku_alterno).</DialogDescription></DialogHeader>
                                                <form onSubmit={handleAlternoSubmit} className="space-y-4">
                                                    <div className="space-y-2"><Label htmlFor="sku_alt">SKU Alterno (PK)</Label><Input id="sku_alt" name="sku" required /></div>
                                                    <div className="space-y-2"><Label htmlFor="sku_mdr_alt">SKU Madre Relacionado</Label><Input id="sku_mdr_alt" name="sku_mdr" required /></div>
                                                    <DialogFooter><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar Relación'}</Button></DialogFooter>
                                                </form>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Relación de SKUs Alternos (Tabla sku_alterno)</CardTitle>
                                            <CardDescription>Mapeo de variaciones de publicación a sus respectivos SKUs Madre.</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>SKU Alterno</TableHead>
                                                        <TableHead>SKU Madre Relacionado</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {paginatedAlternos.map((item, index) => (
                                                        <TableRow key={`${item.sku}-${index}`}>
                                                            <TableCell className="font-mono">{item.sku}</TableCell>
                                                            <TableCell className="font-mono text-primary font-medium">{item.sku_mdr}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                        {totalPagesAlternos > 1 && renderInventoryPagination(pageAlternos, totalPagesAlternos, setPageAlternos)}
                                    </Card>
                                </TabsContent>
                            </Tabs>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
