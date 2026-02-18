'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, File as FileIcon, X, Loader2, Save, Search, Database, RefreshCcw, 
  Undo2, CheckCircle, AlertTriangle, Map as MapIcon, Sheet as SheetIcon, AlertCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const TABLE_SCHEMAS: Record<string, { pk: string; columns: string[] }> = {
    finanzas: { pk: 'id', columns: ['id', 'fecha', 'empresa', 'categoria', 'subcategoria', 'monto', 'capturista', 'tipo_transaccion', 'metodo_pago', 'metodo_pago_especificar', 'banco', 'banco_especificar', 'cuenta', 'cuenta_especificar', 'descripcion', 'notas'] },
    finanzas2: { pk: 'id', columns: ['id', 'fecha', 'empresa', 'categoria', 'subcategoria', 'monto', 'capturista', 'tipo_transaccion', 'metodo_pago', 'metodo_pago_especificar', 'banco', 'banco_especificar', 'cuenta', 'cuenta_especificar', 'descripcion', 'notas'] },
    ventas: { pk: 'numero_venta', columns: [ 'numero_venta', 'fecha_venta', 'estado', 'descripcion_estado', 'es_paquete_varios', 'pertenece_kit', 'unidades', 'ingreso_productos', 'cargo_venta_impuestos', 'ingreso_envio', 'costo_envio', 'costo_medidas_peso', 'cargo_diferencia_peso', 'anulaciones_reembolsos', 'total', 'venta_publicidad', 'sku', 'item_id', 'company', 'title', 'variante', 'price', 'tipo_publicacion', 'factura_adjunta', 'datos_personales_empresa', 'tipo_numero_documento', 'direccion_fiscal', 'tipo_contribuyente', 'cfdi', 'tipo_usuario', 'regimen_fiscal', 'comprador', 'negocio', 'ife', 'domicilio_entrega', 'municipio_alcaldia', 'estado_comprador', 'codigo_postal', 'pais', 'forma_entrega_envio', 'fecha_en_camino_envio', 'fecha_entregado_envio', 'transportista_envio', 'numero_seguimiento_envio', 'url_seguimiento_envio', 'unidades_envio', 'forma_entrega', 'fecha_en_camino', 'fecha_entregado', 'transportista', 'numero_seguimiento', 'url_seguimiento', 'revisado_por_ml', 'fecha_revision', 'dinero_a_favor', 'resultado', 'destino', 'motivo_resultado', 'unidades_reclamo', 'reclamo_abierto', 'reclamo_cerrado', 'con_mediacion'] },
    sku_m: { pk: 'sku_mdr', columns: ['sku_mdr', 'cat_mdr', 'piezas_por_sku', 'sku', 'piezas_xcontenedor', 'bodega', 'bloque', 'landed_cost'] },
    diccionario_skus: { pk: 'sku', columns: ['sku', 'categoria_madre', 'landed_cost', 'codigo_en_siggo', 'nombre_en_siggo', 'rock_en_siggo', 'piezas_totales', 'estado_en_siggo', 'bodega', 'bloque'] },
    catalogo_madre: { pk: 'sku', columns: ['sku', 'nombre_madre', 'company'] },
    sku_costos: { pk: 'id', columns: ['id', 'sku_mdr', 'landed_cost', 'fecha_desde', 'proveedor', 'piezas_xcontenedor', 'sku', 'esti_time'] },
    sku_alterno: { pk: 'sku', columns: ['sku', 'sku_mdr'] },
    publi_tienda: { pk: 'num_publi', columns: ['num_publi', 'sku', 'num_producto', 'titulo', 'status', 'cat_mdr', 'costo', 'tienda', 'created_at'] },
};

const IGNORE_COLUMN_VALUE = '--ignore-this-column--';
type Step = 'upload' | 'mapping' | 'syncing' | 'results';

function parseValue(key: string, value: any): any {
    if (value === undefined || value === null || String(value).trim() === '' || String(value).toLowerCase() === 'null') return null;
    const str = String(value).trim();
    
    const numericFields = [
        'monto', 'total', 'unidades', 'price', 'landed_cost', 'costo_envio', 
        'piezas_por_sku', 'rock_en_siggo', 'piezas_totales', 'esti_time', 
        'piezas_xcontenedor', 'bloque', 'costo'
    ];
    
    if (numericFields.includes(key)) {
        const num = parseFloat(str.replace(/,/g, '').replace(/[^0-9.-]/g, ''));
        return isNaN(num) ? null : num;
    }

    const booleanFields = ['negocio', 'venta_publicidad', 'revisado_por_ml', 'es_paquete_varios', 'pertenece_kit', 'reclamo_abierto', 'reclamo_cerrado', 'con_mediacion'];
    if (booleanFields.includes(key)) {
        const v = str.toLowerCase();
        return ['true', '1', 'si', 'sí', 'verdadero'].includes(v);
    }

    return str;
}

export default function CsvUploader() {
    const { toast } = useToast();
    const [currentStep, setCurrentStep] = useState<Step>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [headers, setHeaders] = useState<string[]>([]);
    const [rawRows, setRawRows] = useState<string[][]>([]);
    const [selectedTable, setSelectedTable] = useState('');
    const [headerMap, setHeaderMap] = useState<Record<number, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [syncResult, setSyncResult] = useState<{inserted: number, updated: number, errors: any[]} | null>(null);

    const processFile = (f: File) => {
        setFile(f);
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const lines = text.split(/\r\n|\n/).filter(l => l.trim() !== '');
            if (lines.length === 0) {
                toast({ title: 'Archivo vacío', description: 'El archivo CSV no contiene datos.', variant: 'destructive' });
                return;
            }
            const rows = lines.map(line => line.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
            setHeaders(rows[0]);
            setRawRows(rows.slice(1));
            setCurrentStep('upload');
        };
        reader.readAsText(f, 'windows-1252');
    };

    const handleTableSelect = (table: string) => {
        setSelectedTable(table);
        const schema = TABLE_SCHEMAS[table];
        const map: Record<number, string> = {};
        headers.forEach((h, i) => {
            // Intento de auto-match por nombre
            const cleanHeader = h.toLowerCase().replace(/\s/g, '_');
            const match = schema.columns.find(c => c.toLowerCase() === cleanHeader);
            map[i] = match || IGNORE_COLUMN_VALUE;
        });
        setHeaderMap(map);
        setCurrentStep('mapping');
    };

    const handleSync = async () => {
        setIsLoading(true);
        const schema = TABLE_SCHEMAS[selectedTable];
        let processed = 0, errors: any[] = [];

        // Procesamiento por lotes pequeños para evitar timeouts en archivos grandes
        const BATCH_SIZE = 50;
        for (let i = 0; i < rawRows.length; i += BATCH_SIZE) {
            const batch = rawRows.slice(i, i + BATCH_SIZE);
            const records = batch.map(row => {
                const obj: any = {};
                headers.forEach((_, headerIndex) => {
                    const colName = headerMap[headerIndex];
                    if (colName !== IGNORE_COLUMN_VALUE) {
                        obj[colName] = parseValue(colName, row[headerIndex]);
                    }
                });
                return obj;
            });

            const { error } = await supabase!.from(selectedTable).upsert(records, { onConflict: schema.pk });
            
            if (error) {
                errors.push({ batch: i / BATCH_SIZE + 1, msg: error.message });
            } else {
                processed += records.length;
            }
        }

        setSyncResult({ inserted: 0, updated: processed, errors });
        setCurrentStep('results');
        setIsLoading(false);
    };

    return (
        <div className="w-full max-w-5xl mx-auto space-y-6">
            {currentStep === 'upload' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Cargar Datos</CardTitle>
                        <CardDescription>Sube un archivo CSV y selecciona la tabla de destino.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div 
                            className="border-2 border-dashed p-10 text-center rounded-lg hover:bg-muted/50 cursor-pointer transition-colors" 
                            onClick={() => document.getElementById('file-input')?.click()}
                        >
                            <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                            <p className="mt-2 font-medium">Haz clic para subir CSV o arrastra el archivo aquí</p>
                            <p className="text-xs text-muted-foreground mt-1">Formato recomendado: Windows-1252 (ANSI)</p>
                            <input id="file-input" type="file" className="hidden" accept=".csv" onChange={e => e.target.files && processFile(e.target.files[0])} />
                        </div>
                        
                        {file && (
                            <div className="mt-4 p-3 bg-primary/5 rounded-md flex items-center gap-3">
                                <FileIcon className="h-5 w-5 text-primary" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium">{file.name}</p>
                                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB • {rawRows.length} filas detectadas</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => { setFile(null); setHeaders([]); setRawRows([]); }}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}

                        {headers.length > 0 && (
                            <div className="mt-6 space-y-2">
                                <Label>Seleccionar Tabla de Destino</Label>
                                <Select onValueChange={handleTableSelect}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona una tabla para mapear..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ventas">Ventas (ml_sales)</SelectItem>
                                        <SelectItem value="finanzas">Egresos (Gastos/Compras)</SelectItem>
                                        <SelectItem value="finanzas2">Ingresos (Ventas/Otros)</SelectItem>
                                        <SelectItem value="sku_m">Categorías Madre (sku_m)</SelectItem>
                                        <SelectItem value="diccionario_skus">Diccionario SKU</SelectItem>
                                        <SelectItem value="catalogo_madre">Catálogo Madre</SelectItem>
                                        <SelectItem value="sku_costos">Historial de Costos</SelectItem>
                                        <SelectItem value="sku_alterno">SKUs Alternos</SelectItem>
                                        <SelectItem value="publi_tienda">Publicaciones de Tienda</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {currentStep === 'mapping' && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Mapeo de Columnas: {selectedTable}</CardTitle>
                            <CardDescription>Asocia las columnas de tu CSV con los campos de la base de datos.</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setCurrentStep('upload')}>
                            <RefreshCcw className="mr-2 h-4 w-4" /> Cambiar Tabla
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead>Columna en CSV</TableHead>
                                        <TableHead>Destino en Base de Datos</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {headers.map((h, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium">{h}</TableCell>
                                            <TableCell>
                                                <Select value={headerMap[i]} onValueChange={v => setHeaderMap({...headerMap, [i]: v})}>
                                                    <SelectTrigger className={cn("w-full", headerMap[i] === IGNORE_COLUMN_VALUE ? "text-muted-foreground opacity-60" : "text-primary font-bold")}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value={IGNORE_COLUMN_VALUE}>-- Ignorar esta columna --</SelectItem>
                                                        {TABLE_SCHEMAS[selectedTable].columns.map(c => (
                                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleSync} className="w-full h-12 text-lg" disabled={isLoading}>
                            {isLoading ? (
                                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sincronizando lotes...</>
                            ) : (
                                <><Database className="mr-2 h-5 w-5" /> Sincronizar {rawRows.length} registros</>
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {currentStep === 'results' && syncResult && (
                <div className="space-y-4">
                    <Alert className={cn(syncResult.errors.length > 0 ? "border-amber-500 bg-amber-50" : "border-green-500 bg-green-50")}>
                        <CheckCircle className={cn("h-4 w-4", syncResult.errors.length > 0 ? "text-amber-600" : "text-green-600")} />
                        <AlertTitle className="font-bold">Proceso Finalizado</AlertTitle>
                        <AlertDescription>
                            Se han procesado **{syncResult.updated}** registros correctamente en la tabla **{selectedTable}**.
                        </AlertDescription>
                    </Alert>

                    {syncResult.errors.length > 0 && (
                        <Card className="border-destructive">
                            <CardHeader className="bg-destructive/5">
                                <CardTitle className="text-destructive flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5" /> Errores de Sincronización
                                </CardTitle>
                                <CardDescription>Algunos lotes de datos fallaron al insertarse.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="space-y-2">
                                    {syncResult.errors.map((e, i) => (
                                        <div key={i} className="p-3 border rounded-md bg-muted/30 text-sm">
                                            <span className="font-bold">Lote #{e.batch}:</span> {e.msg}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    
                    <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => setCurrentStep('upload')}>
                            <Undo2 className="mr-2 h-4 w-4" /> Cargar otro archivo
                        </Button>
                        <Button className="flex-1" onClick={() => window.location.reload()}>
                            <RefreshCcw className="mr-2 h-4 w-4" /> Finalizar y Limpiar
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}