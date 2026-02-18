'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, File as FileIcon, X, Loader2, Save, Search, Database, RefreshCcw, 
  Undo2, CheckCircle, AlertTriangle, Map as MapIcon, Sheet as SheetIcon, AlertCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
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
};

const IGNORE_COLUMN_VALUE = '--ignore-this-column--';
type Step = 'upload' | 'mapping' | 'analyzing' | 'syncing' | 'results';
type CsvRowObject = Record<string, any>;

function parseValue(key: string, value: any): any {
    if (value === undefined || value === null || String(value).trim() === '' || String(value).toLowerCase() === 'null') return null;
    const str = String(value).trim();
    
    const numericFields = ['monto', 'total', 'unidades', 'price', 'landed_cost', 'costo_envio', 'piezas_por_sku'];
    if (numericFields.includes(key)) {
        const num = parseFloat(str.replace(/,/g, '').replace(/[^0-9.-]/g, ''));
        return isNaN(num) ? null : num;
    }

    const booleanFields = ['negocio', 'venta_publicidad', 'revisado_por_ml', 'es_paquete_varios'];
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
            const match = schema.columns.find(c => c.toLowerCase() === h.toLowerCase().replace(/\s/g, '_'));
            map[i] = match || IGNORE_COLUMN_VALUE;
        });
        setHeaderMap(map);
        setCurrentStep('mapping');
    };

    const handleSync = async () => {
        setIsLoading(true);
        const schema = TABLE_SCHEMAS[selectedTable];
        let inserted = 0, updated = 0, errors: any[] = [];

        for (const row of rawRows) {
            const obj: any = {};
            headers.forEach((_, i) => {
                const col = headerMap[i];
                if (col !== IGNORE_COLUMN_VALUE) obj[col] = parseValue(col, row[i]);
            });

            const { error } = await supabase!.from(selectedTable).upsert(obj, { onConflict: schema.pk });
            if (error) errors.push({ row: obj, msg: error.message });
            else updated++;
        }

        setSyncResult({ inserted, updated, errors });
        setCurrentStep('results');
        setIsLoading(false);
    };

    return (
        <div className="w-full max-w-5xl mx-auto space-y-6">
            {currentStep === 'upload' && (
                <Card>
                    <CardHeader><CardTitle>Cargar Datos</CardTitle></CardHeader>
                    <CardContent>
                        <div className="border-2 border-dashed p-10 text-center rounded-lg" onClick={() => document.getElementById('file-input')?.click()}>
                            <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                            <p>Haz clic para subir CSV</p>
                            <input id="file-input" type="file" className="hidden" onChange={e => e.target.files && processFile(e.target.files[0])} />
                        </div>
                        {headers.length > 0 && (
                            <div className="mt-6">
                                <Label>Seleccionar Tabla de Destino</Label>
                                <Select onValueChange={handleTableSelect}>
                                    <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                                    <SelectContent>{Object.keys(TABLE_SCHEMAS).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {currentStep === 'mapping' && (
                <Card>
                    <CardHeader><CardTitle>Mapeo de Columnas</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>CSV</TableHead><TableHead>Base de Datos</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {headers.map((h, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{h}</TableCell>
                                        <TableCell>
                                            <Select value={headerMap[i]} onValueChange={v => setHeaderMap({...headerMap, [i]: v})}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value={IGNORE_COLUMN_VALUE}>Ignorar</SelectItem>
                                                    {TABLE_SCHEMAS[selectedTable].columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <CardFooter><Button onClick={handleSync} className="w-full" disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin" /> : 'Sincronizar Datos'}</Button></CardFooter>
                </Card>
            )}

            {currentStep === 'results' && syncResult && (
                <div className="space-y-4">
                    <Alert><CheckCircle className="h-4 w-4"/><AlertTitle>Proceso Completado</AlertTitle><AlertDescription>Insertados/Actualizados: {syncResult.updated}</AlertDescription></Alert>
                    {syncResult.errors.length > 0 && (
                        <Card className="border-destructive">
                            <CardHeader><CardTitle className="text-destructive">Errores Detectados</CardTitle></CardHeader>
                            <CardContent>
                                {syncResult.errors.map((e, i) => (
                                    <div key={i} className="flex gap-4 p-4 border rounded mb-2 bg-destructive/5">
                                        <div className="flex-1 text-xs text-destructive font-bold">{e.msg}</div>
                                        <div className="flex-1 font-mono text-[10px]">{JSON.stringify(e.row)}</div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                    <Button variant="outline" onClick={() => setCurrentStep('upload')}>Cargar otro archivo</Button>
                </div>
            )}
        </div>
    );
}