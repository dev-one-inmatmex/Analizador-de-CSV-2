'use client';

import React, { useState } from 'react';
import { 
  UploadCloud, File as FileIcon, X, Loader2, Database, RefreshCcw, 
  CheckCircle, FileSpreadsheet, Layers
} from 'lucide-react';
import * as XLSX from 'xlsx';
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
    const [currentStep, setCurrentStep] = useState<'upload' | 'sheet-selection' | 'mapping' | 'syncing' | 'results'>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
    const [sheets, setSheets] = useState<string[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [rawRows, setRawRows] = useState<any[][]>([]);
    const [selectedTable, setSelectedTable] = useState('');
    const [headerMap, setHeaderMap] = useState<Record<number, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [syncResult, setSyncResult] = useState<{inserted: number, updated: number, errors: any[]} | null>(null);

    const processFile = (f: File) => {
        setFile(f);
        const isExcel = f.name.endsWith('.xlsx') || f.name.endsWith('.xls');
        
        if (isExcel) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const wb = XLSX.read(data, { type: 'array' });
                setWorkbook(wb);
                setSheets(wb.SheetNames);
                setCurrentStep('sheet-selection');
            };
            reader.readAsArrayBuffer(f);
        } else {
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
        }
    };

    const handleSheetSelect = (sheetName: string) => {
        if (!workbook) return;
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        if (json.length === 0) {
            toast({ title: 'Hoja vacía', description: 'La página seleccionada no tiene datos.', variant: 'destructive' });
            return;
        }
        setHeaders(json[0].map(h => String(h)));
        setRawRows(json.slice(1));
        setCurrentStep('upload');
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

    const reset = () => {
        setFile(null);
        setWorkbook(null);
        setSheets([]);
        setHeaders([]);
        setRawRows([]);
        setCurrentStep('upload');
    };

    return (
        <div className="w-full max-w-5xl mx-auto space-y-6">
            {currentStep === 'upload' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Cargar Datos</CardTitle>
                        <CardDescription>Sube un archivo CSV o Excel para sincronizar con la base de datos.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!file ? (
                            <div className="border-2 border-dashed p-10 text-center rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => document.getElementById('file-input')?.click()}>
                                <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                                <p className="mt-2 font-medium">Sube tu archivo CSV o Excel aquí</p>
                                <p className="text-xs text-muted-foreground">Formatos compatibles: .csv, .xlsx, .xls</p>
                                <input id="file-input" type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={e => e.target.files && processFile(e.target.files[0])} />
                            </div>
                        ) : (
                            <div className="p-4 bg-primary/5 border rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {file.name.endsWith('.csv') ? <FileIcon className="h-8 w-8 text-primary" /> : <FileSpreadsheet className="h-8 w-8 text-green-600" />}
                                    <div>
                                        <p className="font-bold text-sm">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">{rawRows.length} filas procesadas</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={reset}><X className="h-4 w-4" /></Button>
                            </div>
                        )}

                        {headers.length > 0 && (
                            <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-top-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tabla de Destino</Label>
                                    <Select onValueChange={handleTableSelect}>
                                        <SelectTrigger className="h-12 border-slate-200"><SelectValue placeholder="Selecciona la tabla para sincronizar..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ml_sales" className="font-bold">Ventas (ml_sales)</SelectItem>
                                            <SelectItem value="gastos_diarios" className="font-bold">Gastos Diarios (Finanzas)</SelectItem>
                                            <SelectItem value="sku_m" className="font-bold">SKU Maestro (sku_m)</SelectItem>
                                            <SelectItem value="sku_costos" className="font-bold">Historial de Costos</SelectItem>
                                            <SelectItem value="catalogo_madre" className="font-bold">Catálogo Madre</SelectItem>
                                            <SelectItem value="publi_tienda" className="font-bold">Publicaciones</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {currentStep === 'sheet-selection' && (
                <Card className="animate-in zoom-in-95 duration-200">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <Layers className="h-8 w-8 text-primary" />
                        <div>
                            <CardTitle>Selección de Página</CardTitle>
                            <CardDescription>El archivo Excel tiene varias hojas. Elige cuál deseas convertir para el mapeo.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {sheets.map((sheet) => (
                            <Button 
                                key={sheet} 
                                variant="outline" 
                                className="h-20 flex flex-col gap-1 border-slate-200 hover:border-primary hover:bg-primary/5 transition-all"
                                onClick={() => handleSheetSelect(sheet)}
                            >
                                <span className="font-black text-xs truncate w-full">{sheet}</span>
                                <span className="text-[10px] text-muted-foreground uppercase">Haga clic para extraer</span>
                            </Button>
                        ))}
                    </CardContent>
                    <CardFooter className="bg-muted/10">
                        <Button variant="ghost" size="sm" onClick={reset} className="text-xs font-bold text-muted-foreground">
                            <RefreshCcw className="mr-2 h-3 w-3" /> Cancelar y subir otro
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {currentStep === 'mapping' && (
                <Card className="animate-in fade-in duration-300">
                    <CardHeader className="flex flex-row items-center justify-between border-b pb-6">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className="bg-primary/10 text-primary uppercase text-[9px] font-black tracking-widest">Fase de Mapeo</Badge>
                                <CardTitle>Configurar Columnas</CardTitle>
                            </div>
                            <CardDescription>Relaciona las columnas del archivo con los campos de <strong>{selectedTable}</strong>.</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setCurrentStep('upload')} className="font-bold text-[10px] uppercase">Cambiar Tabla</Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest w-1/2">Columna del Archivo</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Campo en Base de Datos</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {headers.map((h, i) => (
                                    <TableRow key={i} className="hover:bg-muted/5 h-14">
                                        <TableCell className="font-bold text-xs">{h}</TableCell>
                                        <TableCell>
                                            <Select value={headerMap[i]} onValueChange={v => setHeaderMap({...headerMap, [i]: v})}>
                                                <SelectTrigger className={cn("h-9 text-[11px]", headerMap[i] === IGNORE_COLUMN_VALUE ? "opacity-40" : "font-black text-primary border-primary/30")}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value={IGNORE_COLUMN_VALUE} className="text-xs italic">-- IGNORAR ESTA COLUMNA --</SelectItem>
                                                    {TABLE_SCHEMAS[selectedTable].columns.map(c => (
                                                        <SelectItem key={c} value={c} className="text-xs font-medium uppercase">{c.replace(/_/g, ' ')}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <CardFooter className="p-6 border-t bg-muted/5">
                        <Button onClick={handleSync} className="w-full h-14 font-black uppercase tracking-widest" disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin mr-3 h-5 w-5" /> : <Database className="mr-3 h-5 w-5" />}
                            Iniciar Sincronización Directa
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {currentStep === 'results' && syncResult && (
                <div className="space-y-6 animate-in zoom-in-95 duration-300">
                    <Alert className="bg-[#2D5A4C]/10 border-[#2D5A4C]/30 p-8">
                        <CheckCircle className="h-8 w-8 text-[#2D5A4C]" />
                        <AlertTitle className="text-xl font-black uppercase text-[#2D5A4C] ml-4">¡Sincronización Exitosa!</AlertTitle>
                        <AlertDescription className="text-md ml-4 mt-2">
                            Se han actualizado correctamente <strong>{syncResult.updated}</strong> registros en la tabla <strong>{selectedTable}</strong>. 
                            Los datos ya están disponibles en los dashboards de análisis.
                        </AlertDescription>
                    </Alert>
                    <div className="grid grid-cols-2 gap-4">
                        <Button variant="outline" className="h-14 font-bold uppercase text-xs" onClick={reset}>Procesar otro archivo</Button>
                        <Button className="h-14 font-black uppercase text-xs" onClick={() => window.location.reload()}>Finalizar y salir</Button>
                    </div>
                </div>
            )}
        </div>
    );
}
