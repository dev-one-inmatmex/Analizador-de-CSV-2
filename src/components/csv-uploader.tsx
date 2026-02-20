'use client';

import React, { useState } from 'react';
import { 
  UploadCloud, File as FileIcon, X, Loader2, Database, RefreshCcw, 
  CheckCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

const TABLE_SCHEMAS: Record<string, { pk: string; columns: string[] }> = {
    gastos_diarios: { 
        pk: 'id', 
        columns: [
            'id', 'fecha', 'empresa', 'tipo_transaccion', 'tipo_gasto_impacto', 
            'area_funcional', 'categoria_macro', 'subcategoria_especifica', 
            'canal_asociado', 'clasificacion_operativa', 'es_fijo', 
            'es_recurrente', 'monto', 'metodo_pago', 'metodo_pago_especificar', 
            'banco', 'banco_especificar', 'cuenta', 'cuenta_especificar', 
            'responsable', 'descripcion', 'notas'
        ] 
    },
    ml_sales: { 
        pk: 'num_venta', 
        columns: [
            'num_venta', 'fecha_venta', 'status', 'desc_status', 'paquete_varios', 
            'pertenece_kit', 'unidades', 'ing_xunidad', 'cargo_venta', 'ing_xenvio', 
            'costo_envio', 'costo_enviomp', 'cargo_difpeso', 'anu_reembolsos', 'total', 
            'venta_xpublicidad', 'sku', 'num_publi', 'tienda', 'tit_pub', 'variante', 
            'price', 'tip_publi', 'factura_a', 'datos_poe', 'tipo_ndoc', 'direccion', 
            't_contribuyente', 'cfdi', 't_usuario', 'r_fiscal', 'comprador', 'negocio', 
            'ife', 'domicilio', 'mun_alcaldia', 'estado', 'c_postal', 'pais', 'f_entrega', 
            'f_camino', 'f_entregado', 'transportista', 'num_seguimiento', 'url_seguimiento', 
            'unidades_2', 'f_entrega2', 'f_camino2', 'f_entregado2', 'transportista2', 
            'num_seguimiento2', 'url_seguimiento2', 'revisado_xml', 'f_revision3', 
            'd_afavor', 'resultado', 'destino', 'motivo_resul', 'unidades_3', 
            'r_abierto', 'r_cerrado', 'c_mediacion'
        ] 
    },
    sku_m: { pk: 'sku_mdr', columns: ['sku_mdr', 'cat_mdr', 'piezas_por_sku', 'sku', 'piezas_xcontenedor', 'bodega', 'bloque', 'landed_cost'] },
    sku_costos: { pk: 'id', columns: ['id', 'sku_mdr', 'landed_cost', 'fecha_desde', 'proveedor', 'piezas_xcontenedor', 'sku', 'esti_time'] },
    sku_alterno: { pk: 'sku', columns: ['sku', 'sku_mdr'] },
    catalogo_madre: { pk: 'sku', columns: ['sku', 'nombre_madre', 'company'] },
    publi_tienda: { pk: 'num_publi', columns: ['num_publi', 'sku', 'num_producto', 'titulo', 'status', 'cat_mdr', 'costo', 'tienda'] },
};

const IGNORE_COLUMN_VALUE = '--ignore-this-column--';

function parseValue(key: string, value: any): any {
    if (value === undefined || value === null || String(value).trim() === '' || String(value).toLowerCase() === 'null') return null;
    const str = String(value).trim();
    
    const numericFields = [
        'monto', 'total', 'unidades', 'price', 'landed_cost', 'costo_envio', 
        'piezas_por_sku', 'rock_en_siggo', 'piezas_totales', 'esti_time', 
        'piezas_xcontenedor', 'bloque', 'costo', 'ing_xunidad', 'cargo_venta',
        'ing_xenvio', 'costo_enviomp', 'cargo_difpeso', 'anu_reembolsos', 'unidades_2', 'unidades_3'
    ];
    
    if (numericFields.includes(key)) {
        const num = parseFloat(str.replace(/,/g, '').replace(/[^0-9.-]/g, ''));
        return isNaN(num) ? null : num;
    }

    const booleanFields = [
        'negocio', 'venta_xpublicidad', 'paquete_varios', 'pertenece_kit', 
        'r_abierto', 'r_cerrado', 'c_mediacion', 'es_fijo', 'es_recurrente'
    ];
    if (booleanFields.includes(key)) {
        const v = str.toLowerCase();
        return ['true', '1', 'si', 'sí', 'verdadero'].includes(v);
    }

    return str;
}

export default function CsvUploader() {
    const { toast } = useToast();
    const [currentStep, setCurrentStep] = useState<'upload' | 'mapping' | 'syncing' | 'results'>('upload');
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
                errors.push({ batch: Math.floor(i / BATCH_SIZE) + 1, msg: error.message });
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
                    <CardHeader><CardTitle>Cargar Datos</CardTitle><CardDescription>Sube un archivo CSV y selecciona la tabla de destino.</CardDescription></CardHeader>
                    <CardContent>
                        <div className="border-2 border-dashed p-10 text-center rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => document.getElementById('file-input')?.click()}>
                            <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" /><p className="mt-2 font-medium">Sube tu archivo CSV aquí</p>
                            <input id="file-input" type="file" className="hidden" accept=".csv" onChange={e => e.target.files && processFile(e.target.files[0])} />
                        </div>
                        {file && <div className="mt-4 p-3 bg-primary/5 rounded-md flex items-center justify-between"><div className="flex items-center gap-3"><FileIcon className="h-5 w-5 text-primary" /><div><p className="text-sm font-medium">{file.name}</p><p className="text-xs text-muted-foreground">{rawRows.length} filas detectadas</p></div></div><Button variant="ghost" size="sm" onClick={() => { setFile(null); setHeaders([]); setRawRows([]); }}><X className="h-4 w-4" /></Button></div>}
                        {headers.length > 0 && (<div className="mt-6 space-y-2"><Label>Tabla de Destino</Label><Select onValueChange={handleTableSelect}><SelectTrigger><SelectValue placeholder="Selecciona la tabla..." /></SelectTrigger><SelectContent>
                            <SelectItem value="ml_sales">Ventas (ml_sales)</SelectItem>
                            <SelectItem value="gastos_diarios">Gastos Diarios (Finanzas)</SelectItem>
                            <SelectItem value="sku_m">SKU Maestro (sku_m)</SelectItem>
                            <SelectItem value="sku_costos">Historial de Costos</SelectItem>
                            <SelectItem value="catalogo_madre">Catálogo Madre</SelectItem>
                            <SelectItem value="publi_tienda">Publicaciones</SelectItem>
                        </SelectContent></Select></div>)}
                    </CardContent>
                </Card>
            )}
            {currentStep === 'mapping' && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>Mapeo de Columnas</CardTitle><CardDescription>Tabla: {selectedTable}</CardDescription></div><Button variant="outline" size="sm" onClick={() => setCurrentStep('upload')}>Cambiar Tabla</Button></CardHeader>
                    <CardContent className="border rounded-md"><Table><TableHeader className="bg-muted/50"><TableRow><TableHead>Columna CSV</TableHead><TableHead>Campo en Base de Datos</TableHead></TableRow></TableHeader><TableBody>
                        {headers.map((h, i) => (<TableRow key={i}><TableCell className="font-medium text-xs">{h}</TableCell><TableCell>
                            <Select value={headerMap[i]} onValueChange={v => setHeaderMap({...headerMap, [i]: v})}><SelectTrigger className={cn("h-8 text-[10px]", headerMap[i] === IGNORE_COLUMN_VALUE ? "opacity-50" : "font-bold text-primary")}><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value={IGNORE_COLUMN_VALUE}>-- Ignorar --</SelectItem>{TABLE_SCHEMAS[selectedTable].columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                        </TableCell></TableRow>))}
                    </TableBody></Table></CardContent>
                    <CardFooter><Button onClick={handleSync} className="w-full h-12" disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin mr-2" /> : <Database className="mr-2 h-4 w-4" />} Sincronizar Datos</Button></CardFooter>
                </Card>
            )}
            {currentStep === 'results' && syncResult && (
                <div className="space-y-4">
                    <Alert className="bg-green-50 border-green-500"><CheckCircle className="h-4 w-4 text-green-600" /><AlertTitle>Proceso Exitoso</AlertTitle><AlertDescription>Se han actualizado {syncResult.updated} registros en la tabla {selectedTable}.</AlertDescription></Alert>
                    <Button className="w-full" onClick={() => window.location.reload()}>Finalizar y Volver al Inicio</Button>
                </div>
            )}
        </div>
    );
}
