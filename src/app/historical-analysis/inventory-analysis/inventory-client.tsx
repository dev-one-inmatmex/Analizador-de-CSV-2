'use client';

import * as React from 'react';
import { Package, Layers, DollarSign, ArrowRightLeft, AlertTriangle, Loader2, Plus, Home, MapPin, Calendar as CalendarIcon, Clock, Warehouse } from 'lucide-react';
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

const PAGE_SIZE = 15;

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

    const money = (v?: number | null) => v === null || v === undefined ? '$0.00' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);

    const renderPagination = (current: number, total: number, set: (p: number) => void) => (
        <CardFooter className="flex justify-between border-t p-4 bg-muted/5">
            <div className="text-xs text-muted-foreground font-medium">Página {current} de {total}</div>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => set(Math.max(1, current - 1))} disabled={current === 1}>Anterior</Button>
                <Button variant="outline" size="sm" onClick={() => set(Math.min(total, current + 1))} disabled={current === total}>Siguiente</Button>
            </div>
        </CardFooter>
    );

    const handleForm = async (e: React.FormEvent<HTMLFormElement>, action: Function, close: Function) => {
        e.preventDefault();
        setIsSubmitting(true);
        const fd = new FormData(e.currentTarget);
        const data: Record<string, any> = Object.fromEntries(fd.entries());
        
        // Conversión de tipos numérica
        ['piezas_por_sku', 'piezas_xcontenedor', 'bloque', 'landed_cost', 'esti_time'].forEach(key => {
            if (data[key]) data[key] = Number(data[key]);
        });

        const res = await action(data);
        setIsSubmitting(false);
        if (res.error) toast({ title: 'Error', description: res.error, variant: 'destructive' });
        else {
            toast({ title: 'Éxito', description: 'Registro guardado correctamente.' });
            close(false);
        }
    };

    if (!isClient) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="flex min-h-screen flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6">
                <div className="flex items-center gap-4">
                    <SidebarTrigger />
                    <h1 className="text-xl font-bold uppercase tracking-tight">Gestión de skus</h1>
                </div>
            </header>

            <main className="p-4 md:p-8 space-y-6">
                {inventoryData.error ? (
                    <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error de Conexión</AlertTitle><AlertDescription>{inventoryData.error}</AlertDescription></Alert>
                ) : (
                    <>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card className="border-none shadow-sm"><CardHeader className="pb-2 text-[10px] font-bold uppercase text-muted-foreground tracking-widest">SKUs Maestros</CardHeader><CardContent><div className="text-3xl font-black">{inventoryKpis.totalSkuM}</div></CardContent></Card>
                            <Card className="border-none shadow-sm"><CardHeader className="pb-2 text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Vínculos Siggo</CardHeader><CardContent><div className="text-3xl font-black">{inventoryKpis.totalSkus}</div></CardContent></Card>
                            <Card className="border-none shadow-sm"><CardHeader className="pb-2 text-[10px] font-bold uppercase text-muted-foreground tracking-widest">SKUs Alternos</CardHeader><CardContent><div className="text-3xl font-black">{inventoryKpis.totalAlternos}</div></CardContent></Card>
                            <Card className="border-none shadow-sm"><CardHeader className="pb-2 text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Costo Ponderado</CardHeader><CardContent><div className="text-3xl font-black text-primary">{money(inventoryKpis.avgLandedCost)}</div></CardContent></Card>
                        </div>

                        <Tabs defaultValue="maestro" className="w-full">
                            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-8">
                                <TabsTrigger value="maestro" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-3 font-bold uppercase tracking-tighter text-xs">1. Catálogo Maestro (sku_m)</TabsTrigger>
                                <TabsTrigger value="costos" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-3 font-bold uppercase tracking-tighter text-xs">2. Historial de Costos (sku_costos)</TabsTrigger>
                                <TabsTrigger value="alternos" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-3 font-bold uppercase tracking-tighter text-xs">3. Relaciones Alternas (sku_alterno)</TabsTrigger>
                            </TabsList>

                            <TabsContent value="maestro" className="mt-6 space-y-4">
                                <div className="flex justify-end">
                                    <Dialog open={isSkuMDialogOpen} onOpenChange={setIsSkuMDialogOpen}>
                                        <DialogTrigger asChild><Button size="sm" className="bg-[#2D5A4C] hover:bg-[#24483D] font-bold"><Plus className="mr-2 h-4 w-4" /> Nuevo SKU Maestro</Button></DialogTrigger>
                                        <DialogContent className="sm:max-w-2xl">
                                            <form onSubmit={(e) => handleForm(e, addSkuM, setIsSkuMDialogOpen)} className="space-y-4">
                                                <DialogHeader><DialogTitle className="text-2xl font-black uppercase tracking-tighter">Añadir SKU Maestro</DialogTitle><DialogDescription>Define las propiedades base del producto en la tabla sku_m.</DialogDescription></DialogHeader>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2"><Label className="text-[10px] font-bold uppercase">SKU Madre (ID)</Label><Input name="sku_mdr" required placeholder="Ej: MX-MALLA-100" /></div>
                                                    <div className="space-y-2"><Label className="text-[10px] font-bold uppercase">Categoría Madre</Label><Input name="cat_mdr" placeholder="Ej: Malla Sombra" /></div>
                                                    <div className="space-y-2"><Label className="text-[10px] font-bold uppercase">Piezas por SKU</Label><Input name="piezas_por_sku" type="number" placeholder="1" /></div>
                                                    <div className="space-y-2"><Label className="text-[10px] font-bold uppercase">SKU Siggo</Label><Input name="sku" placeholder="Código Siggo" /></div>
                                                    <div className="space-y-2"><Label className="text-[10px] font-bold uppercase">Landed Cost Actual</Label><Input name="landed_cost" type="number" step="0.01" required placeholder="0.00" /></div>
                                                    <div className="space-y-2"><Label className="text-[10px] font-bold uppercase">Pzs por Contenedor</Label><Input name="piezas_xcontenedor" type="number" /></div>
                                                    <div className="space-y-2"><Label className="text-[10px] font-bold uppercase">Bodega</Label><Input name="bodega" placeholder="Nombre bodega" /></div>
                                                    <div className="space-y-2"><Label className="text-[10px] font-bold uppercase">Bloque</Label><Input name="bloque" type="number" placeholder="1" /></div>
                                                </div>
                                                <DialogFooter><Button type="submit" disabled={isSubmitting} className="w-full font-bold">Guardar SKU Maestro</Button></DialogFooter>
                                            </form>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                <Card className="border-none shadow-sm overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-muted/50"><TableRow className="h-12">
                                                <TableHead className="font-bold uppercase text-[10px] whitespace-nowrap">SKU Madre</TableHead>
                                                <TableHead className="font-bold uppercase text-[10px] whitespace-nowrap">Categoría</TableHead>
                                                <TableHead className="font-bold uppercase text-[10px] whitespace-nowrap text-center">Pzs x SKU</TableHead>
                                                <TableHead className="font-bold uppercase text-[10px] whitespace-nowrap">SKU Siggo</TableHead>
                                                <TableHead className="font-bold uppercase text-[10px] whitespace-nowrap text-center">Pzs Cont.</TableHead>
                                                <TableHead className="font-bold uppercase text-[10px] whitespace-nowrap">Bodega</TableHead>
                                                <TableHead className="font-bold uppercase text-[10px] whitespace-nowrap text-center">Bloque</TableHead>
                                                <TableHead className="font-bold uppercase text-[10px] whitespace-nowrap text-right">Landed Cost</TableHead>
                                            </TableRow></TableHeader>
                                            <TableBody>
                                                {skuM.slice((pageSkuM-1)*PAGE_SIZE, pageSkuM*PAGE_SIZE).map((s: sku_m) => (
                                                    <TableRow key={s.sku_mdr} className="h-12 hover:bg-muted/30">
                                                        <TableCell className="font-mono font-bold text-primary text-xs">{s.sku_mdr}</TableCell>
                                                        <TableCell className="text-[10px] uppercase font-medium">{s.cat_mdr || '-'}</TableCell>
                                                        <TableCell className="text-center font-bold">{s.piezas_por_sku || 0}</TableCell>
                                                        <TableCell className="font-mono text-[10px] text-muted-foreground">{s.sku || '-'}</TableCell>
                                                        <TableCell className="text-center">{s.piezas_xcontenedor || '-'}</TableCell>
                                                        <TableCell className="text-[10px] uppercase">{s.bodega || '-'}</TableCell>
                                                        <TableCell className="text-center font-bold text-orange-600">{s.bloque || '-'}</TableCell>
                                                        <TableCell className="text-right font-black text-primary">{money(s.landed_cost)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    {renderPagination(pageSkuM, Math.ceil(skuM.length/PAGE_SIZE), setPageSkuM)}
                                </Card>
                            </TabsContent>

                            <TabsContent value="costos" className="mt-6 space-y-4">
                                <div className="flex justify-end">
                                    <Dialog open={isCostoDialogOpen} onOpenChange={setIsCostoDialogOpen}>
                                        <DialogTrigger asChild><Button size="sm" className="bg-[#2D5A4C] hover:bg-[#24483D] font-bold"><Plus className="mr-2 h-4 w-4" /> Registrar Costo</Button></DialogTrigger>
                                        <DialogContent className="sm:max-w-xl">
                                            <form onSubmit={(e) => handleForm(e, addSkuCosto, setIsCostoDialogOpen)} className="space-y-4">
                                                <DialogHeader><DialogTitle className="text-2xl font-black uppercase tracking-tighter">Historial de Landed Cost</DialogTitle><DialogDescription>Registra una nueva entrada de costo para auditoría histórica.</DialogDescription></DialogHeader>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2 col-span-2"><Label className="text-[10px] font-bold uppercase">SKU Madre</Label><Input name="sku_mdr" required placeholder="MX-..." /></div>
                                                    <div className="space-y-2"><Label className="text-[10px] font-bold uppercase">Landed Cost ($)</Label><Input name="landed_cost" type="number" step="0.01" required /></div>
                                                    <div className="space-y-2"><Label className="text-[10px] font-bold uppercase">Fecha Vigencia</Label><Input name="fecha_desde" type="date" required defaultValue={format(new Date(), 'yyyy-MM-dd')} /></div>
                                                    <div className="space-y-2"><Label className="text-[10px] font-bold uppercase">Proveedor</Label><Input name="proveedor" placeholder="Nombre proveedor" /></div>
                                                    <div className="space-y-2"><Label className="text-[10px] font-bold uppercase">Pzs por Contenedor</Label><Input name="piezas_xcontenedor" type="number" /></div>
                                                    <div className="space-y-2"><Label className="text-[10px] font-bold uppercase">SKU Específico</Label><Input name="sku" /></div>
                                                    <div className="space-y-2"><Label className="text-[10px] font-bold uppercase">Esti Time (Meses)</Label><Input name="esti_time" type="number" placeholder="3" /></div>
                                                </div>
                                                <DialogFooter><Button type="submit" disabled={isSubmitting} className="w-full font-bold">Registrar Historial</Button></DialogFooter>
                                            </form>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                <Card className="border-none shadow-sm overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-muted/50"><TableRow className="h-12">
                                                <TableHead className="font-bold uppercase text-[10px]">Fecha</TableHead>
                                                <TableHead className="font-bold uppercase text-[10px]">SKU Madre</TableHead>
                                                <TableHead className="font-bold uppercase text-[10px] text-right">Landed Cost</TableHead>
                                                <TableHead className="font-bold uppercase text-[10px]">Proveedor</TableHead>
                                                <TableHead className="font-bold uppercase text-[10px] text-center">Pzs Cont.</TableHead>
                                                <TableHead className="font-bold uppercase text-[10px]">SKU Siggo</TableHead>
                                                <TableHead className="font-bold uppercase text-[10px] text-center">Esti Time</TableHead>
                                            </TableRow></TableHeader>
                                            <TableBody>
                                                {skuCostos.slice((pageCostos-1)*PAGE_SIZE, pageCostos*PAGE_SIZE).map((c: sku_costos) => (
                                                    <TableRow key={c.id} className="h-12 hover:bg-muted/30">
                                                        <TableCell className="text-[10px] font-medium">{c.fecha_desde ? format(parseISO(c.fecha_desde), 'dd/MM/yyyy') : '-'}</TableCell>
                                                        <TableCell className="font-mono font-bold text-xs">{c.sku_mdr}</TableCell>
                                                        <TableCell className="text-right font-black text-primary">{money(c.landed_cost)}</TableCell>
                                                        <TableCell className="text-[10px] uppercase text-muted-foreground">{c.proveedor || '-'}</TableCell>
                                                        <TableCell className="text-center">{c.piezas_xcontenedor || '-'}</TableCell>
                                                        <TableCell className="font-mono text-[10px]">{c.sku || '-'}</TableCell>
                                                        <TableCell className="text-center text-xs font-bold text-blue-600">{c.esti_time ? `${c.esti_time}m` : '-'}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    {renderPagination(pageCostos, Math.ceil(skuCostos.length/PAGE_SIZE), setPageCostos)}
                                </Card>
                            </TabsContent>

                            <TabsContent value="alternos" className="mt-6 space-y-4">
                                <div className="flex justify-end">
                                    <Dialog open={isAlternoDialogOpen} onOpenChange={setIsAlternoDialogOpen}>
                                        <DialogTrigger asChild><Button size="sm" className="bg-[#2D5A4C] hover:bg-[#24483D] font-bold"><Plus className="mr-2 h-4 w-4" /> Vincular Alterno</Button></DialogTrigger>
                                        <DialogContent>
                                            <form onSubmit={(e) => handleForm(e, addSkuAlterno, setIsAlternoDialogOpen)} className="space-y-4">
                                                <DialogHeader><DialogTitle className="text-2xl font-black uppercase tracking-tighter">Relación SKU Alterno</DialogTitle><DialogDescription>Vincula un SKU de publicación al catálogo maestro.</DialogDescription></DialogHeader>
                                                <div className="space-y-4">
                                                    <div className="space-y-2"><Label className="text-[10px] font-bold uppercase">SKU Alterno (Publicación)</Label><Input name="sku" required placeholder="Ej: PUB-001" /></div>
                                                    <div className="space-y-2"><Label className="text-[10px] font-bold uppercase">SKU Maestro Vinculado</Label><Input name="sku_mdr" required placeholder="Ej: MX-..." /></div>
                                                </div>
                                                <DialogFooter><Button type="submit" disabled={isSubmitting} className="w-full font-bold">Vincular SKUs</Button></DialogFooter>
                                            </form>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                <Card className="border-none shadow-sm overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-muted/50"><TableRow className="h-12">
                                                <TableHead className="font-bold uppercase text-[10px]">SKU Alterno (Publicación)</TableHead>
                                                <TableHead className="font-bold uppercase text-[10px]">SKU Maestro Vinculado (sku_mdr)</TableHead>
                                            </TableRow></TableHeader>
                                            <TableBody>
                                                {skusAlternos.slice((pageAlternos-1)*PAGE_SIZE, pageAlternos*PAGE_SIZE).map((a: sku_alterno) => (
                                                    <TableRow key={a.sku} className="h-12 hover:bg-muted/30">
                                                        <TableCell className="font-mono text-xs">{a.sku}</TableCell>
                                                        <TableCell className="font-mono font-bold text-primary text-xs">{a.sku_mdr || '-'}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    {renderPagination(pageAlternos, Math.ceil(skusAlternos.length/PAGE_SIZE), setPageAlternos)}
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </>
                )}
            </main>
        </div>
    );
}
