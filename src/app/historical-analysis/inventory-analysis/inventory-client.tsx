'use client';

import * as React from 'react';
import { Package, Layers, DollarSign, ArrowRightLeft, AlertTriangle, Loader2, Plus } from 'lucide-react';
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
import type { sku_m, sku_costos, sku_alterno } from '@/types/database';
import { format, parseISO } from 'date-fns';
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
    
    const [isSkuMDialogOpen, setIsSkuMDialogOpen] = React.useState(false);
    const [isCostoDialogOpen, setIsCostoDialogOpen] = React.useState(false);
    const [isAlternoDialogOpen, setIsAlternoDialogOpen] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    React.useEffect(() => { setIsClient(true); }, []);

    const { skuM, skuCostos, skusAlternos } = inventoryData;

    const inventoryKpis = React.useMemo(() => {
        const totalSkuM = skuM.length;
        const totalSkus = skuM.filter((s: sku_m) => !!s.sku).length;
        const totalAlternos = skusAlternos.length;
        const landedCosts = skuCostos.map((c: sku_costos) => c.landed_cost).filter((c): c is number => c !== null);
        const avgLandedCost = landedCosts.length > 0 ? landedCosts.reduce((a, b) => a + b, 0) / landedCosts.length : 0;
        return { totalSkuM, totalSkus, totalAlternos, avgLandedCost };
    }, [skuM, skuCostos, skusAlternos]);

    const renderPagination = (current: number, total: number, set: (p: number) => void) => (
        <CardFooter className="flex justify-between border-t p-4">
            <div className="text-xs text-muted-foreground">Página {current} de {total}</div>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => set(Math.max(1, current - 1))} disabled={current === 1}>Ant.</Button>
                <Button variant="outline" size="sm" onClick={() => set(Math.min(total, current + 1))} disabled={current === total}>Sig.</Button>
            </div>
        </CardFooter>
    );

    const handleForm = async (e: React.FormEvent<HTMLFormElement>, action: Function, close: Function) => {
        e.preventDefault();
        setIsSubmitting(true);
        const fd = new FormData(e.currentTarget);
        const data = Object.fromEntries(fd.entries());
        
        // Conversión de tipos numérica
        ['piezas_por_sku', 'piezas_xcontenedor', 'bloque', 'landed_cost', 'esti_time'].forEach(key => {
            if (data[key]) data[key] = Number(data[key]);
        });

        const res = await action(data);
        setIsSubmitting(false);
        if (res.error) toast({ title: 'Error', description: res.error, variant: 'destructive' });
        else {
            toast({ title: 'Éxito', description: 'Registro guardado.' });
            close(false);
        }
    };

    if (!isClient) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="flex min-h-screen flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6">
                <div className="flex items-center gap-4">
                    <SidebarTrigger />
                    <h1 className="text-xl font-bold">Gestión de SKUs & Inventario</h1>
                </div>
            </header>

            <main className="p-4 md:p-8 space-y-6">
                {inventoryData.error ? (
                    <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{inventoryData.error}</AlertDescription></Alert>
                ) : (
                    <>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card><CardHeader className="pb-2 text-xs font-bold uppercase text-muted-foreground">Catálogos Maestro</CardHeader><CardContent><div className="text-2xl font-black">{inventoryKpis.totalSkuM}</div></CardContent></Card>
                            <Card><CardHeader className="pb-2 text-xs font-bold uppercase text-muted-foreground">SKUs Vinculados</CardHeader><CardContent><div className="text-2xl font-black">{inventoryKpis.totalSkus}</div></CardContent></Card>
                            <Card><CardHeader className="pb-2 text-xs font-bold uppercase text-muted-foreground">SKUs Alternos</CardHeader><CardContent><div className="text-2xl font-black">{inventoryKpis.totalAlternos}</div></CardContent></Card>
                            <Card><CardHeader className="pb-2 text-xs font-bold uppercase text-muted-foreground">Costo Promedio</CardHeader><CardContent><div className="text-2xl font-black text-primary">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(inventoryKpis.avgLandedCost)}</div></CardContent></Card>
                        </div>

                        <Tabs defaultValue="maestro">
                            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-6">
                                <TabsTrigger value="maestro" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-2 font-bold uppercase tracking-widest text-[10px]">Catálogo Maestro</TabsTrigger>
                                <TabsTrigger value="costos" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-2 font-bold uppercase tracking-widest text-[10px]">Historial Costos</TabsTrigger>
                                <TabsTrigger value="alternos" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-2 font-bold uppercase tracking-widest text-[10px]">Relaciones Alternas</TabsTrigger>
                            </TabsList>

                            <TabsContent value="maestro" className="mt-6 space-y-4">
                                <div className="flex justify-end">
                                    <Dialog open={isSkuMDialogOpen} onOpenChange={setIsSkuMDialogOpen}>
                                        <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> Nuevo SKU Maestro</Button></DialogTrigger>
                                        <DialogContent className="sm:max-w-xl">
                                            <form onSubmit={(e) => handleForm(e, addSkuM, setIsSkuMDialogOpen)} className="space-y-4">
                                                <DialogHeader><DialogTitle>Añadir SKU Maestro (sku_m)</DialogTitle></DialogHeader>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2"><Label>SKU Madre (ID)</Label><Input name="sku_mdr" required /></div>
                                                    <div className="space-y-2"><Label>Categoría Madre</Label><Input name="cat_mdr" /></div>
                                                    <div className="space-y-2"><Label>Pzs x SKU</Label><Input name="piezas_por_sku" type="number" /></div>
                                                    <div className="space-y-2"><Label>SKU Siggo</Label><Input name="sku" /></div>
                                                    <div className="space-y-2"><Label>Landed Cost</Label><Input name="landed_cost" type="number" step="0.01" /></div>
                                                    <div className="space-y-2"><Label>Pzs x Contenedor</Label><Input name="piezas_xcontenedor" type="number" /></div>
                                                </div>
                                                <DialogFooter><Button type="submit" disabled={isSubmitting}>Guardar</Button></DialogFooter>
                                            </form>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                <Card className="border-none shadow-sm overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-muted/50"><TableRow>
                                            <TableHead>SKU Madre</TableHead>
                                            <TableHead>Categoría</TableHead>
                                            <TableHead>Costo</TableHead>
                                            <TableHead>Siggo</TableHead>
                                            <TableHead>Ubicación</TableHead>
                                        </TableRow></TableHeader>
                                        <TableBody>
                                            {skuM.slice((pageSkuM-1)*10, pageSkuM*10).map((s: sku_m) => (
                                                <TableRow key={s.sku_mdr}>
                                                    <TableCell className="font-mono font-bold text-primary">{s.sku_mdr}</TableCell>
                                                    <TableCell className="text-xs uppercase">{s.cat_mdr}</TableCell>
                                                    <TableCell className="font-bold text-green-600">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(s.landed_cost)}</TableCell>
                                                    <TableCell className="font-mono text-[10px]">{s.sku || '-'}</TableCell>
                                                    <TableCell className="text-[10px]">{s.bodega} / B:{s.bloque}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    {renderPagination(pageSkuM, Math.ceil(skuM.length/10), setPageSkuM)}
                                </Card>
                            </TabsContent>

                            <TabsContent value="costos" className="mt-6 space-y-4">
                                <div className="flex justify-end">
                                    <Dialog open={isCostoDialogOpen} onOpenChange={setIsCostoDialogOpen}>
                                        <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> Registrar Costo</Button></DialogTrigger>
                                        <DialogContent>
                                            <form onSubmit={(e) => handleForm(e, addSkuCosto, setIsCostoDialogOpen)} className="space-y-4">
                                                <DialogHeader><DialogTitle>Historial de Landed Cost (sku_costos)</DialogTitle></DialogHeader>
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2"><Label>SKU Madre</Label><Input name="sku_mdr" required /></div>
                                                        <div className="space-y-2"><Label>Landed Cost</Label><Input name="landed_cost" type="number" step="0.01" required /></div>
                                                    </div>
                                                    <div className="space-y-2"><Label>Fecha Desde</Label><Input name="fecha_desde" type="date" required defaultValue={format(new Date(), 'yyyy-MM-dd')} /></div>
                                                    <div className="space-y-2"><Label>Proveedor</Label><Input name="proveedor" /></div>
                                                </div>
                                                <DialogFooter><Button type="submit" disabled={isSubmitting}>Registrar</Button></DialogFooter>
                                            </form>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                <Card className="border-none shadow-sm overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-muted/50"><TableRow>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>SKU Madre</TableHead>
                                            <TableHead>Costo</TableHead>
                                            <TableHead>Proveedor</TableHead>
                                            <TableHead>T. Prep</TableHead>
                                        </TableRow></TableHeader>
                                        <TableBody>
                                            {skuCostos.slice((pageCostos-1)*10, pageCostos*10).map((c: sku_costos) => (
                                                <TableRow key={c.id}>
                                                    <TableCell className="text-[10px]">{c.fecha_desde ? format(parseISO(c.fecha_desde), 'dd/MM/yyyy') : '-'}</TableCell>
                                                    <TableCell className="font-mono font-bold">{c.sku_mdr}</TableCell>
                                                    <TableCell className="font-black text-primary">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(c.landed_cost)}</TableCell>
                                                    <TableCell className="text-[10px] uppercase">{c.proveedor || '-'}</TableCell>
                                                    <TableCell className="text-xs">{c.esti_time}m</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    {renderPagination(pageCostos, Math.ceil(skuCostos.length/10), setPageCostos)}
                                </Card>
                            </TabsContent>

                            <TabsContent value="alternos" className="mt-6 space-y-4">
                                <div className="flex justify-end">
                                    <Dialog open={isAlternoDialogOpen} onOpenChange={setIsAlternoDialogOpen}>
                                        <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> Vincular Alterno</Button></DialogTrigger>
                                        <DialogContent>
                                            <form onSubmit={(e) => handleForm(e, addSkuAlterno, setIsAlternoDialogOpen)} className="space-y-4">
                                                <DialogHeader><DialogTitle>Relación SKU Alterno (sku_alterno)</DialogTitle></DialogHeader>
                                                <div className="space-y-4">
                                                    <div className="space-y-2"><Label>SKU Alterno (Publicación)</Label><Input name="sku" required /></div>
                                                    <div className="space-y-2"><Label>SKU Maestro Relacionado</Label><Input name="sku_mdr" required /></div>
                                                </div>
                                                <DialogFooter><Button type="submit" disabled={isSubmitting}>Vincular</Button></DialogFooter>
                                            </form>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                <Card className="border-none shadow-sm overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-muted/50"><TableRow>
                                            <TableHead>SKU Alterno (Key)</TableHead>
                                            <TableHead>SKU Maestro Vinculado</TableHead>
                                        </TableRow></TableHeader>
                                        <TableBody>
                                            {skusAlternos.slice((pageAlternos-1)*10, pageAlternos*10).map((a: sku_alterno) => (
                                                <TableRow key={a.sku}>
                                                    <TableCell className="font-mono">{a.sku}</TableCell>
                                                    <TableCell className="font-mono font-bold text-primary">{a.sku_mdr}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    {renderPagination(pageAlternos, Math.ceil(skusAlternos.length/10), setPageAlternos)}
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </>
                )}
            </main>
        </div>
    );
}